import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { neon } from '@neondatabase/serverless';

// 1. Load environment variables
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

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const neonDbUrl = envVars.DATABASE_URL || envVars.DATABASE_URL_UNPOOLED;

if (!supabaseUrl || !supabaseServiceKey || !neonDbUrl) {
  console.error('Missing required connection configuration in .env!');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const sql = neon(neonDbUrl);

async function runMigration() {
  console.log('====================================================');
  console.log('STARTING SUPABASE -> NEON DATA MIGRATION');
  console.log('====================================================\n');

  const stats = {
    users: { old: 0, matched: 0, created: 0 },
    profiles: { old: 0, migrated: 0 },
    daily_routines: { old: 0, migrated: 0 },
    tasks: { old: 0, migrated: 0 },
    reminders: { old: 0, migrated: 0 },
    focus_sessions: { old: 0, migrated: 0 },
    journal_entries: { old: 0, migrated: 0 },
    learning_topics: { old: 0, migrated: 0 },
    motivational_quotes: { old: 0, migrated: 0 },
    goals: { old: 0, migrated: 0 },
    habits: { old: 0, migrated: 0 }
  };

  // --- STEP 1: USER MAPPING ---
  console.log('[STEP 1] Fetching users and building ID mappings...');
  const { data: sbUsersData } = await supabaseAdmin.auth.admin.listUsers();
  const sbUsers = sbUsersData?.users || [];
  stats.users.old = sbUsers.length;

  const neonUsers = await sql`SELECT id, email, name, avatar_url FROM public.users`;
  const userMap = new Map(); // old_user_id -> new_neon_user_id

  for (const sbUser of sbUsers) {
    const sbEmail = (sbUser.email || '').toLowerCase().trim();
    if (!sbEmail) continue;

    let matchedNeonUser = neonUsers.find(nu => (nu.email || '').toLowerCase().trim() === sbEmail);

    if (!matchedNeonUser) {
      console.log(` - Creating missing user in Neon for email: ${sbEmail}`);
      const name = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbEmail.split('@')[0];
      const avatar = sbUser.user_metadata?.avatar_url || '';
      const created = await sql`
        INSERT INTO public.users (email, name, avatar_url)
        VALUES (${sbEmail}, ${name}, ${avatar})
        ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
        RETURNING id, email, name, avatar_url
      `;
      matchedNeonUser = created[0];
      stats.users.created++;
    } else {
      stats.users.matched++;
    }

    userMap.set(sbUser.id, matchedNeonUser.id);
    console.log(` - Mapped User: ${sbEmail} | Supabase UUID: ${sbUser.id} -> Neon UUID: ${matchedNeonUser.id}`);
  }

  // --- STEP 2: MIGRATE PROFILES ---
  console.log('\n[STEP 2] Migrating Profiles...');
  const { data: sbProfiles } = await supabaseAdmin.from('profiles').select('*');
  stats.profiles.old = sbProfiles?.length || 0;

  for (const p of sbProfiles || []) {
    const neonUserId = userMap.get(p.user_id) || p.user_id;
    await sql`
      INSERT INTO public.profiles (user_id, full_name, email, avatar_url, level, xp, streak, created_at, updated_at)
      VALUES (
        ${neonUserId}, 
        ${p.full_name || 'User'}, 
        ${p.email || ''}, 
        ${p.avatar_url || ''}, 
        ${p.level ?? 1}, 
        ${p.xp ?? 0}, 
        ${p.streak ?? 0}, 
        ${p.created_at || new Date().toISOString()}, 
        ${p.updated_at || new Date().toISOString()}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        avatar_url = EXCLUDED.avatar_url,
        level = EXCLUDED.level,
        xp = EXCLUDED.xp,
        streak = EXCLUDED.streak,
        updated_at = EXCLUDED.updated_at
    `;
    stats.profiles.migrated++;
  }
  console.log(` - Profiles migrated: ${stats.profiles.migrated}/${stats.profiles.old}`);

  // --- STEP 3: MIGRATE DAILY ROUTINES ---
  console.log('\n[STEP 3] Migrating Daily Routines...');
  const { data: sbRoutines } = await supabaseAdmin.from('daily_routines').select('*');
  stats.daily_routines.old = sbRoutines?.length || 0;

  for (const r of sbRoutines || []) {
    const neonUserId = userMap.get(r.user_id);
    if (!neonUserId) continue;

    const daysArray = Array.isArray(r.days) ? r.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    await sql`
      INSERT INTO public.daily_routines (id, user_id, title, time, duration_minutes, days, enabled, priority, created_at, updated_at)
      VALUES (
        ${r.id},
        ${neonUserId},
        ${r.title || 'Untitled Routine'},
        ${r.time || null},
        ${r.duration_minutes ?? 30},
        ${daysArray},
        ${r.enabled ?? true},
        ${r.priority || 'Medium'},
        ${r.created_at || new Date().toISOString()},
        ${r.updated_at || new Date().toISOString()}
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        title = EXCLUDED.title,
        time = EXCLUDED.time,
        duration_minutes = EXCLUDED.duration_minutes,
        days = EXCLUDED.days,
        enabled = EXCLUDED.enabled,
        priority = EXCLUDED.priority,
        updated_at = EXCLUDED.updated_at
    `;
    stats.daily_routines.migrated++;
  }
  console.log(` - Daily routines migrated: ${stats.daily_routines.migrated}/${stats.daily_routines.old}`);

  // --- STEP 4: MIGRATE REMINDERS ---
  console.log('\n[STEP 4] Migrating Reminders...');
  const { data: sbReminders } = await supabaseAdmin.from('reminders').select('*');
  stats.reminders.old = sbReminders?.length || 0;

  for (const rm of sbReminders || []) {
    const neonUserId = userMap.get(rm.user_id);
    if (!neonUserId) continue;

    const dateVal = rm.date ? rm.date.split('T')[0] : new Date().toISOString().split('T')[0];

    await sql`
      INSERT INTO public.reminders (id, user_id, title, description, date, time, priority, recurring, completed, created_at, updated_at)
      VALUES (
        ${rm.id},
        ${neonUserId},
        ${rm.title || 'Untitled Reminder'},
        ${rm.description || null},
        ${dateVal},
        ${rm.time || null},
        ${rm.priority || 'Medium'},
        ${rm.recurring || null},
        ${rm.completed ?? false},
        ${rm.created_at || new Date().toISOString()},
        ${rm.updated_at || new Date().toISOString()}
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        priority = EXCLUDED.priority,
        recurring = EXCLUDED.recurring,
        completed = EXCLUDED.completed,
        updated_at = EXCLUDED.updated_at
    `;
    stats.reminders.migrated++;
  }
  console.log(` - Reminders migrated: ${stats.reminders.migrated}/${stats.reminders.old}`);

  // --- STEP 5: MIGRATE TASKS ---
  console.log('\n[STEP 5] Migrating Tasks...');
  const { data: sbTasks } = await supabaseAdmin.from('tasks').select('*');
  stats.tasks.old = sbTasks?.length || 0;

  for (const t of sbTasks || []) {
    const neonUserId = userMap.get(t.user_id);
    if (!neonUserId) continue;

    const dateVal = t.date ? t.date.split('T')[0] : null;

    await sql`
      INSERT INTO public.tasks (
        id, user_id, title, description, category, priority, date,
        start_time, end_time, estimated_minutes, actual_minutes,
        completed, completed_at, recurring, reminder_id, routine_id,
        status, xp_reward, created_at, updated_at
      )
      VALUES (
        ${t.id},
        ${neonUserId},
        ${t.title || 'Untitled Task'},
        ${t.description || null},
        ${t.category || 'General'},
        ${t.priority || 'Medium'},
        ${dateVal},
        ${t.start_time || null},
        ${t.end_time || null},
        ${t.estimated_minutes ?? 60},
        ${t.actual_minutes ?? 0},
        ${t.completed ?? false},
        ${t.completed_at || null},
        ${t.recurring || null},
        ${t.reminder_id || null},
        ${t.routine_id || null},
        ${t.status || (t.completed ? 'completed' : 'pending')},
        ${t.xp_reward ?? 10},
        ${t.created_at || new Date().toISOString()},
        ${t.updated_at || new Date().toISOString()}
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        priority = EXCLUDED.priority,
        date = EXCLUDED.date,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        estimated_minutes = EXCLUDED.estimated_minutes,
        actual_minutes = EXCLUDED.actual_minutes,
        completed = EXCLUDED.completed,
        completed_at = EXCLUDED.completed_at,
        recurring = EXCLUDED.recurring,
        status = EXCLUDED.status,
        xp_reward = EXCLUDED.xp_reward,
        updated_at = EXCLUDED.updated_at
    `;
    stats.tasks.migrated++;
  }
  console.log(` - Tasks migrated: ${stats.tasks.migrated}/${stats.tasks.old}`);

  // --- STEP 6: MIGRATE FOCUS SESSIONS ---
  console.log('\n[STEP 6] Migrating Focus Sessions...');
  const { data: sbFocus } = await supabaseAdmin.from('focus_sessions').select('*');
  stats.focus_sessions.old = sbFocus?.length || 0;

  for (const f of sbFocus || []) {
    const neonUserId = userMap.get(f.user_id);
    if (!neonUserId) continue;

    await sql`
      INSERT INTO public.focus_sessions (id, user_id, task_id, duration_minutes, completed, created_at)
      VALUES (
        ${f.id},
        ${neonUserId},
        ${f.task_id || null},
        ${f.duration_minutes ?? 25},
        ${f.completed ?? true},
        ${f.created_at || new Date().toISOString()}
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        duration_minutes = EXCLUDED.duration_minutes,
        completed = EXCLUDED.completed
    `;
    stats.focus_sessions.migrated++;
  }
  console.log(` - Focus sessions migrated: ${stats.focus_sessions.migrated}/${stats.focus_sessions.old}`);

  // --- STEP 7: MIGRATE JOURNAL ENTRIES ---
  console.log('\n[STEP 7] Migrating Journal Entries...');
  const { data: sbJournal } = await supabaseAdmin.from('journal_entries').select('*');
  stats.journal_entries.old = sbJournal?.length || 0;

  for (const j of sbJournal || []) {
    const neonUserId = userMap.get(j.user_id);
    if (!neonUserId) continue;

    const dateVal = j.date ? j.date.split('T')[0] : new Date().toISOString().split('T')[0];

    await sql`
      INSERT INTO public.journal_entries (id, user_id, date, title, content, mood, created_at, updated_at)
      VALUES (
        ${j.id},
        ${neonUserId},
        ${dateVal},
        ${j.title || null},
        ${j.content || ''},
        ${j.mood || null},
        ${j.created_at || new Date().toISOString()},
        ${j.updated_at || new Date().toISOString()}
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        date = EXCLUDED.date,
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        mood = EXCLUDED.mood,
        updated_at = EXCLUDED.updated_at
    `;
    stats.journal_entries.migrated++;
  }
  console.log(` - Journal entries migrated: ${stats.journal_entries.migrated}/${stats.journal_entries.old}`);

  // --- STEP 8: MIGRATE LEARNING TOPICS ---
  console.log('\n[STEP 8] Migrating Learning Topics...');
  const { data: sbLearning } = await supabaseAdmin.from('learning_topics').select('*');
  stats.learning_topics.old = sbLearning?.length || 0;

  for (const lt of sbLearning || []) {
    const neonUserId = userMap.get(lt.user_id);
    if (!neonUserId) continue;

    const resourcesJson = lt.resources ? (typeof lt.resources === 'string' ? lt.resources : JSON.stringify(lt.resources)) : '[]';

    await sql`
      INSERT INTO public.learning_topics (
        id, user_id, title, description, category, priority, progress,
        status, current_module, next_module, notes, resources, last_studied_at,
        created_at, updated_at
      )
      VALUES (
        ${lt.id},
        ${neonUserId},
        ${lt.title || 'Untitled Topic'},
        ${lt.description || ''},
        ${lt.category || ''},
        ${lt.priority || 'Medium'},
        ${lt.progress ?? 0},
        ${lt.status || 'Not Started'},
        ${lt.current_module || ''},
        ${lt.next_module || ''},
        ${lt.notes || ''},
        ${resourcesJson}::jsonb,
        ${lt.last_studied_at || null},
        ${lt.created_at || new Date().toISOString()},
        ${lt.updated_at || new Date().toISOString()}
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        priority = EXCLUDED.priority,
        progress = EXCLUDED.progress,
        status = EXCLUDED.status,
        current_module = EXCLUDED.current_module,
        next_module = EXCLUDED.next_module,
        notes = EXCLUDED.notes,
        resources = EXCLUDED.resources,
        last_studied_at = EXCLUDED.last_studied_at,
        updated_at = EXCLUDED.updated_at
    `;
    stats.learning_topics.migrated++;
  }
  console.log(` - Learning topics migrated: ${stats.learning_topics.migrated}/${stats.learning_topics.old}`);

  // --- STEP 9: MIGRATE MOTIVATIONAL QUOTES ---
  console.log('\n[STEP 9] Migrating Motivational Quotes...');
  const { data: sbQuotes } = await supabaseAdmin.from('motivational_quotes').select('*');
  stats.motivational_quotes.old = sbQuotes?.length || 0;

  for (const q of sbQuotes || []) {
    const neonUserId = userMap.get(q.user_id);
    if (!neonUserId) continue;

    await sql`
      INSERT INTO public.motivational_quotes (id, user_id, text, created_at, updated_at)
      VALUES (
        ${q.id},
        ${neonUserId},
        ${q.text || 'Keep going!'},
        ${q.created_at || new Date().toISOString()},
        ${q.updated_at || new Date().toISOString()}
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        text = EXCLUDED.text,
        updated_at = EXCLUDED.updated_at
    `;
    stats.motivational_quotes.migrated++;
  }
  console.log(` - Motivational quotes migrated: ${stats.motivational_quotes.migrated}/${stats.motivational_quotes.old}`);

  // --- STEP 10: MIGRATE GOALS & HABITS (if any) ---
  const { data: sbGoals } = await supabaseAdmin.from('goals').select('*');
  stats.goals.old = sbGoals?.length || 0;
  for (const g of sbGoals || []) {
    const neonUserId = userMap.get(g.user_id);
    if (!neonUserId) continue;
    await sql`
      INSERT INTO public.goals (id, user_id, title, completed, created_at, updated_at)
      VALUES (${g.id}, ${neonUserId}, ${g.title || 'Goal'}, ${g.completed ?? false}, ${g.created_at || new Date().toISOString()}, ${g.updated_at || new Date().toISOString()})
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, completed = EXCLUDED.completed, updated_at = EXCLUDED.updated_at
    `;
    stats.goals.migrated++;
  }

  const { data: sbHabits } = await supabaseAdmin.from('habits').select('*');
  stats.habits.old = sbHabits?.length || 0;
  for (const h of sbHabits || []) {
    const neonUserId = userMap.get(h.user_id);
    if (!neonUserId) continue;
    await sql`
      INSERT INTO public.habits (id, user_id, title, completed_today, streak, created_at, updated_at)
      VALUES (${h.id}, ${neonUserId}, ${h.title || 'Habit'}, ${h.completed_today ?? false}, ${h.streak ?? 0}, ${h.created_at || new Date().toISOString()}, ${h.updated_at || new Date().toISOString()})
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, completed_today = EXCLUDED.completed_today, streak = EXCLUDED.streak, updated_at = EXCLUDED.updated_at
    `;
    stats.habits.migrated++;
  }

  console.log('\n====================================================');
  console.log('MIGRATION SUMMARY REPORT');
  console.log('====================================================');
  console.log(`Users: Old=${stats.users.old}, Matched=${stats.users.matched}, Created=${stats.users.created}`);
  console.log(`Profiles: Old=${stats.profiles.old}, Migrated=${stats.profiles.migrated}`);
  console.log(`Daily Routines: Old=${stats.daily_routines.old}, Migrated=${stats.daily_routines.migrated}`);
  console.log(`Tasks: Old=${stats.tasks.old}, Migrated=${stats.tasks.migrated}`);
  console.log(`Reminders: Old=${stats.reminders.old}, Migrated=${stats.reminders.migrated}`);
  console.log(`Focus Sessions: Old=${stats.focus_sessions.old}, Migrated=${stats.focus_sessions.migrated}`);
  console.log(`Journal Entries: Old=${stats.journal_entries.old}, Migrated=${stats.journal_entries.migrated}`);
  console.log(`Learning Topics: Old=${stats.learning_topics.old}, Migrated=${stats.learning_topics.migrated}`);
  console.log(`Motivational Quotes: Old=${stats.motivational_quotes.old}, Migrated=${stats.motivational_quotes.migrated}`);
  console.log(`Goals: Old=${stats.goals.old}, Migrated=${stats.goals.migrated}`);
  console.log(`Habits: Old=${stats.habits.old}, Migrated=${stats.habits.migrated}`);
  console.log('====================================================\n');
}

runMigration().catch(err => {
  console.error('[MIGRATION ERROR]:', err);
  process.exit(1);
});
