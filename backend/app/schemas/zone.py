import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator, ConfigDict
from app.core.spatial import spatial_to_geojson


class FieldZoneBase(BaseModel):
    name: str = Field(..., max_length=255)
    zone_type: str = Field(..., max_length=50)
    description: Optional[str] = None


class FieldZoneCreate(FieldZoneBase):
    field_id: uuid.UUID
    boundary: Dict[str, Any] = Field(
        ...,
        description="GeoJSON Polygon boundary representation, e.g. {'type': 'Polygon', 'coordinates': [[[lon, lat], ...]]}"
    )


class FieldZoneUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    zone_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    boundary: Optional[Dict[str, Any]] = None


class FieldZoneRead(FieldZoneBase):
    id: uuid.UUID
    field_id: uuid.UUID
    boundary: Dict[str, Any]
    verification_status: str
    verified_by_id: Optional[uuid.UUID] = None
    verified_at: Optional[datetime] = None
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def convert_spatial(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            boundary_geojson = spatial_to_geojson(getattr(data, "boundary", None))
            
            result = {}
            for field_name in cls.model_fields:
                if field_name == "boundary":
                    result["boundary"] = boundary_geojson
                else:
                    result[field_name] = getattr(data, field_name, None)
            return result
        return data

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "44444444-4444-4444-4444-444444444441",
                "field_id": "33333333-3333-3333-3333-333333333333",
                "name": "Zone A - Sandy Soil",
                "boundary": {
                    "type": "Polygon",
                    "coordinates": [[[23.7272, 37.9822], [23.7278, 37.9822], [23.7278, 37.9838], [23.7272, 37.9838], [23.7272, 37.9822]]]
                },
                "zone_type": "soil_type",
                "description": "Sandy loam soil, excellent drainage.",
                "verification_status": "verified",
                "verified_by_id": "00000000-0000-0000-0000-000000000002",
                "verified_at": "2026-08-14T12:05:00Z",
                "created_by_id": "00000000-0000-0000-0000-000000000001",
                "created_at": "2026-08-14T12:00:00Z",
                "updated_at": "2026-08-14T12:00:00Z"
            }
        }
    )

