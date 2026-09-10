"""
AgriMap DSP — Export API Endpoints
Export field data as GeoJSON, CSV, or project summary.
"""
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse, JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.pipeline.export_service import (
    export_field_geojson, export_field_csv, export_project_summary
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/export", tags=["Export & Reporting"])


@router.get("/field/{field_id}/geojson")
def export_field_as_geojson(
    field_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export a field and all related data (zones, resources, observations)
    as a GeoJSON FeatureCollection.
    """
    try:
        geojson = export_field_geojson(field_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    logger.info("GeoJSON export for field %s by %s", field_id, current_user.email)
    return JSONResponse(
        content=geojson,
        headers={"Content-Disposition": f"attachment; filename=field_{field_id}.geojson"}
    )


@router.get("/field/{field_id}/csv")
def export_field_as_csv(
    field_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export field resources and observations as a CSV file.
    """
    try:
        csv_content = export_field_csv(field_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    logger.info("CSV export for field %s by %s", field_id, current_user.email)
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=field_{field_id}.csv"}
    )


@router.get("/project/{project_id}/summary")
def export_project_summary_endpoint(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export a project summary with field counts, resource breakdown,
    and verification status statistics.
    """
    try:
        summary = export_project_summary(project_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    logger.info("Project summary export for %s by %s", project_id, current_user.email)
    return summary
