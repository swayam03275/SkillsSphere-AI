// @ts-nocheck

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "../ErrorBoundary";
import { reportError } from "../../utils/errorReporter";

vi.mock("../../utils/errorReporter", () => ({
  reportError: vi.fn(),
}));

const ProblemChild = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error("Exploded token=secret");
  }

  return <div>Recovered content</div>;
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a user-friendly fallback when a child throws", async () => {
    reportError.mockResolvedValue({ success: true });

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(reportError).toHaveBeenCalledTimes(1);
    });
  });

  it("resets error state and re-renders children when retry succeeds", async () => {
    const user = userEvent.setup();
    reportError.mockResolvedValue({ success: true });

    const { rerender } = render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText(/recovered content/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the fallback stable when error reporting fails", async () => {
    reportError.mockRejectedValue(new Error("Reporter unavailable"));

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(reportError).toHaveBeenCalledTimes(1);
    });
  });
});
