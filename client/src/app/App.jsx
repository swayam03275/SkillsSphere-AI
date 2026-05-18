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
import ForgotPassword from "../modules/auth/ForgotPassword";
import VerifyEmail from "../modules/auth/VerifyEmail";
import ProfilePage from "../modules/profile/ProfilePage";
import RecruiterJobsPage from "../modules/recruiter-jobs/pages/RecruiterJobsPage";
import RecruiterAnalyticsPage from "../modules/recruiter-jobs/pages/RecruiterAnalyticsPage";
import CreateJobPostingPage from "../modules/recruiter-jobs/pages/CreateJobPostingPage";
import EditJobPostingPage from "../modules/recruiter-jobs/pages/EditJobPostingPage";
import RecruiterApplicantsPage from "../modules/recruiter-jobs/pages/RecruiterApplicantsPage";
import JobBoardPage from "../modules/student-jobs/pages/JobBoardPage";
import MyApplicationsPage from "../modules/student-jobs/pages/MyApplicationsPage";
import RoadmapPage from "../modules/roadmap/pages/RoadmapPage";
import ClassroomsDashboard from "../modules/classrooms/pages/ClassroomsDashboard";
import ClassroomRoom from "../modules/classrooms/pages/ClassroomRoom";
import InterviewLobby from "../modules/mock-interview/pages/InterviewLobby";
import InterviewSession from "../modules/mock-interview/pages/InterviewSession";
import InterviewResults from "../modules/mock-interview/pages/InterviewResults";
import InterviewHistory from "../modules/mock-interview/pages/InterviewHistory";
import ProtectedRoute from "../shared/components/ProtectedRoute";
import ThemeToggle from "../shared/components/ThemeToggle";
import SocketNotificationListener from "../shared/components/SocketNotificationListener";
function App() {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, token]);

  return (
    <div className="min-h-screen bg-white text-black dark:bg-dark-bg dark:text-text-main transition-colors duration-300">
      <SocketNotificationListener />
      
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/job-matcher" 
          element={
            <ProtectedRoute requiredRole="student">
              <JobMatcherPage />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/my-applications"
          element={
            <ProtectedRoute requiredRole="student">
              <MyApplicationsPage />
            </ProtectedRoute>
          }
        />
        {import.meta.env.DEV && <Route path="/demo" element={<ComponentDemo />} />}
        <Route 
          path="/resume-analyzer" 
          element={
            <ProtectedRoute requiredRole="student">
              <ResumeAnalyzerPage />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/recruiter/jobs"
          element={
            <ProtectedRoute requiredRole="recruiter">
              <RecruiterJobsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/jobs/new"
          element={
            <ProtectedRoute requiredRole="recruiter">
              <CreateJobPostingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/jobs/edit/:id"
          element={
            <ProtectedRoute requiredRole="recruiter">
              <EditJobPostingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/analytics"
          element={
            <ProtectedRoute requiredRole="recruiter">
              <RecruiterAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/jobs/:id/applicants"
          element={
            <ProtectedRoute requiredRole="recruiter">
              <RecruiterApplicantsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs"
          element={
            <ProtectedRoute>
              <JobBoardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmap"
          element={
            <ProtectedRoute requiredRole="student">
              <RoadmapPage />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Live Classrooms */}
        <Route
          path="/classrooms"
          element={
            <ProtectedRoute>
              <ClassroomsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/classrooms/:roomId"
          element={
            <ProtectedRoute>
              <ClassroomRoom />
            </ProtectedRoute>
          }
        />

        {/* Mock Interview */}
        <Route
          path="/mock-interview"
          element={
            <ProtectedRoute requiredRole="student">
              <InterviewLobby />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mock-interview/history"
          element={
            <ProtectedRoute requiredRole="student">
              <InterviewHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mock-interview/:id"
          element={
            <ProtectedRoute requiredRole="student">
              <InterviewSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mock-interview/:id/results"
          element={
            <ProtectedRoute requiredRole="student">
              <InterviewResults />
            </ProtectedRoute>
          }
        />
      </Routes>
      <ChatWidget />
    </div>
  );
}

export default App;
