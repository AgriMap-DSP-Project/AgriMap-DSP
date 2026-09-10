"""
AgriMap DSP — GeoJSON Data Ingestion Service
Parses GeoJSON/FeatureCollection files from GPS devices and creates field/resource records.
"""
import uuid
import json
import logging
from typing import Dict, Any, List

from sqlalchemy.orm import Session

from app.models.field import Field
from app.models.resource import Resource
from app.core.spatial import geojson_to_spatial

logger = logging.getLogger(__name__)


class GeoJSONIngestionResult:
    """Holds the result of a GeoJSON ingestion job."""

    def __init__(self):
        self.fields_created: int = 0
        self.resources_created: int = 0
        self.errors: List[Dict[str, Any]] = []
        self.created_ids: List[str] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "fields_created": self.fields_created,
            "resources_created": self.resources_created,
            "total_features_processed": self.fields_created + self.resources_created + len(self.errors),
            "created_ids": self.created_ids,
            "error_count": len(self.errors),
            "errors": self.errors[:50],
        }


def ingest_geojson(
    file_content: bytes,
    project_id: uuid.UUID,
    created_by_id: uuid.UUID,
    db: Session,
) -> GeoJSONIngestionResult:
    """
    Parse a GeoJSON FeatureCollection and create records based on geometry type:
    - MultiPolygon/Polygon → Field boundary
    - Point → Resource (default class: OTHER)
    - LineString → Resource (default class: OTHER)

    Feature properties are mapped to record fields when property names match.
    """
    result = GeoJSONIngestionResult()

    try:
        data = json.loads(file_content.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        result.errors.append({"feature": 0, "error": f"Invalid JSON: {e}"})
        return result

    # Handle both FeatureCollection and single Feature
    features = []
    if data.get("type") == "FeatureCollection":
        features = data.get("features", [])
    elif data.get("type") == "Feature":
        features = [data]
    elif data.get("type") in ("Point", "MultiPolygon", "Polygon", "LineString"):
        # Raw geometry without Feature wrapper
        features = [{"type": "Feature", "geometry": data, "properties": {}}]
    else:
        result.errors.append({"feature": 0, "error": f"Unsupported GeoJSON type: {data.get('type')}"})
        return result

    for idx, feature in enumerate(features):
        try:
            geometry = feature.get("geometry", {})
            properties = feature.get("properties", {}) or {}
            geom_type = geometry.get("type", "")

            spatial_geom = geojson_to_spatial(geometry)

            if geom_type in ("MultiPolygon", "Polygon"):
                # Handle Polygon -> MultiPolygon conversion if necessary
                if geom_type == "Polygon":
                    spatial_geom_data = {
                        "type": "MultiPolygon",
                        "coordinates": [geometry["coordinates"]]
                    }
                    spatial_geom = geojson_to_spatial(spatial_geom_data)
                else:
                    spatial_geom = geojson_to_spatial(geometry)

                # Create a Field record
                field = Field(
                    name=properties.get("name", f"Imported Field {idx + 1}"),
                    project_id=project_id,
                    farmer_id=uuid.UUID(properties["farmer_id"]) if properties.get("farmer_id") else None,
                    boundary=spatial_geom,
                    calculated_area_hectares=float(properties.get("calculated_area_hectares", properties.get("area_hectares", 1.0))),
                    crop_history_summary=properties.get("crop_history_summary", properties.get("crop_type")),
                    created_by_id=created_by_id,
                    verification_status="pending",
                )
                db.add(field)
                db.flush()
                result.fields_created += 1
                result.created_ids.append(str(field.id))

            elif geom_type in ("Point", "LineString"):
                # Create a Resource record
                resource_class = properties.get("resource_class", "OTHER").upper()
                resource_type = properties.get("resource_type", resource_class).upper()
                resource = Resource(
                    name=properties.get("name", f"Imported Resource {idx + 1}"),
                    project_id=project_id,
                    resource_class=resource_class,
                    resource_type=resource_type,
                    geom=spatial_geom,
                    attributes={k: v for k, v in properties.items()
                                if k not in ("name", "resource_class", "resource_type", "project_id", "field_id")},
                    created_by_id=created_by_id,
                    verification_status="pending",
                )
                db.add(resource)
                db.flush()
                result.resources_created += 1
                result.created_ids.append(str(resource.id))
            else:
                result.errors.append({"feature": idx, "error": f"Unsupported geometry type: {geom_type}"})

        except Exception as e:
            result.errors.append({"feature": idx, "error": str(e)})

    if result.fields_created > 0 or result.resources_created > 0:
        db.commit()
        logger.info(
            "GeoJSON ingestion: %d fields, %d resources created, %d errors",
            result.fields_created, result.resources_created, len(result.errors)
        )

    return result
