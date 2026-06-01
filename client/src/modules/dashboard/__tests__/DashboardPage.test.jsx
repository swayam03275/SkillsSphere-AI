import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "../DashboardPage";
import {
  getAnalysisHistory,
  getRoleAnalytics,
  getSkillTrends,
} from "../services/dashboardService";
import { getRecruiterJobs } from "../../recruiter-jobs/services/jobPostingService";
import Footer from "../../../shared/components/Footer";


vi.mock("../services/dashboardService", () => ({
  getAnalysisHistory: vi.fn(),
  getSkillTrends: vi.fn(),
  getRoleAnalytics: vi.fn(),
}));

vi.mock("../../roadmap/services/roadmapService", () => ({
  getMyRoadmap: vi.fn(),
}));

vi.mock("../../recruiter-jobs/services/jobPostingService", () => ({
  getRecruiterJobs: vi.fn(),
}));

vi.mock("../../../shared/components/Navbar", () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock("../../../shared/components/Button", () => ({
  default: ({ children, onClick }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("../components/DashboardSkeleton", () => ({
  default: () => <div data-testid="dashboard-skeleton">Loading</div>,
}));

vi.mock("../components/StatCard", () => ({
  default: ({ label, value }) => (
    <article data-testid="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  ),
}));

vi.mock("../components/PerformanceTrend", () => ({
  default: () => <div data-testid="performance-trend" />,
}));

vi.mock("../components/SuggestionItem", () => ({
  default: ({ suggestion }) => <div>{suggestion}</div>,
}));

vi.mock("../components/VersionComparisonModal", () => ({
  default: () => null,
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  AreaChart: ({ children }) => <div>{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: ({ children }) => <div>{children}      <Footer />
    </div>,
  Cell: () => null,
}));

const createStore = (authState) =>
  configureStore({
    reducer: {
      auth: () => authState,
    },
  });

const renderDashboard = (authState) =>
  render(
    <Provider store={createStore(authState)}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </Provider>,
  );

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and renders role analytics for tutor users", async () => {
    getRoleAnalytics.mockResolvedValue({
      success: true,
      data: {
        role: "tutor",
        activeStudents: 12,
        averagePlatformScore: 84,
        totalMockInterviewsCompleted: 31,
      },
    });

    renderDashboard({
      token: "tutor-token",
      user: {
        _id: "tutor-1",
        name: "Tina Tutor",
        email: "tina@example.com",
        role: "tutor",
      },
    });

    await waitFor(() => {
      expect(getRoleAnalytics).toHaveBeenCalledWith("tutor-token");
    });

    expect(screen.getByText("Active Students")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Platform Avg Score")).toBeInTheDocument();
    expect(screen.getByText("84%")).toBeInTheDocument();
    expect(screen.getByText("Total Interviews")).toBeInTheDocument();
    expect(screen.getByText("31")).toBeInTheDocument();
    expect(getAnalysisHistory).not.toHaveBeenCalled();
    expect(getSkillTrends).not.toHaveBeenCalled();
    expect(getRecruiterJobs).not.toHaveBeenCalled();
  });
});
