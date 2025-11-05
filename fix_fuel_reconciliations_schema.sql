-- Check if fuel_reconciliations table exists and what columns it has
-- Run this first to see the current structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'fuel_reconciliations'
ORDER BY ordinal_position;

-- If the table exists but doesn't have end_date, add it:
-- (Uncomment and run if needed)
-- ALTER TABLE fuel_reconciliations ADD COLUMN IF NOT EXISTS end_date DATE;

-- If the table doesn't exist at all, create it:
-- (Uncomment and run if needed)
/*
CREATE TABLE IF NOT EXISTS fuel_reconciliations (
    id SERIAL PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    fuel_dispensed DECIMAL(10,2) NOT NULL,
    fuel_received DECIMAL(10,2) NOT NULL,
    bowser_start DECIMAL(10,2),
    bowser_end DECIMAL(10,2),
    discrepancy_count INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    reconciled_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
*/
