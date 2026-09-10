"""
AgriMap DSP — Observations API Endpoints
CRUD and verification for field observations and assessment notes.
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
from app.models.observation import Observation
from app.models.user import User
from app.schemas.observation import (
    ObservationCreate, ObservationUpdate, ObservationRead
)
from app.schemas.field import FieldVerificationUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/observations", tags=["Observations"])


@router.post("/", response_model=ObservationRead, status_code=status.HTTP_201_CREATED)
def create_observation(
    payload: ObservationCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Log a surveyor observation/assessment report.
    An optional GeoJSON Point coordinate under the geom field can mark the observation location.
    """
    data = payload.model_dump()
    geojson_geom = data.pop("geom")
    
    spatial_geom = None
    if geojson_geom is not None:
        try:
            spatial_geom = geojson_to_spatial(geojson_geom)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        
    observation = Observation(
        **data,
        geom=spatial_geom,
        created_by_id=current_user.id,
        verification_status="pending"
    )
    db.add(observation)
    db.commit()
    db.refresh(observation)
    
    logger.info("Observation created: %s by %s", observation.category, current_user.email)
    return observation


@router.get("/", response_model=dict)
def list_observations(
    field_id: Optional[uuid.UUID] = None,
    zone_id: Optional[uuid.UUID] = None,
    resource_id: Optional[uuid.UUID] = None,
    category: Optional[str] = Query(None, description="Filter by category (soil_health, crop_growth, pest_weed_infestation, damage, general)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a paginated list of surveyor observations.
    """
    query = db.query(Observation)
    if field_id:
        query = query.filter(Observation.field_id == field_id)
    if zone_id:
        query = query.filter(Observation.zone_id == zone_id)
    if resource_id:
        query = query.filter(Observation.resource_id == resource_id)
    if category:
        query = query.filter(Observation.category == category)
    
    total = query.count()
    observations = query.offset(skip).limit(limit).all()
    
    return {
        "items": [ObservationRead.model_validate(o) for o in observations],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{observation_id}", response_model=ObservationRead)
def get_observation(
    observation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve details of a specific observation log.
    """
    observation = db.get(Observation, observation_id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with ID '{observation_id}' not found."
        )
    return observation


@router.put("/{observation_id}", response_model=ObservationRead)
def update_observation(
    observation_id: uuid.UUID,
    payload: ObservationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update observation details.
    """
    observation = db.get(Observation, observation_id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with ID '{observation_id}' not found."
        )
        
    update_data = payload.model_dump(exclude_unset=True)
    
    if "geom" in update_data:
        geojson_geom = update_data.pop("geom")
        if geojson_geom is not None:
            try:
                observation.geom = geojson_to_spatial(geojson_geom)
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        else:
            observation.geom = None
                
    for key, value in update_data.items():
        setattr(observation, key, value)
        
    db.commit()
    db.refresh(observation)
    
    logger.info("Observation updated: %s by %s", observation_id, current_user.email)
    return observation


@router.delete("/{observation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_observation(
    observation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an observation.
    """
    observation = db.get(Observation, observation_id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with ID '{observation_id}' not found."
        )
        
    db.delete(observation)
    db.commit()
    
    logger.info("Observation deleted: %s by %s", observation_id, current_user.email)
    return


# --- Verification Endpoint ---

@router.patch("/{observation_id}/verify", response_model=ObservationRead)
def verify_observation(
    observation_id: uuid.UUID,
    payload: FieldVerificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Approve or reject a surveyor observation. Requires verifier or admin role.
    """
    if current_user.role not in ("verifier", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only verifiers and admins can verify observations."
        )
    
    observation = db.get(Observation, observation_id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with ID '{observation_id}' not found."
        )
        
    observation.verification_status = payload.verification_status
    observation.verified_by_id = current_user.id
    observation.verified_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(observation)
    
    logger.info("Observation %s by %s", payload.verification_status, current_user.email)
    return observation
