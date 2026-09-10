/**
 * V2V Tech AgriMap DSP — Accurate Farmland Datasets & GeoJSON Maps
 * Built for V2V Tech ("Vision to Value Technologies")
 * Customers: Ganesh V., Kishore S., Vignesh R., Ravi Kumar
 */

export const INITIAL_FARMERS = [
  {
    id: 'farmer-1',
    full_name: 'Ganesh V.',
    contact_number: '+91 98422 10834',
    email: 'ganesh.v@v2vfarm.in',
    address: 'Survey No. 48/2, Pollachi Green Valley, Coimbatore, Tamil Nadu - 642001',
    village: 'Pollachi Rural',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    total_acres: 21.4,
    total_hectares: 8.66,
    khata_number: 'TN-POL-4820',
    field_id: 'field-1',
    crops_summary: 'Coconut Plantation (9.5 Ha), Drip Nutmeg & Cocoa (5.2 Ha), Hybrid Sugarcane (6.7 Ha)',
    borewells_count: 3,
    cctv_count: 2,
    sensors_count: 4,
    readiness_score: 9.4,
    power_status: '3-Phase 440V Feeder (Active) + 12kW Solar',
    created_at: '2024-03-12T10:00:00Z',
  },
  {
    id: 'farmer-2',
    full_name: 'Kishore S.',
    contact_number: '+91 94433 89201',
    email: 'kishore.s@v2vfarm.in',
    address: 'Gat No. 112, Krishna Canal Basin, Karad, Maharashtra - 415110',
    village: 'Karad Agri Zone',
    district: 'Satara',
    state: 'Maharashtra',
    total_acres: 16.8,
    total_hectares: 6.80,
    khata_number: 'MH-STR-9112',
    field_id: 'field-2',
    crops_summary: 'Bt Cotton Bollgard (8.0 Ha), Drip Sugarcane CO-86032 (8.8 Ha)',
    borewells_count: 2,
    cctv_count: 2,
    sensors_count: 3,
    readiness_score: 9.1,
    power_status: '3-Phase Grid (Active)',
    created_at: '2024-04-05T14:30:00Z',
  },
  {
    id: 'farmer-3',
    full_name: 'Vignesh R.',
    contact_number: '+91 97890 45112',
    email: 'vignesh.r@v2vfarm.in',
    address: 'Sy No. 204, Kaveri Delta Region, Thanjavur, Tamil Nadu - 613001',
    village: 'Thiruvaiyaru',
    district: 'Thanjavur',
    state: 'Tamil Nadu',
    total_acres: 26.5,
    total_hectares: 10.72,
    khata_number: 'TN-TNJ-2044',
    field_id: 'field-3',
    crops_summary: 'Basmati CR-1009 Paddy (14.0 Ha), Banana Grand Naine (12.5 Ha)',
    borewells_count: 3,
    cctv_count: 3,
    sensors_count: 5,
    readiness_score: 9.6,
    power_status: '15kW Solar VFD + Agricultural Grid',
    created_at: '2024-05-18T09:15:00Z',
  },
  {
    id: 'farmer-4',
    full_name: 'Ravi Kumar',
    contact_number: '+91 98251 44820',
    email: 'ravi.kumar@v2vfarm.in',
    address: 'Survey No. 142/A, Borsad Road, Anand, Gujarat - 388001',
    village: 'Anand Rural',
    district: 'Anand',
    state: 'Gujarat',
    total_acres: 18.5,
    total_hectares: 7.49,
    khata_number: 'GJ-AND-1420',
    field_id: 'field-4',
    crops_summary: 'Alphonso Mango Orchard (8.5 Ha), Drip Pomegranate (6.0 Ha), Exotic Guava (4.0 Ha)',
    borewells_count: 2,
    cctv_count: 2,
    sensors_count: 4,
    readiness_score: 9.3,
    power_status: '10kW Solar + 3-Phase Grid',
    created_at: '2024-06-01T08:00:00Z',
  },
]

