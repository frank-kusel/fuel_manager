-- FarmTrack Sample Data
-- Run this after the initial schema to populate sample data for testing

-- ============================================================================
-- SAMPLE VEHICLES
-- ============================================================================
INSERT INTO vehicles (code, name, type, registration, make, model, year, fuel_type, tank_capacity, notes, active) VALUES
('VH001', 'Main Tractor', 'tractor', 'ABC123GP', 'John Deere', '6120R', 2020, 'diesel', 280.0, 'Primary field work tractor', true),
('VH002', 'Combine Harvester', 'harvester', 'DEF456GP', 'Case IH', 'Axial-Flow 7150', 2019, 'diesel', 450.0, 'Grain harvesting', true),
('VH003', 'Utility Vehicle', 'utility', 'GHI789GP', 'Ford', 'Ranger', 2021, 'diesel', 80.0, 'General farm transport', true),
('VH004', 'Backup Tractor', 'tractor', 'JKL012GP', 'Massey Ferguson', '5710', 2018, 'diesel', 240.0, 'Secondary tractor', true),
('VH005', 'Sprayer Unit', 'sprayer', 'MNO345GP', 'Apache', 'AS1020', 2020, 'diesel', 150.0, 'Crop protection', true);

-- ============================================================================
-- SAMPLE DRIVERS
-- ============================================================================
INSERT INTO drivers (employee_code, name, phone, email, license_number, license_class, license_issue, license_expiry, emergency_contact_name, emergency_contact_phone, notes, active) VALUES
('DR001', 'John Smith', '0821234567', 'john.smith@farm.co.za', '1234567890123', 'EB', '2020-03-15', '2025-03-15', 'Mary Smith', '0827654321', 'Senior farm operator', true),
('DR002', 'Peter Johnson', '0829876543', 'peter.johnson@farm.co.za', '9876543210987', 'EB', '2019-07-22', '2024-07-22', 'Susan Johnson', '0823456789', 'Equipment specialist', true),
('DR003', 'David Williams', '0834567890', 'david.williams@farm.co.za', '4567890123456', 'EB', '2021-01-10', '2026-01-10', 'Linda Williams', '0831234567', 'Part-time operator', true),
('DR004', 'Michael Brown', '0845678901', 'michael.brown@farm.co.za', '7890123456789', 'EB', '2020-11-05', '2025-11-05', 'Carol Brown', '0847890123', 'Maintenance specialist', true),
('DR005', 'Robert Davis', '0856789012', 'robert.davis@farm.co.za', '0123456789012', 'EB', '2021-06-18', '2026-06-18', 'Helen Davis', '0858901234', 'Seasonal worker', true);

-- ============================================================================
-- SAMPLE BOWSERS
-- ============================================================================
INSERT INTO bowsers (code, name, registration, fuel_type, capacity, current_reading, notes, active) VALUES
('BD001', 'Main Diesel Bowser', 'BWS001GP', 'diesel', 2000.0, 1850.0, 'Primary fuel storage', true),
('BD002', 'Field Diesel Bowser', 'BWS002GP', 'diesel', 1500.0, 1200.0, 'Mobile field refueling', true),
('BP001', 'Petrol Bowser', 'BWS003GP', 'petrol', 1000.0, 800.0, 'Small equipment fuel', true),
('BD003', 'Backup Diesel Bowser', 'BWS004GP', 'diesel', 1000.0, 750.0, 'Emergency backup', true);

-- ============================================================================
-- SAMPLE ACTIVITIES
-- ============================================================================
INSERT INTO activities (code, name, category, description, active) VALUES
('PL001', 'Plowing', 'planting', 'Primary tillage for field preparation', true),
('PL002', 'Planting Corn', 'planting', 'Corn seed planting operations', true),
('PL003', 'Planting Soybeans', 'planting', 'Soybean seed planting operations', true),
('HA001', 'Corn Harvest', 'harvesting', 'Harvesting corn crops', true),
('HA002', 'Soybean Harvest', 'harvesting', 'Harvesting soybean crops', true),
('SP001', 'Herbicide Application', 'spraying', 'Weed control spraying', true),
('SP002', 'Pesticide Application', 'spraying', 'Pest control spraying', true),
('FE001', 'Fertilizer Application', 'fertilizing', 'Applying granular fertilizer', true),
('FE002', 'Liquid Fertilizer', 'fertilizing', 'Applying liquid fertilizer', true),
('MA001', 'Equipment Maintenance', 'maintenance', 'Regular equipment servicing', true),
('MA002', 'Field Maintenance', 'maintenance', 'Field infrastructure maintenance', true),
('OT001', 'Transport Operations', 'other', 'General transportation tasks', true);

