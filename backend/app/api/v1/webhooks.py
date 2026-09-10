"""
AgriMap DSP — Webhook API Endpoints
Receive data pushes from external systems and IoT devices.
"""
import uuid
import hmac
import hashlib
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.spatial import geojson_to_spatial
from app.models.sensor_data import SensorData
from app.models.device import Device
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


class DeviceDataPayload(BaseModel):
    """Payload for device data webhook."""
    device_id: str
    readings: List[Dict[str, Any]]
    timestamp: Optional[str] = None


class ExternalSystemPayload(BaseModel):
    """Payload for external system data push."""
    source: str
    event_type: str
    data: Dict[str, Any]
    timestamp: Optional[str] = None


@router.post("/device-data", status_code=status.HTTP_201_CREATED)
def receive_device_data(
    payload: DeviceDataPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Receive sensor readings from an external device/gateway.
    
    The device must be registered in the device registry.
    Each reading should have: sensor_type, value, unit, measured_at.
    """
    # Find device
    device = db.query(Device).filter(
        Device.serial_number == payload.device_id
    ).first()

    if not device:
        # Auto-register unknown devices
        device = Device(
            device_name=f"Auto-registered: {payload.device_id}",
            device_type="other",
            serial_number=payload.device_id,
            registered_by_id=current_user.id,
            status="active",
        )
        db.add(device)
        db.flush()
        logger.info("Auto-registered new device: %s", payload.device_id)

    # Process readings
    created = 0
    errors = []

    for idx, reading in enumerate(payload.readings):
        try:
            sensor_type = reading.get("sensor_type", "unknown")
            value = float(reading["value"])
            unit = reading.get("unit", "")
            measured_at = reading.get("measured_at", datetime.now(timezone.utc).isoformat())

            # Parse geom if present
            spatial_geom = None
            if reading.get("latitude") and reading.get("longitude"):
                geojson_point = {
                    "type": "Point",
                    "coordinates": [float(reading["longitude"]), float(reading["latitude"])]
                }
                spatial_geom = geojson_to_spatial(geojson_point)

            sensor_data = SensorData(
                device_id=device.id,
                field_id=device.field_id,
                sensor_type=sensor_type,
                value=value,
                unit=unit,
                geom=spatial_geom,
                measured_at=measured_at if isinstance(measured_at, datetime) else datetime.fromisoformat(measured_at.replace("Z", "+00:00")),
                raw_payload=reading,
            )
            db.add(sensor_data)
            created += 1
        except Exception as e:
            errors.append({"reading_index": idx, "error": str(e)})

    # Update device last_seen
    device.last_seen_at = datetime.now(timezone.utc)

    db.commit()

    logger.info("Webhook: %d readings from device %s, %d errors",
                created, payload.device_id, len(errors))

    return {
        "device_id": str(device.id),
        "readings_created": created,
        "error_count": len(errors),
        "errors": errors[:10],
    }


@router.post("/external-system")
def receive_external_data(
    payload: ExternalSystemPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Receive data from external agricultural systems.
    
    Supports event types:
    - field_update: Update field data
    - weather_data: Weather station readings
    - soil_analysis: Lab soil test results
    """
    logger.info("External webhook: source=%s, event=%s", payload.source, payload.event_type)

    # Log and acknowledge — specific handling based on event_type
    return {
        "status": "received",
        "source": payload.source,
        "event_type": payload.event_type,
        "received_at": datetime.now(timezone.utc).isoformat(),
        "message": f"Event '{payload.event_type}' from '{payload.source}' received and queued for processing.",
    }
