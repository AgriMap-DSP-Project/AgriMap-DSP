"""
AgriMap DSP — AI Field Analyzer Service
Uses LangChain + OpenAI to analyze field data and generate intelligent recommendations.
This is the RAG-powered analysis engine for pre-assessment insights.

Skills used: LangChain, OpenAI API, Prompt Engineering, LLMs
"""
import uuid
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.field import Field
from app.models.zone import FieldZone
from app.models.resource import Resource
from app.models.observation import Observation
from app.models.project import Project

logger = logging.getLogger(__name__)

# System prompt for agricultural field analysis
FIELD_ANALYSIS_SYSTEM_PROMPT = """You are an expert agricultural field analyst for the AgriMap DSP platform.
You analyze field survey data and provide actionable insights for farm pre-assessment.

When analyzing a field, consider:
1. Water resource availability and proximity
2. Power/electricity access
3. Irrigation infrastructure and coverage
4. Soil conditions and crop suitability
5. Infrastructure (buildings, storage, fencing)
6. Potential risks (pests, damage, flooding)
7. Overall field readiness for the Agrilythos precision agriculture system

Provide your analysis in a structured format with:
- Risk Assessment (HIGH/MEDIUM/LOW for each category)
- Key Findings (bullet points)
- Recommendations (actionable next steps)
- Overall Readiness Score (1-10)
"""

PROJECT_SUMMARY_PROMPT = """You are an expert agricultural project analyst.
Summarize the following digital land mapping pre-assessment project data.
Focus on: overall progress, verification status, resource distribution, and key observations.
Provide actionable recommendations for project completion.
"""


def _gather_field_context(field_id: uuid.UUID, db: Session) -> Dict[str, Any]:
    """Gather all data about a field into a structured context for AI analysis."""
    field = db.get(Field, field_id)
    if not field:
        raise ValueError(f"Field {field_id} not found")

    zones = db.query(FieldZone).filter(FieldZone.field_id == field_id).all()
    resources = db.query(Resource).filter(Resource.field_id == field_id).all()
    observations = db.query(Observation).filter(Observation.field_id == field_id).all()

    # Categorize resources
    resource_summary = {}
    for r in resources:
        cls = r.resource_class or "OTHER"
        if cls not in resource_summary:
            resource_summary[cls] = []
        resource_summary[cls].append({
            "name": r.name,
            "status": r.verification_status,
            "attributes": r.attributes,
        })

    # Categorize observations
    observation_summary = {}
    for o in observations:
        cat = o.category or "general"
        if cat not in observation_summary:
            observation_summary[cat] = []
        observation_summary[cat].append({
            "notes": o.notes,
            "category": o.category,
        })

    return {
        "field": {
            "name": field.name,
            "crop_history_summary": field.crop_history_summary,
            "calculated_area_hectares": float(field.calculated_area_hectares) if field.calculated_area_hectares else None,
            "verification_status": field.verification_status,
        },
        "zones": [{"name": z.name, "type": z.zone_type, "status": z.verification_status} for z in zones],
        "resources": resource_summary,
        "observations": observation_summary,
        "stats": {
            "total_zones": len(zones),
            "total_resources": len(resources),
            "total_observations": len(observations),
        }
    }


