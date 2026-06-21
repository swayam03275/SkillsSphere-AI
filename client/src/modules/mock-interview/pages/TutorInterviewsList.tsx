
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Clock, CheckCircle, Video, ArrowRight, ArrowLeft, Users, Sparkles, User } from "lucide-react";
import { apiRequest } from "../../../services/apiClient.js";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import { useDocumentTitle } from "../../../hooks/useDocumentTitle";


import logger from "../../../utils/logger";

const TutorInterviewsList = () => {
  useDocumentTitle("Tutor Interviews List");
  const { token } = useSelector((state: any) => state.auth);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const result = await apiRequest("/api/interviews/tutor/sessions", { token });
        if (result.success) {
          setSessions(result.data?.sessions || []);
        }
      } catch (err: any) {
        logger.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 pt-24">
        <Navbar />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen transition-colors duration-300 relative bg-gradient-to-br from-[#f0eeff] via-[#f7f9fc] to-[#edfdf5] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] text-gray-900 dark:text-slate-100 flex flex-col pt-24">
      <Navbar />
      <div className="container mx-auto px-4 pb-12 flex-1 relative">
        <div className="w-full max-w-[1200px] mx-auto relative z-10 flex flex-col gap-6">
          
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
            <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
               <Video className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 shadow-sm text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-indigo-500" /> TUTOR HUB
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent">Student's</span> Interview
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              Review completed AI mock interviews and provide manual feedback.
            </p>
          </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-none overflow-hidden">
          {sessions.length === 0 ? (
            <div className="py-24 px-10 flex flex-col items-center justify-center min-h-[400px] text-center text-slate-500">
              <Video className="mb-4 opacity-50" size={48} />
              <p className="text-lg font-medium">No completed student interviews found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-400 uppercase">Student</th>
                    <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-400 uppercase">Topic</th>
                    <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-400 uppercase">Date</th>
                    <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-400 uppercase">AI Score</th>
                    <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-400 uppercase">Tutor Score</th>
                    <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-400 uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {sessions.map((session) => (
                    <tr key={session._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <User size={16} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{session.userId?.name || "Unknown"}</p>
                            <p className="text-xs text-slate-500">{session.userId?.email || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-800 dark:text-slate-300">
                          {session.topic}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 flex items-center gap-2">
                        <Clock size={14} /> {new Date(session.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 dark:text-white">{session.overallScore}%</span>
                      </td>
                      <td className="px-6 py-4">
                        {session.tutorOverallScore ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <CheckCircle size={14} /> {session.tutorOverallScore}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm italic">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          to={`/tutor/interviews/${session._id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg text-sm font-medium transition-colors"
                        >
                          Review <ArrowRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>
      <Footer />
    </main>
  );
};

export default TutorInterviewsList;
