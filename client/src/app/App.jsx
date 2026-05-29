import React, { useEffect, Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCurrentUser, logoutUser } from "../features/auth/authSlice";
import ChatWidget from "../modules/ai-assistant/components/ChatWidget";
const LandingPage = lazy(() => import("../modules/landing/LandingPage"));
const DashboardPage = lazy(() => import("../modules/dashboard/DashboardPage"));
const CoverLetterHistoryPage = lazy(() => import("../modules/dashboard/pages/CoverLetterHistoryPage"));
const ResumeAnalyzerPage = lazy(() => import("../modules/resume-analyzer/pages/ResumeAnalyzerPage"));
const JobMatcherPage = lazy(() => import("../modules/job-matcher/pages/JobMatcherPage"));
const ComponentDemo = lazy(() => import("../modules/auth/components/ComponentDemo"));
const Login = lazy(() => import("../modules/auth/Login"));
const Register = lazy(() => import("../modules/auth/Register"));
const OAuthCallback = lazy(() => import("../modules/auth/OAuthCallback"));
const ResetPassword = lazy(() => import("../modules/auth/ResetPassword"));
const ForgotPassword = lazy(() => import("../modules/auth/ForgotPassword"));
const VerifyEmail = lazy(() => import("../modules/auth/VerifyEmail"));
const ProfilePage = lazy(() => import("../modules/profile/ProfilePage"));
const RecruiterJobsPage = lazy(() => import("../modules/recruiter-jobs/pages/RecruiterJobsPage"));
const RecruiterAnalyticsPage = lazy(() => import("../modules/recruiter-jobs/pages/RecruiterAnalyticsPage"));
const CreateJobPostingPage = lazy(() => import("../modules/recruiter-jobs/pages/CreateJobPostingPage"));
const EditJobPostingPage = lazy(() => import("../modules/recruiter-jobs/pages/EditJobPostingPage"));
const RecruiterApplicantsPage = lazy(() => import("../modules/recruiter-jobs/pages/RecruiterApplicantsPage"));
const JobBoardPage = lazy(() => import("../modules/student-jobs/pages/JobBoardPage"));
const MyApplicationsPage = lazy(() => import("../modules/student-jobs/pages/MyApplicationsPage"));
const RoadmapPage = lazy(() => import("../modules/roadmap/pages/RoadmapPage"));
const TutorRoadmapLobby = lazy(() => import("../modules/roadmap/pages/TutorRoadmapLobby"));
const ClassroomsDashboard = lazy(() => import("../modules/classrooms/pages/ClassroomsDashboard"));
const ClassroomRoom = lazy(() => import("../modules/classrooms/pages/ClassroomRoom"));
const InterviewLobby = lazy(() => import("../modules/mock-interview/pages/InterviewLobby"));
const InterviewSession = lazy(() => import("../modules/mock-interview/pages/InterviewSession"));
const InterviewResults = lazy(() => import("../modules/mock-interview/pages/InterviewResults"));
const InterviewHistory = lazy(() => import("../modules/mock-interview/pages/InterviewHistory"));
const TutorInterviewConsole = lazy(() => import("../modules/mock-interview/pages/TutorInterviewConsole"));
const TutorInterviewsList = lazy(() => import("../modules/mock-interview/pages/TutorInterviewsList"));
const TutorAnalyticsDashboard = lazy(() => import("../modules/analytics/TutorAnalyticsDashboard"));
const NotificationsPage = lazy(() => import("../modules/notifications/pages/NotificationsPage"));
import ProtectedRoute from "../shared/components/ProtectedRoute";
import SocketNotificationListener from "../shared/components/SocketNotificationListener";
import { LoadingState } from "../shared/components";
function App() {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, token]);

  useEffect(() => {
    const handleUnauthorized = () => {
      dispatch(logoutUser());
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-main)] transition-colors duration-300">
      <SocketNotificationListener />

      <Suspense fallback={<LoadingState message="Loading module..." />}>
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
        {import.meta.env.DEV && (
          <Route path="/demo" element={<ComponentDemo />} />
        )}
        <Route
          path="/resume-analyzer"
          element={
            <ProtectedRoute requiredRole="student">
              <ResumeAnalyzerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cover-letters"
          element={
            <ProtectedRoute requiredRole="student">
              <CoverLetterHistoryPage />
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
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              {" "}
              <NotificationsPage />
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
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Tutor Analytics */}
        <Route
          path="/tutor/analytics"
          element={
            <ProtectedRoute requiredRole="tutor">
              <TutorAnalyticsDashboard />
            </ProtectedRoute>
          }
        />

        {/* Tutor Roadmap Lobby */}
        <Route
          path="/tutor/roadmaps"
          element={
            <ProtectedRoute requiredRole="tutor">
              <TutorRoadmapLobby />
            </ProtectedRoute>
          }
        />

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

        {/* Tutor Interview Console */}
        <Route
          path="/tutor/interviews"
          element={
            <ProtectedRoute requiredRole="tutor">
              <TutorInterviewsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tutor/interviews/:id"
          element={
            <ProtectedRoute requiredRole="tutor">
              <TutorInterviewConsole />
            </ProtectedRoute>
          }
        />
      </Routes>
      </Suspense>
      {token && <ChatWidget />}
    </div>
  );
}

export default App;
