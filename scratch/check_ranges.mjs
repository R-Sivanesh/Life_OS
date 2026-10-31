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

async function checkDateRanges() {
  console.log('--- DATE RANGES IN SUPABASE ---');

  // Tasks
  const { data: tasks } = await supabase.from('tasks').select('date, created_at').order('date', { ascending: false });
  const taskDates = tasks?.map(t => t.date?.slice(0, 7)).filter(Boolean);
  const taskMonths = {};
  taskDates?.forEach(m => taskMonths[m] = (taskMonths[m] || 0) + 1);
  console.log('Tasks by Month (YYYY-MM):', taskMonths);

  // Journal
  const { data: journal } = await supabase.from('journal_entries').select('date, created_at, content');
  const journalMonths = {};
  journal?.forEach(j => {
    const m = j.date?.slice(0, 7);
    journalMonths[m] = (journalMonths[m] || 0) + 1;
  });
  console.log('Journal by Month (YYYY-MM):', journalMonths);

  // Focus
  const { data: focus } = await supabase.from('focus_sessions').select('created_at');
  console.log('Focus sessions count:', focus?.length);

  // Reminders
  const { data: reminders } = await supabase.from('reminders').select('date, created_at');
  console.log('Reminders count:', reminders?.length);

  // Check distinct user_ids across all tables
  const tables = ['tasks', 'reminders', 'daily_routines', 'journal_entries', 'learning_topics', 'motivational_quotes'];
  for (const t of tables) {
    const { data } = await supabase.from(t).select('user_id');
    const uids = [...new Set(data?.map(r => r.user_id))];
    console.log(`Table ${t} distinct user_ids:`, uids);
  }
}

checkDateRanges().catch(console.error);
