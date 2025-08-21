// Migration runner for Supabase
// This script will execute the hybrid migration SQL

import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://szskplrwmeuahwvicyos.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6c2twbHJ3bWV1YWh3dmljeW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzcwOTMxMSwiZXhwIjoyMDY5Mjg1MzExfQ.HIpUnovx2W9ZSqsfwBR0iGJJtCm3w6TU5oTMnphENdU';

async function runMigration() {
    try {
        console.log('🚀 Starting hybrid migration...');
        
        // Read the migration SQL file
        const migrationSQL = readFileSync(join(process.cwd(), 'database', 'migrations', '003_hybrid_migration.sql'), 'utf8');
        
        console.log('📄 Migration SQL loaded, executing...');
        
        // Execute the migration using Supabase's SQL endpoint
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({
                query: migrationSQL
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Migration failed: ${error}`);
        }

        const result = await response.json();
        console.log('✅ Migration completed successfully!');
        console.log('Result:', result);
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();