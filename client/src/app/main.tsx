import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from '../store';
import App from './App';
import './index.css';
import { ToastProvider } from '../shared/components';
import ErrorBoundary from '../components/ErrorBoundary';
import { ThemeProvider } from '../shared/contexts/ThemeContext';
import { suppressReactScriptTagWarning } from '../utils/logger';
import TopLoadingBar from '../shared/components/TopLoadingBar';

// Intercept React.lazy to show top progress bar during chunk loading
const originalLazy = React.lazy;
(React as any).lazy = (factory: any) => {
  return originalLazy(async () => {
    window.dispatchEvent(new Event('route-loading-start'));
    try {
      return await factory();
    } finally {
      window.dispatchEvent(new Event('route-loading-stop'));
    }
  });
};

suppressReactScriptTagWarning();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        {/* @ts-ignore */}
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <TopLoadingBar />
          <ToastProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
