import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import InterviewSession from "./InterviewSession";
import { apiRequest } from "../../../services/apiClient";
import { submitAnswer } from "../services/interviewService";

const navigate = vi.fn();
const socket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  close: vi.fn(),
  connect: vi.fn(),
  connected: true,
  disconnected: false,
  io: {
    on: vi.fn(),
    off: vi.fn(),
  },
};
let socketHandlers = {};
let managerHandlers = {};
let trackEndedHandler;
let trackRemoveHandler;

vi.mock("../../../modules/landing/components/Navbar", () => ({
  default: () => <nav data-testid="navbar" />,
}));

vi.mock("../components/InterviewSessionSkeleton", () => ({
  default: () => <div data-testid="session-skeleton" />,
}));

vi.mock("../components/ObserverPanel", () => ({
  default: () => <aside data-testid="observer-panel" />,
}));

vi.mock("../components/RealtimeSentimentIndicator", () => ({
  default: () => null,
}));

vi.mock("../../../hooks/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock("../../../utils/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("../../../services/apiClient", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("../services/interviewService", () => ({
  submitAnswer: vi.fn(),
  completeInterview: vi.fn(),
}));

vi.mock("react-redux", async () => {
  const actual = await vi.importActual("react-redux");
  return {
    ...actual,
    useSelector: (selector) =>
      selector({
        auth: {
          user: { _id: "user-1", name: "Asha" },
        },
      }),
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "session-1" }),
    useNavigate: () => navigate,
  };
});

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => socket),
}));

const sessionPayload = {
  data: {
    _id: "session-1",
    userId: "user-1",
    topic: "react",
    difficulty: "medium",
    totalQuestions: 2,
    answers: [
      {
        questionId: "q1",
        questionText: "What is React?",
        transcript: "",
      },
      {
        questionId: "q2",
        questionText: "What is state?",
        transcript: "",
      },
    ],
  },
};

const renderSession = async (questionText = "What is React?") => {
  const result = render(<InterviewSession />);
  await screen.findByText(questionText);
  return result;
};

class MockMediaRecorder {
  constructor(stream) {
    this.stream = stream;
    this.state = "inactive";
    this.start = vi.fn(() => {
      this.state = "recording";
    });
    this.stop = vi.fn(() => {
      this.state = "inactive";
      this.onstop?.();
    });
  }
}

describe("InterviewSession recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("skillssphere.auth.token", "token-1");
    apiRequest.mockResolvedValue(sessionPayload);
    submitAnswer.mockResolvedValue({
      data: {
        scores: { technical: 80, communication: 75, relevance: 70 },
        isLastQuestion: false,
        nextQuestion: {
          index: 1,
          questionId: "q2",
          questionText: "What is state?",
        },
      },
    });
    socketHandlers = {};
    managerHandlers = {};
    socket.on.mockImplementation((event, handler) => {
      socketHandlers[event] = handler;
    });
    socket.off.mockImplementation(() => {});
    socket.io.on.mockImplementation((event, handler) => {
      managerHandlers[event] = handler;
    });
    socket.io.off.mockImplementation(() => {});
    socket.emit.mockImplementation(() => {});
    socket.close.mockImplementation(() => {});
    socket.connected = true;
    socket.disconnected = false;
    global.MediaRecorder = MockMediaRecorder;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows disconnect and reconnect recovery messages", async () => {
    await renderSession();

    act(() => socketHandlers.connect());
    act(() => socketHandlers.disconnect());

    expect(screen.getByText(/connection lost/i)).toBeInTheDocument();

    act(() => socketHandlers.connect());

    expect(screen.getByText(/reconnected and resynced/i)).toBeInTheDocument();
    expect(socket.emit).toHaveBeenCalledWith("join-interview", {
      sessionId: "session-1",
    });
  });

  it("restores saved backup state from localStorage", async () => {
    localStorage.setItem(
      "skillssphere.mockInterview.backup",
      JSON.stringify({
        sessionId: "session-1",
        currentIndex: 1,
        answer: "State is component memory.",
        elapsedTime: 42,
        uploadStatus: "queued",
      }),
    );

    await renderSession("What is state?");

    expect(screen.getByDisplayValue("State is component memory.")).toBeInTheDocument();
    expect(screen.getByText("Question 2")).toBeInTheDocument();
    expect(screen.getByText("00:42")).toBeInTheDocument();
    expect(screen.getByText(/audio status/i)).toHaveTextContent("queued");
  });

  it("handles corrupted backup data safely", async () => {
    localStorage.setItem("skillssphere.mockInterview.backup", "{not-json");

    await renderSession();

    expect(screen.getByText("What is React?")).toBeInTheDocument();
    expect(localStorage.getItem("skillssphere.mockInterview.backup")).toBeTruthy();
  });

  it("retries recoverable answer submission failures", async () => {
    submitAnswer
      .mockRejectedValueOnce(Object.assign(new Error("Network error"), { status: 0 }))
      .mockResolvedValueOnce({
        data: {
          scores: { technical: 90, communication: 80, relevance: 85 },
          isLastQuestion: false,
          nextQuestion: {
            index: 1,
            questionId: "q2",
            questionText: "What is state?",
          },
        },
      });

    await renderSession();
    vi.useFakeTimers();
    socket.connected = false;

    fireEvent.change(screen.getByPlaceholderText(/type your answer/i), {
      target: { value: "React is a UI library." },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(/retrying answer submission/i)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(submitAnswer).toHaveBeenCalledTimes(2);
  });

  it("keeps interview state intact when microphone access fails", async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValue(new Error("denied"));
    await renderSession();

    fireEvent.change(screen.getByPlaceholderText(/type your answer/i), {
      target: { value: "My saved answer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /record/i }));

    expect(await screen.findByText(/microphone access was denied/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("My saved answer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("warns when the audio track ends and cleans up media listeners", async () => {
    const stop = vi.fn();
    const removeEventListener = vi.fn((event, handler) => {
      trackRemoveHandler = handler;
    });
    const track = {
      stop,
      addEventListener: vi.fn((event, handler) => {
        trackEndedHandler = handler;
      }),
      removeEventListener,
    };
    navigator.mediaDevices.getUserMedia.mockResolvedValue({
      getTracks: () => [track],
    });

    const { unmount } = await renderSession();

    fireEvent.click(screen.getByRole("button", { name: /record/i }));

    await waitFor(() => {
      expect(track.addEventListener).toHaveBeenCalledWith(
        "ended",
        expect.any(Function),
      );
    });

    act(() => trackEndedHandler());

    expect(screen.getByText(/audio input was disconnected/i)).toBeInTheDocument();

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith("ended", trackRemoveHandler);
    expect(socket.off).toHaveBeenCalledWith("live-transcript", expect.any(Function));
  });

  it("removes socket listeners on unmount", async () => {
    const { unmount } = await renderSession();

    unmount();

    expect(socket.off).toHaveBeenCalledWith("connect", expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith("disconnect", expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith("answer-evaluated", expect.any(Function));
    expect(socket.io.off).toHaveBeenCalledWith(
      "reconnect_attempt",
      expect.any(Function),
    );
    expect(socket.close).toHaveBeenCalled();
  });
});
