-- V2V Agrilythos (AGX) DSP - Digital Land Mapping Pre-Assessment Seed Data
-- Target Database: PostgreSQL with PostGIS extension
-- Inserts realistic sample data for one fictional mapping project and field.

-- Clear existing data (in order of dependencies)
TRUNCATE TABLE photos, observations, reference_points, resources, field_zones, fields, farmers, projects, users CASCADE;

-- -------------------------------------------------------------
-- 1. Insert Users (Surveyor, Verifier, Admin)
-- -------------------------------------------------------------
INSERT INTO users (id, email, password_hash, full_name, role, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'surveyor@agrilythos.com', '$2b$12$Zmxq1y.R7gK.1.p2oD/Vfe91dO9qXk2mU4G5tD.P1uC6mY/6Rk.l2', 'Nikos Georgiou', 'surveyor', true),
('00000000-0000-0000-0000-000000000002', 'verifier@agrilythos.com', '$2b$12$R7gK.1.p2oD/Vfe91dO9qXk2mU4G5tD.P1uC6mY/6Rk.l2Zmxq1y.S6', 'Elena Dimitriou', 'verifier', true),
('00000000-0000-0000-0000-000000000003', 'admin@agrilythos.com', '$2b$12$p2oD/Vfe91dO9qXk2mU4G5tD.P1uC6mY/6Rk.l2Zmxq1y.R7gK.1.t8', 'Dimitris Papadopoulos', 'admin', true);

-- -------------------------------------------------------------
-- 2. Insert Project
-- -------------------------------------------------------------
INSERT INTO projects (id, name, description, status, start_date, end_date) VALUES
('11111111-1111-1111-1111-111111111111', 'Agrilythos Pre-Assessment Phase 1', 'DSP Digital Land Mapping Pre-Assessment pilot campaign in Attica region.', 'active', '2026-08-01', '2026-10-31');

-- -------------------------------------------------------------
-- 3. Insert Farmer
-- -------------------------------------------------------------
INSERT INTO farmers (id, full_name, contact_number, email, address) VALUES
('22222222-2222-2222-2222-222222222222', 'Yiannis Georgiou', '+30 210 1234567', 'yiannis.georgiou@fictionalfarm.gr', 'Marousi, Athens, Greece');

-- -------------------------------------------------------------
-- 4. Insert Field
-- Boundary is a 100m x 100m square (approx. 1 hectare) around Athens region (SRID 4326)
-- -------------------------------------------------------------
INSERT INTO fields (
    id, project_id, farmer_id, name, boundary, calculated_area_hectares, 
    crop_history_summary, verification_status, verified_by_id, verified_at, 
    verification_notes, created_by_id
) VALUES (
    '33333333-3333-3333-3333-333333333333', 
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-222222222222', 
    'Olive Grove Alpha', 
    ST_GeomFromText('MULTIPOLYGON(((23.7270 37.9820, 23.7290 37.9820, 23.7290 37.9840, 23.7270 37.9840, 23.7270 37.9820)))', 4326),
    1.2350, 
    'Olive trees (Koroneiki variety) planted in 2012. Soil historically untreated.', 
    'verified', 
    '00000000-0000-0000-0000-000000000002', 
    '2026-08-14 12:00:00+00', 
    'Field boundaries verified against high-resolution orthophotos. Area calculation matches cadastral records.',
    '00000000-0000-0000-0000-000000000001'
);

-- -------------------------------------------------------------
-- 5. Insert Field Zones
-- Zone boundaries are subsets of the parent field boundary and are mutually exclusive
-- -------------------------------------------------------------
INSERT INTO field_zones (
    id, field_id, name, boundary, zone_type, description, 
    verification_status, verified_by_id, verified_at, created_by_id
) VALUES 
(
    '44444444-4444-4444-4444-444444444441',
    '33333333-3333-3333-3333-333333333333',
    'Zone A - Sandy Soil',
    ST_GeomFromText('POLYGON((23.7272 37.9822, 23.7278 37.9822, 23.7278 37.9838, 23.7272 37.9838, 23.7272 37.9822))', 4326),
    'soil_type',
    'Zone characterized by sandy loam soil. Excellent drainage but low water holding capacity.',
    'verified',
    '00000000-0000-0000-0000-000000000002',
    '2026-08-14 12:05:00+00',
    '00000000-0000-0000-0000-000000000001'
),
(
    '44444444-4444-4444-4444-444444444442',
    '33333333-3333-3333-3333-333333333333',
    'Zone B - Clay Soil',
    ST_GeomFromText('POLYGON((23.7280 37.9822, 23.7288 37.9822, 23.7288 37.9838, 23.7280 37.9838, 23.7280 37.9822))', 4326),
    'soil_type',
    'Zone with higher clay content. Retains moisture longer but prone to waterlogging during heavy rain.',
    'verified',
    '00000000-0000-0000-0000-000000000002',
    '2026-08-14 12:05:00+00',
    '00000000-0000-0000-0000-000000000001'
);