// GeoJSON for Ganesh V. Farmland (field-1) in Pollachi Agricultural Belt, Tamil Nadu
// Centered at Lat: 10.6585, Lng: 77.0125
export const FIELD_1_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    // 1. Exact Farmland Boundary Polygon (MultiPolygon)
    {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [77.0102, 10.6565],
              [77.0155, 10.6570],
              [77.0162, 10.6608],
              [77.0128, 10.6618],
              [77.0098, 10.6598],
              [77.0102, 10.6565],
            ]
          ]
        ]
      },
      properties: {
        entity_type: 'field',
        id: 'field-1',
        name: "Ganesh V.'s Smart Farmland",
        farmer_id: 'farmer-1',
        farmer_name: 'Ganesh V.',
        calculated_area_hectares: 8.66,
        calculated_area_acres: 21.4,
        verification_status: 'verified',
        survey_number: 'TN-POL-4820',
        soil_type: 'Red Loam & Rich Alluvial Delta Soil',
        slope: '0.6% Gentle Slope North-East',
        annual_rainfall: '920 mm',
      }
    },

    // 2. Shaded Crop Zones
    // Zone A: Coconut & Cocoa Grove
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.0105, 10.6572],
            [77.0135, 10.6574],
            [77.0132, 10.6602],
            [77.0103, 10.6595],
            [77.0105, 10.6572],
          ]
        ]
      },
      properties: {
        entity_type: 'zone',
        id: 'zone-1',
        name: 'Zone A — Pollachi Tall Coconut & Cocoa Grove',
        zone_type: 'plantation',
        shade_color: '#10B981',
        crop: 'Pollachi Tall Coconut + Intercropped Cocoa',
        crop_category: 'Horticulture Plantation',
        tree_count: 580,
        area_hectares: 3.85,
        planting_date: 'August 2021 (Year 5)',
        growth_stage: 'Peak Yield / Nut Bearing',
        soil_moisture: '71% (Optimal)',
        health_index: '98% (Excellent)',
        irrigation_type: 'Sub-surface Ring Basin Drip',
        last_irrigated: 'Today, 06:30 AM (3.0 hrs)',
        verification_status: 'verified',
      }
    },
    // Zone B: Hybrid Nutmeg & Banana
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.0137, 10.6575],
            [77.0153, 10.6577],
            [77.0150, 10.6605],
            [77.0134, 10.6603],
            [77.0137, 10.6575],
          ]
        ]
      },
      properties: {
        entity_type: 'zone',
        id: 'zone-2',
        name: 'Zone B — Grand Naine Banana & Nutmeg',
        zone_type: 'cash_crop',
        shade_color: '#F59E0B',
        crop: 'Tissue Culture Grand Naine Banana',
        crop_category: 'Commercial Fruit Plot',
        area_hectares: 2.55,
        planting_date: 'October 2025',
        growth_stage: 'Shooting & Bunch Development',
        soil_moisture: '66% (Good)',
        health_index: '94% (Healthy)',
        irrigation_type: 'Micro-Jet Sprinklers',
        last_irrigated: 'Yesterday, 05:15 PM',
        verification_status: 'verified',
      }
    },
    // Zone C: High-Yield Sugarcane Plot
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.0104, 10.6596],
            [77.0158, 10.6606],
            [77.0128, 10.6616],
            [77.0104, 10.6596],
          ]
        ]
      },
      properties: {
        entity_type: 'zone',
        id: 'zone-3',
        name: 'Zone C — Drip Sugarcane Co-0212',
        zone_type: 'commercial_cane',
        shade_color: '#8B5CF6',
        crop: 'Sugarcane Co-0212 (High Brix)',
        crop_category: 'Perennial Crop',
        area_hectares: 2.26,
        planting_date: 'January 2026',
        growth_stage: 'Formative & Tillering Stage',
        soil_moisture: '75% (Optimal)',
        health_index: '95% (Vigorous)',
        irrigation_type: 'Heavy Drip Laterals',
        last_irrigated: 'Today, 07:00 AM',
        verification_status: 'verified',
      }
    },

    // 3. Borewells & Water Pumps
    // Borewell #1 (Deep Aquifer Solar Borewell)
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [77.0118, 10.6578]
      },
      properties: {
        entity_type: 'resource',
        id: 'res-bw-1',
        name: 'Primary Solar Borewell #1',
        resource_class: 'WATER',
        resource_type: 'borewell_pump',
        status: 'ACTIVE_RUNNING',
        verification_status: 'verified',
        pump_capacity_hp: '10.0 HP Solar Hybrid VFD',
        motor_type: 'Water-Filled BLDC Submersible',
        depth_feet: 460,
        casing_diameter_inch: '8.5 inch Steel Casing',
        static_water_level_ft: 135,
        flow_rate_lpm: 155,
        flow_rate_display: '155 Liters / Minute',
        yesterday_runtime_hours: 4.5,
        yesterday_water_pumped_liters: 41850,
        power_source: '12kW Monocrystalline Solar + 3-Phase Feeder',
        operational_status: 'ONLINE · PUMPING ACTIVE',
        power_draw_kw: 7.2,
        total_lifetime_pumped_kl: 6240,
        controller_type: 'V2V Smart Agronomic Controller v4.2',
        last_service_date: '20 Aug 2026',
        notes: 'High-yield perennial aquifer. Yesterday ran continuously 4.5 hours from 07:15 AM to 11:45 AM. Zero faults.',
      }
    },
    // Borewell #2 (Auxiliary Farm Tube Well)
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [77.0148, 10.6598]
      },
      properties: {
        entity_type: 'resource',
        id: 'res-bw-2',
        name: 'Auxiliary North Tube Well #2',
        resource_class: 'WATER',
        resource_type: 'borewell_pump',
        status: 'STANDBY',
        verification_status: 'verified',
        pump_capacity_hp: '7.5 HP Electric Submersible',
        motor_type: 'Submersible 3-Phase',
        depth_feet: 410,
        casing_diameter_inch: '7 inch PVC Casing',
        static_water_level_ft: 150,
        flow_rate_lpm: 125,
        flow_rate_display: '125 Liters / Minute',
        yesterday_runtime_hours: 2.0,
        yesterday_water_pumped_liters: 15000,
        power_source: '3-Phase Feeder (Pollachi Grid)',
        operational_status: 'STANDBY · READY',
        power_draw_kw: 5.5,
        total_lifetime_pumped_kl: 2850,
        controller_type: 'V2V Relay Controller',
        last_service_date: '05 Sep 2026',
        notes: 'Backup unit connected to Sugarcane Zone C and cattle pond.',
      }
    },

    // 4. Autonomous 4K CCTV Cameras
    // CCTV Camera 1: Solar Station & Pump House
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [77.0121, 10.6580]
      },
      properties: {
        entity_type: 'device',
        id: 'cctv-1',
        device_name: 'CCTV 01 — Solar Station & Main Pump House',
        device_type: 'cctv_camera',
        status: 'ONLINE',
        verification_status: 'verified',
        camera_model: 'V2V Solar-PTZ 4K UltraHD AI Sentinel',
        resolution: '3840 x 2160 (4K UHD) @ 30 FPS',
        fov_angle: 120,
        pan_tilt_range: '360° Pan, 95° Tilt',
        night_vision: 'Smart Starlight Color + Dual IR LEDs (50m)',
        power_source: '80W Solar Panel + 50Ah LiFePO4 Internal Battery',
        battery_level: '99% (Solar Charged)',
        storage_status: '256GB High-Endurance SD + 4G Cloud Storage',
        last_motion_event: 'Farm worker routine inspection at 07:12 AM',
        connectivity: '4G LTE Industrial eSIM (Signal: 96% Excellent)',
        live_feed_simulated: true,
      }
    },
    // CCTV Camera 2: South-East Gate & Coconut Processing Yard
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [77.0152, 10.6572]
      },
      properties: {
        entity_type: 'device',
        id: 'cctv-2',
        device_name: 'CCTV 02 — South-East Gate & Processing Yard',
        device_type: 'cctv_camera',
        status: 'ONLINE',
        verification_status: 'verified',
        camera_model: 'V2V AI Perimeter Bullet 5MP Wide-Eye',
        resolution: '2560 x 1920 @ 25 FPS',
        fov_angle: 95,
        pan_tilt_range: 'Fixed Wide-Angle with Smart Intrusion Alert',
        night_vision: 'Warm Floodlight Auto-Illumination',
        power_source: 'Solar PoE Hybrid',
        battery_level: '96%',
        storage_status: 'Cloud NVR Stream Synced',
        last_motion_event: 'Tractor trailer entered at 08:24 AM',
        connectivity: 'Wireless Mesh backhaul to Main Farm Tower',
        live_feed_simulated: true,
      }
    },

    // 5. Internal Paths & Irrigation Pipeline Networks
    // Main Irrigation Pipeline (HDPE 90mm)
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.0118, 10.6578], // Borewell 1
          [77.0130, 10.6582],
          [77.0142, 10.6588],
          [77.0148, 10.6598], // Borewell 2
        ]
      },
      properties: {
        entity_type: 'resource',
        id: 'pipe-main-1',
        name: 'Main Central Irrigation Conduit (90mm HDPE PN-6)',
        resource_class: 'IRRIGATION',
        resource_type: 'main_pipeline',
        material: 'Virgin High-Density Polyethylene 90mm',
        diameter_mm: 90,
        working_pressure_bar: 2.9,
        status: 'PRESSURIZED_ACTIVE',
        verification_status: 'verified',
        connected_sources: 'Borewell #1 & Auxiliary #2',
        length_meters: 460,
      }
    },
    // Farm Tractor Access Path / Road inside land
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.0102, 10.6565], // South gate
          [77.0125, 10.6580],
          [77.0135, 10.6595],
          [77.0128, 10.6618], // North boundary
        ]
      },
      properties: {
        entity_type: 'resource',
        id: 'path-farm-access',
        name: 'Internal Tractor Access Road & Service Track',
        resource_class: 'STRUCTURE',
        resource_type: 'internal_path',
        material: 'Compacted Gravel & Paver Edge (4m width)',
        status: 'ACTIVE_ALL_WEATHER',
        verification_status: 'verified',
        length_meters: 620,
      }
    },

    // 6. IoT Soil & Environmental Sensors
    // Sensor Node 1 (Coconut Root Zone)
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [77.0122, 10.6588]
      },
      properties: {
        entity_type: 'device',
        id: 'sensor-1',
        device_name: 'V2V SoilSense Node 01 (Coconut Root Zone)',
        device_type: 'soil_sensor',
        status: 'ONLINE',
        verification_status: 'verified',
        soil_moisture_15cm: '71%',
        soil_moisture_45cm: '74%',
        soil_temperature: '25.4°C',
        ambient_temperature: '28.8°C',
        ambient_humidity: '68%',
        electrical_conductivity: '1.12 mS/cm',
        battery_level: '95%',
        last_sync: '2 minutes ago',
      }
    },
    // Sensor Node 2 (Banana Plot)
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [77.0142, 10.6585]
      },
      properties: {
        entity_type: 'device',
        id: 'sensor-2',
        device_name: 'V2V SoilSense Node 02 (Banana Plot)',
        device_type: 'soil_sensor',
        status: 'ONLINE',
        verification_status: 'verified',
        soil_moisture_15cm: '66%',
        soil_moisture_45cm: '69%',
        soil_temperature: '26.1°C',
        ambient_temperature: '29.2°C',
        ambient_humidity: '65%',
        electrical_conductivity: '1.20 mS/cm',
        battery_level: '91%',
        last_sync: 'Just now',
      }
    },

    // 7. Power Infrastructure Feeder
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [77.0112, 10.6570]
      },
      properties: {
        entity_type: 'resource',
        id: 'res-power-1',
        name: '3-Phase 440V Feeder & 12kW Solar Station',
        resource_class: 'POWER',
        resource_type: 'electrical_grid',
        status: 'ACTIVE_ONLINE',
        verification_status: 'verified',
        voltage: '420V Balanced (3-Phase)',
        frequency: '50.0 Hz',
        power_availability: '3-Phase Active (24-Hour Solar Hybrid Support)',
        solar_capacity_kw: '12 kW Monocrystalline Array',
        notes: '63 kVA Dedicated Agricultural Transformer with automatic phase corrector.',
      }
    }
  ]
}

