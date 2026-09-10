"""
AgriMap DSP — Projects API Endpoints
CRUD for digital mapping pre-assessment projects.
"""
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("/", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new digital mapping pre-assessment project.
    """
    project = Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    
    logger.info("Project created: %s by %s", project.name, current_user.email)
    return project


@router.get("/", response_model=dict)
def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str = Query(None, alias="status", description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a paginated list of projects.
    """
    query = db.query(Project)
    if status_filter:
        query = query.filter(Project.status == status_filter)
    
    total = query.count()
    projects = query.offset(skip).limit(limit).all()
    
    return {
        "items": [ProjectRead.model_validate(p) for p in projects],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve details of a specific project.
    """
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found."
        )
    return project


@router.put("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update project details.
    """
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found."
        )
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
        
    db.commit()
    db.refresh(project)
    
    logger.info("Project updated: %s by %s", project.name, current_user.email)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific project.
    """
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found."
        )
    
    db.delete(project)
    db.commit()
    
    logger.info("Project deleted: %s by %s", project_id, current_user.email)
    return
