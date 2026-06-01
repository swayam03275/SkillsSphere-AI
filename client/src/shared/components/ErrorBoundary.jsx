import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

import logger from "../../utils/logger";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // In a production app, we could also log this to Sentry or an external logging service
    logger.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <div className="bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-lg)] rounded-3xl p-8 md:p-12 max-w-2xl w-full relative overflow-hidden">
            
            {/* Background Decorative Element */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-red-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-red-500 animate-pulse" />
              </div>
              
              <h2 className="text-3xl font-extrabold text-[var(--text-main)] mb-3">
                Oops! Something went wrong.
              </h2>
              <p className="text-[var(--text-muted)] text-base mb-8 max-w-md">
                We're sorry, but the application encountered an unexpected error. Our team has been notified.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-bold rounded-xl shadow-lg hover:shadow-[var(--primary)]/30 hover:bg-[var(--primary-hover)] transition-all active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Application
                </button>
                
                <Link
                  to="/"
                  onClick={() => this.setState({ hasError: false })}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--surface-hover)] text-[var(--text-main)] border border-[var(--border)] font-bold rounded-xl hover:bg-[var(--surface-soft)] transition-all active:scale-95"
                >
                  <Home className="w-4 h-4" />
                  Return Home
                </Link>
              </div>

              {/* Dev environment error trace */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mt-10 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-left w-full overflow-auto max-h-64 scrollbar-thin">
                  <p className="text-red-500 font-bold text-sm mb-2">{this.state.error.toString()}</p>
                  <pre className="text-xs text-[var(--text-muted)] font-mono whitespace-pre-wrap">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
