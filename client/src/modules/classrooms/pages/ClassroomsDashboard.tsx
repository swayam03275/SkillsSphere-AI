// @ts-nocheck

import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { MonitorPlay, ShieldAlert, ArrowLeft, Users, Monitor, Sparkles } from "lucide-react";
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
        
        {/* Floating Icons Background (managed in hero section now) */}

        {/* Header section */}
        <div className="w-full mx-auto relative z-10">
          {/* Back to Dashboard Link */}
          <div className="py-6">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>
          
          {/* Hero Section */}
          <div className="text-center space-y-4 mb-10 relative">
            <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
               <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <Monitor className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-purple-500" /> COLLABORATIVE LEARNING
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Live</span> Classrooms
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              {isTutor 
                ? "Host live interactive lessons, chat with peers, and share your screen in real-time."
                : "Join live interactive lessons, chat with peers, and learn in real-time."}
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
