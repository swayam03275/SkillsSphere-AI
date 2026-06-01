import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { MonitorPlay, ShieldAlert, ArrowLeft } from "lucide-react";
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

        {dashboard.error && (
          <div className="max-w-3xl mx-auto mb-8 bg-red-500/15 border border-red-500/30 text-red-300 px-5 py-4 rounded-xl flex items-center space-x-3 shadow-[0_4px_20px_rgba(239,68,68,0.1)]">
            <ShieldAlert size={20} className="flex-shrink-0" />
            <span className="text-sm font-medium">{dashboard.error}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          
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
