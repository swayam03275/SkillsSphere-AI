import Resume from "../../database/models/Resume.js";
import User from "../../database/models/User.js";
import JobPosting from "../../database/models/JobPosting.js";
import JobApplication from "../../database/models/JobApplication.js";
import LearningProgress from "../../database/models/LearningProgress.js";
import { runPipeline } from "../../../../ai-ml/pipeline/runPipeline.js";
import { createNotification } from "../notifications/service.js";
import { getIO } from "../../utils/socketIO.js";
import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";

/**
 * GET /api/recruiter/talent-finder
 * Direct talent search with pagination, text search, and key filters.
 */
export const searchTalent = asyncHandler(async (req, res, next) => {
  const { q, skills, graduationYear, minAtsScore, page = 1, limit = 10, specialization } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  if (Number.isNaN(pageNum) || pageNum <= 0 || Number.isNaN(limitNum) || limitNum <= 0 || limitNum > 100) {
    return next(new AppError("Invalid page or limit parameter. Page must be > 0 and limit must be between 1 and 100.", 400));
  }

  if (minAtsScore !== undefined) {
    const scoreNum = Number(minAtsScore);
    if (Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return next(new AppError("minAtsScore must be a number between 0 and 100.", 400));
    }
  }

  const validSpecializations = ["frontend", "backend", "fullstack", "devops", "aiml", "database"];
  if (specialization && !validSpecializations.includes(specialization.toLowerCase())) {
    return next(new AppError(`Invalid specialization. Allowed values are: ${validSpecializations.join(", ")}`, 400));
  }

  const matchObj = { isActive: true };

  // 1. Text Search Query
  if (q && q.trim().length > 0) {
    matchObj.$text = { $search: q.trim() };
  }

  // 2. Technical Skills Filter (with Synonym Expansion & Safe Regex Escaping)
  const SKILL_SYNONYMS = {
    "react": ["react", "react.js", "reactjs"],
    "react.js": ["react", "react.js", "reactjs"],
    "reactjs": ["react", "react.js", "reactjs"],
    "node": ["node", "node.js", "nodejs"],
    "node.js": ["node", "node.js", "nodejs"],
    "nodejs": ["node", "node.js", "nodejs"],
    "go": ["go", "golang"],
    "golang": ["go", "golang"],
    "c++": ["c++", "cpp"],
    "cpp": ["c++", "cpp"],
    "dotnet": [".net", "dotnet", "c#"],
    ".net": [".net", "dotnet", "c#"],
    "postgres": ["postgres", "postgresql"],
    "postgresql": ["postgres", "postgresql"],
    "js": ["javascript", "js"],
    "javascript": ["javascript", "js"],
    "ts": ["typescript", "ts"],
    "typescript": ["typescript", "ts"]
  };

  const getSkillExpansion = (skillName) => {
    const norm = skillName.toLowerCase().trim();
    return SKILL_SYNONYMS[norm] || [norm];
  };

  if (skills) {
    const skillsArray = Array.isArray(skills)
      ? skills
      : skills.split(",").map(s => s.trim()).filter(Boolean);
    const safeSkillsArray = skillsArray.filter(
      skill => typeof skill === "string" && /^[a-zA-Z0-9\s#+\.\-\/]{1,50}$/.test(skill)
    );
    if (safeSkillsArray.length > 0) {
      const andConditions = safeSkillsArray.map(skill => {
        const synonyms = getSkillExpansion(skill);
        const regexes = synonyms.map(syn => new RegExp(`^${syn.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i"));
        return { skills: { $in: regexes } };
      });
      matchObj.$and = andConditions;
    }
  }

  // 3. Technical Specialization Filter
  if (specialization) {
    const specMap = {
      frontend: ["react", "vue", "angular", "javascript", "html", "css", "next.js", "typescript"],
      backend: ["node", "express", "python", "django", "go", "java", "spring", "spring boot", "ruby", "php", "c#", ".net"],
      fullstack: ["react", "node", "express", "mongodb", "javascript", "sql", "typescript"],
      devops: ["docker", "kubernetes", "aws", "cicd", "ci/cd", "terraform", "ansible", "jenkins", "cloud"],
      aiml: ["python", "pytorch", "tensorflow", "scikit-learn", "machine learning", "deep learning", "ai", "nlp"],
      database: ["postgresql", "mongodb", "mysql", "redis", "oracle", "sql", "nosql"]
    };
    const specSkills = specMap[specialization.toLowerCase()];
    if (specSkills) {
      matchObj.skills = {
        $in: specSkills.map(s => new RegExp(`^${s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i"))
      };
    }
  }

  // 4. Graduation Year Filter (Supporting Ranges and Exact Matches Safely)
  if (graduationYear) {
    const rangeMatch = graduationYear.trim().match(/^(\d{4})-(\d{4})$/);
    const singleMatch = graduationYear.trim().match(/^(\d{4})$/);

    if (rangeMatch) {
      const startYear = parseInt(rangeMatch[1], 10);
      const endYear = parseInt(rangeMatch[2], 10);
      const years = [];
      const lower = Math.min(startYear, endYear);
      const upper = Math.max(startYear, endYear);
      
      // Limit range to maximum 20 years to prevent regex expression flooding
      if (upper - lower <= 20) {
        for (let y = lower; y <= upper; y += 1) {
          years.push(y.toString());
        }
        if (years.length > 0) {
          const regexStr = years.map(y => `\\b${y}\\b`).join("|");
          matchObj.education = {
            $regex: new RegExp(regexStr, "i")
          };
        }
      }
    } else if (singleMatch) {
      matchObj.education = {
        $regex: new RegExp(`\\b${singleMatch[1]}\\b`, "i")
      };
    }
  }

  // 5. Min ATS Score Filter
  if (minAtsScore) {
    matchObj.aggregatedScore = { $gte: Number(minAtsScore) };
  }

  const skipNum = (pageNum - 1) * limitNum;

  // 6. Build Aggregation Pipeline
  const pipeline = [
    { $match: matchObj }
  ];

  if (q && q.trim().length > 0) {
    pipeline.push({
      $addFields: {
        textScore: { $meta: "textScore" }
      }
    });
    pipeline.push({
      $sort: { textScore: -1, aggregatedScore: -1 }
    });
  } else {
    pipeline.push({
      $sort: { createdAt: -1 }
    });
  }

  // Join with User collection to verify role and retrieve details
  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDoc"
      }
    },
    { $unwind: "$userDoc" },
    { $match: { "userDoc.role": "student" } }
  );

  // Facet for pagination & metadata
  pipeline.push({
    $facet: {
      metadata: [{ $count: "total" }],
      data: [{ $skip: skipNum }, { $limit: limitNum }]
    }
  });

  const results = await Resume.aggregate(pipeline);
  const total = results[0]?.metadata[0]?.total || 0;
  const rawCandidates = results[0]?.data || [];

  // Sanitize user details
  const candidates = rawCandidates.map(candidate => {
    const { password, verificationToken, resetPasswordToken, otpAttempts, ...sanitizedUser } = candidate.userDoc || {};
    return {
      ...candidate,
      user: sanitizedUser,
      userDoc: undefined
    };
  });

  res.status(200).json({
    success: true,
    data: candidates,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  });
});

/**
 * POST /api/recruiter/match-candidate
 * Evaluate candidate's active resume against target job description.
 */
export const matchCandidate = asyncHandler(async (req, res, next) => {
  const { candidateId, jobId } = req.body;

  if (!candidateId || !jobId) {
    return next(new AppError("Candidate ID and Job ID are required", 400));
  }

  const objectIdRegex = /^[a-fA-F0-9]{24}$/;
  if (!objectIdRegex.test(candidateId) || !objectIdRegex.test(jobId)) {
    return next(new AppError("Invalid Candidate ID or Job ID format", 400));
  }

  const job = await JobPosting.findById(jobId);
  if (!job) {
    return next(new AppError("Job posting not found", 404));
  }

  if (job.recruiter.toString() !== req.user._id.toString()) {
    return next(new AppError("You are not authorized to access this job", 403));
  }

  let resume = await Resume.findOne({ user: candidateId, isActive: true }).select("+resumeText");
  if (!resume) {
    resume = await Resume.findOne({ user: candidateId }).sort({ createdAt: -1 }).select("+resumeText");
  }

  if (!resume) {
    return next(new AppError("No resume profile found for the candidate", 404));
  }

  // 1. Run AI Pipeline
  const pipelineResult = await runPipeline({
    resumeData: resume,
    jobSkills: job.skills,
    jobDescription: job.description,
  });

  // 2. Fetch Career Readiness & Contribution Data
  const learningProgress = await LearningProgress.findOne({ user: candidateId });
  
  let careerReadiness = "Low";
  let contributionActivity = "Low";
  
  if (learningProgress) {
    const overallProgress = learningProgress.overallProgress || 0;
    if (overallProgress >= 80) careerReadiness = "High";
    else if (overallProgress >= 50) careerReadiness = "Medium";
    
    const contributionTopics = (learningProgress.roadmap || []).filter(t => t.type === "contribution");
    const completedContributions = contributionTopics.filter(t => t.status === "completed").length;
    
    if (completedContributions >= 3) contributionActivity = "High";
    else if (completedContributions >= 1) contributionActivity = "Medium";
  }

  // 3. Extract and map AI scores
  const atsScore = pipelineResult.atsOptimization?.score || 0;
  const skillScore = pipelineResult.skillMatch?.score || 0;
  const experienceScore = pipelineResult.experienceMatch?.score || 0;
  const impactScore = pipelineResult.impactMatch?.score || 0;
  const projectStrengthScore = Math.max(experienceScore, impactScore);

  // 4. Calculate Final AI Match Score (Weighted)
  const careerScore = careerReadiness === "High" ? 100 : (careerReadiness === "Medium" ? 70 : 40);
  const contributionScore = contributionActivity === "High" ? 100 : (contributionActivity === "Medium" ? 70 : 40);

  const finalScore = Math.round(
    (atsScore * 0.20) +
    (skillScore * 0.35) +
    (projectStrengthScore * 0.25) +
    (careerScore * 0.10) +
    (contributionScore * 0.10)
  );

  // 5. Determine Match Category
  let category = "Weak Alignment";
  if (finalScore >= 85) category = "Excellent Match";
  else if (finalScore >= 70) category = "Moderate Match";
  else if (finalScore >= 50) category = "Growth Potential";

  // 6. Generate Insights
  const insights = [];
  if (atsScore >= 80) {
    insights.push("Excellent ATS structure and keyword optimization.");
  } else if (atsScore < 50) {
    insights.push("Poor ATS compatibility; resume may not parse well.");
  }

  if (skillScore >= 80) {
    insights.push("Strong alignment with required technical skills.");
  } else if (skillScore < 50) {
    insights.push("Significant gaps in required technical skills.");
  }

  const missingSkills = pipelineResult.gapAnalysis?.missingSkills || [];
  if (missingSkills.length > 0) {
    const missing = missingSkills.slice(0, 3).map(s => s.skill || s).join(", ");
    insights.push(`Missing experience in: ${missing}.`);
  }

  if (contributionActivity === "High") {
    insights.push("Active open-source contributor with roadmap completion progress.");
  } else if (contributionActivity === "Medium") {
    insights.push("Some contribution activity detected on roadmap.");
  }

  if (careerReadiness === "High") {
    insights.push("Shows high career readiness and roadmap completion.");
  }

  if (projectStrengthScore >= 80) {
    insights.push("Demonstrates strong project impact and experience.");
  }

  if (insights.length === 0) {
    insights.push("Candidate meets basic criteria but lacks standout signals.");
  }

  // 7. Generate Weaknesses
  const weaknesses = [];
  if (atsScore < 60) {
    weaknesses.push("Low ATS keyword optimization; may not parse well in external systems.");
  }
  if (skillScore < 60) {
    weaknesses.push(`Weak technical skill alignment (Score: ${skillScore}/100).`);
  }
  if (missingSkills.length > 0) {
    const missing = missingSkills.map(s => s.skill || s).join(", ");
    weaknesses.push(`Missing experience in: ${missing}.`);
  }
  if (projectStrengthScore < 50) {
    weaknesses.push("Weak project impact and professional experience.");
  }
  if (contributionActivity === "Low") {
    weaknesses.push("Missing cloud/open-source contribution exposure.");
  }
  if (careerReadiness === "Low") {
    weaknesses.push("Low career readiness or incomplete training roadmaps.");
  }
  if (weaknesses.length === 0) {
    weaknesses.push("No major weaknesses detected.");
  }

  // 8. Generate Hiring Signals
  const signals = [];
  if (finalScore > 90 && atsScore > 85 && (contributionActivity === "High" || contributionActivity === "Medium")) {
    signals.push("Fast-Track Candidate");
  }
  if (finalScore >= 85 && !signals.includes("Fast-Track Candidate")) {
    signals.push("Strong Hiring Signal");
  }
  if (skillScore >= 80 && careerReadiness === "Low") {
    signals.push("Technical Interview Recommended");
  }
  if (careerReadiness === "High" && finalScore >= 80) {
    signals.push("HR Round Recommended");
  }
  if (finalScore >= 70 && missingSkills.length > 0) {
    signals.push("Skill Validation Required");
  }
  if (atsScore < 60 && finalScore >= 70) {
    signals.push("ATS Optimization Needed");
  }
  if (category === "Growth Potential") {
    signals.push("Growth Potential Candidate");
  }

  res.status(200).json({
    success: true,
    data: {
      aiMatchScore: finalScore,
      matchCategory: category,
      aiHiringSignals: signals,
      matchBreakdown: {
        atsCompatibility: atsScore,
        skillMatch: skillScore,
        projectStrength: projectStrengthScore,
        contributionActivity,
        careerReadiness,
      },
      aiRecruiterInsights: insights,
      aiWeaknesses: weaknesses,
    }
  });
});

/**
 * POST /api/recruiter/invite-candidate
 * Send an automated invitation to a student to apply to a job posting.
 */
export const inviteCandidate = asyncHandler(async (req, res, next) => {
  const { candidateId, jobId } = req.body;

  if (!candidateId || !jobId) {
    return next(new AppError("Candidate ID and Job ID are required", 400));
  }

  const objectIdRegex = /^[a-fA-F0-9]{24}$/;
  if (!objectIdRegex.test(candidateId) || !objectIdRegex.test(jobId)) {
    return next(new AppError("Invalid Candidate ID or Job ID format", 400));
  }

  const job = await JobPosting.findById(jobId);
  if (!job) {
    return next(new AppError("Job posting not found", 404));
  }

  const candidate = await User.findById(candidateId);
  if (!candidate || candidate.role !== "student") {
    return next(new AppError("Invalid candidate or user is not a student", 404));
  }

  // Check if student has already applied to prevent duplicate invitation/application
  const existingApp = await JobApplication.findOne({ job: jobId, applicant: candidateId });
  if (existingApp) {
    return next(new AppError("Candidate has already applied to this job posting.", 400));
  }

  // Create standard notification
  const notif = await createNotification({
    userId: candidateId,
    title: "Invitation to Apply",
    message: `Recruiter ${req.user.name} from ${req.user.company || "their company"} has invited you to apply for the "${job.title}" position.`,
    type: "job-update",
    metadata: {
      relatedId: job._id.toString(),
      relatedModel: "JobPosting",
      actionUrl: "/jobs"
    }
  });

  // Emit WebSocket event for real-time notification update
  const io = getIO();
  if (io) {
    io.to(`user_${candidateId}`).emit("new-notification", notif);
  }

  res.status(200).json({
    success: true,
    message: "Invitation sent successfully to candidate."
  });
});
