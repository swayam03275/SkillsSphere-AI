import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "../../../../shared/components";
import DragDropUpload from "../DragDropUpload";

const renderUpload = (props = {}) =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <DragDropUpload onFileUpload={vi.fn()} {...props} />
      </ToastProvider>
    </MemoryRouter>,
  );

const createResumeFile = (name = "resume.pdf", type = "application/pdf") =>
  new File(["resume content"], name, { type });

const createOversizedResumeFile = () =>
  new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large-resume.pdf", {
    type: "application/pdf",
  });

describe("DragDropUpload", () => {
  it("uploads a valid resume file", async () => {
    const user = userEvent.setup();
    const onFileUpload = vi.fn();
    const file = createResumeFile();

    renderUpload({ onFileUpload });

    await act(async () => {
      await user.upload(screen.getByLabelText(/browse resume file/i), file);
    });

    await waitFor(() => {
      expect(onFileUpload).toHaveBeenCalledWith(file);
    });

    expect(screen.getByText("resume.pdf ready for analysis")).toBeInTheDocument();
  });

  it("shows an error for unsupported file types", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onFileUpload = vi.fn();
    const file = new File(["notes"], "notes.txt", { type: "text/plain" });

    renderUpload({ onFileUpload });

    await act(async () => {
      await user.upload(screen.getByLabelText(/browse resume file/i), file);
    });

    expect(onFileUpload).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unsupported file type. Please upload a PDF, DOC, or DOCX resume.",
    );
  });

  it("shows an error for oversized files", async () => {
    const user = userEvent.setup();
    const onFileUpload = vi.fn();

    renderUpload({ onFileUpload });

    await act(async () => {
      await user.upload(
        screen.getByLabelText(/browse resume file/i),
        createOversizedResumeFile(),
      );
    });

    expect(onFileUpload).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Resume file is too large. Please upload a file up to 5 MB.",
    );
  });

  it("shows an error when upload fails", async () => {
    const user = userEvent.setup();
    const onFileUpload = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("Boom"), { status: 500 }));

    renderUpload({ onFileUpload });

    await act(async () => {
      await user.upload(
        screen.getByLabelText(/browse resume file/i),
        createResumeFile(),
      );
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Server error while uploading your resume. Please try again in a moment.",
    );
  });

  it("disables browse controls and shows uploading state while upload is pending", async () => {
    const user = userEvent.setup();
    let resolveUpload;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });
    const onFileUpload = vi.fn().mockReturnValue(uploadPromise);

    renderUpload({ onFileUpload });

    await act(async () => {
      await user.upload(
        screen.getByLabelText(/browse resume file/i),
        createResumeFile(),
      );
    });

    expect(await screen.findByText("Uploading...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /uploading/i })).toBeDisabled();
    expect(screen.getByLabelText(/browse resume file/i)).toBeDisabled();

    await act(async () => {
      resolveUpload();
      await uploadPromise;
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /browse files/i })).toBeEnabled();
    });
  });

  it("shows drag-and-drop feedback when multiple files are dropped", () => {
    const onFileUpload = vi.fn();

    renderUpload({ onFileUpload });

    const dropZone = screen
      .getByText(/drag & drop your resume here/i)
      .closest("[tabindex]");

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [
          createResumeFile("resume-one.pdf"),
          createResumeFile("resume-two.pdf"),
        ],
      },
    });

    expect(onFileUpload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please upload one resume file at a time.",
    );
  });
});
