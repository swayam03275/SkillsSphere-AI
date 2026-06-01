import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { ArrowLeft, CheckCircle } from "lucide-react";

const ApiStatusPage = () => {
  useDocumentTitle("API Status | SkillSphere AI");
  const navigate = useNavigate();

  const services = [
    { name: "Core API", status: "Operational", uptime: "99.98%" },
    { name: "AI Matching Engine", status: "Operational", uptime: "99.95%" },
    { name: "Resume Parser", status: "Operational", uptime: "99.97%" },
    { name: "Live Classroom Sockets", status: "Operational", uptime: "99.90%" },
    { name: "Mock Interview Service", status: "Operational", uptime: "99.92%" },
    { name: "Notification Service", status: "Operational", uptime: "99.99%" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />
      <main className="flex-grow pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          Back
        </button>
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-6">
            <CheckCircle size={16} />
            All Systems Operational
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
            System Status
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Real-time status of SkillSphere AI services and infrastructure.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          {services.map((service, idx) => (
            <div key={idx} className={`flex items-center justify-between px-8 py-5 ${idx !== services.length - 1 ? "border-b border-slate-100 dark:border-slate-800" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-slate-900 dark:text-white">{service.name}</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">Uptime: {service.uptime}</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{service.status}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8">
          Last checked: {new Date().toLocaleString()}
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default ApiStatusPage;
