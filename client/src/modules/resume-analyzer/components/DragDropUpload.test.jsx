import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DragDropUpload from "./DragDropUpload";

const toast = {
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
};

vi.mock("../../../shared/components", () => ({
  useToast: () => toast,
}));

vi.mock("../../../modules/landing/components/Button", () => ({
  default: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

const uploadFile = (name, type, size = 1024) =>
  new File([new Uint8Array(size)], name, { type });

const renderUpload = (onFileUpload = vi.fn()) => {
  render(<DragDropUpload onFileUpload={onFileUpload} />);
  return onFileUpload;
};

describe("DragDropUpload resume validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects oversized files before upload", async () => {
    const onFileUpload = renderUpload();
    const user = userEvent.setup();

    await user.upload(
      screen.getByLabelText(/browse resume file/i),
      uploadFile("resume.pdf", "application/pdf", 5 * 1024 * 1024 + 1),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/too large/i);
    expect(onFileUpload).not.toHaveBeenCalled();
  });

  it("rejects unsupported file types before upload", async () => {
    const onFileUpload = renderUpload();
    const user = userEvent.setup({ applyAccept: false });

    await user.upload(
      screen.getByLabelText(/browse resume file/i),
      uploadFile("resume.txt", "text/plain"),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/unsupported file type/i);
    expect(onFileUpload).not.toHaveBeenCalled();
  });

  it("accepts a valid PDF file", async () => {
    const onFileUpload = renderUpload();
    const user = userEvent.setup();
    const file = uploadFile("resume.pdf", "application/pdf");

    await user.upload(screen.getByLabelText(/browse resume file/i), file);

    await waitFor(() => {
      expect(onFileUpload).toHaveBeenCalledWith(file);
    });
    expect(screen.getByText(/resume.pdf ready for analysis/i)).toBeInTheDocument();
  });

  it("accepts a valid DOCX file", async () => {
    const onFileUpload = renderUpload();
    const user = userEvent.setup();
    const file = uploadFile(
      "resume.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );

    await user.upload(screen.getByLabelText(/browse resume file/i), file);

    await waitFor(() => {
      expect(onFileUpload).toHaveBeenCalledWith(file);
    });
    expect(screen.getByText(/resume.docx ready for analysis/i)).toBeInTheDocument();
  });
});
