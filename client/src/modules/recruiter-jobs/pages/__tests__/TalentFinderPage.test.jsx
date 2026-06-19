import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import TalentFinderPage from "../TalentFinderPage";
import { ToastProvider } from "../../../../shared/components/toast/ToastProvider";
import { getRecruiterJobs } from "../../services/jobPostingService";
import {
  inviteCandidate,
  matchCandidate,
  searchTalent,
} from "../../services/talentFinderService";

vi.mock("../../services/jobPostingService", () => ({
  getRecruiterJobs: vi.fn(),
}));

vi.mock("../../services/talentFinderService", () => ({
  inviteCandidate: vi.fn(),
  matchCandidate: vi.fn(),
  searchTalent: vi.fn(),
}));

vi.mock("../../../../shared/components/Navbar", () => ({
  default: () => <nav data-testid="navbar" />,
}));

vi.mock("../../../../shared/components/Footer", () => ({
  default: () => <footer data-testid="footer" />,
}));

vi.mock("../../../../hooks/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));

const candidate = {
  _id: "candidate-1",
  name: "Asha Patel",
  email: "asha@example.com",
  skills: ["React"],
};

const openJob = {
  _id: "job-1",
  title: "Frontend Engineer",
  company: "SkillSphere",
  status: "open",
};

const renderPage = () => {
  const store = configureStore({
    reducer: {
      auth: () => ({
        token: "test-token",
        user: { _id: "recruiter-1", role: "recruiter" },
      }),
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ToastProvider>
          <TalentFinderPage />
        </ToastProvider>
      </MemoryRouter>
    </Provider>,
  );
};

const waitForCandidate = async () => {
  expect(await screen.findByText("Asha Patel")).toBeInTheDocument();
};

describe("TalentFinderPage toast feedback", () => {
  beforeEach(() => {
    getRecruiterJobs.mockResolvedValue({ jobs: [openJob] });
    searchTalent.mockResolvedValue({
      candidates: [candidate],
      pagination: { pages: 1, total: 1 },
    });
  });

  it("shows a success toast after completing a candidate match", async () => {
    matchCandidate.mockResolvedValue({
      matchResult: {
        aiMatchScore: 88,
        matchCategory: "Excellent Match",
      },
    });

    renderPage();
    await waitForCandidate();
    fireEvent.click(screen.getByRole("button", { name: /match candidate/i }));

    expect(await screen.findByText("Candidate match analysis completed.")).toBeInTheDocument();
    expect(matchCandidate).toHaveBeenCalledWith("candidate-1", "job-1", "test-token");
  });

  it("shows an error toast when candidate matching fails", async () => {
    matchCandidate.mockRejectedValue(new Error("Match service is unavailable."));

    renderPage();
    await waitForCandidate();
    fireEvent.click(screen.getByRole("button", { name: /match candidate/i }));

    expect(await screen.findByText("Match service is unavailable.")).toBeInTheDocument();
  });

  it("shows a success toast after sending an invitation", async () => {
    inviteCandidate.mockResolvedValue({ message: "Invitation sent to Asha." });

    renderPage();
    await waitForCandidate();
    fireEvent.click(screen.getByRole("button", { name: /^invite$/i }));

    expect(await screen.findByText("Invitation sent to Asha.")).toBeInTheDocument();
    expect(inviteCandidate).toHaveBeenCalledWith("candidate-1", "job-1", "test-token");
  });

  it("shows warning toasts when actions require an active job", async () => {
    getRecruiterJobs.mockResolvedValue({ jobs: [] });

    renderPage();
    await waitForCandidate();

    fireEvent.click(screen.getByRole("button", { name: /match candidate/i }));
    expect(
      await screen.findByText("Please select a target job before matching this candidate."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^invite$/i }));
    expect(
      await screen.findByText("Please select an active job before inviting this candidate."),
    ).toBeInTheDocument();

    expect(matchCandidate).not.toHaveBeenCalled();
    expect(inviteCandidate).not.toHaveBeenCalled();
  });

  it("shows an error toast when sending an invitation fails", async () => {
    inviteCandidate.mockRejectedValue(new Error("Invitation could not be delivered."));

    renderPage();
    await waitForCandidate();
    fireEvent.click(screen.getByRole("button", { name: /^invite$/i }));

    expect(await screen.findByText("Invitation could not be delivered.")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^invite$/i })).toBeEnabled();
    });
  });

  it("explains that privacy preferences can hide candidates from empty results", async () => {
    searchTalent.mockResolvedValue({
      candidates: [],
      pagination: { pages: 0, total: 0 },
    });

    renderPage();

    expect(await screen.findByText("No Candidates Found")).toBeInTheDocument();
    expect(
      screen.getByText(/private profiles and resumes not shared with recruiters are hidden/i),
    ).toBeInTheDocument();
  });
});