// GeoJSON for Kishore S. (field-2) in Karad, Maharashtra
export const FIELD_2_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [74.1790, 17.2870],
              [74.1835, 17.2875],
              [74.1840, 17.2912],
              [74.1802, 17.2918],
              [74.1785, 17.2895],
              [74.1790, 17.2870],
            ]
          ]
        ]
      },
      properties: {
        entity_type: 'field',
        id: 'field-2',
        name: "Kishore S.'s Farmland Twin",
        farmer_id: 'farmer-2',
        farmer_name: 'Kishore S.',
        calculated_area_hectares: 6.80,
        calculated_area_acres: 16.8,
        verification_status: 'verified',
        survey_number: 'MH-STR-9112',
        soil_type: 'Medium Black Cotton Basalt Soil',
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [74.1795, 17.2875],
            [74.1825, 17.2878],
            [74.1822, 17.2905],
            [74.1792, 17.2900],
            [74.1795, 17.2875],
          ]
        ]
      },
      properties: {
        entity_type: 'zone',
        id: 'zone-k1',
        name: 'Zone A — Bt Cotton Bollgard II',
        shade_color: '#10B981',
        crop: 'Bt Cotton (Bollgard II)',
        area_hectares: 3.80,
        area_acres: 9.4,
        soil_moisture: '68%',
        verification_status: 'verified',
      }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [74.1812, 17.2890] },
      properties: {
        entity_type: 'resource',
        id: 'res-bw-k1',
        name: 'Krishna Basin Canal Borewell #1',
        resource_class: 'WATER',
        resource_type: 'borewell_pump',
        status: 'ACTIVE_RUNNING',
        operational_status: 'ONLINE · PUMPING ACTIVE',
        pump_capacity_hp: '7.5 HP Submersible',
        flow_rate_lpm: 140,
        depth_feet: 380,
        yesterday_runtime_hours: 4.0,
        yesterday_water_pumped_liters: 33600,
        verification_status: 'verified',
      }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [74.1816, 17.2893] },
      properties: {
        entity_type: 'device',
        id: 'cctv-k1',
        device_name: 'V2V Sentinel 4K CCTV (Karad)',
        device_type: 'cctv_camera',
        status: 'ONLINE',
        camera_model: 'V2V Solar-PTZ 4K UltraHD AI Sentinel',
        verification_status: 'verified',
      }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [74.1805, 17.2885] },
      properties: {
        entity_type: 'device',
        id: 'sensor-k1',
        device_name: 'Karad Multi-Depth Soil Probe',
        device_type: 'soil_sensor',
        status: 'ONLINE',
        battery_level: '94%',
        soil_moisture_15cm: '68%',
        soil_moisture_45cm: '72%',
        verification_status: 'verified',
      }
    }
  ]
}

