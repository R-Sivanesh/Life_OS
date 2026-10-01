import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function inspectSupabase() {
  console.log('--- SUPABASE DETAILED INVENTORY ---');
  const { data: usersData } = await supabase.auth.admin.listUsers();
  console.log('Auth Users:', usersData?.users?.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })));

  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('\nProfiles:', profiles);

  const { data: latestTasks } = await supabase.from('tasks').select('id, title, date, completed, created_at').order('created_at', { ascending: false }).limit(5);
  console.log('\nLatest 5 Tasks:', latestTasks);

  const { data: latestJournal } = await supabase.from('journal_entries').select('id, title, date, created_at').order('created_at', { ascending: false }).limit(3);
  console.log('\nLatest Journal Entries:', latestJournal);
}

inspectSupabase().catch(console.error);
