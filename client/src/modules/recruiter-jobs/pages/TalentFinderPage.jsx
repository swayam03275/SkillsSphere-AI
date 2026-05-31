import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Sliders, 
  Sparkles, 
  User, 
  Mail, 
  GraduationCap, 
  Briefcase, 
  CheckCircle, 
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Globe,
  Award,
  AlertTriangle,
  RefreshCw,
  X,
  FileText,
  Clock,
  Send,
  Loader2,
  Code
} from 'lucide-react';
import Navbar from '../../../modules/landing/components/Navbar';
import Footer from "../../../modules/landing/components/Footer";

import { Button, LoadingState, ErrorState, EmptyState } from '../../../shared/components';
import { getRecruiterJobs } from '../services/jobPostingService';
import { searchTalent, matchCandidate, inviteCandidate } from '../services/talentFinderService';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';

const matchCategoryStyles = {
  "Excellent Match": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Moderate Match": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Growth Potential": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Weak Alignment": "bg-red-500/10 text-red-400 border-red-500/20",
};

const getSignalStyle = (signal) => {
  if (signal.includes("Fast-Track") || signal.includes("Strong")) {
    return "bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]";
  }
  if (signal.includes("Interview") || signal.includes("Round")) {
    return "bg-blue-500/10 text-blue-400 border-blue-500/30";
  }
  if (signal.includes("Required") || signal.includes("Needed") || signal.includes("Weakness")) {
    return "bg-amber-500/10 text-amber-400 border-amber-500/30";
  }
  return "bg-slate-500/10 text-slate-400 border-slate-500/30";
};

