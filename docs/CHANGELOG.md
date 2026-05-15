# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

> This section tracks work in progress by contributors under NSOC'26 & GSSoC'26.
> Move items to a versioned release once they are merged and stable.

### Planned
- Live interactive classroom module (video, chat, collaboration)
- AI Mock Interview system with structured feedback
- Resume vs Job Description matcher (ML-assisted)
- Skill Tracking Dashboard for students and tutors
- Recruiter-facing candidate discovery interface

---

## [0.1.0] - 2025-05-15

Initial working foundation of the SkillSphere AI platform, covering
authentication, resume handling, and core AI/ML evaluation pipelines.

### Added

#### Authentication & Security
- OTP-based email verification during user registration (`POST /api/auth/register`, `POST /api/auth/verify-email`)
- Resend OTP endpoint (`POST /api/auth/resend-otp`)
- Secure forgot-password and password-reset flow with user-enumeration protection (`POST /api/auth/forgot-password`, `POST /api/auth/reset-password`)
- 6-digit OTP generation with 5-minute expiry and brute-force protection (max 5 attempts)
- JWT-based session management with configurable expiry (`JWT_SECRET`, `JWT_EXPIRES_IN`)
- Dual-mode email service: console logging for development, SMTP for production
- Input validation via Zod schemas for all authentication flows
- Reusable `sendEmail` utility for system-wide notifications

#### Resume Module
- Resume file upload via `POST /api/resume/upload` using Multer middleware
- PDF parsing and candidate information extraction (`utils/parseResume.js`)
- Resume analysis endpoint (`POST /api/resume/analyze`) integrating skill, keyword, and experience evaluation
- Result retrieval endpoint (`GET /api/resume/result/:id`)
- Static file serving for uploaded resumes (`GET /uploads/:filename`)
- MongoDB persistence for resume metadata and parsed candidate data (`database/models/Resume.js`)

#### AI/ML Evaluators (`ai-ml/evaluators/`)
- **Skill Evaluator** (`skillEvaluator.js`): compares resume skills against job description requirements; returns matched skills, missing skills, extra skills, and a weighted skill score
- **Keyword Evaluator** (`keywordEvaluator.js`): keyword relevance analysis between resume text and job description; returns matched/missing keywords and a weighted keyword score (default weight `0.2`); activated via optional `jobDescription` field on the analyze endpoint
- **Experience Evaluator** (`experienceEvaluator.js`): extracts and compares candidate vs required experience (supports `18 months`, `1 year 6 months`, `2+ years` formats); returns `score`, `weight`, `candidateExperience`, `requiredExperience`, and `experienceGap` with explainable feedback
- Unit tests for experience evaluator (`ai-ml/evaluators/__tests__/experienceEvaluator.test.js`)

#### Frontend
- Landing page (`modules/landing/LandingPage.jsx`) with Navbar, Card, and Button shared components
- Authentication pages: Login (`modules/auth/Login.jsx`) and Register (`modules/auth/Register.jsx`)
- Resume Analyzer UI: drag-and-drop upload (`DragDropUpload.jsx`), analysis results display (`AnalysisResult.jsx`), and resume service layer (`resumeService.js`) at route `/resume-analyzer`
- Shared reusable primitives: `Input.jsx`, `Button.jsx`, `Select.jsx` with label, error state, and disabled support
- Component showcase/demo at route `/demo`

#### Infrastructure & Developer Experience
- Modular monorepo structure: `client/`, `server/`, `ai-ml/`, `docs/`
- GitHub Actions workflow for PR quality checks (`.github/workflows/pr-quality-checks.yml`)
- PR template and issue templates (`.github/`)
- Contributor documentation: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- Project structure and architecture notes: `docs/PROJECT_STRUCTURE.md`, `docs/QUALITY_GATES.md`
- Health check endpoint (`GET /health`)
- Environment variable template (`server/example.env`)
- Skill tracking module scaffolding (directory structure, no business logic yet)

---

[Unreleased]: https://github.com/swayam03275/SkillsSphere-AI/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/swayam03275/SkillsSphere-AI/releases/tag/v0.1.0
