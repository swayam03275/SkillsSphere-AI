# Project Structure

This guide describes the current SkillsSphere AI repository and points contributors to the main routes, feature modules, services, models, and tests.

## Repository Layout

```text
SkillsSphere-AI/
|-- client/                  React + Vite frontend
|-- server/                  Express + MongoDB API and Socket.IO server
|-- ai-ml/                   JavaScript resume evaluation and recommendation pipeline
|-- interview-ai-service/    FastAPI interview transcription and evaluation service
|-- docs/                    Architecture, API, feature, workflow, and quality guides
|-- scripts/                 Workspace setup and development helpers
|-- package.json             npm workspace and Turbo commands
`-- turbo.json               Workspace task configuration
```

The npm workspace contains `client`, `server`, and `ai-ml`. The Python interview service is managed separately through its `requirements.txt` and Dockerfile.

## Frontend (`client`)

### Application Entry Points

- `src/app/main.tsx`: React bootstrap.
- `src/app/App.tsx`: lazy-loaded route definitions and global application components.
- `src/store/index.ts`: Redux store configuration.
- `src/features/`: shared Redux slices for authentication, classrooms, interviews, and notifications.
- `src/services/apiClient.js`: common authenticated API request helper.
- `src/shared/`: reusable components, contexts, and hooks.

### Frontend Routes

Public routes:

- `/`: landing page.
- `/docs`, `/blog`, `/careers`, `/status`: informational pages.
- `/privacy`, `/terms`, `/cookies`: policy pages.
- `/login`, `/register`, `/auth/callback`: authentication and OAuth.
- `/forgot-password`, `/reset-password`, `/verify-email`: account recovery and verification.

Authenticated shared routes:

- `/dashboard`: role-aware dashboard.
- `/notifications`: notification center.
- `/onboarding`: role onboarding.
- `/profile`: profile and preference management.

Student routes:

- `/jobs`: job board with All Jobs, Recommended, and Saved views.
- `/job-matcher`: resume-first AI job matching.
- `/my-applications`: application tracking and student CRM status.
- `/resume-analyzer`: upload and analyze resumes.
- `/resume-history`: resume analysis history and comparisons.
- `/roadmap`: learning roadmap and collaboration.
- `/mock-interview`: interview setup.
- `/mock-interview/history`: interview history and analytics.
- `/mock-interview/bookmarks`: bookmarked interview questions.
- `/mock-interview/:id`: active interview session.
- `/mock-interview/:id/results`: interview results.

Recruiter routes:

- `/recruiter/jobs`: recruiter job management.
- `/recruiter/jobs/new`: create a job posting.
- `/recruiter/jobs/edit/:id`: edit a job posting.
- `/recruiter/jobs/:id/applicants`: applicant review and status management.
- `/recruiter/analytics`: hiring analytics.
- `/recruiter/talent-finder`: privacy-aware candidate discovery, matching, and invitations.

Tutor and classroom routes:

- `/tutor/analytics`: tutor analytics.
- `/tutor/roadmaps`: tracked student roadmaps.
- `/tutor/interviews`: assigned interview sessions.
- `/tutor/interviews/:id`: interview review and feedback.
- `/classrooms`: classroom dashboard.
- `/classrooms/:roomId`: live classroom workspace.

Routes are protected through `src/shared/components/ProtectedRoute.jsx`, including role-specific access where required.

### Feature Modules

Feature code is organized under `src/modules/`:

| Module | Current responsibility |
| --- | --- |
| `ai-assistant/` | In-app AI chat widget and message presentation. |
| `analytics/` | Tutor analytics dashboard. |
| `auth/` | Login, registration, OAuth callback, verification, password recovery, and onboarding. |
| `classrooms/` | Classroom creation/joining, video tiles, WebRTC, whiteboard, chat, and shared code editor UI. |
| `dashboard/` | Student, recruiter, and tutor dashboards plus resume history. |
| `job-matcher/` | Personalized resume-based job recommendations and match presentation. |
| `landing/` | Marketing, policy, documentation, status, and not-found pages. |
| `mock-interview/` | Interview lobby, live session, audio/socket state, results, history, bookmarks, and tutor review. |
| `notifications/` | Notification list, dropdown, hooks, and actions. |
| `profile/` | Profile editing, avatar management, and privacy/notification preferences. |
| `recruiter-jobs/` | Job posting management, applicants, analytics, insights, and Talent Finder. |
| `resume-analyzer/` | Resume upload, analysis results, PDF export, comparisons, and job-description input. |
| `roadmap/` | Student roadmap, tutor collaboration, milestones, resources, and contribution summaries. |
| `student-jobs/` | Job discovery, recommendations, saved jobs, applications, filters, and application forms. |

### Frontend Services

Module-specific API adapters live beside their features:

- `modules/classrooms/services/classroomService.js`
- `modules/dashboard/services/dashboardService.js`
- `modules/job-matcher/services/matcherService.js`
- `modules/mock-interview/services/interviewService.js`
- `modules/profile/services/profileService.js`
- `modules/recruiter-jobs/services/jobPostingService.js`
- `modules/recruiter-jobs/services/talentFinderService.js`
- `modules/resume-analyzer/services/resumeService.js`
- `modules/roadmap/services/roadmapService.js`
- `modules/student-jobs/services/jobService.js`

Cross-feature services live in `src/services/`, including authentication, file access, notifications, and the shared API client.

### Shared UI

`src/shared/components/` contains common controls and application infrastructure, including:

- form primitives and buttons;
- loading, error, empty, skeleton, and pagination states;
- `JobViewerCard` and job detail components;
- navigation, footer, command palette, and protected routes;
- notifications and Socket.IO listeners;
- dialogs, status timelines, cover-letter modal, and toast provider.

### Frontend Tests

The frontend uses Vitest, React Testing Library, and Jest DOM.

- Feature tests are colocated in `__tests__/` directories or as `*.test.jsx` / `*.test.js`.
- Shared component tests live in `src/shared/components/__tests__/`.
- Redux slice tests live under `src/features/**/__tests__/`.
- API client and utility tests live under `src/services/__tests__/` and `src/utils/__tests__/`.
- Accessibility coverage starts at `src/accessibility/accessibility.test.jsx`.
- Playwright is available through `npm run test:e2e`.

Useful commands:

```bash
npm --workspace client run test:run
npm --workspace client run lint
npm --workspace client run build
```

## Backend (`server`)

### Application Entry Points

- `index.js`: Express bootstrap, security middleware, rate limiting, Swagger, API mounts, Socket.IO setup, and error handling.
- `src/database/db.js`: MongoDB connection.
- `src/config/`: environment, Redis, Cloudinary, OAuth, Swagger, evaluator, logging, and security configuration.
- `src/middleware/`: authentication, RBAC, validation, uploads, rate limiting, caching, file authorization, and request logging.
- `src/utils/`: shared errors, parsing, encryption, signed URLs, cache helpers, deletion cleanup, email, logging, and AI helpers.
- `src/validations/`: Zod schemas for auth, users, jobs, recruiters, classrooms, and cover letters.

### Mounted API Modules

`server/index.js` mounts these route groups:

| Base path | Module | Main capabilities |
| --- | --- | --- |
| `/api/auth` | `modules/auth/` | Registration, login/logout, email verification, password reset, Google OAuth, current user. |
| `/api/resume` | `modules/resumes/` | Upload, analysis, resume library, active resume, rename/delete, comparison, cover letters. |
| `/api/jobs` | `modules/jobs/` | Job discovery, recommendations, saved jobs, applications, recruiter jobs, analytics, CSV export. |
| `/api/roadmap` | `modules/roadmap/` | Student progress, roadmap sync, tutor collaboration, recruiter tracking, comments. |
| `/api/matching` | `modules/matching/` | Resume-to-job evaluation and stored recommendations. |
| `/api/dashboard` | `modules/dashboard/` | User analysis history. |
| `/api/cover-letters` | `modules/coverLetters/` | Generate, list, read, and delete cover letters. |
| `/api/classrooms` | `modules/classrooms/` | Create, list, join, inspect, and end classroom sessions. |
| `/api/users` | `modules/users/` | Onboarding, profile, avatar, preferences, privacy, and account deletion. |
| `/api/interviews` | `modules/interviews/` | Topics, sessions, answers, results, history, bookmarks, tutor feedback. |
| `/api/errors` | `modules/errors/` | Client error reporting. |
| `/api/files` | `modules/files/` | Authorized resume/avatar access and signed file URLs. |
| `/api/notifications` | `modules/notifications/` | Notification listing, counts, read state, creation, and deletion. |
| `/api/analytics` | `modules/analytics/` | Role-aware dashboards and skill-gap analytics. |
| `/api/recruiter` | `modules/recruiter/` | Talent Finder, candidate matching, and invitations. |
| `/api/chat` | `modules/ai-assistant/` | Rate-limited AI assistant responses. |

Swagger UI is available at `/api-docs`, and `/health` exposes server health.

### Representative API Routes

Authentication:

- `GET /api/auth/me`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`

