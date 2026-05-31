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

suppressReactScriptTagWarning();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
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
