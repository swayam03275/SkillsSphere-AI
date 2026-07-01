// Global API Responses
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  status: number;
  message: string;
  errors: Record<string, string>;
  data: unknown;
}

// Domain Models
export interface User {
  id: string;
  _id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'student' | 'recruiter' | 'admin' | 'tutor' | string;
  avatarUrl?: string;
  preferences?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobLocation {
  city?: string;
  state?: string;
  country?: string;
  remote?: boolean;
}

export interface JobSalary {
  min?: number;
  max?: number;
  currency?: string;
  isNegotiable?: boolean;
}

export type JobLevel = "Internship" | "Entry Level" | "Associate" | "Mid-Senior Level" | "Director" | "Executive";

export interface JobPosting {
  id: string;
  _id?: string;
  title: string;
  company: string;
  companyWebsite?: string;
  description: string;
  location?: JobLocation | string;
  salaryRange?: string;
  salary?: JobSalary;
  requirements?: string[];
  responsibilities?: string[];
  skills?: string[];
  keywords?: string[];
  experienceRequired?: number;
  jobLevel?: JobLevel;
  status: 'open' | 'draft' | 'closed' | 'published';
  recruiterId: string;
  recruiter?: {
    name?: string;
    email?: string;
    company?: string;
    companyWebsite?: string;
    linkedinUrl?: string;
  };
  type?: string;
  openings?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Classroom {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  tutorId: string;
  students: string[] | User[];
  schedule?: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface Notification {
  id: string;
  _id?: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface MockInterview {
  id: string;
  _id?: string;
  userId: string;
  jobRole: string;
  status: 'pending' | 'completed' | 'failed';
  score?: number;
  feedback?: string;
  createdAt: string;
}

// Generic Component Props
export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
