// @ts-nocheck

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ErrorBoundary from './ErrorBoundary';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}


const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to onboarding if not onboarded, EXCEPT when already on the onboarding page
  if (user && !user.isOnboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // If a role is required but the user doesn't have it, redirect to dashboard
    // or a specialized unauthorized page if one exists.
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
};


export default ProtectedRoute;
