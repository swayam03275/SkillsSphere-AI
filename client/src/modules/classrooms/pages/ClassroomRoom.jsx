import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import Peer from "simple-peer";
import { Mic, MicOff, Video, VideoOff, MonitorUp, Hand, MessageSquare, Users, PhoneOff, Send, Code2, Palette } from "lucide-react";
import VideoTile from "../components/VideoTile";
import Whiteboard from "../components/Whiteboard";
import SharedCodeEditor from "../components/SharedCodeEditor";

import { SOCKET_URL } from "../../../config/env";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

export default function ClassroomRoom() {
  useDocumentTitle("Classroom");
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);

  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState([]); // Array of { peerId, peer, stream, user, isMuted, isHandRaised }
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState("chat"); // 'chat' or 'participants'
  const [activeWorkspace, setActiveWorkspace] = useState("video"); // 'video', 'whiteboard', or 'code'

  // Controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  const peersRef = useRef([]); // To keep track of peer connections inside callbacks
  const socketRef = useRef();
  const localStreamRef = useRef();
  const screenStreamRef = useRef(null);
  const activeSocketIdsRef = useRef(new Set());

  useEffect(() => {
    // Basic auth check
    if (!token || !user) {
      navigate("/login");
      return;
    }

    // Initialize Socket
    const s = io(SOCKET_URL);
    setSocket(s);
    socketRef.current = s;

    // Get media permissions
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        localStreamRef.current = stream;

        // Join room once media is acquired
        s.emit("join-room", { roomId, user: { id: user._id, name: user.name || user.email } });

        // When we get the current participants list, we act as the "caller" and initiate peer connections
        s.on("room-participants", (participants) => {
          const peersArr = [];
          participants.forEach(p => {
            activeSocketIdsRef.current.add(p.socketId);
            const peer = createPeer(p.socketId, s.id, stream, user);
            peersRef.current.push({
              peerId: p.socketId,
              peer,
              user: p.user,
              isHandRaised: false,
              isMuted: false
            });
            peersArr.push({
              peerId: p.socketId,
              peer,
              user: p.user,
              stream: null, // Will be populated on peer 'stream' event
              isHandRaised: false,
              isMuted: false
            });
          });
          setPeers(peersArr);
        });

        // Handle incoming user (they just joined, they will initiate the call to us)
        s.on("user-joined", (payload) => {
          console.log("User joined", payload);
          activeSocketIdsRef.current.add(payload.socketId);
          // We don't initiate here. We wait for their offer.
        });

        // Receiving an offer
        s.on("webrtc-offer", (payload) => {
          // Security check: Verify that the caller is a registered participant in this room
          if (!activeSocketIdsRef.current.has(payload.callerSocketId)) {
            console.error(`Blocked unauthorized WebRTC stream injection from socket: ${payload.callerSocketId}`);
            alert("Security Warning: Blocked an unauthorized stream injection attempt from outside this classroom.");
            return;
          }

          const peer = addPeer(payload.offer, payload.callerSocketId, stream, s);
          
          const newPeerObj = {
            peerId: payload.callerSocketId,
            peer,
            user: payload.callerUser,
            stream: null,
            isHandRaised: false,
            isMuted: false
          };
          
          peersRef.current.push(newPeerObj);
          setPeers(prev => [...prev, newPeerObj]);
        });

        // Receiving an answer
        s.on("webrtc-answer", (payload) => {
          if (!activeSocketIdsRef.current.has(payload.answererSocketId)) {
            console.error(`Blocked unauthorized WebRTC signaling answer from socket: ${payload.answererSocketId}`);
            return;
          }
          const item = peersRef.current.find(p => p.peerId === payload.answererSocketId);
          if (item) {
            item.peer.signal(payload.answer);
          }
        });

        // Socket security & error handling
        s.on("unauthorized", (payload) => {
          console.error("Socket unauthorized action:", payload);
          alert(`Security Warning: ${payload.message || "Unauthorized action detected."}`);
          navigate("/classrooms");
        });

        s.on("error", (payload) => {
          console.error("Socket error:", payload);
          alert(`Socket Error: ${payload.message || "An error occurred."}`);
          navigate("/classrooms");
        });

        // Other socket events
        s.on("chat-message", (msg) => {
          setChatMessages(prev => [...prev, msg]);
        });

        s.on("hand-raise-toggled", ({ socketId, isRaised }) => {
          setPeers(prev => prev.map(p => p.peerId === socketId ? { ...p, isHandRaised: isRaised } : p));
        });

        s.on("user-left", ({ socketId }) => {
          activeSocketIdsRef.current.delete(socketId);
          const item = peersRef.current.find(p => p.peerId === socketId);
          if (item) {
            item.peer.destroy();
          }
          peersRef.current = peersRef.current.filter(p => p.peerId !== socketId);
          setPeers(prev => prev.filter(p => p.peerId !== socketId));
        });
      })
      .catch(err => {
        console.error("Failed to get local stream", err);
        alert("Failed to access camera and microphone.");
      });

    return () => {
      s.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      peersRef.current.forEach(p => p.peer.destroy());
    };
  }, [roomId, user, token, navigate]);

  // Peer Creation Logic (Caller)
  function createPeer(userToSignal, callerId, stream, callerUser) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      socketRef.current.emit("webrtc-offer", {
        targetSocketId: userToSignal,
        callerSocketId: callerId,
        callerUser,
        offer: signal
      });
    });

    peer.on("stream", incomingStream => {
      setPeers(prev => prev.map(p => {
        if (p.peerId === userToSignal) return { ...p, stream: incomingStream };
        return p;
      }));
    });

    return peer;
  }

  // Peer Addition Logic (Receiver)
  function addPeer(incomingSignal, callerId, stream, socketInst) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      socketInst.emit("webrtc-answer", {
        targetSocketId: callerId,
        answer: signal
      });
    });

    peer.on("stream", incomingStream => {
      setPeers(prev => prev.map(p => {
        if (p.peerId === callerId) return { ...p, stream: incomingStream };
        return p;
      }));
    });

    peer.signal(incomingSignal);
    return peer;
  }

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleHandRaise = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    if (socket) {
      socket.emit("toggle-hand-raise", { roomId, isRaised: newState });
    }
  };

  const stopScreenShare = () => {
    if (!screenStreamRef.current) return;
    
    const screenTrack = screenStreamRef.current.getVideoTracks()[0];
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    
    if (screenTrack && cameraTrack) {
      peersRef.current.forEach(p => {
        try {
          p.peer.replaceTrack(screenTrack, cameraTrack, localStreamRef.current);
        } catch (e) {
          console.error("Error replacing track back to camera", e);
        }
      });
    }

    screenStreamRef.current.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;
    
    setLocalStream(localStreamRef.current);
    setIsScreenSharing(false);
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ cursor: "always", video: true, audio: false });
        screenStreamRef.current = stream;
        
        const screenTrack = stream.getVideoTracks()[0];
        const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
        
        screenTrack.onended = () => {
          stopScreenShare();
        };

        if (cameraTrack) {
          peersRef.current.forEach(p => {
            try {
              p.peer.replaceTrack(cameraTrack, screenTrack, localStreamRef.current);
            } catch (e) {
              console.error("Error replacing track to screen", e);
            }
          });
        }

        setLocalStream(stream);
        setIsScreenSharing(true);
      } catch (err) {
        console.error("Failed to share screen", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;

    const msg = {
      message: chatInput,
      sender: { name: user.name || user.email },
      timestamp: new Date().toISOString()
    };
    
    socket.emit("chat-message", { roomId, message: chatInput });
    setChatMessages(prev => [...prev, msg]);
    setChatInput("");
  };

  const handleLeave = () => {
    navigate("/classrooms");
  };

  return (
    <div className="h-screen bg-white dark:bg-[#020617] text-gray-900 dark:text-white flex flex-col pt-16">
      <div className="flex-1 flex overflow-hidden">
        {/* Main Video Area */}
        <div className="flex-1 p-4 flex flex-col min-h-0">
          {/* Workspace Switcher Bar */}
          <div className="flex items-center space-x-2 mb-4 bg-gray-100 dark:bg-slate-900/60 p-1 border border-gray-200 dark:border-slate-800 rounded-xl max-w-fit">
            <button
              onClick={() => setActiveWorkspace("video")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeWorkspace === "video"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Video size={14} />
              <span>Camera Stream</span>
            </button>
            <button
              onClick={() => setActiveWorkspace("whiteboard")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeWorkspace === "whiteboard"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Palette size={14} />
              <span>Whiteboard</span>
            </button>
            <button
              onClick={() => setActiveWorkspace("code")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeWorkspace === "code"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Code2 size={14} />
              <span>Live Code</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* If in Whiteboard or Code mode, render a compact row of video tiles at the top */}
            {activeWorkspace !== "video" && (
              <div className="flex space-x-3 overflow-x-auto mb-4 pb-2 max-h-[140px] scrollbar-thin scrollbar-thumb-slate-800">
                <div className="w-[180px] flex-shrink-0">
                  <VideoTile
                    stream={localStream}
                    user={{ name: user?.name || user?.email }}
                    isLocal={true}
                    isMuted={isMuted}
                    isHandRaised={isHandRaised}
                  />
                </div>
                {peers.map((peerObj, index) => (
                  <div className="w-[180px] flex-shrink-0" key={index}>
                    <VideoTile
                      stream={peerObj.stream}
                      user={peerObj.user}
                      isLocal={false}
                      isMuted={peerObj.isMuted}
                      isHandRaised={peerObj.isHandRaised}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Main workspace container */}
            <div className="flex-1 bg-gray-50 dark:bg-slate-900 rounded-2xl overflow-y-auto p-4 border border-gray-200 dark:border-slate-800 flex flex-col min-h-0">
              {activeWorkspace === "video" && (
                /* Grid Layout for Videos */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <VideoTile
                    stream={localStream}
                    user={{ name: user?.name || user?.email }}
                    isLocal={true}
                    isMuted={isMuted}
                    isHandRaised={isHandRaised}
                  />
                  {peers.map((peerObj, index) => (
                    <VideoTile
                      key={index}
                      stream={peerObj.stream}
                      user={peerObj.user}
                      isLocal={false}
                      isMuted={peerObj.isMuted}
                      isHandRaised={peerObj.isHandRaised}
                    />
                  ))}
                </div>
              )}

              {activeWorkspace === "whiteboard" && socket && (
                <Whiteboard socket={socket} roomId={roomId} userRole={user?.role} />
              )}

              {activeWorkspace === "code" && socket && (
                <SharedCodeEditor socket={socket} roomId={roomId} userRole={user?.role} />
              )}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="mt-4 bg-white/90 dark:bg-slate-800/80 backdrop-blur-md border border-gray-200 dark:border-slate-700/50 rounded-2xl p-4 flex items-center justify-center space-x-4">
            <button onClick={toggleMute} className={`p-4 rounded-xl transition-all ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600'}`}>
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button onClick={toggleVideo} className={`p-4 rounded-xl transition-all ${isVideoOff ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600'}`}>
              {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
            </button>
            <button onClick={toggleHandRaise} className={`p-4 rounded-xl transition-all ${isHandRaised ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600'}`}>
              <Hand size={24} />
            </button>
            <button onClick={toggleScreenShare} className={`p-4 rounded-xl transition-all ${isScreenSharing ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600'}`}>
              <MonitorUp size={24} />
            </button>
            <button onClick={handleLeave} className="p-4 rounded-xl bg-red-600 hover:bg-red-700 transition-all text-white px-8 font-semibold flex items-center space-x-2">
              <PhoneOff size={20} />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex flex-col">
          <div className="flex border-b border-gray-200 dark:border-slate-800">
            <button 
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${activeTab === 'chat' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={16} />
              <span>Chat</span>
            </button>
            <button 
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${activeTab === 'participants' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
              onClick={() => setActiveTab('participants')}
            >
              <Users size={16} />
              <span>Participants ({peers.length + 1})</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            {activeTab === 'chat' ? (
              <>
                <div className="flex-1 space-y-4 mb-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-slate-500 mt-10">No messages yet.</div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-indigo-400">{msg.sender.name}</span>
                        <span className="text-xs text-gray-500 dark:text-slate-500">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-gray-700 dark:text-slate-300 text-sm">{msg.message}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="relative mt-auto">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-indigo-300 transition-colors">
                    <Send size={18} />
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-semibold text-sm">
                      {user?.name?.charAt(0) || "U"}
                    </div>
                    <span className="font-medium text-sm">{user?.name || user?.email} (You)</span>
                  </div>
                  {isHandRaised && <Hand size={16} className="text-yellow-400" />}
                </div>
                {peers.map((peerObj, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center font-semibold text-sm">
                        {peerObj.user?.name?.charAt(0) || "U"}
                      </div>
                      <span className="font-medium text-sm">{peerObj.user?.name}</span>
                    </div>
                    {peerObj.isHandRaised && <Hand size={16} className="text-yellow-400" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
