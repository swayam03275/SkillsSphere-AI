// @ts-nocheck

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Search, Home, User, Settings, FileText, Briefcase, Sparkles, Rocket, Video, LayoutDashboard, Users, FileSearch } from "lucide-react";

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  // Define actions based on roles
  const actions = [
    { id: 'home', name: 'Home', path: '/', icon: <Home size={18} /> },
    { id: 'profile', name: 'Profile', path: '/profile', icon: <User size={18} /> },
    { id: 'dashboard', name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> }
  ];

  if (user?.role === 'student') {
    actions.push(
      { id: 'resume', name: 'Resume Analyzer', path: '/resume-analyzer', icon: <FileSearch size={18} /> },
      { id: 'jobs', name: 'Job Board', path: '/jobs', icon: <Briefcase size={18} /> },
      { id: 'match', name: 'Smart Job Matching', path: '/job-matcher', icon: <Sparkles size={18} /> },
      { id: 'cover', name: 'Analyzer History', path: '/resume-history', icon: <FileText size={18} /> },
      { id: 'roadmap', name: 'Career Roadmap', path: '/roadmap', icon: <Rocket size={18} /> }
    );
  } else if (user?.role === 'recruiter') {
    actions.push(
      { id: 'manage-jobs', name: 'Manage Jobs', path: '/recruiter/jobs', icon: <Briefcase size={18} /> },
      { id: 'talent', name: 'Talent Finder', path: '/recruiter/talent-finder', icon: <Search size={18} /> },
      { id: 'analytics', name: 'Recruiter Analytics', path: '/recruiter/analytics', icon: <LayoutDashboard size={18} /> }
    );
  } else if (user?.role === 'tutor') {
    actions.push(
      { id: 'classrooms', name: 'Live Classrooms', path: '/classrooms', icon: <Video size={18} /> },
      { id: 'tutor-dashboard', name: 'Tutor Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> }
    );
  }

  // Filter actions based on search query
  const filteredActions = query 
    ? actions.filter(action => action.name.toLowerCase().includes(query.toLowerCase()))
    : actions;

  // Shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
      
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredActions.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions.length > 0) {
          handleSelect(filteredActions[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (action) => {
    navigate(action.path);
    setIsOpen(false);
    setQuery("");
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 sm:px-6"
      onClick={() => setIsOpen(false)}
    >
      {/* Blurred Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" />
      
      {/* Palette Modal */}
      <div 
        className="relative w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-4 border-b border-[var(--border)]/50">
          <Search className="w-5 h-5 text-[var(--text-muted)] mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-lg text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none"
            placeholder="Search pages, tools, or actions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="flex items-center gap-1 opacity-50 ml-2">
            <kbd className="px-2 py-1 text-xs font-semibold bg-[var(--surface-hover)] border border-[var(--border)] rounded text-[var(--text-muted)]">ESC</kbd>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)]">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredActions.map((action, index) => (
                <li key={action.id}>
                  <button
                    className={`w-full flex items-center px-4 py-3 rounded-xl transition-all text-left ${
                      index === selectedIndex 
                        ? "bg-primary text-white shadow-lg scale-[1.02]" 
                        : "text-[var(--text-main)] hover:bg-[var(--surface-hover)] hover:scale-[1.01]"
                    }`}
                    onClick={() => handleSelect(action)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span className={`mr-4 ${index === selectedIndex ? "text-white" : "text-[var(--text-muted)]"}`}>
                      {action.icon}
                    </span>
                    <span className="font-semibold text-sm flex-1">{action.name}</span>
                    
                    {index === selectedIndex && (
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                        Enter
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 bg-[var(--surface-soft)] border-t border-[var(--border)]/30 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><kbd className="bg-[var(--surface)] border border-[var(--border)] rounded px-1.5 py-0.5 font-sans">↑</kbd><kbd className="bg-[var(--surface)] border border-[var(--border)] rounded px-1.5 py-0.5 font-sans">↓</kbd> to navigate</span>
            <span className="flex items-center gap-1"><kbd className="bg-[var(--surface)] border border-[var(--border)] rounded px-1.5 py-0.5 font-sans">Enter</kbd> to select</span>
          </div>
          <span className="font-semibold text-primary opacity-50">SkillSphere Search</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
