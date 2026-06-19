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
import { useToast } from '../../../shared/components/toast/ToastProvider';

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
  const toast = useToast();
  
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
      toast.warning("Please select a target job before matching this candidate.");
      return;
    }

    setMatchLoadingMap(prevMap => ({ ...prevMap, [candidateId]: true }));
    try {
      const response = await matchCandidate(candidateId, selectedJobId, token);
      setMatchResultMap(prevMap => ({ ...prevMap, [candidateId]: response.matchResult }));
      
      // Automatically toggle element frame visibility matrix to feature the analysis layout
      setExpandedCardId(candidateId);
      toast.success("Candidate match analysis completed.");
    } catch (err) {
      toast.error(err.message || "We couldn't complete the match analysis. Please try again.");
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
      toast.warning("Please select an active job before inviting this candidate.");
      return;
    }

    setInviteLoadingMap(prevMap => ({ ...prevMap, [candidateId]: true }));
    try {
      const response = await inviteCandidate(candidateId, selectedJobId, token);
      setInvitedMap(prevMap => ({ ...prevMap, [candidateId]: true }));
      toast.success(response.message || "Invitation sent successfully.");
    } catch (err) {
      toast.error(err.message || "We couldn't send the invitation. Please try again.");
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
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col">
      <Navbar />

      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden w-full">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-purple-100/40 dark:bg-purple-900/10 blur-[100px]" />
          <div className="absolute top-[5%] right-[20%] w-[35%] h-[35%] rounded-full bg-teal-50/40 dark:bg-teal-900/10 blur-[100px]" />
        </div>

        <div className="w-full max-w-[1200px] relative z-10 flex flex-col gap-6">
          <div className="py-6 flex justify-between items-center">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>

          <div className="text-center space-y-4 mb-6 relative">
            <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
               <User className="w-6 h-6 text-purple-600" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <Search className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-purple-500" /> TALENT SEARCH
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Talent</span> Finder
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              Search the candidate database and find the best matches for your open roles.
            </p>
          </div>

          {/* Active Target Job Dropdown Controller Card */}
          <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 p-4 rounded-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm w-full mx-auto">
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
              <Sparkles size={12} className="text-purple-500 dark:text-purple-400 animate-pulse" />
              Select Target Job
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
                className="w-full sm:max-w-md bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 dark:text-slate-200 shadow-inner outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              >
                {jobs.map(job => (
                  <option key={job._id} value={job._id} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
                    {job.title} — {job.company || "Internal Registry"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Workspace Dual-Column Core UI Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start mt-4">
          
          {/* Sidebar Panel: Advanced Search Filters Controls */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/5 backdrop-blur-md p-6 rounded-3xl space-y-6 shadow-xl relative group">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
              <span className="font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2 text-md">
                <Sliders size={16} className="text-blue-500" /> Search Filters
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
                Specialization
              </label>
              <select
                value={specialization}
                onChange={(e) => { setSpecialization(e.target.value); setPage(1); }}
                className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 dark:text-slate-200 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer shadow-inner"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">All Fields</option>
                <option value="frontend" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">Frontend Engineer</option>
                <option value="backend" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">Backend Engineer</option>
                <option value="fullstack" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">Full-Stack Engineer</option>
                <option value="devops" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">DevOps / Cloud Engineer</option>
                <option value="aiml" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">AI / ML Engineer</option>
                <option value="database" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">Database Administrator</option>
              </select>
            </div>

            {/* Parameter Node: Minimum Target ATS Metric Score Slider */}
            <div className="space-y-3 bg-gray-50/50 dark:bg-slate-950/20 p-3 rounded-2xl border border-gray-100 dark:border-white/5 shadow-inner">
              <div className="flex justify-between items-center">
                <label className="block text-xs uppercase font-black tracking-wider text-gray-400 dark:text-slate-500">
                  Minimum Match Score
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
                Required Skills
              </label>
              <div className="relative">
                <Code className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="e.g. React, Node, AWS"
                  value={skillsFilter}
                  onChange={(e) => { setSkillsFilter(e.target.value); setPage(1); }}
                  className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-gray-800 dark:text-slate-200 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner"
                />
              </div>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 italic px-1">Updates automatically as you type.</p>
            </div>

            {/* Parameter Node: Graduation Metric Filter */}
            <div className="space-y-2">
              <label className="block text-xs uppercase font-black tracking-wider text-gray-400 dark:text-slate-500">
                Graduation Year
              </label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="e.g. 2025"
                  maxLength={4}
                  value={graduationYear}
                  onChange={(e) => { setGraduationYear(e.target.value.replace(/\D/g, '')); setPage(1); }}
                  className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-gray-800 dark:text-slate-200 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner"
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
                  placeholder="Search candidates by name, email, or keywords..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-semibold text-gray-800 dark:text-slate-200 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner"
                />
              </div>
              <div className="hidden sm:flex items-center px-4 bg-gray-100 dark:bg-slate-950 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-slate-400 rounded-xl select-none">
                Live Search
              </div>
            </div>

            {/* Roster Metric Bar */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white dark:bg-slate-900/10 border border-gray-200 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-gray-600 dark:text-slate-300 shadow-sm">
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-gray-400" />
                Found <span className="text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">{totalCount}</span> candidates
              </span>
              {selectedJob && (
                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-3 py-1 rounded-xl flex items-center gap-1.5 self-start sm:self-auto">
                  <Bookmark size={12} /> Matching for: {selectedJob.title}
                </span>
              )}
            </div>

            {/* Pipeline State Selector Branch */}
            {loading ? (
              <div className="py-24 bg-white dark:bg-slate-900/10 border border-gray-200 dark:border-white/5 rounded-3xl shadow-inner">
                <LoadingState message="Searching candidates..." />
              </div>
            ) : error ? (
              <ErrorState description={error} onRetry={fetchCandidatesDirectory} />
            ) : candidates.length === 0 ? (
              <EmptyState
                icon={<User size={52} className="text-gray-300 dark:text-slate-700 animate-pulse" />}
                title="No Candidates Found"
                description="No recruiter-visible candidates match your criteria. Try adjusting your filters; private profiles and resumes not shared with recruiters are hidden."
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
                                    <span>Analyzing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={12} />
                                    <span>Match Candidate</span>
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
                                  <GraduationCap size={14} /> Education History
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
                                      <Info size={12} /> No education details provided.
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Cluster Grid Segment: Project / Practical Trajectory Logs */}
                              <div className="space-y-2.5">
                                <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                  <Briefcase size={14} /> Experience & Projects
                                </h4>
                                <div className="p-4 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-white/5 rounded-2xl space-y-4 shadow-inner">
                                  <div>
                                    <h5 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Work Experience</h5>
                                    {candidate.experience && candidate.experience.length > 0 ? (
                                      <p className="text-sm text-gray-700 dark:text-slate-300 font-medium leading-relaxed">
                                        {candidate.experience.slice(0, 3).join(" | ")}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-gray-400 dark:text-slate-500 italic flex items-center gap-1.5"><Info size={12} /> No work experience listed.</p>
                                    )}
                                  </div>

                                  <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                                    <h5 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Projects</h5>
                                    {candidate.projects && candidate.projects.length > 0 ? (
                                      <p className="text-sm text-gray-700 dark:text-slate-300 font-medium leading-relaxed">
                                        {candidate.projects.slice(0, 3).join(" | ")}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-gray-400 dark:text-slate-500 italic flex items-center gap-1.5"><Info size={12} /> No projects listed.</p>
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
                                      <Sparkles size={14} /> Match Breakdown
                                    </h4>
                                    
                                    <div className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/5 rounded-2xl space-y-4.5 shadow-sm">
                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs font-bold text-gray-500 dark:text-slate-400">Resume Quality</span>
                                          <span className="text-xs font-black text-gray-900 dark:text-slate-200">{matchResult.matchBreakdown?.atsCompatibility || 0}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 shadow-inner">
                                          <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500 w-[var(--tw-width)]" style={{ '--tw-width': `${matchResult.matchBreakdown?.atsCompatibility || 0}%` }} />
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs font-bold text-gray-500 dark:text-slate-400">Skills Match</span>
                                          <span className="text-xs font-black text-gray-900 dark:text-slate-200">{matchResult.matchBreakdown?.skillMatch || 0}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 shadow-inner">
                                          <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500 w-[var(--tw-width)]" style={{ '--tw-width': `${matchResult.matchBreakdown?.skillMatch || 0}%` }} />
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs font-bold text-gray-500 dark:text-slate-400">Project Experience</span>
                                          <span className="text-xs font-black text-gray-900 dark:text-slate-200">{matchResult.matchBreakdown?.projectStrength || 0}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 shadow-inner">
                                          <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500 w-[var(--tw-width)]" style={{ '--tw-width': `${matchResult.matchBreakdown?.projectStrength || 0}%` }} />
                                        </div>
                                      </div>

                                      <div className="flex justify-between gap-4 pt-3 text-[11px] font-bold border-t border-gray-100 dark:border-white/5 text-gray-500 dark:text-slate-400">
                                        <div className="flex items-center gap-1">
                                          <span>Career Readiness:</span>
                                          <span className="text-gray-800 dark:text-slate-200 uppercase font-black">{matchResult.matchBreakdown?.careerReadiness || "N/A"}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span>Open Source Activity:</span>
                                          <span className="text-gray-800 dark:text-slate-200 uppercase font-black">{matchResult.matchBreakdown?.contributionActivity || "N/A"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Dynamic Neural Verification Badge Cloud */}
                                  {matchResult.aiHiringSignals && matchResult.aiHiringSignals.length > 0 && (
                                    <div className="space-y-2">
                                      <h5 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider">Highlighted Strengths</h5>
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
                                          <Sparkles size={10} /> Why They're a Match
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
                                          <AlertTriangle size={10} /> Areas of Concern
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
                                  <span className="text-sm font-bold text-gray-700 dark:text-slate-400">Not Yet Evaluated</span>
                                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5 max-w-xs leading-relaxed font-medium">
                                    Run a match analysis to see how well this candidate fits your open role.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Cataloged Core Skills Tag Cloud Base strip */}
                          <div className="pt-5 border-t border-gray-200 dark:border-white/5">
                            <h5 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">Verified Skills</h5>
                            <div className="flex flex-wrap gap-1.5">
                              {candidate.skills && candidate.skills.length > 0 ? (
                                candidate.skills.map((skill, idx) => (
                                  <span key={idx} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-slate-300 shadow-sm">
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 dark:text-slate-500 italic">No skills listed.</span>
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
                  <ArrowLeft size={14} className="mr-1" /> Previous
                </Button>
                <span className="text-xs font-black text-gray-500 dark:text-slate-400 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-white/5 select-none shadow-inner">
                  Page {page} / {totalPages}
                </span>
                <Button
                  disabled={page === totalPages}
                  onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  variant="outline"
                  size="sm"
                  className="font-bold shadow-sm"
                >
                  Next <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TalentFinderPage;
