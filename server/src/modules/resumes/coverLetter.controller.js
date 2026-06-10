import Resume from "../../database/models/Resume.js";
import CoverLetter from "../../database/models/CoverLetter.js";
import { buildCoverLetterPrompt } from "../../utils/coverLetterPromptBuilder.js";
import { generateCoverLetter } from "../../utils/geminiService.js";
import { COVER_LETTER_LIMIT } from "../../validations/coverLetterValidation.js";

import logger from "../../utils/logger.js";

/**
 * Generate an AI cover letter based on a parsed resume and a target job description.
 */
export const generateCoverLetterForResume = async (req, res, next) => {
  try {
    const resumeId = req.params.id;
    const { jobDescription, tone, language } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!jobDescription?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Job description is required to generate a targeted cover letter." 
      });
    }

    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ 
        success: false, 
        message: "Resume not found." 
      });
    }

    // Security check: ensure the user owns the resume
    if (resume.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this resume."
      });
    }

    const coverLetterCount = await CoverLetter.countDocuments({ user: userId });
    if (coverLetterCount >= COVER_LETTER_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Maximum limit of ${COVER_LETTER_LIMIT} cover letters reached. Please delete an existing one to generate a new one.`,
      });
    }

    // Build the dynamic prompt using the parsed resume data
    logger.info("Resume:", resume);
    logger.info("JD:", jobDescription);
    const prompt = buildCoverLetterPrompt({
      resumeData: resume,
      analysisData: {
        skills: { present: resume.skills },
        atsAnalysis: resume.atsOptimization
      },
      jobDescription,
      tone,
      language
    });

    logger.info("Generated Prompt:", prompt);

    // Generate the cover letter using the Gemini service
    const aiResult = await generateCoverLetter(prompt);

    logger.info("Gemini Response:", aiResult);

    if (!aiResult.success) {
      return res.status(500).json({ 
        success: false, 
        error: aiResult.error || "Unknown AI Generation Error" 
      });
    }

    // Persist the generated cover letter to the database
    const newCoverLetter = new CoverLetter({
      user: userId,
      resume: resumeId,
      jobDescription,
      generatedText: aiResult.text
    });

    await newCoverLetter.save();

    // Return the successful response
    return res.status(200).json({
      success: true,
      coverLetter: newCoverLetter
    });
  } catch (error) {
    logger.error("Cover Letter Generation Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
