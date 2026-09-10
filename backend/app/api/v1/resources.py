"""
AgriMap DSP — Resources API Endpoints
CRUD and verification for agricultural resources (water, power, irrigation, structures).
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
from app.models.resource import Resource
from app.models.user import User
from app.schemas.resource import (
    ResourceCreate, ResourceUpdate, ResourceRead
)
from app.schemas.field import FieldVerificationUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resources", tags=["Resources"])


@router.post("/", response_model=ResourceRead, status_code=status.HTTP_201_CREATED)
def create_resource(
    payload: ResourceCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new agricultural resource (e.g. water source, power, structures).
    Accepts generic GeoJSON coordinates (Point, LineString, or Polygon) under the geom field.
    """
    data = payload.model_dump()
    geojson_geom = data.pop("geom")
    
    try:
        spatial_geom = geojson_to_spatial(geojson_geom)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        
    resource = Resource(
        **data,
        geom=spatial_geom,
        created_by_id=current_user.id,
        verification_status="pending"
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    
    logger.info("Resource created: %s (%s) by %s", resource.name, resource.resource_class, current_user.email)
    return resource


@router.get("/", response_model=dict)
def list_resources(
    project_id: Optional[uuid.UUID] = None,
    field_id: Optional[uuid.UUID] = None,
    resource_class: Optional[str] = Query(None, description="Filter by category (WATER, POWER, IRRIGATION, STRUCTURE, OTHER)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a paginated list of resources. Optionally filter by project, field, or class.
    """
    query = db.query(Resource)
    if project_id:
        query = query.filter(Resource.project_id == project_id)
    if field_id:
        query = query.filter(Resource.field_id == field_id)
    if resource_class:
        query = query.filter(Resource.resource_class == resource_class)
    
    total = query.count()
    resources = query.offset(skip).limit(limit).all()
    
    return {
        "items": [ResourceRead.model_validate(r) for r in resources],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{resource_id}", response_model=ResourceRead)
def get_resource(
    resource_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve details of a specific resource.
    """
    resource = db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID '{resource_id}' not found."
        )
    return resource


@router.put("/{resource_id}", response_model=ResourceRead)
def update_resource(
    resource_id: uuid.UUID,
    payload: ResourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update resource properties or geometry coordinates.
    """
    resource = db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID '{resource_id}' not found."
        )
        
    update_data = payload.model_dump(exclude_unset=True)
    
    if "geom" in update_data:
        geojson_geom = update_data.pop("geom")
        if geojson_geom is not None:
            try:
                resource.geom = geojson_to_spatial(geojson_geom)
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
                
    for key, value in update_data.items():
        setattr(resource, key, value)
        
    db.commit()
    db.refresh(resource)
    
    logger.info("Resource updated: %s by %s", resource.name, current_user.email)
    return resource


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    resource_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a resource.
    """
    resource = db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID '{resource_id}' not found."
        )
        
    db.delete(resource)
    db.commit()
    
    logger.info("Resource deleted: %s by %s", resource_id, current_user.email)
    return


# --- Verification Endpoint ---

@router.patch("/{resource_id}/verify", response_model=ResourceRead)
def verify_resource(
    resource_id: uuid.UUID,
    payload: FieldVerificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Approve or reject an agricultural infrastructure resource. Requires verifier or admin role.
    """
    if current_user.role not in ("verifier", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only verifiers and admins can verify resources."
        )
    
    resource = db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID '{resource_id}' not found."
        )
        
    resource.verification_status = payload.verification_status
    resource.verification_notes = payload.verification_notes
    resource.verified_by_id = current_user.id
    resource.verified_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(resource)
    
    logger.info("Resource %s %s by %s", resource.name, payload.verification_status, current_user.email)
    return resource
