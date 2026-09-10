"""
AgriMap DSP — AI Analysis API Endpoints
AI-powered field analysis, natural language queries, and recommendations.

Skills used: LangChain, RAG, FAISS, OpenAI API, Embeddings, Semantic Search
"""
import uuid
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.ai.field_analyzer import (
    analyze_field, get_field_recommendations, summarize_project
)
from app.services.ai.knowledge_base import query_with_ai, KnowledgeBase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Analysis"])


class QueryRequest(BaseModel):
    """Natural language query request."""
    question: str
    api_key: Optional[str] = None


@router.post("/analyze-field/{field_id}")
def ai_analyze_field(
    field_id: uuid.UUID,
    api_key: Optional[str] = Query(None, description="OpenAI API key (optional, uses rule-based without it)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI-powered field analysis. Generates:
    - Risk assessment (water, power, irrigation, soil, infrastructure, pest)
    - Key findings
    - Actionable recommendations
    - Readiness score (1-10)
    
    Works without OpenAI API key (rule-based). With API key, uses GPT-4o-mini.
    """
    try:
        analysis = analyze_field(field_id, db, api_key)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    logger.info("AI analysis for field %s by %s (type=%s)",
                field_id, current_user.email, analysis.get("analysis_type"))
    return analysis


@router.get("/recommendations/{field_id}")
def get_ai_recommendations(
    field_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get quick AI recommendations for a field.
    Returns a list of actionable suggestions without full analysis.
    """
    try:
        recommendations = get_field_recommendations(field_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {"field_id": str(field_id), "recommendations": recommendations}


@router.post("/query")
def ai_natural_language_query(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Natural language query over field data using RAG.
    
    Examples:
    - "Which fields have water sources?"
    - "Show me fields with pending verification"
    - "What pest issues have been reported?"
    
    Uses FAISS + OpenAI embeddings with API key, or keyword search without.
    """
    result = query_with_ai(request.question, db, request.api_key)

    logger.info("AI query by %s: '%s' → %s",
                current_user.email, request.question, result.get("answer_type"))
    return result


@router.post("/summarize-project/{project_id}")
def ai_summarize_project(
    project_id: uuid.UUID,
    api_key: Optional[str] = Query(None, description="OpenAI API key (optional)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate an AI summary of an entire project.
    Includes field counts, verification progress, resource breakdown.
    """
    try:
        summary = summarize_project(project_id, db, api_key)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    logger.info("Project summary for %s by %s", project_id, current_user.email)
    return summary


@router.post("/build-index")
def build_knowledge_index(
    api_key: Optional[str] = Query(None, description="OpenAI API key for vector embeddings"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Build/rebuild the FAISS knowledge base index from current database data.
    
    With API key: builds vector index using OpenAI embeddings (semantic search).
    Without: builds keyword index (basic text search).
    """
    kb = KnowledgeBase()
    result = kb.build_index(db, api_key)

    logger.info("Knowledge base rebuilt by %s: %s", current_user.email, result.get("index_type"))
    return result
