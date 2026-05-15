# Project Structure

This document reflects the **currently implemented** state of SkillSphere AI. Scaffolded but unimplemented modules are marked clearly.

---

## Root

```
SkillsSphere-AI/
├── .github/                        # GitHub configuration
│   ├── workflows/
│   │   └── pr-quality-checks.yml  # Automated PR lint/test/build checks
│   ├── ISSUE_TEMPLATE/            # Issue templates for contributors
│   └── PULL_REQUEST_TEMPLATE.md   # PR description template
├── ai-ml/                         # AI/ML evaluation logic
├── client/                        # React frontend
├── server/                        # Node.js + Express backend
├── docs/                          # Project documentation
├── .gitignore
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── SECURITY.md
└── package-lock.json
```

---

## `server/` — Backend (Implemented)

```
server/
├── index.js                        # Server entry point, mounts all routes
├── example.env                     # Environment variable reference
├── package.json
└── src/
    ├── config/                     # App and environment configuration
    ├── database/
    │   ├── db.js                   # MongoDB connection setup
    │   └── models/
    │       ├── User.js             # User schema (name, email, OTP fields, password)
    │       └── Resume.js           # Resume schema (file metadata, parsed candidate data)
    ├── middleware/
    │   └── uploadResume.js         # Multer middleware for resume file uploads
    ├── modules/
    │   ├── auth/
    │   │   ├── controller.js       # Handles register, verify-email, resend-otp, forgot/reset-password
    │   │   ├── routes.js           # Auth API route definitions
    │   │   └── service.js          # OTP generation, email dispatch, password reset logic
    │   ├── resumes/
    │   │   ├── controller.js       # Handles upload, analyze, and result fetch endpoints
    │   │   └── routes.js           # Resume API route definitions
    │   ├── analytics/              # Scaffolded — not implemented
    │   ├── classrooms/             # Scaffolded — not implemented
    │   ├── interviews/             # Scaffolded — not implemented
    │   ├── matching/               # Scaffolded — not implemented
    │   └── users/                  # Scaffolded — not implemented
    ├── uploads/                    # Stores uploaded resume files at runtime
    ├── utils/
    │   └── parseResume.js          # PDF parsing and candidate information extraction
    ├── validations/
    │   └── authValidation.js       # Zod schemas for all auth request bodies
    ├── integrations/               # Scaffolded — third-party AI/service integrations
    └── app/                        # App bootstrap and middleware setup
```

### Implemented API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| POST | `/api/auth/register` | Register user, triggers OTP email |
| POST | `/api/auth/verify-email` | Verify 6-digit OTP (max 5 attempts, 5-min expiry) |
| POST | `/api/auth/resend-otp` | Resend OTP to registered email |
| POST | `/api/auth/forgot-password` | Initiate password reset (enum-safe) |
| POST | `/api/auth/reset-password` | Complete password reset with token |
| POST | `/api/resume/upload` | Upload resume PDF via multipart form |
| POST | `/api/resume/analyze` | Parse + evaluate resume (skills, keywords, experience) |
| GET | `/api/resume/result/:id` | Fetch stored resume analysis by ID |
| GET | `/uploads/:filename` | Serve uploaded resume file statically |

### Environment Variables (from `example.env`)

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` / `MONGODB_URI` | MongoDB connection string |
| `PORT` | Server port (default: `5000`) |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | Token expiry (default: `7d`) |
| `EMAIL_SERVICE_MODE` | `console` (dev) or `smtp` (production) |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_PORT` | SMTP port |
| `EMAIL_USER` | SMTP username |
| `EMAIL_PASS` | SMTP password |

---

## `ai-ml/` — Evaluators (Implemented)

```
ai-ml/
└── evaluators/
    ├── skillEvaluator.js           # Resume skills vs JD skills: matched, missing, extra, weighted score
    ├── keywordEvaluator.js         # Resume text vs JD keywords: matched, missing, weighted score (weight: 0.2)
    ├── experienceEvaluator.js      # Candidate vs required experience: score, gap, feedback
    │                               # Supports: "18 months", "1 year 6 months", "2+ years"
    └── __tests__/
        └── experienceEvaluator.test.js   # Unit tests for experience evaluator
```

Scaffolded (no logic yet):
- `resume-analysis/`
- `jd-matching/`
- `interview-feedback/`
- `shared/`

---

## `client/` — Frontend (Implemented)

```
client/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.cjs
├── postcss.config.cjs
└── src/
    ├── app/
    │   ├── App.jsx                 # Root router — defines all routes
    │   ├── App.css
    │   ├── main.jsx                # React entry point
    │   └── index.css
    ├── modules/
    │   ├── auth/
    │   │   ├── Login.jsx           # Login page
    │   │   ├── Register.jsx        # Registration page
    │   │   └── components/
    │   │       └── ComponentDemo.jsx   # Shared component showcase (route: /demo)
    │   ├── landing/
    │   │   ├── LandingPage.jsx     # Main landing page (route: /)
    │   │   └── components/
    │   │       ├── css/            # Landing-specific styles
    │   │       └── jsx/            # Landing-specific components
    │   ├── resume-analyzer/
    │   │   ├── components/
    │   │   │   ├── DragDropUpload.jsx    # Drag & drop / paste resume upload
    │   │   │   └── AnalysisResult.jsx   # Resume analysis results display
    │   │   ├── pages/
    │   │   │   └── ResumeAnalyzerPage.jsx  # Page wrapper (route: /resume-analyzer)
    │   │   └── services/
    │   │       └── resumeService.js     # API calls for resume upload and analysis
    │   ├── classrooms/             # Scaffolded — not implemented
    │   ├── dashboard/              # Scaffolded — not implemented
    │   ├── job-matcher/            # Scaffolded — not implemented
    │   └── mock-interview/         # Scaffolded — not implemented
    ├── shared/
    │   ├── components/             # Reusable form primitives
    │   │   ├── Input.jsx           # Text input with label, error state, icons, disabled
    │   │   ├── Button.jsx          # Button with variants, sizes, loading state
    │   │   ├── Select.jsx          # Dropdown with label, error, disabled
    │   │   └── index.js            # Barrel export
    │   └── landing_components/     # Landing page shared components
    │       ├── Navbar.jsx + Navbar.css
    │       ├── Card.jsx + Card.css
    │       └── Button.jsx + Button.css
    ├── services/                   # Global API service layer (scaffolded)
    ├── utils/                      # Frontend helper utilities (scaffolded)
    └── assets/                     # Images, icons, static resources
```

---

## `docs/` — Documentation

```
docs/
├── PROJECT_STRUCTURE.md    # This file — implemented features reference
├── QUALITY_GATES.md        # PR quality gate rules and automation notes
├── api/                    # API documentation (in progress)
├── architecture/           # System architecture diagrams (in progress)
└── features/               # Feature-level documentation (in progress)
```

---

## Running the Project

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

> Copy `server/example.env` to `server/.env` and fill in your values before starting the server.