-- Tank Management System Tables
-- For tracking both calculated and measured tank levels

-- 1. Tank refills from suppliers
CREATE TABLE IF NOT EXISTS tank_refills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id text DEFAULT 'tank_a', -- For future multi-tank support
    litres_added numeric(10,2) NOT NULL,
    supplier text,
    delivery_date date NOT NULL,
    invoice_number text,
    cost_per_litre numeric(10,4),
    total_cost numeric(10,2),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Tank dipstick readings (measured levels)
CREATE TABLE IF NOT EXISTS tank_readings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id text DEFAULT 'tank_a',
    reading_value numeric(10,2) NOT NULL,
    reading_date date NOT NULL,
    reading_time time DEFAULT CURRENT_TIME,
    reading_type text CHECK (reading_type IN ('dipstick', 'reconciled', 'adjusted')) DEFAULT 'dipstick',
    notes text,
    created_by text, -- Can track who took the reading
    created_at timestamptz DEFAULT now()
);

-- 3. Tank reconciliations (monthly process)
CREATE TABLE IF NOT EXISTS tank_reconciliations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id text DEFAULT 'tank_a',
    reconciliation_date date NOT NULL,
    calculated_level numeric(10,2) NOT NULL,
    measured_level numeric(10,2) NOT NULL,
    variance numeric(10,2) GENERATED ALWAYS AS (calculated_level - measured_level) STORED,
    variance_percentage numeric(5,2) GENERATED ALWAYS AS 
        (CASE WHEN measured_level > 0 THEN ((calculated_level - measured_level) / measured_level * 100) ELSE 0 END) STORED,
    accepted boolean DEFAULT false,
    adjustment_made numeric(10,2),
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 4. Tank configuration (stores current calculated level baseline)
CREATE TABLE IF NOT EXISTS tank_config (
    tank_id text PRIMARY KEY DEFAULT 'tank_a',
    tank_name text DEFAULT 'Tank A',
    capacity numeric(10,2) DEFAULT 5000, -- Tank capacity in litres
    current_calculated_level numeric(10,2) DEFAULT 0, -- Live calculated level
    baseline_level numeric(10,2) DEFAULT 0, -- Last reconciled baseline
    baseline_date date DEFAULT CURRENT_DATE, -- Date of last reconciliation
    last_dipstick_level numeric(10,2), -- Latest measured level
    last_dipstick_date date,
    min_level_warning numeric(10,2) DEFAULT 500, -- Warning threshold
    updated_at timestamptz DEFAULT now()
);

