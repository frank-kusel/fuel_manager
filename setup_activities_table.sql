-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    name_zulu VARCHAR(100),
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert all activities with Zulu translations
INSERT INTO activities (code, name, name_zulu, category, icon) VALUES
-- Field & Orchard Prep
('V-CLR', 'Clearing & Grubbing', 'Ukusula', 'Field & Orchard Prep', '🌲'),
('V-PLW', 'Ploughing', 'Ukulima', 'Field & Orchard Prep', '🚜'),
('V-DSC', 'Discing', 'Ukudiski', 'Field & Orchard Prep', '⚙️'),
('V-RIP', 'Ripping', 'Ukudabula', 'Field & Orchard Prep', '🔩'),
('V-RDG', 'Ridging / Bed-forming', 'Ukwenza imigelo', 'Field & Orchard Prep', '🏔️'),
('V-PLT', 'Planting (Mechanical)', 'Ukutshala', 'Field & Orchard Prep', '🌱'),

-- Inputs & Application
('V-FER', 'Fertiliser (Mechanical)', 'Umanyolo', 'Inputs & Application', '🧪'),
('V-PES', 'Pest Control (Spraying)', 'Ukulwa nezinambuzane', 'Inputs & Application', '🦟'),
('V-WED', 'Weed Control (Spraying)', 'Ukulwa nokhula', 'Inputs & Application', '🌿'),

-- Monitoring & Management
('V-SCT', 'Scouting & Monitoring (Driving)', 'Ukuhlola', 'Monitoring & Management', '🔍'),

-- Orchard Maintenance
('V-MOW', 'Mowing / Slashing', 'Ukugamula', 'Orchard Maintenance', '✂️'),
('V-MUL', 'Chipping & Spreading Mulch', 'Ukwendlala udaka', 'Orchard Maintenance', '🪵'),
('V-PRN', 'Pruning (Mechanical)', 'Ukuthena', 'Orchard Maintenance', '✂️'),
('V-THN', 'Thinning (Mechanical)', 'Ukunciphisa', 'Orchard Maintenance', '🌿'),

-- General Farm Maintenance
('V-ROD', 'Road Maintenance', 'Imigwaqo', 'General Farm Maintenance', '🛤️'),
('V-FIR', 'Firebreak Maintenance', 'Ukuvimbela umlilo', 'General Farm Maintenance', '🔥'),
('V-WWY', 'Waterway/Erosion Mgt.', 'Imisele yamanzi', 'General Farm Maintenance', '💧'),
('V-IRR', 'Irrigation Operation', 'Ukugeleza', 'General Farm Maintenance', '💦'),

-- Harvest & Handling
('V-HRV', 'Harvesting (Mechanical)', 'Ukuvuna', 'Harvest & Handling', '🌾'),
('V-LOD', 'Crop Loading & Stacking', 'Ukulayisha', 'Harvest & Handling', '📦'),

-- Transport
('V-TRN', 'On-Farm Haulage', 'Ukuhudula', 'Transport', '🚛'),
('V-TMK', 'Transport to Market', 'Emakethe', 'Transport', '🏪')

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    name_zulu = EXCLUDED.name_zulu,
    category = EXCLUDED.category,
    icon = EXCLUDED.icon,
    updated_at = NOW();

-- Create RLS policies
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated and anonymous users
CREATE POLICY "Allow read access to activities" ON activities
    FOR SELECT USING (true);

-- Allow insert/update/delete for authenticated users only (admin functionality)
CREATE POLICY "Allow full access to activities for authenticated users" ON activities
    FOR ALL USING (auth.role() = 'authenticated');