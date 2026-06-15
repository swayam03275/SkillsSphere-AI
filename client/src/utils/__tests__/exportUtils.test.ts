// @ts-nocheck

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildResumeAnalysisExportData,
  exportResumeAnalysisToJSON,
  exportResumeAnalysisToTXT,
  formatResumeAnalysisAsText,
} from "../exportUtils";

const analysisResult = {
  score: 87,
  strengths: ["Clear impact metrics"],
  weaknesses: ["Missing deployment details"],
  skillMatch: {
    details: {
      matchedSkills: ["React", "Node.js", "React"],
      missingSkills: ["Docker"],
    },
  },
  keywordMatch: {
    missingKeywords: ["Kubernetes"],
  },
  gapAnalysis: {
    suggestions: [
      { priority: "Strategic", text: "Add production deployment examples." },
      "Quantify performance improvements.",
    ],
  },
};

const readBlob = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsText(blob);
});

describe("resume analysis export utilities", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:resume-analysis");
    URL.revokeObjectURL = vi.fn();
  });

  it("builds a reusable export payload with required analysis fields", () => {
    expect(buildResumeAnalysisExportData(analysisResult)).toEqual({
      score: 87,
      strengths: ["Clear impact metrics"],
      weaknesses: ["Missing deployment details"],
      skills: ["React", "Node.js"],
      missingSkills: ["Docker", "Kubernetes"],
      suggestions: [
        { priority: "Strategic", text: "Add production deployment examples." },
        { text: "Quantify performance improvements." },
      ],
    });
  });

  it("formats resume analysis as readable plain text", () => {
    const text = formatResumeAnalysisAsText(analysisResult);

    expect(text).toContain("Resume Analysis Report");
    expect(text).toContain("Score: 87%");
    expect(text).toContain("- Clear impact metrics");
    expect(text).toContain("- Missing deployment details");
    expect(text).toContain("- React");
    expect(text).toContain("- Docker");
    expect(text).toContain("- [Strategic] Add production deployment examples.");
  });

  it("downloads TXT exports with plain text content", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    exportResumeAnalysisToTXT(analysisResult, "analysis.txt");

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("text/plain;charset=utf-8;");
    await expect(readBlob(blob)).resolves.toContain("Score: 87%");
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:resume-analysis");
  });

  it("downloads JSON exports with structured analysis data", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    exportResumeAnalysisToJSON(analysisResult, "analysis.json");

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("application/json;charset=utf-8;");
    const content = await readBlob(blob);
    expect(content).toContain('"score": 87');
    expect(content).toContain('"missingSkills"');
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:resume-analysis");
  });
});
