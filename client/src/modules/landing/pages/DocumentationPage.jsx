import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../modules/landing/components/Navbar";
import Footer from "../components/Footer";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { ArrowLeft, Book, Code, Terminal, Zap } from "lucide-react";

const DocumentationPage = () => {
  useDocumentTitle("Documentation | SkillSphere AI");
  const navigate = useNavigate();

  const sections = [
    {
      title: "Getting Started",
      icon: <Zap className="text-amber-500" size={24} />,
      content: "Learn the basics of setting up your profile, uploading your resume, and navigating the main dashboard."
    },
    {
      title: "AI Job Matcher",
      icon: <Code className="text-blue-500" size={24} />,
      content: "Understand how our recommendation engine analyzes your skills against job descriptions to compute compatibility scores."
    },
    {
      title: "Mock Interviews",
      icon: <Terminal className="text-emerald-500" size={24} />,
      content: "A guide to using the WebRTC live coding and interview lobbys, including how tutors grade your sessions."
    },
    {
      title: "API Reference",
      icon: <Book className="text-purple-500" size={24} />,
      content: "For enterprise recruiters: documentation on programmatically posting jobs and retrieving applicant analytics."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />
      <main className="flex-grow pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          Back
        </button>
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
            SkillSphere Documentation
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Everything you need to know about navigating the platform, mastering the AI tools, and accelerating your career.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                {section.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{section.title}</h3>
              <p className="text-slate-600 dark:text-slate-400">{section.content}</p>
              <button className="mt-6 text-blue-600 dark:text-blue-400 font-medium hover:underline text-sm flex items-center gap-1">
                Read guide &rarr;
              </button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DocumentationPage;
