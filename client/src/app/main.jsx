import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from '../store/index';
import App from './App.jsx';
import './index.css';
import { ToastProvider } from '../shared/components';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import { ThemeProvider } from '../shared/contexts/ThemeContext.jsx';
import { suppressReactScriptTagWarning } from '../utils/logger';
import TopLoadingBar from '../shared/components/TopLoadingBar.jsx';

// Intercept React.lazy to show top progress bar during chunk loading
const originalLazy = React.lazy;
React.lazy = (factory) => {
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
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
