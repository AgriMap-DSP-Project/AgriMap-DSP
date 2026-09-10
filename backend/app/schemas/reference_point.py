import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator, ConfigDict
from app.core.spatial import spatial_to_geojson


class ReferencePointBase(BaseModel):
    name: str = Field(..., max_length=255)
    elevation_meters: Optional[float] = None
    horizontal_accuracy_meters: Optional[float] = None
    marker_type: str = Field(..., description="Must be one of: concrete_monument, rebar, brass_cap, temporary")
    description: Optional[str] = None


class ReferencePointCreate(ReferencePointBase):
    project_id: uuid.UUID
    field_id: Optional[uuid.UUID] = None
    geom: Dict[str, Any] = Field(
        ...,
        description="GeoJSON Point representation, e.g. {'type': 'Point', 'coordinates': [lon, lat]}"
    )


class ReferencePointUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    elevation_meters: Optional[float] = None
    horizontal_accuracy_meters: Optional[float] = None
    marker_type: Optional[str] = None
    description: Optional[str] = None
    geom: Optional[Dict[str, Any]] = None


class ReferencePointRead(ReferencePointBase):
    id: uuid.UUID
    project_id: uuid.UUID
    field_id: Optional[uuid.UUID] = None
    geom: Dict[str, Any]
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
                "id": "66666666-6666-6666-6666-666666666666",
                "project_id": "11111111-1111-1111-1111-111111111111",
                "field_id": "33333333-3333-3333-3333-333333333333",
                "name": "Benchmark Ref 01",
                "geom": {
                    "type": "Point",
                    "coordinates": [23.7271, 37.9821]
                },
                "elevation_meters": 128.45,
                "horizontal_accuracy_meters": 0.02,
                "marker_type": "concrete_monument",
                "description": "Primary surveyor benchmark.",
                "verification_status": "verified",
                "verified_by_id": "00000000-0000-0000-0000-000000000002",
                "verified_at": "2026-08-14T12:20:00Z",
                "created_by_id": "00000000-0000-0000-0000-000000000001",
                "created_at": "2026-08-14T12:00:00Z",
                "updated_at": "2026-08-14T12:00:00Z"
            }
        }
    )

