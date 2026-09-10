import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator, ConfigDict
from app.core.spatial import spatial_to_geojson


class ObservationBase(BaseModel):
    category: str = Field(..., description="Must be one of: soil_health, crop_growth, pest_weed_infestation, damage, general")
    notes: str


class ObservationCreate(ObservationBase):
    project_id: uuid.UUID
    field_id: Optional[uuid.UUID] = None
    zone_id: Optional[uuid.UUID] = None
    resource_id: Optional[uuid.UUID] = None
    geom: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional GeoJSON Point representation, e.g. {'type': 'Point', 'coordinates': [lon, lat]}"
    )


class ObservationUpdate(BaseModel):
    category: Optional[str] = None
    notes: Optional[str] = None
    geom: Optional[Dict[str, Any]] = None


class ObservationRead(ObservationBase):
    id: uuid.UUID
    project_id: uuid.UUID
    field_id: Optional[uuid.UUID] = None
    zone_id: Optional[uuid.UUID] = None
    resource_id: Optional[uuid.UUID] = None
    geom: Optional[Dict[str, Any]] = None
    observed_at: datetime
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
                "id": "77777777-7777-7777-7777-777777777701",
                "project_id": "11111111-1111-1111-1111-111111111111",
                "field_id": "33333333-3333-3333-3333-333333333333",
                "name": "Olive Grove Alpha",
                "zone_id": "44444444-4444-4444-4444-444444444441",
                "resource_id": "55555555-5555-5555-5555-555555555501",
                "category": "soil_health",
                "notes": "Soil sample taken. pH tested 6.8.",
                "geom": {
                    "type": "Point",
                    "coordinates": [23.7274, 37.9831]
                },
                "observed_at": "2026-08-14T09:30:00Z",
                "verification_status": "verified",
                "verified_by_id": "00000000-0000-0000-0000-000000000002",
                "verified_at": "2026-08-14T12:30:00Z",
                "created_by_id": "00000000-0000-0000-0000-000000000001",
                "created_at": "2026-08-14T12:00:00Z",
                "updated_at": "2026-08-14T12:00:00Z"
            }
        }
    )

