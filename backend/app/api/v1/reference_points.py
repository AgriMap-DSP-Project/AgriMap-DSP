"""
AgriMap DSP — Reference Points API Endpoints
CRUD and verification for survey reference points (landmarks, access points, monuments).
"""
import logging
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.spatial import geojson_to_spatial, spatial_to_geojson
from app.models.reference_point import ReferencePoint
from app.models.user import User
from app.schemas.reference_point import (
    ReferencePointCreate, ReferencePointUpdate, ReferencePointRead
)
from app.schemas.field import FieldVerificationUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reference-points", tags=["Reference Points"])


@router.post("/", response_model=ReferencePointRead, status_code=status.HTTP_201_CREATED)
def create_reference_point(
    data: ReferencePointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new reference point (landmark, access point, survey monument, etc.).
    """
    spatial_geom = geojson_to_spatial(data.geom)
    
    db_ref_point = ReferencePoint(
        project_id=data.project_id,
        field_id=data.field_id,
        name=data.name,
        geom=spatial_geom,
        elevation_meters=data.elevation_meters,
        horizontal_accuracy_meters=data.horizontal_accuracy_meters,
        marker_type=data.marker_type,
        description=data.description,
        created_by_id=current_user.id,
    )
    db.add(db_ref_point)
    db.commit()
    db.refresh(db_ref_point)
    
    logger.info("Reference point created: %s by %s", db_ref_point.name, current_user.email)
    return db_ref_point


@router.get("/", response_model=dict)
def list_reference_points(
    project_id: uuid.UUID = Query(None, description="Filter by project"),
    field_id: uuid.UUID = Query(None, description="Filter by field"),
    marker_type: str = Query(None, description="Filter by marker type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List reference points with optional filters. Paginated.
    """
    query = db.query(ReferencePoint)
    if project_id:
        query = query.filter(ReferencePoint.project_id == project_id)
    if field_id:
        query = query.filter(ReferencePoint.field_id == field_id)
    if marker_type:
        query = query.filter(ReferencePoint.marker_type == marker_type)
    
    total = query.count()
    ref_points = query.offset(skip).limit(limit).all()
    
    return {
        "items": [ReferencePointRead.model_validate(rp) for rp in ref_points],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{ref_point_id}", response_model=ReferencePointRead)
def get_reference_point(
    ref_point_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a single reference point by ID.
    """
    ref_point = db.query(ReferencePoint).filter(ReferencePoint.id == ref_point_id).first()
    if not ref_point:
        raise HTTPException(status_code=404, detail="Reference point not found")
    return ref_point


@router.put("/{ref_point_id}", response_model=ReferencePointRead)
def update_reference_point(
    ref_point_id: uuid.UUID,
    update_data: ReferencePointUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing reference point.
    """
    ref_point = db.query(ReferencePoint).filter(ReferencePoint.id == ref_point_id).first()
    if not ref_point:
        raise HTTPException(status_code=404, detail="Reference point not found")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    
    # Convert GeoJSON to spatial if geometry is being updated
    if "geom" in update_dict and update_dict["geom"] is not None:
        update_dict["geom"] = geojson_to_spatial(update_dict["geom"])
    
    for key, value in update_dict.items():
        setattr(ref_point, key, value)
    
    db.commit()
    db.refresh(ref_point)
    
    logger.info("Reference point updated: %s by %s", ref_point.name, current_user.email)
    return ref_point


@router.delete("/{ref_point_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reference_point(
    ref_point_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a reference point.
    """
    ref_point = db.query(ReferencePoint).filter(ReferencePoint.id == ref_point_id).first()
    if not ref_point:
        raise HTTPException(status_code=404, detail="Reference point not found")
    
    db.delete(ref_point)
    db.commit()
    
    logger.info("Reference point deleted: %s by %s", ref_point.name, current_user.email)


@router.patch("/{ref_point_id}/verify", response_model=ReferencePointRead)
def verify_reference_point(
    ref_point_id: uuid.UUID,
    verification: FieldVerificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verify or reject a reference point. Requires verifier or admin role.
    """
    if current_user.role not in ("verifier", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only verifiers and admins can verify reference points."
        )
    
    ref_point = db.query(ReferencePoint).filter(ReferencePoint.id == ref_point_id).first()
    if not ref_point:
        raise HTTPException(status_code=404, detail="Reference point not found")
    
    ref_point.verification_status = verification.verification_status
    ref_point.verified_by_id = current_user.id
    ref_point.verified_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(ref_point)
    
    logger.info("Reference point %s %s by %s", ref_point.name, verification.verification_status, current_user.email)
    return ref_point
