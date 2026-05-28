import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  AlertTriangle
} from 'lucide-react';
import Navbar from '../../../shared/landing/Navbar';
import { Button, LoadingState, ErrorState, EmptyState, StatusUpdateModal, StatusTimeline } from '../../../shared/components';
import { getJobApplications, updateApplicationStatus, getJobPostingById, exportJobApplicationsCSV } from '../services/jobPostingService';
import { exportToCSV, exportToPDF } from '../../../utils/exportUtils';
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";


const statusStyles = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  reviewed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  shortlisted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  withdrawn: "bg-slate-700/30 text-slate-400 border-slate-700/50",
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
  return "bg-slate-500/10 text-slate-400 border-slate-500/30";
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

const RecruiterApplicantsPage = () => {
  useDocumentTitle("Recruiter Applicants");
  const { id: jobId } = useParams();
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);

  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  
  // Filtering and Sorting States
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('matchScore');
  const [minScore, setMinScore] = useState(0);
  const [minAtsScore, setMinAtsScore] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [specialization, setSpecialization] = useState('');
  const [contributorOnly, setContributorOnly] = useState(false);
  const [careerReadiness, setCareerReadiness] = useState('');
  
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
        status: statusFilter,
        sortBy,
        minScore: minScore > 0 ? minScore : undefined,
        minAtsScore: minAtsScore > 0 ? minAtsScore : undefined,
        matchCategory: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
        specialization: specialization || undefined,
        contributorOnly: contributorOnly ? 'true' : undefined,
        careerReadiness: careerReadiness || undefined,
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
    statusFilter, 
    sortBy, 
    minScore, 
    minAtsScore, 
    selectedCategories, 
    specialization, 
    contributorOnly, 
    careerReadiness,
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
      alert(err.message || "Failed to export matches.");
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
    setMinScore(0);
    setMinAtsScore(0);
    setSelectedCategories([]);
    setSpecialization('');
    setContributorOnly(false);
    setCareerReadiness('');
    setStatusFilter('');
    setSortBy('matchScore');
    setActivePreset('');
    setPage(1);
  };

  // Reset page when filters change (except when page itself changes)
  useEffect(() => {
    setPage(1);
  }, [
    statusFilter, sortBy, minScore, minAtsScore, selectedCategories, 
    specialization, contributorOnly, careerReadiness
  ]);

  const isAnyFilterActive = 
    statusFilter !== '' ||
    minScore > 0 ||
    minAtsScore > 0 ||
    selectedCategories.length > 0 ||
    specialization !== '' ||
    contributorOnly ||
    careerReadiness !== '';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] p-4 sm:p-6 pt-24 sm:pt-32 text-slate-100">
      <Navbar />

      <div className="mx-auto max-w-7xl w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/recruiter/jobs')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-4"
            >
              <ArrowLeft size={16} /> Back to Jobs
            </button>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Applicants for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">{job?.title || 'Loading...'}</span>
            </h1>
            <div className="flex items-center gap-4 text-slate-400 text-sm">
              <span className="flex items-center gap-1.5">
                <Users size={16} /> {applicants.length} Matching Candidate{applicants.length !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                Job ID: {jobId.slice(-6)}
              </span>
            </div>
          </div>
          
          <div className="relative z-20">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600/10 px-4 py-2.5 text-sm font-semibold text-blue-400 hover:bg-blue-600/20 hover:text-blue-300 backdrop-blur-sm transition-all duration-300"
            >
              <Download size={16} />
              Export Candidates
              <ChevronDown size={14} className={`transition-transform ${isExportDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            
            {isExportDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={handleExportPDF}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <FileText size={14} />
                  Export List (PDF)
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Filter size={14} />
                  Export Data (CSV)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* AI-Powered Filter Chips Presets */}
        <div className="space-y-3 bg-slate-900/20 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
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
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                      : 'bg-slate-950/40 text-slate-300 border-white/5 hover:border-slate-700 hover:text-white'
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
          <div className="lg:col-span-1 bg-slate-900/40 border border-white/5 backdrop-blur-md p-6 rounded-3xl space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <span className="font-extrabold tracking-tight text-white flex items-center gap-2 text-lg">
                <Sliders size={18} className="text-blue-400" /> Smart Filters
              </span>
              {isAnyFilterActive && (
                <button 
                  onClick={handleResetFilters}
                  className="text-xs font-medium text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Reset
                </button>
const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `job-${job?.title || jobId}-applicants.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || "Failed to export matches.");
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
    setMinScore(0);
    setMinAtsScore(0);
    setSelectedCategories([]);
    setSpecialization('');
    setContributorOnly(false);
    setCareerReadiness('');
    setStatusFilter('');
    setSortBy('matchScore');
    setActivePreset('');
    setPage(1);
  };

  // Reset page when filters change (except when page itself changes)
  useEffect(() => {
    setPage(1);
  }, [
    statusFilter, sortBy, minScore, minAtsScore, selectedCategories, 
    specialization, contributorOnly, careerReadiness
  ]);

  const isAnyFilterActive = 
    statusFilter !== '' ||
    minScore > 0 ||
    minAtsScore > 0 ||
    selectedCategories.length > 0 ||
    specialization !== '' ||
    contributorOnly ||
    careerReadiness !== '';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] p-4 sm:p-6 pt-24 sm:pt-32 text-slate-100">
      <Navbar />

      <div className="mx-auto max-w-7xl w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/recruiter/jobs')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-4"
            >
              <ArrowLeft size={16} /> Back to Jobs
            </button>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Applicants for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">{job?.title || 'Loading...'}</span>
            </h1>
            <div className="flex items-center gap-4 text-slate-400 text-sm">
              <span className="flex items-center gap-1.5">
                <Users size={16} /> {applicants.length} Matching Candidate{applicants.length !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                Job ID: {jobId.slice(-6)}
              </span>
            </div>
          </div>
          
          <div className="relative z-20">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600/10 px-4 py-2.5 text-sm font-semibold text-blue-400 hover:bg-blue-600/20 hover:text-blue-300 backdrop-blur-sm transition-all duration-300"
            >
              <Download size={16} />
              Export Candidates
              <ChevronDown size={14} className={`transition-transform ${isExportDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            
            {isExportDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={handleExportPDF}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <FileText size={14} />
                  Export List (PDF)
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Filter size={14} />
                  Export Data (CSV)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* AI-Powered Filter Chips Presets */}
        <div className="space-y-3 bg-slate-900/20 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
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
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                      : 'bg-slate-950/40 text-slate-300 border-white/5 hover:border-slate-700 hover:text-white'
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
          <div className="lg:col-span-1 bg-slate-900/40 border border-white/5 backdrop-blur-md p-6 rounded-3xl space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <span className="font-extrabold tracking-tight text-white flex items-center gap-2 text-lg">
                <Sliders size={18} className="text-blue-400" /> Smart Filters
              </span>
              {isAnyFilterActive && (
                <button 
                  onClick={handleResetFilters}
                  className="text-xs font-medium text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Reset
                </button>
              )}
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
                className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500/50 outline-none transition-colors"
              >
                {filterStatuses.map(status => (
                  <option key={status.value} value={status.value} className="bg-slate-900">
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
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
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
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
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
                      className="rounded border-white/10 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-slate-950 cursor-pointer w-4 h-4"
                    />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{cat}</span>
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
                className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500/50 outline-none transition-colors"
              >
                <option value="" className="bg-slate-900">All Fields</option>
                <option value="frontend" className="bg-slate-900">Frontend Specialists</option>
                <option value="backend" className="bg-slate-900">Backend Specialists</option>
                <option value="fullstack" className="bg-slate-900">Full Stack Candidates</option>
                <option value="devops" className="bg-slate-900">DevOps Experts</option>
                <option value="aiml" className="bg-slate-900">AI / ML Engineers</option>
                <option value="database" className="bg-slate-900">Database Specialists</option>
              </select>
            </div>

            {/* Contribution Presence */}
            <div className="pt-2 border-t border-white/5">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="space-y-0.5">
                  <span className="block text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
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
                  className="rounded border-white/10 text-blue-600 focus:ring-0 bg-slate-950 cursor-pointer w-4 h-4"
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
                  setActivePreset('');
                  setCareerReadiness(e.target.value);
                }}
                className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500/50 outline-none transition-colors"
              >
                <option value="" className="bg-slate-900">Any Level</option>
                <option value="High" className="bg-slate-900">High Career Readiness</option>
                <option value="Medium" className="bg-slate-900">Medium Career Readiness</option>
                <option value="Low" className="bg-slate-900">Entry / Growth Stage</option>
              </select>
            </div>
          </div>

          {/* Right Column: Applicants List & Sort Controls */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Sort & Quick Meta */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-900/20 border border-white/5 rounded-2xl p-4">
              <div className="text-sm font-semibold text-slate-300">
                Showing {applicants.length} applicant{applicants.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2 shrink-0 bg-slate-950/40 border border-white/5 rounded-xl px-3 py-1.5">
                <span className="text-xs font-semibold text-slate-400">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer pr-4 border-none ring-0 appearance-none"
                >
                  <option value="matchScore" className="bg-slate-900">AI Match Score</option>
                  <option value="newest" className="bg-slate-900">Newest Applied</option>
                  <option value="oldest" className="bg-slate-900">Oldest Applied</option>
                </select>
              </div>
            </div>

            {/* List Content */}
            {loading ? (
              <div className="py-20 bg-slate-900/10 border border-white/5 rounded-3xl">
                <LoadingState message="Filtering candidates dynamically..." />
              </div>
            ) : error ? (
              <ErrorState message={error} onRetry={fetchData} />
            ) : applicants.length === 0 ? (
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
            ) : (
              <div id="applicants-container" className="grid grid-cols-1 gap-4">
                {applicants.map((app, index) => {
                  const isTopCandidate = sortBy === 'matchScore' && app.aiMatchScore >= 85;
                  const rank = sortBy === 'matchScore' ? index + 1 : null;
                  
                  return (
                    <div 
                      key={app._id}
                      className={`group border transition-all duration-300 rounded-2xl overflow-hidden relative ${
                        expandedId === app._id 
                          ? "bg-slate-900/80 border-blue-500/30 shadow-2xl" 
                          : isTopCandidate
                            ? "bg-slate-900/40 border-amber-500/30 hover:border-amber-400/50 hover:bg-slate-900/60 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                            : "bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60"
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
                                rank === 2 ? "bg-slate-300/20 text-slate-300 border-slate-300/30" :
                                rank === 3 ? "bg-orange-700/20 text-orange-400 border-orange-700/30" :
                                "bg-slate-800 text-slate-500 border-slate-700"
                              }`}>
                                #{rank}
                              </div>
                            )}
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center shrink-0">
                              <span className="text-lg font-bold text-blue-400">
                                {app.applicant?.name?.charAt(0) || 'A'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                                {app.applicant?.name || 'Anonymous Applicant'}
                              </h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Mail size={14} /> {app.applicant?.email}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end w-full md:w-auto">
                            {app.aiMatchScore !== undefined && app.aiMatchScore !== null && (
                              <div className="flex flex-col items-end mr-2">
                                <span className="text-xl font-bold text-white flex items-center gap-1">
                                  <Sparkles size={16} className="text-emerald-400" />
                                  {app.aiMatchScore}%
                                </span>
                                <div className="flex flex-col items-end gap-1 mt-1">
                                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${matchCategoryStyles[app.matchCategory] || "text-slate-400 border-white/10"}`}>
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
                        <div className="p-8 border-t border-white/5 bg-slate-950/30 space-y-8 animate-in slide-in-from-top-4 duration-300">
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
                                      className="flex items-center justify-between p-4 bg-slate-900 border border-white/5 rounded-2xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group/link"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                                          <FileText size={20} />
                                        </div>
                                        <span className="text-sm font-medium text-slate-200">View Candidate Resume</span>
                                      </div>
                                      <ExternalLink size={18} className="text-slate-600 group-hover/link:text-blue-400 transition-colors" />
                                    </a>
                                  )}
                                  <div className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl">
                                    <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Cover Note</h5>
                                    <p className="text-sm text-slate-300 leading-relaxed italic">
                                      &ldquo;{app.coverNote || 'No cover note provided.'}&rdquo;
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {app.aiHiringSignals && app.aiHiringSignals.length > 0 && (
                                <div className="space-y-3 pt-6 border-t border-white/5">
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
                                <div className="space-y-3 pt-6 border-t border-white/5">
                                  <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles size={16} /> AI Recruiter Insights
                                  </h4>
                                  <div className="p-5 bg-slate-900/50 border border-blue-500/20 rounded-2xl shadow-inner">
                                    <ul className="space-y-2">
                                      {app.aiRecruiterInsights.map((insight, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                          <span className="text-blue-400 mt-0.5">•</span>
                                          <span className="leading-relaxed">{insight}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}

                              {app.aiWeaknesses && app.aiWeaknesses.length > 0 && (
                                <div className="space-y-3 pt-6 border-t border-white/5">
                                  <h4 className="text-sm font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle size={16} /> AI Weakness Detection
                                  </h4>
                                  <div className="p-5 bg-slate-900/50 border border-amber-500/20 rounded-2xl shadow-inner">
                                    <ul className="space-y-2">
                                      {app.aiWeaknesses.map((weakness, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                          <span className="text-amber-400 mt-0.5">•</span>
                                          <span className="leading-relaxed">{weakness}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}

                              {app.matchBreakdown && (
                                <div className="space-y-3 pt-6 border-t border-white/5">
                                  <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles size={16} /> AI Match Breakdown
                                  </h4>
                                  <div className="p-4 bg-slate-900/80 border border-white/5 rounded-2xl space-y-4">
                                    <div>
                                      <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-sm text-slate-400">ATS Compatibility</span>
                                        <span className="text-sm font-bold text-slate-200">{app.matchBreakdown.atsCompatibility || 0}%</span>
                                      </div>
                                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                                        <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${app.matchBreakdown.atsCompatibility || 0}%` }} />
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-sm text-slate-400">Skill Match</span>
                                        <span className="text-sm font-bold text-slate-200">{app.matchBreakdown.skillMatch || 0}%</span>
                                      </div>
                                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                                        <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${app.matchBreakdown.skillMatch || 0}%` }} />
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-sm text-slate-400">Project Strength</span>
                                        <span className="text-sm font-bold text-slate-200">{app.matchBreakdown.projectStrength || 0}%</span>
                                      </div>
                                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                                        <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${app.matchBreakdown.projectStrength || 0}%` }} />
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                      <span className="text-sm text-slate-400">Contribution Activity</span>
                                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                        app.matchBreakdown.contributionActivity === 'High' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                        app.matchBreakdown.contributionActivity === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                        'bg-slate-800 text-slate-400 border-white/10'
                                      }`}>{app.matchBreakdown.contributionActivity || 'Low'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-slate-400">Career Readiness</span>
                                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                        app.matchBreakdown.careerReadiness === 'High' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                        app.matchBreakdown.careerReadiness === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                        'bg-slate-800 text-slate-400 border-white/10'
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
            {!loading && !error && applicants.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between bg-slate-900/40 border border-white/5 rounded-2xl p-4 mt-6">
                <div className="text-sm text-slate-400 font-medium">
                  Showing <span className="text-white">{(page - 1) * 20 + 1}</span> to <span className="text-white">{Math.min(page * 20, totalCount)}</span> of <span className="text-white">{totalCount}</span> candidates
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="bg-slate-900 hover:bg-slate-800 border-white/10"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="bg-slate-900 hover:bg-slate-800 border-white/10"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>

      <StatusUpdateModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        applicantName={selectedApp?.applicant?.name}
        currentStatus={selectedApp?.status}
        onUpdate={handleUpdateStatus}
      />
    </main>
  );
};

export default RecruiterApplicantsPage;