const TalentFinderPage = () => {
  useDocumentTitle("Talent Finder");
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);

  // Job posting lists for dropdown selector
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [qParam, setQParam] = useState(''); // commit query only on click search
  const [skillsFilter, setSkillsFilter] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [minAtsScore, setMinAtsScore] = useState(0);
  const [specialization, setSpecialization] = useState('');

  // Candidates list & loading states
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Individual Candidate Matching & Inviting progress maps
  const [matchLoadingMap, setMatchLoadingMap] = useState({});
  const [matchResultMap, setMatchResultMap] = useState({});
  const [inviteLoadingMap, setInviteLoadingMap] = useState({});
  const [invitedMap, setInvitedMap] = useState({});

  // Expanded candidate card tracker
  const [expandedCardId, setExpandedCardId] = useState(null);

  // Load recruiter's active jobs
  useEffect(() => {
    const fetchJobs = async () => {
      setJobsLoading(true);
      try {
        const response = await getRecruiterJobs(token, 1, 100);
        // keep only open jobs
        const openJobs = (response.jobs || []).filter(j => j.status === 'open');
        setJobs(openJobs);
        if (openJobs.length > 0) {
          setSelectedJobId(openJobs[0]._id);
        }
      } catch (err) {
        console.error("Failed to load recruiter jobs:", err);
      } finally {
        setJobsLoading(false);
      }
    };

    if (token) {
      fetchJobs();
    }
  }, [token]);

  // Load candidates on query/filter updates
  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        q: qParam || undefined,
        skills: skillsFilter || undefined,
        graduationYear: graduationYear || undefined,
        minAtsScore: minAtsScore > 0 ? minAtsScore : undefined,
        specialization: specialization || undefined,
        page,
        limit: 10
      };

      const response = await searchTalent(filters, token);
      setCandidates(response.candidates);
      setTotalPages(response.pagination.pages);
      setTotalCount(response.pagination.total);
    } catch (err) {
      setError(err.message || "Failed to search student directory.");
    } finally {
      setLoading(false);
    }
  }, [qParam, skillsFilter, graduationYear, minAtsScore, specialization, page, token]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Trigger candidate match pipeline
  const handleCalculateMatch = async (e, candidateId) => {
    e.stopPropagation();
    if (!selectedJobId) {
      alert("Please select a job posting to match the candidate against.");
      return;
    }

    setMatchLoadingMap(prev => ({ ...prev, [candidateId]: true }));
    try {
      const response = await matchCandidate(candidateId, selectedJobId, token);
      setMatchResultMap(prev => ({ ...prev, [candidateId]: response.matchResult }));
      // Automatically expand card to show match breakdowns
      setExpandedCardId(candidateId);
    } catch (err) {
      alert(err.message || "AI matching failed. Please try again.");
    } finally {
      setMatchLoadingMap(prev => ({ ...prev, [candidateId]: false }));
    }
  };

  // Trigger invite to apply
  const handleInviteCandidate = async (e, candidateId) => {
    e.stopPropagation();
    if (!selectedJobId) {
      alert("Please select a job posting to invite the candidate to.");
      return;
    }

    setInviteLoadingMap(prev => ({ ...prev, [candidateId]: true }));
    try {
      await inviteCandidate(candidateId, selectedJobId, token);
      setInvitedMap(prev => ({ ...prev, [candidateId]: true }));
    } catch (err) {
      alert(err.message || "Failed to invite candidate.");
    } finally {
      setInviteLoadingMap(prev => ({ ...prev, [candidateId]: false }));
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setQParam('');
    setSkillsFilter('');
    setGraduationYear('');
    setMinAtsScore(0);
    setSpecialization('');
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setQParam(searchQuery);
    setPage(1);
  };

  const selectedJob = jobs.find(j => j._id === selectedJobId);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] p-4 sm:p-6 pt-24 sm:pt-32 text-gray-900 dark:text-slate-100">
      <Navbar />

      <div className="mx-auto max-w-7xl w-full space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 mb-2 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
              Talent <span className="text-gradient">Finder</span>
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm max-w-2xl">
              Proactively search the student database, run AI matching algorithms against your job postings, and invite passive talent to apply instantly.
            </p>
          </div>
          
          {/* Active Job Selector Context */}
          <div className="bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/5 p-4 rounded-2xl flex flex-col gap-2 min-w-[280px]">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles size={12} className="text-emerald-400" />
              Target Matching Job
            </span>
            {jobsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="animate-spin text-blue-400" size={16} /> Loading active jobs...
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-sm font-semibold text-amber-400 flex items-center gap-1">
                <AlertTriangle size={14} /> Create an open job first!
              </div>
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(e.target.value);
                  setMatchResultMap({}); // reset calculated scores on job context switch
                }}
                className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-white/5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 outline-none"
              >
                {jobs.map(job => (
                  <option key={job._id} value={job._id} className="bg-white dark:bg-slate-900">
                    {job.title} ({job.company})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Filters and List Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Left Column: Search & Smart Filters Sidebar */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/5 backdrop-blur-md p-6 rounded-3xl space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/5">
              <span className="font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2 text-lg">
                <Sliders size={18} className="text-blue-400" /> Smart Filters
              </span>
              <button 
                onClick={handleResetFilters}
                className="text-xs font-medium text-gray-400 dark:text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <RefreshCw size={12} /> Reset
              </button>
            </div>

            {/* Specialization Filter */}
            <div className="space-y-2">
              <label className="block text-xs uppercase font-extrabold tracking-wider text-slate-500">
                Technical Specialty
              </label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-slate-200 focus:border-blue-500/50 outline-none transition-colors"
              >
                <option value="" className="bg-white dark:bg-slate-900">All Fields</option>
                <option value="frontend" className="bg-white dark:bg-slate-900">Frontend Specialists</option>
                <option value="backend" className="bg-white dark:bg-slate-900">Backend Specialists</option>
                <option value="fullstack" className="bg-white dark:bg-slate-900">Full Stack Candidates</option>
                <option value="devops" className="bg-white dark:bg-slate-900">DevOps Experts</option>
                <option value="aiml" className="bg-white dark:bg-slate-900">AI / ML Engineers</option>
                <option value="database" className="bg-white dark:bg-slate-900">Database Specialists</option>
              </select>
            </div>

            {/* Minimum ATS Score Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs uppercase font-extrabold tracking-wider text-slate-500">
                  Min ATS Score
                </label>
                <span className="text-sm font-bold text-indigo-400">{minAtsScore || 'All'}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={minAtsScore}
                onChange={(e) => setMinAtsScore(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Skills Filter Tag Input */}
            <div className="space-y-2">
              <label className="block text-xs uppercase font-extrabold tracking-wider text-slate-500">
                Skills Required
              </label>
              <input
                type="text"
                placeholder="e.g. React, Node, Python"
                value={skillsFilter}
                onChange={(e) => setSkillsFilter(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-slate-200 focus:border-blue-500/50 outline-none"
              />
            </div>

            {/* Graduation Year */}
            <div className="space-y-2">
              <label className="block text-xs uppercase font-extrabold tracking-wider text-slate-500">
                Graduation Year
              </label>
              <input
                type="text"
                placeholder="e.g. 2024"
                maxLength={4}
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-slate-200 focus:border-blue-500/50 outline-none"
              />
            </div>
          </div>

          {/* Right Column: Candidates search searchbar & list */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Search Input Bar */}
            <form onSubmit={handleSearchSubmit} className="flex gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by candidate name, email, keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-gray-700 dark:text-slate-200 focus:border-blue-500/50 outline-none transition-colors"
                />
              </div>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 shadow-md">
                Search
              </Button>
            </form>

            <div className="flex justify-between items-center bg-white dark:bg-slate-900/20 border border-gray-200 dark:border-white/5 rounded-2xl p-4 text-sm font-semibold text-gray-600 dark:text-slate-300">
              <span>Found {totalCount} matching candidates</span>
              {selectedJob && (
                <span className="text-xs text-blue-400">Evaluating against: {selectedJob.title}</span>
              )}
            </div>

            {/* List candidates */}
            {loading ? (
              <div className="py-20 bg-white dark:bg-slate-900/10 border border-gray-200 dark:border-white/5 rounded-3xl">
                <LoadingState message="Searching student directory..." />
              </div>
            ) : error ? (
              <ErrorState message={error} onRetry={fetchCandidates} />
            ) : candidates.length === 0 ? (
              <EmptyState
                icon={<User size={48} className="text-slate-700 animate-pulse" />}
                title="No Candidates Found"
                description="Try adjusting your filters or search terms to broaden the query."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {candidates.map((candidate) => {
                  const candidateId = candidate.user?._id;
                  const matchResult = matchResultMap[candidateId];
                  const hasMatchCalculated = !!matchResult;
                  const isMatchLoading = matchLoadingMap[candidateId];
                  
                  const isInvited = invitedMap[candidateId];
                  const isInviteLoading = inviteLoadingMap[candidateId];
                  
                  const isExpanded = expandedCardId === candidateId;
                  const isTopCandidate = hasMatchCalculated && matchResult.aiMatchScore >= 85;

                  return (
                    <div
                      key={candidate._id}
                      className={`group border transition-all duration-300 rounded-2xl overflow-hidden relative ${
                        isExpanded 
                          ? "bg-blue-50 dark:bg-slate-900/80 border-blue-500/30 shadow-2xl" 
                          : isTopCandidate
                            ? "bg-amber-50 dark:bg-slate-900/40 border-amber-500/30 hover:border-amber-400/50 hover:bg-amber-100 dark:hover:bg-slate-900/60 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                            : "bg-white dark:bg-slate-900/40 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-900/60"
                      }`}
                    >
                      {isTopCandidate && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
                      )}

                      {/* Header candidate profile block */}
                      <div 
                        className="p-6 cursor-pointer"
                        onClick={() => setExpandedCardId(isExpanded ? null : candidateId)}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-gray-200 dark:border-white/5 flex items-center justify-center shrink-0">
                              <span className="text-lg font-bold text-blue-400">
                                {candidate.name?.charAt(0) || 'A'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                {candidate.name || 'Anonymous Candidate'}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Mail size={14} /> {candidate.email}
                                </span>
                                {candidate.aggregatedScore && (
                                  <span className="flex items-center gap-1 text-indigo-400">
                                    <Award size={14} /> ATS: {candidate.aggregatedScore}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick evaluation / invite actions */}
                          <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end w-full md:w-auto">
                            
                            {/* Match state output */}
                            {hasMatchCalculated ? (
                              <div className="flex flex-col items-end mr-2">
                                <span className="text-xl font-bold text-white flex items-center gap-1">
                                  <Sparkles size={16} className="text-emerald-400" />
                                  {matchResult.aiMatchScore}%
                                </span>
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border mt-1 ${matchCategoryStyles[matchResult.matchCategory] || "text-slate-400 border-white/10"}`}>
                                  {matchResult.matchCategory || "Evaluated"}
                                </span>
                              </div>
                            ) : (
                              <button
                                disabled={isMatchLoading}
                                onClick={(e) => handleCalculateMatch(e, candidateId)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-600/10 px-3.5 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-600/20 backdrop-blur-sm transition-all"
                              >
                                {isMatchLoading ? (
                                  <>
                                    <Loader2 className="animate-spin" size={14} />
                                    Matching...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={14} />
                                    Evaluate Match
                                  </>
                                )}
                              </button>
                            )}

                            {/* Invite button */}
                            {isInvited ? (
                              <span className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                                <CheckCircle size={14} />
                                Invited
                              </span>
                            ) : (
                              <button
                                disabled={isInviteLoading}
                                onClick={(e) => handleInviteCandidate(e, candidateId)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-500/30 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-all"
                              >
                                {isInviteLoading ? (
                                  <Loader2 className="animate-spin" size={14} />
                                ) : (
                                  <Send size={14} />
                                )}
                                Invite to Apply
                              </button>
                            )}

                            <ChevronRight 
                              size={20} 
                              className={`text-slate-600 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-blue-400' : ''}`} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Expanded Section showing skills & details */}
                      {isExpanded && (
                        <div className="p-8 border-t border-white/5 bg-slate-950/30 space-y-8 animate-in slide-in-from-top-4 duration-300">
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            
                            {/* Left Side: General Profile Summary */}
                            <div className="space-y-6">
                              
                              {/* Education & Info */}
                              <div className="space-y-3">
                                <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                  <GraduationCap size={16} /> Education & Profile Details
                                </h4>
                                <div className="p-4 bg-slate-900 border border-white/5 rounded-2xl space-y-3">
                                  {candidate.education && candidate.education.length > 0 ? (
                                    candidate.education.map((edu, idx) => (
                                      <div key={idx} className="flex gap-2 text-sm text-slate-300">
                                        <span className="text-blue-400">•</span>
                                        <span>{edu}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-slate-500">No education history parsed.</div>
                                  )}
                                </div>
                              </div>

                              {/* Experience & Projects */}
                              <div className="space-y-3">
                                <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                  <Briefcase size={16} /> Candidate Profile Snippet
                                </h4>
                                <div className="p-4 bg-slate-900 border border-white/5 rounded-2xl space-y-4">
                                  <div>
                                    <h5 className="text-xs font-bold text-slate-500 uppercase mb-1">Key Technical Experience</h5>
                                    {candidate.experience && candidate.experience.length > 0 ? (
                                      <p className="text-sm text-slate-300 leading-relaxed truncate-3-lines">
                                        {candidate.experience.slice(0, 2).join(" | ")}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-slate-500">No detailed experience provided.</p>
                                    )}
                                  </div>

                                  <div>
                                    <h5 className="text-xs font-bold text-slate-500 uppercase mb-1">Key Projects</h5>
                                    {candidate.projects && candidate.projects.length > 0 ? (
                                      <p className="text-sm text-slate-300 leading-relaxed">
                                        {candidate.projects.slice(0, 2).join(" | ")}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-slate-500">No projects specified.</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Social Handles */}
                              {(candidate.linkedin || candidate.github || candidate.portfolio) && (
                                <div className="flex gap-4">
                                  {candidate.linkedin && (
                                    <a href={candidate.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors">
                                      <Briefcase size={14} /> LinkedIn
                                    </a>
                                  )}
                                  {candidate.github && (
                                    <a href={candidate.github} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors">
                                      <Code size={14} /> Github
                                    </a>
                                  )}
                                  {candidate.portfolio && (
                                    <a href={candidate.portfolio} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors">
                                      <Globe size={14} /> Portfolio
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right Side: AI Match Intelligence Breakdown */}
                            <div className="space-y-6">
                              {hasMatchCalculated ? (
                                <>
                                  {/* AI Match breakdowns progress bars */}
                                  <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                      <Sparkles size={16} /> AI Match Breakdown
                                    </h4>
                                    
                                    <div className="p-5 bg-slate-900 border border-white/5 rounded-2xl space-y-4 shadow-inner">
                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs text-slate-450">ATS Compatibility</span>
                                          <span className="text-xs font-bold text-slate-200">{matchResult.matchBreakdown.atsCompatibility || 0}%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-1">
                                          <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${matchResult.matchBreakdown.atsCompatibility || 0}%` }} />
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs text-slate-450">Skill Match</span>
                                          <span className="text-xs font-bold text-slate-200">{matchResult.matchBreakdown.skillMatch || 0}%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-1">
                                          <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${matchResult.matchBreakdown.skillMatch || 0}%` }} />
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs text-slate-450">Project & Experience Strength</span>
                                          <span className="text-xs font-bold text-slate-200">{matchResult.matchBreakdown.projectStrength || 0}%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-1">
                                          <div className="bg-purple-500 h-1 rounded-full" style={{ width: `${matchResult.matchBreakdown.projectStrength || 0}%` }} />
                                        </div>
                                      </div>

                                      <div className="flex justify-between gap-4 pt-2 text-xs border-t border-white/5">
                                        <div>
                                          <span className="text-slate-500">Career Readiness:</span>
                                          <span className="font-bold text-slate-350 ml-1.5">{matchResult.matchBreakdown.careerReadiness}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-500">OSS Activity:</span>
                                          <span className="font-bold text-slate-350 ml-1.5">{matchResult.matchBreakdown.contributionActivity}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Hiring Signals */}
                                  {matchResult.aiHiringSignals && matchResult.aiHiringSignals.length > 0 && (
                                    <div className="space-y-2">
                                      <h5 className="text-xs font-bold text-slate-500 uppercase">Interview Readiness Badges</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {matchResult.aiHiringSignals.map((signal, idx) => (
                                          <span key={idx} className={`px-2.5 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-widest ${getSignalStyle(signal)}`}>
                                            {signal}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Insights & Weaknesses */}
                                  <div className="space-y-3 pt-4 border-t border-white/5">
                                    {matchResult.aiRecruiterInsights && matchResult.aiRecruiterInsights.length > 0 && (
                                      <div>
                                        <h5 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1.5">
                                          <Sparkles size={12} /> AI Recruiter Insights
                                        </h5>
                                        <ul className="mt-1 space-y-1 text-xs text-slate-400 list-disc list-inside">
                                          {matchResult.aiRecruiterInsights.map((ins, idx) => (
                                            <li key={idx}>{ins}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {matchResult.aiWeaknesses && matchResult.aiWeaknesses.length > 0 && (
                                      <div className="mt-3">
                                        <h5 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
                                          <AlertTriangle size={12} /> AI Weakness Warnings
                                        </h5>
                                        <ul className="mt-1 space-y-1 text-xs text-slate-400 list-disc list-inside">
                                          {matchResult.aiWeaknesses.map((weak, idx) => (
                                            <li key={idx}>{weak}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-900 border border-white/5 rounded-2xl text-center">
                                  <Sparkles size={28} className="text-slate-650 animate-bounce mb-3" />
                                  <span className="text-sm font-semibold text-slate-450">AI matching not run yet.</span>
                                  <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                                    Run the AI match algorithm to evaluate the candidate's skills alignment, weaknesses, and readiness signals against the job.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Render skills tag cloud */}
                          <div className="pt-6 border-t border-white/5">
                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Parsed Resume Skills</h5>
                            <div className="flex flex-wrap gap-2">
                              {candidate.skills && candidate.skills.length > 0 ? (
                                candidate.skills.map((skill, idx) => (
                                  <span key={idx} className="bg-slate-900 border border-white/5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-300">
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-500 italic">No skills cataloged on candidate's profile.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 pt-4">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <span className="text-sm font-semibold text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
          <Footer />
    </main>
  );
};

export default TalentFinderPage;
