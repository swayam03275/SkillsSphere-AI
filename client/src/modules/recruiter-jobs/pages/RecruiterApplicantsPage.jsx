import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Users, 
  ArrowLeft, 
  Mail, 
  FileText, 
  Calendar, 
  ExternalLink, 
  MessageSquare,
  ChevronRight,
  Filter,
  Sparkles,
  Award,
  Sliders,
  CheckCircle,
  RefreshCw,
  X,
  Code,
  ChevronDown,
  Download,
  AlertTriangle,
  LayoutList,
  KanbanSquare,
  Search
} from 'lucide-react';
import Navbar from '../../../shared/components/Navbar';
import Footer from "../../../shared/components/Footer";

import { Button, LoadingState, ErrorState, EmptyState, StatusUpdateModal, StatusTimeline } from '../../../shared/components';
import ApplicantsKanbanBoard from '../components/ApplicantsKanbanBoard';
import { getJobApplications, updateApplicationStatus, getJobPostingById, exportJobApplicationsCSV } from '../services/jobPostingService';
import { exportToCSV, exportToPDF } from '../../../utils/exportUtils';
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useToast } from "../../../shared/components/toast/ToastProvider";


const statusStyles = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  reviewed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  shortlisted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  withdrawn: "bg-slate-700/30 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700/50",
};

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
  if (signal.includes("Growth")) {
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  }
  return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30";
};

const getSignalIcon = (signal) => {
  if (signal.includes("Fast-Track") || signal.includes("Strong")) {
    return <Sparkles size={12} className="mr-1 inline" />;
  }
  if (signal.includes("Required") || signal.includes("Needed")) {
    return <AlertTriangle size={12} className="mr-1 inline" />;
  }
  return <Award size={12} className="mr-1 inline" />;
};

const filterStatuses = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" }
];

const dotStyles = {
  all: "bg-blue-400",
  pending: "bg-yellow-400",
  reviewed: "bg-blue-400",
  shortlisted: "bg-emerald-400",
  rejected: "bg-red-400",
  withdrawn: "bg-slate-400",
};

const presets = [
  { id: 'topMatches', label: 'Top Matches', icon: <Sparkles size={14} /> },
  { id: 'excellent', label: 'Excellent Match', icon: <CheckCircle size={14} /> },
  { id: 'oss', label: 'OSS Contributors', icon: <Code size={14} /> },
  { id: 'highAts', label: 'High ATS Score', icon: <FileText size={14} /> },
  { id: 'frontend', label: 'Frontend Specs', icon: <Code size={14} /> },
  { id: 'backend', label: 'Backend Specs', icon: <Code size={14} /> },
  { id: 'fullstack', label: 'Full Stack', icon: <Code size={14} /> },
  { id: 'readiness', label: 'High Readiness', icon: <Award size={14} /> }
];

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const getApplicantSkills = (application) => {
  const skillSources = [
    application?.skills,
    application?.resume?.skills,
    application?.applicant?.skills,
    application?.parsedResume?.skills,
    application?.analysisData?.skills,
  ];

  return skillSources
    .flatMap((skills) => {
      if (Array.isArray(skills)) return skills;
      if (typeof skills === 'string') return skills.split(',');
      return [];
    })
    .map((skill) => normalizeText(skill))
    .filter(Boolean);
};

