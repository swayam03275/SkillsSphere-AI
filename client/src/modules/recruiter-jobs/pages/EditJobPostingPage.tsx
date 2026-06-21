
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Edit3, Target, Sparkles } from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import JobPostingForm from "../components/JobPostingForm";
import LoadingState from "../../../shared/components/LoadingState";
import { updateJobPosting, getJobPostingById } from "../services/jobPostingService";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";


const EditJobPostingPage = () => {
  useDocumentTitle("Edit Job Posting");
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useSelector((state: any) => state.auth);

  const [jobData, setJobData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let ignore = false;
    async function fetchJob() {
      setIsLoadingData(true);
      try {
        const response = await getJobPostingById(id, token);
        if (!ignore) {
          setJobData(response.job);
        }
      } catch (err: any) {
        if (!ignore) {
          setSubmitError(err.message || "Failed to load job posting data.");
        }
      } finally {
        if (!ignore) {
          setIsLoadingData(false);
        }
      }
    }
    fetchJob();
    return () => { ignore = true; };
  }, [id, token]);

  const handleSubmit = async (payload) => {
    setSubmitError("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await updateJobPosting(id, payload, token);
      navigate("/recruiter/jobs");
    } catch (error: any) {
      setSubmitError(error.message || "Failed to update job posting. Please try again.");
      if (error.errors) {
        setFieldErrors(error.errors);
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="py-6">
            <Link 
              to="/recruiter/jobs" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Jobs
            </Link>
          </div>

          <div className="text-center space-y-4 mb-6 relative">
            <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
               <Edit3 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <Target className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-purple-500" /> LIVE EDITING MODE
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Edit</span> Job Posting
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              Update the details below to edit your job posting. Changes will be reflected immediately.
            </p>
          </div>

        {submitError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <p>{submitError}</p>
          </div>
        )}

        <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] max-w-3xl mx-auto w-full">
          {isLoadingData ? (
            <div className="py-12">
              {/* @ts-expect-error TODO: Fix pervasive types */}
              <LoadingState message="Loading job details..." />
            </div>
          ) : jobData ? (
            <JobPostingForm 
              initialData={jobData}
              onSubmit={handleSubmit} 
              isLoading={isSubmitting} 
              fieldErrors={fieldErrors} 
            />
          ) : (
            <div className="text-center py-10 text-slate-600 dark:text-slate-400">
              Could not load job data.
            </div>
          )}
        </div>
      </div>
      </main>
          <Footer />
    </div>
  );
};

export default EditJobPostingPage;
