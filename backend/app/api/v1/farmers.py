"""
AgriMap DSP — Farmers API Endpoints
CRUD for farmer profiles in the registry.
"""
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.farmer import Farmer
from app.models.user import User
from app.schemas.farmer import FarmerCreate, FarmerUpdate, FarmerRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/farmers", tags=["Farmers"])


@router.post("/", response_model=FarmerRead, status_code=status.HTTP_201_CREATED)
def create_farmer(
    payload: FarmerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new farmer profile in the registry.
    """
    farmer = Farmer(**payload.model_dump())
    db.add(farmer)
    db.commit()
    db.refresh(farmer)
    
    logger.info("Farmer created: %s by %s", farmer.full_name, current_user.email)
    return farmer


@router.get("/", response_model=dict)
def list_farmers(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a paginated list of registered farmers.
    """
    query = db.query(Farmer)
    total = query.count()
    farmers = query.offset(skip).limit(limit).all()
    
    return {
        "items": [FarmerRead.model_validate(f) for f in farmers],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{farmer_id}", response_model=FarmerRead)
def get_farmer(
    farmer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve details of a specific farmer.
    """
    farmer = db.get(Farmer, farmer_id)
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer with ID '{farmer_id}' not found."
        )
    return farmer


@router.put("/{farmer_id}", response_model=FarmerRead)
def update_farmer(
    farmer_id: uuid.UUID,
    payload: FarmerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update farmer details.
    """
    farmer = db.get(Farmer, farmer_id)
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer with ID '{farmer_id}' not found."
        )
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(farmer, key, value)
        
    db.commit()
    db.refresh(farmer)
    
    logger.info("Farmer updated: %s by %s", farmer.full_name, current_user.email)
    return farmer


@router.delete("/{farmer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farmer(
    farmer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific farmer.
    """
    farmer = db.get(Farmer, farmer_id)
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer with ID '{farmer_id}' not found."
        )
    
    db.delete(farmer)
    db.commit()
    
    logger.info("Farmer deleted: %s by %s", farmer_id, current_user.email)
    return
