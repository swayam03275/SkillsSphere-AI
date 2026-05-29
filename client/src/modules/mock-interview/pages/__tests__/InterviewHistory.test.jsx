import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import InterviewHistory, { convertToCSV } from "../InterviewHistory";
import { getHistory } from "../../services/interviewService";

vi.mock("../../services/interviewService", () => ({
  getHistory: vi.fn(),
}));

vi.mock("../../../../shared/landing/Navbar", () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}));

const mockSessions = [
  {
    _id: "session-1",
    title: "React, Hooks Interview",
    type: "technical",
    topic: "react",
    category: "frontend",
    difficulty: "medium",
    completedAt: "2026-05-01T10:30:00.000Z",
    createdAt: "2026-05-01T10:00:00.000Z",
    overallScore: 84,
    scores: {
      technical: 88,
      communication: 76,
      problemSolving: 91,
    },
    feedbackSummary: "Strong examples, clear tradeoffs.",
    strengths: ["Hooks", "State management"],
    improvementAreas: ["Testing edge cases"],
    duration: 1260,
    totalQuestions: 5,
  },
];

const renderHistory = () =>
  render(
    <MemoryRouter>
      <InterviewHistory />
    </MemoryRouter>,
  );

describe("InterviewHistory export", () => {
  let lastBlob;
  let OriginalBlob;
  let clickSpy;
  let appendSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    lastBlob = null;
    OriginalBlob = global.Blob;
    global.Blob = vi.fn(function Blob(parts, options) {
      this.parts = parts;
      this.type = options?.type;
    });
    URL.createObjectURL = vi.fn((blob) => {
      lastBlob = blob;
      return "blob:interview-history";
    });
    URL.revokeObjectURL = vi.fn();
    appendSpy = vi.spyOn(document.body, "appendChild");
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
    appendSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    global.Blob = OriginalBlob;
  });

  it("renders export buttons only when history data exists", async () => {
    getHistory.mockResolvedValueOnce({
      data: { sessions: [], pagination: { page: 1, pages: 1, total: 0 } },
    });

    renderHistory();

    await screen.findByText("No interviews yet. Start your first one!");
    expect(screen.queryByRole("button", { name: /export interview history as csv/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /export interview history as json/i })).not.toBeInTheDocument();

    getHistory.mockResolvedValueOnce({
      data: { sessions: mockSessions, pagination: { page: 1, pages: 1, total: 1 } },
    });

    renderHistory();

    expect(await screen.findByRole("button", { name: /export interview history as csv/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export interview history as json/i })).toBeInTheDocument();
  });

  it("exports CSV with the expected filename and performance metrics", async () => {
    getHistory.mockResolvedValueOnce({
      data: { sessions: mockSessions, pagination: { page: 1, pages: 1, total: 1 } },
    });

    renderHistory();
    const csvButton = await screen.findByRole("button", { name: /export interview history as csv/i });
    await act(async () => {
      await userEvent.click(csvButton);
    });

    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    const csv = lastBlob.parts.join("");
    const downloadedLink = appendSpy.mock.calls.find(([node]) => node.download === "interview-history.csv")?.[0];

    expect(downloadedLink).toBeTruthy();
    expect(csv).toContain("Interview Title,Interview Type,Date Completed,Overall Score,Technical Score");
    expect(csv).toContain('"React, Hooks Interview"');
    expect(csv).toContain("84,88,76,91");
    expect(csv).toContain("Strong examples");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:interview-history");
  });

  it("exports JSON with metadata and interview entries", async () => {
    getHistory.mockResolvedValueOnce({
      data: { sessions: mockSessions, pagination: { page: 1, pages: 1, total: 1 } },
    });

    renderHistory();
    const jsonButton = await screen.findByRole("button", { name: /export interview history as json/i });
    await act(async () => {
      await userEvent.click(jsonButton);
    });

    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    const payload = JSON.parse(lastBlob.parts.join(""));
    const downloadedLink = appendSpy.mock.calls.find(([node]) => node.download === "interview-history.json")?.[0];

    expect(downloadedLink).toBeTruthy();
    expect(payload.metadata.totalInterviews).toBe(1);
    expect(payload.metadata.exportDate).toEqual(expect.any(String));
    expect(payload.interviews[0]).toMatchObject({
      title: "React, Hooks Interview",
      type: "technical",
      overallScore: 84,
      technicalScore: 88,
      communicationScore: 76,
      problemSolvingScore: 91,
    });
  });

  it("disables export actions while exporting and prevents duplicate clicks", async () => {
    let resolveExport;
    const pendingExport = new Promise((resolve) => {
      resolveExport = resolve;
    });

    getHistory
      .mockResolvedValueOnce({
        data: { sessions: mockSessions, pagination: { page: 1, pages: 2, total: 2 } },
      })
      .mockReturnValueOnce(pendingExport);

    renderHistory();
    const csvButton = await screen.findByRole("button", { name: /export interview history as csv/i });
    const jsonButton = screen.getByRole("button", { name: /export interview history as json/i });

    fireEvent.click(csvButton);
    fireEvent.click(csvButton);
    fireEvent.click(jsonButton);

    await waitFor(() => {
      expect(csvButton).toBeDisabled();
      expect(jsonButton).toBeDisabled();
      expect(csvButton).toHaveTextContent("Exporting...");
    });
    expect(getHistory).toHaveBeenCalledTimes(2);

    resolveExport({
      data: { sessions: mockSessions, pagination: { page: 1, pages: 1, total: 1 } },
    });

    await waitFor(() => expect(csvButton).not.toBeDisabled());
  });

  it("shows a friendly export error message when download fails", async () => {
    getHistory.mockResolvedValueOnce({
      data: { sessions: mockSessions, pagination: { page: 1, pages: 1, total: 1 } },
    });
    URL.createObjectURL.mockImplementationOnce(() => {
      throw new Error("Download blocked");
    });

    renderHistory();
    const csvButton = await screen.findByRole("button", { name: /export interview history as csv/i });
    await act(async () => {
      await userEvent.click(csvButton);
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Export failed. Please try again.");
  });

  it("escapes CSV commas, quotes, and newlines correctly", () => {
    const csv = convertToCSV([
      {
        title: 'Backend "API", Interview',
        feedbackSummary: "Clear answer\nNeeds more depth",
        scores: { technical: 70, communication: 65, relevance: 80 },
      },
    ]);

    expect(csv).toContain('"Backend ""API"", Interview"');
    expect(csv).toContain('"Clear answer\nNeeds more depth"');
    expect(csv).toContain("70,65,80");
  });
});