const parseDateOnly = (value, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

export const filterApplicants = (applications = [], filters = {}) => {
  const search = normalizeText(filters.searchTerm);
  const skillTerms = String(filters.skillsFilter || '')
    .split(',')
    .map((skill) => normalizeText(skill))
    .filter(Boolean);
  const appliedFrom = parseDateOnly(filters.appliedFrom);
  const appliedTo = parseDateOnly(filters.appliedTo, true);

  return applications.filter((application) => {
    if (search) {
      const applicantSearchBlob = [
        application?.applicant?.name,
        application?.applicant?.email,
      ].map(normalizeText).join(' ');

      if (!applicantSearchBlob.includes(search)) {
        return false;
      }
    }

    if (filters.statusFilter && application?.status !== filters.statusFilter) {
      return false;
    }

    if (Number(filters.minScore) > 0 && Number(application?.aiMatchScore || 0) < Number(filters.minScore)) {
      return false;
    }

    if (
      Number(filters.minAtsScore) > 0 &&
      Number(application?.matchBreakdown?.atsCompatibility || 0) < Number(filters.minAtsScore)
    ) {
      return false;
    }

    if (
      Array.isArray(filters.selectedCategories) &&
      filters.selectedCategories.length > 0 &&
      !filters.selectedCategories.includes(application?.matchCategory)
    ) {
      return false;
    }

    if (filters.contributorOnly) {
      const contributionActivity = application?.matchBreakdown?.contributionActivity;
      if (!['High', 'Medium'].includes(contributionActivity)) {
        return false;
      }
    }

    if (
      filters.careerReadiness &&
      application?.matchBreakdown?.careerReadiness !== filters.careerReadiness
    ) {
      return false;
    }

    if (skillTerms.length > 0) {
      const applicantSkills = getApplicantSkills(application);
      const hasMatchingSkill = skillTerms.some((term) =>
        applicantSkills.some((skill) => skill.includes(term))
      );

      if (!hasMatchingSkill) {
        return false;
      }
    }

    if (appliedFrom || appliedTo) {
      const appliedAt = new Date(application?.createdAt);
      if (Number.isNaN(appliedAt.getTime())) {
        return false;
      }
      if (appliedFrom && appliedAt < appliedFrom) {
        return false;
      }
      if (appliedTo && appliedAt > appliedTo) {
        return false;
      }
    }

    return true;
  });
};

const RecruiterApplicantsPage = () => {
  useDocumentTitle("Recruiter Applicants");
  const { id: jobId } = useParams();
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const toast = useToast();

  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list" | "board"
  
  // Filtering and Sorting States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('matchScore');
  const [minScore, setMinScore] = useState(0);
  const [minAtsScore, setMinAtsScore] = useState(0);
  const [skillsFilter, setSkillsFilter] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [specialization, setSpecialization] = useState('');
  const [contributorOnly, setContributorOnly] = useState(false);
  const [careerReadiness, setCareerReadiness] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  
  // Smart Preset Tracker
  const [activePreset, setActivePreset] = useState('');
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const handleExportPDF = () => {
    setIsExportDropdownOpen(false);
    exportToPDF("applicants-container", `Candidate_List_${job?.title?.replace(/[^a-z0-9]/gi, '_') || 'Job'}.pdf`);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filtersObj = {
        q: searchTerm || undefined,
        status: statusFilter,
        sortBy,
        minScore: minScore > 0 ? minScore : undefined,
        minAtsScore: minAtsScore > 0 ? minAtsScore : undefined,
        skills: skillsFilter || undefined,
        matchCategory: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
        specialization: specialization || undefined,
        contributorOnly: contributorOnly ? 'true' : undefined,
        careerReadiness: careerReadiness || undefined,
        appliedFrom: appliedFrom || undefined,
        appliedTo: appliedTo || undefined,
        page,
        limit: 20
      };

      const [jobData, appsData] = await Promise.all([
        getJobPostingById(jobId, token),
        getJobApplications(jobId, token, filtersObj)
      ]);
      setJob(jobData.job);
      setApplicants(appsData.applications || []);
      setTotalPages(appsData.totalPages || 1);
      setTotalCount(appsData.totalCount || 0);
    } catch (err) {
      setError(err.message || "Failed to load applicant data.");
    } finally {
      setLoading(false);
    }
  }, [
    jobId, 
    token, 
    searchTerm,
    statusFilter, 
    sortBy, 
    minScore, 
    minAtsScore, 
    skillsFilter,
    selectedCategories, 
    specialization, 
    contributorOnly, 
    careerReadiness,
    appliedFrom,
    appliedTo,
    page
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async (status, comment) => {
    if (!selectedApp) return;
    await updateApplicationStatus(selectedApp._id, status, comment, token);
    fetchData();
  };

  const handleExportCSV = async () => {
    try {
      const blob = await exportJobApplicationsCSV(jobId, token, statusFilter, sortBy);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `job-${job?.title || jobId}-applicants.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "Failed to export matches.");
    }
  };

  const openUpdateModal = (e, app) => {
    e.stopPropagation();
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const applyPreset = (presetId) => {
    handleResetFilters();
    setActivePreset(presetId);
    
    if (presetId === 'topMatches') {
      setMinScore(85);
    } else if (presetId === 'excellent') {
      setSelectedCategories(['Excellent Match']);
    } else if (presetId === 'oss') {
      setContributorOnly(true);
    } else if (presetId === 'highAts') {
      setMinAtsScore(80);
    } else if (presetId === 'frontend') {
      setSpecialization('frontend');
    } else if (presetId === 'backend') {
      setSpecialization('backend');
    } else if (presetId === 'fullstack') {
      setSpecialization('fullstack');
    } else if (presetId === 'readiness') {
      setCareerReadiness('High');
    }
  };

  const handleCategoryToggle = (category) => {
    setActivePreset('');
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setMinScore(0);
    setMinAtsScore(0);
    setSkillsFilter('');
    setSelectedCategories([]);
    setSpecialization('');
    setContributorOnly(false);
    setCareerReadiness('');
    setAppliedFrom('');
    setAppliedTo('');
    setStatusFilter('');
    setSortBy('matchScore');
    setActivePreset('');
    setPage(1);
  };

  // Reset page when filters change (except when page itself changes)
  useEffect(() => {
    setPage(1);
  }, [
    searchTerm, statusFilter, sortBy, minScore, minAtsScore, skillsFilter, selectedCategories, 
    specialization, contributorOnly, careerReadiness, appliedFrom, appliedTo
  ]);

  const filteredApplicants = useMemo(() => filterApplicants(applicants, {
    searchTerm,
    statusFilter,
    minScore,
    minAtsScore,
    skillsFilter,
    selectedCategories,
    contributorOnly,
    careerReadiness,
    appliedFrom,
    appliedTo,
  }), [
    applicants,
    searchTerm,
    statusFilter,
    minScore,
    minAtsScore,
    skillsFilter,
    selectedCategories,
    contributorOnly,
    careerReadiness,
    appliedFrom,
    appliedTo,
  ]);

  const isAnyFilterActive = 
    searchTerm.trim() !== '' ||
    statusFilter !== '' ||
    minScore > 0 ||
    minAtsScore > 0 ||
    skillsFilter.trim() !== '' ||
    selectedCategories.length > 0 ||
    specialization !== '' ||
    contributorOnly ||
    careerReadiness !== '' ||
    appliedFrom !== '' ||
    appliedTo !== '';

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
          <div className="py-6 flex justify-start items-center w-full">
            <Link 
              to="/recruiter/jobs" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={16} /> Back to Jobs
            </Link>
          </div>

        <div className="text-center space-y-4 mb-6 relative">
          <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
             <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
             <Filter className="w-6 h-6 text-emerald-600" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
            <Sparkles size={12} className="text-purple-500" /> APPLICANT TRACKING
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
            <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Job</span> Applicants
          </h1>
          
          <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
            Review, evaluate, and manage applications for <span className="text-indigo-600 dark:text-indigo-400 font-bold">{job?.title || "this position"}</span>.
          </p>

          <div className="pt-2 flex justify-center">
            <div className="relative z-20">
              <button
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600/10 px-6 py-2.5 text-sm font-semibold text-blue-500 dark:text-blue-400 hover:bg-blue-600/20 hover:text-blue-600 dark:hover:text-blue-300 backdrop-blur-sm transition-all duration-300 shadow-sm"
              >
                <Download size={16} />
                Export Candidates
                <ChevronDown size={14} className={`transition-transform ${isExportDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              
              {isExportDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/95 p-2 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                  <button
                    onClick={handleExportPDF}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <FileText size={14} />
                    Export List (PDF)
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <Filter size={14} />
                    Export Data (CSV)
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 text-gray-500 dark:text-slate-400 text-sm mt-4">
            <span className="flex items-center gap-1.5">
              <Users size={16} /> {filteredApplicants.length} Matching Candidate{filteredApplicants.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold bg-white dark:bg-slate-900/40 px-2 py-0.5 rounded border border-gray-200 dark:border-white/5">
              Job ID: {jobId.slice(-6)}
            </span>
          </div>
        </div>

        {/* AI-Powered Filter Chips Presets */}
        <div className="space-y-3 bg-white dark:bg-slate-900/40 border border-gray-200 dark:border-white/5 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">
            <Sparkles size={14} className="text-blue-400" />
            AI Intelligence Presets
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map(p => {
              const isActive = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-300 ${
                    isActive 
                      ? 'bg-blue-600/20 text-blue-600 dark:text-blue-300 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                      : 'bg-gray-100 dark:bg-slate-950/40 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-slate-300 dark:border-slate-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {p.icon}
                  {p.label}
                </button>
              );
            })}
            {isAnyFilterActive && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl transition-all duration-300"
              >
                <X size={12} />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Left Column: Smart Filters Sidebar */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-50 dark:bg-slate-900/40 border border-gray-200 dark:border-white/5 backdrop-blur-md p-6 rounded-3xl space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/5">
              <span className="font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2 text-lg">
                <Sliders size={18} className="text-blue-400" /> Smart Filters
              </span>
              {isAnyFilterActive && (
                <button 
                  onClick={handleResetFilters}
                  className="text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Reset
                </button>
              )}
            </div>

            {/* Applicant Search */}
            <div className="space-y-2">
              <label htmlFor="applicantSearch" className="block text-xs uppercase font-extrabold tracking-wider text-slate-500">
                Search Applicant
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="applicantSearch"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => {
                    setActivePreset('');
                    setSearchTerm(e.target.value);
                  }}
                  placeholder="Name or email"
                  className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-700 dark:text-slate-200 placeholder:text-slate-400 focus:border-blue-500/50 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Workflow Status Filter */}
            <div className="space-y-2">
              <label htmlFor="statusFilter" className="block text-xs uppercase font-extrabold tracking-wider text-slate-500">
                Application Status
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => {
                  setActivePreset('');
                  setStatusFilter(e.target.value);
                }}
                className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-slate-200 focus:border-blue-500/50 outline-none transition-colors"
              >
                {filterStatuses.map(status => (
                  <option key={status.value} value={status.value} className="bg-white dark:bg-slate-900">
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* AI Match Score Range */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label htmlFor="minScore" className="block text-xs uppercase font-extrabold tracking-wider text-slate-500">
                  Min AI Match Score
                </label>
                <span className="text-sm font-bold text-emerald-400">{minScore || 'All'}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                id="minScore"
                value={minScore}
                onChange={(e) => {
                  setActivePreset('');
                  setMinScore(Number(e.target.value));
                }}
                className="w-full h-1.5 bg-gray-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* ATS Score Range */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label htmlFor="minAtsScore" className="block text-xs uppercase font-extrabold tracking-wider text-slate-500">
                  Min ATS Score
                </label>
                <span className="text-sm font-bold text-indigo-400">{minAtsScore || 'All'}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                id="minAtsScore"
                value={minAtsScore}
                onChange={(e) => {
                  setActivePreset('');
                  setMinAtsScore(Number(e.target.value));
                }}
                className="w-full h-1.5 bg-gray-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Skills Filter */}
            <div className="space-y-2">
              <label htmlFor="skillsFilter" className="block text-xs uppercase font-extrabold tracking-wider text-slate-500">
                Skills
              </label>
              <input
                id="skillsFilter"
                type="text"
                value={skillsFilter}
                onChange={(e) => {
                  setActivePreset('');
                  setSkillsFilter(e.target.value);
                }}
                placeholder="React, Node.js"
                className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-slate-200 placeholder:text-slate-400 focus:border-blue-500/50 outline-none transition-colors"
              />
            </div>

            {/* Match Categories */}
            <div className="space-y-3">
              <label className="block text-xs uppercase font-extrabold tracking-wider text-slate-500">
                Match Category
              </label>
              <div className="space-y-2">
                {Object.keys(matchCategoryStyles).map(cat => (
                  <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => handleCategoryToggle(cat)}
                      className="rounded border-gray-300 dark:border-slate-200 dark:border-white/10 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-white dark:bg-slate-950 cursor-pointer w-4 h-4"
                    />
                    <span className="text-sm text-gray-600 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-900 dark:hover:text-white transition-colors">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Technical Specialization */}
            <div className="space-y-2">
              <label htmlFor="specialization" className="block text-xs uppercase font-extrabold tracking-wider text-slate-500">
                Technical Specialty
              </label>
              <select
                id="specialization"
                value={specialization}
                onChange={(e) => {
                  setActivePreset('');
                  setSpecialization(e.target.value);
                }}
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

            {/* Contribution Presence */}
            <div className="pt-2 border-t border-gray-200 dark:border-white/5">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="space-y-0.5">
                  <span className="block text-sm font-semibold text-gray-700 dark:text-slate-200 group-hover:text-gray-900 dark:group-hover:text-slate-900 dark:hover:text-white transition-colors">
                    OSS Contributors
                  </span>
                  <span className="block text-[11px] text-slate-500 leading-normal">
                    Show only active contributors
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={contributorOnly}
                  onChange={(e) => {
                    setActivePreset('');
                    setContributorOnly(e.target.checked);
                  }}
                  className="rounded border-gray-300 dark:border-slate-200 dark:border-white/10 text-blue-600 focus:ring-0 bg-white dark:bg-slate-950 cursor-pointer w-4 h-4"
                />
              </label>
            </div>

            {/* Career Readiness */}
            <div className="space-y-2">
              <label htmlFor="careerReadiness" className="block text-xs uppercase font-extrabold tracking-wider text-slate-500">
                Career Readiness
              </label>
              <select
                id="careerReadiness"
                value={careerReadiness}
                onChange={(e) => {
                  setActivePreset('');
                  setCareerReadiness(e.target.value);
                }}
                className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-slate-200 focus:border-blue-500/50 outline-none transition-colors"
              >
                <option value="" className="bg-white dark:bg-slate-900">Any Level</option>
                <option value="High" className="bg-white dark:bg-slate-900">High Career Readiness</option>
                <option value="Medium" className="bg-white dark:bg-slate-900">Medium Career Readiness</option>
                <option value="Low" className="bg-white dark:bg-slate-900">Entry / Growth Stage</option>
              </select>
            </div>

            {/* Applied Date Range */}
            <div className="space-y-3">
              <label className="block text-xs uppercase font-extrabold tracking-wider text-slate-500">
                Applied Date
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="appliedFrom" className="block text-[11px] font-semibold text-slate-500">
                    From
                  </label>
                  <input
                    id="appliedFrom"
                    type="date"
                    value={appliedFrom}
                    onChange={(e) => {
                      setActivePreset('');
                      setAppliedFrom(e.target.value);
                    }}
                    className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-slate-200 focus:border-blue-500/50 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="appliedTo" className="block text-[11px] font-semibold text-slate-500">
                    To
                  </label>
                  <input
                    id="appliedTo"
                    type="date"
                    value={appliedTo}
                    onChange={(e) => {
                      setActivePreset('');
                      setAppliedTo(e.target.value);
                    }}
                    className="w-full bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-slate-200 focus:border-blue-500/50 outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Applicants List & Sort Controls */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Sort & Quick Meta */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900/20 border border-gray-200 dark:border-white/5 rounded-2xl p-4">
                <div className="text-sm font-semibold text-gray-600 dark:text-slate-300">
                  Showing {filteredApplicants.length} applicant{filteredApplicants.length !== 1 ? 's' : ''}
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* View Mode Toggle */}
                  <div className="flex bg-gray-100 dark:bg-slate-950/40 border border-gray-200 dark:border-white/5 rounded-xl p-1">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        viewMode === "list" 
                          ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" 
                          : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <LayoutList size={14} /> List
                    </button>
                    <button
                      onClick={() => setViewMode("board")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        viewMode === "board" 
                          ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" 
                          : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <KanbanSquare size={14} /> Board
                    </button>
                  </div>

                  {/* Sort Control */}
                  <div className="flex items-center gap-2 shrink-0 bg-gray-100 dark:bg-slate-950/40 border border-gray-200 dark:border-white/5 rounded-xl px-3 py-1.5 ml-auto sm:ml-0">
                    <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-transparent text-xs font-bold text-gray-900 dark:text-white outline-none cursor-pointer pr-4 border-none ring-0 appearance-none"
                    >
                      <option value="matchScore" className="bg-white dark:bg-slate-900">AI Match Score</option>
                      <option value="newest" className="bg-white dark:bg-slate-900">Newest Applied</option>
                      <option value="oldest" className="bg-white dark:bg-slate-900">Oldest Applied</option>
                    </select>
                  </div>
                </div>
              </div>

            {/* List Content */}
            {loading ? (
              <div className="py-20 bg-white dark:bg-slate-900/10 border border-gray-200 dark:border-white/5 rounded-3xl">
                <LoadingState message="Filtering candidates dynamically..." />
              </div>
            ) : error ? (
              <ErrorState description={error} onRetry={fetchData} />
            ) : filteredApplicants.length === 0 ? (
              <EmptyState 
                icon={<Users size={48} className="text-slate-700 animate-pulse" />}
                title="No Matching Candidates"
                description={
                  isAnyFilterActive 
                    ? "No applicants match your current filtering criteria. Try adjusting or resetting your smart filters to explore more candidates." 
                    : "No students have applied to this position yet."
                }
              >
                {isAnyFilterActive && (
                  <Button 
                    onClick={handleResetFilters}
                    className="mt-4 bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  >
                    Clear All Filters
                  </Button>
                )}
              </EmptyState>
            ) : viewMode === "board" ? (
              <ApplicantsKanbanBoard 
                applications={filteredApplicants} 
                onStatusChange={async (appId, newStatus) => {
                  try {
                    await updateApplicationStatus(appId, newStatus, `Moved to ${newStatus} via Kanban board`, token);
                    toast.success(`Applicant moved to ${newStatus}`);
                    fetchData();
                  } catch (err) {
                    toast.error("Failed to move applicant");
                    fetchData(); // refresh to revert optimistic update
                  }
                }}
                onAppClick={(app) => {
                  setSelectedApp(app);
                  setIsModalOpen(true);
                }}
              />
            ) : (
              <div id="applicants-container" className="grid grid-cols-1 gap-4">
                {filteredApplicants.map((app, index) => {
                  const isTopCandidate = sortBy === 'matchScore' && app.aiMatchScore >= 85;
                  const rank = sortBy === 'matchScore' ? index + 1 : null;
                  
                  return (
                    <div 
                      key={app._id}
                      className={`group border transition-all duration-300 rounded-2xl overflow-hidden relative ${
                        expandedId === app._id 
                          ? "bg-blue-50 dark:bg-white dark:bg-slate-900/80 border-blue-500/30 shadow-2xl" 
                          : isTopCandidate
                            ? "bg-amber-50 dark:bg-slate-50 dark:bg-slate-900/40 border-amber-500/30 hover:border-amber-400/50 hover:bg-amber-100 dark:hover:bg-white dark:bg-slate-900/60 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                            : "bg-white dark:bg-slate-50 dark:bg-slate-900/40 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-slate-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white dark:bg-slate-900/60"
                      }`}
                    >
                      {isTopCandidate && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
                      )}
                      
                      {/* Applicant Summary Row */}
                      <div 
                        className="p-6 cursor-pointer"
                        onClick={() => toggleExpand(app._id)}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-center gap-4 min-w-0">
                            {rank && (
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                                rank === 1 ? "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]" :
                                rank === 2 ? "bg-slate-300/20 text-slate-700 dark:text-slate-300 border-slate-300/30" :
                                rank === 3 ? "bg-orange-700/20 text-orange-400 border-orange-700/30" :
                                "bg-white dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700"
                              }`}>
                                #{rank}
                              </div>
                            )}
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-gray-200 dark:border-white/5 flex items-center justify-center shrink-0">
                              <span className="text-lg font-bold text-blue-400">
                                {app.applicant?.name?.charAt(0) || 'A'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                                {app.applicant?.name || 'Anonymous Applicant'}
                              </h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Mail size={14} /> {app.applicant?.email}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end w-full md:w-auto">
                            {app.aiMatchScore !== undefined && app.aiMatchScore !== null && (
                              <div className="flex flex-col items-end mr-2">
                                <span className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                  <Sparkles size={16} className="text-emerald-400" />
                                  {app.aiMatchScore}%
                                </span>
                                <div className="flex flex-col items-end gap-1 mt-1">
                                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${matchCategoryStyles[app.matchCategory] || "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10"}`}>
                                    {app.matchCategory || "Evaluated"}
                                  </span>
                                  {app.aiHiringSignals && app.aiHiringSignals.length > 0 && (
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getSignalStyle(app.aiHiringSignals[0])}`}>
                                      {getSignalIcon(app.aiHiringSignals[0])}
                                      {app.aiHiringSignals[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${statusStyles[app.status]}`}>
                                {app.status}
                              </span>
                              <div className="hidden sm:flex flex-col items-end text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} /> {new Date(app.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <ChevronRight 
                                size={20} 
                                className={`text-slate-600 transition-transform duration-300 ${expandedId === app._id ? 'rotate-90 text-blue-400' : ''}`} 
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details Section */}
                      {expandedId === app._id && (
                        <div className="p-8 border-t border-gray-100 dark:border-white/5 bg-slate-950/30 space-y-8 animate-in slide-in-from-top-4 duration-300">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Left Side: Resume & Note */}
                            <div className="space-y-6">
                              <div className="space-y-3">
                                <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                  <FileText size={16} /> Application Materials
                                </h4>
                                <div className="flex flex-col gap-3">
                                  {app.resumeLink && (
                                    <a 
                                      href={app.resumeLink} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5 rounded-2xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group/link"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                                          <FileText size={20} />
                                        </div>
                                        <span className="text-sm font-medium text-slate-500 dark:text-slate-200">View Candidate Resume</span>
                                      </div>
                                      <ExternalLink size={18} className="text-slate-600 group-hover/link:text-blue-400 transition-colors" />
                                    </a>
                                  )}
                                  <div className="p-4 bg-white dark:bg-slate-900/50 border border-gray-100 dark:border-white/5 rounded-2xl">
                                    <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Cover Note</h5>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                      &ldquo;{app.coverNote || 'No cover note provided.'}&rdquo;
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {app.aiHiringSignals && app.aiHiringSignals.length > 0 && (
                                <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-white/5">
                                  <h4 className="text-sm font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                    <Award size={16} /> Interview Readiness Signals
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {app.aiHiringSignals.map((signal, idx) => (
                                      <div key={idx} className={`flex items-center px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${getSignalStyle(signal)}`}>
                                        {getSignalIcon(signal)}
                                        {signal}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {app.aiRecruiterInsights && app.aiRecruiterInsights.length > 0 && (
                                <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-white/5">
                                  <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles size={16} /> AI Recruiter Insights
                                  </h4>
                                  <div className="p-5 bg-white dark:bg-slate-900/50 border border-blue-500/20 rounded-2xl shadow-inner">
                                    <ul className="space-y-2">
                                      {app.aiRecruiterInsights.map((insight, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                          <span className="text-blue-400 mt-0.5">•</span>
                                          <span className="leading-relaxed">{insight}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}

                              {app.aiWeaknesses && app.aiWeaknesses.length > 0 && (
                                <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-white/5">
                                  <h4 className="text-sm font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle size={16} /> AI Weakness Detection
                                  </h4>
                                  <div className="p-5 bg-white dark:bg-slate-900/50 border border-amber-500/20 rounded-2xl shadow-inner">
                                    <ul className="space-y-2">
                                      {app.aiWeaknesses.map((weakness, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                          <span className="text-amber-400 mt-0.5">•</span>
                                          <span className="leading-relaxed">{weakness}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}

                              {app.matchBreakdown && (
                                <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-white/5">
                                  <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles size={16} /> AI Match Breakdown
                                  </h4>
                                  <div className="p-4 bg-white dark:bg-slate-900/80 border border-gray-100 dark:border-white/5 rounded-2xl space-y-4">
                                    <div>
                                      <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">ATS Compatibility</span>
                                        <span className="text-sm font-bold text-slate-500 dark:text-slate-200">{app.matchBreakdown.atsCompatibility || 0}%</span>
                                      </div>
                                      <div className="w-full bg-white dark:bg-slate-800 rounded-full h-1.5">
                                        <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${app.matchBreakdown.atsCompatibility || 0}%` }} />
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Skill Match</span>
                                        <span className="text-sm font-bold text-slate-500 dark:text-slate-200">{app.matchBreakdown.skillMatch || 0}%</span>
                                      </div>
                                      <div className="w-full bg-white dark:bg-slate-800 rounded-full h-1.5">
                                        <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${app.matchBreakdown.skillMatch || 0}%` }} />
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Project Strength</span>
                                        <span className="text-sm font-bold text-slate-500 dark:text-slate-200">{app.matchBreakdown.projectStrength || 0}%</span>
                                      </div>
                                      <div className="w-full bg-white dark:bg-slate-800 rounded-full h-1.5">
                                        <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${app.matchBreakdown.projectStrength || 0}%` }} />
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-white/5">
                                      <span className="text-sm text-slate-600 dark:text-slate-400">Contribution Activity</span>
                                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                        app.matchBreakdown.contributionActivity === 'High' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                        app.matchBreakdown.contributionActivity === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                        'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                                      }`}>{app.matchBreakdown.contributionActivity || 'Low'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-slate-600 dark:text-slate-400">Career Readiness</span>
                                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                        app.matchBreakdown.careerReadiness === 'High' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                        app.matchBreakdown.careerReadiness === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                        'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                                      }`}>{app.matchBreakdown.careerReadiness || 'Low'}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="pt-4 flex gap-3">
                                <Button 
                                  className="bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                                  leftIcon={<MessageSquare size={18} />}
                                  onClick={(e) => openUpdateModal(e, app)}
                                >
                                  Update Status & Feedback
                                </Button>
                              </div>
                            </div>

                            {/* Right Side: Status Timeline */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={16} /> Application Timeline
                              </h4>
                              <div className="pl-4">
                                <StatusTimeline history={app.statusHistory} />
                              </div>
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
            {!loading && !error && filteredApplicants.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 border border-gray-100 dark:border-white/5 rounded-2xl p-4 mt-6">
                <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Showing <span className="text-slate-900 dark:text-white">{(page - 1) * 20 + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(page * 20, totalCount)}</span> of <span className="text-slate-900 dark:text-white">{totalCount}</span> candidates
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="bg-white dark:bg-slate-900 hover:bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="bg-white dark:bg-slate-900 hover:bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
      </main>

      <StatusUpdateModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        applicantName={selectedApp?.applicant?.name}
        currentStatus={selectedApp?.status}
        onUpdate={handleUpdateStatus}
      />
          <Footer />
    </div>
  );
};

export default RecruiterApplicantsPage;
