import { neon } from '@neondatabase/serverless';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load .env manually
const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      let key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1).trim();
      }
      envVars[key] = val;
    }
  }
});

console.log('--- AUDIT: CHECKING ENVIRONMENT CONFIGURATION ---');
console.log('Neon DATABASE_URL present:', !!envVars.DATABASE_URL);
console.log('Neon DATABASE_URL_UNPOOLED present:', !!envVars.DATABASE_URL_UNPOOLED);
console.log('Supabase URL:', envVars.VITE_SUPABASE_URL || 'NONE');
console.log('Supabase Anon Key present:', !!envVars.VITE_SUPABASE_ANON_KEY);
console.log('Supabase Service Role Key present:', !!envVars.SUPABASE_SERVICE_ROLE_KEY);

async function checkNeon() {
  console.log('\n--- AUDIT: TESTING NEON CONNECTION ---');
  if (!envVars.DATABASE_URL) {
    console.log('No Neon DATABASE_URL');
    return;
  }
  try {
    const sql = neon(envVars.DATABASE_URL);
    const tables = await sql.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Neon Tables found:', tables.map(t => t.table_name));

    for (const t of tables) {
      try {
        const count = await sql.query(`SELECT count(*) FROM public."${t.table_name}"`);
        console.log(` - Table "${t.table_name}": ${count[0]?.count ?? '?'} rows`);
      } catch (err) {
        console.log(` - Table "${t.table_name}": count error (${err.message})`);
      }
    }
  } catch (err) {
    console.error('Neon Connection/Query Error:', err.message, err.status || '');
  }
}

async function checkSupabase() {
  console.log('\n--- AUDIT: TESTING SUPABASE CONNECTION ---');
  if (!envVars.VITE_SUPABASE_URL || !envVars.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Missing Supabase credentials');
    return;
  }
  try {
    const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
    if (usersErr) {
      console.log('Supabase Auth Users query error:', usersErr.message);
    } else {
      console.log(`Supabase Auth Users count: ${usersData?.users?.length || 0}`);
    }

    const testTables = ['users', 'profiles', 'tasks', 'reminders', 'daily_routines', 'focus_sessions', 'journal_entries', 'learning_topics', 'motivational_quotes', 'goals', 'habits', 'fitness_exercises', 'fitness_sets', 'fitness_logs'];
    for (const tbl of testTables) {
      const { count, error } = await supabase.from(tbl).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`Supabase table "${tbl}": Error (${error.message})`);
      } else {
        console.log(`Supabase table "${tbl}": ${count ?? 0} rows`);
      }
    }
  } catch (err) {
    console.error('Supabase Connection Error:', err.message);
  }
}

async function run() {
  await checkNeon();
  await checkSupabase();
}

run();
