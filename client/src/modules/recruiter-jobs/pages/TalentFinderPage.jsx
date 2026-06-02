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
  Code,
  Info,
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';

// Shared Global UI Layout Component Imports
import Navbar from '../../../shared/components/Navbar';
import Footer from "../../../shared/components/Footer";
import { Button, LoadingState, ErrorState, EmptyState } from '../../../shared/components';

// Infrastructure Integration Data Services
import { getRecruiterJobs } from '../services/jobPostingService';
import { searchTalent, matchCandidate, inviteCandidate } from '../services/talentFinderService';

// Reusable Utilities and Performance Hooks
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { useDebounce } from '../../../shared/hooks/useDebounce';

// ============================================================================
// COMPONENT THEME CONFIGURATIONS & STYLES MAPS
// ============================================================================

/**
 * Styling dictionaries mapping semantic match category labels 
 * to dynamic tailwind-accessible glassmorphism border tags.
 */
import logger from "../../../utils/logger";

const matchCategoryStyles = {
  "Excellent Match": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "Moderate Match": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "Growth Potential": "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  "Weak Alignment": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

/**
 * Maps incoming system engine tags to tailored high-contrast CSS visualization colors.
 * @param {string} signal - The incoming recruitment insight/milestone text string.
 * @returns {string} Tailwind responsive styling string.
 */
const getSignalStyle = (signal) => {
  if (!signal) return "bg-slate-500/10 text-slate-400 border-slate-500/30";
  const upperSignal = signal.toUpperCase();
  
  if (upperSignal.includes("FAST-TRACK") || upperSignal.includes("STRONG")) {
    return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]";
  }
  if (upperSignal.includes("INTERVIEW") || upperSignal.includes("ROUND")) {
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
  }
  if (upperSignal.includes("REQUIRED") || upperSignal.includes("NEEDED") || upperSignal.includes("WEAKNESS")) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
  }
  return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30";
};

// ============================================================================
// MAIN TALENT FINDER INTERFACE MODULE
// ============================================================================

