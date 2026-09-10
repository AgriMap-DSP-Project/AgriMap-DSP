import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator, ConfigDict
from app.core.spatial import spatial_to_geojson


class ResourceBase(BaseModel):
    name: str = Field(..., max_length=255)
    resource_class: str = Field(..., description="Must be one of: WATER, POWER, IRRIGATION, STRUCTURE, OTHER")
    resource_type: str = Field(..., max_length=50, description="e.g. well, solar_panel, drip_line, barn")
    attributes: Dict[str, Any] = Field(default_factory=dict, description="Metadata dictionary for resource details")
    status: str = Field("NEEDS_VERIFICATION", description="Must be one of: EXISTING, UNAVAILABLE, NEEDS_VERIFICATION")


class ResourceCreate(ResourceBase):
    project_id: uuid.UUID
    field_id: Optional[uuid.UUID] = None
    geom: Dict[str, Any] = Field(
        ...,
        description="GeoJSON Geometry representation (Point, LineString, or Polygon)"
    )


class ResourceUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    resource_class: Optional[str] = None
    resource_type: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    geom: Optional[Dict[str, Any]] = None


class ResourceRead(ResourceBase):
    id: uuid.UUID
    project_id: uuid.UUID
    field_id: Optional[uuid.UUID] = None
    geom: Dict[str, Any]
    verification_status: str
    verified_by_id: Optional[uuid.UUID] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def convert_spatial(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            geom_geojson = spatial_to_geojson(getattr(data, "geom", None))
            
            result = {}
            for field_name in cls.model_fields:
                if field_name == "geom":
                    result["geom"] = geom_geojson
                else:
                    result[field_name] = getattr(data, field_name, None)
            return result
        return data

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "55555555-5555-5555-5555-555555555501",
                "project_id": "11111111-1111-1111-1111-111111111111",
                "field_id": "33333333-3333-3333-3333-333333333333",
                "name": "Borehole Well Alpha",
                "resource_class": "WATER",
                "resource_type": "borehole",
                "geom": {
                    "type": "Point",
                    "coordinates": [23.7275, 37.9830]
                },
                "attributes": {
                    "depth_meters": 85.0,
                    "casing_material": "PVC",
                    "estimated_yield_m3_hour": 12.5
                },
                "status": "EXISTING",
                "verification_status": "verified",
                "verified_by_id": "00000000-0000-0000-0000-000000000002",
                "verified_at": "2026-08-14T12:10:00Z",
                "verification_notes": "Well structure verified.",
                "created_by_id": "00000000-0000-0000-0000-000000000001",
                "created_at": "2026-08-14T12:00:00Z",
                "updated_at": "2026-08-14T12:00:00Z"
            }
        }
    )

