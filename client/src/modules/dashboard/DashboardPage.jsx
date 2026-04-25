import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { logout } from "../../features/auth/authSlice";
import Button from "../../shared/components/Button";
import Navbar from "../../shared/landing/Navbar";
import StudentDashboardView from "./components/StudentDashboardView";
import TutorDashboardView from "./components/TutorDashboardView";

const DashboardPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  const isTutorOrRecruiter = user?.role === 'tutor' || user?.role === 'recruiter';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] p-3 sm:p-5 pt-20 sm:pt-28 text-slate-100">
      <Navbar />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6 py-6 sm:py-8 px-0 sm:px-2">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
          <div>
            <p className="text-xs sm:text-sm font-medium text-blue-400">Dashboard</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold break-words">
              Welcome back, {user?.name || "Learner"}!
            </h1>
          </div>

          <Button
            variant="outline"
            size="md"
            onClick={handleLogout}
            leftIcon={<LogOut size={16} />}
            className="border-slate-600 bg-slate-900/70 text-slate-100 hover:bg-slate-800 w-full sm:w-auto mt-3 sm:mt-0"
          >
            Logout
          </Button>
        </div>

        {isTutorOrRecruiter ? (
          <TutorDashboardView user={user} />
        ) : (
          <StudentDashboardView user={user} />
        )}
      </div>
    </main>
  );
};

export default DashboardPage;
