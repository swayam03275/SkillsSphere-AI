import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, LayoutDashboard, MessageSquare, LogIn, UserPlus, X, Menu } from 'lucide-react';
import Button from '../landing/Button';

const getStoredTheme = () => {
  try {
    return window?.localStorage?.getItem("skillssphere.theme") || "light";
  } catch {
    return "light";
  }
};

const storeTheme = (theme) => {
  try {
    window?.localStorage?.setItem("skillssphere.theme", theme);
  } catch {
    // Storage can be unavailable in test or privacy-restricted environments.
  }
};

const Navbar = ({ isAuthenticated = false, user = null }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);
  useEffect(() => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme === "light");

  storeTheme(theme);
}, [theme]);
const toggleTheme = () => {
  setTheme((prev) => (prev === "dark" ? "light" : "dark"));
};

  const navLinks = [
    { name: 'Home', path: '/', icon: <Home size={20} /> },
    { name: 'Resume Analyzer', path: '/resume-analyzer', icon: <FileText size={20} /> },
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Mock Interview', path: '/mock-interview', icon: <MessageSquare size={20} /> },
  ];

  const isActive = (path) => location.pathname === path;
  const topLevelTextClass = 'text-slate-900 dark:text-white';
  const topLevelMutedTextClass = 'text-slate-800 hover:text-slate-950 dark:text-white dark:hover:text-white';
  const loginButtonClass = '!text-slate-900 hover:!bg-slate-100 dark:!text-white dark:hover:!bg-slate-800';

  return (
    <nav className={`fixed top-0 left-0 w-full z-[1000] transition-all duration-300 max-sm:py-3 ${
      scrolled
        ? 'py-4 bg-[var(--nav-bg)] backdrop-blur-xl border-b border-[var(--border)] shadow-[0_8px_24px_rgba(0,0,0,0.12)]'
        : 'py-6 bg-transparent border-b border-transparent'
    }`}>
      <div className="container flex items-center justify-between px-4 sm:px-3">
        <Link to="/" className={`font-heading text-2xl font-extrabold tracking-normal ${topLevelTextClass} z-[1001] flex items-center min-h-[44px] sm:text-xl max-sm:text-lg`}>
          <span>SkillSphere</span> AI
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex gap-10 items-center">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative font-medium transition-all duration-300 py-2 ${
                isActive(link.path) ? `${topLevelTextClass} font-semibold` : topLevelMutedTextClass
              }`}
            >
              {link.name}
              {isActive(link.path) && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-sm" />
              )}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex gap-5 items-center">
          <button
            type="button"
            onClick={toggleTheme}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] ${topLevelTextClass} shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--surface-hover)]`}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${topLevelTextClass}`}>Hi, {user?.name || 'User'}</span>
              <Button variant="secondary" size="sm" to="/dashboard">Account</Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" to="/login" className={loginButtonClass}>Login</Button>
              <Button variant="primary" size="sm" to="/register">Get Started</Button>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button 
          className={`lg:hidden flex items-center justify-center bg-transparent border-none ${topLevelTextClass} cursor-pointer z-[1001] transition-transform duration-300 min-h-[44px] min-w-[44px] p-2 active:scale-90`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation"
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <div className={`fixed top-0 right-0 w-full h-[100dvh] z-[2000] transition-[visibility] duration-400 ${
        isMenuOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
      }`}>
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-lg transition-opacity duration-400 ${
            isMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMenuOpen(false)}
        />
        
        <div className={`absolute top-0 right-0 w-[85%] max-w-[400px] h-full bg-[var(--surface)] shadow-[-10px_0_50px_rgba(0,0,0,0.5)] flex flex-col p-6 overflow-y-auto overflow-x-hidden transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[90%] sm:max-w-none sm:p-4 max-sm:w-[95%] max-sm:p-4 ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="flex justify-between items-center mb-8 pb-4 sm:mb-6">
            <Link to="/" className="font-heading text-xl font-extrabold tracking-normal text-slate-900 dark:text-white">
              <span>SkillSphere</span> AI
            </Link>
            <button className="bg-[var(--surface-soft)] border border-[var(--border)] w-10 h-10 rounded-xl flex items-center justify-center text-slate-900 dark:text-white cursor-pointer min-h-[44px] min-w-[44px]" onClick={() => setIsMenuOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:gap-2">
            {navLinks.map((link, index) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-4 px-4 py-4 rounded-xl text-base font-medium transition-all duration-300 min-h-[44px] ${
                  isActive(link.path)
                    ? 'bg-primary/15 text-slate-900 dark:text-white font-bold'
                    : 'text-slate-800 hover:bg-[var(--surface-hover)] hover:text-slate-950 dark:text-white dark:hover:text-white'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 flex-shrink-0 ${
                  isActive(link.path) ? 'bg-primary text-white shadow-[0_4px_15px_rgba(79,70,229,0.4)]' : 'bg-[var(--surface-soft)]'
                }`}>{link.icon}</span>
                <span className="flex-grow">{link.name}</span>
                {isActive(link.path) && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />}
              </Link>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-[var(--border)]">
            {isAuthenticated ? (
              <Button variant="primary" size="lg" to="/dashboard" className="w-full justify-center">
                Go to Dashboard
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <Button variant="secondary" size="lg" to="/login" className="w-full justify-center !text-slate-900 dark:!text-white">
                  <LogIn size={20} /> Login
                </Button>
                <Button variant="primary" size="lg" to="/register" className="w-full justify-center">
                  <UserPlus size={20} /> Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
