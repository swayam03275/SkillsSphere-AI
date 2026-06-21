
import html2pdf from 'html2pdf.js';

import logger from "./logger";

/**
 * Exports an array of objects to a CSV file.
 * @param {string} filename The name of the file to download (e.g., "report.csv").
 * @param {Array<Object>} rows The data to export.
 */
export const exportToCSV = (filename, rows) => {
  if (!rows || !rows.length) {
    logger.warn('No data to export');
    return;
  }
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const asArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
};

const stringifyItem = (item) => {
  if (item === null || item === undefined) return "";
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (typeof item === "object") {
    return item.text || item.summary || item.message || item.skill || item.keyword || JSON.stringify(item);
  }
  return String(item);
};

const uniqueStrings = (items) => [...new Set(asArray(items).map(stringifyItem).map((item) => item.trim()).filter(Boolean))];

const getNestedArray = (...values) => values.flatMap((value) => asArray(value));

export const buildResumeAnalysisExportData = (result = {}) => {
  const matchedSkills = getNestedArray(
    // @ts-expect-error TODO: Fix pervasive types
    result.skills,
    // @ts-expect-error TODO: Fix pervasive types
    result.skillMatch?.matchedSkills,
    // @ts-expect-error TODO: Fix pervasive types
    result.skillMatch?.details?.matchedSkills,
    // @ts-expect-error TODO: Fix pervasive types
    result.skillsMatch?.matchedSkills,
    // @ts-expect-error TODO: Fix pervasive types
    result.skillsMatch?.details?.matchedSkills,
  );

  const missingSkills = getNestedArray(
    // @ts-expect-error TODO: Fix pervasive types
    result.missingSkills,
    // @ts-expect-error TODO: Fix pervasive types
    result.skillMatch?.missingSkills,
    // @ts-expect-error TODO: Fix pervasive types
    result.skillMatch?.details?.missingSkills,
    // @ts-expect-error TODO: Fix pervasive types
    result.keywordMatch?.missingKeywords,
  );

  const suggestions = getNestedArray(
    // @ts-expect-error TODO: Fix pervasive types
    result.suggestions,
    // @ts-expect-error TODO: Fix pervasive types
    result.gapAnalysis?.suggestions,
    // @ts-expect-error TODO: Fix pervasive types
    result.recommendations,
  );

  const strengths = getNestedArray(
    // @ts-expect-error TODO: Fix pervasive types
    result.strengths,
    // @ts-expect-error TODO: Fix pervasive types
    result.resumeStrengths,
    // @ts-expect-error TODO: Fix pervasive types
    result.impactMatch?.feedback,
    // @ts-expect-error TODO: Fix pervasive types
    result.keywordMatch?.matchedKeywords,
    // @ts-expect-error TODO: Fix pervasive types
    result.aiRecruiterInsights,
  );

  const weaknesses = getNestedArray(
    // @ts-expect-error TODO: Fix pervasive types
    result.weaknesses,
    // @ts-expect-error TODO: Fix pervasive types
    result.resumeWeaknesses,
    // @ts-expect-error TODO: Fix pervasive types
    result.aiWeaknesses,
    // @ts-expect-error TODO: Fix pervasive types
    result.gapAnalysis?.weaknesses,
    // @ts-expect-error TODO: Fix pervasive types
    result.atsOptimization?.issues,
  );

  return {
    // @ts-expect-error TODO: Fix pervasive types
    score: Number.isFinite(Number(result.score)) ? Number(result.score) : 0,
    strengths: uniqueStrings(strengths),
    weaknesses: uniqueStrings(weaknesses),
    skills: uniqueStrings(matchedSkills),
    missingSkills: uniqueStrings(missingSkills),
    suggestions: suggestions.map((suggestion) => {
      if (suggestion && typeof suggestion === "object") {
        return {
          priority: suggestion.priority || undefined,
          text: stringifyItem(suggestion),
        };
      }
      return { text: stringifyItem(suggestion) };
    }).filter((suggestion) => suggestion.text),
  };
};

export const formatResumeAnalysisAsText = (result = {}) => {
  const data = buildResumeAnalysisExportData(result);
  const formatList = (items, emptyText = "None listed") => {
    if (!items.length) return `- ${emptyText}`;
    return items.map((item) => {
      if (item && typeof item === "object") {
        return `- ${item.priority ? `[${item.priority}] ` : ""}${item.text}`;
      }
      return `- ${item}`;
    }).join("\n");
  };

  return [
    "Resume Analysis Report",
    "======================",
    "",
    `Score: ${data.score}%`,
    "",
    "Strengths",
    "---------",
    formatList(data.strengths),
    "",
    "Weaknesses",
    "----------",
    formatList(data.weaknesses),
    "",
    "Skills",
    "------",
    formatList(data.skills),
    "",
    "Missing Skills",
    "--------------",
    formatList(data.missingSkills),
    "",
    "Suggestions",
    "-----------",
    formatList(data.suggestions),
  ].join("\n");
};

const downloadBlob = (filename, blob) => {
  const link = document.createElement("a");
  if (link.download === undefined) return;

  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportResumeAnalysisToTXT = (result, filename = "resume-analysis.txt") => {
  const content = formatResumeAnalysisAsText(result);
  downloadBlob(filename, new Blob([content], { type: "text/plain;charset=utf-8;" }));
};

export const exportResumeAnalysisToJSON = (result, filename = "resume-analysis.json") => {
  const content = JSON.stringify(buildResumeAnalysisExportData(result), null, 2);
  downloadBlob(filename, new Blob([content], { type: "application/json;charset=utf-8;" }));
};

/**
 * Captures an HTML element and exports it as a PDF.
 * @param {string} elementId The ID of the HTML element to capture.
 * @param {string} filename The name of the PDF file to download (e.g., "report.pdf").
 */
export const exportToPDF = async (elementId, filename, options = {}) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with ID ${elementId} not found.`);
  }
  const opt = {
    margin:       0.2,
    filename:     filename,
    image:        { type: 'jpeg', quality: 1.0 },
    html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0f172a' },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' },
    ...options,
  };
  
  // @ts-expect-error TODO: Fix pervasive types
  return html2pdf().set(opt).from(element).save();
};