Resume and matching:

- `POST /api/resume/upload`
- `POST /api/resume/analyze`
- `GET /api/resume/me/latest`
- `GET /api/resume/list`
- `PATCH /api/resume/:id/active`
- `PATCH /api/resume/:id/rename`
- `DELETE /api/resume/:id`
- `POST /api/resume/compare`
- `POST /api/resume/:id/cover-letter`
- `POST /api/matching/evaluate`
- `GET /api/matching/recommended`

Jobs and recruitment:

- `GET /api/jobs`
- `GET /api/jobs/recommendations?sortBy=score|salary|date`
- `GET /api/jobs/saved`
- `POST /api/jobs/:id/save`
- `DELETE /api/jobs/:id/save`
- `POST /api/jobs/:id/apply`
- `PATCH /api/jobs/:id/withdraw`
- `GET /api/jobs/my-applications/details`
- `GET /api/jobs/recruiter`
- `POST /api/jobs`
- `GET /api/jobs/:id/applications`
- `GET /api/jobs/:id/applications/export`
- `GET /api/recruiter/talent-finder`
- `POST /api/recruiter/match-candidate`
- `POST /api/recruiter/invite-candidate`

Interviews, classrooms, and roadmaps:

- `POST /api/interviews/start`
- `POST /api/interviews/:id/answer`
- `POST /api/interviews/:id/complete`
- `GET /api/interviews/:id/results`
- `GET /api/interviews/history`
- `GET /api/interviews/bookmarks`
- `PATCH /api/interviews/:id/questions/:questionId/bookmark`
- `POST /api/classrooms/create`
- `GET /api/classrooms/active`
- `GET /api/classrooms/:roomId`
- `PATCH /api/classrooms/:roomId/end`
- `GET /api/roadmap/me`
- `POST /api/roadmap/sync`
- `PATCH /api/roadmap/update-topic`
- `GET /api/roadmap/tutor/students`
- `GET /api/roadmap/recruiter/tracked`