def analyze_field(field_id: uuid.UUID, db: Session, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Perform AI-powered analysis of a field using LangChain + OpenAI.
    Falls back to rule-based analysis if OpenAI is not configured.
    """
    context = _gather_field_context(field_id, db)

    # Try LangChain + OpenAI first
    if api_key:
        try:
            return _ai_analyze(context, api_key)
        except Exception as e:
            logger.warning("AI analysis failed, falling back to rule-based: %s", e)

    # Fallback: rule-based analysis (works without API key)
    return _rule_based_analyze(context)


def _ai_analyze(context: Dict[str, Any], api_key: str) -> Dict[str, Any]:
    """LangChain + OpenAI powered analysis using RAG pattern."""
    try:
        from langchain_openai import ChatOpenAI
        from langchain.schema import SystemMessage, HumanMessage
    except ImportError:
        raise ImportError("Install langchain-openai: pip install langchain-openai")

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
        api_key=api_key,
    )

    user_prompt = f"""Analyze the following field survey data and provide a comprehensive pre-assessment report:

Field Data:
{json.dumps(context, indent=2, default=str)}

Provide your analysis as a JSON object with these keys:
- risk_assessment: dict with categories (water, power, irrigation, soil, infrastructure, pest_risk) each having "level" (HIGH/MEDIUM/LOW) and "reason"
- key_findings: list of important findings
- recommendations: list of actionable recommendations  
- readiness_score: integer 1-10
- summary: brief natural language summary
"""

    messages = [
        SystemMessage(content=FIELD_ANALYSIS_SYSTEM_PROMPT),
        HumanMessage(content=user_prompt),
    ]

    response = llm.invoke(messages)
    
    # Try to parse as JSON, fallback to text
    try:
        analysis = json.loads(response.content)
    except json.JSONDecodeError:
        analysis = {"summary": response.content, "readiness_score": None}

    analysis["analysis_type"] = "ai_powered"
    analysis["model"] = "gpt-4o-mini"
    analysis["field_context"] = context
    analysis["analyzed_at"] = datetime.now(timezone.utc).isoformat()

    logger.info("AI analysis completed for field: %s", context["field"]["name"])
    return analysis


def _rule_based_analyze(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Rule-based field analysis — works without any API key.
    Provides deterministic analysis based on data patterns.
    """
    field = context["field"]
    resources = context["resources"]
    observations = context["observations"]
    stats = context["stats"]

    findings = []
    recommendations = []
    risk_assessment = {}

    # Water assessment
    water_resources = resources.get("WATER", [])
    if len(water_resources) == 0:
        risk_assessment["water"] = {"level": "HIGH", "reason": "No water sources mapped"}
        findings.append("No water sources have been mapped for this field")
        recommendations.append("Survey and map all water sources (wells, borewells, ponds, canals)")
    elif len(water_resources) < 2:
        risk_assessment["water"] = {"level": "MEDIUM", "reason": f"Only {len(water_resources)} water source(s)"}
        findings.append(f"{len(water_resources)} water source(s) mapped")
    else:
        risk_assessment["water"] = {"level": "LOW", "reason": f"{len(water_resources)} water sources available"}
        findings.append(f"{len(water_resources)} water sources available — good coverage")

    # Power assessment
    power_resources = resources.get("POWER", [])
    if len(power_resources) == 0:
        risk_assessment["power"] = {"level": "HIGH", "reason": "No power sources mapped"}
        recommendations.append("Map all electrical connections and power sources")
    else:
        risk_assessment["power"] = {"level": "LOW", "reason": f"{len(power_resources)} power source(s) mapped"}

    # Irrigation assessment
    irrigation_resources = resources.get("IRRIGATION", [])
    if len(irrigation_resources) == 0:
        risk_assessment["irrigation"] = {"level": "MEDIUM", "reason": "No irrigation resources mapped"}
        recommendations.append("Document and map irrigation infrastructure")
    else:
        risk_assessment["irrigation"] = {"level": "LOW", "reason": f"{len(irrigation_resources)} irrigation resource(s) mapped"}

    # Infrastructure assessment
    structure_resources = resources.get("STRUCTURE", [])
    risk_assessment["infrastructure"] = {
        "level": "LOW" if len(structure_resources) > 0 else "MEDIUM",
        "reason": f"{len(structure_resources)} structure(s) mapped"
    }

    # Soil / Crop history assessment
    if field.get("crop_history_summary"):
        risk_assessment["crop_history"] = {"level": "LOW", "reason": f"Crop history documented: {field['crop_history_summary']}"}
    else:
        risk_assessment["crop_history"] = {"level": "MEDIUM", "reason": "Crop history summary not provided"}
        recommendations.append("Document crop history summary for better field assessment")

    # Pest/damage risk from observations
    pest_obs = observations.get("pest_weed_infestation", [])
    damage_obs = observations.get("damage", [])
    if pest_obs or damage_obs:
        total_issues = len(pest_obs) + len(damage_obs)
        if total_issues > 2:
            risk_assessment["pest_risk"] = {"level": "HIGH", "reason": f"{total_issues} pest/damage issue(s)"}
            findings.append(f"ALERT: {total_issues} pest/damage issue(s) detected")
        else:
            risk_assessment["pest_risk"] = {"level": "MEDIUM", "reason": "Pest/damage issues noted"}
    else:
        risk_assessment["pest_risk"] = {"level": "LOW", "reason": "No pest/damage issues reported"}

    # Calculate readiness score (1-10)
    risk_points = sum(1 for r in risk_assessment.values() if r["level"] == "HIGH") * 3
    risk_points += sum(1 for r in risk_assessment.values() if r["level"] == "MEDIUM") * 1
    readiness_score = max(1, min(10, 10 - risk_points))

    # General findings
    findings.append(f"Total mapped resources: {stats['total_resources']}")
    findings.append(f"Total zones defined: {stats['total_zones']}")
    findings.append(f"Total observations logged: {stats['total_observations']}")
    findings.append(f"Field verification: {field.get('verification_status', 'pending')}")

    if field.get("calculated_area_hectares"):
        findings.append(f"Field area: {field['calculated_area_hectares']} hectares")

    # General recommendations
    if field.get("verification_status") == "pending":
        recommendations.append("Complete field boundary verification")

    unverified_resources = sum(
        1 for cls_list in resources.values()
        for r in cls_list if r.get("status") == "pending"
    )
    if unverified_resources > 0:
        recommendations.append(f"Verify {unverified_resources} pending resource(s)")

    summary = (
        f"Field '{field.get('name', 'Unknown')}' has {stats['total_resources']} resources, "
        f"{stats['total_zones']} zones, and {stats['total_observations']} observations mapped. "
        f"Readiness score: {readiness_score}/10."
    )

    return {
        "analysis_type": "rule_based",
        "risk_assessment": risk_assessment,
        "key_findings": findings,
        "recommendations": recommendations,
        "readiness_score": readiness_score,
        "summary": summary,
        "field_context": context,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }


def get_field_recommendations(field_id: uuid.UUID, db: Session) -> List[str]:
    """Quick recommendations without full analysis."""
    context = _gather_field_context(field_id, db)
    analysis = _rule_based_analyze(context)
    return analysis["recommendations"]


def summarize_project(project_id: uuid.UUID, db: Session, api_key: Optional[str] = None) -> Dict[str, Any]:
    """Generate an AI or rule-based summary of an entire project."""
    project = db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")

    fields = db.query(Field).filter(Field.project_id == project_id).all()
    resources = db.query(Resource).filter(Resource.project_id == project_id).all()

    # Aggregate stats
    total_area = sum(float(f.calculated_area_hectares or 0) for f in fields)
    verified_fields = sum(1 for f in fields if f.verification_status == "verified")
    verified_resources = sum(1 for r in resources if r.verification_status == "verified")

    resource_breakdown = {}
    for r in resources:
        cls = r.resource_class or "OTHER"
        resource_breakdown[cls] = resource_breakdown.get(cls, 0) + 1

    summary = {
        "project_name": project.name,
        "project_status": project.status,
        "total_fields": len(fields),
        "total_area_hectares": round(total_area, 2),
        "verified_fields": verified_fields,
        "pending_fields": len(fields) - verified_fields,
        "total_resources": len(resources),
        "verified_resources": verified_resources,
        "resource_breakdown": resource_breakdown,
        "completion_percentage": round(
            (verified_fields / len(fields) * 100) if fields else 0, 1
        ),
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }

    logger.info("Project summary generated for: %s", project.name)
    return summary
