import sys
import os
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

# Add project path to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Define mock spatial outputs
MOCK_GEOM_GEOJSON = {"type": "Point", "coordinates": [23.7275, 37.9830]}
MOCK_FIELD_BOUNDARY_GEOJSON = {
    "type": "MultiPolygon",
    "coordinates": [[[[23.7270, 37.9820], [23.7290, 37.9820], [23.7290, 37.9840], [23.7270, 37.9840], [23.7270, 37.9820]]]]
}
MOCK_ZONE_BOUNDARY_GEOJSON = {
    "type": "Polygon",
    "coordinates": [[[23.7272, 37.9822], [23.7278, 37.9822], [23.7278, 37.9838], [23.7272, 37.9838], [23.7272, 37.9822]]]
}

# Overwrite spatial conversion functions globally at import time
import app.core.spatial

def mock_geojson_to_spatial(geojson, srid=4326):
    if not geojson or not isinstance(geojson, dict) or "type" not in geojson or "coordinates" not in geojson:
        raise ValueError("Failed to parse GeoJSON geometry")
    if geojson["coordinates"] == "invalid_coordinates_string":
        raise ValueError("Failed to parse GeoJSON geometry")
    return f"mock_spatial_{geojson['type'].lower()}"

def mock_spatial_to_geojson(spatial_element):
    if spatial_element == "mock_spatial_multipolygon":
        return MOCK_FIELD_BOUNDARY_GEOJSON
    if spatial_element == "mock_spatial_polygon":
        return MOCK_ZONE_BOUNDARY_GEOJSON
    return MOCK_GEOM_GEOJSON

app.core.spatial.geojson_to_spatial = mock_geojson_to_spatial
app.core.spatial.spatial_to_geojson = mock_spatial_to_geojson

from app.main import app
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
import uuid

MOCK_SURVEYOR = User(
    id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
    email="surveyor@test.com",
    full_name="Test Surveyor",
    role="surveyor",
    is_active=True
)

MOCK_VERIFIER = User(
    id=uuid.UUID("00000000-0000-0000-0000-000000000002"),
    email="verifier@test.com",
    full_name="Test Verifier",
    role="verifier",
    is_active=True
)

@pytest.fixture
def db_session():
    """
    Mock SQLAlchemy session fixture.
    """
    session = MagicMock()
    return session


@pytest.fixture
def client(db_session):
    """
    FastAPI TestClient fixture with overridden database dependency.
    """
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: MOCK_SURVEYOR
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def verifier_client(db_session):
    """
    FastAPI TestClient fixture with overridden database dependency.
    """
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: MOCK_VERIFIER
    yield TestClient(app)
    app.dependency_overrides.clear()