// GeoJSON for Vignesh R. (field-3) in Thanjavur, Tamil Nadu
export const FIELD_3_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [79.1350, 10.7850],
              [79.1410, 10.7855],
              [79.1418, 10.7898],
              [79.1370, 10.7905],
              [79.1345, 10.7880],
              [79.1350, 10.7850],
            ]
          ]
        ]
      },
      properties: {
        entity_type: 'field',
        id: 'field-3',
        name: "Vignesh R.'s Kaveri Delta Farmland",
        farmer_id: 'farmer-3',
        farmer_name: 'Vignesh R.',
        calculated_area_hectares: 10.72,
        calculated_area_acres: 26.5,
        verification_status: 'verified',
        survey_number: 'TN-TNJ-2044',
        soil_type: 'Alluvial Delta Silt Clay',
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [79.1358, 10.7858],
            [79.1395, 10.7862],
            [79.1390, 10.7890],
            [79.1355, 10.7885],
            [79.1358, 10.7858],
          ]
        ]
      },
      properties: {
        entity_type: 'zone',
        id: 'zone-v1',
        name: 'Zone A — CR-1009 Basmati Paddy',
        shade_color: '#3B82F6',
        crop: 'CR-1009 Basmati Paddy',
        area_hectares: 5.50,
        area_acres: 13.6,
        soil_moisture: '78%',
        verification_status: 'verified',
      }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [79.1380, 10.7875] },
      properties: {
        entity_type: 'resource',
        id: 'res-bw-v1',
        name: 'Delta Solar Borewell #1',
        resource_class: 'WATER',
        resource_type: 'borewell_pump',
        status: 'ACTIVE_RUNNING',
        operational_status: 'ONLINE · PUMPING ACTIVE',
        pump_capacity_hp: '15.0 HP Solar VFD',
        flow_rate_lpm: 210,
        depth_feet: 320,
        yesterday_runtime_hours: 5.2,
        yesterday_water_pumped_liters: 65520,
        verification_status: 'verified',
      }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [79.1385, 10.7878] },
      properties: {
        entity_type: 'device',
        id: 'cctv-v1',
        device_name: 'Thanjavur Basin CCTV #1',
        device_type: 'cctv_camera',
        status: 'ONLINE',
        camera_model: 'V2V Solar-PTZ 4K UltraHD AI Sentinel',
        verification_status: 'verified',
      }
    }
  ]
}