-- -------------------------------------------------------------
-- 6. Insert Resources
-- Geometry types vary: Point for wells/solar, LineString for drip lines
-- -------------------------------------------------------------
INSERT INTO resources (
    id, project_id, field_id, name, resource_class, resource_type, 
    geom, attributes, status, verification_status, verified_by_id, 
    verified_at, verification_notes, created_by_id
) VALUES 
(
    '55555555-5555-5555-5555-555555555501',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Borehole Well Alpha',
    'WATER',
    'borehole',
    ST_GeomFromText('POINT(23.7275 37.9830)', 4326),
    '{"depth_meters": 85.0, "casing_material": "PVC", "estimated_yield_m3_hour": 12.5}'::jsonb,
    'EXISTING',
    'verified',
    '00000000-0000-0000-0000-000000000002',
    '2026-08-14 12:10:00+00',
    'Well structure is stable. Pump works. Water quality sample taken.',
    '00000000-0000-0000-0000-000000000001'
),
(
    '55555555-5555-5555-5555-555555555502',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Solar Array Array 1',
    'POWER',
    'solar_panel',
    ST_GeomFromText('POINT(23.7284 37.9830)', 4326),
    '{"number_of_panels": 12, "peak_capacity_kw": 4.8, "battery_storage_available": true}'::jsonb,
    'EXISTING',
    'verified',
    '00000000-0000-0000-0000-000000000002',
    '2026-08-14 12:12:00+00',
    'Off-grid setup verified. Operational with 4.8kW max output.',
    '00000000-0000-0000-0000-000000000001'
),
(
    '55555555-5555-5555-5555-555555555503',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Main Drip Line West-East',
    'IRRIGATION',
    'drip_line',
    ST_GeomFromText('LINESTRING(23.7273 37.9825, 23.7285 37.9825)', 4326),
    '{"diameter_mm": 32, "pipe_material": "HDPE", "emitters_per_meter": 2}'::jsonb,
    'EXISTING',
    'verified',
    '00000000-0000-0000-0000-000000000002',
    '2026-08-14 12:15:00+00',
    'Traced visually. Pressure test passes.',
    '00000000-0000-0000-0000-000000000001'
);

-- -------------------------------------------------------------
-- 7. Insert Reference Points
-- High-precision survey benchmarks
-- -------------------------------------------------------------
INSERT INTO reference_points (
    id, project_id, field_id, name, geom, elevation_meters, 
    horizontal_accuracy_meters, marker_type, description, 
    verification_status, verified_by_id, verified_at, created_by_id
) VALUES (
    '66666666-6666-6666-6666-666666666666',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Benchmark Ref 01',
    ST_GeomFromText('POINT(23.7271 37.9821)', 4326),
    128.45,
    0.02,
    'concrete_monument',
    'Primary surveyor benchmark located at the southwestern corner of Olive Grove Alpha.',
    'verified',
    '00000000-0000-0000-0000-000000000002',
    '2026-08-14 12:20:00+00',
    '00000000-0000-0000-0000-000000000001'
);

-- -------------------------------------------------------------
-- 8. Insert Field Observations
-- -------------------------------------------------------------
INSERT INTO observations (
    id, project_id, field_id, zone_id, resource_id, category, 
    notes, geom, observed_at, verification_status, verified_by_id, 
    verified_at, created_by_id
) VALUES 
(
    '77777777-7777-7777-7777-777777777701',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444441',
    '55555555-5555-5555-5555-555555555501',
    'soil_health',
    'Soil sample taken at borehole extraction point. Soil appears dry at surface. pH tested 6.8.',
    ST_GeomFromText('POINT(23.7274 37.9831)', 4326),
    '2026-08-14 09:30:00+00',
    'verified',
    '00000000-0000-0000-0000-000000000002',
    '2026-08-14 12:30:00+00',
    '00000000-0000-0000-0000-000000000001'
),
(
    '77777777-7777-7777-7777-777777777702',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444442',
    NULL,
    'pest_weed_infestation',
    'Small patch of wild mustard weeds expanding near northeastern fence. Recommend mowing.',
    ST_GeomFromText('POINT(23.7287 37.9835)', 4326),
    '2026-08-14 10:15:00+00',
    'verified',
    '00000000-0000-0000-0000-000000000002',
    '2026-08-14 12:35:00+00',
    '00000000-0000-0000-0000-000000000001'
);

-- -------------------------------------------------------------
-- 9. Insert Photos
-- Includes metadata extracted from cameras and GPS coordinates
-- -------------------------------------------------------------
INSERT INTO photos (
    id, file_path, mime_type, file_size_bytes, geom, direction_degrees, 
    captured_at, description, field_id, zone_id, resource_id, 
    observation_id, created_by_id
) VALUES 
(
    '88888888-8888-8888-8888-888888888801',
    'https://storage.googleapis.com/agrilythos-agx-preassessment/photos/borehole_well_alpha.jpg',
    'image/jpeg',
    3452102,
    ST_GeomFromText('POINT(23.7274 37.9831)', 4326),
    45.50,
    '2026-08-14 09:31:00+00',
    'Borehole pump control unit showing pressure reading 3.2 bar.',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444441',
    '55555555-5555-5555-5555-555555555501',
    '77777777-7777-7777-7777-777777777701',
    '00000000-0000-0000-0000-000000000001'
),
(
    '88888888-8888-8888-8888-888888888802',
    'https://storage.googleapis.com/agrilythos-agx-preassessment/photos/weed_infestation_northeast.jpg',
    'image/jpeg',
    4123890,
    ST_GeomFromText('POINT(23.7287 37.9835)', 4326),
    180.00,
    '2026-08-14 10:16:00+00',
    'Weed patch at northeastern sector, looking south along fence.',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444442',
    NULL,
    '77777777-7777-7777-7777-777777777702',
    '00000000-0000-0000-0000-000000000001'
);
