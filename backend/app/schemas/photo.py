import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator, ConfigDict
from app.core.spatial import spatial_to_geojson


class PhotoBase(BaseModel):
    file_path: str = Field(..., max_length=512)
    mime_type: str = Field(..., max_length=100)
    file_size_bytes: int = Field(..., gt=0)
    direction_degrees: Optional[float] = Field(None, ge=0.0, le=360.0)
    captured_at: Optional[datetime] = None
    description: Optional[str] = None


class PhotoCreate(PhotoBase):
    field_id: Optional[uuid.UUID] = None
    zone_id: Optional[uuid.UUID] = None
    resource_id: Optional[uuid.UUID] = None
    observation_id: Optional[uuid.UUID] = None
    geom: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional GeoJSON Point representation of photo capture coordinates, e.g. {'type': 'Point', 'coordinates': [lon, lat]}"
    )


class PhotoUpdate(BaseModel):
    file_path: Optional[str] = Field(None, max_length=512)
    mime_type: Optional[str] = Field(None, max_length=100)
    file_size_bytes: Optional[int] = Field(None, gt=0)
    direction_degrees: Optional[float] = Field(None, ge=0.0, le=360.0)
    captured_at: Optional[datetime] = None
    description: Optional[str] = None
    geom: Optional[Dict[str, Any]] = None


class PhotoRead(PhotoBase):
    id: uuid.UUID
    field_id: Optional[uuid.UUID] = None
    zone_id: Optional[uuid.UUID] = None
    resource_id: Optional[uuid.UUID] = None
    observation_id: Optional[uuid.UUID] = None
    geom: Optional[Dict[str, Any]] = None
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def convert_spatial(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            geom_val = getattr(data, "geom", None)
            geom_geojson = spatial_to_geojson(geom_val) if geom_val is not None else None
            
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
                "id": "88888888-8888-8888-8888-888888888801",
                "file_path": "https://storage.googleapis.com/agrilythos-agx-preassessment/photos/borehole_well_alpha.jpg",
                "mime_type": "image/jpeg",
                "file_size_bytes": 3452102,
                "direction_degrees": 45.50,
                "captured_at": "2026-08-14T09:31:00Z",
                "description": "Borehole pump control unit showing pressure reading 3.2 bar.",
                "field_id": "33333333-3333-3333-3333-333333333333",
                "zone_id": "44444444-4444-4444-4444-444444444441",
                "resource_id": "55555555-5555-5555-5555-555555555501",
                "observation_id": "77777777-7777-7777-7777-777777777701",
                "geom": {
                    "type": "Point",
                    "coordinates": [23.7274, 37.9831]
                },
                "created_by_id": "00000000-0000-0000-0000-000000000001",
                "created_at": "2026-08-14T12:00:00Z",
                "updated_at": "2026-08-14T12:00:00Z"
            }
        }
    )