// GeoJSON for Ravi Kumar (field-4) in Anand, Gujarat
export const FIELD_4_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [72.9260, 22.5620],
              [72.9315, 22.5625],
              [72.9320, 22.5668],
              [72.9280, 22.5675],
              [72.9255, 22.5650],
              [72.9260, 22.5620],
            ]
          ]
        ]
      },
      properties: {
        entity_type: 'field',
        id: 'field-4',
        name: "Ravi Kumar's Anand Orchard Twin",
        farmer_id: 'farmer-4',
        farmer_name: 'Ravi Kumar',
        calculated_area_hectares: 7.49,
        calculated_area_acres: 18.5,
        verification_status: 'verified',
        survey_number: 'GJ-AND-1420',
        soil_type: 'Sandy Loam Goradu Soil',
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.9268, 22.5630],
            [72.9305, 22.5635],
            [72.9300, 22.5660],
            [72.9265, 22.5655],
            [72.9268, 22.5630],
          ]
        ]
      },
      properties: {
        entity_type: 'zone',
        id: 'zone-r1',
        name: 'Zone A — Alphonso Mango & Guava Orchard',
        shade_color: '#F59E0B',
        crop: 'Alphonso Mango Orchard',
        area_hectares: 4.20,
        area_acres: 10.4,
        soil_moisture: '64%',
        verification_status: 'verified',
      }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [72.9290, 22.5645] },
      properties: {
        entity_type: 'resource',
        id: 'res-bw-r1',
        name: 'Anand High-Tech Solar Borewell',
        resource_class: 'WATER',
        resource_type: 'borewell_pump',
        status: 'ACTIVE_RUNNING',
        operational_status: 'ONLINE · PUMPING ACTIVE',
        pump_capacity_hp: '10.0 HP Solar Hybrid',
        flow_rate_lpm: 160,
        depth_feet: 410,
        yesterday_runtime_hours: 3.8,
        yesterday_water_pumped_liters: 36480,
        verification_status: 'verified',
      }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [72.9295, 22.5648] },
      properties: {
        entity_type: 'device',
        id: 'cctv-r1',
        device_name: 'Anand Orchard Sentinel 4K',
        device_type: 'cctv_camera',
        status: 'ONLINE',
        camera_model: 'V2V Solar-PTZ 4K UltraHD AI Sentinel',
        verification_status: 'verified',
      }
    }
  ]
}

