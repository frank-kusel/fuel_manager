-- Migration: Add Zones System for Non-Field Location Tracking
-- Purpose: SARS compliance for operations that don't occur in specific fields
-- Author: FarmTrack Development
-- Date: 2025-01-14

-- Create zones table for general location tracking
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    zone_type VARCHAR(50) DEFAULT 'general',
    coordinates JSONB, -- For future map integration
    color VARCHAR(7), -- Hex color for visual identification
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add zone_id to fuel_entries table (can have either field_id OR zone_id)
ALTER TABLE fuel_entries 
ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id);

-- Add constraint to ensure either field_id or zone_id is set (but not both)
ALTER TABLE fuel_entries 
ADD CONSTRAINT check_location_reference 
CHECK (
    (field_id IS NOT NULL AND zone_id IS NULL) OR 
    (field_id IS NULL AND zone_id IS NOT NULL) OR
    (field_id IS NULL AND zone_id IS NULL) -- Allow null for backwards compatibility
);

-- Create index for zone lookups
CREATE INDEX IF NOT EXISTS idx_fuel_entries_zone_id ON fuel_entries(zone_id);

-- Create index for active zones
CREATE INDEX IF NOT EXISTS idx_zones_active ON zones(active) WHERE active = true;

-- Insert default geographic zones (6 zones based on farm geography)
INSERT INTO zones (code, name, description, zone_type, color, display_order) VALUES
('A1', 'Zone A1 - North', 'Northern section of the farm', 'farm_section', '#FF6B6B', 1),
('A2', 'Zone A2 - Northeast', 'Northeastern section of the farm', 'farm_section', '#4ECDC4', 2),
('B1', 'Zone B1 - East', 'Eastern section of the farm', 'farm_section', '#45B7D1', 3),
('B2', 'Zone B2 - South', 'Southern section of the farm', 'farm_section', '#96CEB4', 4),
('C1', 'Zone C1 - West', 'Western section of the farm', 'farm_section', '#9B59B6', 5),
('C2', 'Zone C2 - Central', 'Central area including farmyard and sheds', 'farm_section', '#FFA500', 6)
ON CONFLICT (code) DO NOTHING;

-- Add updated_at trigger for zones table
CREATE OR REPLACE FUNCTION update_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zones_updated_at
    BEFORE UPDATE ON zones
    FOR EACH ROW
    EXECUTE FUNCTION update_zones_updated_at();

-- Create view for fuel entries with location details (combines fields and zones)
CREATE OR REPLACE VIEW fuel_entries_with_location AS
SELECT 
    fe.*,
    COALESCE(f.name, z.name) as location_name,
    COALESCE(f.code, z.code) as location_code,
    CASE 
        WHEN fe.field_id IS NOT NULL THEN 'field'
        WHEN fe.zone_id IS NOT NULL THEN 'zone'
        ELSE 'unspecified'
    END as location_type,
    f.type as field_type,
    z.zone_type as zone_type
FROM fuel_entries fe
LEFT JOIN fields f ON fe.field_id = f.id
LEFT JOIN zones z ON fe.zone_id = z.id;

-- Add comment explaining the zones system
COMMENT ON TABLE zones IS 'General location zones for operations that do not occur in specific fields. Used for SARS compliance to provide start/end locations for all trips.';
COMMENT ON COLUMN zones.zone_type IS 'Type of zone: farm_section, infrastructure, transport, maintenance, general';
COMMENT ON COLUMN zones.coordinates IS 'GeoJSON coordinates for future map integration';
COMMENT ON COLUMN zones.color IS 'Hex color code for visual identification on maps and UI';

-- Grant permissions
GRANT ALL ON zones TO authenticated;
GRANT ALL ON fuel_entries_with_location TO authenticated;

-- Add RLS policies for zones
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read zones
CREATE POLICY "Zones are viewable by authenticated users" ON zones
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only allow admins to modify zones (you can adjust this based on your auth setup)
CREATE POLICY "Zones are editable by authenticated users" ON zones
    FOR ALL USING (auth.uid() IS NOT NULL);