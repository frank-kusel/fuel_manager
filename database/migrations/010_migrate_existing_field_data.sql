-- Migration: Migrate Existing Single Field Data to Junction Table
-- Purpose: Populate fuel_entry_fields junction table with existing field associations
-- Author: FarmTrack Development
-- Date: 2025-09-02

-- Insert existing single field associations into junction table
INSERT INTO fuel_entry_fields (fuel_entry_id, field_id)
SELECT 
    id as fuel_entry_id,
    field_id
FROM fuel_entries 
WHERE field_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 
      FROM fuel_entry_fields fef 
      WHERE fef.fuel_entry_id = fuel_entries.id 
        AND fef.field_id = fuel_entries.field_id
  );

-- Update field_selection_mode for existing entries
UPDATE fuel_entries 
SET field_selection_mode = 'single'
WHERE field_selection_mode IS NULL OR field_selection_mode = 'single';

-- Update entries with junction table associations to use 'multiple' mode
UPDATE fuel_entries 
SET field_selection_mode = 'multiple',
    field_id = NULL  -- Clear the legacy field_id since we're using junction table
WHERE id IN (
    SELECT DISTINCT fuel_entry_id 
    FROM fuel_entry_fields
);

-- Create a function to maintain consistency between legacy and junction approaches
CREATE OR REPLACE FUNCTION maintain_field_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- If inserting/updating with single field mode, ensure junction table is consistent
    IF NEW.field_selection_mode = 'single' AND NEW.field_id IS NOT NULL THEN
        -- Delete any existing junction entries for this fuel entry
        DELETE FROM fuel_entry_fields WHERE fuel_entry_id = NEW.id;
        
        -- Insert single field into junction table
        INSERT INTO fuel_entry_fields (fuel_entry_id, field_id)
        VALUES (NEW.id, NEW.field_id)
        ON CONFLICT (fuel_entry_id, field_id) DO NOTHING;
        
    ELSIF NEW.field_selection_mode = 'multiple' THEN
        -- Clear the legacy field_id when using multiple mode
        NEW.field_id = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain consistency
DROP TRIGGER IF EXISTS fuel_entries_field_consistency ON fuel_entries;
CREATE TRIGGER fuel_entries_field_consistency
    BEFORE INSERT OR UPDATE ON fuel_entries
    FOR EACH ROW
    EXECUTE FUNCTION maintain_field_consistency();

-- Create a view that shows all fuel entries with their associated fields (unified approach)
CREATE OR REPLACE VIEW fuel_entries_complete AS
SELECT 
    fe.*,
    
    -- Single field info (legacy)
    f_single.name as single_field_name,
    f_single.code as single_field_code,
    f_single.crop_type as single_field_crop_type,
    
    -- Zone info
    z.name as zone_name,
    z.code as zone_code,
    
    -- Multi-field info (from junction table)
    COALESCE(multi_field_info.field_names, ARRAY[]::text[]) as multi_field_names,
    COALESCE(multi_field_info.field_codes, ARRAY[]::text[]) as multi_field_codes,
    COALESCE(multi_field_info.field_count, 0) as multi_field_count,
    
    -- Unified location display
    CASE 
        WHEN fe.field_selection_mode = 'multiple' AND multi_field_info.field_count > 0 THEN 
            multi_field_info.field_count || ' Fields: ' || array_to_string(multi_field_info.field_names, ', ')
        WHEN fe.field_selection_mode = 'single' AND f_single.name IS NOT NULL THEN 
            'Field: ' || f_single.name
        WHEN fe.zone_id IS NOT NULL THEN 
            'Zone: ' || z.name
        ELSE 'No Location'
    END as location_display,
    
    -- Location type for filtering/grouping
    CASE 
        WHEN fe.field_selection_mode = 'multiple' AND multi_field_info.field_count > 0 THEN 'multiple_fields'
        WHEN fe.field_selection_mode = 'single' AND fe.field_id IS NOT NULL THEN 'single_field'
        WHEN fe.zone_id IS NOT NULL THEN 'zone'
        ELSE 'unspecified'
    END as location_type

FROM fuel_entries fe
LEFT JOIN fields f_single ON fe.field_id = f_single.id
LEFT JOIN zones z ON fe.zone_id = z.id
LEFT JOIN (
    SELECT 
        fef.fuel_entry_id,
        array_agg(f.name ORDER BY f.name) as field_names,
        array_agg(f.code ORDER BY f.code) as field_codes,
        COUNT(*) as field_count
    FROM fuel_entry_fields fef
    JOIN fields f ON fef.field_id = f.id
    GROUP BY fef.fuel_entry_id
) multi_field_info ON fe.id = multi_field_info.fuel_entry_id;

-- Create indexes for performance on the new view
CREATE INDEX IF NOT EXISTS idx_fuel_entries_field_selection_mode ON fuel_entries(field_selection_mode);
CREATE INDEX IF NOT EXISTS idx_fuel_entries_location_type ON fuel_entries(
    CASE 
        WHEN field_selection_mode = 'multiple' THEN 'multiple_fields'
        WHEN field_selection_mode = 'single' AND field_id IS NOT NULL THEN 'single_field'
        WHEN zone_id IS NOT NULL THEN 'zone'
        ELSE 'unspecified'
    END
);

-- Grant permissions
GRANT ALL ON fuel_entries_complete TO authenticated;
GRANT EXECUTE ON FUNCTION maintain_field_consistency() TO authenticated;

-- Add helpful comments
COMMENT ON VIEW fuel_entries_complete IS 'Unified view of fuel entries with both legacy single field and new multi-field associations';
COMMENT ON FUNCTION maintain_field_consistency() IS 'Maintains consistency between legacy field_id column and fuel_entry_fields junction table';
COMMENT ON TRIGGER fuel_entries_field_consistency ON fuel_entries IS 'Automatically syncs field associations between legacy and junction table approaches';

-- Data validation query (run manually to verify migration)
-- SELECT 
--     field_selection_mode,
--     COUNT(*) as entry_count,
--     COUNT(field_id) as legacy_field_count,
--     SUM(CASE WHEN EXISTS(SELECT 1 FROM fuel_entry_fields fef WHERE fef.fuel_entry_id = fuel_entries.id) THEN 1 ELSE 0 END) as junction_field_count
-- FROM fuel_entries 
-- GROUP BY field_selection_mode;