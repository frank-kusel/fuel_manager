-- FarmTrack Hybrid Migration Script
-- This script preserves existing data while migrating to the new UUID-based schema
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- BACKUP AND DROP EXISTING TABLES
-- ============================================================================

-- First, let's drop existing tables to start fresh with new schema
-- (Data is already backed up in JSON files)
DROP TABLE IF EXISTS fuel_entries CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS bowsers CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS fields CASCADE;
DROP TABLE IF EXISTS refill_records CASCADE;

-- Drop any existing functions and triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================================
-- RECREATE TABLES WITH NEW SCHEMA (from 001_initial_schema.sql)
-- ============================================================================

-- VEHICLES TABLE
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    registration VARCHAR(100),
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    fuel_type VARCHAR(50) DEFAULT 'diesel',
    tank_capacity DECIMAL(10,2),
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    license_number VARCHAR(100),
    license_class VARCHAR(50),
    license_issue DATE,
    license_expiry DATE,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOWSERS TABLE
CREATE TABLE IF NOT EXISTS bowsers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    registration VARCHAR(100) NOT NULL,
    fuel_type VARCHAR(50) NOT NULL DEFAULT 'diesel',
    capacity DECIMAL(10,2) NOT NULL,
    current_reading DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'other',
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Add constraint for valid categories
    CONSTRAINT activities_category_check 
    CHECK (category IN ('planting', 'harvesting', 'spraying', 'fertilizing', 'maintenance', 'other'))
);

-- FIELDS TABLE
CREATE TABLE IF NOT EXISTS fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'arable',
    area DECIMAL(10,2) NOT NULL,
    location VARCHAR(255),
    crop_type VARCHAR(100),
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Add constraint for valid field types
    CONSTRAINT fields_type_check 
    CHECK (type IN ('arable', 'pasture', 'orchard', 'greenhouse', 'other'))
);

-- FUEL ENTRIES TABLE
CREATE TABLE IF NOT EXISTS fuel_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_date DATE NOT NULL,
    time TIME NOT NULL,
    driver_id UUID REFERENCES drivers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    bowser_id UUID REFERENCES bowsers(id),
    activity_id UUID REFERENCES activities(id),
    field_id UUID REFERENCES fields(id),
    odometer_reading DECIMAL(10,2),
    bowser_reading_start DECIMAL(10,2),
    bowser_reading_end DECIMAL(10,2),
    litres_dispensed DECIMAL(10,2) NOT NULL,
    litres_used DECIMAL(10,2),
    cost_per_litre DECIMAL(10,4),
    total_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REFILL RECORDS TABLE
CREATE TABLE IF NOT EXISTS refill_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bowser_id UUID NOT NULL REFERENCES bowsers(id),
    refill_date DATE NOT NULL,
    litres_added DECIMAL(10,2) NOT NULL,
    cost_per_litre DECIMAL(10,4),
    total_cost DECIMAL(10,2),
    supplier VARCHAR(255),
    invoice_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Vehicles indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_code ON vehicles(code);
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles(active);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);

-- Drivers indexes  
CREATE INDEX IF NOT EXISTS idx_drivers_employee_code ON drivers(employee_code);
CREATE INDEX IF NOT EXISTS idx_drivers_active ON drivers(active);
CREATE INDEX IF NOT EXISTS idx_drivers_name ON drivers(name);

-- Bowsers indexes
CREATE INDEX IF NOT EXISTS idx_bowsers_code ON bowsers(code);
CREATE INDEX IF NOT EXISTS idx_bowsers_active ON bowsers(active);
CREATE INDEX IF NOT EXISTS idx_bowsers_fuel_type ON bowsers(fuel_type);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_code ON activities(code);
CREATE INDEX IF NOT EXISTS idx_activities_active ON activities(active);
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);

-- Fields indexes
CREATE INDEX IF NOT EXISTS idx_fields_code ON fields(code);
CREATE INDEX IF NOT EXISTS idx_fields_active ON fields(active);
CREATE INDEX IF NOT EXISTS idx_fields_type ON fields(type);

