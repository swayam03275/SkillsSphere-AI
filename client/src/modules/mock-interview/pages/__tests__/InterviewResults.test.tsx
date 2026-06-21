
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import InterviewResults from "../InterviewResults";
import { getResults, toggleQuestionBookmark } from "../../services/interviewService";

const navigate = vi.fn();

vi.mock("../../services/interviewService", () => ({
  getResults: vi.fn(),
  toggleQuestionBookmark: vi.fn(),
}));

vi.mock("../../../../shared/components/Navbar", () => ({
  default: () => <nav data-testid="navbar" />,
}));

vi.mock("../../../../shared/components/Footer", () => ({
  default: () => <footer data-testid="footer" />,
}));

vi.mock("../../components/InterviewResultsSkeleton", () => ({
  default: () => <div data-testid="results-skeleton" />,
}));

vi.mock("../../../../hooks/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock("../../../../utils/logger", () => ({
  default: { error: vi.fn() },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "session-1" }),
    useNavigate: () => navigate,
  };
});

vi.mock("recharts", () => ({
  Radar: () => null,
  RadarChart: ({ children }) => <div>{children}</div>,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

const resultsPayload = {
  data: {
    topic: "react",
    difficulty: "medium",
    status: "completed",
    overallScore: 82,
    weakConcepts: [],
    duration: 1200,
    totalQuestions: 1,
    answers: [
      {
        questionId: "q1",
        questionText: "What are React hooks?",
        transcript: "Hooks let function components use state.",
        scores: { technical: 82, communication: 78, relevance: 80 },
        concepts: { detected: ["hooks"], missed: [] },
        bookmarked: true,
      },
    ],
  },
};

const renderResults = async () => {
  render(
    <MemoryRouter>
      <InterviewResults />
    </MemoryRouter>,
  );
  await screen.findByText(/what are react hooks/i);
};

describe("InterviewResults bookmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error TODO: Fix pervasive types
    getResults.mockResolvedValue(resultsPayload);
    // @ts-expect-error TODO: Fix pervasive types
    toggleQuestionBookmark.mockResolvedValue({
      data: { questionId: "q1", bookmarked: false },
    });
  });

  it("shows bookmarked status and allows removing the bookmark", async () => {
    await renderResults();

    expect(screen.getByText("Bookmarked")).toBeInTheDocument();

    fireEvent.click(screen.getByText(/what are react hooks/i));

    const removeButton = screen.getByRole("button", { name: /remove bookmark/i });
    await act(async () => {
      fireEvent.click(removeButton);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(toggleQuestionBookmark).toHaveBeenCalledWith("session-1", "q1", false);
    });
    expect(screen.getByRole("button", { name: /bookmark question/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.queryByText("Bookmarked")).not.toBeInTheDocument();
  });
});
