// @ts-nocheck

import React from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Button from "../shared/components/Button";
import { reportError } from "../utils/errorReporter";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
}


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
      errorInfo: null,
      hasError: false,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      error,
      hasError: true,
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    reportError(error, errorInfo).catch(() => {});
  }

  handleTryAgain = () => {
    this.setState({
      error: null,
      errorInfo: null,
      hasError: false,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { children } = this.props;
    const { error, errorInfo, hasError } = this.state;
    const showDetails = import.meta.env.DEV && (error || errorInfo);

    if (!hasError) {
      return children;
    }

    return (
      <main
        className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-dark-bg dark:text-text-main sm:px-6 lg:px-8"
        aria-labelledby="error-boundary-title"
      >
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col items-center justify-center text-center">
          <div
            className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8"
            role="alert"
            aria-live="assertive"
          >
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300">
              <AlertTriangle className="h-7 w-7" aria-hidden="true" />
            </div>

            <h1
              id="error-boundary-title"
              className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white"
            >
              Something went wrong
            </h1>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            An unexpected error occurred while loading this page. Please try again, or reload the page if the problem continues.
          </p>
          
          <div className="text-left bg-red-50 text-red-900 p-4 rounded-lg mb-6 max-h-64 overflow-y-auto text-xs font-mono">
            <strong>Error:</strong> {this.state.error?.toString()}
            <br/><br/>
            <strong>Component Stack:</strong>
            <pre className="whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
            <br/>
            <strong>Stack Trace:</strong>
            <pre className="whitespace-pre-wrap">{this.state.error?.stack}</pre>
          </div>

          <p className="text-gray-400 text-xs mb-6">
            Our team can use the secure error report to investigate.
          </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                onClick={this.handleTryAgain}
                variant="primary"
                leftIcon={<RefreshCw size={16} />}
              >
                Try Again
              </Button>
              <Button
                onClick={this.handleReload}
                variant="outline"
                leftIcon={<Home size={16} />}
              >
                Reload Page
              </Button>
            </div>

            {showDetails && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-200">
                  Error details
                </summary>
                <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                  {error?.stack || String(error)}
                  {errorInfo?.componentStack
                    ? `\n${errorInfo.componentStack}`
                    : ""}
                </pre>
              </details>
            )}
          </div>
        </section>
      </main>
    );
  }
}


export default ErrorBoundary;
