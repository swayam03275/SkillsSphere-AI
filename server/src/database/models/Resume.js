import mongoose from "mongoose";

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
    },
    email: {
      type: String,
      default: null,
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
    },
    skills: {
      type: [String],
      default: [],
    },
    education: {
      type: [String],
      default: [],
    },
    experience: {
      type: [String],
      default: [],
    },
    projects: {
      type: [String],
      default: [],
    },
    certifications: {
      type: [String],
      default: [],
    },
    linkedin: {
      type: String,
      default: null,
    },
    github: {
      type: String,
      default: null,
    },
    portfolio: {
      type: String,
      default: null,
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
    },
    isScannedPdf: {
      type: Boolean,
      default: false,
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
  }
);

const Resume = mongoose.model("Resume", resumeSchema);

// Indexes for efficient matching and retrieval
Resume.schema.index({ user: 1 });
Resume.schema.index({ skills: 1 });
Resume.schema.index({ createdAt: -1 });

export default Resume;

