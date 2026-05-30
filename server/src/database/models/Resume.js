import mongoose from "mongoose";
import { encrypt, decrypt } from "../../utils/encryption.js";

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      default: null,
      get: decrypt,
      set: encrypt,
    },
    email: {
      type: String,
      default: null,
      get: decrypt,
      set: encrypt,
    },
    isScannedPdf: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: "My Resume",
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      default: null,
      get: decrypt,
      set: encrypt,
    },
    skills: {
      type: [String],
      default: [],
    },
    education: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
      get: decrypt,
      set: encrypt,
    },
    experience: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
      get: decrypt,
      set: encrypt,
    },
    projects: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
      get: decrypt,
      set: encrypt,
    },
    certifications: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
      get: decrypt,
      set: encrypt,
    },
    linkedin: {
      type: String,
      default: null,
      get: decrypt,
      set: encrypt,
    },
    github: {
      type: String,
      default: null,
      get: decrypt,
      set: encrypt,
    },
    portfolio: {
      type: String,
      default: null,
      get: decrypt,
      set: encrypt,
    },
    keywords: {
      type: [String],
      default: [],
    },
    extractedTextLength: {
      type: Number,
      default: 0,
    },
    resumeText: {
      type: String,
      default: null,
      select: false, // Don't include in queries by default for privacy
      get: decrypt,
      set: encrypt,
    },
    jobSkills: {
      type: [String],
      default: [],
    },
    file: {
      originalName: String,
      storedName: String,
      path: String,
      size: String,
      mimeType: String,
    },
    skillMatch: {
      score: Number,
      weight: Number,
      feedback: [String],
      matchedSkills: [String],
      missingSkills: [String],
      extraSkills: [String],
    },
    jobDescription: {
      type: String,
      default: null,
    },
    keywordMatch: {
      score: Number,
      weight: Number,
      feedback: [String],
      matchedKeywords: [String],
      missingKeywords: [String],
    },
    experienceMatch: {
      score: Number,
      weight: Number,
      feedback: [String],
      candidateExperience: Number,
      requiredExperience: Number,
      experienceGap: Number,
    },
    semanticMatch: {
      score: Number,
      weight: Number,
      feedback: [String],
    },
    evaluatorBreakdown: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    aggregatedScore: {
      type: Number,
      default: null,
    },
    classification: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    gapAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    impactMatch: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    atsOptimization: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    techStandard: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    mode: {
      type: String,
      enum: ["match", "benchmark"],
      default: "match",
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

const Resume = mongoose.model("Resume", resumeSchema);

// Indexes for efficient matching and retrieval
Resume.schema.index({ user: 1 });
Resume.schema.index({ skills: 1 });
Resume.schema.index({ createdAt: -1 });
Resume.schema.index(
  {
    name: "text",
    email: "text",
    skills: "text",
    education: "text",
    experience: "text",
    projects: "text",
  },
  {
    name: "ResumeTextIndex",
    weights: {
      name: 10,
      skills: 8,
      education: 5,
      experience: 4,
      projects: 3,
      email: 1,
    },
  }
);

export default Resume;



