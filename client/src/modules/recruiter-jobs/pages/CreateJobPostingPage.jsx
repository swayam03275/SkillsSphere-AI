import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Briefcase } from "lucide-react";
import Navbar from "../../../modules/landing/components/Navbar";
import Footer from "../../../modules/landing/components/Footer";

import JobPostingForm from "../components/JobPostingForm";
import { createJobPosting } from "../services/jobPostingService";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";


const CreateJobPostingPage = () => {
  useDocumentTitle("Create Job Posting");
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (payload) => {
    setSubmitError("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await createJobPosting(payload, token);
      navigate("/recruiter/jobs");
    } catch (error) {
      setSubmitError(error.message || "Failed to create job posting. Please try again.");
      if (error.errors) {
        setFieldErrors(error.errors);
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white flex flex-col">
      <Navbar />

      <div className="flex-1 pt-24 pb-16 px-4 sm:px-6 mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link 
          to="/recruiter/jobs" 
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-400 transition-colors w-fit group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Jobs</span>
        </Link>

        <div className="flex flex-col gap-1 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Briefcase size={24} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create Job Posting</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Fill in the details below to post a new job. We'll use this information to recommend the best candidates.
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

        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          <JobPostingForm 
            onSubmit={handleSubmit} 
            isLoading={isSubmitting} 
            fieldErrors={fieldErrors} 
          />
        </div>
      </div>
          <Footer />
    </div>
  );
};

export default CreateJobPostingPage;
