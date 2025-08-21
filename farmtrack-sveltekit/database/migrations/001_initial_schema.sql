-- FarmTrack Database Schema Migration
-- Phase 2: Complete schema for all entities
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    registration VARCHAR(100) NOT NULL,
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

-- ============================================================================
-- DRIVERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
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

-- ============================================================================
-- BOWSERS TABLE
-- ============================================================================
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

-- ============================================================================
-- ACTIVITIES TABLE
-- ============================================================================
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

-- ============================================================================
-- FIELDS TABLE
-- ============================================================================
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

-- ============================================================================
-- FUEL ENTRIES TABLE (existing, but adding missing columns)
-- ============================================================================
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

-- ============================================================================
-- REFILL RECORDS TABLE
-- ============================================================================
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
-- INDEXES FOR PERFORMANCE
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
-- UPDATED_AT TRIGGERS
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
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at 
    BEFORE UPDATE ON vehicles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at 
    BEFORE UPDATE ON drivers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bowsers_updated_at ON bowsers;
CREATE TRIGGER update_bowsers_updated_at 
    BEFORE UPDATE ON bowsers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at 
    BEFORE UPDATE ON activities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fields_updated_at ON fields;
CREATE TRIGGER update_fields_updated_at 
    BEFORE UPDATE ON fields 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fuel_entries_updated_at ON fuel_entries;
CREATE TRIGGER update_fuel_entries_updated_at 
    BEFORE UPDATE ON fuel_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_refill_records_updated_at ON refill_records;
CREATE TRIGGER update_refill_records_updated_at 
    BEFORE UPDATE ON refill_records 
    FOR EACH ROW EXECUTE FUNCTION update_refill_records_updated_at_column();

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
-- These can be refined later based on user roles

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