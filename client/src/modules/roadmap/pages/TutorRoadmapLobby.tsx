// @ts-nocheck

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { 
  Award, BookOpen, CheckCircle2, Plus, Target, ExternalLink, Video, FileText, Globe, User, ArrowLeft, ArrowRight, MessageSquare, Sparkles
} from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import { 
  getStudentsRoadmaps, getStudentRoadmap, assignTutorResource, verifyTopic, addTutorMilestone 
} from "../services/roadmapService";
import { LoadingState, useToast } from "../../../shared/components";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import RoadmapCollaborationPanel from "../components/RoadmapCollaborationPanel";
import logger from "../../../utils/logger";


export default function TutorRoadmapLobby() {
  useDocumentTitle("Student's Roadmap");
  const { user } = useSelector((state) => state.auth);
  const { success: showSuccess, error: showError } = useToast();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeMilestoneId, setActiveMilestoneId] = useState(null);

  // Resource Assignment Form State
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceType, setResourceType] = useState("video");
  const [resourceUrL, setResourceUrL] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Add Milestone Form State
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");

  const fetchStudents = async () => {
    try {
      const response = await getStudentsRoadmaps();
      if (response.success) {
        setStudents(response.data);
      }
    } catch (err) {
      logger.error("Failed to load student roadmaps:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setDetailsLoading(true);
    try {
      const response = await getStudentRoadmap(student.user._id);
      if (response.success) {
        setStudentDetails(response.data);
      }
    } catch (err) {
      logger.error("Failed to load student roadmap details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleVerifyToggle = async (topic) => {
    if (!selectedStudent || !studentDetails) return;
    const nextVerifyState = !topic.isVerified;
    
    try {
      const response = await verifyTopic(selectedStudent.user._id, topic._id, nextVerifyState);
      if (response.success) {
        setStudentDetails(response.data);
        // Refresh local student progress list
        setStudents(prev => prev.map(s => s._id === studentDetails._id ? response.data : s));
        showSuccess(nextVerifyState ? "Milestone verified successfully!" : "Milestone verification removed.");
      }
    } catch (err) {
      logger.error("Failed to toggle verification:", err);
      showError(err.message || "Failed to update milestone verification state.");
    }
  };

  const handleAssignResource = async (e, topicId) => {
    e.preventDefault();
    if (!resourceTitle.trim() || !resourceUrL.trim() || !selectedStudent) return;

    setActionLoading(true);
    try {
      const response = await assignTutorResource(
        selectedStudent.user._id,
        topicId,
        resourceTitle,
        resourceUrL,
        resourceType
      );

      if (response.success) {
        setStudentDetails(response.data);
        // Reset form
        setResourceTitle("");
        setResourceUrL("");
        setActiveTopicId(null);
        showSuccess("Custom resource link assigned successfully!");
      }
    } catch (err) {
      logger.error("Failed to assign resource:", err);
      showError(err.message || "Failed to assign learning resource. Please verify input data.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim() || !selectedStudent) return;
    setActionLoading(true);
    try {
      const response = await addTutorMilestone(selectedStudent.user._id, newTopicName);
      if (response.success) {
        setStudentDetails(response.data);
        setNewTopicName("");
        setShowAddMilestone(false);
        showSuccess("Custom milestone added successfully!");
      }
    } catch (err) {
      logger.error("Failed to add milestone:", err);
      showError(err.message || "Failed to add milestone.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading Student Progress Lobby..." />;

  return (
    <main className="min-h-screen transition-colors duration-300 relative bg-gradient-to-br from-[#f0eeff] via-[#f7f9fc] to-[#edfdf5] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] text-gray-900 dark:text-slate-100 flex flex-col pt-24">
      <Navbar />
      <div className="container mx-auto px-4 pb-12 flex-1 relative">
        <div className="w-full max-w-[1200px] mx-auto relative z-10">
          
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

          {/* Header Section */}
          <div className="text-center space-y-4 mb-10 relative">
            <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
               <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 shadow-sm text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-indigo-500" /> TUTOR HUB
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent">Student's</span> Roadmap
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              Monitor active roadmap tracks, recommend target study materials, and verify critical milestone completions.
            </p>
          </div>

          {/* Layout split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left panel: list of students */}
          <div className={`lg:col-span-4 space-y-4 ${selectedStudent ? 'hidden lg:block' : 'block'}`}>
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Active Students</h2>
            {students.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-none text-slate-500 dark:text-slate-400">
                No active student roadmaps found.
              </div>
            ) : (
              students.map(s => {
                const isSelected = selectedStudent?.user?._id === s.user?._id;
                return (
                  <button
                    key={s._id}
                    onClick={() => selectStudent(s)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 shadow-sm ${
                      isSelected 
                        ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                        : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-700">
                          <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{s.user?.name}</h4>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{s.user?.email}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </div>

                    <div className="space-y-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-semibold">Target:</span>
                        <span className="text-indigo-400 font-bold">{s.targetRole}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 transition-all duration-500" 
                            style={{ width: `${s.overallProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{s.overallProgress}%</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right panel: student roadmap detail view */}
          <div className="lg:col-span-8">
            {selectedStudent ? (
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-none rounded-[2rem] p-6 md:p-8 relative">
                
                {/* Back button on mobile */}
                <button 
                  onClick={() => { setSelectedStudent(null); setStudentDetails(null); }}
                  className="lg:hidden flex items-center gap-2 text-xs font-black uppercase text-indigo-400 mb-6 hover:text-indigo-300"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Students
                </button>

                {detailsLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-bold">Loading roadmap tracks...</p>
                  </div>
                ) : studentDetails ? (
                  <div>
                    {/* Student Info Card */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 mb-8 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Reviewing Profile</span>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{studentDetails.user?.name}</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Target Role: <strong className="text-slate-900 dark:text-white">{studentDetails.targetRole}</strong></p>
                      </div>

                      <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-3 rounded-2xl">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-slate-900 dark:text-white/5" />
                            <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="3" strokeDasharray={125.6} strokeDashoffset={125.6 * (1 - studentDetails.overallProgress / 100)} className="text-indigo-500 transition-all duration-1000" />
                          </svg>
                          <span className="absolute text-xs font-black">{studentDetails.overallProgress}%</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Readiness Score</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            {studentDetails.overallProgress === 100 ? "Ready for Internships" : "Training in Progress"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Milestones / Topics List */}
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-indigo-400" /> Roadmap Milestones
                      </h3>
                      <button 
                        onClick={() => setShowAddMilestone(!showAddMilestone)}
                        className="text-xs font-bold text-indigo-400 flex items-center gap-1 hover:text-indigo-300 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add Custom Milestone
                      </button>
                    </div>

                    {showAddMilestone && (
                      <form onSubmit={handleAddMilestone} className="mb-6 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl flex flex-col md:flex-row gap-3 items-end animate-fade-in">
                        <div className="flex-1 w-full">
                          <label htmlFor="newTopicName" className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1 block">Milestone Topic Name</label>
                          <input 
                            type="text" 
                            id="newTopicName"
                            value={newTopicName}
                            onChange={e => setNewTopicName(e.target.value)}
                            placeholder="e.g. Advanced System Design"
                            className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                            required
                          />
                        </div>
                        <button 
                          type="submit" 
                          disabled={actionLoading}
                          className="w-full md:w-auto px-4 py-2.5 bg-indigo-600 rounded-lg text-sm font-bold text-slate-900 dark:text-white hover:bg-indigo-500 transition-colors"
                        >
                          {actionLoading ? "Adding..." : "Save Milestone"}
                        </button>
                      </form>
                    )}

                    <div className="space-y-6">
                      {studentDetails.roadmap.map((topic, index) => {
                        const isCompleted = topic.status === "completed";
                        const isVerified = topic.isVerified;

                        return (
                          <div 
                            key={topic._id} 
                            className={`p-5 rounded-2xl border transition-all shadow-sm ${
                              isVerified 
                                ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-500/20' 
                                : isCompleted 
                                  ? 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700' 
                                  : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400">Milestone {index + 1}</span>
                                  {topic.addedByTutor && (
                                    <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded text-[8px] font-black uppercase tracking-tighter border border-purple-500/20">
                                      Tutor Added
                                    </span>
                                  )}
                                  {isVerified && (
                                    <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[8px] font-black uppercase tracking-tighter border border-indigo-500/20 flex items-center gap-0.5">
                                      <Award className="w-2.5 h-2.5" /> Verified
                                    </span>
                                  )}
                                  {isCompleted ? (
                                    <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[8px] font-black uppercase tracking-tighter border border-emerald-500/20">
                                      Completed
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[8px] font-black uppercase tracking-tighter border border-blue-500/20">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-bold text-base text-slate-900 dark:text-white">{topic.topicName}</h4>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    setActiveMilestoneId(topic._id);
                                    setPanelOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tighter transition-all flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:text-white"
                                  title="Discuss milestone"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Discuss</span>
                                </button>
                                <button
                                  onClick={() => handleVerifyToggle(topic)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tighter transition-all flex items-center gap-1 ${
                                    isVerified 
                                      ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {isVerified ? "Remove Verification" : "Verify Milestone"}
                                </button>
                              </div>
                            </div>

                            {/* Resources list inside topic */}
                            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800/40 pt-4 mt-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Resources & Materials</p>
                                <button 
                                  onClick={() => setActiveTopicId(activeTopicId === topic._id ? null : topic._id)}
                                  className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1 uppercase tracking-tighter"
                                >
                                  <Plus className="w-3 h-3" /> Add Resource
                                </button>
                              </div>

                              {/* Inline Resource Form */}
                              {activeTopicId === topic._id && (
                                <form 
                                  onSubmit={(e) => handleAssignResource(e, topic._id)}
                                  className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 mb-3 animate-fade-in"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label htmlFor="resourceTitle" className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase">Resource Title</label>
                                      <input 
                                        type="text" 
                                        id="resourceTitle"
                                        value={resourceTitle}
                                        onChange={e => setResourceTitle(e.target.value)}
                                        placeholder="e.g. Clean Code Book Guide" 
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                                      />
                                    </div>
                                    <div>
                                      <label htmlFor="resourceType" className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase">Resource Type</label>
                                      <select 
                                        id="resourceType"
                                        value={resourceType}
                                        onChange={e => setResourceType(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                                      >
                                        <option value="video">🎥 Video Link</option>
                                        <option value="article">📰 Article/Blog</option>
                                        <option value="documentation">📚 Documentation</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div>
                                    <label htmlFor="resourceUrL" className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase">URL Link</label>
                                    <input 
                                      type="url" 
                                      id="resourceUrL"
                                      value={resourceUrL}
                                      onChange={e => setResourceUrL(e.target.value)}
                                      placeholder="https://example.com/..." 
                                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2 pt-2">
                                    <button 
                                      type="button" 
                                      onClick={() => setActiveTopicId(null)}
                                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      type="submit" 
                                      disabled={actionLoading}
                                      className="px-3 py-1 bg-indigo-600 rounded text-xs font-bold text-slate-900 dark:text-white hover:bg-indigo-500"
                                    >
                                      {actionLoading ? "Adding..." : "Add Resource"}
                                    </button>
                                  </div>
                                </form>
                              )}

                              {topic.resources && topic.resources.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {topic.resources.map((res, rIdx) => (
                                    <a 
                                      key={res._id || rIdx} 
                                      href={res.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all border ${
                                        res.tutorAssigned 
                                          ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20' 
                                          : 'bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/60'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        {res.type === 'video' ? <Video className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 flex-shrink-0" /> : res.type === 'article' ? <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 flex-shrink-0" /> : <Globe className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 flex-shrink-0" />}
                                        <span className="truncate">{res.title}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                                        {res.tutorAssigned && (
                                          <span className="px-1.5 py-0.5 bg-indigo-500 text-slate-900 dark:text-white rounded text-[7px] font-black uppercase">Tutor</span>
                                        )}
                                        <ExternalLink className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">No resources added yet.</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-500 dark:text-slate-400 font-medium">
                    Select a student to view details.
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30 rounded-[2rem] p-20 text-center h-[500px]">
                <Target className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-4" />
                <h3 className="font-bold text-lg text-slate-700 dark:text-slate-300">Select a Student Roadmap</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
                  Click on any student profile on the left sidebar to view their roadmap, assign study resources, or verify milestone completions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Collaboration Sidebar Panel */}
      {studentDetails && (
        <RoadmapCollaborationPanel
          roadmapId={studentDetails._id}
          isOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
          initialMilestoneId={activeMilestoneId}
          milestones={studentDetails.roadmap}
          currentUser={user}
        />
      )}
      <Footer />
    </main>
  );
}
