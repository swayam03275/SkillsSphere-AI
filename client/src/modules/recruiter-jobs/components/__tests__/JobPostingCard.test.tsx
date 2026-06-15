import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import JobPostingCard from "../JobPostingCard";

const mockJob = {
  _id: "job-1",
  title: "Senior Frontend Engineer With A Very Long Title That Should Wrap Cleanly On Mobile Screens",
  description:
    "Build responsive recruiter experiences with accessible, readable job posting cards across device sizes.",
  skills: ["React", "Tailwind CSS", "Accessibility"],
  requirements: ["Experience building responsive layouts that do not overflow small screens."],
  responsibilities: ["Maintain clean UI hierarchy for recruiter job cards."],
  keywords: ["remote", "frontend"],
  experienceRequired: 4,
  jobLevel: "Mid-Senior Level",
  status: "archived",
  location: {
    city: "A very long city name that should wrap",
    state: "Maharashtra",
    country: "India",
    remote: true,
  },
  salary: {
    min: 1200000,
    max: 2400000,
    currency: "INR",
    isNegotiable: false,
  },
  recruiter: {
    company: "SkillSphere Partner With A Long Company Name",
    companyWebsite: "https://example.com",
  },
  createdAt: new Date().toISOString(),
  type: "Full-time",
  openings: 2,
};

const renderCard = (props = {}) =>
  render(
    <JobPostingCard
      job={mockJob}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onViewStats={vi.fn()}
      onViewApplicants={vi.fn()}
      {...props}
    />,
  );

describe("JobPostingCard", () => {
  it("applies mobile-first responsive layout classes", () => {
    const { container } = renderCard();

    const card = container.querySelector("#job-card-job-1");
    const header = container.querySelector('[role="button"][aria-expanded="false"]');
    const headerLayout = header.querySelector(".flex.flex-col.gap-4");
    const title = screen.getByRole("heading", { name: mockJob.title });
    const metaStrip = container.querySelector(".mt-4.flex.min-w-0.flex-col");

    expect(card.className).toContain("w-full");
    expect(card.className).toContain("max-w-full");
    expect(card.className).toContain("overflow-hidden");
    expect(header.className).toContain("p-4");
    expect(header.className).toContain("sm:p-5");
    expect(header.className).toContain("md:p-6");
    expect(headerLayout.className).toContain("md:flex-row");
    expect(title.className).toContain("break-words");
    expect(title.className).toContain("md:truncate");
    expect(metaStrip.className).toContain("flex-col");
    expect(metaStrip.className).toContain("sm:flex-row");
  });

  it("wraps status and metadata content instead of forcing narrow horizontal rows", () => {
    const { container } = renderCard();

    expect(screen.getByText("Archived").className).toContain("max-w-full");
    expect(screen.getAllByText("Mid-Senior Level")[0].className).toContain("max-w-full");
    expect(screen.getAllByText(/A very long city name/)[0].className).toContain("break-words");
    expect(container.innerHTML).not.toContain("overflow-x");
    expect(container.innerHTML).not.toContain("min-w-max");
  });

  it("keeps recruiter action buttons accessible and mobile stacked", () => {
    const { container } = renderCard();

    fireEvent.click(container.querySelector('[role="button"][aria-expanded="false"]'));

    expect(screen.getByRole("button", { name: /view recommendations/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /view applicants/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /edit/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /delete/i })).toBeEnabled();

    const editDeleteRow = screen.getByRole("button", { name: /edit/i }).parentElement;
    expect(editDeleteRow.className).toContain("flex-col");
    expect(editDeleteRow.className).toContain("sm:flex-row");
  });

  it("preserves desktop and tablet layout breakpoints", () => {
    const { container } = renderCard();

    fireEvent.click(container.querySelector('[role="button"][aria-expanded="false"]'));

    expect(container.querySelector(".md\\:flex-row")).toBeInTheDocument();
    expect(container.querySelector(".md\\:items-center")).toBeInTheDocument();
    expect(container.querySelector(".lg\\:grid-cols-3")).toBeInTheDocument();
    expect(container.querySelector(".lg\\:col-span-2")).toBeInTheDocument();
    expect(container.querySelector(".lg\\:col-span-1")).toBeInTheDocument();
  });
});
