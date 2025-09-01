-- Phase 4: Tank Adjustment Logging Migration
-- Create tank_adjustment_logs table for tracking tank level adjustments

-- Create tank_adjustment_logs table
CREATE TABLE IF NOT EXISTS tank_adjustment_logs (
    id SERIAL PRIMARY KEY,
    adjustment_date DATE NOT NULL,
    adjustments_made TEXT NOT NULL,
    notes TEXT,
    previous_calculated_level DECIMAL(10,2) NOT NULL,
    new_calculated_level DECIMAL(10,2) NOT NULL,
    previous_measured_level DECIMAL(10,2) NOT NULL,
    new_measured_level DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tank_adjustment_logs_date ON tank_adjustment_logs(adjustment_date DESC);
CREATE INDEX IF NOT EXISTS idx_tank_adjustment_logs_created ON tank_adjustment_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE tank_adjustment_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (choose appropriate option based on your setup)
-- Option A: Allow all operations (for development)
CREATE POLICY "Allow all operations on tank_adjustment_logs" ON tank_adjustment_logs FOR ALL USING (true);

-- Option B: For production with authentication (uncomment if needed)
-- CREATE POLICY "Allow authenticated users" ON tank_adjustment_logs FOR ALL USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT ALL ON tank_adjustment_logs TO postgres;
GRANT ALL ON SEQUENCE tank_adjustment_logs_id_seq TO postgres;

-- Migration complete!
-- The tank_adjustment_logs table now tracks all tank level adjustments for audit purposes.