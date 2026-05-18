import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from '../store/index';
import App from './App.jsx';
import './index.css';
import { ToastProvider } from '../shared/components';
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    const firstArg = args[0];
    if (
      typeof firstArg === 'string' &&
      firstArg.includes('Encountered a script tag while rendering React component')
    ) {
      return; 
    }
    originalError(...args);
  };
}

const savedTheme =
  localStorage.getItem("skillssphere.theme") || "dark";

if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);