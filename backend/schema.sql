-- V2V Agrilythos (AGX) DSP - Digital Land Mapping Pre-Assessment Schema
-- Target Database: PostgreSQL with PostGIS extension

-- -------------------------------------------------------------
-- 1. Prerequisites and Extensions
-- -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- 2. Shared Audit Function (updated_at)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------
-- 3. Table Definitions
-- -------------------------------------------------------------

-- --- 3.1. Users Table ---
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_user_role CHECK (role IN ('admin', 'surveyor', 'verifier'))
);

CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- --- 3.2. Projects Table ---
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_project_status CHECK (status IN ('planning', 'active', 'completed', 'archived'))
);

CREATE TRIGGER trigger_update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- --- 3.3. Farmers Table ---
CREATE TABLE farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_update_farmers_updated_at
    BEFORE UPDATE ON farmers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- --- 3.4. Fields Table ---
CREATE TABLE fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    boundary GEOMETRY(MultiPolygon, 4326) NOT NULL,
    calculated_area_hectares NUMERIC(10, 4) NOT NULL,
    crop_history_summary TEXT,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    verified_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_field_verification_status CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    CONSTRAINT chk_field_verification_data CHECK (
        (verification_status = 'pending' AND verified_by_id IS NULL AND verified_at IS NULL) OR
        (verification_status IN ('verified', 'rejected') AND verified_by_id IS NOT NULL AND verified_at IS NOT NULL)
    )
);

CREATE TRIGGER trigger_update_fields_updated_at
    BEFORE UPDATE ON fields
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- --- 3.5. Field Zones Table ---
CREATE TABLE field_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    boundary GEOMETRY(Polygon, 4326) NOT NULL,
    zone_type VARCHAR(50) NOT NULL,
    description TEXT,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    verified_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_zone_verification_status CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    CONSTRAINT chk_zone_verification_data CHECK (
        (verification_status = 'pending' AND verified_by_id IS NULL AND verified_at IS NULL) OR
        (verification_status IN ('verified', 'rejected') AND verified_by_id IS NOT NULL AND verified_at IS NOT NULL)
    )
);

CREATE TRIGGER trigger_update_field_zones_updated_at
    BEFORE UPDATE ON field_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- --- 3.6. Resources Table ---
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    resource_class VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    geom GEOMETRY(Geometry, 4326) NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    verified_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_resource_class CHECK (resource_class IN ('WATER', 'POWER', 'IRRIGATION', 'STRUCTURE', 'OTHER')),
    CONSTRAINT chk_resource_status CHECK (status IN ('EXISTING', 'UNAVAILABLE', 'NEEDS_VERIFICATION')),
    CONSTRAINT chk_resource_verification_status CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    CONSTRAINT chk_resource_verification_data CHECK (
        (verification_status = 'pending' AND verified_by_id IS NULL AND verified_at IS NULL) OR
        (verification_status IN ('verified', 'rejected') AND verified_by_id IS NOT NULL AND verified_at IS NOT NULL)
    )
);

CREATE TRIGGER trigger_update_resources_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- --- 3.7. Reference Points Table ---
CREATE TABLE reference_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    elevation_meters NUMERIC(6, 2),
    horizontal_accuracy_meters NUMERIC(4, 2),
    marker_type VARCHAR(50) NOT NULL,
    description TEXT,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    verified_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_reference_point_marker CHECK (marker_type IN ('concrete_monument', 'rebar', 'brass_cap', 'temporary')),
    CONSTRAINT chk_reference_point_verification_status CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    CONSTRAINT chk_reference_point_verification_data CHECK (
        (verification_status = 'pending' AND verified_by_id IS NULL AND verified_at IS NULL) OR
        (verification_status IN ('verified', 'rejected') AND verified_by_id IS NOT NULL AND verified_at IS NOT NULL)
    )
);

CREATE TRIGGER trigger_update_reference_points_updated_at
    BEFORE UPDATE ON reference_points
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- --- 3.8. Observations Table ---
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    zone_id UUID REFERENCES field_zones(id) ON DELETE SET NULL,
    resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    notes TEXT NOT NULL,
    geom GEOMETRY(Point, 4326),
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    verified_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_observation_category CHECK (category IN ('soil_health', 'crop_growth', 'pest_weed_infestation', 'damage', 'general')),
    CONSTRAINT chk_observation_verification_status CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    CONSTRAINT chk_observation_verification_data CHECK (
        (verification_status = 'pending' AND verified_by_id IS NULL AND verified_at IS NULL) OR
        (verification_status IN ('verified', 'rejected') AND verified_by_id IS NOT NULL AND verified_at IS NOT NULL)
    )
);

