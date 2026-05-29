import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Send, X, MessageSquare, Clock, Loader2 } from "lucide-react";
import { getRoadmapComments, postRoadmapComment } from "../services/roadmapService";
import { SOCKET_URL } from "../../../config/env";
import { useToast } from "../../../shared/components";

const TOKEN_KEY = "skillssphere.auth.token";
const getToken = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

export default function RoadmapCollaborationPanel({
  roadmapId,
  isOpen,
  onClose,
  initialMilestoneId,
  milestones = [],
  currentUser,
}) {
  const toast = useToast();
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  
  // Sockets and typing
  const [socket, setSocket] = useState(null);
  const [typingUser, setTypingUser] = useState("");
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Set initial milestone ID when panel opens
  useEffect(() => {
    if (isOpen) {
      if (initialMilestoneId) {
        setSelectedMilestoneId(initialMilestoneId);
      } else if (milestones.length > 0 && !selectedMilestoneId) {
        setSelectedMilestoneId(milestones[0]._id);
      }
    }
  }, [isOpen, initialMilestoneId, milestones]);

  // Load comments when milestone selection changes or panel opens
  useEffect(() => {
    if (isOpen && roadmapId && selectedMilestoneId) {
      fetchComments();
    }
  }, [isOpen, roadmapId, selectedMilestoneId]);

  // Socket connection setup
  useEffect(() => {
    if (!isOpen || !roadmapId || !currentUser) return;

    const token = getToken();
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      newSocket.emit("join-roadmap", { roadmapId });
    });

    newSocket.on("new-roadmap-comment", (newComment) => {
      // Append if it belongs to the active milestone thread
      if (newComment.milestoneId?.toString() === selectedMilestoneId?.toString()) {
        setComments((prev) => {
          // Prevent duplicates in case of network issues/resubmissions
          if (prev.some((c) => c._id === newComment._id)) return prev;
          return [...prev, newComment];
        });
      }
    });

    newSocket.on("roadmap-typing-update", ({ milestoneId, username, isTyping }) => {
      if (milestoneId?.toString() === selectedMilestoneId?.toString()) {
        setTypingUser(isTyping ? username : "");
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("leave-roadmap", { roadmapId });
      newSocket.close();
    };
  }, [isOpen, roadmapId, selectedMilestoneId, currentUser]);

  // Scroll to bottom on new comments
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments, typingUser]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await getRoadmapComments(roadmapId, selectedMilestoneId);
      if (res.success) {
        setComments(res.data);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
      toast.error("Failed to load conversation history.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    const content = inputText.trim();
    setInputText("");

    // Emit stop typing instantly
    if (socket) {
      socket.emit("roadmap-typing", {
        roadmapId,
        milestoneId: selectedMilestoneId,
        isTyping: false,
      });
    }

    try {
      const res = await postRoadmapComment(roadmapId, selectedMilestoneId, content);
      if (res.success) {
        // Comment is appended via socket event listener
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
      toast.error(err.message || "Failed to send comment.");
      setInputText(content);
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (socket) {
      socket.emit("roadmap-typing", {
        roadmapId,
        milestoneId: selectedMilestoneId,
        isTyping: true,
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("roadmap-typing", {
          roadmapId,
          milestoneId: selectedMilestoneId,
          isTyping: false,
        });
      }, 2000);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={`fixed top-0 right-0 z-[2100] h-screen w-full sm:w-[420px] bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base text-[var(--text-main)]">Collaboration Hub</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Milestone Thread Selector */}
      <div className="p-3 border-b border-[var(--border)] bg-[var(--background)]">
        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
          Milestone Topic
        </label>
        <select
          value={selectedMilestoneId}
          onChange={(e) => setSelectedMilestoneId(e.target.value)}
          className="w-full bg-[var(--surface)] border border-[var(--border)] text-sm font-semibold p-2 rounded-xl text-[var(--text-main)] focus:outline-none focus:border-primary"
        >
          {milestones.map((m, idx) => (
            <option key={m._id} value={m._id}>
              {idx + 1}. {m.topicName}
            </option>
          ))}
        </select>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-4">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-xs font-bold">Loading conversation logs...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[var(--text-muted)] space-y-3">
            <div className="p-4 bg-[var(--surface-soft)] rounded-full text-primary">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-sm text-[var(--text-main)]">No comments yet</p>
              <p className="text-xs mt-1 max-w-[240px]">
                Start the discussion for this milestone. Leave questions, resource suggestions, or progress notes.
              </p>
            </div>
          </div>
        ) : (
          comments.map((comment) => {
            const currentUserId = currentUser?._id || currentUser?.id;
            const senderId = typeof comment.sender === "object" 
              ? (comment.sender?._id || comment.sender?.id) 
              : comment.sender;
            const isMe = currentUserId && senderId && currentUserId.toString() === senderId.toString();
            const isSystem = comment.type === "status_change" || comment.type === "task_assigned";
            
            if (isSystem) {
              return (
                <div key={comment._id} className="flex flex-col items-center justify-center my-4 animate-slide-up">
                  <div className="px-3 py-1.5 bg-[var(--surface-soft)] border border-[var(--border)] rounded-full text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1.5 text-center">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{comment.content}</span>
                    <span className="opacity-60 font-medium">({formatTime(comment.createdAt)})</span>
                  </div>
                </div>
              );
            }

            const senderRole = comment.sender?.role || "student";
            const roleColors = {
              tutor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
              student: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
              recruiter: "bg-amber-500/10 text-amber-500 border-amber-500/20"
            };

            return (
              <div
                key={comment._id}
                className={`flex items-end gap-2 animate-slide-up ${isMe ? "justify-end" : "justify-start"}`}
              >
                {/* Avatar — left side for others */}
                {!isMe && (
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs uppercase text-white bg-slate-700">
                    {comment.sender?.name?.charAt(0) || "U"}
                  </div>
                )}

                {/* Message content */}
                <div className={`flex flex-col max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                  {/* Name + role badge */}
                  <div className={`flex items-center gap-1.5 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="text-[10px] font-bold text-[var(--text-main)]">
                      {isMe ? "You" : comment.sender?.name}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border flex-shrink-0 ${roleColors[senderRole] || roleColors.student}`}>
                      {senderRole}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div className={`px-3 py-2.5 rounded-2xl text-sm ${
                    isMe
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-[var(--surface-soft)] text-[var(--text-main)] rounded-bl-sm border border-[var(--border)]"
                  }`}>
                    <p className="whitespace-pre-wrap break-words leading-relaxed font-medium">
                      {comment.content}
                    </p>
                    <span className={`text-[9px] block mt-1.5 opacity-60 ${isMe ? "text-right" : "text-left"}`}>
                      {formatTime(comment.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Avatar — right side for me */}
                {isMe && (
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs uppercase text-white bg-primary">
                    {comment.sender?.name?.charAt(0) || "U"}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUser && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] pl-1 animate-pulse">
            <div className="flex space-x-1">
              <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
            <span className="italic font-semibold">{typingUser} is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="p-3 border-t border-[var(--border)] bg-[var(--surface-soft)] flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="flex-1 bg-[var(--surface)] border border-[var(--border)] p-2.5 rounded-xl text-sm focus:outline-none focus:border-primary text-[var(--text-main)] font-semibold shadow-inner"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:scale-105 hover:bg-primary-hover transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed shadow-md shadow-primary/20"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
