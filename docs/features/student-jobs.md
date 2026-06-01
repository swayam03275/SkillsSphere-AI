# Student Jobs Module

The Student Jobs module provides a job discovery board where students can browse, filter, and apply to job postings created by recruiters. Includes application tracking with a Kanban-style board view.

## Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                        React Frontend                             │
│  JobBoardPage → JobFilters + JobViewerCard + JobApplyForm        │
│  MyApplicationsPage → AppCard + StatusTimeline (Kanban view)     │
│  jobService.js (API client)                                      │
└──────────────────────────┬───────────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼───────────────────────────────────────┐
│                      Node.js Backend                              │
│  routes.js → controller.js → service.js                           │
│  Models: JobPosting, JobApplication                               │
│  Redis: Jobs cache (5min), Skill trends cache (15min)            │
└──────────────────────────────────────────────────────────────────┘
```

## Job Discovery Flow

1. **Student opens job board** → `GET /api/jobs` fetches paginated open jobs
2. **Applies filters** → Designation search (debounced 500ms), salary range, posted timeframe
3. **Views job details** → Expandable `JobViewerCard` shows description, skills, requirements
4. **Clicks Apply** → `JobApplyForm` modal collects resume link + cover note
5. **Submission** → `POST /api/jobs/:id/apply` creates application + notifies recruiter via Socket.IO
6. **AI evaluation** → Async `evaluateCandidateMatch()` scores the application (see Recruiter module)

## Application Tracking

1. **Student opens My Applications** → `GET /api/jobs/my-applications/details` fetches paginated applications
2. **Two view modes:**
   - **List View** — Paginated cards with status badges, timeline, withdraw option
   - **Kanban Board** — Drag-and-drop columns (Pending, Reviewed, Shortlisted, Rejected)
3. **Local CRM overrides** — Students can drag cards between columns locally (stored in `localStorage`) without changing official status
4. **Withdraw** — `PATCH /api/jobs/:id/withdraw` with confirmation dialog

## Database Models

### JobPosting

| Field                | Type     | Notes                                                          |
| -------------------- | -------- | -------------------------------------------------------------- |
| -------              | ------   | -------                                                        |
| `title`              | String   | Required, 2-120 chars                                          |
| `description`        | String   | Required, min 20 chars                                         |
| `skills`             | [String] | Required, auto-lowercased                                      |
| `experienceRequired` | Number   | Default 0                                                      |
| `jobLevel`           | String   | Internship/Entry Level/Associate/Mid-Senior/Director/Executive |
| `status`             | String   | draft/open/closed                                              |
| `recruiter`          | ObjectId | Ref: User, indexed                                             |
| `location`           | Object   | city, state, country, remote                                   |
| `salary`             | Object   | min, max, currency, isNegotiable                               |

### JobApplication

| Field                 | Type     | Notes                                           |
| --------------------- | -------- | ----------------------------------------------- |
| -------               | ------   | -------                                         |
| `job`                 | ObjectId | Ref: JobPosting                                 |
| `applicant`           | ObjectId | Ref: User                                       |
| `resume`              | ObjectId | Ref: Resume (optional)                          |
| `status`              | String   | pending/reviewed/shortlisted/rejected/withdrawn |
| `resumeLink`          | String   | HTTP/HTTPS URL required                         |
| `coverNote`           | String   | Max 1000 chars                                  |
| `aiMatchScore`        | Number   | 0-100, set by AI evaluation                     |
| `matchCategory`       | String   | Excellent/Moderate/Growth/Weak                  |
| `aiRecruiterInsights` | [String] | AI-generated insights                           |
| `aiWeaknesses`        | [String] | AI-detected weaknesses                          |
| `aiHiringSignals`     | [String] | Recommended next steps                          |
| `statusHistory`       | Array    | Full audit trail of status changes              |

**Unique constraint:** `{job, applicant}` prevents duplicate applications.

## API Endpoints

| Method   | Endpoint                            | Auth    | Description                             |
| -------- | ----------------------------------- | ------- | --------------------------------------- |
| -------- | ----------                          | ------  | -------------                           |
| `GET`    | `/api/jobs`                         | any     | Browse open jobs (cached 5min)          |
| `GET`    | `/api/jobs/trends/skills`           | any     | Top 10 trending skills                  |
| `POST`   | `/api/jobs/:id/apply`               | student | Apply to a job                          |
| `PATCH`  | `/api/jobs/:id/withdraw`            | student | Withdraw application                    |
| `GET`    | `/api/jobs/my-applications`         | student | Get applied job IDs                     |
| `GET`    | `/api/jobs/my-applications/details` | student | Paginated applications with job details |

## Frontend Routes

| Route              | Page               | Description                        |
| ------------------ | ------------------ | ---------------------------------- |
| -------            | ------             | -------------                      |
| `/job-board`       | JobBoardPage       | Browse and filter open jobs        |
| `/my-applications` | MyApplicationsPage | Track applications (list + Kanban) |

## Key Components

| Component            | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| -----------          | ---------                                                   |
| `JobBoardPage`       | Main job discovery with filters, pagination, apply modal    |
| `MyApplicationsPage` | Application tracking with list/kanban toggle                |
| `JobFilters`         | Sidebar filters: designation, salary range, timeframe       |
| `JobApplyForm`       | Modal form: name, email, resume link, cover note            |
| `JobCardSkeleton`    | Loading placeholder                                         |
| `AppCard`            | Individual application card with status, timeline, withdraw |
| `StatusTimeline`     | Vertical timeline of `statusHistory` entries                |

## Security

- **IDOR prevention**: Resume ownership verified before application creation
- **Re-application**: Withdrawn applications can be re-activated
- **Duplicate prevention**: Unique compound index on `{job, applicant}`

## Key Files

```text
client/src/modules/student-jobs/
├── pages/
│   ├── JobBoardPage.jsx                  # Job browsing (main page)
│   └── MyApplicationsPage.jsx            # Application tracking (list + Kanban)
├── components/
│   ├── JobApplyForm.jsx                  # Application modal
│   ├── JobFilters.jsx                    # Filter sidebar
│   └── JobCardSkeleton.jsx              # Loading skeleton
└── services/jobService.js                # API client

server/src/modules/jobs/
├── routes.js                             # 16 endpoints
├── controller.js                         # Request handlers
└── service.js                            # Business logic + Redis caching
```

## Integration Points

- **Resume Analyzer**: Students should have an uploaded resume before applying
- **Job Matcher**: AI recommendations drive the `/job-match` page
- **Recruiter module**: Applications visible in recruiter's applicant management
- **Notifications**: Real-time Socket.IO notifications on application status changes
- **Recruiter Intelligence**: Async AI evaluation scores each application
