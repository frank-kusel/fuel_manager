-- Phase 2: Enhanced Date System Migration
-- Rename monthly_reconciliations to fuel_reconciliations and update schema for flexible date ranges

-- Step 1: Create new fuel_reconciliations table with enhanced schema
CREATE TABLE IF NOT EXISTS fuel_reconciliations (
    id SERIAL PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL, 
    fuel_dispensed DECIMAL(10,2) NOT NULL,
    fuel_received DECIMAL(10,2) NOT NULL,
    discrepancy_count INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    reconciled_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Migrate existing data from monthly_reconciliations if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'monthly_reconciliations') THEN
        -- Copy data from monthly_reconciliations to fuel_reconciliations
        INSERT INTO fuel_reconciliations (
            start_date, 
            end_date, 
            fuel_dispensed, 
            fuel_received, 
            discrepancy_count, 
            total_cost, 
            status, 
            reconciled_date, 
            notes, 
            created_at
        )
        SELECT 
            (month || '-01')::DATE as start_date,
            (DATE_TRUNC('month', (month || '-01')::DATE) + INTERVAL '1 month - 1 day')::DATE as end_date,
            fuel_dispensed,
            fuel_received,
            discrepancy_count,
            total_cost,
            status,
            reconciled_date,
            notes,
            created_at
        FROM monthly_reconciliations;
        
        -- Drop the old table after successful migration
        DROP TABLE monthly_reconciliations;
    END IF;
END $$;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fuel_reconciliations_date_range ON fuel_reconciliations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fuel_reconciliations_status ON fuel_reconciliations(status);
CREATE INDEX IF NOT EXISTS idx_fuel_reconciliations_reconciled_date ON fuel_reconciliations(reconciled_date);

-- Step 4: Enable Row Level Security
ALTER TABLE fuel_reconciliations ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies (choose appropriate option based on your setup)
-- Option A: Allow all operations (for development)
CREATE POLICY "Allow all operations on fuel_reconciliations" ON fuel_reconciliations FOR ALL USING (true);

-- Option B: For production with authentication (uncomment if needed)
-- CREATE POLICY "Allow authenticated users" ON fuel_reconciliations FOR ALL USING (auth.role() = 'authenticated');

-- Step 6: Grant necessary permissions
GRANT ALL ON fuel_reconciliations TO postgres;
GRANT ALL ON SEQUENCE fuel_reconciliations_id_seq TO postgres;

-- Migration complete!
-- The fuel_reconciliations table now supports flexible date ranges instead of just monthly periods.