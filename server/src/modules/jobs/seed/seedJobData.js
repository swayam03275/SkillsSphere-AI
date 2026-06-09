import JobPosting from "../../../database/models/JobPosting.js";
import User from "../../../database/models/User.js";
import logger from "../../../utils/logger.js";

const jobPostingsData = [
  {
    title: "Senior Full Stack Software Engineer",
    description: "We are looking for an experienced Full Stack Engineer to lead the development of our flagship SaaS product. You will be responsible for architecting scalable microservices, building responsive React frontends, and optimizing database performance.",
    requirements: ["Bachelor's in Computer Science", "Strong communication skills"],
    responsibilities: ["Architect systems", "Code reviews", "Mentoring"],
    skills: ["JavaScript", "React", "Node.js", "MongoDB", "AWS", "TypeScript", "Docker"],
    experienceRequired: 5,
    jobLevel: "Mid-Senior Level",
    status: "open",
    location: { city: "Bangalore", state: "Karnataka", country: "India", remote: true },
    salary: { min: 2500000, max: 4500000, currency: "INR", isNegotiable: true },
    keywords: ["software", "engineering", "fullstack", "developer"],
  },
  {
    title: "Frontend Developer (React/Vue)",
    description: "Join our creative team to build stunning and interactive user interfaces. You will work closely with designers to translate Figma mockups into pixel-perfect components. Experience with animations and state management is highly valued.",
    requirements: ["Portfolio of web projects", "Eye for design"],
    responsibilities: ["Build UI components", "Optimize for performance"],
    skills: ["HTML", "CSS", "JavaScript", "React", "Vue.js", "TailwindCSS", "Redux"],
    experienceRequired: 2,
    jobLevel: "Entry Level",
    status: "open",
    location: { city: "Pune", state: "Maharashtra", country: "India", remote: false },
    salary: { min: 800000, max: 1500000, currency: "INR", isNegotiable: false },
    keywords: ["frontend", "web", "ui", "developer"],
  },
  {
    title: "Data Scientist - Machine Learning",
    description: "We are seeking a talented Data Scientist to join our AI research team. You will be tasked with building predictive models, exploring large datasets, and deploying machine learning pipelines into production.",
    requirements: ["Master's or PhD in relevant field", "Strong statistical foundation"],
    responsibilities: ["Develop ML models", "Data wrangling", "Deploy pipelines"],
    skills: ["Python", "TensorFlow", "PyTorch", "SQL", "Pandas", "Machine Learning", "Data Analysis"],
    experienceRequired: 3,
    jobLevel: "Associate",
    status: "open",
    location: { city: "Hyderabad", state: "Telangana", country: "India", remote: true },
    salary: { min: 1800000, max: 3200000, currency: "INR", isNegotiable: true },
    keywords: ["data", "science", "ai", "ml", "python"],
  },
  {
    title: "Product Manager",
    description: "Lead the product vision and strategy for our core consumer app. You will work with engineering, marketing, and design teams to deliver features that drive user engagement and growth.",
    requirements: ["Proven experience in product management", "Analytical mindset"],
    responsibilities: ["Define product roadmap", "Write PRDs", "Analyze metrics"],
    skills: ["Product Management", "Agile", "Scrum", "Jira", "Data Analytics", "UX Strategy"],
    experienceRequired: 4,
    jobLevel: "Mid-Senior Level",
    status: "open",
    location: { city: "Mumbai", state: "Maharashtra", country: "India", remote: false },
    salary: { min: 2000000, max: 4000000, currency: "INR", isNegotiable: true },
    keywords: ["product", "management", "strategy", "pm"],
  },
  {
    title: "DevOps / Cloud Engineer",
    description: "Are you passionate about automation and cloud infrastructure? Join us to maintain and scale our AWS environments, setup CI/CD pipelines, and ensure high availability of our services.",
    requirements: ["AWS Certification preferred", "Experience with infrastructure as code"],
    responsibilities: ["Manage AWS", "Setup CI/CD", "Monitor systems"],
    skills: ["AWS", "Docker", "Kubernetes", "Terraform", "Linux", "CI/CD", "Jenkins"],
    experienceRequired: 3,
    jobLevel: "Associate",
    status: "open",
    location: { city: "Chennai", state: "Tamil Nadu", country: "India", remote: true },
    salary: { min: 1500000, max: 2800000, currency: "INR", isNegotiable: true },
    keywords: ["devops", "cloud", "aws", "infrastructure"],
  },
  {
    title: "Digital Marketing Specialist",
    description: "Drive growth through digital channels. You will manage ad campaigns, optimize SEO, and analyze traffic metrics to maximize ROI. A creative and data-driven approach is essential.",
    requirements: ["Experience with Google Ads", "SEO knowledge"],
    responsibilities: ["Run campaigns", "SEO optimization", "Analytics reporting"],
    skills: ["Digital Marketing", "SEO", "Google Analytics", "Content Strategy", "Social Media"],
    experienceRequired: 2,
    jobLevel: "Entry Level",
    status: "open",
    location: { city: "Delhi", state: "Delhi", country: "India", remote: false },
    salary: { min: 600000, max: 1200000, currency: "INR", isNegotiable: false },
    keywords: ["marketing", "seo", "digital", "ads"],
  },
  {
    title: "UI/UX Designer",
    description: "Shape the user experience of our platforms. You will conduct user research, create wireframes, and design intuitive, beautiful interfaces that our users will love.",
    requirements: ["Portfolio required", "Figma expertise"],
    responsibilities: ["Create wireframes", "User research", "Prototyping"],
    skills: ["UI Design", "UX Design", "Figma", "Adobe XD", "User Research", "Wireframing"],
    experienceRequired: 3,
    jobLevel: "Associate",
    status: "open",
    location: { city: "Bangalore", state: "Karnataka", country: "India", remote: true },
    salary: { min: 1200000, max: 2000000, currency: "INR", isNegotiable: true },
    keywords: ["design", "ui", "ux", "figma"],
  },
  {
    title: "Backend Engineer (Go/Python)",
    description: "Build robust and highly concurrent backend systems. We handle millions of requests per day, and you will ensure our APIs remain fast and reliable under heavy load.",
    requirements: ["Experience with Go or Python", "Database optimization"],
    responsibilities: ["API development", "System architecture", "Database tuning"],
    skills: ["Golang", "Python", "PostgreSQL", "Redis", "Microservices", "REST APIs"],
    experienceRequired: 4,
    jobLevel: "Mid-Senior Level",
    status: "open",
    location: { city: "Pune", state: "Maharashtra", country: "India", remote: true },
    salary: { min: 2200000, max: 3800000, currency: "INR", isNegotiable: true },
    keywords: ["backend", "api", "golang", "python"],
  },
  {
    title: "Human Resources Manager",
    description: "Lead our talent acquisition and employee engagement initiatives. You will be the point of contact for employee relations, payroll management, and fostering a positive workplace culture.",
    requirements: ["Degree in HR or related field", "Strong interpersonal skills"],
    responsibilities: ["Recruitment", "Employee relations", "Policy development"],
    skills: ["Human Resources", "Recruiting", "Employee Engagement", "Payroll", "Onboarding"],
    experienceRequired: 5,
    jobLevel: "Mid-Senior Level",
    status: "open",
    location: { city: "Gurgaon", state: "Haryana", country: "India", remote: false },
    salary: { min: 1500000, max: 2500000, currency: "INR", isNegotiable: true },
    keywords: ["hr", "management", "recruitment", "talent"],
  },
  {
    title: "Financial Analyst",
    description: "Provide key financial insights to guide corporate strategy. You will analyze financial data, create financial models, and assist in budget planning and forecasting.",
    requirements: ["Degree in Finance or Accounting", "Advanced Excel skills"],
    responsibilities: ["Financial modeling", "Budget forecasting", "Variance analysis"],
    skills: ["Financial Analysis", "Excel", "Accounting", "Financial Modeling", "Corporate Finance"],
    experienceRequired: 2,
    jobLevel: "Entry Level",
    status: "open",
    location: { city: "Mumbai", state: "Maharashtra", country: "India", remote: false },
    salary: { min: 700000, max: 1400000, currency: "INR", isNegotiable: false },
    keywords: ["finance", "analyst", "accounting"],
  }
];

