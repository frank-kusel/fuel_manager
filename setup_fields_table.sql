-- Create fields table
CREATE TABLE IF NOT EXISTS fields (
    id SERIAL PRIMARY KEY,
    field_code VARCHAR(20) NOT NULL UNIQUE,
    field_name VARCHAR(100) NOT NULL,
    crop_type VARCHAR(50) NOT NULL,
    area_hectares DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert field data
INSERT INTO fields (field_code, field_name, crop_type, area_hectares) VALUES
-- Cane fields
('C100', 'Cane Field C100', 'Sugar Cane', 25.5),
('C101', 'Cane Field C101', 'Sugar Cane', 18.3),
('C102', 'Cane Field C102', 'Sugar Cane', 32.1),

-- Pine fields
('K100', 'Pine Field K100', 'Pine Timber', 45.2),
('K101', 'Pine Field K101', 'Pine Timber', 38.7),
('K102', 'Pine Field K102', 'Pine Timber', 51.4),

-- Avocado fields
('A001', 'Avocado Orchard A001', 'Avocados', 12.8),
('A002', 'Avocado Orchard A002', 'Avocados', 15.6),

-- General field
('KCT', 'General Field KCT', 'Mixed/General', 22.3),

-- Keep existing static fields from HTML for backward compatibility
('North Field A', 'North Field A', 'Crop Field', 28.5),
('South Field B', 'South Field B', 'Crop Field', 31.2),
('East Field C', 'East Field C', 'Crop Field', 19.8),
('West Field D', 'West Field D', 'Crop Field', 24.7),
('Main Depot', 'Main Depot', 'Infrastructure', 2.1),
('Workshop Bay', 'Workshop Bay', 'Infrastructure', 1.5),
('Storage Facility', 'Storage Facility', 'Infrastructure', 3.2)

ON CONFLICT (field_code) DO UPDATE SET
    field_name = EXCLUDED.field_name,
    crop_type = EXCLUDED.crop_type,
    area_hectares = EXCLUDED.area_hectares,
    updated_at = NOW();

-- Create RLS policies
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated and anonymous users
CREATE POLICY "Allow read access to fields" ON fields
    FOR SELECT USING (true);

-- Allow insert/update/delete for authenticated users only (admin functionality)
CREATE POLICY "Allow full access to fields for authenticated users" ON fields
    FOR ALL USING (auth.role() = 'authenticated');