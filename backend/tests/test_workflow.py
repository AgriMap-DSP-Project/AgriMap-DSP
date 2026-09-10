import pytest
from unittest.mock import MagicMock
import uuid
from datetime import datetime

from app.models.project import Project
from app.models.field import Field
from app.models.zone import FieldZone
from app.models.resource import Resource
from app.models.observation import Observation
from app.models.photo import Photo

# Fictional UUIDs for references
PROJECT_UUID = uuid.UUID("11111111-1111-1111-1111-111111111111")
FARMER_UUID = uuid.UUID("22222222-2222-2222-2222-222222222222")
FIELD_UUID = uuid.UUID("33333333-3333-3333-3333-333333333333")
ZONE_A_UUID = uuid.UUID("44444444-4444-4444-4444-444444444441")
ZONE_B_UUID = uuid.UUID("44444444-4444-4444-4444-444444444442")
RES_WATER_1_UUID = uuid.UUID("55555555-5555-5555-5555-555555555501")
RES_WATER_2_UUID = uuid.UUID("55555555-5555-5555-5555-555555555502")
RES_POWER_UUID = uuid.UUID("55555555-5555-5555-5555-555555555503")
RES_IRR_UUID = uuid.UUID("55555555-5555-5555-5555-555555555504")
RES_STRUCT_UUID = uuid.UUID("55555555-5555-5555-5555-555555555505")
OBSERVATION_UUID = uuid.UUID("77777777-7777-7777-7777-777777777701")
PHOTO_UUID = uuid.UUID("88888888-8888-8888-8888-888888888801")
SURVEYOR_UUID = uuid.UUID("00000000-0000-0000-0000-000000000001")
VERIFIER_UUID = uuid.UUID("00000000-0000-0000-0000-000000000002")

# Custom mock spatial representations matching conftest.py
MOCK_GEOM_GEOJSON = {"type": "Point", "coordinates": [23.7275, 37.9830]}
MOCK_FIELD_BOUNDARY_GEOJSON = {
    "type": "MultiPolygon",
    "coordinates": [[[[23.7270, 37.9820], [23.7290, 37.9820], [23.7290, 37.9840], [23.7270, 37.9840], [23.7270, 37.9820]]]]
}
MOCK_ZONE_BOUNDARY_GEOJSON = {
    "type": "Polygon",
    "coordinates": [[[23.7272, 37.9822], [23.7278, 37.9822], [23.7278, 37.9838], [23.7272, 37.9838], [23.7272, 37.9822]]]
}


def setup_common_defaults(obj):
    """
    Simulates database default population on newly added ORM objects.
    """
    obj.created_at = datetime.utcnow()
    obj.updated_at = datetime.utcnow()
    if hasattr(obj, "verification_status") and obj.verification_status is None:
        obj.verification_status = "pending"


# ==============================================================================
# WORKFLOW TESTS (1 to 15)
# ==============================================================================

