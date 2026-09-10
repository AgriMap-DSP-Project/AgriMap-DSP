"""
AgriMap DSP — Photo EXIF Processing Service
Extracts GPS coordinates, timestamps, and camera info from photo EXIF data.
"""
import os
import uuid
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)


def extract_exif_gps(file_path: str) -> Dict[str, Any]:
    """
    Extract GPS coordinates and metadata from a photo's EXIF data.
    Returns a dict with lat, lon, altitude, direction, captured_at, camera_info.
    
    Falls back gracefully if Pillow is not installed or EXIF data is missing.
    """
    result = {
        "latitude": None,
        "longitude": None,
        "altitude": None,
        "direction": None,
        "captured_at": None,
        "camera_make": None,
        "camera_model": None,
        "has_gps": False,
    }

    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, GPSTAGS
    except ImportError:
        logger.warning("Pillow not installed — EXIF extraction disabled. Install with: pip install Pillow")
        return result

    try:
        img = Image.open(file_path)
        exif_data = img._getexif()
        if exif_data is None:
            logger.debug("No EXIF data found in %s", file_path)
            return result

        # Parse standard EXIF tags
        exif = {}
        for tag_id, value in exif_data.items():
            tag_name = TAGS.get(tag_id, tag_id)
            exif[tag_name] = value

        # Camera info
        result["camera_make"] = exif.get("Make", "").strip() if isinstance(exif.get("Make"), str) else None
        result["camera_model"] = exif.get("Model", "").strip() if isinstance(exif.get("Model"), str) else None

        # Date/time
        date_str = exif.get("DateTimeOriginal") or exif.get("DateTime")
        if date_str and isinstance(date_str, str):
            try:
                result["captured_at"] = datetime.strptime(date_str, "%Y:%m:%d %H:%M:%S").isoformat()
            except ValueError:
                pass

        # GPS data
        gps_info = exif.get("GPSInfo")
        if gps_info:
            gps = {}
            for key, val in gps_info.items():
                gps_tag = GPSTAGS.get(key, key)
                gps[gps_tag] = val

            lat = _convert_gps_to_decimal(gps.get("GPSLatitude"), gps.get("GPSLatitudeRef"))
            lon = _convert_gps_to_decimal(gps.get("GPSLongitude"), gps.get("GPSLongitudeRef"))

            if lat is not None and lon is not None:
                result["latitude"] = lat
                result["longitude"] = lon
                result["has_gps"] = True

                # Altitude
                alt = gps.get("GPSAltitude")
                if alt is not None:
                    try:
                        result["altitude"] = float(alt)
                    except (TypeError, ValueError):
                        pass

                # Direction (compass bearing)
                direction = gps.get("GPSImgDirection")
                if direction is not None:
                    try:
                        result["direction"] = float(direction)
                    except (TypeError, ValueError):
                        pass

        logger.debug("EXIF extracted from %s: GPS=%s", file_path, result["has_gps"])

    except Exception as e:
        logger.warning("Failed to extract EXIF from %s: %s", file_path, e)

    return result


def _convert_gps_to_decimal(
    gps_coords: Optional[tuple], gps_ref: Optional[str]
) -> Optional[float]:
    """Convert GPS coordinates from DMS (degrees/minutes/seconds) to decimal degrees."""
    if gps_coords is None or gps_ref is None:
        return None

    try:
        degrees = float(gps_coords[0])
        minutes = float(gps_coords[1])
        seconds = float(gps_coords[2])

        decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)

        if gps_ref in ("S", "W"):
            decimal = -decimal

        return round(decimal, 7)
    except (TypeError, ValueError, IndexError):
        return None


def create_geojson_point(lat: float, lon: float) -> Dict[str, Any]:
    """Create a GeoJSON Point from lat/lon."""
    return {
        "type": "Point",
        "coordinates": [lon, lat]  # GeoJSON is [longitude, latitude]
    }
