
import {
  Code2,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  Palette,
  PhoneOff,
  Send,
  Users,
  Video,
  VideoOff,
  ArrowLeft,
  Copy,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { getSession, clearClassroomsError } from "../../../features/classrooms/classroomsSlice";
import { ErrorState } from "../../../shared/components";
import Peer from "simple-peer";
import { io } from "socket.io-client";
import CollaborativeEditor from "../components/CollaborativeEditor";
import VideoTile from "../components/VideoTile";
import InteractiveWhiteboard from "../components/InteractiveWhiteboard";
import { endClassroomSession } from "../services/classroomService";

import { SOCKET_URL } from "../../../config/env";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import { useToast } from "../../../shared/components/toast/ToastProvider";
import logger from "../../../utils/logger";

export default function ClassroomRoom() {
  useDocumentTitle("Classroom");
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useSelector((state: any) => state.auth);
  const { error: sessionError, isLoading: sessionLoading } = useSelector((state: any) => state.classrooms);
  const dispatch = useDispatch<any>();
  const toast = useToast();

  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState([]); // Array of { peerId, peer, stream, user, isMuted, isHandRaised }
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState("chat"); // 'chat' or 'participants'
  const [activeWorkspace, setActiveWorkspace] = useState("video"); // 'video', 'whiteboard', or 'code'

  const [initialCode, setInitialCode] = useState("");
  const [initialWhiteboard, setInitialWhiteboard] = useState([]);

  // Leave dialog state
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leavingSession, setLeavingSession] = useState(false);

  // Controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [handRaiseQueue, setHandRaiseQueue] = useState([]);

  const handleLowerStudentHand = (targetSocketId: string) => {
    if (socketRef.current) {
      // @ts-expect-error TODO: Fix pervasive types
      socketRef.current.emit("lower-student-hand", { roomId, targetSocketId });
    }
  };

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

    let mounted = true;

    // @ts-expect-error TODO: Fix pervasive types
    dispatch(getSession({ roomId, token }))
      .unwrap()
      .then(() => {
        if (!mounted) return;
        
        // Initialize Socket
        const s = io(SOCKET_URL, { auth: { token } });
        setSocket(s);
        // @ts-expect-error TODO: Fix pervasive types
        socketRef.current = s;

        // Get media permissions
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: true })
          .then((stream) => {
            if (!mounted) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }

            setLocalStream(stream);
            // @ts-expect-error TODO: Fix pervasive types
            localStreamRef.current = stream;

            // Join room once media is acquired
            s.emit("join-room", {
              roomId,
              user: { id: user._id, name: user.name || user.email },
            });

            // Listen for graceful session termination
            s.on("session-ended", () => {
              toast.error("The host has ended this live classroom session.");
              navigate("/classrooms");
            });

            // When we get the current participants list, we act as the "caller" and initiate peer connections
            s.on("room-participants", (participants) => {
              const peersArr = [];
              participants.forEach((p) => {
                if (p.socketId !== s.id) {
                  activeSocketIdsRef.current.add(p.socketId);
                  const peer = createPeer(p.socketId, s.id, stream, user);
                  peersRef.current.push({
                    peerId: p.socketId,
                    peer,
                    user: p.user,
                    isHandRaised: false,
                    isMuted: false,
                  });
                  peersArr.push({
                    peerId: p.socketId,
                    peer,
                    user: p.user,
                    stream: null,
                    isHandRaised: false,
                    isMuted: false,
                    isVideoOff: false,
                    isScreenShare: false,
                  });
                }
              });
              setPeers(peersArr);
            });

            // Handle initial room state synchronization for late joiners
            s.on("sync-state", (state) => {
              if (state.chatHistory) setChatMessages(state.chatHistory);
              if (state.code) setInitialCode(state.code);
              if (state.whiteboard) setInitialWhiteboard(state.whiteboard);
              if (state.raiseHandQueue) setHandRaiseQueue(state.raiseHandQueue);
            });

            s.on("hand-raise-queue-updated", (queue) => {
              setHandRaiseQueue(queue || []);
            });

            s.on("hand-lowered-by-tutor", () => {
              setIsHandRaised(false);
            });

            // Handle incoming user (they just joined, they will initiate the call to us)
            s.on("user-joined", (payload) => {
              logger.debug("User joined", payload);
              activeSocketIdsRef.current.add(payload.socketId);
              
              // Immediately add them to members list so they show up, even before WebRTC connects
              const newPeerObj = {
                peerId: payload.socketId,
                peer: null,
                user: payload.user,
                stream: null,
                isHandRaised: false,
                isMuted: false,
                isVideoOff: false,
                isScreenShare: false,
              };
              peersRef.current.push(newPeerObj);
              setPeers((prev) => [...prev, newPeerObj]);
            });

            // Receiving an offer
            s.on("webrtc-offer", (payload) => {
              // Security check: Verify that the caller is a registered participant in this room
              if (!activeSocketIdsRef.current.has(payload.callerSocketId)) {
                logger.warn(
                  `Silently dropped unauthorized WebRTC stream injection from socket: ${payload.callerSocketId}`,
                );
                return;
              }

              const peer = addPeer(
                payload.offer,
                payload.callerSocketId,
                stream,
                s,
              );

              // Update existing placeholder or push new if missing
              const existingIdx = peersRef.current.findIndex(p => p.peerId === payload.callerSocketId);
              if (existingIdx >= 0) {
                peersRef.current[existingIdx].peer = peer;
                setPeers([...peersRef.current]);
              } else {
                const newPeerObj = {
                  peerId: payload.callerSocketId,
                  peer,
                  user: payload.callerUser,
                  stream: null,
                  isHandRaised: false,
                  isMuted: false,
                  isVideoOff: false,
                  isScreenShare: false,
                };
                peersRef.current.push(newPeerObj);
                setPeers((prev) => [...prev, newPeerObj]);
              }
            });

            // Receiving an answer
            s.on("webrtc-answer", (payload) => {
              if (!activeSocketIdsRef.current.has(payload.answererSocketId)) {
                logger.warn(
                  `Silently dropped unauthorized WebRTC signaling answer from socket: ${payload.answererSocketId}`,
                );
                return;
              }
              const item = peersRef.current.find(
                (p) => p.peerId === payload.answererSocketId,
              );
              if (item) {
                item.peer.signal(payload.answer);
              }
            });

            // Socket security & error handling
            s.on("unauthorized", (payload) => {
              logger.error("Socket unauthorized action:", payload);
              toast.error(
                `Security Warning: ${payload.message || "Unauthorized action detected."}`,
              );
              navigate("/classrooms");
            });

            s.on("error", (payload) => {
              logger.error("Socket error:", payload);
              toast.error(
                `Socket Error: ${payload.message || "An error occurred."}`,
              );
              navigate("/classrooms");
            });

            // Other socket events
            s.on("chat-message", (msg) => {
              setChatMessages((prev) => [...prev, msg]);
            });

            s.on("hand-raise-toggled", ({ socketId, isRaised }) => {
              setPeers((prev) =>
                prev.map((p) =>
                  p.peerId === socketId ? { ...p, isHandRaised: isRaised } : p,
                ),
              );
            });

            s.on("mute-toggled", ({ socketId, isMuted }) => {
              setPeers((prev) =>
                prev.map((p) =>
                  p.peerId === socketId ? { ...p, isMuted } : p,
                ),
              );
            });

            s.on("video-toggled", ({ socketId, isVideoOff }) => {
              setPeers((prev) =>
                prev.map((p) =>
                  p.peerId === socketId ? { ...p, isVideoOff } : p,
                ),
              );
            });

            s.on("screen-share-toggled", ({ socketId, isScreenSharing }) => {
              setPeers((prev) =>
                prev.map((p) =>
                  p.peerId === socketId ? { ...p, isScreenShare: isScreenSharing } : p,
                ),
              );
            });

            s.on("user-left", ({ socketId }) => {
              activeSocketIdsRef.current.delete(socketId);
              const item = peersRef.current.find((p) => p.peerId === socketId);
              if (item) {
                item.peer?.destroy();
              }
              peersRef.current = peersRef.current.filter(
                (p) => p.peerId !== socketId,
              );
              setPeers((prev) => prev.filter((p) => p.peerId !== socketId));
            });
          })
          .catch((err) => {
            logger.error("Failed to get local stream", err);
            toast.error("Failed to access camera and microphone.");
          });
      })
      .catch((err) => {
        logger.error("Failed to fetch session details:", err);
      });

    return () => {
      mounted = false;
      dispatch(clearClassroomsError());
      // @ts-expect-error TODO: Fix pervasive types
      if (s) s.disconnect();
      if (localStreamRef.current) {
        // @ts-expect-error TODO: Fix pervasive types
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      peersRef.current.forEach((p) => p.peer?.destroy());
    };
  }, [roomId, user, token, navigate]);

  // Peer Creation Logic (Caller)
  function createPeer(userToSignal, callerId, stream, callerUser) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      // @ts-expect-error TODO: Fix pervasive types
      socketRef.current.emit("webrtc-offer", {
        targetSocketId: userToSignal,
        callerSocketId: callerId,
        callerUser,
        offer: signal,
      });
    });

    peer.on("stream", (incomingStream) => {
      setPeers((prev) =>
        prev.map((p) => {
          if (p.peerId === userToSignal)
            return { ...p, stream: incomingStream };
          return p;
        }),
      );
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

    peer.on("signal", (signal) => {
      socketInst.emit("webrtc-answer", {
        targetSocketId: callerId,
        answer: signal,
      });
    });

    peer.on("stream", (incomingStream) => {
      setPeers((prev) =>
        prev.map((p) => {
          if (p.peerId === callerId) return { ...p, stream: incomingStream };
          return p;
        }),
      );
    });

    peer.signal(incomingSignal);
    return peer;
  }

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const newState = !audioTrack.enabled;
        audioTrack.enabled = newState;
        setIsMuted(!newState);
        if (socket) {
          socket.emit("toggle-mute", { roomId, isMuted: !newState });
        }
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const newState = !videoTrack.enabled;
        videoTrack.enabled = newState;
        setIsVideoOff(!newState);
        if (socket) {
          socket.emit("toggle-video", { roomId, isVideoOff: !newState });
        }
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
    // @ts-expect-error TODO: Fix pervasive types
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];

    if (screenTrack && cameraTrack) {
      peersRef.current.forEach((p) => {
        try {
          p.peer.replaceTrack(screenTrack, cameraTrack, localStreamRef.current);
        } catch (e) {
          logger.error("Error replacing track back to camera", e);
        }
      });
    }

    screenStreamRef.current.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;

    setLocalStream(localStreamRef.current);
    setIsScreenSharing(false);
    if (socket) {
      socket.emit("toggle-screen-share", { roomId, isScreenSharing: false });
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          // @ts-expect-error TODO: Fix pervasive types
          cursor: "always",
          video: true,
          audio: false,
        });
        screenStreamRef.current = stream;

        const screenTrack = stream.getVideoTracks()[0];
        // @ts-expect-error TODO: Fix pervasive types
        const cameraTrack = localStreamRef.current?.getVideoTracks()[0];

        screenTrack.onended = () => {
          stopScreenShare();
        };

        if (cameraTrack) {
          peersRef.current.forEach((p) => {
            try {
              p.peer.replaceTrack(
                cameraTrack,
                screenTrack,
                localStreamRef.current,
              );
            } catch (e) {
              logger.error("Error replacing track to screen", e);
            }
          });
        }

        setLocalStream(stream);
        setIsScreenSharing(true);
        if (socket) {
          socket.emit("toggle-screen-share", { roomId, isScreenSharing: true });
        }
      } catch (err: any) {
        logger.error("Failed to share screen", err);
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
      timestamp: new Date().toISOString(),
    };

    socket.emit("chat-message", { roomId, message: chatInput });
    setChatMessages((prev) => [...prev, msg]);
    setChatInput("");
  };

  const handleLeave = () => {
    setLeaveDialogOpen(true);
  };

  const handleEndSession = async () => {
    setLeavingSession(true);
    try {
      await endClassroomSession(roomId, token);
      toast.success("Session ended successfully.");
      navigate("/classrooms");
    } catch (err: any) {
      logger.error("Failed to end session", err);
      toast.error("Failed to end session.");
      setLeavingSession(false);
    }
  };

  const handleLeaveOnly = () => {
    navigate("/classrooms");
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success("Room ID copied to clipboard!");
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0F19] text-slate-900 dark:text-white flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-slate-500 font-medium">Joining Classroom...</p>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0F19] text-slate-900 dark:text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl">
          <ErrorState
            title="Unable to Join Classroom"
            description={sessionError}
            onRetry={() => {
              dispatch(clearClassroomsError());
              // @ts-expect-error TODO: Fix pervasive types
              dispatch(getSession({ roomId, token }));
            }}
          />
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => navigate("/classrooms")}
              className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center space-x-2"
            >
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="h-screen bg-white dark:bg-[#0B0F19] text-slate-900 dark:text-white flex flex-col font-sans">
      {/* Top Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-20">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/classrooms")}
            className="flex items-center space-x-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500 uppercase mr-2">Room ID:</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{roomId}</span>
          </div>
          <button
            onClick={copyRoomId}
            className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors shadow-sm"
            title="Copy Room ID"
          >
            <Copy size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Video Area */}
        <div className="flex-1 p-6 flex flex-col min-h-0 gap-4">
          {/* Workspace Switcher Bar */}
          <div className="flex items-center space-x-1 mb-2 bg-white dark:bg-slate-900/60 p-1 border border-gray-200 dark:border-slate-800 rounded-xl max-w-fit shadow-sm backdrop-blur-md">
            <button
              onClick={() => setActiveWorkspace("video")}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeWorkspace === "video"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`}
            >
              <Video size={14} />
              <span>Camera Stream</span>
            </button>
            <button
              onClick={() => setActiveWorkspace("whiteboard")}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeWorkspace === "whiteboard"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`}
            >
              <Palette size={14} />
              <span>Whiteboard</span>
            </button>
            <button
              onClick={() => setActiveWorkspace("code")}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeWorkspace === "code"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
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
                  {/* @ts-expect-error TODO: Fix pervasive types */}
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
                      isVideoOff={peerObj.isVideoOff}
                      isScreenShare={peerObj.isScreenShare}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Main workspace container */}
            <div className={`flex-1 overflow-hidden flex flex-col min-h-0 ${activeWorkspace === "video" ? "bg-gray-50/50 dark:bg-slate-900/40 rounded-[2rem] p-6 border border-gray-200 dark:border-slate-800/60 shadow-inner" : ""}`}>
              {activeWorkspace === "video" && (
                /* Grid Layout for Videos */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <VideoTile
                    stream={localStream}
                    user={{ name: user?.name || user?.email }}
                    isLocal={true}
                    isMuted={isMuted}
                    isHandRaised={isHandRaised}
                    isVideoOff={isVideoOff}
                    isScreenShare={isScreenSharing}
                  />
                  {peers.map((peerObj, index) => (
                    <VideoTile
                      key={index}
                      stream={peerObj.stream}
                      user={peerObj.user}
                      isLocal={false}
                      isMuted={peerObj.isMuted}
                      isHandRaised={peerObj.isHandRaised}
                      isVideoOff={peerObj.isVideoOff}
                      isScreenShare={peerObj.isScreenShare}
                    />
                  ))}
                </div>
              )}

              {activeWorkspace === "whiteboard" && socket && (
                <InteractiveWhiteboard
                  socket={socket}
                  roomId={roomId}
                  userRole={user?.role}
                  initialStrokes={initialWhiteboard}
                />
              )}

              {activeWorkspace === "code" && socket && (
                <CollaborativeEditor
                  socket={socket}
                  roomId={roomId}
                  userRole={user?.role}
                  initialCode={initialCode}
                />
              )}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="mt-2 mx-auto bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-none rounded-full px-6 py-4 flex items-center justify-center space-x-4">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-all hover:scale-105 ${isMuted ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-gray-100 text-slate-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-all hover:scale-105 ${isVideoOff ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-gray-100 text-slate-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}
            >
              {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
            </button>
            <button
              onClick={toggleHandRaise}
              className={`p-4 rounded-full transition-all hover:scale-105 ${isHandRaised ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30" : "bg-gray-100 text-slate-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}
            >
              <Hand size={22} />
            </button>
            <button
              onClick={toggleScreenShare}
              className={`p-4 rounded-full transition-all hover:scale-105 ${isScreenSharing ? "bg-indigo-500/20 text-indigo-500 hover:bg-indigo-500/30" : "bg-gray-100 text-slate-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}
            >
              <MonitorUp size={22} />
            </button>
            <div className="w-px h-8 bg-gray-200 dark:bg-slate-700 mx-2"></div>
            <button
              onClick={handleLeave}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all text-white px-8 font-bold flex items-center space-x-2 shadow-lg shadow-red-600/20 hover:-translate-y-0.5"
            >
              <PhoneOff size={20} />
              <span>{user?.role === "tutor" ? "End / Leave" : "Leave Session"}</span>
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-[340px] border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 flex flex-col z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
          <div className="flex border-b border-gray-200 dark:border-slate-800 px-4 pt-4">
            <button
              className={`flex-1 pb-4 text-sm font-bold flex items-center justify-center space-x-2 transition-colors relative ${activeTab === "chat" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
              onClick={() => setActiveTab("chat")}
            >
              <MessageSquare size={16} />
              <span>Chat Room</span>
              {activeTab === "chat" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>}
            </button>
            <button
              className={`flex-1 pb-4 text-sm font-bold flex items-center justify-center space-x-2 transition-colors relative ${activeTab === "participants" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
              onClick={() => setActiveTab("participants")}
            >
              <Users size={16} />
              <span>Members ({peers.length + 1})</span>
              {activeTab === "participants" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            {activeTab === "chat" ? (
              <>
                <div className="flex-1 space-y-4 mb-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-slate-500 mt-10">
                      No messages yet.
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className="bg-gray-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-gray-100 dark:border-slate-700/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          {msg.sender.name}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">
                        {msg.message}
                      </p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="relative mt-auto pt-4 border-t border-gray-100 dark:border-slate-800/80">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl pl-4 pr-14 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-shadow text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 mt-2 w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm"
                  >
                    <Send size={14} className="-ml-0.5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-3 pt-2">
                {/* Raise Hand Queue Widget */}
                {handRaiseQueue.length > 0 && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-4">
                    <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Hand size={14} className="animate-bounce" /> Raise Hand Queue ({handRaiseQueue.length})
                    </p>
                    <div className="space-y-2">
                      {handRaiseQueue.map((item: any, qIdx) => {
                        const isSelf = item.socketId === socket?.id;
                        return (
                          <div key={item.socketId} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/10">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {qIdx + 1}. {item.user?.name} {isSelf && "(You)"}
                            </span>
                            {user?.role === "tutor" && (
                              <button
                                type="button"
                                onClick={() => handleLowerStudentHand(item.socketId)}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition-colors"
                              >
                                Lower Hand
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/80 rounded-2xl border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center font-bold text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
                      {user?.name?.charAt(0) || "U"}
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {user?.name || user?.email} <span className="text-slate-400 font-medium">(You)</span>
                    </span>
                  </div>
                  {isHandRaised && (
                    <Hand size={18} className="text-amber-500" />
                  )}
                </div>
                {peers.map((peerObj, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-900/60 rounded-2xl border border-gray-100 dark:border-slate-800"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {peerObj.user?.name?.charAt(0) || "U"}
                      </div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {peerObj.user?.name}
                      </span>
                    </div>
                    {peerObj.isHandRaised && (
                      <Hand size={18} className="text-amber-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Leave / End session dialog — tutor has 3 choices, student has 2 */}
    {user?.role === "tutor" ? (
      leaveDialogOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !leavingSession && setLeaveDialogOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Leave classroom?</h2>
            <p className="text-sm text-slate-300">Choose what happens when you leave this session.</p>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={handleEndSession}
                disabled={leavingSession}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {leavingSession ? "Ending…" : "End session for everyone"}
              </button>
              <button
                onClick={handleLeaveOnly}
                disabled={leavingSession}
                className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                Leave without ending
              </button>
              <button
                onClick={() => setLeaveDialogOpen(false)}
                disabled={leavingSession}
                className="w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-50 text-slate-300 text-sm font-semibold transition-colors"
              >
                Stay in session
              </button>
            </div>
          </div>
        </div>
      )
    ) : (
      <ConfirmDialog
        isOpen={leaveDialogOpen}
        title="Leave classroom?"
        message="Are you sure you want to leave this classroom session?"
        confirmText="Leave"
        cancelText="Stay"
        variant="warning"
        onConfirm={handleLeaveOnly}
        onCancel={() => setLeaveDialogOpen(false)}
      />
    )}
    </>
  );
}
