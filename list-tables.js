const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://szskplrwmeuahwvicyos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6c2twbHJ3bWV1YWh3dmljeW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzcwOTMxMSwiZXhwIjoyMDY5Mjg1MzExfQ.HIpUnovx2W9ZSqsfwBR0iGJJtCm3w6TU5oTMnphENdU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  try {
    // Query the information schema to get all tables
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) {
      // Try alternative approach - query system tables
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_tables', {});
      
      if (tablesError) {
        // Try to list by querying a known common table
        console.log('Attempting to discover tables...');
        
        // Common table names to try
        const commonTables = ['users', 'profiles', 'posts', 'items', 'products', 'orders'];
        const foundTables = [];
        
        for (const tableName of commonTables) {
          try {
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (!error) {
              foundTables.push(tableName);
              console.log(`Found table: ${tableName}`);
            }
          } catch (e) {
            // Table doesn't exist, continue
          }
        }
        
        if (foundTables.length === 0) {
          console.log('No common tables found. Tables might have custom names.');
        }
      } else {
        console.log('Tables in database:', tables);
      }
    } else {
      console.log('Tables in database:', data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

listTables();