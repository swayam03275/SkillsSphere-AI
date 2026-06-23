import Resume from "../../database/models/Resume.js";
import User from "../../database/models/User.js";
import JobPosting from "../../database/models/JobPosting.js";
import LearningProgress from "../../database/models/LearningProgress.js";
import { runPipeline } from "../../../../ai-ml/pipeline/runPipeline.js";
import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";

/**
 * POST /api/recruiter/compare-candidates
 * Compare up to 3 candidate profiles side-by-side.
 */
export const compareCandidates = asyncHandler(async (req, res, next) => {
  const { candidateIds, jobId } = req.body;

  if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
    return next(new AppError("An array of Candidate IDs is required for comparison", 400));
  }

  if (candidateIds.length > 3) {
    return next(new AppError("You can compare a maximum of 3 candidates at a time", 400));
  }

  // Validate ObjectID formats
  const objectIdRegex = /^[a-fA-F0-9]{24}$/;
  for (const id of candidateIds) {
    if (!objectIdRegex.test(id)) {
      return next(new AppError(`Invalid candidate ID format: ${id}`, 400));
    }
  }

  if (jobId && !objectIdRegex.test(jobId)) {
    return next(new AppError("Invalid Job ID format", 400));
  }

  // Retrieve Job details if provided
  let job = null;
  if (jobId) {
    job = await JobPosting.findById(jobId);
    if (!job) {
      return next(new AppError("Job posting not found", 404));
    }
  }

  const comparisonData = [];

  for (const candidateId of candidateIds) {
    const candidateUser = await User.findById(candidateId).select("name email role profilePic linkedinUrl credentialUrl accessLevel");
    if (!candidateUser || candidateUser.role !== "student") {
      continue;
    }

    // Find candidate's resume
    let resume = await Resume.findOne({ user: candidateId, isActive: true }).select("+resumeText");
    if (!resume) {
      resume = await Resume.findOne({ user: candidateId }).sort({ createdAt: -1 }).select("+resumeText");
    }

    if (!resume) {
      comparisonData.push({
        candidateId,
        user: candidateUser,
        resume: null,
        metrics: null,
      });
      continue;
    }

    // Load learning progress details
    const learningProgress = await LearningProgress.findOne({ user: candidateId });
    let careerReadiness = "Low";
    let completedContributions = 0;
    let overallProgress = 0;

    if (learningProgress) {
      overallProgress = learningProgress.overallProgress || 0;
      if (overallProgress >= 80) careerReadiness = "High";
      else if (overallProgress >= 50) careerReadiness = "Medium";

      const contributionTopics = (learningProgress.roadmap || []).filter(t => t.type === "contribution");
      completedContributions = contributionTopics.filter(t => t.status === "completed").length;
    }

    // If job is provided, run match metrics
    let matchMetrics = null;
    if (job) {
      try {
        const pipelineResult = await runPipeline({
          resumeData: resume,
          jobSkills: job.skills,
          jobDescription: job.description,
        });

        const atsScore = pipelineResult.atsOptimization?.score || 0;
        const skillScore = pipelineResult.skillMatch?.score || 0;
        const experienceScore = pipelineResult.experienceMatch?.score || 0;
        const impactScore = pipelineResult.impactMatch?.score || 0;
        const projectStrengthScore = Math.max(experienceScore, impactScore);

        const careerScore = careerReadiness === "High" ? 100 : (careerReadiness === "Medium" ? 70 : 40);
        const contributionScore = completedContributions >= 3 ? 100 : (completedContributions >= 1 ? 70 : 40);

        const finalScore = Math.round(
          (atsScore * 0.20) +
          (skillScore * 0.35) +
          (projectStrengthScore * 0.25) +
          (careerScore * 0.10) +
          (contributionScore * 0.10)
        );

        let category = "Weak Alignment";
        if (finalScore >= 85) category = "Excellent Match";
        else if (finalScore >= 70) category = "Moderate Match";
        else if (finalScore >= 50) category = "Growth Potential";

        matchMetrics = {
          jobMatched: true,
          jobTitle: job.title,
          aiMatchScore: finalScore,
          matchCategory: category,
          atsCompatibility: atsScore,
          skillMatch: skillScore,
          projectStrength: projectStrengthScore,
        };
      } catch (err) {
        // Fallback to basic metrics in case matching fails
        matchMetrics = {
          jobMatched: false,
          error: "Failed to run semantic matching pipeline.",
        };
      }
    }

    // Format experience/education summaries
    const experienceSummary = Array.isArray(resume.experience) 
      ? resume.experience.slice(0, 2).join(" | ") 
      : (typeof resume.experience === "string" ? resume.experience : "No experience listed");

    const educationSummary = Array.isArray(resume.education)
      ? resume.education.slice(0, 2).join(" | ")
      : (typeof resume.education === "string" ? resume.education : "No education listed");

    comparisonData.push({
      candidateId,
      user: candidateUser,
      resumeId: resume._id,
      baselineScore: resume.aggregatedScore || 0,
      skills: resume.skills || [],
      experienceSummary,
      educationSummary,
      careerReadiness: overallProgress,
      completedContributions,
      matchMetrics,
    });
  }

  res.status(200).json({
    success: true,
    data: comparisonData,
  });
});