### Backend Modules and Services

Most backend features follow:

```text
modules/<feature>/
├── routes.js       Express routes and middleware
├── controller.js   Request/response handling
├── service.js      Business logic and persistence orchestration
└── __tests__/      Focused module tests
```

Some modules intentionally differ:

- `recruiter/` keeps Talent Finder logic in its controller.
- `recruiterIntelligence/` evaluates applicant/job alignment for recruiter insights.
- `classrooms/` and `interviews/` include Socket.IO handlers.
- `resumes/` includes evaluator adapters and cover-letter handling.
- `jobs/` includes seed data and extensive filtering, analytics, recommendations, applications, and saved-job logic.

### Database Models

Models live in `src/database/models/`:

- `User`: roles, encrypted identity fields, onboarding, access level, and preferences.
- `Resume`: parsed resumes, skills, analysis scores, files, and active-version state.
- `AnalysisHistory`: persisted analysis history.
- `JobPosting`: recruiter-owned jobs.
- `JobApplication`: application lifecycle and student/recruiter statuses.
- `SavedJob`: unique student/job bookmarks.
- `MatchResult`: stored recommendation and matching output.
- `LearningProgress`: roadmaps, milestones, tutor/recruiter tracking, and contribution progress.
- `RoadmapComment`: roadmap collaboration comments.
- `InterviewSession`, `QuestionBank`, `ConceptGraph`: mock interview sessions and question data.
- `ClassroomSession`: live classroom state and collaboration history.
- `Notification`: in-app notifications and metadata.
- `CoverLetter`: generated cover-letter records.
- `SemanticCache`: reusable AI evaluation cache.