// Initial Projects for Platform Overview
export const INITIAL_PROJECTS = [
  {
    id: 'proj-1',
    name: 'Pollachi Coconut & Spice Precision Corridor',
    description: 'High-resolution digital land twin, autonomous borewell telemetry, and 4K CCTV deployment for Ganesh V.',
    status: 'in_progress',
    start_date: '2024-01-15',
    end_date: '2024-12-31',
    farmer_id: 'farmer-1',
    fields_count: 1,
    total_hectares: 8.66,
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'proj-2',
    name: 'Krishna Basin Cotton & Cane Smart Water Initiative',
    description: 'Borewell automation and soil moisture telemetry for Kishore S.',
    status: 'in_progress',
    start_date: '2024-02-10',
    end_date: '2024-11-30',
    farmer_id: 'farmer-2',
    fields_count: 1,
    total_hectares: 6.80,
    created_at: '2024-02-10T00:00:00Z',
  },
  {
    id: 'proj-3',
    name: 'Kaveri Delta Sustainable Paddy & Banana Twin',
    description: 'Sub-meter boundary mapping and canal flow integration for Vignesh R.',
    status: 'in_progress',
    start_date: '2024-03-01',
    end_date: '2025-03-31',
    farmer_id: 'farmer-3',
    fields_count: 1,
    total_hectares: 10.72,
    created_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'proj-4',
    name: 'Anand High-Tech Organic Orchard Platform',
    description: 'Precision drip and micro-climate analytics for Ravi Kumar.',
    status: 'planning',
    start_date: '2024-04-01',
    end_date: '2025-04-30',
    farmer_id: 'farmer-4',
    fields_count: 1,
    total_hectares: 7.49,
    created_at: '2024-04-01T00:00:00Z',
  }
]
