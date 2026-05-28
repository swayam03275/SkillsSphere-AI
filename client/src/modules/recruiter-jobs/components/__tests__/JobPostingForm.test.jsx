import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../../shared/components";
import JobPostingForm from "../JobPostingForm";

const renderForm = (props = {}) =>
  render(
    <ToastProvider>
      <JobPostingForm onSubmit={vi.fn()} {...props} />
    </ToastProvider>,
  );

const validInitialData = {
  title: "Frontend Engineer",
  description: "Build accessible React interfaces for a growing product team.",
  skills: ["React", "TypeScript"],
  experienceRequired: 2,
  location: {
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    remote: false,
  },
  salary: {
    min: 600000,
    max: 1200000,
    currency: "INR",
    isNegotiable: false,
  },
};

describe("JobPostingForm", () => {
  it("shows loading state and disables controls while submission is pending", async () => {
    const user = userEvent.setup();
    let resolveSubmit;
    const submitPromise = new Promise((resolve) => {
      resolveSubmit = resolve;
    });
    const onSubmit = vi.fn().mockReturnValue(submitPromise);

    renderForm({ onSubmit, initialData: validInitialData });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /post job/i }));
    });

    expect(await screen.findByRole("button", { name: /posting/i })).toBeDisabled();
    expect(screen.getByRole("form", { hidden: true })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText(/job title/i)).toBeDisabled();
    expect(screen.getByLabelText(/job description/i)).toBeDisabled();
    expect(screen.getByLabelText(/remote position/i)).toBeDisabled();

    await act(async () => {
      resolveSubmit({ success: true });
      await submitPromise;
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /post job/i })).toBeEnabled();
    });
  });

  it("submits successfully and shows a success toast", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ success: true });

    renderForm({ onSubmit, initialData: validInitialData });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /post job/i }));
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("Job posted successfully.")).toBeInTheDocument();
  });

  it("shows validation errors and does not submit invalid data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderForm({ onSubmit });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /post job/i }));
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText("Job title is required")).toBeInTheDocument();
    expect(
      screen.getAllByText("Please fix the highlighted fields before posting the job.").length,
    ).toBeGreaterThan(0);
  });

  it("shows an error message when submission fails", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue({
      status: 500,
      message: "API failed",
    });

    renderForm({ onSubmit, initialData: validInitialData });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /post job/i }));
    });

    expect(
      (await screen.findAllByText("Server error. Please try posting the job again in a moment.")).length,
    ).toBeGreaterThan(0);
  });

  it("prevents duplicate submissions while the request is pending", async () => {
    const user = userEvent.setup();
    let resolveSubmit;
    const submitPromise = new Promise((resolve) => {
      resolveSubmit = resolve;
    });
    const onSubmit = vi.fn().mockReturnValue(submitPromise);

    renderForm({ onSubmit, initialData: validInitialData });

    const submitButton = screen.getByRole("button", { name: /post job/i });
    await act(async () => {
      await user.dblClick(submitButton);
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmit({ success: true });
      await submitPromise;
    });
  });
});
