-- Migration: Add Multi-Field Support for Fuel Entries
-- Purpose: Enable multiple field selection per fuel entry via junction table
-- Author: FarmTrack Development
-- Date: 2025-09-02

-- Create junction table for many-to-many relationship between fuel entries and fields
CREATE TABLE IF NOT EXISTS fuel_entry_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fuel_entry_id UUID NOT NULL REFERENCES fuel_entries(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure no duplicate field-entry pairs
    UNIQUE(fuel_entry_id, field_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fuel_entry_fields_fuel_entry_id ON fuel_entry_fields(fuel_entry_id);
CREATE INDEX IF NOT EXISTS idx_fuel_entry_fields_field_id ON fuel_entry_fields(field_id);

-- Add updated_at trigger for fuel_entry_fields table
CREATE OR REPLACE FUNCTION update_fuel_entry_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add field_selection_mode to fuel_entries to track single vs multi-field mode
ALTER TABLE fuel_entries 
ADD COLUMN IF NOT EXISTS field_selection_mode VARCHAR(20) DEFAULT 'single' CHECK (field_selection_mode IN ('single', 'multiple'));

-- Create view for fuel entries with all associated fields
CREATE OR REPLACE VIEW fuel_entries_with_fields AS
SELECT 
    fe.*,
    -- Single field info (backward compatibility)
    f_single.id as single_field_id,
    f_single.name as single_field_name,
    f_single.code as single_field_code,
    f_single.crop_type as single_field_crop_type,
    
    -- Zone info
    z.id as zone_id_info,
    z.name as zone_name,
    z.code as zone_code,
    z.zone_type,
    
    -- Location type and name for unified access
    CASE 
        WHEN fe.field_id IS NOT NULL THEN 'single_field'
        WHEN fe.zone_id IS NOT NULL THEN 'zone'
        WHEN EXISTS(SELECT 1 FROM fuel_entry_fields fef WHERE fef.fuel_entry_id = fe.id) THEN 'multiple_fields'
        ELSE 'unspecified'
    END as location_type,
    
    COALESCE(f_single.name, z.name, 'Multiple Fields') as location_display_name,
    
    -- Count of associated fields via junction table
    COALESCE(field_counts.field_count, 0) as associated_fields_count

FROM fuel_entries fe
LEFT JOIN fields f_single ON fe.field_id = f_single.id
LEFT JOIN zones z ON fe.zone_id = z.id
LEFT JOIN (
    SELECT 
        fuel_entry_id, 
        COUNT(*) as field_count
    FROM fuel_entry_fields 
    GROUP BY fuel_entry_id
) field_counts ON fe.id = field_counts.fuel_entry_id;

-- Function to get all fields for a fuel entry (both single and multiple)
CREATE OR REPLACE FUNCTION get_fuel_entry_fields(entry_id UUID)
RETURNS TABLE(
    field_id UUID,
    field_name VARCHAR,
    field_code VARCHAR,
    crop_type VARCHAR,
    area DECIMAL,
    location VARCHAR
) AS $$
BEGIN
    -- First check if there's a single field assigned
    RETURN QUERY
    SELECT 
        f.id,
        f.name,
        f.code,
        f.crop_type,
        f.area,
        f.location
    FROM fuel_entries fe
    JOIN fields f ON fe.field_id = f.id
    WHERE fe.id = entry_id AND fe.field_id IS NOT NULL
    
    UNION ALL
    
    -- Then get multiple fields from junction table
    SELECT 
        f.id,
        f.name,
        f.code,
        f.crop_type,
        f.area,
        f.location
    FROM fuel_entry_fields fef
    JOIN fields f ON fef.field_id = f.id
    WHERE fef.fuel_entry_id = entry_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON fuel_entry_fields TO authenticated;
GRANT ALL ON fuel_entries_with_fields TO authenticated;
GRANT EXECUTE ON FUNCTION get_fuel_entry_fields(UUID) TO authenticated;

-- Add RLS policies for fuel_entry_fields
ALTER TABLE fuel_entry_fields ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage fuel entry fields
CREATE POLICY "Fuel entry fields are manageable by authenticated users" ON fuel_entry_fields
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Comments for documentation
COMMENT ON TABLE fuel_entry_fields IS 'Junction table enabling multiple field associations per fuel entry';
COMMENT ON COLUMN fuel_entries.field_selection_mode IS 'Mode of field selection: single (legacy), multiple (new junction table approach)';
COMMENT ON VIEW fuel_entries_with_fields IS 'Unified view combining single field, zone, and multiple field associations';
COMMENT ON FUNCTION get_fuel_entry_fields(UUID) IS 'Returns all fields associated with a fuel entry (both single and multiple modes)';