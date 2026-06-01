import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Clock, CheckCircle, Video, ArrowRight, User, ArrowLeft } from "lucide-react";
import { apiRequest } from "../../../services/apiClient.js";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import { useDocumentTitle } from "../../../hooks/useDocumentTitle";


import logger from "../../../utils/logger";

const TutorInterviewsList = () => {
  useDocumentTitle("Tutor Interviews List");
  const { token } = useSelector((state) => state.auth);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const result = await apiRequest("/api/interviews/tutor/sessions", { token });
        if (result.success) {
          setSessions(result.data?.sessions || []);
        }
      } catch (err) {
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Navbar />
      <div className="flex-1 px-6 pb-6 pt-24 sm:px-10 sm:pb-10">
        <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-500 mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Student Mock Interviews</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Review completed AI mock interviews and provide manual feedback.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {sessions.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <Video className="mx-auto mb-4 opacity-50" size={48} />
              <p>No completed student interviews found.</p>
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
    </div>
  );
};

export default TutorInterviewsList;