export const seedJobData = async () => {
  try {
    const existingJobs = await JobPosting.countDocuments();
    if (existingJobs > 0) {
      logger.info(`[seed] JobPosting already has ${existingJobs} jobs. Clearing...`);
      await JobPosting.deleteMany({});
    }

    // Ensure we have a recruiter to assign these jobs to
    let recruiter = await User.findOne({ role: "recruiter" });
    if (!recruiter) {
      recruiter = await User.create({
        name: "Mock Recruiter",
        email: "recruiter@mock.com",
        password: "hashedpassword123", // Doesn't matter for mock
        role: "recruiter",
        company: "Global Tech Inc.",
        isVerified: true
      });
      logger.info("[seed] Created mock recruiter for seeded jobs.");
    }

    let jobsToInsert = jobPostingsData.map(job => ({
      ...job,
      recruiter: recruiter._id
    }));

    // Duplicate the jobs to create a large dataset (500 jobs total)
    const expandedJobs = [];
    for (let i = 0; i < 50; i++) {
      jobsToInsert.forEach((job, index) => {
        expandedJobs.push({
          ...job,
          title: i === 0 ? job.title : `${job.title} - ${i + 1}`,
        });
      });
    }

    await JobPosting.insertMany(expandedJobs);
    logger.info(`[seed] ✅ ${expandedJobs.length} Job Postings seeded successfully!`);
  } catch (error) {
    logger.error("[seed] Error seeding job data:", error);
  }
};
