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
  data: any;
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
  preferences?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobPosting {
  id: string;
  _id?: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  salaryRange?: string;
  requirements?: string[];
  status: 'draft' | 'published' | 'closed';
  recruiterId: string;
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
