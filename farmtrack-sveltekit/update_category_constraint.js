// Generate SQL to update the activities category constraint
import { createClient } from '@supabase/supabase-js';

console.log('SQL to run in Supabase SQL Editor:');
console.log('=====================================');

const sqlCommand = `
-- Drop the existing check constraint
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_category_check;

-- Add new check constraint with expanded categories
ALTER TABLE activities ADD CONSTRAINT activities_category_check 
CHECK (category IN (
    'planting',
    'harvesting', 
    'spraying',
    'fertilizing',
    'maintenance',
    'other',
    'field_prep',
    'orchard_maintenance',
    'transport',
    'monitoring'
));

-- Add comment explaining the categories
COMMENT ON COLUMN activities.category IS 'Activity category: field_prep, planting, spraying, fertilizing, harvesting, maintenance, orchard_maintenance, transport, monitoring, other';
`;

console.log(sqlCommand);
console.log('\n⚠️ Please run the above SQL in the Supabase SQL editor, then I will run the activities update.');
console.log('\nThis will allow these categories:');
console.log('• field_prep - Field preparation activities (clearing, ploughing, discing, etc.)');
console.log('• planting - Planting operations');
console.log('• spraying - Pesticide, herbicide, and fertilizer spraying');
console.log('• fertilizing - Fertilizer application');
console.log('• harvesting - Harvesting and crop handling');
console.log('• maintenance - General farm maintenance');
console.log('• orchard_maintenance - Orchard-specific maintenance');
console.log('• transport - Transport and haulage');
console.log('• monitoring - Monitoring and scouting');
console.log('• other - Miscellaneous activities');

export default sqlCommand;