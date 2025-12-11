// Loads environment variables early so the bot can read credentials across modules.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_PATIENTS_TABLE = 'patients',
  SUPABASE_FILES_TABLE = 'patient_files',
  SUPABASE_STORAGE_BUCKET = 'patient-files',
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase credentials are missing. Please check your environment variables.');
}

// Single Supabase client configured with the service role for secure server-side access.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

module.exports = {
  supabase,
  tableName: SUPABASE_PATIENTS_TABLE,
  filesTableName: SUPABASE_FILES_TABLE,
  storageBucket: SUPABASE_STORAGE_BUCKET,
};
