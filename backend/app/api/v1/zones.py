"""
AgriMap DSP — Zones API Endpoints
CRUD and verification for internal field zones.
"""
import uuid
import logging
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.spatial import geojson_to_spatial
from app.models.zone import FieldZone
from app.models.user import User
from app.schemas.zone import (
    FieldZoneCreate, FieldZoneUpdate, FieldZoneRead
)
from app.schemas.field import FieldVerificationUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/zones", tags=["Zones"])


@router.post("/", response_model=FieldZoneRead, status_code=status.HTTP_201_CREATED)
def create_zone(
    payload: FieldZoneCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create an internal field zone (e.g. soil type zone).
    The boundary coordinates must lie strictly within the boundary MultiPolygon of the parent field.
    """
    data = payload.model_dump()
    geojson_boundary = data.pop("boundary")
    
    try:
        spatial_boundary = geojson_to_spatial(geojson_boundary)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        
    zone = FieldZone(
        **data,
        boundary=spatial_boundary,
        created_by_id=current_user.id,
        verification_status="pending"
    )
    db.add(zone)
    db.commit()
    db.refresh(zone)
    
    logger.info("Zone created: %s by %s", zone.name, current_user.email)
    return zone


@router.get("/", response_model=dict)
def list_zones(
    field_id: Optional[uuid.UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a paginated list of internal field zones, filterable by field_id.
    """
    query = db.query(FieldZone)
    if field_id:
        query = query.filter(FieldZone.field_id == field_id)
    
    total = query.count()
    zones = query.offset(skip).limit(limit).all()
    
    return {
        "items": [FieldZoneRead.model_validate(z) for z in zones],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{zone_id}", response_model=FieldZoneRead)
def get_zone(
    zone_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve details of a specific zone.
    """
    zone = db.get(FieldZone, zone_id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"FieldZone with ID '{zone_id}' not found."
        )
    return zone


@router.put("/{zone_id}", response_model=FieldZoneRead)
def update_zone(
    zone_id: uuid.UUID,
    payload: FieldZoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update zone properties or boundary coordinates.
    """
    zone = db.get(FieldZone, zone_id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"FieldZone with ID '{zone_id}' not found."
        )
        
    update_data = payload.model_dump(exclude_unset=True)
    
    if "boundary" in update_data:
        geojson_boundary = update_data.pop("boundary")
        if geojson_boundary is not None:
            try:
                zone.boundary = geojson_to_spatial(geojson_boundary)
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
                
    for key, value in update_data.items():
        setattr(zone, key, value)
        
    db.commit()
    db.refresh(zone)
    
    logger.info("Zone updated: %s by %s", zone.name, current_user.email)
    return zone


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(
    zone_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a zone.
    """
    zone = db.get(FieldZone, zone_id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"FieldZone with ID '{zone_id}' not found."
        )
        
    db.delete(zone)
    db.commit()
    
    logger.info("Zone deleted: %s by %s", zone_id, current_user.email)
    return


# --- Verification Endpoint ---

@router.patch("/{zone_id}/verify", response_model=FieldZoneRead)
def verify_zone(
    zone_id: uuid.UUID,
    payload: FieldVerificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Approve or reject a field zone. Requires verifier or admin role.
    """
    if current_user.role not in ("verifier", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only verifiers and admins can verify zones."
        )
    
    zone = db.get(FieldZone, zone_id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"FieldZone with ID '{zone_id}' not found."
        )
        
    zone.verification_status = payload.verification_status
    zone.verified_by_id = current_user.id
    zone.verified_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(zone)
    
    logger.info("Zone %s %s by %s", zone.name, payload.verification_status, current_user.email)
    return zone