const TalentFinderPage = () => {
  useDocumentTitle("Talent Finder | Recruiter Workspace");
  const navigate = useNavigate();
  
  // Redux Authenticated Security Context State Extraction
  const { token, user } = useSelector((state) => state.auth);

  // --------------------------------------------------------------------------
  // 1. STATE INITIALIZATION MATRIX
  // --------------------------------------------------------------------------
  
  // Job Postings State Matrix (Recruiter contextual selection framework)
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  
  // Pure UI Interactive Filters State Block
  const [searchQuery, setSearchQuery] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [minAtsScore, setMinAtsScore] = useState(0);
  const [specialization, setSpecialization] = useState('');

  // --------------------------------------------------------------------------
  // 2. STABLE HIGH-PERFORMANCE DEBOUNCE INJECTIONS
  // --------------------------------------------------------------------------
  
  // Apply our useDebounce hook to all immediate-fire keydown text strings.
  // This prevents unhandled re-renders and network call spam on every single keydown frame.
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const debouncedSkillsFilter = useDebounce(skillsFilter, 500);
  const debouncedGraduationYear = useDebounce(graduationYear, 500);

  // Candidate Repository Data Store & UI State Flags
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Structured API Pagination Configuration
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Async Execution Tracker Mapping Tables (Scoped uniquely by candidate database ID strings)
  const [matchLoadingMap, setMatchLoadingMap] = useState({});
  const [matchResultMap, setMatchResultMap] = useState({});
  const [inviteLoadingMap, setInviteLoadingMap] = useState({});
  const [invitedMap, setInvitedMap] = useState({});

  // Collapsible Component Expansion Node Pointer
  const [expandedCardId, setExpandedCardId] = useState(null);

  // --------------------------------------------------------------------------
  // 3. SECURE CORE BUSINESS LOGIC RUNNERS (NETWORK CALLS)
  // --------------------------------------------------------------------------

  /**
   * Effect Hook to resolve the authenticated Recruiter's available 
   * job listing directory context upon successful dashboard boot.
   */
  useEffect(() => {
    const fetchActiveRecruiterJobs = async () => {
      setJobsLoading(true);
      try {
        const response = await getRecruiterJobs(token, 1, 100);
        const openJobs = (response.jobs || []).filter(job => job.status === 'open');
        setJobs(openJobs);
        
        if (openJobs.length > 0) {
          setSelectedJobId(openJobs[0]._id);
        }
      } catch (err) {
        console.error("[Workspace Exception] Error retrieving job listings registry:", err);
        logger.error("Failed to load recruiter jobs:", err);
      } finally {
        setJobsLoading(false);
      }
    };

    if (token) {
      fetchActiveRecruiterJobs();
    }
  }, [token]);

  /**
   * Core Callback Handler: Compiles individual search query tags and passes 
   * sanitized state models directly down to the Talent Discovery Pipeline service.
   */
  const fetchCandidatesDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Package parameters into a clean tracking filter payload object
      // We rely EXCLUSIVELY on debounced string versions here to guarantee safe execution frames
      const queryFilters = {
        q: debouncedSearchQuery || undefined,
        skills: debouncedSkillsFilter || undefined,
        graduationYear: debouncedGraduationYear || undefined,
        minAtsScore: minAtsScore > 0 ? minAtsScore : undefined,
        specialization: specialization || undefined,
        page,
        limit: 10
      };

      const response = await searchTalent(queryFilters, token);
      
      setCandidates(response.candidates || []);
      setTotalPages(response.pagination?.pages || 1);
      setTotalCount(response.pagination?.total || 0);
    } catch (err) {
      setError(err.message || "Failed to search student directory database listings.");
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearchQuery, 
    debouncedSkillsFilter, 
    debouncedGraduationYear, 
    minAtsScore, 
    specialization, 
    page, 
    token
  ]);

  /**
   * Automatic Sync Engine: Triggers a clean fetch evaluation context 
   * whenever any tracked or debounced state parameter receives a new assignment.
   */
  useEffect(() => {
    fetchCandidatesDirectory();
  }, [fetchCandidatesDirectory]);

  /**
   * Action Handler: Dispatches candidate resume analytics parameters 
   * to the backend semantic processing hub for automated matching analysis.
   */
  const handleCalculateMatch = async (event, candidateId) => {
    event.stopPropagation();
    if (!selectedJobId) {
      alert("Please designate an active job posting workspace matrix to run matching evaluations against.");
      return;
    }

    setMatchLoadingMap(prevMap => ({ ...prevMap, [candidateId]: true }));
    try {
      const response = await matchCandidate(candidateId, selectedJobId, token);
      setMatchResultMap(prevMap => ({ ...prevMap, [candidateId]: response.matchResult }));
      
      // Automatically toggle element frame visibility matrix to feature the analysis layout
      setExpandedCardId(candidateId);
    } catch (err) {
      alert(err.message || "AI Matching execution matrix crashed. Please try parsing again.");
    } finally {
      setMatchLoadingMap(prevMap => ({ ...prevMap, [candidateId]: false }));
    }
  };

  /**
   * Action Handler: Forwards direct invitation data payloads down to socket channels
   * to trigger instant micro-notifications inside candidate interaction dashboards.
   */
  const handleInviteCandidate = async (event, candidateId) => {
    event.stopPropagation();
    if (!selectedJobId) {
      alert("Please declare a valid active job profile to issue an invitation link layout.");
      return;
    }

    setInviteLoadingMap(prevMap => ({ ...prevMap, [candidateId]: true }));
    try {
      await inviteCandidate(candidateId, selectedJobId, token);
      setInvitedMap(prevMap => ({ ...prevMap, [candidateId]: true }));
    } catch (err) {
      alert(err.message || "Failed to finalize socket message transaction link.");
    } finally {
      setInviteLoadingMap(prevMap => ({ ...prevMap, [candidateId]: false }));
    }
  };

  /**
   * State Reset Handler: Purges local cache indices, cleans active input fields,
   * and cleanly resets the paginated data layout back to view boundary index 1.
   */
  const handleResetFilters = () => {
    setSearchQuery('');
    setSkillsFilter('');
    setGraduationYear('');
    setMinAtsScore(0);
    setSpecialization('');
    setPage(1);
  };

  const selectedJob = jobs.find(job => job._id === selectedJobId);

  // ============================================================================
  // PRESENTATION LAYER (MARKDOWN VIEW LAYOUT)
  // ============================================================================
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] p-4 sm:p-6 pt-24 sm:pt-32 text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      <div className="mx-auto max-w-7xl w-full space-y-8">
        
        {/* Module Header Segment */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900/20 p-6 rounded-3xl border border-gray-200/60 dark:border-white/5 shadow-sm">
          <div className="space-y-2">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 mb-1 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Recruiter Central
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
              Talent <span className="text-gradient bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">Finder</span>
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm max-w-2xl leading-relaxed">
              Query the absolute candidate directory database with dynamic debouncing optimization layers. Run semantic neural intelligence match pipelines directly against live openings.
            </p>
          </div>
          
          {/* Active Target Job Dropdown Controller Card */}
          <div className="bg-gray-100 dark:bg-slate-900/60 border border-gray-200 dark:border-white/5 p-4 rounded-2xl flex flex-col gap-2 min-w-[320px] shadow-sm">
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles size={12} className="text-purple-500 dark:text-purple-400 animate-pulse" />
              Evaluation Benchmark Node
            </span>
            {jobsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-1.5">
                <Loader2 className="animate-spin text-blue-500" size={16} /> Loading open requirements...
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-sm font-semibold text-amber-500 dark:text-amber-400 flex items-center gap-1.5 py-1.5">
                <AlertTriangle size={14} /> No active opportunities parsed!
              </div>
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(e.target.value);
                  setMatchResultMap({}); // Purge score map arrays to prevent stale index cross-matching
                }}
                className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 dark:text-slate-200 shadow-inner outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              >
                {jobs.map(job => (
                  <option key={job._id} value={job._id} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
                    {job.title} — {job.company || "Internal Registry"}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Workspace Dual-Column Core UI Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Sidebar Panel: Advanced Filtering Parameters Controls */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/5 backdrop-blur-md p-6 rounded-3xl space-y-6 shadow-xl relative group">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
              <span className="font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2 text-md">
                <Sliders size={16} className="text-blue-500" /> Filtering Parameters
              </span>
              <button 
                onClick={handleResetFilters}
                className="text-xs font-bold text-gray-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-1 bg-gray-50 dark:bg-white/5 px-2 py-1 rounded-md border border-gray-200 dark:border-white/5 shadow-sm"
              >
                <RefreshCw size={10} /> Clear
              </button>
            </div>

            {/* Parameter Node: Technical Specialization Tag Dropdown */}
            <div className="space-y-2">
              <label className="block text-xs uppercase font-black tracking-wider text-gray-400 dark:text-slate-500">
                Core Engineering Vector
              </label>
              <select
                value={specialization}
                onChange={(e) => { setSpecialization(e.target.value); setPage(1); }}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">All Fields Cataloged</option>
                <option value="frontend" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">Frontend Architects</option>
                <option value="backend" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">Backend System Specialists</option>
                <option value="fullstack" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">Full-Stack Operators</option>
                <option value="devops" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">Cloud Infrastructure Engineers</option>
                <option value="aiml" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">AI / Deep Learning Specialists</option>
                <option value="database" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">Database Architects</option>
              </select>
            </div>

            {/* Parameter Node: Minimum Target ATS Metric Score Slider */}
            <div className="space-y-3 bg-gray-50/50 dark:bg-slate-950/20 p-3 rounded-2xl border border-gray-100 dark:border-white/5 shadow-inner">
              <div className="flex justify-between items-center">
                <label className="block text-xs uppercase font-black tracking-wider text-gray-400 dark:text-slate-500">
                  Minimum ATS Threshold
                </label>
                <span className="text-xs font-black px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                  {minAtsScore || 'All Base'}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={minAtsScore}
                onChange={(e) => { setMinAtsScore(Number(e.target.value)); setPage(1); }}
                className="w-full h-1.5 bg-gray-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-indigo-500"
              />
            </div>

            {/* Parameter Node: Skills Keyword Buffer Field */}
            <div className="space-y-2">
              <label className="block text-xs uppercase font-black tracking-wider text-gray-400 dark:text-slate-500">
                Skills Stack Requirements
              </label>
              <div className="relative">
                <Code className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="e.g. React, Node, AWS"
                  value={skillsFilter}
                  onChange={(e) => { setSkillsFilter(e.target.value); setPage(1); }}
                  className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-300 dark:border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-gray-800 dark:text-slate-200 focus:border-blue-500/50 outline-none transition-all shadow-inner"
                />
              </div>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 italic px-1">Monitored via 500ms core debounce loop.</p>
            </div>

            {/* Parameter Node: Graduation Metric Filter */}
            <div className="space-y-2">
              <label className="block text-xs uppercase font-black tracking-wider text-gray-400 dark:text-slate-500">
                Target Graduation Cycle
              </label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="e.g. 2025"
                  maxLength={4}
                  value={graduationYear}
                  onChange={(e) => { setGraduationYear(e.target.value.replace(/\D/g, '')); setPage(1); }}
                  className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-300 dark:border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-gray-800 dark:text-slate-200 focus:border-blue-500/50 outline-none transition-all shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Core Directory Component: Candidate Card Array Display Matrix */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Real-time Debounced Global Search Bar Component */}
            <div className="flex gap-3 bg-white dark:bg-slate-900/40 p-3 rounded-2xl border border-gray-200/60 dark:border-white/5 shadow-md">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Query global talent registry index via contextual tokens..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-semibold text-gray-800 dark:text-slate-200 focus:border-blue-500/50 outline-none transition-all"
                />
              </div>
              <div className="hidden sm:flex items-center px-4 bg-gray-100 dark:bg-slate-950 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-slate-400 rounded-xl select-none">
                Auto-Sync Active
              </div>
            </div>

            {/* Roster Metric Bar */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white dark:bg-slate-900/10 border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-gray-600 dark:text-slate-300 shadow-sm">
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-gray-400" />
                Discovery Engine returned <span className="text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">{totalCount}</span> validated files
              </span>
              {selectedJob && (
                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-3 py-1 rounded-xl flex items-center gap-1.5 self-start sm:self-auto">
                  <Bookmark size={12} /> Target Context: {selectedJob.title}
                </span>
              )}
            </div>

            {/* Pipeline State Selector Branch */}
            {loading ? (
              <div className="py-24 bg-white dark:bg-slate-900/10 border border-gray-200 dark:border-white/5 rounded-3xl shadow-inner">
                <LoadingState message="Querying platform directory index structures..." />
              </div>
            ) : error ? (
              <ErrorState message={error} onRetry={fetchCandidatesDirectory} />
            ) : candidates.length === 0 ? (
              <EmptyState
                icon={<User size={52} className="text-gray-300 dark:text-slate-700 animate-pulse" />}
                title="No Candidate Clusters Match"
                description="The search registry index resolved zero instances. Try clearing or relaxing active filter elements."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {candidates.map((candidate) => {
                  const candidateId = candidate.user?._id || candidate._id;
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
                          ? "bg-blue-50/70 dark:bg-slate-900/90 border-blue-500/40 shadow-xl" 
                          : isTopCandidate
                            ? "bg-amber-50/40 dark:bg-slate-900/30 border-amber-500/40 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-slate-900/50 shadow-sm"
                            : "bg-white dark:bg-slate-900/40 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 hover:bg-gray-50/80 dark:hover:bg-slate-900/60 shadow-sm"
                      }`}
                    >
                      {/* Top Rank Highlight Ribbon indicator */}
                      {isTopCandidate && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
                      )}

                      {/* Summary Data Flex Strip */}
                      <div 
                        className="p-5 sm:p-6 cursor-pointer select-none"
                        onClick={() => setExpandedCardId(isExpanded ? null : candidateId)}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            
                            {/* Initials Vector Box Placeholder */}
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-purple-500/20 border border-gray-200 dark:border-white/5 flex items-center justify-center shrink-0 shadow-sm">
                              <span className="text-md font-black text-blue-600 dark:text-blue-400">
                                {candidate.name?.charAt(0) || 'A'}
                              </span>
                            </div>

                            <div className="min-w-0 space-y-1">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                {candidate.name || 'Anonymous Candidate'}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-gray-500 dark:text-slate-400">
                                <span className="flex items-center gap-1.5">
                                  <Mail size={12} className="text-gray-400" /> {candidate.email}
                                </span>
                                {candidate.aggregatedScore && (
                                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                                    <Award size={12} /> Baseline Score: {candidate.aggregatedScore}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Dynamic Workspace Control Strip */}
                          <div className="flex items-center gap-3 shrink-0 justify-between md:justify-end w-full md:w-auto border-t md:border-t-0 border-gray-100 dark:border-white/5 pt-3 md:pt-0">
                            
                            {/* Execution Core Output Display */}
                            {hasMatchCalculated ? (
                              <div className="flex flex-col items-end mr-1.5">
                                <span className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-1">
                                  <Sparkles size={14} className="text-emerald-500 dark:text-emerald-400 animate-pulse" />
                                  {matchResult.aiMatchScore}%
                                </span>
                                <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded border mt-0.5 ${matchCategoryStyles[matchResult.matchCategory] || "text-slate-400 border-white/10"}`}>
                                  {matchResult.matchCategory || "Processed"}
                                </span>
                              </div>
                            ) : (
                              <button
                                disabled={isMatchLoading}
                                onClick={(e) => handleCalculateMatch(e, candidateId)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/20 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-600/10 px-3.5 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/20 backdrop-blur-sm transition-all shadow-sm"
                              >
                                {isMatchLoading ? (
                                  <>
                                    <Loader2 className="animate-spin" size={12} />
                                    <span>Processing Matrix...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={12} />
                                    <span>Run AI Evaluator</span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Direct Invitation Call Dispatch Component */}
                            {isInvited ? (
                              <span className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
                                <CheckCircle size={12} />
                                Invited
                              </span>
                            ) : (
                              <button
                                disabled={isInviteLoading}
                                onClick={(e) => handleInviteCandidate(e, candidateId)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-slate-700/60 bg-gray-900 dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-white dark:text-slate-200 hover:bg-gray-800 dark:hover:bg-slate-700 transition-all shadow-sm"
                              >
                                {isInviteLoading ? (
                                  <Loader2 className="animate-spin" size={12} />
                                ) : (
                                  <Send size={12} />
                                )}
                                <span>Invite</span>
                              </button>
                            )}

                            <ChevronRight 
                              size={18} 
                              className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-blue-500' : ''}`} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Advanced Accordion Layer View Block */}
                      {isExpanded && (
                        <div className="p-6 sm:p-8 border-t border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-slate-950/40 space-y-8 animate-in slide-in-from-top-3 duration-200">
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
                            
                            {/* Column Context Left Side: File Metadata Arrays */}
                            <div className="space-y-6">
                              
                              {/* Cluster Grid Segment: Educational Timeline Block */}
                              <div className="space-y-2.5">
                                <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                  <GraduationCap size={14} /> Education Context Log
                                </h4>
                                <div className="p-4 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-white/5 rounded-2xl space-y-3 shadow-inner">
                                  {candidate.education && candidate.education.length > 0 ? (
                                    candidate.education.map((edu, idx) => (
                                      <div key={idx} className="flex gap-2.5 text-sm text-gray-700 dark:text-slate-300 items-start">
                                        <span className="text-blue-500 font-bold mt-0.5">•</span>
                                        <span className="font-semibold leading-relaxed">{edu}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-xs text-gray-400 dark:text-slate-500 italic flex items-center gap-1.5">
                                      <Info size={12} /> No educational registry array block parsed.
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Cluster Grid Segment: Project / Practical Trajectory Logs */}
                              <div className="space-y-2.5">
                                <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                  <Briefcase size={14} /> Direct Profile Snippets
                                </h4>
                                <div className="p-4 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-white/5 rounded-2xl space-y-4 shadow-inner">
                                  <div>
                                    <h5 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Parsed Employment/Experience Path</h5>
                                    {candidate.experience && candidate.experience.length > 0 ? (
                                      <p className="text-sm text-gray-700 dark:text-slate-300 font-medium leading-relaxed">
                                        {candidate.experience.slice(0, 3).join(" | ")}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-gray-400 dark:text-slate-500 italic flex items-center gap-1.5"><Info size={12} /> No historical timeline parsed.</p>
                                    )}
                                  </div>

                                  <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                                    <h5 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Technical Project Deployments</h5>
                                    {candidate.projects && candidate.projects.length > 0 ? (
                                      <p className="text-sm text-gray-700 dark:text-slate-300 font-medium leading-relaxed">
                                        {candidate.projects.slice(0, 3).join(" | ")}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-gray-400 dark:text-slate-500 italic flex items-center gap-1.5"><Info size={12} /> No projects registered.</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* External Telemetry Links Block */}
                              {(candidate.linkedin || candidate.github || candidate.portfolio) && (
                                <div className="flex flex-wrap gap-3.5 bg-white dark:bg-slate-900/30 p-3 rounded-xl border border-gray-200/60 dark:border-white/5">
                                  {candidate.linkedin && (
                                    <a href={candidate.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                      <Briefcase size={12} /> LinkedIn <ExternalLink size={10} />
                                    </a>
                                  )}
                                  {candidate.github && (
                                    <a href={candidate.github} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors">
                                      <Code size={12} /> GitHub <ExternalLink size={10} />
                                    </a>
                                  )}
                                  {candidate.portfolio && (
                                    <a href={candidate.portfolio} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                                      <Globe size={12} /> Portfolio <ExternalLink size={10} />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Column Context Right Side: Neural Match Metric Analytics Engine Visualizations */}
                            <div className="space-y-6">
                              {hasMatchCalculated ? (
                                <>
                                  {/* Section Block: Dimensional Progress Components */}
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                      <Sparkles size={14} /> AI Analysis Quantization Matrix
                                    </h4>
                                    
                                    <div className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/5 rounded-2xl space-y-4.5 shadow-sm">
                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs font-bold text-gray-500 dark:text-slate-400">ATS Parsing Compatibility</span>
                                          <span className="text-xs font-black text-gray-900 dark:text-slate-200">{matchResult.matchBreakdown?.atsCompatibility || 0}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 shadow-inner">
                                          <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${matchResult.matchBreakdown?.atsCompatibility || 0}%` }} />
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs font-bold text-gray-500 dark:text-slate-400">Contextual Skill Alignment</span>
                                          <span className="text-xs font-black text-gray-900 dark:text-slate-200">{matchResult.matchBreakdown?.skillMatch || 0}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 shadow-inner">
                                          <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${matchResult.matchBreakdown?.skillMatch || 0}%` }} />
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs font-bold text-gray-500 dark:text-slate-400">Project Vector Intensity</span>
                                          <span className="text-xs font-black text-gray-900 dark:text-slate-200">{matchResult.matchBreakdown?.projectStrength || 0}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 shadow-inner">
                                          <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${matchResult.matchBreakdown?.projectStrength || 0}%` }} />
                                        </div>
                                      </div>

                                      <div className="flex justify-between gap-4 pt-3 text-[11px] font-bold border-t border-gray-100 dark:border-white/5 text-gray-500 dark:text-slate-400">
                                        <div className="flex items-center gap-1">
                                          <span>Readiness Index:</span>
                                          <span className="text-gray-800 dark:text-slate-200 uppercase font-black">{matchResult.matchBreakdown?.careerReadiness || "N/A"}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span>OSS Signature:</span>
                                          <span className="text-gray-800 dark:text-slate-200 uppercase font-black">{matchResult.matchBreakdown?.contributionActivity || "N/A"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Dynamic Neural Verification Badge Cloud */}
                                  {matchResult.aiHiringSignals && matchResult.aiHiringSignals.length > 0 && (
                                    <div className="space-y-2">
                                      <h5 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider">Hiring Signal Attestation Identifiers</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {matchResult.aiHiringSignals.map((signal, idx) => (
                                          <span key={idx} className={`px-2.5 py-1 rounded-lg border text-[9px] font-black tracking-wider uppercase ${getSignalStyle(signal)}`}>
                                            {signal}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Strategic Raw text reports generated directly by Gemini engine nodes */}
                                  <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-white/5">
                                    {matchResult.aiRecruiterInsights && matchResult.aiRecruiterInsights.length > 0 && (
                                      <div className="space-y-1">
                                        <h5 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                                          <Sparkles size={10} /> Neural Fit Justification Statement
                                        </h5>
                                        <ul className="space-y-1 text-xs font-medium text-gray-600 dark:text-slate-400 list-disc list-inside bg-white dark:bg-slate-900/30 p-2.5 rounded-xl border border-gray-100 dark:border-white/5">
                                          {matchResult.aiRecruiterInsights.map((insight, idx) => (
                                            <li key={idx} className="leading-relaxed">{insight}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {matchResult.aiWeaknesses && matchResult.aiWeaknesses.length > 0 && (
                                      <div className="space-y-1 mt-2.5">
                                        <h5 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                          <AlertTriangle size={10} /> Identified Delta Warnings
                                        </h5>
                                        <ul className="space-y-1 text-xs font-medium text-gray-600 dark:text-slate-400 list-disc list-inside bg-white dark:bg-slate-900/30 p-2.5 rounded-xl border border-gray-100 dark:border-white/5">
                                          {matchResult.aiWeaknesses.map((weakness, idx) => (
                                            <li key={idx} className="leading-relaxed text-gray-600 dark:text-slate-400">{weakness}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="h-full flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/5 rounded-2xl text-center shadow-sm">
                                  <Sparkles size={32} className="text-gray-300 dark:text-slate-700 mb-3 animate-pulse" />
                                  <span className="text-sm font-bold text-gray-700 dark:text-slate-400">Pipeline Engine Idle</span>
                                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5 max-w-xs leading-relaxed font-medium">
                                    Trigger the AI execution matrix to establish fit telemetry vectors for this candidate against your benchmark template description.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Cataloged Core Skills Tag Cloud Base strip */}
                          <div className="pt-5 border-t border-gray-200 dark:border-white/5">
                            <h5 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">Verified Knowledge Graph Token Indices</h5>
                            <div className="flex flex-wrap gap-1.5">
                              {candidate.skills && candidate.skills.length > 0 ? (
                                candidate.skills.map((skill, idx) => (
                                  <span key={idx} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-slate-300 shadow-sm">
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 dark:text-slate-500 italic">No explicit index arrays mapped inside resume fields.</span>
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

            {/* Standard Pagination Foot Controls Panel */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 pt-6 pb-12">
                <Button
                  disabled={page === 1}
                  onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  variant="outline"
                  size="sm"
                  className="font-bold shadow-sm"
                >
                  <ArrowLeft size={14} className="mr-1" /> Previous Block
                </Button>
                <span className="text-xs font-black text-gray-500 dark:text-slate-400 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-white/5 select-none shadow-inner">
                  Cluster Index {page} / {totalPages}
                </span>
                <Button
                  disabled={page === totalPages}
                  onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  variant="outline"
                  size="sm"
                  className="font-bold shadow-sm"
                >
                  Next Block <ArrowRight size={14} className="ml-1" />
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