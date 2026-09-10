"""
AgriMap DSP — Data Ingestion API Endpoints
Upload CSV, GeoJSON, and bulk data for automated record creation.
"""
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.ingestion.csv_ingestion import (
    ingest_farmers_csv, ingest_resources_csv, generate_csv_template
)
from app.services.ingestion.geojson_ingestion import ingest_geojson
from app.services.ingestion.photo_processor import extract_exif_gps

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["Data Ingestion"])


@router.post("/csv/{entity_type}", response_model=dict, status_code=status.HTTP_201_CREATED)
def ingest_csv(
    entity_type: str,
    file: UploadFile = File(..., description="CSV file to ingest"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a CSV file and bulk-create records.
    
    Supported entity_type values: `farmers`, `resources`
    
    Download templates from GET /api/v1/ingest/templates/{entity_type}
    """
    if entity_type not in ("farmers", "resources"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported entity type: {entity_type}. Supported: farmers, resources"
        )

    content = file.file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    if entity_type == "farmers":
        result = ingest_farmers_csv(content, db, current_user.id)
    elif entity_type == "resources":
        result = ingest_resources_csv(content, db, current_user.id)
    else:
        raise HTTPException(status_code=400, detail="Unsupported entity type")

    logger.info(
        "CSV ingestion by %s: entity=%s, success=%d, errors=%d",
        current_user.email, entity_type, result.success_count, result.error_count
    )
    return result.to_dict()


@router.post("/geojson", response_model=dict, status_code=status.HTTP_201_CREATED)
def ingest_geojson_file(
    file: UploadFile = File(..., description="GeoJSON file to ingest"),
    project_id: uuid.UUID = Query(..., description="Project to import features into"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a GeoJSON FeatureCollection and auto-create field/resource records.
    
    - Polygons/MultiPolygons → Field boundaries
    - Points/LineStrings → Resources
    
    Feature properties are mapped to record fields by name.
    """
    content = file.file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    result = ingest_geojson(content, project_id, current_user.id, db)

    logger.info(
        "GeoJSON ingestion by %s: fields=%d, resources=%d, errors=%d",
        current_user.email, result.fields_created, result.resources_created, len(result.errors)
    )
    return result.to_dict()


@router.post("/photo-exif", response_model=dict)
def extract_photo_exif(
    file: UploadFile = File(..., description="Photo file to extract GPS from"),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a photo and extract EXIF GPS coordinates, camera info, and timestamp.
    Returns the extracted metadata without creating any database record.
    """
    import os
    import tempfile

    # Save to temp file for EXIF extraction
    suffix = os.path.splitext(file.filename or ".jpg")[1]
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = file.file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        exif_data = extract_exif_gps(tmp_path)
        return {
            "filename": file.filename,
            "file_size_bytes": len(content),
            "exif": exif_data,
        }
    finally:
        os.unlink(tmp_path)


@router.get("/templates/{entity_type}")
def get_csv_template(entity_type: str):
    """
    Download a CSV template for data collection.
    
    Supported: `farmers`, `resources`, `fields`
    """
    template = generate_csv_template(entity_type)
    if not template:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown template type: {entity_type}. Supported: farmers, resources, fields"
        )

    return PlainTextResponse(
        content=template,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={entity_type}_template.csv"}
    )
