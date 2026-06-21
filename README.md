<a name="top"></a>
![----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png)

![NSOC'26](https://img.shields.io/badge/NSOC-2026-orange?style=for-the-badge)

**This project is officially registered under Nexus Spring of Code 2026.**

![----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png)

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
   Resume scoring with improvement suggestions. (Route: `/resume-analyzer`)
   - Drag & Drop / clipboard paste upload
   - ATS score with detailed analysis dashboard
   - Missing keyword identification
   - **Industry Benchmarking Mode** — Analyzes your resume against market standards even without a specific Job Description (BM badge).
   - Live PDF document preview
   - **Unified History Hub** — Tabbed navigation to review both past Resume Analyses and generated Cover Letters with complete pagination.
   - **Advanced ATS Evaluators** — Built-in Readability Domain Scoring and Formatting Content Scoring engines for enhanced accuracy.

3. **Resume vs Job Description Matcher**
   ML-assisted comparison between candidate profile and role requirements.
   - **Semantic Resume vs Job Description Matching** — Embedding-based semantic similarity scoring using Hugging Face Inference API (all-MiniLM-L6-v2, free tier)
   - Complements keyword overlap with contextual alignment detection
   - Cosine similarity comparison for conceptually related phrases (e.g., "workflow orchestration" vs "pipeline automation")

4. **AI Mock Interview System**
   Adaptive interview practice with real-time AI evaluation. (Route: `/mock-interview`)
   - Topic selection (React, Node.js, DSA) with difficulty levels
   - 5-question sessions with randomized, non-repeating questions
   - AI-powered scoring: technical accuracy, communication quality, and concept relevance
   - Live score feedback after each answer
   - Results dashboard with overall score ring, per-question breakdown, and weak concepts
   - Interview history with paginated session tracking
   - Python AI microservice for NLP evaluation (spaCy + sentence-transformers)
   - Fail-soft mode: falls back to mock scores when AI service is unavailable

5. **Interactive Learning Roadmaps**
   Personalized skill-trees generated from AI analysis. (Route: `/roadmap`)
   - Visual vertical progression path with interactive milestones
   - Real-time "Job-Readiness" percentage tracking
   - Direct integration with Dashboard for "Next Step" guidance
   - Automatic sync with latest Resume Analysis feedback

6. **Skill Tracking Dashboard**
   Performance insights and "Next Learning Milestone" guidance to help students track growth. Features a standardized, "Gold Standard" aesthetic layout using vibrant multi-color gradients and meticulously aligned responsive grids.

7. **AI Cover Letter Intelligence System**
   AI-powered career application workflow extending the Resume Intelligence Engine.
   - Generates ATS-friendly, role-specific cover letters using parsed resume data and Gemini AI
   - Dynamic prompt engineering to prevent hallucinations and enforce professional tone
   - **Tone Personalization**: Professional, Formal, Confident, Concise, Startup-Friendly, Creative
   - **Multi-language Support**: English, Hindi, German, French, Spanish
   - Instant regeneration with dynamic tone and language switching
   - Professional PDF and TXT export with recruiter-ready formatting
   - Persistent cover letter history dashboard for reusing generated content

8. **Secure Authentication & Email Verification**
   OTP-based registration and password recovery system with hardened security constraints.
   - 6-digit email OTP verification
   - Secure Password Reset (Forgot Password) flow
   - Protection against user enumeration and open redirects
   - Hardened OAuth state validation and strict OTP attempt limiting
   - API endpoints secured against unauthorized access

9. **AI Talent Finder & Candidate Direct Search**
   Advanced talent discovery search engine for recruiters. (Route: `/recruiter/talent-finder`)
   - Search the database of opted-in candidate resumes by name, email, skills, and background text
   - Advanced filters for technical specializations, graduation year range, and minimum ATS scores
   - Dynamic AI pipeline evaluation to compute a match scorecard against any of the recruiter's active jobs
   - One-click recruiter invitation triggers that deliver real-time Socket.IO notifications to candidate dashboards

10. **Enterprise-Grade Infrastructure & Classrooms**
    - **Live Classrooms**: Interactive environments featuring native Picture-in-Picture (PiP), synchronized whiteboard/code editors, real-time member sync, and host production teardown safeguards.
    - **Performance Architecture**: Implements Database Connection Pooling, Redis Cache Eviction policies, and Gateway Query Complexity limits for high availability.
    - **Security Enhancements**: Features a robust webhook signing framework, secure socket hardening, and comprehensive log rotation profiles.
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
- **Interview AI Service:** Python + FastAPI + spaCy + sentence-transformers

---

## ⚡ Quick Start (Unified Setup)

To simplify setup, you can now run the entire project using root-level scripts.

### Install all dependencies

```bash
### Install all dependencies

If the unified installer script encounters execution restriction errors on your system terminal, run the installation manually using directory prefixes:

```bash
npm install
npm install --prefix Backend
npm install --prefix Frontend
```

This installs:

- Root dependencies
- Client dependencies
- Server dependencies
- Python microservice dependencies (creates `interview-ai-service/venv` and downloads spaCy model)

### Run everything (client + server + Python microservice) from root

```bash
npm run dev
```

This will start:

- Frontend (client)
- Backend (server)
- Interview AI Service (Python microservice on port 8000)

### One command (first-time or fresh clone)

```bash
npm run quickstart
```

### Optional: run only client + server (no Python service)

```bash
npm run dev:web
```

> ⚠️ Backend requires environment variables to run properly. Refer to the Environment Setup section below.

## 🐳 Run with Docker (Recommended)

To avoid manual installation of Python dependencies, Node modules, and OS-level packages (like FFmpeg), you can run the entire stack using Docker.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Steps
1. Clone the repository and navigate to the root directory.
2. Ensure you have created your local `.env` file from `.env.example`. Keep real secrets out of git.
3. Run the following command from the root directory:

   ```bash
   docker-compose up --build
   ```

Access the applications:
- **Client**: [http://localhost:5173](http://localhost:5173)
- **Server**: [http://localhost:5000](http://localhost:5000)
- **AI Microservice**: [http://localhost:8000](http://localhost:8000)

To stop the containers, press `Ctrl+C` or run `docker-compose down`.

## Scalable Folder Structure

The following structure keeps the project modular and easy to scale for new contributors:

```text
SkillSphere-AI/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── modules/                 # Feature-based modules (Auth, Resumes, recruiter-jobs, etc.)
│   │   │   └── recruiter-jobs/      # Talent Finder dashboard, page, services
│   │   ├── shared/                  # Reusable UI components
│   │   └── services/                # API service layer
├── server/                          # Express backend
│   ├── src/
│   │   ├── modules/                 # Backend business logic (Auth, Resumes, recruiter, etc.)
│   │   │   └── recruiter/           # Talent Finder controller and routes
│   │   ├── database/                # Mongoose models (User, Resume, JobApplication, LearningProgress)
│   │   └── middleware/              # Auth, RBAC, and Upload handlers
├── ai-ml/                           # AI/ML intelligence layer
│   ├── evaluators/                  # Skill, Keyword, and Experience matchers
│   └── pipeline/                    # Unified analysis pipeline
├── interview-ai-service/            # Python AI microservice (FastAPI)
│   ├── routers/                     # API route handlers
│   ├── services/                    # Whisper STT, NLP, Semantic scoring
│   └── requirements.txt             # Python dependencies
├── docs/                            # Project documentation
└── ...                              # Configuration and root files
```

## API Endpoints (Implemented)

- `GET /health`
- `POST /api/auth/register` (v2: now includes OTP verification)
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-otp`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/resume/upload`
- `POST /api/resume/analyze` (v2: uses latest-only upsert flow)
- `GET /api/resume/me/latest`: fetch user's latest parsed resume (no raw resumeText)
- `GET /api/resume/result/:id`
- `POST /api/resume/:id/cover-letter`: Generate an AI cover letter
- `GET /api/cover-letters`: Fetch user's cover letter history
- `GET /api/roadmap/me`: fetch user's learning roadmap and progress
- `POST /api/roadmap/sync`: sync roadmap with latest analysis suggestions
- `PATCH /api/roadmap/update-topic`: update status of a specific roadmap milestone

- `GET /api/recruiter/talent-finder`: search candidate directory of opted-in student resumes (Recruiter only; filters: `query`, `specializations`, `gradYearMin`, `gradYearMax`, `atsMin`, `limit`, `page`)
- `POST /api/recruiter/match-candidate`: run Gemini AI matching pipeline on candidate's resume text against a specific job description (Recruiter only)
- `POST /api/recruiter/invite-candidate`: send job application invitation to a candidate (Recruiter only; sends real-time socket notification)

- `GET /uploads/:filename`
- `POST /api/jobs`: create a new job (Recruiter only)
- `GET /api/jobs`: list all published jobs (supports `designation`, `minSalary`, `maxSalary`, `postedWithin` filters)
- `GET /api/jobs/recruiter`: list jobs posted by the authenticated recruiter
- `GET /api/jobs/:id`: get job details

- `GET /api/interviews/topics`: list interview topics with question counts
- `POST /api/interviews/start`: start a new interview session
- `GET /api/interviews/:id`: get session details
- `POST /api/interviews/:id/answer`: submit an answer for evaluation
- `POST /api/interviews/:id/complete`: end interview and calculate scores
- `GET /api/interviews/:id/results`: get detailed results
- `GET /api/interviews/history`: paginated interview history
- `GET /api/interviews/ai-status`: check Python AI service health

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
- Secure Environment Setup: `docs/SECURITY_ENVIRONMENT.md`

## PR Checks and Code Review Safety

Automated checks run on pull requests to `main` through:

- `.github/workflows/pr-quality-checks.yml`

These checks validate docs/workflows and, once app code is added, automatically run lint/test/build for `client`, `server`, and `ai-ml` when their dependency manifests exist.

## 🚀 Running the Project (Manual Setup)

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

### Interview AI Service (Python microservice)

This service powers speech-to-text transcription and answer evaluation for the Mock Interview module. The Node backend can run without it (it falls back to mock scores), but for real AI evaluation you should start it locally.

**Requirements:** Python 3.10+

```bash
cd interview-ai-service

# Create virtual environment
python -m venv venv

# Activate
# Linux/Mac:
# source venv/bin/activate
# Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy English model
python -m spacy download en_core_web_sm

# Run the API (default port 8000)
python -m uvicorn main:app --reload --port 8000
```

Health check: `http://localhost:8000/health`

Optional env var (defaults to `base`): `WHISPER_MODEL_SIZE=tiny|base|small|medium|large-v3`

## 🔐 Environment Variables Setup

> ⚠️ The backend will not start without configuring the required environment variables.

### Server

1. Copy the root example file:

```bash
cp .env.example .env
```

2. Update required values in `.env`:

- `MONGO_URI`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GEMINI_API_KEY` (Required for AI Cover Letter Generation)
- `REDIS_URL` (Required for caching API responses, e.g., redis://localhost:6379)

For secure setup, pre-commit protection, and credential rotation steps, see `docs/SECURITY_ENVIRONMENT.md`.

```env
# AI/ML Configuration (Required for semantic matching — free tier)
HF_API_TOKEN=your_hugging_face_token

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Email Setup (if using console/smtp directly in server)
EMAIL_SERVICE_MODE=console
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="SkillsSphere AI" <your-email@gmail.com>

# Evaluator toggles and weights (optional)
EVALUATOR_SKILL_MATCH_ENABLED=true
EVALUATOR_KEYWORD_MATCH_ENABLED=true
EVALUATOR_EXPERIENCE_MATCH_ENABLED=true
EVALUATOR_SKILL_MATCH_WEIGHT=1
EVALUATOR_KEYWORD_MATCH_WEIGHT=0.2
EVALUATOR_EXPERIENCE_MATCH_WEIGHT=0.2

# Interview AI Service (Python microservice for answer evaluation)
INTERVIEW_AI_URL=http://localhost:8000
INTERVIEW_AI_TIMEOUT=10000
INTERVIEW_AI_TRANSCRIBE_TIMEOUT=30000
```

### Client

1. Copy the root example file if you have not already:

```bash
cp .env.example .env
```

2. For local development, keep:

- `MONGO_URI` or `MONGODB_URI`
- `PORT` (backend default: `5000`)
- `JWT_SECRET` (required for JWT registration)
- `JWT_EXPIRES_IN` (optional, default is `7d`)
- `HF_API_TOKEN` (free — required for semantic resume-to-job-description matching, get at <https://huggingface.co/settings/tokens>)
- `VITE_API_URL=http://localhost:5000`

## 🔐 Google OAuth Setup

- `JWT_SECRET=replace_with_a_long_random_secret`
- `JWT_EXPIRES_IN=7d`
- `EMAIL_SERVICE_MODE=console` (Use "smtp" for real emails)
- `EMAIL_HOST=smtp.mailtrap.io`
- `EMAIL_PORT=2525`
- `EMAIL_USER=your_smtp_username`
- `EMAIL_PASS=your_smtp_password`
- `HF_API_TOKEN=hf_...` (Free — required for semantic resume matching)

1. Open Google Cloud Console.
2. Create/select your project.
3. Configure OAuth consent screen.
4. Go to Credentials and create OAuth 2.0 Client ID (Web application).
5. Add Authorized redirect URI exactly as:

```text
http://localhost:5000/api/auth/google/callback
```

6. Copy Client ID and Client Secret into `.env`:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:5174
```

7. Restart both backend and frontend after updating env files.

OAuth flow summary:

- Frontend starts OAuth from `/api/auth/google`.
- Google redirects to backend callback (`GOOGLE_CALLBACK_URL`).
- Backend creates JWT and redirects to frontend callback (`FRONTEND_URL/auth/callback`).

## 📧 Email SMTP Setup (Gmail)

To use real email notifications (OTP verification, password reset) via Gmail, follow these steps:

1. **Enable 2-Step Verification**: Go to your [Google Account Security](https://myaccount.google.com/security) and ensure 2-Step Verification is ON.
2. **Generate App Password**:
   - Search for "App Passwords" in your Google Account search bar.
   - Enter a name (e.g., "SkillsSphere AI").
   - Click **Create**.
   - Copy the **16-character code** (e.g., `abcd efgh ijkl mnop`).
3. **Update `.env`**:

   ```env
   EMAIL_SERVICE_MODE=smtp
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=abcd efgh ijkl mnop
   EMAIL_FROM="SkillsSphere AI" <your-email@gmail.com>
   ```

4. **Restart the server** to apply changes.

### 📝 Testing Email Verification (Console Mode)

For local development and testing without configuring an SMTP provider:
1. Set `EMAIL_SERVICE_MODE=console` in `.env`.
2. When registering a user, the server will output the 6-digit OTP directly to your terminal console instead of sending an email.
3. Retrieve this OTP from the server command line logs and enter it in the frontend verification modal to complete the registration flow.
