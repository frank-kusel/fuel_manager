-- Dashboard Improvements Migration
-- Run these commands in your Supabase SQL editor

-- 1. Create bowser_refills table for tracking fuel deliveries
CREATE TABLE IF NOT EXISTS bowser_refills (
    id SERIAL PRIMARY KEY,
    bowser_id INTEGER NOT NULL REFERENCES bowsers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    supplier VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reading_before DECIMAL(10,2) NOT NULL,
    reading_after DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create monthly_reconciliations table for tracking monthly fuel reconciliation
CREATE TABLE IF NOT EXISTS monthly_reconciliations (
    id SERIAL PRIMARY KEY,
    month VARCHAR(7) NOT NULL UNIQUE, -- Format: YYYY-MM
    fuel_dispensed DECIMAL(10,2) NOT NULL,
    fuel_received DECIMAL(10,2) NOT NULL,
    discrepancy_count INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    reconciled_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bowser_refills_date ON bowser_refills(date DESC);
CREATE INDEX IF NOT EXISTS idx_bowser_refills_bowser_id ON bowser_refills(bowser_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reconciliations_month ON monthly_reconciliations(month);

-- 4. Enable Row Level Security
ALTER TABLE bowser_refills ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reconciliations ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (choose appropriate option based on your setup)
-- Option A: Allow all operations (for development)
CREATE POLICY "Allow all operations on bowser_refills" ON bowser_refills FOR ALL USING (true);
CREATE POLICY "Allow all operations on monthly_reconciliations" ON monthly_reconciliations FOR ALL USING (true);

-- Option B: For production with authentication (uncomment if needed)
-- CREATE POLICY "Allow authenticated users" ON bowser_refills FOR ALL USING (auth.role() = 'authenticated');
-- CREATE POLICY "Allow authenticated users" ON monthly_reconciliations FOR ALL USING (auth.role() = 'authenticated');

-- 6. Create views for easier reporting
CREATE OR REPLACE VIEW monthly_fuel_summary AS
SELECT 
    date_trunc('month', fe.date) as month,
    count(*) as total_entries,
    sum(fe.fuel_amount) as total_fuel_dispensed,
    avg(fe.fuel_amount) as avg_fuel_per_entry,
    count(DISTINCT fe.vehicle_id) as unique_vehicles,
    count(CASE WHEN fe.has_discrepancy THEN 1 END) as discrepancy_count
FROM fuel_entries fe
GROUP BY date_trunc('month', fe.date)
ORDER BY month DESC;

CREATE OR REPLACE VIEW bowser_refill_summary AS
SELECT 
    date_trunc('month', br.date) as month,
    count(*) as total_refills,
    sum(br.amount) as total_fuel_received,
    sum(br.cost) as total_cost,
    avg(br.amount) as avg_refill_amount
FROM bowser_refills br
GROUP BY date_trunc('month', br.date)
ORDER BY month DESC;

-- Migration complete!
-- You can now use the improved dashboard with refill tracking and reconciliation features.