### Real-Time Features

Socket.IO support includes:

- classroom presence, chat, WebRTC signaling, whiteboard, and code editor events;
- mock interview observers and tutor/conductor updates;
- roadmap collaboration updates;
- notification delivery and dashboard refresh events.

Socket authentication and rate limiting live in `src/middleware/`, while feature socket handlers live beside their modules.

### Backend Tests

The backend uses the Node.js test runner with module mocks.

- Module tests: `src/modules/**/__tests__/`
- Model tests: `src/database/models/__tests__/`
- Middleware tests: `src/middleware/__tests__/`
- Validation tests: `src/validations/__tests__/`
- Utility tests: `src/utils/__tests__/`
- Import smoke test: `src/__tests__/module-load.test.js`

Coverage includes authentication, privacy filtering, saved jobs, job filtering and recommendations, resume analysis, interview bookmarks/history/audio validation, classrooms and socket handlers, notifications, profile preferences, cascading deletion, signed files, and security utilities.

Useful commands:

```bash
npm --workspace server test
npm --workspace server run lint
npm --workspace server run depcruise:validate
```

## AI/ML Package (`ai-ml`)

The JavaScript AI/ML package is implemented and used by the server.

Key areas:

- `evaluators/`: ATS optimization, consistency, experience, impact, keywords, readability, semantics, skills, and technical standards.
- `pipeline/runPipeline.js`: evaluator execution.
- `pipeline/evaluatorContract.js`: normalized evaluator result contract.
- `pipeline/aggregator.js`: weighted score aggregation.
- `pipeline/recommendationEngine.js`: job recommendation scoring.
- `pipeline/safeEval.js` and `withTimeout.js`: evaluator isolation and timeout handling.
- `utils/gapAnalyzer.js`: missing-skill analysis.
- `utils/resumeClassifier.js`: resume classification.
- `utils/skillNormalizer.js`: normalized skill matching.
- `config/`: scoring weights, benchmarks, and keyword configuration.
- `data/`: technical keywords and power verbs.

Tests are colocated under `evaluators/__tests__/`, `pipeline/__tests__/`, and the package-level `__tests__/`.

```bash
npm --workspace ai-ml test
```

## Interview AI Service (`interview-ai-service`)

The FastAPI service provides interview-specific AI processing:

- `main.py`: application entry point and router registration.
- `routers/transcription.py`: audio transcription API.
- `routers/evaluation.py`: answer evaluation API.
- `services/whisper_service.py`: faster-whisper speech-to-text.
- `services/semantic_service.py`: semantic similarity scoring.
- `services/nlp_service.py`: NLP and concept analysis.
- `services/communication_analyzer.py`: communication-quality signals.
- `cors_config.py`: environment-aware CORS policy.
- `tests/`: CORS and transcription-limit tests.
- `Dockerfile`: container configuration.

See `interview-ai-service/README.md` for service-specific setup.

## Documentation

The `docs/` directory includes:

- `api/`: endpoint contracts.
- `architecture/`: evaluator and system architecture.
- `features/`: role and feature documentation.
- `workflows/`: classroom, roadmap, interview, and recruitment workflows.
- `API_NOTIFICATIONS.md`: notification API.
- `QUALITY_GATES.md`: expected validation and quality checks.
- `SECURITY_ENVIRONMENT.md`: environment and secret-handling guidance.

## Contributor Guide

When adding a feature:

1. Add frontend code under the closest `client/src/modules/<feature>/` directory.
2. Put feature API calls in that module's `services/` directory.
3. Reuse `client/src/shared/` for genuinely cross-feature UI or hooks.
4. Add backend routes/controllers/services under `server/src/modules/<feature>/`.
5. Add or update Mongoose models in `server/src/database/models/`.
6. Validate request bodies through `server/src/validations/` and `validateBody`.
7. Protect routes with `protect`, `authorizeRoles`, and `requireFullAccess` as appropriate.
8. Add tests next to the changed module and update relevant feature/workflow documentation.

Prefer documenting stable responsibilities and public routes rather than listing every internal file. The source tree remains the final authority when implementation and documentation differ.
