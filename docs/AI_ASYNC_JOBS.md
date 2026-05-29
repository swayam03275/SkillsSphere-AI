# Async AI Jobs (BullMQ)

Long-running AI work (resume analysis, job matching) runs in a background worker instead of blocking HTTP requests.

## Architecture

```
Client → POST /api/ai-jobs/* → Express API → BullMQ (Redis) → Worker → MongoDB / AI pipeline
Client → GET /api/ai-jobs/:jobId (poll until completed)
```

## Running locally

1. Start Redis (`REDIS_URL` in `server/.env`).
2. Start API: `cd server && npm run dev`
3. Start worker: `cd server && npm run dev:worker`

Or from root after `npm run install-all`:

```bash
cd server && npm run worker
```

## Environment

```env
AI_JOBS_ASYNC=true
AI_WORKER_CONCURRENCY=2
REDIS_URL=redis://localhost:6379
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai-jobs/resume-analyze` | Queue resume analysis (multipart, student role) |
| POST | `/api/ai-jobs/matching-evaluate` | Queue job matching (optional resume file) |
| GET | `/api/ai-jobs/:jobId` | Poll job status and result |

Optional header: `Idempotency-Key: <uuid>` — prevents duplicate runs within 24 hours.

## Closes

GitHub issue #885
