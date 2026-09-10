"""
AgriMap DSP — Fields API Endpoints
CRUD, boundary management, and verification for farmer field records.
"""
import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func as sa_func

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.spatial import geojson_to_spatial, spatial_to_geojson
from app.models.field import Field
from app.models.user import User
from app.schemas.field import (
    FieldCreate, FieldUpdate, FieldRead, FieldVerificationUpdate
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fields", tags=["Fields"])


@router.post("/", response_model=FieldRead, status_code=status.HTTP_201_CREATED)
def create_field(
    payload: FieldCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new field boundary. Calculated area is provided by the client,
    and the geometry boundary is specified as GeoJSON MultiPolygon.
    """
    data = payload.model_dump()
    geojson_boundary = data.pop("boundary")
    
    try:
        spatial_boundary = geojson_to_spatial(geojson_boundary)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        
    field = Field(
        **data,
        boundary=spatial_boundary,
        created_by_id=current_user.id,
        verification_status="pending"
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    
    logger.info("Field created: %s by %s", field.name, current_user.email)
    return field


@router.get("/", response_model=dict)
def list_fields(
    project_id: Optional[uuid.UUID] = None,
    farmer_id: Optional[uuid.UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a paginated list of fields. Optionally filter by project or farmer.
    """
    query = db.query(Field)
    if project_id:
        query = query.filter(Field.project_id == project_id)
    if farmer_id:
        query = query.filter(Field.farmer_id == farmer_id)
    
    total = query.count()
    fields = query.offset(skip).limit(limit).all()
    
    return {
        "items": [FieldRead.model_validate(f) for f in fields],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{field_id}", response_model=FieldRead)
def get_field(
    field_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve details of a specific field.
    """
    field = db.get(Field, field_id)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID '{field_id}' not found."
        )
    return field


@router.put("/{field_id}", response_model=FieldRead)
def update_field(
    field_id: uuid.UUID,
    payload: FieldUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update field properties, including metadata or boundaries.
    """
    field = db.get(Field, field_id)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID '{field_id}' not found."
        )
        
    update_data = payload.model_dump(exclude_unset=True)
    
    if "boundary" in update_data:
        geojson_boundary = update_data.pop("boundary")
        if geojson_boundary is not None:
            try:
                field.boundary = geojson_to_spatial(geojson_boundary)
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
                
    for key, value in update_data.items():
        setattr(field, key, value)
        
    db.commit()
    db.refresh(field)
    
    logger.info("Field updated: %s by %s", field.name, current_user.email)
    return field


@router.delete("/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_field(
    field_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a field.
    """
    field = db.get(Field, field_id)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID '{field_id}' not found."
        )
        
    db.delete(field)
    db.commit()
    
    logger.info("Field deleted: %s by %s", field_id, current_user.email)
    return


# --- Boundary Endpoints ---

@router.get("/{field_id}/boundary", response_model=Dict[str, Any])
def get_field_boundary(
    field_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve the boundary geometry of a field as a GeoJSON MultiPolygon.
    """
    field = db.get(Field, field_id)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID '{field_id}' not found."
        )
    return spatial_to_geojson(field.boundary)


@router.put("/{field_id}/boundary", response_model=Dict[str, Any])
def update_field_boundary(
    field_id: uuid.UUID,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update/replace the field boundary geometry coordinates using a GeoJSON MultiPolygon.
    """
    field = db.get(Field, field_id)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID '{field_id}' not found."
        )
        
    try:
        field.boundary = geojson_to_spatial(payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        
    db.commit()
    db.refresh(field)
    
    logger.info("Field boundary updated: %s by %s", field_id, current_user.email)
    return spatial_to_geojson(field.boundary)


# --- Verification Endpoint ---

@router.patch("/{field_id}/verify", response_model=FieldRead)
def verify_field(
    field_id: uuid.UUID, 
    payload: FieldVerificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Approve or reject a mapped field boundary. Requires verifier or admin role.
    """
    if current_user.role not in ("verifier", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only verifiers and admins can verify fields."
        )
    
    field = db.get(Field, field_id)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID '{field_id}' not found."
        )
        
    field.verification_status = payload.verification_status
    field.verification_notes = payload.verification_notes
    field.verified_by_id = current_user.id
    field.verified_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(field)
    
    logger.info("Field %s %s by %s", field.name, payload.verification_status, current_user.email)
    return field