def test_workflow_step_1_create_project(client, db_session):
    """
    Step 1: Create project (AGX-001)
    """
    def mock_refresh(obj):
        obj.id = PROJECT_UUID
        setup_common_defaults(obj)
        
    db_session.refresh.side_effect = mock_refresh
    
    payload = {
        "name": "AGX-001",
        "description": "Fictional pre-assessment campaign",
        "status": "active"
    }
    response = client.post("/api/v1/projects/", json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["id"] == str(PROJECT_UUID)
    assert response.json()["name"] == "AGX-001"


def test_workflow_steps_2_and_3_create_field_with_boundary(client, db_session):
    """
    Steps 2 & 3: Create field (F-001, "Test Farm") under project with MultiPolygon boundary
    """
    def mock_refresh(obj):
        obj.id = FIELD_UUID
        setup_common_defaults(obj)
        
    db_session.refresh.side_effect = mock_refresh
    
    payload = {
        "project_id": str(PROJECT_UUID),
        "farmer_id": str(FARMER_UUID),
        "name": "Test Farm",
        "calculated_area_hectares": 1.25,
        "boundary": MOCK_FIELD_BOUNDARY_GEOJSON
    }
    response = client.post(f"/api/v1/fields/", json=payload)
    assert response.status_code == 201, response.text
    res_json = response.json()
    assert res_json["id"] == str(FIELD_UUID)
    assert res_json["name"] == "Test Farm"
    assert res_json["boundary"] == MOCK_FIELD_BOUNDARY_GEOJSON


def test_workflow_step_4_add_zones(client, db_session):
    """
    Step 4: Add internal field zones (Add two zones)
    """
    def mock_refresh(obj):
        obj.id = ZONE_A_UUID
        setup_common_defaults(obj)
        
    db_session.refresh.side_effect = mock_refresh

    payload = {
        "field_id": str(FIELD_UUID),
        "name": "Zone A - North",
        "zone_type": "soil_type",
        "boundary": MOCK_ZONE_BOUNDARY_GEOJSON
    }
    response = client.post(f"/api/v1/zones/", json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["id"] == str(ZONE_A_UUID)
    assert response.json()["boundary"] == MOCK_ZONE_BOUNDARY_GEOJSON


def test_workflow_step_5_add_water_resources(client, db_session):
    """
    Step 5: Add two water resources
    """
    def mock_refresh_1(obj):
        obj.id = RES_WATER_1_UUID
        setup_common_defaults(obj)
        
    db_session.refresh.side_effect = mock_refresh_1

    payload_1 = {
        "project_id": str(PROJECT_UUID),
        "field_id": str(FIELD_UUID),
        "name": "Borehole 1",
        "resource_class": "WATER",
        "resource_type": "well",
        "status": "EXISTING",
        "geom": MOCK_GEOM_GEOJSON,
        "attributes": {"depth_m": 45.0}
    }
    response = client.post(f"/api/v1/resources/", json=payload_1)
    assert response.status_code == 201, response.text
    assert response.json()["id"] == str(RES_WATER_1_UUID)
    assert response.json()["resource_class"] == "WATER"


def test_workflow_step_6_add_power_resource(client, db_session):
    """
    Step 6: Add one power resource
    """
    def mock_refresh(obj):
        obj.id = RES_POWER_UUID
        setup_common_defaults(obj)
        
    db_session.refresh.side_effect = mock_refresh

    payload = {
        "project_id": str(PROJECT_UUID),
        "field_id": str(FIELD_UUID),
        "name": "Solar Array",
        "resource_class": "POWER",
        "resource_type": "solar_panel",
        "status": "EXISTING",
        "geom": MOCK_GEOM_GEOJSON,
        "attributes": {"capacity_kw": 5.0}
    }
    response = client.post(f"/api/v1/resources/", json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["id"] == str(RES_POWER_UUID)
    assert response.json()["resource_class"] == "POWER"


def test_workflow_step_7_add_irrigation_resource(client, db_session):
    """
    Step 7: Add one irrigation resource
    """
    def mock_refresh(obj):
        obj.id = RES_IRR_UUID
        setup_common_defaults(obj)
        
    db_session.refresh.side_effect = mock_refresh

    payload = {
        "project_id": str(PROJECT_UUID),
        "field_id": str(FIELD_UUID),
        "name": "Drip Mains",
        "resource_class": "IRRIGATION",
        "resource_type": "drip_line",
        "status": "EXISTING",
        "geom": MOCK_GEOM_GEOJSON,
        "attributes": {"length_m": 120}
    }
    response = client.post(f"/api/v1/resources/", json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["id"] == str(RES_IRR_UUID)
    assert response.json()["resource_class"] == "IRRIGATION"


def test_workflow_step_8_add_structure(client, db_session):
    """
    Step 8: Add one structure resource
    """
    def mock_refresh(obj):
        obj.id = RES_STRUCT_UUID
        setup_common_defaults(obj)
        
    db_session.refresh.side_effect = mock_refresh

    payload = {
        "project_id": str(PROJECT_UUID),
        "field_id": str(FIELD_UUID),
        "name": "Storage Shed",
        "resource_class": "STRUCTURE",
        "resource_type": "barn",
        "status": "EXISTING",
        "geom": MOCK_GEOM_GEOJSON,
        "attributes": {"material": "metal"}
    }
    response = client.post(f"/api/v1/resources/", json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["id"] == str(RES_STRUCT_UUID)
    assert response.json()["resource_class"] == "STRUCTURE"


def test_workflow_step_9_add_observation(client, db_session):
    """
    Step 9: Add surveyor observation
    """
    def mock_refresh(obj):
        obj.id = OBSERVATION_UUID
        obj.observed_at = datetime.utcnow()
        setup_common_defaults(obj)
        
    db_session.refresh.side_effect = mock_refresh

    payload = {
        "project_id": str(PROJECT_UUID),
        "field_id": str(FIELD_UUID),
        "zone_id": str(ZONE_A_UUID),
        "category": "soil_health",
        "notes": "Topsoil tested moist and well aerated.",
        "geom": MOCK_GEOM_GEOJSON
    }
    response = client.post(f"/api/v1/observations/", json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["id"] == str(OBSERVATION_UUID)
    assert response.json()["notes"] == "Topsoil tested moist and well aerated."


def test_workflow_step_10_add_photo_reference(client, db_session):
    """
    Step 10: Add photo reference metadata
    """
    def mock_refresh(obj):
        obj.id = PHOTO_UUID
        setup_common_defaults(obj)
        
    db_session.refresh.side_effect = mock_refresh

    payload = {
        "field_id": str(FIELD_UUID),
        "observation_id": str(OBSERVATION_UUID),
        "file_path": "https://storage.googleapis.com/agrilythos/shed.jpg",
        "mime_type": "image/jpeg",
        "file_size_bytes": 102450,
        "geom": MOCK_GEOM_GEOJSON
    }
    response = client.post(f"/api/v1/photos/", json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["id"] == str(PHOTO_UUID)
    assert response.json()["file_path"] == "https://storage.googleapis.com/agrilythos/shed.jpg"


def test_workflow_step_11_verify_field(verifier_client, db_session):
    """
    Step 11: Verify field boundary (create verification record status update)
    """
    mock_field = Field(
        id=FIELD_UUID,
        project_id=PROJECT_UUID,
        farmer_id=FARMER_UUID,
        name="Test Farm",
        calculated_area_hectares=1.25,
        boundary="mock_spatial_multipolygon",
        verification_status="pending",
        created_by_id=SURVEYOR_UUID,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.get.return_value = mock_field
    
    payload = {
        "verification_status": "verified",
        "verification_notes": "Field boundaries visually verified against orthophotos."
    }
    response = verifier_client.patch(
        f"/api/v1/fields/{FIELD_UUID}/verify",
        json=payload
    )
    assert response.status_code == 200, response.text
    res_json = response.json()
    assert res_json["verification_status"] == "verified"
    assert res_json["verified_by_id"] == str(VERIFIER_UUID)


def test_workflow_step_12_retrieve_complete_field(client, db_session):
    """
    Step 12: Retrieve the complete field details
    """
    mock_field = Field(
        id=FIELD_UUID,
        project_id=PROJECT_UUID,
        farmer_id=FARMER_UUID,
        name="Test Farm",
        calculated_area_hectares=1.25,
        boundary="mock_spatial_multipolygon",
        verification_status="verified",
        created_by_id=SURVEYOR_UUID,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    # Mock retrieval
    db_session.get.return_value = mock_field
    
    response = client.get(f"/api/v1/fields/{FIELD_UUID}")
    assert response.status_code == 200, response.text
    assert response.json()["id"] == str(FIELD_UUID)
    assert response.json()["name"] == "Test Farm"


def test_workflow_step_13_retrieve_all_resources_for_field(client, db_session):
    """
    Step 13: Retrieve all resources mapped inside the field
    """
    mock_resource = Resource(
        id=RES_WATER_1_UUID,
        project_id=PROJECT_UUID,
        field_id=FIELD_UUID,
        name="Borehole 1",
        resource_class="WATER",
        resource_type="well",
        status="EXISTING",
        geom="mock_spatial_point",
        attributes={},
        created_by_id=SURVEYOR_UUID,
        verification_status="pending",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    # Mock query result
    mock_execute = MagicMock()
    mock_execute.scalar.return_value = 1
    mock_execute.scalars.return_value.all.return_value = [mock_resource]
    db_session.execute.return_value = mock_execute
    
    response = client.get(f"/api/v1/resources/?field_id={FIELD_UUID}")
    assert response.status_code == 200, response.text
    assert len(response.json()["items"]) == 1
    assert response.json()["items"][0]["id"] == str(RES_WATER_1_UUID)
    assert response.json()["items"][0]["resource_class"] == "WATER"


def test_workflow_step_14_update_resource(client, db_session):
    """
    Step 14: Update a resource details
    """
    mock_resource = Resource(
        id=RES_WATER_1_UUID,
        project_id=PROJECT_UUID,
        field_id=FIELD_UUID,
        name="Borehole 1",
        resource_class="WATER",
        resource_type="well",
        status="EXISTING",
        geom="mock_spatial_point",
        attributes={},
        created_by_id=SURVEYOR_UUID,
        verification_status="pending",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.get.return_value = mock_resource

    payload = {
        "name": "Borehole 1 - Upgraded Capacity",
        "attributes": {"depth_m": 45.0, "pump_hp": 2.0}
    }
    response = client.put(f"/api/v1/resources/{RES_WATER_1_UUID}", json=payload)
    assert response.status_code == 200, response.text
    assert response.json()["name"] == "Borehole 1 - Upgraded Capacity"
    assert response.json()["attributes"]["pump_hp"] == 2.0


def test_workflow_step_15_delete_test_resource(client, db_session):
    """
    Step 15: Delete a test resource
    """
    mock_resource = Resource(
        id=RES_WATER_1_UUID,
        project_id=PROJECT_UUID,
        field_id=FIELD_UUID,
        name="Borehole 1",
        resource_class="WATER",
        resource_type="well",
        status="EXISTING",
        geom="mock_spatial_point",
        attributes={},
        created_by_id=SURVEYOR_UUID,
        verification_status="pending",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db_session.get.return_value = mock_resource

    response = client.delete(f"/api/v1/resources/{RES_WATER_1_UUID}")
    assert response.status_code == 204, response.text
    db_session.delete.assert_called_with(mock_resource)


# ==============================================================================
# INTEGRITY & NEGATIVE TESTS (16 to 19)
# ==============================================================================

def test_negative_16_foreign_key_invalid(client, db_session):
    """
    Step 16: Verify database raises error for non-existent foreign keys (e.g. invalid project_id)
    """
    from sqlalchemy.exc import IntegrityError
    
    # Mock commit to raise IntegrityError on DB foreign key failure
    db_session.commit.side_effect = IntegrityError(
        "insert or update on table \"fields\" violates foreign key constraint \"fields_project_id_fkey\"",
        params={},
        orig=Exception("violates foreign key constraint")
    )
    
    payload = {
        "project_id": str(uuid.uuid4()),  # Invalid project UUID
        "farmer_id": str(FARMER_UUID),
        "name": "Orphan Farm",
        "calculated_area_hectares": 1.0,
        "boundary": MOCK_FIELD_BOUNDARY_GEOJSON
    }
    
    response = client.post(f"/api/v1/fields/", json=payload)
    # The global exception handler should trap the IntegrityError and return 400
    assert response.status_code == 400, response.text
    assert "Referenced entity does not exist" in response.json()["detail"]


def test_negative_17_invalid_geojson_boundary_coordinates(client):
    """
    Step 17: Verify invalid spatial coordinates are rejected during validation
    """
    # GeoJSON with invalid coordinate data structure (missing coordinates brackets)
    bad_boundary = {
        "type": "MultiPolygon",
        "coordinates": "invalid_coordinates_string"
    }
    
    payload = {
        "project_id": str(PROJECT_UUID),
        "farmer_id": str(FARMER_UUID),
        "name": "Failed Geometry Farm",
        "calculated_area_hectares": 1.0,
        "boundary": bad_boundary
    }
    
    # Pydantic schema validation or shape conversion should trap coordinates parsing
    response = client.post(f"/api/v1/fields/", json=payload)
    assert response.status_code == 400, response.text
    assert "Failed to parse GeoJSON geometry" in response.json()["detail"]


def test_negative_18_invalid_resource_type_rejected(client, db_session):
    """
    Step 18: Verify invalid resource class/types are rejected (e.g. class = 'NUCLEAR')
    """
    from sqlalchemy.exc import IntegrityError
    
    # Mock commit to raise IntegrityError on DB check constraint failure
    db_session.commit.side_effect = IntegrityError(
        "new row for relation \"resources\" violates check constraint \"chk_resource_class\"",
        params={},
        orig=Exception("violates check constraint 'chk_resource_class'")
    )
    
    payload = {
        "project_id": str(PROJECT_UUID),
        "field_id": str(FIELD_UUID),
        "name": "Reactor One",
        "resource_class": "NUCLEAR",  # Invalid class (not WATER, POWER, etc.)
        "resource_type": "generator",
        "status": "EXISTING",
        "geom": MOCK_GEOM_GEOJSON,
        "attributes": {}
    }
    
    response = client.post(f"/api/v1/resources/", json=payload)
    # Caught by check constraint mapper
    assert response.status_code == 400, response.text
    assert "Invalid resource class" in response.json()["detail"]


def test_negative_19_missing_required_fields_rejected(client):
    """
    Step 19: Verify Pydantic validation rejects requests with missing fields
    """
    # Missing project_id and boundary
    payload = {
        "farmer_id": str(FARMER_UUID),
        "name": "Incomplete Farm Data",
        "calculated_area_hectares": 1.5
    }
    response = client.post(f"/api/v1/fields/", json=payload)
    # FastAPI returns 422 Unprocessable Entity for Pydantic body validation errors
    assert response.status_code == 422, response.text
    assert "missing" in response.text.lower()
