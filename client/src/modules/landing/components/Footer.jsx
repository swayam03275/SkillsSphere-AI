import { Link } from "react-router-dom";
import { Mail, ArrowRight, Sparkles } from "lucide-react";
const Footer = () => {
  return (
    <footer className="relative border-t border-[var(--border)] bg-slate-950 overflow-hidden">
      {/* Decorative gradient background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container relative z-10 px-4 py-16 mx-auto sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-4 lg:gap-8">
          
          {/* Brand & Newsletter Section */}
          <div className="lg:col-span-1 space-y-6">
            <Link to="/" className="inline-flex items-center gap-2 font-heading text-2xl font-extrabold tracking-tight text-white group">
              <Sparkles className="text-blue-400 group-hover:text-blue-300 transition-colors" size={24} />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                SkillSphere
              </span>
              <span>AI</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Elevate your hiring pipeline and career trajectory with intelligent, AI-driven applicant tracking and matching.
            </p>
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Subscribe to updates</h4>
              <form className="flex max-w-xs items-center p-1 rounded-full bg-slate-900 border border-slate-800 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all group shadow-inner">
                <div className="pl-3 pr-2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Mail size={16} />
                </div>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none py-2"
                />
                <button type="button" className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors transform hover:scale-105 active:scale-95">
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3 lg:ml-auto">
            <div className="space-y-5">
              <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">Product</h3>
              <ul className="space-y-4">
                <li><Link to="/resume-analyzer" className="text-sm text-slate-400 hover:text-blue-400 transition-colors inline-block transform hover:translate-x-1 duration-200">Resume Analyzer</Link></li>
                <li><Link to="/job-matcher" className="text-sm text-slate-400 hover:text-blue-400 transition-colors inline-block transform hover:translate-x-1 duration-200">Job Matcher</Link></li>
                <li><Link to="/dashboard" className="text-sm text-slate-400 hover:text-blue-400 transition-colors inline-block transform hover:translate-x-1 duration-200">Dashboard</Link></li>
                <li><Link to="/login" className="text-sm text-slate-400 hover:text-blue-400 transition-colors inline-block transform hover:translate-x-1 duration-200">Sign In</Link></li>
              </ul>
            </div>

            <div className="space-y-5">
              <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">Resources</h3>
              <ul className="space-y-4">
                <li><a href="#" className="text-sm text-slate-400 hover:text-blue-400 transition-colors inline-block transform hover:translate-x-1 duration-200">Documentation</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-blue-400 transition-colors inline-block transform hover:translate-x-1 duration-200">Blog</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-blue-400 transition-colors inline-block transform hover:translate-x-1 duration-200">Careers</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-blue-400 transition-colors inline-block transform hover:translate-x-1 duration-200">API Status</a></li>
              </ul>
            </div>

            <div className="space-y-5">
              <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">Legal</h3>
              <ul className="space-y-4">
                <li><a href="#" className="text-sm text-slate-400 hover:text-blue-400 transition-colors inline-block transform hover:translate-x-1 duration-200">Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-blue-400 transition-colors inline-block transform hover:translate-x-1 duration-200">Terms of Service</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-blue-400 transition-colors inline-block transform hover:translate-x-1 duration-200">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} SkillSphere AI. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition-all transform hover:-translate-y-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
            <a href="#" className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-slate-700 hover:bg-slate-800 transition-all transform hover:-translate-y-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
            </a>
            <a href="#" className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-blue-500 hover:border-slate-700 hover:bg-slate-800 transition-all transform hover:-translate-y-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect width="4" height="12" x="2" y="9"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
