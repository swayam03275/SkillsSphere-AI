import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Video, Users, ArrowRight, MonitorPlay, Calendar, BookOpen, Clock, Power, ShieldAlert } from "lucide-react";
import {
  createClassroomSession,
  getTutorClassroomSessions,
  endClassroomSession,
} from "../services/classroomService";

export default function ClassroomsDashboard() {
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
    if (isTutor && token) {
      fetchMySessions();
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
    <div className="min-h-screen bg-[#020617] text-white pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl mb-6 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)] animate-[pulse_3s_infinite]">
            <MonitorPlay size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Live Interactive Classrooms
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
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
              <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                <div className="bg-indigo-500/10 w-12 h-12 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 mb-6">
                  <Video size={24} />
                </div>
                <h2 className="text-2xl font-bold mb-1">Create a Session</h2>
                <p className="text-slate-400 text-sm mb-6">
                  Launch a secure, high-quality audio and video learning room.
                </p>

                <form onSubmit={handleStartSession} className="space-y-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                      Session Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Advanced JS Concepts"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                      Subject / Topic
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
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
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
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
              <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-8 shadow-xl">
                <div className="bg-purple-500/10 w-12 h-12 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20 mb-6">
                  <Users size={24} />
                </div>
                <h2 className="text-2xl font-bold mb-1">Join a Session</h2>
                <p className="text-slate-400 text-sm mb-6">
                  Paste the unique Room ID provided by your tutor to join an ongoing classroom.
                </p>

                <form onSubmit={handleJoinSession} className="space-y-4">
                  <input
                    type="text"
                    placeholder="e.g. 123e4567-e89b-12d3..."
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono text-sm"
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
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl min-h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b border-slate-800/80 pb-4">
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
                  <div className="flex-grow flex flex-col items-center justify-center text-slate-500 py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3"></div>
                    <p className="text-sm">Loading session history...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-slate-500 py-12 text-center">
                    <BookOpen size={48} className="text-slate-700 mb-4" />
                    <p className="font-semibold text-slate-400">No session history</p>
                    <p className="text-xs text-slate-600 max-w-xs mt-1">
                      Your created sessions will be saved here so you can easily enter or manage them.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {sessions.map((session) => (
                      <div 
                        key={session.roomId}
                        className="bg-slate-950/60 border border-slate-850 hover:border-slate-800 rounded-xl p-4 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group"
                      >
                        <div className="space-y-1 max-w-[70%]">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-slate-200 truncate">{session.title}</h4>
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                              session.status === "active" 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : "bg-slate-800 text-slate-400 border border-slate-700/50"
                            }`}>
                              {session.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                            {session.subject && (
                              <span className="flex items-center space-x-1">
                                <BookOpen size={12} className="text-slate-600" />
                                <span>{session.subject}</span>
                              </span>
                            )}
                            <span className="flex items-center space-x-1">
                              <Calendar size={12} className="text-slate-600" />
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
                            <span className="text-slate-600 text-xs font-semibold px-3 py-1.5 flex items-center space-x-1 font-mono">
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
              // Student View: Premium Guidelines Context
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-8 shadow-xl space-y-6">
                <h3 className="text-xl font-bold border-b border-slate-800 pb-3">How to Join a Live Session</h3>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold font-mono text-sm flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200">Get the Room ID</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Ask your tutor for the unique, secure session UUID. They can copy this directly from their dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold font-mono text-sm flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200">Connect Your Hardware</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Make sure your camera, microphone, and speakers are fully connected. The classroom utilizes standard WebRTC protocols.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold font-mono text-sm flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200">Enter & Learn</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Once inside, you can engage via real-time HD audio, chat messages, hand-raising, and screen-sharing widgets.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-500/5 border border-indigo-500/10 text-indigo-300 p-4 rounded-xl text-xs leading-relaxed flex items-start space-x-3">
                  <Clock size={16} className="mt-0.5 flex-shrink-0 text-indigo-400" />
                  <span>
                    Note: Live rooms are ephemeral and close when the host terminates the session. Make sure your tutor has already initialized the room before you try to join.
                  </span>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
