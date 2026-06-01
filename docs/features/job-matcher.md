# Job Matcher Module

The Job Matcher provides AI-powered job recommendations by running the resume analysis pipeline against open job postings and ranking results by match score.

## Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                        React Frontend                             │
│  JobMatcherPage → MatchScoreCard + MissingSkillsList             │
│                 + RecommendedJobsList                             │
│  matcherService.js (API client)                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼───────────────────────────────────────┐
│                      Node.js Backend                              │
│  jobs/controller.getRecommendations                               │
│  jobs/service.getJobRecommendations                               │
│  matching/service.evaluateMatches → runPipeline (per job)         │
│  Models: MatchResult, Resume, JobPosting                          │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                    AI/ML Pipeline                                  │
│  For each candidate-job pair:                                     │
│    skillEvaluator + keywordEvaluator + experienceEvaluator        │
│    → weighted score → ranking                                     │
└──────────────────────────────────────────────────────────────────┘
```

## Matching Flow

1. **Student opens matcher page** → `GET /api/jobs/recommendations` triggers recommendation engine
2. **Resume fetched** → Latest parsed resume loaded via `resumeService.getLatestResume()`
3. **Pre-filtering** → Open jobs matched by skill/keyword/title regex (up to 100 candidates)
4. **Skill overlap ranking** → Jobs ranked by number of matching skills, top 20 selected
5. **AI pipeline runs** → Each job evaluated via `runPipeline()` in batches of 5
6. **Scoring** → Each job gets: score, breakdown, skillMatch, keywordMatch, experienceMatch
7. **Cross-role alerts** → Low match scores (<60%) notify both recruiter and a tutor
8. **Results persisted** → Full `MatchResult` saved with all recommendations
9. **Displayed** → Jobs shown with match score badges, paginated at 6 per page

## Scoring Algorithm

For each candidate-job pair, the pipeline evaluates:

| Dimension            | What It Measures                                            |
| -------------------- | ----------------------------------------------------------- |
| -----------          | -----------------                                           |
| **Skill Match**      | Exact overlap between candidate skills and job requirements |
| **Keyword Match**    | JD keyword presence in resume text                          |
| **Experience Match** | Years of experience comparison                              |
| **Semantic Match**   | Embedding-based contextual similarity (when JD available)   |

Final score = weighted average of all dimensions.

## Cross-Role Notification System

When a recommendation scores below 60%:

```text
Low Match Alert
    ├── Notification to Recruiter → "skill gap alert for {candidate}"
    └── Notification to Tutor → "student needs mentoring intervention"
```

This bridges the hiring and mentoring modules, ensuring tutors are aware of students who need additional support.

## Database Models

### MatchResult

| Field             | Type     | Notes                                                                        |
| ----------------- | -------- | ---------------------------------------------------------------------------- |
| -------           | ------   | -------                                                                      |
| `user`            | ObjectId | Ref: User                                                                    |
| `resume`          | ObjectId | Ref: Resume (snapshot of which version was used)                             |
| `recommendations` | Array    | Each: `{ job, score, breakdown, skillMatch, keywordMatch, experienceMatch }` |

### Standalone Matching Endpoint

| Method   | Endpoint                    | Auth   | Description                                 |
| -------- | --------------------------- | ------ | ------------------------------------------- |
| -------- | ----------                  | ------ | -------------                               |
| `POST`   | `/api/matching/evaluate`    | any    | Upload resume or use existing, run matching |
| `GET`    | `/api/matching/recommended` | any    | Get latest saved recommendations            |

## Frontend Routes

| Route        | Page           | Description                              |
| ------------ | -------------- | ---------------------------------------- |
| -------      | ------         | -------------                            |
| `/job-match` | JobMatcherPage | AI job recommendations with match scores |

## Key Components

| Component             | Purpose                                                              |
| --------------------- | -------------------------------------------------------------------- |
| -----------           | ---------                                                            |
| `JobMatcherPage`      | Main page: loading, error, no-resume, no-matches, and results states |
| `MatcherForm`         | Alternate form for selecting resume source (existing vs upload)      |
| `MatcherResult`       | Layout container for score + skills + jobs                           |
| `MatchScoreCard`      | Match percentage display with progress bar                           |
| `MissingSkillsList`   | Missing skills displayed as pills                                    |
| `RecommendedJobsList` | List of matched jobs with scores                                     |

## Page States

| State      | Display                                               |
| ---------- | ----------------------------------------------------- |
| -------    | ---------                                             |
| Loading    | "Analyzing your profile for the best matches..."      |
| Error      | Error message with retry button                       |
| No resume  | Prompt to upload resume → links to `/resume-analyzer` |
| No matches | Prompt to browse all jobs → links to `/job-board`     |
| Results    | Jobs with "{X}% Match" badges, paginated              |

## Key Files

```text
client/src/modules/job-matcher/
├── pages/JobMatcherPage.jsx               # Main page
├── components/
│   ├── MatcherForm.jsx                    # Resume source selector
│   ├── MatcherResult.jsx                  # Results layout
│   ├── MatchScoreCard.jsx                 # Score display
│   ├── MissingSkillsList.jsx              # Missing skills pills
│   └── RecommendedJobsList.jsx            # Job list with scores
└── services/matcherService.js             # API client

server/src/modules/matching/
├── routes.js                              # 2 endpoints
├── controller.js                          # evaluate + getRecommended
└── service.js                             # Core matching engine

server/src/modules/jobs/
└── service.js                             # getJobRecommendations (entry point)
```

## Integration Points

- **Resume Analyzer**: Parsed resume data is the input for matching
- **Student Jobs**: Shared `JobApplyForm` component for applying from match results
- **Recruiter Intelligence**: Low-match alerts trigger tutor notifications
- **AI/ML Pipeline**: Same `runPipeline()` used by resume analyzer, applied per-job
- **Redis**: Job listings cached for performance
