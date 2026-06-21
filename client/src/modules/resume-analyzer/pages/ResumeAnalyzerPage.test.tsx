
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import ResumeAnalyzerPage from "./ResumeAnalyzerPage";
import {
  analyzeResume,
  getLatestResumeAnalysis,
  getResumeList,
} from "../services/resumeService";

const toast = {
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
};

vi.mock("../../../shared/components", () => ({
  useToast: () => toast,
  PageHeader: ({ title, subtitle }) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  ),
  ErrorState: ({ description, onRetry }) => (
    <div role="alert">
      <p>{description}</p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  ),
}));

vi.mock("../../../shared/components/Navbar", () => ({
  default: () => <nav data-testid="navbar" />,
}));

vi.mock("../../../shared/components/Button", () => ({
  default: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

vi.mock("../components/AnalysisResult", () => ({
  default: ({ result }) => <section>Score {result.score}</section>,
}));

vi.mock("../components/JobDescriptionInput", () => ({
  default: () => <div data-testid="job-description-input" />,
}));

vi.mock("../components/ResumeSkeleton", () => ({
  default: () => <div data-testid="resume-skeleton" />,
}));

vi.mock("../../../shared/components/ConfirmDialog", () => ({
  default: () => null,
}));

vi.mock("../../../hooks/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock("../../roadmap/services/roadmapService", () => ({
  syncRoadmap: vi.fn(),
}));

vi.mock("../services/resumeService", () => ({
  analyzeResume: vi.fn(),
  getLatestResumeAnalysis: vi.fn(),
  getResumeList: vi.fn(),
  setActiveResume: vi.fn(),
  renameResume: vi.fn(),
  deleteResume: vi.fn(),
}));

const uploadFile = (name, type, size = 1024) =>
  new File([new Uint8Array(size)], name, { type });

const renderPage = async () => {
  render(
    <MemoryRouter>
      <ResumeAnalyzerPage />
    </MemoryRouter>,
  );

  await screen.findByText(/upload resume/i);
};

describe("ResumeAnalyzerPage upload flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error TODO: Fix pervasive types
    getLatestResumeAnalysis.mockResolvedValue(null);
    // @ts-expect-error TODO: Fix pervasive types
    getResumeList.mockResolvedValue([]);
    // @ts-expect-error TODO: Fix pervasive types
    analyzeResume.mockResolvedValue({
      success: true,
      score: 88,
      gapAnalysis: { suggestions: [] },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uploads and analyzes a valid PDF", async () => {
    const user = userEvent.setup();
    const file = uploadFile("resume.pdf", "application/pdf");
    await renderPage();

    await user.upload(screen.getByLabelText(/browse resume file/i), file);
    await user.click(screen.getByRole("button", { name: /analyze resume/i }));

    await waitFor(() => {
      expect(analyzeResume).toHaveBeenCalledWith(file, "");
    });
    expect(await screen.findByText(/score 88/i)).toBeInTheDocument();
  });

  it("uploads and analyzes a valid DOCX", async () => {
    const user = userEvent.setup();
    const file = uploadFile(
      "resume.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    await renderPage();

    await user.upload(screen.getByLabelText(/browse resume file/i), file);
    await user.click(screen.getByRole("button", { name: /analyze resume/i }));

    await waitFor(() => {
      expect(analyzeResume).toHaveBeenCalledWith(file, "");
    });
  });

  it("shows upload progress and prevents duplicate submissions", async () => {
    let resolveUpload;
    // @ts-expect-error TODO: Fix pervasive types
    analyzeResume.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    const user = userEvent.setup();
    await renderPage();

    await user.upload(
      screen.getByLabelText(/browse resume file/i),
      uploadFile("resume.pdf", "application/pdf"),
    );
    const analyzeButton = screen.getByRole("button", { name: /analyze resume/i });
    await user.click(analyzeButton);
    fireEvent.click(analyzeButton);

    expect(screen.getByRole("progressbar", { name: /resume upload progress/i })).toBeInTheDocument();
    expect(analyzeResume).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpload({ success: true, score: 91, gapAnalysis: { suggestions: [] } });
    });
  });

  it("shows a friendly corrupted-file parsing error without retry", async () => {
    // @ts-expect-error TODO: Fix pervasive types
    analyzeResume.mockRejectedValue(
      Object.assign(new Error("parser could not read corrupt pdf"), { status: 400 }),
    );
    const user = userEvent.setup();
    await renderPage();

    await user.upload(
      screen.getByLabelText(/browse resume file/i),
      uploadFile("resume.pdf", "application/pdf"),
    );
    await screen.findByText(/resume.pdf ready for analysis/i);
    await user.click(screen.getByRole("button", { name: /analyze resume/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not read this resume/i);
    expect(screen.queryByText(/your selected file is still ready/i)).not.toBeInTheDocument();
  });

  it("keeps the selected file and shows retry after recoverable upload failure", async () => {
    // @ts-expect-error TODO: Fix pervasive types
    analyzeResume.mockRejectedValue(
      Object.assign(new Error("Network error"), { status: 0 }),
    );
    const user = userEvent.setup();
    await renderPage();

    await user.upload(
      screen.getByLabelText(/browse resume file/i),
      uploadFile("resume.pdf", "application/pdf"),
    );
    await screen.findByText(/resume.pdf ready for analysis/i);
    await user.click(screen.getByRole("button", { name: /analyze resume/i }));

    expect(
      await screen.findByText(/selected file is still ready/i, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^retry$/i })).toBeInTheDocument();
  }, 7000);
});
