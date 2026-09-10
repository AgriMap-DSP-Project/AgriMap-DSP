import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator, ConfigDict
from app.core.spatial import spatial_to_geojson


class FieldBase(BaseModel):
    name: str = Field(..., max_length=255)
    calculated_area_hectares: float = Field(..., gt=0.0)
    crop_history_summary: Optional[str] = None


class FieldCreate(FieldBase):
    project_id: uuid.UUID
    farmer_id: uuid.UUID
    boundary: Dict[str, Any] = Field(
        ...,
        description="GeoJSON MultiPolygon boundary representation, e.g. {'type': 'MultiPolygon', 'coordinates': [[[[lon, lat], ...]]]]}"
    )


class FieldUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    calculated_area_hectares: Optional[float] = Field(None, gt=0.0)
    crop_history_summary: Optional[str] = None
    boundary: Optional[Dict[str, Any]] = None


class FieldVerificationUpdate(BaseModel):
    verification_status: str = Field(..., description="Must be 'verified' or 'rejected'")
    verification_notes: Optional[str] = None


class FieldRead(FieldBase):
    id: uuid.UUID
    project_id: uuid.UUID
    farmer_id: uuid.UUID
    boundary: Dict[str, Any]
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
            # Parse properties from database instance
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
                "id": "33333333-3333-3333-3333-333333333333",
                "project_id": "11111111-1111-1111-1111-111111111111",
                "farmer_id": "22222222-2222-2222-2222-222222222222",
                "name": "Olive Grove Alpha",
                "calculated_area_hectares": 1.2350,
                "crop_history_summary": "Olive trees planted in 2012.",
                "boundary": {
                    "type": "MultiPolygon",
                    "coordinates": [[[[23.7270, 37.9820], [23.7290, 37.9820], [23.7290, 37.9840], [23.7270, 37.9840], [23.7270, 37.9820]]]]
                },
                "verification_status": "verified",
                "verified_by_id": "00000000-0000-0000-0000-000000000002",
                "verified_at": "2026-08-14T12:00:00Z",
                "verification_notes": "Field boundaries verified.",
                "created_by_id": "00000000-0000-0000-0000-000000000001",
                "created_at": "2026-08-14T12:00:00Z",
                "updated_at": "2026-08-14T12:00:00Z"
            }
        }
    )

