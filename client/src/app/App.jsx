import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCurrentUser } from "../features/auth/authSlice";
import ChatWidget from "../modules/ai-assistant/components/ChatWidget";
import LandingPage from "../modules/landing/LandingPage";
import DashboardPage from "../modules/dashboard/DashboardPage";
import ResumeAnalyzerPage from "../modules/resume-analyzer/pages/ResumeAnalyzerPage";
import JobMatcherPage from "../modules/job-matcher/pages/JobMatcherPage";
import ComponentDemo from "../modules/auth/components/ComponentDemo";
import Login from "../modules/auth/Login";
import Register from "../modules/auth/Register";
import OAuthCallback from "../modules/auth/OAuthCallback";
import ResetPassword from "../modules/auth/ResetPassword";
import VerifyEmail from "../modules/auth/VerifyEmail";
import ProfilePage from "../modules/profile/ProfilePage";
import RecruiterJobsPage from "../modules/recruiter-jobs/pages/RecruiterJobsPage";
import CreateJobPostingPage from "../modules/recruiter-jobs/pages/CreateJobPostingPage";
import JobBoardPage from "../modules/student-jobs/pages/JobBoardPage";
import ProtectedRoute from "../shared/components/ProtectedRoute";
import PublicRoute from ".shared/components/PublicRoute.jsx";
import NotFound from ".shared/components/NotFound.jsx";

function App() {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, token]);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Routes>

        {/*  Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/job-matcher" element={<JobMatcherPage />} />
        {import.meta.env.DEV && <Route path="/demo" element={<ComponentDemo />} />}

        {/*  Auth restricted */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/*  Other public */}
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/*  Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/resume-analyzer" element={<ResumeAnalyzerPage />} />
          <Route path="/jobs" element={<JobBoardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Recruiter only */}
        <Route element={<ProtectedRoute requiredRole="recruiter" />}>
          <Route path="/recruiter/jobs" element={<RecruiterJobsPage />} />
          <Route path="/recruiter/jobs/new" element={<CreateJobPostingPage />} />
        </Route>

        {/*  404 */}
        <Route path="*" element={<NotFound />} />

      </Routes>

      {/* Only show chat when logged in */}
      {token && <ChatWidget />}
    </div>
  );
}
    

export default App;
