"""
AgriMap DSP — Export Service
Exports field data to GeoJSON, CSV, and JSON summary formats.
"""
import csv
import io
import json
import uuid
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.field import Field
from app.models.zone import FieldZone
from app.models.resource import Resource
from app.models.observation import Observation
from app.models.photo import Photo
from app.models.project import Project
from app.models.farmer import Farmer
from app.core.spatial import spatial_to_geojson

logger = logging.getLogger(__name__)


def export_field_geojson(field_id: uuid.UUID, db: Session) -> Dict[str, Any]:
    """
    Export a field and all its related data as a GeoJSON FeatureCollection.
    Includes: field boundary, zones, resources, observations, reference points.
    """
    field = db.get(Field, field_id)
    if not field:
        raise ValueError(f"Field {field_id} not found")

    features = []

    # Main field boundary
    if field.boundary:
        boundary_geojson = spatial_to_geojson(field.boundary)
        features.append({
            "type": "Feature",
            "geometry": boundary_geojson,
            "properties": {
                "id": str(field.id),
                "entity_type": "field",
                "name": field.name,
                "crop_history_summary": field.crop_history_summary,
                "calculated_area_hectares": float(field.calculated_area_hectares) if field.calculated_area_hectares else None,
                "verification_status": field.verification_status,
            }
        })

    # Zones within the field
    zones = db.query(FieldZone).filter(FieldZone.field_id == field_id).all()
    for zone in zones:
        if zone.boundary:
            features.append({
                "type": "Feature",
                "geometry": spatial_to_geojson(zone.boundary),
                "properties": {
                    "id": str(zone.id),
                    "entity_type": "zone",
                    "name": zone.name,
                    "zone_type": zone.zone_type,
                    "verification_status": zone.verification_status,
                }
            })

    # Resources linked to field
    resources = db.query(Resource).filter(Resource.field_id == field_id).all()
    for resource in resources:
        if resource.geom:
            features.append({
                "type": "Feature",
                "geometry": spatial_to_geojson(resource.geom),
                "properties": {
                    "id": str(resource.id),
                    "entity_type": "resource",
                    "name": resource.name,
                    "resource_class": resource.resource_class,
                    "verification_status": resource.verification_status,
                }
            })

    # Observations linked to field
    observations = db.query(Observation).filter(Observation.field_id == field_id).all()
    for obs in observations:
        if obs.geom:
            features.append({
                "type": "Feature",
                "geometry": spatial_to_geojson(obs.geom),
                "properties": {
                    "id": str(obs.id),
                    "entity_type": "observation",
                    "category": obs.category,
                    "notes": obs.notes,
                    "verification_status": obs.verification_status,
                }
            })

    return {
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "field_id": str(field_id),
            "field_name": field.name,
            "feature_count": len(features),
            "exported_at": datetime.now(timezone.utc).isoformat(),
        }
    }


def export_field_csv(field_id: uuid.UUID, db: Session) -> str:
    """
    Export field resources and observations as CSV rows.
    Returns CSV string content.
    """
    field = db.get(Field, field_id)
    if not field:
        raise ValueError(f"Field {field_id} not found")

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "entity_type", "id", "name", "class_or_category",
        "description", "verification_status", "created_at"
    ])

    # Field row
    writer.writerow([
        "field", str(field.id), field.name, field.crop_history_summary or "",
        field.verification_notes or "", field.verification_status,
        field.created_at.isoformat() if field.created_at else ""
    ])

    # Resources
    resources = db.query(Resource).filter(Resource.field_id == field_id).all()
    for r in resources:
        writer.writerow([
            "resource", str(r.id), r.name, r.resource_class,
            str(r.attributes) if r.attributes else "", r.verification_status,
            r.created_at.isoformat() if r.created_at else ""
        ])

    # Observations
    observations = db.query(Observation).filter(Observation.field_id == field_id).all()
    for o in observations:
        writer.writerow([
            "observation", str(o.id), o.category or "", o.category,
            o.notes or "", o.verification_status,
            o.created_at.isoformat() if o.created_at else ""
        ])

    return output.getvalue()


def export_project_summary(project_id: uuid.UUID, db: Session) -> Dict[str, Any]:
    """
    Export a project summary including counts and status of all entities.
    """
    project = db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")

    fields = db.query(Field).filter(Field.project_id == project_id).all()
    resources = db.query(Resource).filter(Resource.project_id == project_id).all()

    # Count verification statuses
    field_statuses = {}
    for f in fields:
        status = f.verification_status or "pending"
        field_statuses[status] = field_statuses.get(status, 0) + 1

    resource_statuses = {}
    resource_classes = {}
    for r in resources:
        status = r.verification_status or "pending"
        resource_statuses[status] = resource_statuses.get(status, 0) + 1
        rc = r.resource_class or "UNKNOWN"
        resource_classes[rc] = resource_classes.get(rc, 0) + 1

    return {
        "project": {
            "id": str(project.id),
            "name": project.name,
            "status": project.status,
            "description": project.description,
        },
        "summary": {
            "total_fields": len(fields),
            "total_resources": len(resources),
            "field_verification": field_statuses,
            "resource_verification": resource_statuses,
            "resource_by_class": resource_classes,
        },
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }
