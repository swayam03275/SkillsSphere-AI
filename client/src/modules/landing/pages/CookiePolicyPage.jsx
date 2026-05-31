import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "../../../modules/landing/components/Navbar";
import Footer from "../components/Footer";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

const CookiePolicyPage = () => {
  useDocumentTitle("Cookie Policy | SkillSphere AI");
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
            Cookie Policy
          </h1>
          <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 space-y-6 leading-relaxed">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            <p>This Cookie Policy explains how SkillSphere AI uses cookies and similar technologies to recognize you when you visit our application.</p>
            
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4">What are cookies?</h3>
            <p>Cookies are small data files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide reporting information.</p>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4">Why do we use cookies?</h3>
            <p>We use cookies for several reasons:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for technical operation of the platform, such as maintaining your authenticated session.</li>
              <li><strong>Performance Cookies:</strong> Allow us to analyze how users interact with the dashboard to improve UX.</li>
              <li><strong>Functionality Cookies:</strong> Remember your preferences, such as light/dark mode themes.</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4">Managing Cookies</h3>
            <p>You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your web browser controls to accept or refuse cookies.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePolicyPage;
