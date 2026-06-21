
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnalysisResult from "../AnalysisResult";
import {
  exportResumeAnalysisToJSON,
  exportResumeAnalysisToTXT,
  exportToPDF,
} from "../../../../utils/exportUtils";

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../../../../utils/exportUtils", () => ({
  exportToPDF: vi.fn(),
  exportResumeAnalysisToTXT: vi.fn(),
  exportResumeAnalysisToJSON: vi.fn(),
}));

vi.mock("../../../../shared/components", () => ({
  useToast: () => toast,
}));

vi.mock("../SkillGapVenn", () => ({
  default: () => <div data-testid="skill-gap-venn" />,
}));

vi.mock("../../../../shared/components/CoverLetterModal", () => ({
  default: () => null,
}));

vi.mock("../../services/resumeService", () => ({
  generateCoverLetter: vi.fn(),
}));

const analysisResult = {
  score: 82,
  isJDProvided: true,
  mode: "targeted",
  resumeId: "resume-1",
  classification: { level: "Intermediate", label: "Strong practical profile" },
  impactMatch: {
    score: 78,
    totalFindings: 3,
    feedback: ["Good quantified impact across recent roles."],
  },
  atsOptimization: {
    details: {
      sectionResults: {
        experience: true,
        education: true,
        skills: true,
        summary: false,
      },
      contactResults: {
        email: true,
        phone: true,
        linkedin: false,
        github: true,
        portfolio: false,
      },
    },
  },
  skillMatch: {
    score: 75,
    details: {
      matchedSkills: ["React", "Node.js", "MongoDB"],
      missingSkills: ["Docker", "Redis"],
    },
  },
  keywordMatch: {
    missingKeywords: ["CI/CD", "Kubernetes"],
  },
  techStandard: {
    details: {
      domainMissing: {
        backend: ["Caching"],
      },
    },
  },
  readabilityMatch: {
    relevantVerbs: ["Optimized", "Led", "Delivered"],
  },
  gapAnalysis: {
    suggestions: [
      { priority: "Strategic", text: "Add deployment and monitoring experience." },
      { priority: "Critical", text: "Include missing cloud keywords from the target role." },
    ],
  },
  verifiedLinks: [],
};

const renderAnalysis = () =>
  render(
    <MemoryRouter>
      <AnalysisResult
        result={analysisResult}
        file={new File(["resume"], "Aarav Resume.pdf", { type: "application/pdf" })}
        jobDescription="React Node.js role"
        onReset={vi.fn()}
      />
    </MemoryRouter>,
  );

describe("AnalysisResult PDF export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:resume-preview");
    URL.revokeObjectURL = vi.fn();
    // @ts-expect-error TODO: Fix pervasive types
    exportToPDF.mockResolvedValue(undefined);
  });

  it("shows the export PDF button after analysis results exist", () => {
    renderAnalysis();

    expect(screen.getByRole("button", { name: /export pdf/i })).toBeInTheDocument();
    expect(document.getElementById("analysis-report-pdf")).toBeInTheDocument();
  });

  it("shows TXT and JSON export buttons", () => {
    renderAnalysis();

    expect(screen.getByRole("button", { name: /export txt/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export json/i })).toBeInTheDocument();
  });

  it("clicking TXT and JSON export buttons uses the reusable export helpers", async () => {
    const user = userEvent.setup();
    renderAnalysis();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /export txt/i }));
      await user.click(screen.getByRole("button", { name: /export json/i }));
    });

    expect(exportResumeAnalysisToTXT).toHaveBeenCalledWith(
      analysisResult,
      "Aarav Resume-analysis-report.txt",
    );
    expect(exportResumeAnalysisToJSON).toHaveBeenCalledWith(
      analysisResult,
      "Aarav Resume-analysis-report.json",
    );
  });

  it("clicking export triggers PDF generation with a clean filename", async () => {
    const user = userEvent.setup();
    renderAnalysis();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /export pdf/i }));
    });

    expect(exportToPDF).toHaveBeenCalledWith(
      "analysis-report-pdf",
      "Aarav Resume-analysis-report.pdf",
      expect.objectContaining({
        jsPDF: expect.objectContaining({ orientation: "portrait" }),
      }),
    );
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Report exported to PDF successfully.");
    });
  });

  it("shows loading state and prevents duplicate export clicks", async () => {
    const user = userEvent.setup();
    let resolveExport;
    // @ts-expect-error TODO: Fix pervasive types
    exportToPDF.mockReturnValue(
      new Promise((resolve) => {
        resolveExport = resolve;
      }),
    );
    renderAnalysis();

    const button = screen.getByRole("button", { name: /export pdf/i });
    await act(async () => {
      await user.click(button);
    });

    expect(screen.getByRole("button", { name: /exporting/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /exporting/i })).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /exporting/i }));
    });
    expect(exportToPDF).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveExport();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /export pdf/i })).not.toBeDisabled();
    });
  });

  it("shows a friendly error message when PDF generation fails", async () => {
    const user = userEvent.setup();
    // @ts-expect-error TODO: Fix pervasive types
    exportToPDF.mockRejectedValueOnce(new Error("Canvas failed"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    renderAnalysis();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /export pdf/i }));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't export the PDF report. Please try again.",
    );
    expect(toast.error).toHaveBeenCalledWith("Canvas failed");
    expect(screen.getByRole("button", { name: /export pdf/i })).not.toBeDisabled();
    consoleError.mockRestore();
  });
});
