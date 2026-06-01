from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.transcription import router as transcription_router
from routers.evaluation import router as evaluation_router

app = FastAPI(
    title="Interview AI Service",
    description="Python AI microservice for the SkillsSphere AI Interview Engine. Handles speech-to-text transcription and answer evaluation.",
    version="1.0.0",
)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

# Allow the Node.js backend to communicate with this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint for the Node.js backend to verify service availability."""
    return {"status": "ok", "service": "interview-ai-service"}


# Register routers
app.include_router(transcription_router, prefix="/api")
app.include_router(evaluation_router, prefix="/api")
