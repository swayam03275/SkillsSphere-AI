/**
 * Utility to dynamically generate AI prompts for Cover Letter generation.
 */

export const buildCoverLetterPrompt = ({ resumeData, analysisData, jobDescription }) => {
  // Extract candidate information safely
  const candidateName = resumeData?.personalInfo?.name || "The Candidate";
  const candidateSkills = analysisData?.skills?.present || resumeData?.skills || [];
  
  // Format skills as a comma-separated list or bullet points
  const skillsList = Array.isArray(candidateSkills) 
    ? candidateSkills.map(s => typeof s === 'string' ? s : s.name).join(", ")
    : "Various technical and soft skills";

  // Extract experience and impact metrics safely
  const experiences = resumeData?.experience || [];
  const experienceHighlights = experiences.map((exp, index) => {
    const role = exp.role || exp.title || "Professional";
    const company = exp.company || "Previous Company";
    const impact = exp.description || exp.responsibilities || "Delivered strong results.";
    return `- ${role} at ${company}: ${impact}`;
  }).join("\n");

  // Extract projects safely
  const projects = resumeData?.projects || [];
  const projectHighlights = projects.map(proj => {
    const name = proj.name || proj.title || "Project";
    const desc = proj.description || "Developed impactful solution.";
    return `- ${name}: ${desc}`;
  }).join("\n");

  // Format ATS insights if available
  const atsInsights = analysisData?.atsAnalysis?.feedback || [];
  const insightsList = Array.isArray(atsInsights) 
    ? atsInsights.map(insight => `- ${insight}`).join("\n") 
    : "";

  return `You are an expert career coach and professional copywriter specializing in ATS-optimized job applications.
Your task is to write a highly professional, compelling, and concise cover letter for the candidate based on their resume data and the target job description.

### INSTRUCTIONS:
1. **Professional Tone**: Maintain a formal yet enthusiastic tone.
2. **Conciseness**: Keep the cover letter under 400 words. Use clear, impactful language.
3. **Relevance**: Connect the candidate's specific experiences and skills to the core requirements mentioned in the Job Description.
4. **Measurable Impact**: Highlight their measurable impact and key projects naturally.
5. **ATS-Friendly**: Use standard paragraph structures. Do not use overly complex formatting or markdown tables.
6. **No Placeholders for Name if provided**: Use the candidate's real name if available.
7. **Address**: Address it to "Hiring Team" or "Hiring Manager" if a specific name is not provided in the JD.

---

### CANDIDATE PROFILE
**Name**: ${candidateName}

**Core Skills**: 
${skillsList}

**Key Experience**:
${experienceHighlights ? experienceHighlights : "No specific experience provided."}

**Notable Projects**:
${projectHighlights ? projectHighlights : "No specific projects provided."}

${insightsList ? `**ATS Intelligence Context (for your reference to emphasize strengths)**:\n${insightsList}\n` : ""}

---

### TARGET JOB DESCRIPTION
${jobDescription || "No job description provided. Write a strong general cover letter highlighting the candidate's top skills."}

---

### REQUIRED OUTPUT:
Generate ONLY the final cover letter text. Do not include any introductory remarks like "Here is your cover letter". Ensure proper spacing between paragraphs.
`;
};
