import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../modules/landing/components/Navbar";
import Footer from "../components/Footer";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { ArrowLeft, MapPin, Clock, ArrowRight } from "lucide-react";

const CareersPage = () => {
  useDocumentTitle("Careers | SkillSphere AI");
  const navigate = useNavigate();

  const openings = [
    {
      title: "Senior Full-Stack Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: "Build and scale core platform features including AI matching, real-time classrooms, and the recruiter dashboard."
    },
    {
      title: "Machine Learning Engineer",
      department: "AI / Research",
      location: "Remote",
      type: "Full-time",
      description: "Design and train the next generation of skill-matching and resume-parsing models powering SkillSphere AI."
    },
    {
      title: "Product Designer",
      department: "Design",
      location: "Remote",
      type: "Full-time",
      description: "Craft intuitive, beautiful experiences for students, tutors, and recruiters across web and mobile."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />
      <main className="flex-grow pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          Back
        </button>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
            Join Our Team
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            We're building the future of AI-driven career acceleration. Come help us shape how millions of people find and grow in their careers.
          </p>
        </div>

        <div className="space-y-6">
          {openings.map((job, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:border-blue-500/50 hover:shadow-md group">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">{job.department}</span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{job.title}</h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">{job.description}</p>
                  <div className="flex items-center gap-4 mt-4 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {job.type}</span>
                  </div>
                </div>
                <button className="self-start sm:self-center flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all transform group-hover:scale-105">
                  Apply <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CareersPage;
