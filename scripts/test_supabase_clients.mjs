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

const anonClient = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);
const adminClient = createClient(envVars.VITE_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function testRLS() {
  console.log('--- TESTING SUPABASE CLIENTS (Anon vs Service Role) ---');
  
  // Test anon client reading public quotes
  const { data: quotesAnon, error: quotesErr } = await anonClient.from('motivational_quotes').select('*').limit(3);
  console.log('Anon Quotes query:', { count: quotesAnon?.length, error: quotesErr?.message });

  // Test admin client reading tasks
  const { data: tasksAdmin, error: tasksErr } = await adminClient.from('tasks').select('*').limit(3);
  console.log('Admin Tasks query:', { count: tasksAdmin?.length, error: tasksErr?.message });

  // Test admin client reading users
  const { data: users, error: uErr } = await adminClient.auth.admin.listUsers();
  console.log('Admin Auth Users:', { count: users?.users?.length, error: uErr?.message });
}

testRLS().catch(console.error);
