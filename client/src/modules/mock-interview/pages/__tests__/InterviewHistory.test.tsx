
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import InterviewHistory, { calculateInterviewAnalytics, convertToCSV, filterInterviewSessions } from "../InterviewHistory";
import { getHistory } from "../../services/interviewService";

vi.mock("../../services/interviewService", () => ({
  getHistory: vi.fn(),
}));

vi.mock("../../../../shared/components/Navbar", () => ({
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
    // @ts-expect-error TODO: Fix pervasive types
    global.Blob = vi.fn(function Blob(parts, options) {
      // @ts-expect-error TODO: Fix pervasive types
      this.parts = parts;
      // @ts-expect-error TODO: Fix pervasive types
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
    // @ts-expect-error TODO: Fix pervasive types
    getHistory.mockResolvedValueOnce({
      data: { sessions: [], pagination: { page: 1, pages: 1, total: 0 } },
    });

    renderHistory();

    await screen.findByText("No interviews yet.");
    expect(screen.queryByRole("button", { name: /export interview history as csv/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /export interview history as json/i })).not.toBeInTheDocument();

    // @ts-expect-error TODO: Fix pervasive types
    getHistory.mockResolvedValueOnce({
      data: { sessions: mockSessions, pagination: { page: 1, pages: 1, total: 1 } },
    });

    renderHistory();

    expect(await screen.findByRole("button", { name: /export interview history as csv/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export interview history as json/i })).toBeInTheDocument();
  });

  it("exports CSV with the expected filename and performance metrics", async () => {
    // @ts-expect-error TODO: Fix pervasive types
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
    // @ts-expect-error TODO: Fix pervasive types
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
      // @ts-expect-error TODO: Fix pervasive types
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
    // @ts-expect-error TODO: Fix pervasive types
    getHistory.mockResolvedValueOnce({
      data: { sessions: mockSessions, pagination: { page: 1, pages: 1, total: 1 } },
    });
    // @ts-expect-error TODO: Fix pervasive types
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

describe("InterviewHistory filtering", () => {
  const filterSessions = [
    {
      _id: "session-1",
      title: "React Hooks Interview",
      topic: "frontend",
      difficulty: "medium",
      status: "completed",
      createdAt: "2026-05-01T10:00:00.000Z",
      overallScore: 84,
      totalQuestions: 5,
    },
    {
      _id: "session-2",
      title: "Node API Practice",
      topic: "backend",
      difficulty: "hard",
      status: "failed",
      createdAt: "2026-05-02T10:00:00.000Z",
      overallScore: 42,
      totalQuestions: 4,
    },
    {
      _id: "session-3",
      title: "System Design Screen",
      topic: "architecture",
      difficulty: "easy",
      status: "in_progress",
      createdAt: "2026-05-03T10:00:00.000Z",
      overallScore: 68,
      totalQuestions: 6,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error TODO: Fix pervasive types
    getHistory.mockResolvedValue({
      data: { sessions: filterSessions, pagination: { page: 1, pages: 1, total: 3 } },
    });
  });

  it("filters interview records by title or topic search", async () => {
    renderHistory();

    expect(await screen.findByText("React Hooks Interview")).toBeInTheDocument();

    await act(async () => {
      await userEvent.type(screen.getByLabelText(/search/i), "backend");
    });

    expect(screen.getByText("Node API Practice")).toBeInTheDocument();
    expect(screen.queryByText("React Hooks Interview")).not.toBeInTheDocument();
    expect(screen.queryByText("System Design Screen")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 3 interviews")).toBeInTheDocument();
  });

  it("filters by difficulty, status, and score range together", async () => {
    renderHistory();

    await screen.findByText("React Hooks Interview");
    await act(async () => {
      await userEvent.selectOptions(screen.getByLabelText(/difficulty/i), "hard");
      await userEvent.selectOptions(screen.getByLabelText(/status/i), "failed");
      await userEvent.type(screen.getByLabelText(/min score/i), "40");
      await userEvent.type(screen.getByLabelText(/max score/i), "50");
    });

    expect(screen.getByText("Node API Practice")).toBeInTheDocument();
    expect(screen.queryByText("React Hooks Interview")).not.toBeInTheDocument();
    expect(screen.queryByText("System Design Screen")).not.toBeInTheDocument();
  });

  it("shows an empty filtered state and can reset filters", async () => {
    renderHistory();

    await screen.findByText("React Hooks Interview");
    await act(async () => {
      await userEvent.type(screen.getByLabelText(/search/i), "python");
    });

    expect(screen.getByText("No matching interviews found.")).toBeInTheDocument();
    expect(screen.queryByText("React Hooks Interview")).not.toBeInTheDocument();

    await act(async () => {
      await userEvent.click(screen.getAllByRole("button", { name: /reset filters/i })[0]);
    });

    expect(screen.getByText("React Hooks Interview")).toBeInTheDocument();
    expect(screen.getByText("Node API Practice")).toBeInTheDocument();
    expect(screen.getByText("System Design Screen")).toBeInTheDocument();
  });

  it("exposes pure filtering behavior for status normalization and scores", () => {
    const results = filterInterviewSessions(filterSessions, {
      search: "design",
      difficulty: "easy",
      status: "in-progress",
      minScore: "60",
      maxScore: "70",
    });

    expect(results).toHaveLength(1);
    expect(results[0]._id).toBe("session-3");
  });
});

describe("InterviewHistory analytics", () => {
  it("calculates average score, improvement trend, weak concepts, and weak topics", () => {
    const analytics = calculateInterviewAnalytics([
      {
        _id: "session-1",
        topic: "react",
        status: "completed",
        overallScore: 60,
        completedAt: "2026-05-01T10:00:00.000Z",
        weakConcepts: ["hooks", "state"],
      },
      {
        _id: "session-2",
        topic: "node",
        status: "completed",
        overallScore: 80,
        completedAt: "2026-05-03T10:00:00.000Z",
        weakConcepts: ["streams"],
      },
      {
        _id: "session-3",
        topic: "react",
        status: "completed",
        overallScore: 70,
        completedAt: "2026-05-02T10:00:00.000Z",
        weakConcepts: ["hooks"],
      },
      {
        _id: "session-4",
        topic: "dsa",
        status: "in_progress",
        overallScore: 100,
        createdAt: "2026-05-04T10:00:00.000Z",
        weakConcepts: ["graphs"],
      },
    ]);

    expect(analytics.averageScore).toBe(70);
    expect(analytics.completedCount).toBe(3);
    expect(analytics.trend.map((point) => point.score)).toEqual([60, 70, 80]);
    expect(analytics.trendDelta).toBe(20);
    expect(analytics.weakConcepts[0]).toEqual({ label: "hooks", count: 2 });
    expect(analytics.weakTopics).toEqual([{ label: "react", count: 1 }]);
  });

  it("normalizes backend analytics summaries for display", () => {
    const analytics = calculateInterviewAnalytics([], {
      averageScore: 78,
      completedCount: 4,
      improvementTrend: [
        { topic: "react", score: 72, date: "2026-05-01T10:00:00.000Z" },
        { topic: "node", score: 84, date: "2026-05-02T10:00:00.000Z" },
      ],
      weakConcepts: [{ concept: "closures", count: 3 }],
      weakTopics: [{ topic: "dsa", count: 2 }],
    });

    expect(analytics.averageScore).toBe(78);
    expect(analytics.completedCount).toBe(4);
    expect(analytics.trendDelta).toBe(12);
    expect(analytics.weakConcepts).toEqual([{ label: "closures", count: 3 }]);
    expect(analytics.weakTopics).toEqual([{ label: "dsa", count: 2 }]);
  });
});
