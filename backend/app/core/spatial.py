from typing import Any, Dict
from geoalchemy2.shape import from_shape, to_shape
from geoalchemy2.elements import WKBElement
from shapely.geometry import shape, mapping
from shapely.errors import ShapelyError


def geojson_to_spatial(geojson: Dict[str, Any], srid: int = 4326) -> Any:
    """
    Converts a GeoJSON dictionary into a GeoAlchemy2 spatial element.
    """
    try:
        shapely_geom = shape(geojson)
        if not shapely_geom.is_valid:
            raise ValueError("Invalid geometry: Self-intersection or invalid coordinates.")
        return from_shape(shapely_geom, srid=srid)
    except (ShapelyError, TypeError, KeyError) as e:
        raise ValueError(f"Failed to parse GeoJSON geometry: {str(e)}")


def spatial_to_geojson(spatial_element: Any) -> Dict[str, Any]:
    """
    Converts a GeoAlchemy2 spatial element (e.g. WKBElement) into a GeoJSON dictionary.
    """
    if spatial_element is None:
        return {}
    
    # If it is a WKBElement, convert to shapely geometry first
    if isinstance(spatial_element, WKBElement):
        shapely_geom = to_shape(spatial_element)
        return mapping(shapely_geom)
        
    return {}
