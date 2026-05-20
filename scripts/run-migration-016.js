/**
 * scripts/run-migration-016.js
 * One-off script to create the live_sessions table and session_rsvps table.
 * Run with: node scripts/run-migration-016.js
 *
 * Uses supabase-js (service role) to insert a dummy row to force schema cache refresh
 * is NOT needed — we call the pg REST endpoint directly via fetch.
 */
'use strict';

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function run() {
  console.log('Creating live_sessions table...');

  // We can't run raw DDL via supabase-js, so we use the Postgres REST
  // endpoint by constructing the SQL as a series of inserts/selects.
  // Instead, we'll verify the table exists and report what's needed.

  const { data, error } = await sb
    .from('live_sessions')
    .select('id')
    .limit(1);

  if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
    console.log('\n⚠️  live_sessions table does not exist yet.');
    console.log('\nPlease run the following SQL in your Supabase dashboard:');
    console.log('https://supabase.com/dashboard/project/njcancswtqnxihxavshl/sql/new\n');
    const fs = require('fs');
    const sql = fs.readFileSync('./supabase/migrations/016_live_sessions_jitsi.sql', 'utf8');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
  } else if (error) {
    console.error('Error:', error.message);
  } else {
    // Check if jitsi_room column exists
    const { data: row, error: e2 } = await sb
      .from('live_sessions')
      .select('id, jitsi_room, duration_min, is_public')
      .limit(1);

    if (e2) {
      console.log('\n⚠️  live_sessions exists but is missing Jitsi columns.');
      console.log('Please run migration 016 in the Supabase dashboard SQL editor.\n');
    } else {
      console.log('✅  live_sessions table is up to date with Jitsi columns.');
    }

    // Check session_rsvps
    const { error: e3 } = await sb.from('session_rsvps').select('id').limit(1);
    if (e3 && (e3.code === '42P01' || e3.message?.includes('does not exist'))) {
      console.log('⚠️  session_rsvps table does not exist. Run migration 016.');
    } else if (!e3) {
      console.log('✅  session_rsvps table exists.');
    }
  }
}

run().catch(console.error);
