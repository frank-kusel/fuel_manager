const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://szskplrwmeuahwvicyos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6c2twbHJ3bWV1YWh3dmljeW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzcwOTMxMSwiZXhwIjoyMDY5Mjg1MzExfQ.HIpUnovx2W9ZSqsfwBR0iGJJtCm3w6TU5oTMnphENdU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function discoverTables() {
  try {
    console.log('Attempting to discover tables in your Supabase database...\n');
    
    // Try different table names that might exist based on common patterns
    const possibleTables = [
      // Fuel management related
      'fuel_records', 'fuel_entries', 'fuel_logs', 'fuel_transactions',
      'vehicles', 'cars', 'fleet', 
      'drivers', 'users', 'accounts',
      'fuel_types', 'fuel_stations', 'stations',
      'expenses', 'costs', 'payments',
      'reports', 'analytics', 'statistics',
      
      // Generic common tables
      'profiles', 'settings', 'configs',
      'logs', 'events', 'activities',
      'categories', 'tags', 'types'
    ];
    
    const foundTables = [];
    
    for (const tableName of possibleTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          foundTables.push({ name: tableName, rowCount: count });
          console.log(`✓ Found table: ${tableName} (${count} rows)`);
        }
      } catch (e) {
        // Table doesn't exist, continue silently
      }
    }
    
    if (foundTables.length === 0) {
      console.log('No tables discovered. Your tables might have custom names.');
      console.log('\nTrying to get table list via SQL query...');
      
      // Try RPC call to get tables
      const { data, error } = await supabase.rpc('get_all_tables');
      if (!error && data) {
        console.log('Tables found via RPC:', data);
      } else {
        console.log('Unable to retrieve table list via RPC.');
      }
    } else {
      console.log(`\n✅ Successfully discovered ${foundTables.length} table(s)`);
      console.log('\nTable Summary:');
      foundTables.forEach(table => {
        console.log(`  - ${table.name}: ${table.rowCount} rows`);
      });
    }
    
  } catch (error) {
    console.error('Error during discovery:', error);
  }
}

discoverTables();