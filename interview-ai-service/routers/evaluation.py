from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.semantic_service import compute_technical_score
from services.nlp_service import detect_concepts
from services.communication_analyzer import analyze_communication

router = APIRouter()


class EvaluationRequest(BaseModel):
    transcript: str
    expectedAnswer: str
    expectedConcepts: List[str]


class ConceptResult(BaseModel):
    detected: List[str]
    missed: List[str]


class EvaluationResponse(BaseModel):
    technical: int
    communication: int
    relevance: int
    concepts: ConceptResult
    fillerWords: int
    speakingSpeed: str
    is_ai_evaluated: bool = True 


@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_answer(request: EvaluationRequest):
    """
    Evaluate a student's answer against the expected answer and concepts.

    Scoring:
    - technical: Semantic similarity between transcript and expected answer (0-100)
    - relevance: How many expected concepts were detected in the transcript (0-100)
    - communication: Answer structure, filler words, length analysis (0-100)
    """
    if not request.transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="Transcript cannot be empty",
        )

    # 1. Technical score — semantic similarity
    technical = compute_technical_score(request.transcript, request.expectedAnswer)

    # 2. Concept detection — relevance score
    concept_result = detect_concepts(request.transcript, request.expectedConcepts)
    relevance = concept_result["relevance"]

    # 3. Communication analysis
    comm_result = analyze_communication(request.transcript)

    return EvaluationResponse(
        technical=technical,
        communication=comm_result["communication"],
        relevance=relevance,
        concepts=ConceptResult(
            detected=concept_result["detected"],
            missed=concept_result["missed"],
        ),
        fillerWords=comm_result["fillerWords"],
        speakingSpeed=comm_result["speakingSpeed"],
        is_ai_evaluated=True,
    )
