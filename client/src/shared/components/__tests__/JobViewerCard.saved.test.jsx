import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import JobViewerCard from "../JobViewerCard";

const job = {
  _id: "job-1",
  title: "Frontend Engineer",
  status: "open",
  skills: ["React"],
};

describe("JobViewerCard saved state", () => {
  it("renders a bookmark control and forwards the selected job", () => {
    const onToggleSave = vi.fn();
    render(
      <JobViewerCard
        job={job}
        viewerRole="student"
        isSaved={false}
        onToggleSave={onToggleSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save job" }));

    expect(onToggleSave).toHaveBeenCalledWith(job);
  });

  it("shows the persisted saved state", () => {
    render(
      <JobViewerCard
        job={job}
        viewerRole="student"
        isSaved
        onToggleSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Remove from saved jobs" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("renders recommendation match score and explanation", () => {
    render(
      <JobViewerCard
        job={{
          ...job,
          matchScore: 87.6,
          relevanceInsights: "Strong alignment with your React experience.",
        }}
        viewerRole="student"
      />,
    );

    expect(screen.getByText("88% match")).toBeInTheDocument();
    expect(screen.getByText("Strong alignment with your React experience.")).toBeInTheDocument();
  });
});
