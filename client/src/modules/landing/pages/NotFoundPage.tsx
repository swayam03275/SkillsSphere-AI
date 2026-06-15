import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";
import Navbar from "../../../shared/components/Navbar";

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--text-main)]">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in slide-in-from-bottom-8 duration-700 fade-in zoom-in-95">
          <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-slate-900 border border-slate-800 shadow-2xl rounded-3xl p-6 rotate-12 hover:rotate-0 transition-transform duration-500">
              <AlertCircle size={64} className="text-blue-500" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500">
              404
            </h1>
            <h2 className="text-2xl font-bold text-white">Page Not Found</h2>
            <p className="text-slate-400 text-lg max-w-sm mx-auto leading-relaxed">
              We searched everywhere, but the page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-slate-300 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:text-white transition-all w-full sm:w-auto active:scale-95"
            >
              <ArrowLeft size={18} />
              Go Back
            </button>
            <Link 
              to="/"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all w-full sm:w-auto active:scale-95"
            >
              <Home size={18} />
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;
