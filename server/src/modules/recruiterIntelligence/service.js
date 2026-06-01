import JobApplication from "../../database/models/JobApplication.js";
import LearningProgress from "../../database/models/LearningProgress.js";
import { runPipeline } from "../../../../ai-ml/pipeline/runPipeline.js";

import logger from "../../utils/logger.js";

/**
 * Evaluates a candidate's application to generate AI Match Scores
 * @param {string} applicationId - ID of the job application
 * @returns {Promise<Object>} - Updated application
 */
export const evaluateCandidateMatch = async (applicationId) => {
  try {
    const application = await JobApplication.findById(applicationId)
      .populate("job")
      .populate("resume");

    if (!application || !application.job || !application.resume) {
      logger.error("Missing required data for candidate evaluation");
      return null;
    }

    const { job, resume, applicant } = application;

    // 1. Run AI Pipeline to get resume intelligence
    const pipelineResult = await runPipeline({
      resumeData: resume,
      jobSkills: job.skills,
      jobDescription: job.description,
    });

    // 2. Fetch Career Readiness & Contribution Data
    const learningProgress = await LearningProgress.findOne({ user: applicant });
    
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
    // ATS: 20%, Skills: 35%, Project/Experience: 25%, Career: 10%, Contributions: 10%
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

    // 6. Generate AI Recruiter Insights
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

    // 6.5 Generate AI Weaknesses
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

    // 6.75 Generate AI Hiring Signals (Interview Readiness Badges)
    const signals = [];
    
    // Fast-Track Candidate
    if (finalScore > 90 && atsScore > 85 && (contributionActivity === "High" || contributionActivity === "Medium")) {
      signals.push("Fast-Track Candidate");
    }
    
    // Strong Hiring Signal
    if (finalScore >= 85 && !signals.includes("Fast-Track Candidate")) {
      signals.push("Strong Hiring Signal");
    }

    // Technical Interview Recommended
    if (skillScore >= 80 && careerReadiness === "Low") {
      signals.push("Technical Interview Recommended");
    }

    // HR Round Recommended
    if (careerReadiness === "High" && finalScore >= 80) {
      signals.push("HR Round Recommended");
    }

    // Skill Validation Required
    if (finalScore >= 70 && missingSkills.length > 0) {
      signals.push("Skill Validation Required");
    }

    // ATS Optimization Needed
    if (atsScore < 60 && finalScore >= 70) {
      signals.push("ATS Optimization Needed");
    }

    // Growth Potential Candidate
    if (category === "Growth Potential") {
      signals.push("Growth Potential Candidate");
    }

    // 7. Update Application Document
    application.aiMatchScore = finalScore;
    application.matchCategory = category;
    application.aiHiringSignals = signals;
    application.matchBreakdown = {
      atsCompatibility: atsScore,
      skillMatch: skillScore,
      projectStrength: projectStrengthScore,
      contributionActivity,
      careerReadiness,
    };
    application.aiRecruiterInsights = insights;
    application.aiWeaknesses = weaknesses;

    await application.save();
    return application;

  } catch (error) {
    logger.error("Error evaluating candidate match:", error);
    return null;
  }
};

const recruiterIntelligenceService = {
  evaluateCandidateMatch,
};

export default recruiterIntelligenceService;
