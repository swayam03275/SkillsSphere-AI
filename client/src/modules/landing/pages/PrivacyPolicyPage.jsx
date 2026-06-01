import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

const PrivacyPolicyPage = () => {
  useDocumentTitle("Privacy Policy | SkillSphere AI");
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
            Privacy Policy
          </h1>
          <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 space-y-6 leading-relaxed">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            <p>At SkillSphere AI, we prioritize your privacy and are committed to protecting your personal data. This Privacy Policy outlines how we collect, use, and safeguard your information.</p>
            
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4">1. Information We Collect</h3>
            <p>We may collect personal identification information including but not limited to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name, email address, and contact details.</li>
              <li>Professional background, resume data, and job application history.</li>
              <li>Usage data, including interactions with our AI matching algorithms.</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4">2. How We Use Your Information</h3>
            <p>Your data is strictly used to provide and improve the SkillSphere AI platform. Specifically, we use it to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Facilitate AI-driven candidate matching with recruiters.</li>
              <li>Provide personalized roadmap recommendations and mock interview analysis.</li>
              <li>Send critical system notifications and updates.</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4">3. Data Security</h3>
            <p>We implement industry-standard encryption and security measures to protect your data from unauthorized access, alteration, or disclosure. We do not sell your personal data to third parties under any circumstances.</p>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4">4. Contact Us</h3>
            <p>If you have any questions or concerns regarding this privacy policy, please contact us at privacy@skillsphere.ai.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
