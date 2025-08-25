-- Add last_updated timestamp to bowsers table for offline sync tracking
ALTER TABLE bowsers ADD COLUMN IF NOT EXISTS last_updated timestamptz DEFAULT now();

-- Create index for better sync performance
CREATE INDEX IF NOT EXISTS idx_bowsers_last_updated ON bowsers(last_updated);

-- Update existing records to have current timestamp
UPDATE bowsers SET last_updated = updated_at WHERE last_updated IS NULL;

-- Create bowser_reading_history table for audit trail
CREATE TABLE IF NOT EXISTS bowser_reading_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bowser_id uuid NOT NULL REFERENCES bowsers(id),
    fuel_entry_id uuid REFERENCES fuel_entries(id),
    previous_reading numeric(10,2),
    new_reading numeric(10,2) NOT NULL,
    reading_difference numeric(10,2) GENERATED ALWAYS AS (previous_reading - new_reading) STORED,
    created_at timestamptz DEFAULT now(),
    created_by uuid,
    sync_status text DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
    device_id text,
    offline_created_at timestamptz
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bowser_reading_history_bowser_id ON bowser_reading_history(bowser_id);
CREATE INDEX IF NOT EXISTS idx_bowser_reading_history_created_at ON bowser_reading_history(created_at);
CREATE INDEX IF NOT EXISTS idx_bowser_reading_history_sync_status ON bowser_reading_history(sync_status);
CREATE INDEX IF NOT EXISTS idx_bowser_reading_history_device_id ON bowser_reading_history(device_id);

-- RLS policies (simplified - no auth dependencies for now)
ALTER TABLE bowser_reading_history ENABLE ROW LEVEL SECURITY;

-- Policy for reading (allow all for now - adjust based on your auth setup)
CREATE POLICY "Allow read access to bowser reading history" ON bowser_reading_history
    FOR SELECT USING (true);

-- Policy for inserting (allow all for now - adjust based on your auth setup)
CREATE POLICY "Allow insert to bowser reading history" ON bowser_reading_history
    FOR INSERT WITH CHECK (true);

-- Policy for updating (allow all for now - adjust based on your auth setup)
CREATE POLICY "Allow update to bowser reading history" ON bowser_reading_history
    FOR UPDATE USING (true);