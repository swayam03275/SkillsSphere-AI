import fs from "fs/promises";
import path from "path";

// Polyfill DOMMatrix for pdfjs-dist dependency in Node.js
if (typeof global.DOMMatrix === "undefined") {
  global.DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const techKeywords = require("../../../ai-ml/data/techKeywords.json");
const skillKeywords = Object.values(techKeywords).flat();

const sectionHeaders = {
  education: ["education", "academics", "qualification"],
  experience: ["experience", "work experience", "employment", "internship"],
  projects: ["projects", "project experience"],
  certifications: ["certifications", "certificates", "achievements", "licenses"],
};

const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const phoneRegex = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)?\d{6,10}\b/g;
const linkedinRegex = /(https?:\/\/)?(www\.)?linkedin\.com\/[^\s)\]]+/gi;
const githubRegex = /(https?:\/\/)?(www\.)?github\.com\/[^\s)\]]+/gi;
const urlRegex = /(https?:\/\/[^\s)\]]+)/gi;
const portfolioKeywords = ["portfolio", "vercel.app", "netlify.app", ".dev", ".io", ".me", ".site", ".tech", "github.io"];

const normalizeWhitespace = (text) => text.replace(/\r/g, "\n").replace(/\n{2,}/g, "\n").trim();

const normalizeUrl = (url) => {
  if (!url) return null;
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
};

const cleanupUrl = (url) => (url || "").replace(/[\][),.;]+$/, "").trim();

const isLikelyPortfolioUrl = (url) => {
  if (!url) return false;

  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("linkedin.com") || lowerUrl.includes("github.com")) return false;

  return portfolioKeywords.some((keyword) => lowerUrl.includes(keyword));
};

const toUniqueList = (items) => [...new Set(items.filter(Boolean).map((item) => item.trim()))];

const extractSectionLines = (lines, headerKeys) => {
  const startIndex = lines.findIndex((line) => {
    const normalized = line.trim().toLowerCase();
    return headerKeys.some((key) => normalized === key || normalized.startsWith(`${key}:`));
  });

  if (startIndex === -1) return [];

  const collected = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const current = lines[i].trim();
    if (!current) continue;

    const isAnotherHeader = Object.values(sectionHeaders)
      .flat()
      .some((header) => current.toLowerCase() === header || current.toLowerCase().startsWith(`${header}:`));

    if (isAnotherHeader) break;
    collected.push(current.replace(/^[-*]\s*/, ""));
  }

  return toUniqueList(collected);
};

const extractName = (lines) => {
  for (const rawLine of lines.slice(0, 8)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.includes("@")) continue;
    if (/linkedin|github|portfolio|resume|curriculum vitae/i.test(line)) continue;
    if (/[^a-zA-Z.\s-]/.test(line)) continue;
    if (line.split(/\s+/).length < 2) continue;
    return line;
  }
  return "Unknown";
};

const extractSkills = (text) => {
  const lowerText = text.toLowerCase();
  return skillKeywords.filter((skill) => lowerText.includes(skill.toLowerCase()));
};

export const parseResume = async (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  let text = "";

  if (extension === ".pdf") {
    const fileBuffer = await fs.readFile(filePath);
    const parser = new PDFParse({ data: fileBuffer });
    try {
      const parsed = await parser.getText({ parseHyperlinks: true });
      text = normalizeWhitespace(parsed.text || "");
    } finally {
      await parser.destroy();
    }
  } else if (extension === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    text = normalizeWhitespace(result.value || "");
  } else if (extension === ".txt") {
    const rawText = await fs.readFile(filePath, "utf-8");
    text = normalizeWhitespace(rawText || "");
  } else {
    throw new Error("Only PDF, DOCX, and TXT parsing is supported on /analyze right now");
  }

  if (!text) {
    throw new Error("Unable to extract text from resume");
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const emails = toUniqueList(text.match(emailRegex) || []);
  const phones = toUniqueList((text.match(phoneRegex) || []).map((phone) => phone.replace(/\s+/g, " ").trim()));
  const linkedins = toUniqueList((text.match(linkedinRegex) || []).map(cleanupUrl).map(normalizeUrl));
  const githubs = toUniqueList((text.match(githubRegex) || []).map(cleanupUrl).map(normalizeUrl));
  const allUrls = toUniqueList((text.match(urlRegex) || []).map(cleanupUrl).map(normalizeUrl));
  const portfolios = allUrls.filter((url) => isLikelyPortfolioUrl(url));

  const name = extractName(lines);
  const email = emails[0];
  const phone = phones[0];
  const skills = extractSkills(text);
  const education = extractSectionLines(lines, sectionHeaders.education);
  const experience = extractSectionLines(lines, sectionHeaders.experience);
  const projects = extractSectionLines(lines, sectionHeaders.projects);
  const certifications = extractSectionLines(lines, sectionHeaders.certifications);
  const linkedin = linkedins[0];
  const github = githubs[0];
  const portfolio = portfolios[0];
  const keywords = extractSkills(text);

  return {
    name: name || "",
    email: typeof email === "string" ? email : null,   
    phone: phone || null,
    skills: skills || [],
    education: education || [],
    experience: experience || [],
    projects: projects || [],
    certifications: certifications || [],
    linkedin: linkedin || null,
    github: github || null,
    portfolio: portfolio || null,
    keywords: keywords || [],
    extractedTextLength: text.length || 0,
    resumeText: text || "",
  };
};