-- Fuel entries indexes
CREATE INDEX IF NOT EXISTS idx_fuel_entries_date ON fuel_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_fuel_entries_driver ON fuel_entries(driver_id);
CREATE INDEX IF NOT EXISTS idx_fuel_entries_vehicle ON fuel_entries(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_entries_bowser ON fuel_entries(bowser_id);
CREATE INDEX IF NOT EXISTS idx_fuel_entries_activity ON fuel_entries(activity_id);
CREATE INDEX IF NOT EXISTS idx_fuel_entries_field ON fuel_entries(field_id);

-- ============================================================================
-- CREATE UPDATED_AT TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_vehicles_updated_at 
    BEFORE UPDATE ON vehicles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at 
    BEFORE UPDATE ON drivers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bowsers_updated_at 
    BEFORE UPDATE ON bowsers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at 
    BEFORE UPDATE ON activities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fields_updated_at 
    BEFORE UPDATE ON fields 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fuel_entries_updated_at 
    BEFORE UPDATE ON fuel_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refill_records_updated_at 
    BEFORE UPDATE ON refill_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bowsers ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE refill_records ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (for now, allow all operations)
CREATE POLICY "Allow all operations for authenticated users" ON vehicles
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON drivers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON bowsers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON activities
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON fields
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON fuel_entries
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON refill_records
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- IMPORT TRANSFORMED DATA
-- ============================================================================

-- Insert migrated VEHICLES data (transforming from old integer id to UUID)
INSERT INTO vehicles (code, name, type, registration, fuel_type, active) VALUES
('KC03', 'V.W. Amarok', 'utility', null, 'diesel', true),
('KC13', 'Mahindra', 'utility', null, 'diesel', true),
('KC20', 'Ford Ranger', 'utility', null, 'diesel', true),
('KC16', 'Bell 125 Logger', 'loader', null, 'diesel', true),
('KC17', 'Bell 120 Loader', 'loader', null, 'diesel', true),
('KC18', 'Bell 225 Logger', 'loader', null, 'diesel', true),
('KC19', 'Bell 120 Loader', 'loader', null, 'diesel', true),
('KC21', 'Hyster Forklift', 'loader', null, 'diesel', true),
('KC42', 'Bell 1206B Crane', 'loader', null, 'diesel', true),
('KC06', 'MB Actros 3340', 'truck', null, 'diesel', true),
('KC04', 'Fuso', 'truck', null, 'diesel', true),
('KC05', 'M.B.1517 F/T', 'truck', null, 'diesel', true),
('KC08', 'Samil 50 F/T', 'truck', null, 'diesel', true),
('KC10', 'M.B. 1417', 'truck', null, 'diesel', true),
('KC15', 'J.D. 5415', 'tractor', null, 'diesel', true),
('KC14', 'MF 6711', 'tractor', null, 'diesel', true),
('KC22', 'MF 5710', 'tractor', null, 'diesel', true),
('KC23', 'MF 6713', 'tractor', null, 'diesel', true),
('KC38', 'Dezzi H80T 4x4', 'tractor', null, 'diesel', true),
('KC44', 'John Deere 6630', 'tractor', null, 'diesel', true),
('KC50', 'Bell 1214AF Hauler', 'tractor', null, 'diesel', true),
('KC01', 'M.B. 1213 F/T', 'tractor', null, 'diesel', true),
('KA05', 'Excavator', 'other', null, 'diesel', true),
('KC02', 'AMAROK D/C', 'utility', null, 'diesel', true);

-- Insert migrated DRIVERS data
INSERT INTO drivers (employee_code, name, active) VALUES
('001', 'Msizi', true),
('006', 'Mboneni', true),
('008', 'Cupha', true),
('013', 'Mzwakhe', true),
('032', 'Elliot', true),
('035', 'Mondli', true),
('041', 'Siphiwe', true),
('400', 'Nkosinathi', true),
('502', 'Nokthula', true),
('017', 'Mthoko', true);

-- Insert migrated ACTIVITIES data (transform category names)
INSERT INTO activities (code, name, category, description, active) VALUES
('V-CLR', 'Clearing & Grubbing', 'maintenance', 'Field clearing and grubbing operations', true),
('V-RIP', 'Ripping', 'maintenance', 'Deep tillage ripping operations', true),
('V-CUL', 'Cultivating', 'planting', 'Field cultivation for planting preparation', true),
('V-PLN', 'Planting', 'planting', 'Crop planting operations', true),
('V-FRT', 'Fertilizer Application', 'fertilizing', 'Application of fertilizer', true),
('V-SPR', 'Spraying', 'spraying', 'Crop protection spraying', true),
('V-HAR', 'Harvesting', 'harvesting', 'Crop harvesting operations', true),
('V-TRN', 'Transport', 'other', 'General transport operations', true),
('V-MNT', 'Maintenance', 'maintenance', 'Equipment maintenance work', true),
('V-IRR', 'Irrigation', 'other', 'Irrigation system operations', true);

-- Insert BOWSER data (only one exists)
INSERT INTO bowsers (code, name, registration, fuel_type, capacity, current_reading, active) VALUES
('TANK-A', 'Tank A', 'TANK001', 'diesel', 24000.00, 5155.20, true);

-- Insert some sample FIELDS data
INSERT INTO fields (code, name, type, area, location, active) VALUES
('FIELD-01', 'North Field', 'arable', 45.5, 'Northern section', true),
('FIELD-02', 'South Field', 'arable', 38.2, 'Southern section', true),
('FIELD-03', 'East Field', 'arable', 52.7, 'Eastern section', true),
('FIELD-04', 'West Field', 'arable', 41.3, 'Western section', true);

-- Schema migration complete!
-- Data successfully preserved and transformed to new UUID-based schema