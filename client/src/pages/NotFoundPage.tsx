import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] text-gray-900 dark:text-white p-6 transition-colors duration-200">
      <div className="flex flex-col items-center max-w-lg text-center space-y-6 animate-in fade-in zoom-in duration-500">
        
        {/* Floating Icon Animation */}
        <div className="relative flex items-center justify-center w-24 h-24 mb-4">
          <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-500/10 rounded-full animate-ping"></div>
          <div className="relative w-24 h-24 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 text-blue-500 rounded-full flex items-center justify-center shadow-xl">
            <Compass size={48} className="animate-pulse" />
          </div>
        </div>

        {/* 404 Header text */}
        <h1 className="text-6xl sm:text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
          404
        </h1>
        
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-slate-100">
          Lost in the Matrix?
        </h2>
        
        <p className="text-gray-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed px-4">
          Oops! It looks like you've ventured into uncharted territory. The page you are looking for doesn't exist, has been moved, or you just took a wrong turn.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 w-full sm:w-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <ArrowLeft size={18} /> Go Back
          </button>
          
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 shadow-md transition-all"
          >
            <Home size={18} /> Return to Dashboard
          </Link>
        </div>

      </div>
    </main>
  );
};

export default NotFoundPage;