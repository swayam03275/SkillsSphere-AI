import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Video, Users, ArrowRight, MonitorPlay, Calendar, BookOpen, Clock, Power, ShieldAlert, ArrowLeft } from "lucide-react";
import {
  createClassroomSession,
  getTutorClassroomSessions,
  endClassroomSession,
  getActiveClassroomSessions,
} from "../services/classroomService";
import Navbar from "../../../shared/landing/Navbar";
import Footer from "../../../modules/landing/components/Footer";

import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

export default function ClassroomsDashboard() {
  useDocumentTitle("Classrooms Dashboard");
  const { user, token } = useSelector((state) => state.auth);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(30);
  const [joinRoomId, setJoinRoomId] = useState("");
  
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const isTutor = user?.role === "tutor";

  useEffect(() => {
    if (token) {
      if (isTutor) {
        fetchMySessions();
      } else {
        fetchActiveSessions();
      }
    }
  }, [isTutor, token]);

  const fetchMySessions = async () => {
    try {
      setIsListLoading(true);
      setError(null);
      const res = await getTutorClassroomSessions(token);
      if (res.success && res.data) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error("Failed to load sessions", err);
      setError("Failed to load your classroom sessions. Please try again.");
    } finally {
      setIsListLoading(false);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      setIsListLoading(true);
      setError(null);
      const res = await getActiveClassroomSessions(token);
      if (res.success && res.data) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error("Failed to load active sessions", err);
      setError("Failed to load active classrooms. Please try again.");
    } finally {
      setIsListLoading(false);
    }
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      const res = await createClassroomSession(
        {
          title: title.trim(),
          subject: subject.trim(),
          maxParticipants: Number(maxParticipants),
        },
        token
      );

      if (res.success && res.data?.roomId) {
        navigate(`/classrooms/${res.data.roomId}`);
      }
    } catch (err) {
      console.error("Failed to create room", err);
      setError(err.message || "Failed to create live classroom session.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async (roomId) => {
    if (!window.confirm("Are you sure you want to end this live session? All participants will be disconnected.")) {
      return;
    }

    try {
      setError(null);
      const res = await endClassroomSession(roomId, token);
      if (res.success) {
        // Refresh session list
        fetchMySessions();
      }
    } catch (err) {
      console.error("Failed to end session", err);
      setError(err.message || "Failed to end the session.");
    }
  };

  const handleJoinSession = (e) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      navigate(`/classrooms/${joinRoomId.trim()}`);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] text-gray-900 dark:text-white flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-6xl mx-auto w-full pt-24 pb-16 px-6">
        
        {/* Header section */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl mb-6 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)] animate-[pulse_3s_infinite]">
            <MonitorPlay size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Live Interactive Classrooms
          </h1>
          <p className="text-gray-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            {isTutor 
              ? "Host live interactive lessons, chat with peers, and share your screen in real-time."
              : "Enter unique session IDs provided by your tutor to join active learning rooms."
            }
          </p>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mb-8 bg-red-500/15 border border-red-500/30 text-red-300 px-5 py-4 rounded-xl flex items-center space-x-3 shadow-[0_4px_20px_rgba(239,68,68,0.1)]">
            <ShieldAlert size={20} className="flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          
          {/* Form Side - Span 2 */}
          <div className="lg:col-span-2 space-y-6">
            
            {isTutor ? (
              // Tutor View: Session Form
              <div className="bg-gray-100 dark:bg-slate-900/60 backdrop-blur-md border border-gray-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl">
                <div className="bg-indigo-500/10 w-12 h-12 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 mb-6">
                  <Video size={24} />
                </div>
                <h2 className="text-2xl font-bold mb-1">Create a Session</h2>
                <p className="text-gray-600 dark:text-slate-400 text-sm mb-6">
                  Launch a secure, high-quality audio and video learning room.
                </p>

                <form onSubmit={handleStartSession} className="space-y-4">
                  <div>
                    <label className="block text-gray-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                      Session Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Advanced JS Concepts"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950/80 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                      Subject / Topic
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950/80 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                      Max Participants ({maxParticipants})
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="100"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(Number(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 dark:text-slate-500 font-mono mt-1">
                      <span>2</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-4 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-all shadow-[0_4px_20px_rgba(99,102,241,0.25)] flex items-center justify-center space-x-2 active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <span>Launching Room...</span>
                    ) : (
                      <>
                        <span>Start Session</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              // Student View: Join Module
              <div className="bg-gray-100 dark:bg-slate-900/60 backdrop-blur-md border border-gray-200 dark:border-slate-800/80 rounded-2xl p-8 shadow-xl">
                <div className="bg-purple-500/10 w-12 h-12 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20 mb-6">
                  <Users size={24} />
                </div>
                <h2 className="text-2xl font-bold mb-1">Join a Session</h2>
                <p className="text-gray-600 dark:text-slate-400 text-sm mb-6">
                  Paste the unique Room ID provided by your tutor to join an ongoing classroom.
                </p>

                <form onSubmit={handleJoinSession} className="space-y-4">
                  <input
                    type="text"
                    placeholder="e.g. 123e4567-e89b-12d3..."
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950/80 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono text-sm"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all shadow-[0_4px_20px_rgba(99,102,241,0.25)] flex items-center justify-center space-x-2 active:scale-[0.98]"
                  >
                    <span>Join Classroom</span>
                    <ArrowRight size={18} />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* List/Context Side - Span 3 */}
          <div className="lg:col-span-3">
            {isTutor ? (
              // Tutor View: Sessions History List
              <div className="bg-gray-50 dark:bg-slate-900/40 backdrop-blur-md border border-gray-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl min-h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-slate-800/80 pb-4">
                  <h3 className="text-xl font-bold flex items-center space-x-2">
                    <span>Your Classroom Sessions</span>
                    <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-mono">
                      {sessions.length}
                    </span>
                  </h3>
                  <button 
                    onClick={fetchMySessions}
                    disabled={isListLoading}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    Refresh List
                  </button>
                </div>

                {isListLoading ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-gray-500 dark:text-slate-500 py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3"></div>
                    <p className="text-sm">Loading session history...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-gray-500 dark:text-slate-500 py-12 text-center">
                    <BookOpen size={48} className="text-gray-400 dark:text-slate-700 mb-4" />
                    <p className="font-semibold text-gray-600 dark:text-slate-400">No session history</p>
                    <p className="text-xs text-gray-500 dark:text-slate-600 max-w-xs mt-1">
                      Your created sessions will be saved here so you can easily enter or manage them.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {sessions.map((session) => (
                      <div 
                        key={session.roomId}
                        className="bg-gray-100 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 rounded-xl p-4 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group"
                      >
                        <div className="space-y-1 max-w-[70%]">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-gray-800 dark:text-slate-200 truncate">{session.title}</h4>
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                              session.status === "active" 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : "bg-slate-800 text-gray-600 dark:text-slate-400 border border-slate-700/50"
                            }`}>
                              {session.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-500 font-mono">
                            {session.subject && (
                              <span className="flex items-center space-x-1">
                                <BookOpen size={12} className="text-gray-500 dark:text-slate-600" />
                                <span>{session.subject}</span>
                              </span>
                            )}
                            <span className="flex items-center space-x-1">
                              <Calendar size={12} className="text-gray-500 dark:text-slate-600" />
                              <span>{formatDate(session.createdAt)}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
                          {session.status === "active" ? (
                            <>
                              <button
                                onClick={() => navigate(`/classrooms/${session.roomId}`)}
                                className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-lg text-xs font-semibold border border-indigo-500/20 transition-all flex items-center space-x-1"
                              >
                                <span>Enter Room</span>
                              </button>
                              <button
                                onClick={() => handleEndSession(session.roomId)}
                                title="End Session"
                                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg border border-red-500/20 transition-all"
                              >
                                <Power size={14} />
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-500 dark:text-slate-600 text-xs font-semibold px-3 py-1.5 flex items-center space-x-1 font-mono">
                              <Clock size={12} />
                              <span>Ended</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Student View: Active Sessions List
              <div className="bg-gray-50 dark:bg-slate-900/40 backdrop-blur-md border border-gray-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl min-h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-slate-800/80 pb-4">
                  <h3 className="text-xl font-bold flex items-center space-x-2">
                    <span>Active Live Classrooms</span>
                    <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-mono animate-[pulse_2s_infinite]">
                      {sessions.length}
                    </span>
                  </h3>
                  <button 
                    onClick={fetchActiveSessions}
                    disabled={isListLoading}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    Refresh List
                  </button>
                </div>

                {isListLoading ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-gray-500 dark:text-slate-500 py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3"></div>
                    <p className="text-sm">Scanning for active learning rooms...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="flex-grow flex flex-col space-y-6">
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-slate-500 py-6 text-center">
                      <BookOpen size={48} className="text-gray-400 dark:text-slate-700 mb-4" />
                      <p className="font-semibold text-gray-600 dark:text-slate-400">No active classrooms right now</p>
                      <p className="text-xs text-gray-500 dark:text-slate-600 max-w-xs mt-1">
                        Tutors haven't started any public classes yet. Check out the guidelines below on how to join a custom room.
                      </p>
                    </div>
                    
                    {/* Fallback guidelines */}
                    <div className="border-t border-gray-200 dark:border-slate-800/60 pt-6 space-y-4">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">How to Join a Session</h4>
                      
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold font-mono text-xs flex-shrink-0">
                            1
                          </div>
                          <div>
                            <h5 className="text-xs font-semibold text-gray-800 dark:text-slate-200">Get the Room ID</h5>
                            <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                              Ask your tutor for the unique, secure session UUID. They can copy this directly from their dashboard.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold font-mono text-xs flex-shrink-0">
                            2
                          </div>
                          <div>
                            <h5 className="text-xs font-semibold text-gray-800 dark:text-slate-200">Paste & Connect</h5>
                            <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                              Enter the UUID in the input form on the left, then click "Join Classroom" to connect your camera/mic.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {sessions.map((session) => (
                      <div 
                        key={session.roomId}
                        className="bg-gray-100 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 rounded-xl p-4 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                      >
                        <div className="space-y-2 max-w-[70%] text-left">
                          <div className="flex items-center space-x-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <h4 className="font-semibold text-gray-800 dark:text-slate-200 truncate">{session.title}</h4>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-500 font-mono">
                            {session.subject && (
                              <span className="flex items-center space-x-1">
                                <BookOpen size={12} className="text-gray-500 dark:text-slate-600" />
                                <span>{session.subject}</span>
                              </span>
                            )}
                            <span className="flex items-center space-x-1">
                              <Users size={12} className="text-gray-500 dark:text-slate-600" />
                              <span>Max {session.maxParticipants} students</span>
                            </span>
                          </div>

                          {/* Host/Tutor details */}
                          {session.host && (
                            <div className="flex items-center space-x-2 pt-1">
                              {session.host.profilePic ? (
                                <img 
                                  src={session.host.profilePic} 
                                  alt={session.host.name} 
                                  className="w-5 h-5 rounded-full object-cover border border-gray-200 dark:border-slate-800"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(session.host.name)}`;
                                  }}
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold border border-indigo-500/10">
                                  {session.host.name?.charAt(0)?.toUpperCase()}
                                </div>
                              )}
                              <span className="text-xs text-gray-600 dark:text-slate-400">
                                Hosted by <span className="text-gray-700 dark:text-slate-300 font-medium">{session.host.name}</span>
                              </span>
                              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.2 rounded uppercase tracking-wider font-semibold font-mono scale-90 origin-left">
                                Tutor
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
                          <button
                            onClick={() => navigate(`/classrooms/${session.roomId}`)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-[0_2px_10px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)] transition-all flex items-center space-x-1 active:scale-[0.97]"
                          >
                            <span>Enter Room</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>
          <Footer />
    </div>
  );
}
