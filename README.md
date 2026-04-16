# SkillSphere AI

SkillSphere AI is an AI-powered full-stack platform that connects **learning**, **skill evaluation**, and **career readiness** in one ecosystem.

It helps:

- **Students** learn, practice, and become job-ready
- **Tutors** run live, interactive classes
- **Recruiters** discover skilled and better-matched candidates

The platform combines live classroom experiences with AI/ML-driven career tools such as resume analysis, job matching, interview practice, and performance tracking.

---

## Project Vision

SkillSphere AI aims to simplify the path from learning to hiring by giving users practical, actionable insights at every stage:

- Learn skills in real-time
- Measure progress through dashboards
- Improve career assets (resume and interview performance)
- Connect capabilities to hiring needs

---

## Core Features

1. **Live Interactive Classrooms**  
   Real-time learning sessions with video, chat, and collaboration.

2. **AI Resume Analyzer**  
   Resume scoring with improvement suggestions.

3. **Resume vs Job Description Matcher**  
   ML-assisted comparison between candidate profile and role requirements.

4. **AI Mock Interview System**  
   Interview practice with structured feedback for improvement.

5. **Skill Tracking Dashboard**  
   Performance insights to help students and tutors track growth.

---

## Target Users

- **Students**: build skills, improve resumes, and prepare for jobs
- **Tutors**: teach and manage live learning experiences
- **Recruiters**: identify skilled candidates more efficiently

---

## Project Goals

- Simplify the journey from learning to getting hired
- Provide AI-powered guidance for career growth
- Enable meaningful collaboration between learners and educators
- Keep the platform modular, scalable, and open-source friendly

---

## Tech Stack

- **Frontend:** React.js
- **Backend:** Node.js + Express.js
- **Database:** MongoDB
- **Intelligence Layer:** AI/ML for resume analysis, matching, and recommendations

---

## Scalable Folder Structure

The following structure keeps the project modular and easy to scale for new contributors:

```text
SkillSphere-AI/
├── client/                          # React frontend application
│   ├── public/                      # Static public assets
│   └── src/
│       ├── app/                     # App-level providers, routes, layouts
│       ├── modules/                 # Feature-based modules
│       │   ├── auth/                # Login, registration, user session flows
│       │   ├── classrooms/          # Live class UI, chat, collaboration
│       │   ├── resume-analyzer/     # Resume upload, scoring, suggestions
│       │   ├── job-matcher/         # Resume-to-JD matching UI and results
│       │   ├── mock-interview/      # Interview sessions and feedback views
│       │   └── dashboard/           # Skill/performance analytics UI
│       ├── shared/                  # Reusable UI components and hooks
│       ├── services/                # API communication layer
│       ├── utils/                   # Frontend helper utilities
│       └── assets/                  # Images, icons, static resources
│
├── server/                          # Node.js + Express backend
│   └── src/
│       ├── config/                  # Environment and app configuration
│       ├── modules/                 # Domain-based backend modules
│       │   ├── auth/                # Authentication and authorization
│       │   ├── users/               # Student, tutor, recruiter profiles
│       │   ├── classrooms/          # Live class/session management
│       │   ├── resumes/             # Resume parsing and storage handling
│       │   ├── matching/            # Resume vs JD matching logic
│       │   ├── interviews/          # Mock interview orchestration
│       │   └── analytics/           # Skill tracking and reporting
│       ├── middleware/              # Request validation, auth guards, etc.
│       ├── integrations/            # Third-party services (AI providers, etc.)
│       ├── database/                # Database models/schemas and repositories
│       ├── utils/                   # Backend helper utilities
│       └── app/                     # App bootstrap, routes, and server entry
│
├── ai-ml/                           # AI/ML workflows and model-related logic
│   ├── resume-analysis/             # Resume scoring and feedback pipelines
│   ├── jd-matching/                 # Similarity/matching workflows
│   ├── interview-feedback/          # Interview evaluation logic
│   └── shared/                      # Common data processing utilities
│
├── docs/                            # Product and contributor documentation
│   ├── architecture/                # System architecture explanations
│   ├── api/                         # API behavior and endpoint documentation
│   └── features/                    # Feature-level functional documentation
│
└── README.md                        # Project overview for contributors
```

### Why this structure works

- **Feature-first design:** Easier to assign and scale work across teams
- **Clear boundaries:** Frontend, backend, and AI/ML concerns are separated
- **Contributor-friendly:** New developers can quickly find where to work
- **Future-ready:** Supports adding new learning/career modules without major rewrites

---

## For Open-Source Contributors

If you want to contribute, start by understanding:

1. Which user group your change helps (student, tutor, recruiter)
2. Which module it belongs to (classrooms, resumes, matching, interviews, dashboard)
3. Whether the change impacts frontend, backend, AI/ML, or multiple layers

This approach keeps contributions focused, reviewable, and scalable.

---

## Contributor Resources

- Contribution Guide: `CONTRIBUTING.md`
- Code of Conduct: `CODE_OF_CONDUCT.md`
- Security Policy: `SECURITY.md`
- PR Template: `.github/PULL_REQUEST_TEMPLATE.md`
- Issue Templates: `.github/ISSUE_TEMPLATE/`
- Detailed Structure Notes: `docs/PROJECT_STRUCTURE.md`
- PR Quality Gates: `docs/QUALITY_GATES.md`

## PR Checks and Code Review Safety

Automated checks run on pull requests to `main` through:

- `.github/workflows/pr-quality-checks.yml`

These checks validate docs/workflows and, once app code is added, automatically run lint/test/build for `client`, `server`, and `ai-ml` when their dependency manifests exist.

## Current Repository Status

This repository currently includes a scalable folder scaffold for frontend, backend, AI/ML, and docs. Implementation code can now be added module-by-module while preserving clear boundaries.

## 🚀 Running the Project

### Client

```bash
cd client
npm install
npm run dev
```

### Server

```bash
cd server
npm install
npm run dev
```

### Health Check

Open: http://localhost:5000/health
Expected response:

```json
{ "status": "OK" }
```

