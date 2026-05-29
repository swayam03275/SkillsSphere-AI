import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { CheckCircle2, Circle, Clock, Rocket, Target, Award, Star, MessageSquare } from "lucide-react";
import Navbar from "../../../shared/landing/Navbar";
import { getMyRoadmap, updateTopicStatus } from "../services/roadmapService";
import { LoadingState, useToast } from "../../../shared/components";
import ContributionSummaryCard from "../components/ContributionSummaryCard";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import RoadmapCollaborationPanel from "../components/RoadmapCollaborationPanel";

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
      console.error("Failed to fetch roadmap:", err);
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
      }
    } catch (err) {
      console.error("Update failed:", err);
      showError(err.message || "Failed to update milestone status.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <LoadingState message="Mapping your career path..." />;

  if (!roadmap) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--text-main)] pt-24">
        <Navbar />
        <div className="pt-40 flex flex-col items-center justify-center text-center px-4">
          <div className="p-6 bg-primary/10 rounded-full mb-6">
            <Target className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-4xl font-black mb-4">No Active Roadmap</h1>
          <p className="text-text-muted max-w-md mb-8">
            Analyze your resume first to generate a personalized learning roadmap tailored to your target role.
          </p>
          <a href="/resume-analyzer" className="px-8 py-3 bg-primary rounded-xl font-bold hover:scale-105 transition-all">
            Analyze Resume
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-main)] font-sans pt-24">
      <Navbar />
      <div className="max-w-4xl mx-auto pt-32 pb-20 px-4">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 animate-slide-up">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary/20 rounded-md">
                <Rocket className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-primary">Your Learning Journey</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight leading-tight">
              Mastering <span className="text-gradient">{roadmap.targetRole}</span>
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-stretch md:items-end">
            <ContributionSummaryCard roadmap={roadmap} />

            <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-2xl flex items-center gap-4 shadow-xl">
              <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-[var(--border)] opacity-40" />
                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={175.9} strokeDashoffset={175.9 * (1 - roadmap.overallProgress / 100)} className="text-primary transition-all duration-1000" />
                  </svg>
                  <span className="absolute text-sm font-black">{roadmap.overallProgress}%</span>
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase">Overall Readiness</p>
                <p className="text-lg font-black">{roadmap.overallProgress === 100 ? "Job Ready!" : "In Progress"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap Visualization */}
        <div className="relative space-y-12 pl-4 md:pl-0">
          {/* Vertical Line */}
          <div className="absolute left-[23px] top-4 bottom-4 w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-full hidden md:block md:left-1/2 md:-ml-0.5 opacity-20"></div>

          {roadmap.roadmap.map((topic, index) => {
            const isCompleted = topic.status === "completed";
            const isLeft = index % 2 === 0;
            const isContribution = topic.type === "contribution";
            const completedBorderColor = isContribution ? 'bg-amber-500 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-primary border-primary shadow-[0_0_15px_rgba(99,102,241,0.5)]';
            const cardBorderCompleted = isContribution ? 'border-amber-500/30' : 'border-primary/30';
            const cardHoverBorder = isContribution ? 'hover:border-amber-500/50' : 'hover:border-primary/50';
            const glowColor = isContribution ? 'bg-amber-500/10' : 'bg-primary/10';

            return (
              <div key={topic._id} className={`relative flex items-center gap-8 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"} animate-slide-up`} style={{ animationDelay: `${index * 100}ms` }}>
                
                {/* Visual Dot on the line */}
                 <div className={`absolute left-[19px] md:left-1/2 md:-ml-3 w-6 h-6 rounded-full border-4 ${isCompleted ? completedBorderColor : 'bg-[var(--background)] border-[var(--border)]'} z-20 transition-all duration-500`}>
                   {isCompleted && (isContribution ? <Star className="w-full h-full text-white p-0.5" /> : <CheckCircle2 className="w-full h-full text-white p-0.5" />)}
                </div>

                {/* Content Card */}
                <div className={`w-full md:w-1/2 ${isLeft ? "md:pr-16" : "md:pl-16"}`}>
                  <div className={`group p-6 bg-[var(--surface)] border ${isCompleted ? cardBorderCompleted : (isContribution ? 'border-amber-500/20' : 'border-[var(--border)]')} rounded-[2rem] ${cardHoverBorder} transition-all hover:bg-[var(--surface-hover)] shadow-lg relative overflow-hidden`}>
                    
                    {/* Background Glow */}
                    {isCompleted && <div className={`absolute -top-12 -right-12 w-24 h-24 ${glowColor} rounded-full blur-[40px] pointer-events-none`}></div>}

                    <div className="flex items-start justify-between mb-4">
                       <span className={`text-[10px] font-black uppercase tracking-widest ${isContribution ? 'text-amber-500' : 'text-[var(--text-muted)]'} flex items-center gap-1`}>
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

                     <h3 className={`text-xl font-bold text-[var(--text-main)] mb-4 transition-colors ${isContribution ? 'group-hover:text-amber-500' : 'group-hover:text-primary'}`}>
                      {topic.topicName}
                    </h3>

                    {topic.resources && topic.resources.length > 0 && (
                      <div className="mt-2 mb-4 space-y-2 border-t border-[var(--border)] border-opacity-30 pt-3">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1">Study Resources:</p>
                        {topic.resources.map((res, rIdx) => (
                          <a 
                            key={res._id || rIdx} 
                            href={res.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all border ${res.tutorAssigned ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20' : 'bg-[var(--surface-soft)] border-[var(--border)] border-opacity-30 hover:bg-[var(--surface-hover)] text-[var(--text-main)]'}`}
                          >
                            <span className="truncate max-w-[200px]">{res.title}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                              {res.tutorAssigned && (
                                <span className="px-1.5 py-0.5 bg-indigo-500 text-white rounded text-[8px] font-black uppercase tracking-tighter">Tutor</span>
                              )}
                              <span className="text-[10px] uppercase tracking-tighter text-[var(--text-muted)] opacity-80">{res.type}</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                       <button 
                         onClick={() => handleStatusUpdate(topic._id, topic.status)}
                         disabled={updatingId === topic._id || topic.isVerified}
                         className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${topic.isVerified ? 'bg-indigo-500/10 text-indigo-400 cursor-not-allowed' : isCompleted ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : isContribution ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white' : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'}`}
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
                         className="flex items-center gap-1.5 p-2 bg-[var(--surface-soft)] border border-[var(--border)] border-opacity-30 rounded-xl text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all shadow-md"
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
        <div className="mt-20 p-12 bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/20 rounded-[3rem] text-center relative overflow-hidden group shadow-2xl">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
           <div className="relative z-10">
              <Award className="w-16 h-16 text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
              <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Career Readiness Goal</h2>
              <p className="text-[var(--text-muted)] max-w-lg mx-auto mb-8 font-medium italic">
                "Complete this roadmap to reach top-tier competency for <span className="text-[var(--text-main)] font-bold">{roadmap.targetRole}</span> roles. Your progress is synced across recruiters and mentors."
              </p>
              <div className="h-2 w-full bg-[var(--border)]/20 rounded-full overflow-hidden max-w-md mx-auto">
                <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${roadmap.overallProgress}%` }}></div>
              </div>
           </div>
        </div>
      </div>

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
    </div>
  );
};

export default RoadmapPage;
