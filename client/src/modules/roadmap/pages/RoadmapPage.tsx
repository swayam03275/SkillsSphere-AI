// @ts-nocheck

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Clock, Rocket, Target, Award, Star, MessageSquare, ArrowLeft, Sparkles, TrendingUp } from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import { getMyRoadmap, updateTopicStatus } from "../services/roadmapService";
import { LoadingState, useToast } from "../../../shared/components";
import ContributionSummaryCard from "../components/ContributionSummaryCard";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import RoadmapCollaborationPanel from "../components/RoadmapCollaborationPanel";
import logger from "../../../utils/logger";

const RoadmapPage = () => {
  useDocumentTitle("Roadmap");
  const { user } = useSelector((state) => state.auth);
  const { success: showSuccess, error: showError } = useToast();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeMilestoneId, setActiveMilestoneId] = useState(null);

  const fetchRoadmap = async () => {
    try {
      const response = await getMyRoadmap();
      if (response.success) {
        setRoadmap(response.data);
      }
    } catch (err) {
      logger.error("Failed to fetch roadmap:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const handleStatusUpdate = async (topicId, currentStatus) => {
    const nextStatus = currentStatus === "completed" ? "in_progress" : "completed";
    setUpdatingId(topicId);
    try {
      const response = await updateTopicStatus(topicId, nextStatus);
      if (response.success) {
        setRoadmap(response.data);
        showSuccess(`Milestone marked as ${nextStatus === "completed" ? "Completed" : "In Progress"}.`);
        
        if (response.newBadges && response.newBadges.length > 0) {
          response.newBadges.forEach(badge => {
            showSuccess(`🏅 Achievement Unlocked: ${badge}!`);
          });
        }
      }
    } catch (err) {
      logger.error("Update failed:", err);
      showError(err.message || "Failed to update milestone status.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <LoadingState message="Mapping your career path..." />;

  if (!roadmap) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col">
        <Navbar />
        
        <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden">
          {/* Background glow effects */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-[120px]" />
            <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-purple-100/40 dark:bg-purple-900/10 blur-[100px]" />
            <div className="absolute top-[5%] right-[20%] w-[35%] h-[35%] rounded-full bg-teal-50/40 dark:bg-teal-900/10 blur-[100px]" />
          </div>

          <div className="w-full max-w-[1200px] relative z-10">
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
                 <Rocket className="w-6 h-6 text-purple-600" />
              </div>
              <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
                 <Target className="w-6 h-6 text-emerald-600" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
                <Sparkles size={12} className="text-purple-500" /> Advanced AI Roadmap Active
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Learning</span> Roadmap
              </h1>
              
              <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
                Your personalized AI-generated learning path. Complete milestones to 
                <br className="hidden sm:block" /> achieve job readiness and earn achievements.
              </p>
            </div>
            
            {/* Empty State Card */}
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900/30 rounded-3xl border border-gray-100 dark:border-white/5 shadow-xl mt-8">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                <Target className="w-10 h-10 text-indigo-500" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">No Active Roadmap</h3>
              <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto mb-8">
                Analyze your resume first to generate a personalized learning roadmap tailored to your target role.
              </p>
              <Link 
                to="/resume-analyzer"
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 hover:from-indigo-500 hover:to-teal-400"
              >
                <TrendingUp size={18} />
                Analyze Resume
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-purple-100/40 dark:bg-purple-900/10 blur-[100px]" />
          <div className="absolute top-[5%] right-[20%] w-[35%] h-[35%] rounded-full bg-teal-50/40 dark:bg-teal-900/10 blur-[100px]" />
        </div>

        <div className="w-full max-w-[1200px] relative z-10">
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

          {/* Hero Section (Globally Visible) */}
          <div className="text-center space-y-4 mb-10 relative">
            {/* Floating Icons */}
            <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
               <Rocket className="w-6 h-6 text-purple-600" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <Target className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-purple-500" /> Advanced AI Roadmap Active
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              Mastering <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">{roadmap.targetRole}</span>
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              Your personalized AI-generated learning path. Complete milestones to 
              <br className="hidden sm:block" /> achieve job readiness and earn achievements.
            </p>
          </div>

          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4 justify-center items-stretch md:items-end mb-16">
            <ContributionSummaryCard roadmap={roadmap} />

            <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-white/10" />
                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={175.9} strokeDashoffset={175.9 * (1 - roadmap.overallProgress / 100)} className="text-indigo-500 transition-all duration-1000" />
                  </svg>
                  <span className="absolute text-sm font-black">{roadmap.overallProgress}%</span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Overall Readiness</p>
                <p className="text-lg font-black text-gray-900 dark:text-white">{roadmap.overallProgress === 100 ? "Job Ready!" : "In Progress"}</p>
                {roadmap.achievements && roadmap.achievements.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {roadmap.achievements.map((ach, i) => (
                      <div key={i} title={ach.badge} className="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center border border-yellow-400/40 shadow-[0_0_10px_rgba(250,204,21,0.3)] cursor-help hover:scale-110 transition-transform">
                        <Award className="w-3.5 h-3.5 text-yellow-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>


          <div className="max-w-4xl mx-auto relative space-y-12 pl-4 md:pl-0">
          {/* Vertical Line */}
          <div className="absolute left-[23px] top-4 bottom-4 w-1 bg-gradient-to-b from-indigo-500 via-indigo-500/50 to-transparent rounded-full hidden md:block md:left-1/2 md:-ml-0.5 opacity-20"></div>

          {roadmap.roadmap.map((topic, index) => {
            const isCompleted = topic.status === "completed";
            const isLeft = index % 2 === 0;
            const isContribution = topic.type === "contribution";
            const completedBorderColor = isContribution ? 'bg-amber-500 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-indigo-500 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]';
            const cardBorderCompleted = isContribution ? 'border-amber-500/30' : 'border-indigo-500/30';
            const cardHoverBorder = isContribution ? 'hover:border-amber-500/50' : 'hover:border-indigo-500/50';
            const glowColor = isContribution ? 'bg-amber-500/10' : 'bg-indigo-500/10';

            return (
              <div key={topic._id} className={`relative flex items-center gap-8 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"} animate-slide-up [animation-delay:var(--tw-delay)]`} style={{ '--tw-delay': `${index * 100}ms` }}>
                
                {/* Visual Dot on the line */}
                 <div className={`absolute left-[19px] md:left-1/2 md:-ml-3 w-6 h-6 rounded-full border-4 ${isCompleted ? completedBorderColor : 'bg-white dark:bg-[#121214] border-gray-200 dark:border-white/10'} z-20 transition-all duration-500`}>
                   {isCompleted && (isContribution ? <Star className="w-full h-full text-white p-0.5" /> : <CheckCircle2 className="w-full h-full text-white p-0.5" />)}
                </div>

                {/* Content Card */}
                <div className={`w-full md:w-1/2 ${isLeft ? "md:pr-16" : "md:pl-16"}`}>
                  <div className={`group p-6 bg-white dark:bg-[#121214] border ${isCompleted ? cardBorderCompleted : (isContribution ? 'border-amber-500/20' : 'border-gray-100 dark:border-white/5')} rounded-3xl ${cardHoverBorder} transition-all hover:bg-gray-50 dark:hover:bg-white/5 shadow-sm relative overflow-hidden`}>
                    
                    {/* Background Glow */}
                    {isCompleted && <div className={`absolute -top-12 -right-12 w-24 h-24 ${glowColor} rounded-full blur-[40px] pointer-events-none`}></div>}

                    <div className="flex items-start justify-between mb-4">
                       <span className={`text-[10px] font-black uppercase tracking-widest ${isContribution ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'} flex items-center gap-1`}>
                         {isContribution ? <Star className="w-3 h-3" /> : null}
                         {index + 1}. {isContribution ? "Contribution" : "Milestone"}
                       </span>
                       <div className="flex items-center gap-1.5">
                         {topic.isVerified && (
                           <div className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-[8px] font-black uppercase tracking-tighter border border-indigo-500/20 flex items-center gap-1 animate-pulse">
                              <Award className="w-3 h-3 text-indigo-400" /> Verified
                           </div>
                         )}
                         {isCompleted ? (
                           <div className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[8px] font-black uppercase tracking-tighter border border-emerald-500/20">
                              Completed
                           </div>
                         ) : (
                           <div className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[8px] font-black uppercase tracking-tighter border border-blue-500/20">
                              Active
                           </div>
                         )}
                       </div>
                    </div>

                     <h3 className={`text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors ${isContribution ? 'group-hover:text-amber-500' : 'group-hover:text-indigo-500'}`}>
                      {topic.topicName}
                    </h3>

                    {topic.resources && topic.resources.length > 0 && (
                      <div className="mt-2 mb-4 space-y-2 border-t border-gray-100 dark:border-white/10 pt-3">
                        <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Study Resources:</p>
                        {topic.resources.map((res, rIdx) => (
                          <a 
                            key={res._id || rIdx} 
                            href={res.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all border ${res.tutorAssigned ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200'}`}
                          >
                            <span className="truncate max-w-[200px]">{res.title}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                              {res.tutorAssigned && (
                                <span className="px-1.5 py-0.5 bg-indigo-500 text-white rounded text-[8px] font-black uppercase tracking-tighter">Tutor</span>
                              )}
                              <span className="text-[10px] uppercase tracking-tighter text-gray-500 dark:text-gray-400 opacity-80">{res.type}</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                       <button 
                         onClick={() => handleStatusUpdate(topic._id, topic.status)}
                         disabled={updatingId === topic._id || topic.isVerified}
                         className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${topic.isVerified ? 'bg-indigo-500/10 text-indigo-400 cursor-not-allowed' : isCompleted ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' : isContribution ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:bg-amber-500 hover:text-white' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white'}`}
                       >
                         {updatingId === topic._id ? (
                           <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                         ) : topic.isVerified ? (
                           <> <Award className="w-4 h-4" /> Verified Completed </>
                         ) : isCompleted ? (
                           <> {isContribution ? <Star className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} Mastery Achieved </>
                         ) : (
                           <> <Award className="w-4 h-4" /> Mark as Completed </>
                         )}
                       </button>

                       <button 
                         onClick={() => {
                           setActiveMilestoneId(topic._id);
                           setPanelOpen(true);
                         }}
                         className="flex items-center gap-1.5 p-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                         title="Discuss Milestone"
                       >
                         <MessageSquare className="w-4 h-4" />
                         <span>Discuss</span>
                       </button>
                    </div>
                  </div>
                </div>

                {/* Empty spacer for grid */}
                <div className="hidden md:block w-1/2"></div>
              </div>
            );
          })}
        </div>

        {/* Graduation / Job Ready Note */}
        <div className="max-w-4xl mx-auto mt-20 p-12 bg-gradient-to-br from-indigo-500/20 to-teal-500/10 border border-indigo-500/20 rounded-3xl text-center relative overflow-hidden group shadow-lg">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
           <div className="relative z-10">
              <Award className="w-16 h-16 text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
              <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter text-gray-900 dark:text-white">Career Readiness Goal</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto mb-8 font-medium italic">
                "Complete this roadmap to reach top-tier competency for <span className="text-gray-900 dark:text-white font-bold">{roadmap.targetRole}</span> roles. Your progress is synced across recruiters and mentors."
              </p>
              <div className="h-2 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden max-w-md mx-auto">
                <div className="h-full bg-indigo-500 transition-all duration-1000 w-[var(--tw-width)]" style={{ '--tw-width': `${roadmap.overallProgress}%` }}></div>
              </div>
           </div>
        </div>
        </div>
      </main>

      {/* Collaboration Sidebar Panel */}
      {roadmap && (
        <RoadmapCollaborationPanel
          roadmapId={roadmap._id}
          isOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
          initialMilestoneId={activeMilestoneId}
          milestones={roadmap.roadmap}
          currentUser={user}
        />
      )}
      <Footer />
    </div>
  );
};

export default RoadmapPage;
