import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function diagnose() {
  console.log('=== 1. SUPABASE AUTH USERS ===');
  const { data: { users }, error: uErr } = await supabaseAdmin.auth.admin.listUsers();
  if (uErr) console.error('Auth users err:', uErr);
  console.log('Users in Supabase Auth:', users?.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })));

  console.log('\n=== 2. ROW COUNTS & USER_ID BREAKDOWN VIA SERVICE ROLE (ADMIN) ===');
  const tables = [
    'profiles',
    'tasks',
    'daily_routines',
    'reminders',
    'journal_entries',
    'learning_topics',
    'motivational_quotes',
    'focus_sessions',
    'fitness_exercises',
    'fitness_sets',
    'fitness_logs'
  ];

  for (const t of tables) {
    const { data, error, count } = await supabaseAdmin.from(t).select('*', { count: 'exact' });
    if (error) {
      console.log(`Table ${t}: ERROR - ${error.message}`);
    } else {
      const userIds = [...new Set(data?.map(r => r.user_id))];
      console.log(`Table ${t}: ${count ?? data?.length} rows | Distinct user_ids: ${JSON.stringify(userIds)}`);
    }
  }

  console.log('\n=== 3. TEST QUERY VIA ANON CLIENT (UNAUTHENTICATED) ===');
  for (const t of tables) {
    const { data, error, count } = await supabaseAnon.from(t).select('*', { count: 'exact' });
    if (error) {
      console.log(`Anon Query ${t}: ERROR - ${error.message}`);
    } else {
      console.log(`Anon Query ${t}: returned ${data?.length} rows`);
    }
  }

  // Also test signing in as the user or checking with user's JWT if available
  if (users && users.length > 0) {
    const targetUser = users[0];
    console.log(`\n=== 4. SAMPLE TASK RECORDS FOR USER ${targetUser.id} ===`);
    const { data: sampleTasks } = await supabaseAdmin.from('tasks').select('id, title, date, completed, user_id, created_at').limit(5);
    console.log('Sample Tasks:', sampleTasks);
  }
}

diagnose();