-- ============================================================================
-- SAMPLE FIELDS
-- ============================================================================
INSERT INTO fields (code, name, type, area, location, crop_type, notes, active) VALUES
('AR001', 'North Field', 'arable', 45.5, 'Northern section', 'Corn', 'Prime agricultural land', true),
('AR002', 'South Field', 'arable', 38.2, 'Southern section', 'Soybeans', 'Well-drained soil', true),
('AR003', 'East Field', 'arable', 52.7, 'Eastern section', 'Wheat', 'Recently cleared', true),
('AR004', 'West Field', 'arable', 41.3, 'Western section', 'Corn', 'Near water source', true),
('PA001', 'Grazing Pasture A', 'pasture', 25.0, 'Northwest corner', 'Mixed grass', 'Livestock grazing', true),
('PA002', 'Grazing Pasture B', 'pasture', 30.5, 'Southwest corner', 'Mixed grass', 'Rotational grazing', true),
('OR001', 'Apple Orchard', 'orchard', 15.8, 'Southeast hill', 'Apples', 'Established orchard', true),
('GH001', 'Greenhouse Complex', 'greenhouse', 2.5, 'Near farmhouse', 'Vegetables', 'Climate controlled', true);

-- ============================================================================
-- SAMPLE FUEL ENTRIES
-- ============================================================================
INSERT INTO fuel_entries (
    entry_date, time, driver_id, vehicle_id, bowser_id, activity_id, field_id,
    odometer_reading, bowser_reading_start, bowser_reading_end, 
    litres_dispensed, litres_used, cost_per_litre, total_cost, notes
) VALUES 
(
    CURRENT_DATE - INTERVAL '1 day',
    '08:30:00',
    (SELECT id FROM drivers WHERE employee_code = 'DR001'),
    (SELECT id FROM vehicles WHERE code = 'VH001'),
    (SELECT id FROM bowsers WHERE code = 'BD001'),
    (SELECT id FROM activities WHERE code = 'PL001'),
    (SELECT id FROM fields WHERE code = 'AR001'),
    12450.5,
    1950.0,
    1880.0,
    70.0,
    65.0,
    18.50,
    1295.00,
    'Plowing north field - full day operation'
),
(
    CURRENT_DATE - INTERVAL '1 day',
    '14:15:00',
    (SELECT id FROM drivers WHERE employee_code = 'DR002'),
    (SELECT id FROM vehicles WHERE code = 'VH002'),
    (SELECT id FROM bowsers WHERE code = 'BD001'),
    (SELECT id FROM activities WHERE code = 'HA001'),
    (SELECT id FROM fields WHERE code = 'AR002'),
    8750.2,
    1880.0,
    1820.0,
    60.0,
    58.0,
    18.50,
    1110.00,
    'Harvesting soybeans - afternoon shift'
),
(
    CURRENT_DATE,
    '09:00:00',
    (SELECT id FROM drivers WHERE employee_code = 'DR001'),
    (SELECT id FROM vehicles WHERE code = 'VH003'),
    (SELECT id FROM bowsers WHERE code = 'BD002'),
    (SELECT id FROM activities WHERE code = 'OT001'),
    (SELECT id FROM fields WHERE code = 'AR003'),
    5230.8,
    1200.0,
    1170.0,
    30.0,
    28.0,
    18.50,
    555.00,
    'Field inspection and transport'
);

-- ============================================================================
-- SAMPLE REFILL RECORDS
-- ============================================================================
INSERT INTO refill_records (
    bowser_id, refill_date, litres_added, cost_per_litre, total_cost,
    supplier, invoice_number, notes
) VALUES
(
    (SELECT id FROM bowsers WHERE code = 'BD001'),
    CURRENT_DATE - INTERVAL '3 days',
    500.0,
    17.80,
    8900.00,
    'Fuel Express SA',
    'FE2024-001234',
    'Weekly fuel delivery'
),
(
    (SELECT id FROM bowsers WHERE code = 'BD002'),
    CURRENT_DATE - INTERVAL '5 days',
    300.0,
    17.80,
    5340.00,
    'Fuel Express SA', 
    'FE2024-001198',
    'Field bowser refill'
);

-- ============================================================================
-- UPDATE BOWSER READINGS AFTER FUEL ENTRIES
-- ============================================================================
-- Update bowser current readings based on the sample fuel entries
UPDATE bowsers SET current_reading = 1820.0 WHERE code = 'BD001';
UPDATE bowsers SET current_reading = 1170.0 WHERE code = 'BD002';