-- Insert initial tank configuration
INSERT INTO tank_config (tank_id, tank_name, capacity) 
VALUES ('tank_a', 'Tank A', 5000)
ON CONFLICT (tank_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tank_refills_date ON tank_refills(delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_tank_readings_date ON tank_readings(reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_tank_reconciliations_date ON tank_reconciliations(reconciliation_date DESC);

-- Create a view for easy access to latest tank status
CREATE OR REPLACE VIEW tank_status AS
SELECT 
    tc.tank_id,
    tc.tank_name,
    tc.capacity,
    tc.current_calculated_level,
    tc.last_dipstick_level,
    tc.last_dipstick_date,
    tc.current_calculated_level - COALESCE(tc.last_dipstick_level, tc.current_calculated_level) as variance,
    CASE 
        WHEN tc.last_dipstick_level IS NOT NULL AND tc.last_dipstick_level > 0 
        THEN ((tc.current_calculated_level - tc.last_dipstick_level) / tc.last_dipstick_level * 100)
        ELSE 0 
    END as variance_percentage,
    (tc.current_calculated_level / tc.capacity * 100) as tank_percentage
FROM tank_config tc;

-- Function to update calculated tank level after fuel entry
CREATE OR REPLACE FUNCTION update_calculated_tank_level()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new fuel entry is created, decrease the calculated tank level
    IF TG_OP = 'INSERT' THEN
        UPDATE tank_config 
        SET 
            current_calculated_level = current_calculated_level - NEW.litres_dispensed,
            updated_at = now()
        WHERE tank_id = 'tank_a';
    END IF;
    
    -- When a fuel entry is deleted, increase the calculated tank level
    IF TG_OP = 'DELETE' THEN
        UPDATE tank_config 
        SET 
            current_calculated_level = current_calculated_level + OLD.litres_dispensed,
            updated_at = now()
        WHERE tank_id = 'tank_a';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update calculated level on fuel entries
CREATE TRIGGER fuel_entry_tank_update
AFTER INSERT OR DELETE ON fuel_entries
FOR EACH ROW
EXECUTE FUNCTION update_calculated_tank_level();

-- Function to update calculated tank level after refill
CREATE OR REPLACE FUNCTION update_tank_after_refill()
RETURNS TRIGGER AS $$
BEGIN
    -- When a refill is added, increase the calculated tank level
    IF TG_OP = 'INSERT' THEN
        UPDATE tank_config 
        SET 
            current_calculated_level = current_calculated_level + NEW.litres_added,
            updated_at = now()
        WHERE tank_id = NEW.tank_id;
    END IF;
    
    -- When a refill is deleted, decrease the calculated tank level
    IF TG_OP = 'DELETE' THEN
        UPDATE tank_config 
        SET 
            current_calculated_level = current_calculated_level - OLD.litres_added,
            updated_at = now()
        WHERE tank_id = OLD.tank_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update calculated level on refills
CREATE TRIGGER tank_refill_update
AFTER INSERT OR DELETE ON tank_refills
FOR EACH ROW
EXECUTE FUNCTION update_tank_after_refill();

-- Function to recalculate tank level from a baseline
CREATE OR REPLACE FUNCTION recalculate_tank_level(
    p_tank_id text DEFAULT 'tank_a',
    p_from_date date DEFAULT NULL
)
RETURNS numeric AS $$
DECLARE
    v_baseline_level numeric;
    v_total_dispensed numeric;
    v_total_refilled numeric;
    v_calculated_level numeric;
BEGIN
    -- Get baseline level (from last reconciliation or initial setup)
    SELECT baseline_level INTO v_baseline_level
    FROM tank_config
    WHERE tank_id = p_tank_id;
    
    -- Calculate total fuel dispensed since baseline
    SELECT COALESCE(SUM(litres_dispensed), 0) INTO v_total_dispensed
    FROM fuel_entries
    WHERE entry_date >= COALESCE(p_from_date, (SELECT baseline_date FROM tank_config WHERE tank_id = p_tank_id));
    
    -- Calculate total refills since baseline  
    SELECT COALESCE(SUM(litres_added), 0) INTO v_total_refilled
    FROM tank_refills
    WHERE tank_id = p_tank_id 
    AND delivery_date >= COALESCE(p_from_date, (SELECT baseline_date FROM tank_config WHERE tank_id = p_tank_id));
    
    -- Calculate current level
    v_calculated_level := v_baseline_level - v_total_dispensed + v_total_refilled;
    
    -- Update the current calculated level
    UPDATE tank_config
    SET current_calculated_level = v_calculated_level,
        updated_at = now()
    WHERE tank_id = p_tank_id;
    
    RETURN v_calculated_level;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (adjust as needed)
ALTER TABLE tank_refills ENABLE ROW LEVEL SECURITY;
ALTER TABLE tank_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tank_config ENABLE ROW LEVEL SECURITY;

-- Basic policies (allow all for now - adjust for production)
CREATE POLICY "Allow all access to tank tables" ON tank_refills FOR ALL USING (true);
CREATE POLICY "Allow all access to tank readings" ON tank_readings FOR ALL USING (true);
CREATE POLICY "Allow all access to tank reconciliations" ON tank_reconciliations FOR ALL USING (true);
CREATE POLICY "Allow all access to tank config" ON tank_config FOR ALL USING (true);