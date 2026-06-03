import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { MonitorPlay, ShieldAlert, ArrowLeft, Users, Monitor } from "lucide-react";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

// Hooks
import { useClassroomsDashboard } from "../hooks/useClassroomsDashboard";

// Components
import CreateSessionForm from "../components/CreateSessionForm";
import JoinSessionForm from "../components/JoinSessionForm";
import SessionHistoryTable from "../components/SessionHistoryTable";
import ActiveSessionsList from "../components/ActiveSessionsList";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

export default function ClassroomsDashboard() {
  useDocumentTitle("Classrooms Dashboard");
  const { user, token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const isTutor = user?.role === "tutor";

  // Delegate all dashboard actions and states to the custom container hook
  const dashboard = useClassroomsDashboard(token, isTutor, navigate);

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] text-gray-900 dark:text-white flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-6xl mx-auto w-full pt-24 pb-16 px-6 relative">
        
        {/* Floating Icons Background */}
        <div className="absolute top-32 left-[0%] hidden lg:flex items-center justify-center w-16 h-16 bg-white dark:bg-surface rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-white/5 opacity-80 pointer-events-none z-0 hover:opacity-100 transition-opacity">
          <Users size={28} className="text-purple-500" />
        </div>
        <div className="absolute top-44 right-[0%] hidden lg:flex items-center justify-center w-16 h-16 bg-white dark:bg-surface rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-white/5 opacity-80 pointer-events-none z-0 hover:opacity-100 transition-opacity">
          <Monitor size={28} className="text-emerald-500" />
        </div>

        {/* Header section */}
        <div className="w-full mx-auto relative z-10">
          <div className="mb-6">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>
          
          <div className="mb-12 text-center max-w-3xl mx-auto relative pt-4">
            <div className="relative flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-wider uppercase mb-6 border border-blue-100 dark:border-blue-800/50">
                <MonitorPlay size={14} /> COLLABORATIVE LEARNING
              </div>
            </div>

            <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400">Live</span> Classrooms
            </h1>
            <p className="text-lg text-gray-600 dark:text-slate-400 font-medium">
              {isTutor 
                ? "Host live interactive lessons, chat with peers, and share your screen in real-time."
                : "Enter unique session IDs provided by your tutor to join active learning rooms."
              }
            </p>
          </div>
        </div>

        {dashboard.error && (
          <div className="max-w-3xl mx-auto mb-8 bg-red-500/15 border border-red-500/30 text-red-300 px-5 py-4 rounded-xl flex items-center space-x-3 shadow-[0_4px_20px_rgba(239,68,68,0.1)]">
            <ShieldAlert size={20} className="flex-shrink-0" />
            <span className="text-sm font-medium">{dashboard.error}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-8 items-stretch">
          
          {/* Form Side - Span 2 */}
          <div className="lg:col-span-2 space-y-6">
            {isTutor ? (
              <CreateSessionForm
                title={dashboard.title}
                setTitle={dashboard.setTitle}
                subject={dashboard.subject}
                setSubject={dashboard.setSubject}
                maxParticipants={dashboard.maxParticipants}
                setMaxParticipants={dashboard.setMaxParticipants}
                isLoading={dashboard.isLoading}
                onSubmit={dashboard.handleStartSession}
              />
            ) : (
              <JoinSessionForm
                joinRoomId={dashboard.joinRoomId}
                setJoinRoomId={dashboard.setJoinRoomId}
                onSubmit={dashboard.handleJoinSession}
              />
            )}
          </div>

          {/* List/Context Side - Span 3 */}
          <div className="lg:col-span-3">
            {isTutor ? (
              <SessionHistoryTable
                sessions={dashboard.sessions}
                isListLoading={dashboard.isListLoading}
                onRefresh={dashboard.fetchMySessions}
                onEndSession={dashboard.handleEndSession}
                navigate={navigate}
              />
            ) : (
              <ActiveSessionsList
                sessions={dashboard.sessions}
                isListLoading={dashboard.isListLoading}
                onRefresh={dashboard.fetchActiveSessions}
                navigate={navigate}
              />
            )}
          </div>

        </div>

      </div>
      <Footer />
    </div>
  );
}
