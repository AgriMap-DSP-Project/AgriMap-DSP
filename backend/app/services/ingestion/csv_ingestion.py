"""
AgriMap DSP — CSV Data Ingestion Service
Parses CSV files containing field survey data and bulk-inserts into the database.
"""
import csv
import io
import uuid
import logging
from typing import List, Dict, Any, Tuple
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.field import Field
from app.models.resource import Resource
from app.models.farmer import Farmer
from app.core.spatial import geojson_to_spatial

logger = logging.getLogger(__name__)

# Expected CSV column mappings for each entity type
FIELD_COLUMNS = {
    "required": ["name", "project_id", "farmer_id", "calculated_area_hectares"],
    "optional": ["crop_history_summary"],
}

RESOURCE_COLUMNS = {
    "required": ["name", "project_id", "resource_class", "longitude", "latitude"],
    "optional": ["field_id", "resource_type", "capacity", "condition"],
}

FARMER_COLUMNS = {
    "required": ["full_name", "contact_number"],
    "optional": ["email", "address"],
}


class CSVIngestionResult:
    """Holds the result of a CSV ingestion job."""

    def __init__(self):
        self.success_count: int = 0
        self.error_count: int = 0
        self.errors: List[Dict[str, Any]] = []
        self.created_ids: List[str] = []

    def add_success(self, record_id: str):
        self.success_count += 1
        self.created_ids.append(record_id)

    def add_error(self, row_number: int, message: str):
        self.error_count += 1
        self.errors.append({"row": row_number, "error": message})

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success_count": self.success_count,
            "error_count": self.error_count,
            "total_rows": self.success_count + self.error_count,
            "created_ids": self.created_ids,
            "errors": self.errors[:50],  # Cap error details at 50
        }


def validate_csv_headers(headers: List[str], entity_type: str) -> Tuple[bool, str]:
    """Validate that CSV has required headers for the entity type."""
    column_spec = {
        "fields": FIELD_COLUMNS,
        "resources": RESOURCE_COLUMNS,
        "farmers": FARMER_COLUMNS,
    }.get(entity_type)

    if not column_spec:
        return False, f"Unknown entity type: {entity_type}. Supported: fields, resources, farmers"

    missing = [col for col in column_spec["required"] if col not in headers]
    if missing:
        return False, f"Missing required columns: {', '.join(missing)}"

    return True, "OK"


def ingest_farmers_csv(file_content: bytes, db: Session, created_by_id: uuid.UUID) -> CSVIngestionResult:
    """Parse a CSV file and create farmer records."""
    result = CSVIngestionResult()
    reader = csv.DictReader(io.StringIO(file_content.decode("utf-8")))

    valid, msg = validate_csv_headers(list(reader.fieldnames or []), "farmers")
    if not valid:
        result.add_error(0, msg)
        return result

    for row_num, row in enumerate(reader, start=2):
        try:
            farmer = Farmer(
                full_name=row["full_name"].strip(),
                contact_number=row["contact_number"].strip(),
                email=row.get("email", "").strip() or None,
                address=row.get("address", "").strip() or None,
            )
            db.add(farmer)
            db.flush()
            result.add_success(str(farmer.id))
        except Exception as e:
            result.add_error(row_num, str(e))

    if result.success_count > 0:
        db.commit()
        logger.info("CSV ingestion: %d farmers created, %d errors", result.success_count, result.error_count)

    return result


def ingest_resources_csv(
    file_content: bytes, db: Session, created_by_id: uuid.UUID
) -> CSVIngestionResult:
    """Parse a CSV file and create resource records with Point geometry from lat/lon columns."""
    result = CSVIngestionResult()
    reader = csv.DictReader(io.StringIO(file_content.decode("utf-8")))

    valid, msg = validate_csv_headers(list(reader.fieldnames or []), "resources")
    if not valid:
        result.add_error(0, msg)
        return result

    for row_num, row in enumerate(reader, start=2):
        try:
            lon = float(row["longitude"])
            lat = float(row["latitude"])

            # Validate coordinate bounds
            if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                result.add_error(row_num, f"Invalid coordinates: lon={lon}, lat={lat}")
                continue

            geojson_point = {"type": "Point", "coordinates": [lon, lat]}
            spatial_geom = geojson_to_spatial(geojson_point)

            # Build optional attributes from extra columns
            attributes = {}
            for key in ["capacity", "condition"]:
                if row.get(key, "").strip():
                    attributes[key] = row[key].strip()

            resource_class = row["resource_class"].strip().upper()
            resource_type = row.get("resource_type", resource_class).strip()

            resource = Resource(
                name=row["name"].strip(),
                project_id=uuid.UUID(row["project_id"].strip()),
                field_id=uuid.UUID(row["field_id"].strip()) if row.get("field_id", "").strip() else None,
                resource_class=resource_class,
                resource_type=resource_type,
                geom=spatial_geom,
                attributes=attributes if attributes else {},
                created_by_id=created_by_id,
                verification_status="pending",
            )
            db.add(resource)
            db.flush()
            result.add_success(str(resource.id))
        except Exception as e:
            result.add_error(row_num, str(e))

    if result.success_count > 0:
        db.commit()
        logger.info("CSV ingestion: %d resources created, %d errors", result.success_count, result.error_count)

    return result


def generate_csv_template(entity_type: str) -> str:
    """Generate an empty CSV template with correct headers for a given entity type."""
    templates = {
        "farmers": "full_name,contact_number,email,address\n",
        "resources": "name,project_id,field_id,resource_class,resource_type,longitude,latitude,capacity,condition\n",
        "fields": "name,project_id,farmer_id,calculated_area_hectares,crop_history_summary\n",
    }
    return templates.get(entity_type, "")
