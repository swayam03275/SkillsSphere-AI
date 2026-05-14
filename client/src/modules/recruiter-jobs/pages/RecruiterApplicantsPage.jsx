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
  Filter
} from 'lucide-react';
import Navbar from '../../../shared/landing/Navbar';
import { Button, LoadingState, ErrorState, EmptyState, StatusUpdateModal, StatusTimeline } from '../../../shared/components';
import { getJobApplications, updateApplicationStatus, getJobPostingById } from '../services/jobPostingService';

const statusStyles = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  reviewed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  shortlisted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  withdrawn: "bg-slate-700/30 text-slate-400 border-slate-700/50",
};

const RecruiterApplicantsPage = () => {
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobData, appsData] = await Promise.all([
        getJobPostingById(jobId, token),
        getJobApplications(jobId, token)
      ]);
      setJob(jobData.job);
      setApplicants(appsData.applications || []);
    } catch (err) {
      setError(err.message || "Failed to load applicant data.");
    } finally {
      setLoading(false);
    }
  }, [jobId, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async (status, comment) => {
    if (!selectedApp) return;
    
    await updateApplicationStatus(selectedApp._id, status, comment, token);
    
    // Refresh data to show new status and timeline
    fetchData();
  };

  const openUpdateModal = (e, app) => {
    e.stopPropagation();
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] p-4 sm:p-6 pt-24 sm:pt-32 text-slate-100">
      <Navbar />

      <div className="mx-auto max-w-6xl w-full space-y-8">
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
              Applicants for <span className="text-blue-400">{job?.title || 'Loading...'}</span>
            </h1>
            <div className="flex items-center gap-4 text-slate-400 text-sm">
              <span className="flex items-center gap-1.5">
                <Users size={16} /> {applicants.length} Total Applicants
              </span>
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                Job ID: {jobId.slice(-6)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" leftIcon={<Filter size={18} />} className="border-white/5 bg-white/5 hover:bg-white/10">
              Filter
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20">
            <LoadingState message="Fetching applicants and their profiles..." />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : applicants.length === 0 ? (
          <EmptyState 
            icon={<Users size={48} className="text-slate-700" />}
            title="No applicants yet"
            description="As soon as students apply to this position, they will appear here with their resumes and match scores."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {applicants.map((app) => (
              <div 
                key={app._id}
                className={`group border transition-all duration-300 rounded-2xl overflow-hidden ${
                  expandedId === app._id 
                    ? "bg-slate-900/80 border-blue-500/30 shadow-2xl" 
                    : "bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60"
                }`}
              >
                {/* Applicant Summary Row */}
                <div 
                  className="p-6 cursor-pointer"
                  onClick={() => toggleExpand(app._id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 min-w-0">
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

                    <div className="flex items-center gap-4 shrink-0">
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

                        <div className="pt-4 flex gap-3">
                          <Button 
                            className="bg-blue-600 hover:bg-blue-500"
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
            ))}
          </div>
        )}
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