CREATE TRIGGER trigger_update_observations_updated_at
    BEFORE UPDATE ON observations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- --- 3.9. Photos Table ---
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path VARCHAR(512) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    geom GEOMETRY(Point, 4326),
    direction_degrees NUMERIC(5, 2),
    captured_at TIMESTAMPTZ,
    description TEXT,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    zone_id UUID REFERENCES field_zones(id) ON DELETE SET NULL,
    resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
    observation_id UUID REFERENCES observations(id) ON DELETE SET NULL,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_update_photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- -------------------------------------------------------------
-- 4. Spatial Index Definitions (GiST)
-- -------------------------------------------------------------
CREATE INDEX idx_fields_boundary ON fields USING gist(boundary);
CREATE INDEX idx_field_zones_boundary ON field_zones USING gist(boundary);
CREATE INDEX idx_resources_geom ON resources USING gist(geom);
CREATE INDEX idx_reference_points_geom ON reference_points USING gist(geom);
CREATE INDEX idx_observations_geom ON observations USING gist(geom);
CREATE INDEX idx_photos_geom ON photos USING gist(geom);


-- -------------------------------------------------------------
-- 5. Foreign Key Column Indexes
-- -------------------------------------------------------------
CREATE INDEX idx_fields_project_id ON fields(project_id);
CREATE INDEX idx_fields_farmer_id ON fields(farmer_id);
CREATE INDEX idx_fields_verified_by_id ON fields(verified_by_id);
CREATE INDEX idx_fields_created_by_id ON fields(created_by_id);

CREATE INDEX idx_field_zones_field_id ON field_zones(field_id);
CREATE INDEX idx_field_zones_verified_by_id ON field_zones(verified_by_id);
CREATE INDEX idx_field_zones_created_by_id ON field_zones(created_by_id);

CREATE INDEX idx_resources_project_id ON resources(project_id);
CREATE INDEX idx_resources_field_id ON resources(field_id);
CREATE INDEX idx_resources_verified_by_id ON resources(verified_by_id);
CREATE INDEX idx_resources_created_by_id ON resources(created_by_id);

CREATE INDEX idx_reference_points_project_id ON reference_points(project_id);
CREATE INDEX idx_reference_points_field_id ON reference_points(field_id);
CREATE INDEX idx_reference_points_verified_by_id ON reference_points(verified_by_id);
CREATE INDEX idx_reference_points_created_by_id ON reference_points(created_by_id);

CREATE INDEX idx_observations_project_id ON observations(project_id);
CREATE INDEX idx_observations_field_id ON observations(field_id);
CREATE INDEX idx_observations_zone_id ON observations(zone_id);
CREATE INDEX idx_observations_resource_id ON observations(resource_id);
CREATE INDEX idx_observations_verified_by_id ON observations(verified_by_id);
CREATE INDEX idx_observations_created_by_id ON observations(created_by_id);

CREATE INDEX idx_photos_field_id ON photos(field_id);
CREATE INDEX idx_photos_zone_id ON photos(zone_id);
CREATE INDEX idx_photos_resource_id ON photos(resource_id);
CREATE INDEX idx_photos_observation_id ON photos(observation_id);
CREATE INDEX idx_photos_created_by_id ON photos(created_by_id);


-- -------------------------------------------------------------
-- 6. Advanced Spatial Verification Triggers
-- -------------------------------------------------------------

-- --- 6.1. Zone strictly inside parent field boundary ---
CREATE OR REPLACE FUNCTION func_validate_zone_within_field()
RETURNS TRIGGER AS $$
DECLARE
    parent_field_boundary GEOMETRY;
BEGIN
    SELECT boundary INTO parent_field_boundary FROM fields WHERE id = NEW.field_id;
    IF parent_field_boundary IS NULL THEN
        RAISE EXCEPTION 'Parent field boundary must exist before creating a zone.';
    END IF;
    
    -- ST_Within: Zone Polygon must be completely inside the Field MultiPolygon
    IF NOT ST_Within(NEW.boundary, parent_field_boundary) THEN
        RAISE EXCEPTION 'Spatial Validation Failed: The boundary of zone "%" (ID: %) is not completely contained inside its parent field (ID: %).', NEW.name, NEW.id, NEW.field_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_zone_within_field
    BEFORE INSERT OR UPDATE OF boundary, field_id ON field_zones
    FOR EACH ROW
    EXECUTE FUNCTION func_validate_zone_within_field();


-- -------------------------------------------------------------
-- 7. Devices and Sensor Data (Ravi's Platform Layer)
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_name VARCHAR(200) NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    serial_number VARCHAR(200) UNIQUE,
    manufacturer VARCHAR(200),
    model_number VARCHAR(200),
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ,
    device_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    registered_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensor_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    sensor_type VARCHAR(100) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(50) NOT NULL,
    geom GEOMETRY(Point, 4326),
    measured_at TIMESTAMPTZ NOT NULL,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensor_data_geom ON sensor_data USING gist(geom);
CREATE INDEX IF NOT EXISTS idx_sensor_data_device_id ON sensor_data(device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_field_id ON sensor_data(field_id);
