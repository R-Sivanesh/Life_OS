import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const clean = line.replace(/\r/g, '').trim();
  const idx = clean.indexOf('=');
  if (idx > 0 && !clean.startsWith('#')) {
    const k = clean.slice(0, idx).trim();
    let v = clean.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
});

const adminClient = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anonClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log('Testing anon select on journal_entries:');
  const { data: anonData, error: anonError } = await anonClient.from('journal_entries').select('*');
  console.log('Anon count:', anonData?.length, 'Anon error:', anonError);

  console.log('\nChecking all tables in Supabase:');
  const tables = ['tasks', 'reminders', 'daily_routines', 'journal_entries', 'learning_topics', 'goals', 'habits', 'focus_sessions', 'motivational_quotes'];
  for (const t of tables) {
    const { data, count, error } = await adminClient.from(t).select('*', { count: 'exact' });
    console.log(`Table "${t}": ${data?.length} rows, error:`, error?.message || 'none');
  }
}

test().catch(console.error);
