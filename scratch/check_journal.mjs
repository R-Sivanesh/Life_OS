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

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: entries, error } = await supabase
    .from('journal_entries')
    .select('*')
    .order('date', { ascending: false });

  console.log('--- ALL 12 ENTRIES ---');
  entries?.forEach((e, i) => {
    console.log(`${i}: id=${e.id} date=${JSON.stringify(e.date)} (type:${typeof e.date}) content=${JSON.stringify(e.content?.slice(0, 30))}`);
  });
}

check().catch(console.error);
