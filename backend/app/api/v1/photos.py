"""
AgriMap DSP — Photos API Endpoints
CRUD for photo metadata and file upload/download for field photographs.
"""
import os
import uuid
import shutil
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.spatial import geojson_to_spatial
from app.models.photo import Photo
from app.models.user import User
from app.schemas.photo import (
    PhotoCreate, PhotoUpdate, PhotoRead
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/photos", tags=["Photos"])


@router.post("/", response_model=PhotoRead, status_code=status.HTTP_201_CREATED)
def create_photo(
    payload: PhotoCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Log metadata for a surveyor photograph taken during pre-assessment.
    An optional GeoJSON Point coordinate under the geom field can specify the photo location.
    """
    data = payload.model_dump()
    geojson_geom = data.pop("geom")
    
    spatial_geom = None
    if geojson_geom is not None:
        try:
            spatial_geom = geojson_to_spatial(geojson_geom)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        
    photo = Photo(
        **data,
        geom=spatial_geom,
        created_by_id=current_user.id
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    
    logger.info("Photo metadata created: %s by %s", photo.id, current_user.email)
    return photo


@router.post("/upload", response_model=PhotoRead, status_code=status.HTTP_201_CREATED)
def upload_photo(
    file: UploadFile = File(..., description="Photo file to upload"),
    field_id: Optional[uuid.UUID] = Form(None),
    zone_id: Optional[uuid.UUID] = Form(None),
    resource_id: Optional[uuid.UUID] = Form(None),
    observation_id: Optional[uuid.UUID] = Form(None),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a photo file and create the metadata record.
    The file is saved to the uploads directory and metadata is stored in the database.
    """
    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/tiff"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{file.content_type}' not allowed. Allowed: {', '.join(allowed_types)}"
        )
    
    # Validate file size
    max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    content = file.file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE_MB}MB"
        )
    file.file.seek(0)
    
    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_name = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)
    
    # Save file
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    # Create photo record
    photo = Photo(
        file_path=file_path,
        mime_type=file.content_type or "image/jpeg",
        file_size_bytes=len(content),
        description=description,
        field_id=field_id,
        zone_id=zone_id,
        resource_id=resource_id,
        observation_id=observation_id,
        created_by_id=current_user.id,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    
    logger.info("Photo uploaded: %s (%d bytes) by %s", unique_name, len(content), current_user.email)
    return photo


@router.get("/{photo_id}/download")
def download_photo(
    photo_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download/serve a photo file by its record ID.
    """
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    if not os.path.exists(photo.file_path):
        raise HTTPException(status_code=404, detail="Photo file not found on disk")
    
    return FileResponse(
        path=photo.file_path,
        media_type=photo.mime_type,
        filename=os.path.basename(photo.file_path)
    )


@router.get("/", response_model=dict)
def list_photos(
    field_id: Optional[uuid.UUID] = None,
    zone_id: Optional[uuid.UUID] = None,
    resource_id: Optional[uuid.UUID] = None,
    observation_id: Optional[uuid.UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a paginated list of photo references.
    """
    query = db.query(Photo)
    if field_id:
        query = query.filter(Photo.field_id == field_id)
    if zone_id:
        query = query.filter(Photo.zone_id == zone_id)
    if resource_id:
        query = query.filter(Photo.resource_id == resource_id)
    if observation_id:
        query = query.filter(Photo.observation_id == observation_id)
    
    total = query.count()
    photos = query.offset(skip).limit(limit).all()
    
    return {
        "items": [PhotoRead.model_validate(p) for p in photos],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{photo_id}", response_model=PhotoRead)
def get_photo(
    photo_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve details of a specific photo record.
    """
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Photo with ID '{photo_id}' not found."
        )
    return photo


@router.put("/{photo_id}", response_model=PhotoRead)
def update_photo(
    photo_id: uuid.UUID,
    payload: PhotoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update photo metadata reference.
    """
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Photo with ID '{photo_id}' not found."
        )
        
    update_data = payload.model_dump(exclude_unset=True)
    
    if "geom" in update_data:
        geojson_geom = update_data.pop("geom")
        if geojson_geom is not None:
            try:
                photo.geom = geojson_to_spatial(geojson_geom)
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        else:
            photo.geom = None
                
    for key, value in update_data.items():
        setattr(photo, key, value)
        
    db.commit()
    db.refresh(photo)
    
    logger.info("Photo updated: %s by %s", photo_id, current_user.email)
    return photo


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(
    photo_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a photo reference and its file.
    """
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Photo with ID '{photo_id}' not found."
        )
    
    # Delete file from disk if it exists locally
    if photo.file_path and os.path.exists(photo.file_path):
        os.remove(photo.file_path)
        
    db.delete(photo)
    db.commit()
    
    logger.info("Photo deleted: %s by %s", photo_id, current_user.email)
    return
