# Project Structure

This document reflects the current repository structure and progress implemented so far.

## Top-Level Layout

- `client/`: React frontend application
- `server/`: Node.js + Express backend
- `ai-ml/`: AI and ML evaluators and domain placeholders
- `docs/`: Architecture, API, feature, and quality documents

## Current Implementation Progress

### Frontend (`client`)

Implemented:

- App shell and route configuration in `src/app/App.jsx`
- Landing page module in `src/modules/landing/`
- Auth UI modules:
  - `src/modules/auth/Login.jsx`
  - `src/modules/auth/components/ComponentDemo.jsx`
- Resume Analyzer UI flow:
  - `src/modules/resume-analyzer/components/DragDropUpload.jsx`
  - `src/modules/resume-analyzer/components/AnalysisResult.jsx`
  - `src/modules/resume-analyzer/pages/ResumeAnalyzerPage.jsx`
  - `src/modules/resume-analyzer/services/resumeService.js`
- User Profile UI:
  - `src/modules/profile/ProfilePage.jsx`
  - `src/modules/profile/components/ProfileField.jsx`
- Shared UI primitives:
  - `src/shared/components/Button.jsx`
  - `src/shared/components/Input.jsx`
  - `src/shared/components/Select.jsx`

Scaffolded placeholders:

- `classrooms/`
- `dashboard/`
- `job-matcher/`
- `mock-interview/`

### Backend (`server`)

Implemented:

- Express server bootstrap in `server/index.js`
- MongoDB connection setup in `src/database/db.js`
- User model in `src/database/models/User.js`
- Auth registration and login flow:
  - `src/modules/auth/routes.js`
  - `src/modules/auth/controller.js` — register, login, verify-email, forgot/reset-password, google
  - `src/modules/auth/service.js` — loginUser, registerUserAndIssueToken, OTP logic, Google token verify
  - `src/validations/authValidation.js` — Zod schemas including loginSchema
- JWT & RBAC middleware:
  - `src/middleware/authenticate.js` — verifies Bearer token, attaches `req.user`
  - `src/middleware/authorizeRoles.js` — `authorizeRoles(...roles)` factory for route-level role guards
- Resume upload and analysis flow:
  - `src/modules/resumes/routes.js`
  - `src/modules/resumes/controller.js`
  - `src/middleware/uploadResume.js`
  - `src/utils/parseResume.js`
- Static upload serving via `app.use("/uploads", ...)`

Scaffolded placeholders:

- `modules/analytics/`
- `modules/classrooms/`
- `modules/interviews/`
- `modules/matching/`
- `modules/users/`

### AI/ML (`ai-ml`)

Implemented:

- Skill evaluator test coverage in `evaluators/__tests__/skillEvaluator.test.js`
- Keyword evaluator test coverage in `evaluators/__tests__/keywordEvaluator.test.js`

Scaffolded placeholders:

- `resume-analysis/`
- `jd-matching/`
- `interview-feedback/`
- `shared/`

## API Surface (Implemented)

- `GET /health`: server health check
- `POST /api/auth/register`: user registration and JWT issuance
- `POST /api/auth/login`: email + password login, returns JWT and user info
- `POST /api/auth/verify-email`: OTP-based email verification
- `POST /api/auth/resend-otp`: resend verification OTP
- `POST /api/auth/forgot-password`: request password reset OTP
- `POST /api/auth/reset-password`: reset password with OTP
- `POST /api/auth/google`: Google OAuth login
- `POST /api/resume/upload`: upload resume file
- `POST /api/resume/analyze`: parse PDF resume, optional skill match, optional keyword relevance (`jobDescription`)
- `GET /api/resume/result/:id`: placeholder result retrieval endpoint
- `GET /uploads/:filename`: static file access for uploaded files

## Middleware (Implemented)

- `authenticate` — Bearer token verification middleware; attaches verified user to `req.user`
- `authorizeRoles(...roles)` — Role-based access guard; restricts route access to specified roles (student, tutor, recruiter)

## Notes

- Empty directories intentionally use `.gitkeep` so module structure remains versioned.
- As each placeholder module is implemented, add module-level documentation under `docs/features` or inside module folders.
