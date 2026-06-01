import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

const TermsOfServicePage = () => {
  useDocumentTitle("Terms of Service | SkillSphere AI");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />
      <main className="flex-grow pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          Back
        </button>
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight border-b border-slate-200 dark:border-slate-700 pb-4">
            Terms of Service
          </h1>
          <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 space-y-6 leading-relaxed">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            <p>Welcome to SkillSphere AI. By accessing or using our platform, you agree to be bound by these terms. Please read them carefully.</p>
            
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4">1. Acceptance of Terms</h3>
            <p>By registering for an account, navigating our site, or utilizing our AI matching and career services, you acknowledge that you have read, understood, and agree to these Terms of Service.</p>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4">2. User Responsibilities</h3>
            <p>Users are responsible for maintaining the confidentiality of their account credentials. You agree to provide accurate, current, and complete information regarding your professional background and resume data.</p>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4">3. Prohibited Conduct</h3>
            <p>You agree not to engage in any activity that interferes with or disrupts the services. This includes attempting to reverse-engineer our matching algorithms, uploading malicious files, or impersonating other users.</p>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4">4. Termination</h3>
            <p>We reserve the right to suspend or terminate your account at our sole discretion if we believe you have violated these Terms of Service.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfServicePage;
