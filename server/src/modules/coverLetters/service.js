import CoverLetter from "../../database/models/CoverLetter.js";
import Resume from "../../database/models/Resume.js";
import User from "../../database/models/User.js";
import AppError from "../../utils/AppError.js";

/**
 * Generate a personalized cover letter based on a student's resume and a target job description.
 * Utilizes a robust templating engine to inject extracted skills, education, and projects.
 * 
 * @param {string} userId - ID of the student generating the letter
 * @param {string} resumeId - ID of the resume to extract data from
 * @param {string} jobDescription - The target job description
 * @returns {Promise<Object>} The saved CoverLetter document
 */
export const generateCoverLetterService = async (userId, resumeId, jobDescription) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const resume = await Resume.findOne({ _id: resumeId, user: userId });
  if (!resume) {
    throw new AppError("Resume not found or does not belong to you", 404);
  }

  // Extract relevant details for the template
  const name = user.name || "Candidate";
  const email = user.email || "[Your Email]";
  const phone = resume.phone ? ` | ${resume.phone}` : "";
  const linkedin = resume.linkedin ? ` | ${resume.linkedin}` : "";
  
  const formattedSkills = resume.skills && resume.skills.length > 0 
    ? resume.skills.slice(0, 5).join(", ") 
    : "my diverse skill set and technical capabilities";

  const formattedProjects = resume.projects && resume.projects.length > 0
    ? resume.projects[0].title || resume.projects[0].name || "a key project"
    : "various technical projects and hands-on coursework";

  // Construct a professional, dynamic cover letter template
  const generatedText = `${name}
${email}${phone}${linkedin}

Dear Hiring Manager,

I am writing to express my strong interest in the open position as detailed in the job description: "${jobDescription.length > 60 ? jobDescription.substring(0, 60) + "..." : jobDescription}". With a solid foundation in technology and a passion for continuous learning, I am eager to contribute my skills to your team.

Throughout my academic and professional journey, I have developed expertise in ${formattedSkills}. I have successfully applied these skills to real-world scenarios, most notably through my work on ${formattedProjects}. This hands-on experience has equipped me with the problem-solving abilities and technical acumen required to excel in this role.

I am particularly drawn to this opportunity because the requirements align perfectly with my career aspirations. I am confident that my background, combined with my strong work ethic and adaptability, will allow me to make an immediate and positive impact on your organization.

Thank you for considering my application. I have attached my resume for your review and welcome the opportunity to discuss how my qualifications align with the needs of your team.

Sincerely,

${name}`;

  // Save the generated cover letter to the database
  const coverLetter = await CoverLetter.create({
    user: userId,
    resume: resumeId,
    jobDescription,
    generatedText,
  });

  return coverLetter;
};
