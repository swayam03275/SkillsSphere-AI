import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Home, FileText, LayoutDashboard, MessageSquare, LogIn, UserPlus, X, Menu, LogOut, User, ChevronDown, Briefcase, Moon, Sun, Sparkles, Rocket, Video } from 'lucide-react';
import Button from './Button';
import { logout } from '../../features/auth/authSlice';
import { getProtectedAssetUrl } from '../../utils/protectedAssetUrl';

const Navbar = () => {
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);
  const avatarSrc = user?.profilePic ? getProtectedAssetUrl(user.profilePic, token) : null;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    return window.localStorage.getItem('skillssphere.theme') || 'light';
  });
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    setIsProfileOpen(false);
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    // keep dataset and classes in sync
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    window.localStorage.setItem('skillssphere.theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));

  const navLinks = [
    { name: 'Home', path: '/', icon: <Home size={20} /> },
    ...(user?.role === 'recruiter' 
      ? [{ name: 'Manage Jobs', path: '/recruiter/jobs', icon: <Briefcase size={20} /> }]
      : user?.role === 'tutor'
      ? [{ name: 'Live Classrooms', path: '/classrooms', icon: <Video size={20} /> }]
      : [
          { name: 'Job Board', path: '/jobs', icon: <Briefcase size={20} /> },
          { name: 'Job Match', path: '/job-matcher', icon: <Sparkles size={20} /> },
          { name: 'Resume Analyzer', path: '/resume-analyzer', icon: <FileText size={20} /> },
          { name: 'Cover Letters', path: '/cover-letters', icon: <FileText size={20} /> },
          { name: 'Roadmap', path: '/roadmap', icon: <Rocket size={20} /> }
        ]
    ),
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    ...(user?.role === 'student'
      ? [{ name: 'Mock Interview', path: '/mock-interview', icon: <MessageSquare size={20} /> }]
      : []
    ),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`fixed top-0 left-0 w-full z-[1000] transition-all duration-300
      ${scrolled
        ? 'py-4 bg-[var(--nav-bg)] backdrop-blur-xl border-b border-[var(--border)] shadow-[0_8px_24px_rgba(0,0,0,0.12)]'
        : 'py-6 bg-transparent border-b border-transparent'
      }
      ${isMenuOpen ? '' : ''}
      max-sm:py-3`}>

      <div className="container flex justify-between items-center px-4 sm:px-3">
        <Link to="/" className="font-heading text-2xl font-extrabold tracking-normal text-[var(--text-main)] z-[1001] flex items-center min-h-[44px] sm:text-xl max-sm:text-lg">
          <span className="text-gradient">SkillSphere</span>&nbsp;AI
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex gap-10 items-center">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative font-medium transition-all duration-300 py-2
                ${isActive(link.path)
                  ? 'text-[var(--text-main)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
            >
              {link.name}
              {isActive(link.path) && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-sm animate-[scaleIn_0.3s_ease-out_forwards]" />
              )}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex gap-5 items-center">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--surface-hover)]"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {isAuthenticated ? (
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 hover:bg-[var(--surface-hover)] p-2 rounded-xl transition-colors duration-200"
              >
                <div className="w-9 h-9 rounded-full bg-[var(--surface-soft)] flex items-center justify-center text-[var(--primary)] font-bold border border-[var(--border)] overflow-hidden flex-shrink-0">
                  {avatarSrc
                    ? <img src={avatarSrc} alt={user.name} className="w-full h-full object-cover" />
                    : (user?.name?.charAt(0).toUpperCase() || <User size={18} />)
                  }
                </div>
                <div className="text-left hidden xl:block">
                  <p className="text-sm font-medium text-[var(--text-main)]">{user?.name || 'User'}</p>
                </div>
                <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-soft)] rounded-xl py-2 z-[1002] animate-[slideFadeIn_0.2s_ease_forwards]">
                  <div className="px-4 py-3 border-b border-[var(--border)] mb-2">
                    <p className="text-sm font-medium text-[var(--text-main)] truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{user?.email}</p>
                  </div>
                  <Link 
                    to="/dashboard" 
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <LayoutDashboard size={18} />
                    Dashboard
                  </Link>
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <User size={18} />
                    Profile
                  </Link>
                  {user?.role === 'student' && (
                    <Link 
                      to="/my-applications" 
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Briefcase size={18} />
                      Applied Jobs
                    </Link>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:text-red-400 hover:bg-red-400/10 transition-colors mt-1 border-t border-[var(--border)] pt-3"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" to="/login">Login</Button>
              <Button variant="primary" size="sm" to="/register">Get Started</Button>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="lg:hidden flex items-center justify-center bg-transparent border-none text-[var(--text-main)] cursor-pointer z-[1001] transition-transform duration-300 min-h-[44px] min-w-[44px] p-2 active:scale-90"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation"
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <div className={`fixed top-0 right-0 w-full h-[100dvh] z-[2000] transition-[visibility] duration-400
        ${isMenuOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}>

        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-lg transition-opacity duration-400
            ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMenuOpen(false)}
        />

        {/* Drawer Panel */}
        <div className={`absolute top-0 right-0 w-[85%] max-w-[400px] h-full bg-[var(--surface)]
          shadow-[-10px_0_50px_rgba(0,0,0,0.5)] flex flex-col p-6 overflow-y-auto overflow-x-hidden
          transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]
          sm:w-[90%] sm:max-w-none sm:p-4 max-sm:w-full max-sm:p-3 max-sm:rounded-none
          ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>

          {/* Drawer Header */}
          <div className="flex justify-between items-center mb-8 pb-4 sm:mb-6">
            <Link to="/" className="font-heading text-xl font-extrabold tracking-normal text-[var(--text-main)]">
              <span className="text-gradient">SkillSphere</span>&nbsp;AI
            </Link>
            <button
              className="bg-[var(--surface-soft)] border border-[var(--border)] w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-main)] cursor-pointer min-h-[44px] min-w-[44px]"
              onClick={() => setIsMenuOpen(false)}
            >
              <X size={24} />
            </button>
          </div>

          {/* Drawer Links */}
          <div className="flex flex-col gap-3 sm:gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-4 px-4 py-4 rounded-xl text-base font-medium text-[var(--text-main)] bg-[var(--surface-soft)] border border-[var(--border)] transition-all duration-300 min-h-[44px]"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--surface)]">
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </span>
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>

            {navLinks.map((link, index) => (
              <Link
                key={link.path}
                to={link.path}
                style={{ animationDelay: `${index * 0.1}s` }}
                className={`flex items-center gap-4 px-4 py-4 rounded-xl text-base font-medium
                  transition-all duration-300 min-h-[44px] cursor-pointer
                  max-sm:px-3 max-sm:py-3 max-sm:text-[0.95rem] max-sm:gap-3
                  ${isMenuOpen ? 'animate-[slideFadeIn_0.5s_ease_forwards]' : 'opacity-0 translate-y-5'}
                  ${isActive(link.path)
                    ? 'bg-primary/15 text-primary font-bold'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]'
                  }`}
              >
                <span className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 flex-shrink-0
                  max-sm:w-9 max-sm:h-9
                  ${isActive(link.path)
                    ? 'bg-primary text-white shadow-[0_4px_15px_rgba(79,70,229,0.4)]'
                    : 'bg-[var(--surface-soft)]'
                  }`}>
                  {link.icon}
                </span>
                <span className="flex-grow">{link.name}</span>
                {isActive(link.path) && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
                )}
              </Link>
            ))}
          </div>

          {/* Drawer Footer */}
          <div className="mt-auto pt-6 border-t border-[var(--border)]">
            {isAuthenticated ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 px-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-soft)] flex items-center justify-center text-[var(--primary)] font-bold border border-[var(--border)] overflow-hidden flex-shrink-0">
                    {avatarSrc
                      ? <img src={avatarSrc} alt={user.name} className="w-full h-full object-cover" />
                      : (user?.name?.charAt(0).toUpperCase() || <User size={20} />)
                    }
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-[var(--text-main)] truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
                  </div>
                </div>
                <Button variant="primary" size="lg" to="/dashboard" className="w-full justify-center">
                  Go to Dashboard
                </Button>
                <Button variant="outline" size="lg" to="/profile" className="w-full justify-center border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--surface-hover)]">
                  <User size={20} /> View Profile
                </Button>
                <Button variant="ghost" size="lg" onClick={handleLogout} className="w-full justify-center text-red-400 hover:text-red-300 hover:bg-red-400/10">
                  <LogOut size={20} /> Logout
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Button variant="secondary" size="lg" to="/login" className="w-full justify-center">
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
