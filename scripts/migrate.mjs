import { neon } from '@neondatabase/serverless';
import { createClient } from '@supabase/supabase-js';

const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!databaseUrl) {
  console.error('Missing DATABASE_URL in environment');
  process.exit(1);
}

const sql = neon(databaseUrl);
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

async function migrate() {
  console.log('--- 1. Testing Neon Connection ---');
  const checkResult = await sql`SELECT 1 as connected, NOW() as current_time`;
  console.log('Neon connected successfully at:', checkResult[0].current_time);

  console.log('\n--- 2. Creating Extensions & Schema in Neon ---');
  
  // Enable extensions
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  // 1. Users table (to replace Supabase auth.users)
  await sql`
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // 2. Profiles table
  await sql`
    CREATE TABLE IF NOT EXISTS public.profiles (
      user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
      full_name TEXT,
      email TEXT,
      avatar_url TEXT,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // 3. Tasks table
  await sql`
    CREATE TABLE IF NOT EXISTS public.tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'General',
      priority TEXT DEFAULT 'Medium',
      date DATE,
      start_time TIME,
      end_time TIME,
      estimated_minutes INTEGER DEFAULT 60,
      actual_minutes INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      recurring TEXT,
      reminder_id UUID,
      routine_id UUID,
      status TEXT DEFAULT 'pending',
      xp_reward INTEGER DEFAULT 10,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // 4. Reminders table
  await sql`
    CREATE TABLE IF NOT EXISTS public.reminders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      time TIME,
      priority TEXT DEFAULT 'Medium',
      recurring TEXT,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // 5. Daily Routines table
  await sql`
    CREATE TABLE IF NOT EXISTS public.daily_routines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      time TIME,
      duration_minutes INTEGER DEFAULT 30,
      days TEXT[] DEFAULT '{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}',
      enabled BOOLEAN DEFAULT TRUE,
      priority TEXT DEFAULT 'Medium',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // 6. Focus Sessions table
  await sql`
    CREATE TABLE IF NOT EXISTS public.focus_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
      duration_minutes INTEGER NOT NULL,
      completed BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // 7. Journal Entries table
  await sql`
    CREATE TABLE IF NOT EXISTS public.journal_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      mood TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // 8. Goals table
  await sql`
    CREATE TABLE IF NOT EXISTS public.goals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // 9. Habits table
  await sql`
    CREATE TABLE IF NOT EXISTS public.habits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed_today BOOLEAN DEFAULT FALSE,
      streak INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // 10. Motivational Quotes table
  await sql`
    CREATE TABLE IF NOT EXISTS public.motivational_quotes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // 11. Learning Topics table
  await sql`
    CREATE TABLE IF NOT EXISTS public.learning_topics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      priority TEXT DEFAULT 'Medium',
      progress INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Not Started',
      current_module TEXT,
      next_module TEXT,
      notes TEXT,
      resources JSONB DEFAULT '[]'::jsonb,
      last_studied_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Create indexes for performance
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_reminders_user_date ON public.reminders(user_id, date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_routines_user ON public.daily_routines(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_journal_user_date ON public.journal_entries(user_id, date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_learning_user ON public.learning_topics(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_quotes_user ON public.motivational_quotes(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_focus_user ON public.focus_sessions(user_id)`;

  console.log('All 11 tables and indexes verified/created in Neon PostgreSQL!');

  console.log('\n--- 3. Checking Supabase Data for Migration ---');
  if (supabase) {
    const tables = [
      'profiles',
      'tasks',
      'reminders',
      'daily_routines',
      'focus_sessions',
      'journal_entries',
      'goals',
      'habits',
      'motivational_quotes',
      'learning_topics'
    ];

    const dataMap = {};
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
          console.log(`Could not fetch ${table} from Supabase:`, error.message);
          dataMap[table] = [];
        } else {
          dataMap[table] = data || [];
          console.log(`Supabase ${table}: found ${dataMap[table].length} records`);
        }
      } catch (e) {
        console.log(`Error reading ${table}:`, e.message);
        dataMap[table] = [];
      }
    }

    // Identify all unique user IDs across all records
    const userIds = new Set();
    for (const [table, rows] of Object.entries(dataMap)) {
      for (const row of rows) {
        if (row.user_id) userIds.add(row.user_id);
      }
    }

    console.log(`\nFound ${userIds.size} distinct user IDs from data`);

    // Insert user placeholder/records into public.users if profiles exist
    const profiles = dataMap['profiles'] || [];
    const profileMap = new Map(profiles.map(p => [p.user_id, p]));

    for (const uid of userIds) {
      const prof = profileMap.get(uid);
      const email = prof?.email || `user_${uid.substring(0, 8)}@lifeos.app`;
      const name = prof?.full_name || 'User';
      const avatar = prof?.avatar_url || '';

      await sql`
        INSERT INTO public.users (id, email, name, avatar_url)
        VALUES (${uid}, ${email}, ${name}, ${avatar})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Now insert profiles
    for (const p of profiles) {
      await sql`
        INSERT INTO public.profiles (user_id, full_name, email, avatar_url, level, xp, streak, created_at, updated_at)
        VALUES (${p.user_id}, ${p.full_name}, ${p.email}, ${p.avatar_url}, ${p.level || 1}, ${p.xp || 0}, ${p.streak || 0}, ${p.created_at || new Date()}, ${p.updated_at || new Date()})
        ON CONFLICT (user_id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          avatar_url = EXCLUDED.avatar_url,
          level = EXCLUDED.level,
          xp = EXCLUDED.xp,
          streak = EXCLUDED.streak,
          updated_at = EXCLUDED.updated_at
      `;
    }

    // Insert tasks
    for (const t of (dataMap['tasks'] || [])) {
      await sql`
        INSERT INTO public.tasks (id, user_id, title, description, category, priority, date, start_time, end_time, estimated_minutes, actual_minutes, completed, completed_at, recurring, reminder_id, routine_id, status, xp_reward, created_at, updated_at)
        VALUES (${t.id}, ${t.user_id}, ${t.title}, ${t.description}, ${t.category || 'General'}, ${t.priority || 'Medium'}, ${t.date}, ${t.start_time}, ${t.end_time}, ${t.estimated_minutes || 60}, ${t.actual_minutes || 0}, ${t.completed || false}, ${t.completed_at}, ${t.recurring}, ${t.reminder_id}, ${t.routine_id}, ${t.status || 'pending'}, ${t.xp_reward || 10}, ${t.created_at || new Date()}, ${t.updated_at || new Date()})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert reminders
    for (const r of (dataMap['reminders'] || [])) {
      await sql`
        INSERT INTO public.reminders (id, user_id, title, description, date, time, priority, recurring, completed, created_at, updated_at)
        VALUES (${r.id}, ${r.user_id}, ${r.title}, ${r.description}, ${r.date}, ${r.time}, ${r.priority || 'Medium'}, ${r.recurring}, ${r.completed || false}, ${r.created_at || new Date()}, ${r.updated_at || new Date()})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert daily_routines
    for (const dr of (dataMap['daily_routines'] || [])) {
      await sql`
        INSERT INTO public.daily_routines (id, user_id, title, time, duration_minutes, days, enabled, priority, created_at, updated_at)
        VALUES (${dr.id}, ${dr.user_id}, ${dr.title}, ${dr.time}, ${dr.duration_minutes || 30}, ${dr.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}, ${dr.enabled ?? true}, ${dr.priority || 'Medium'}, ${dr.created_at || new Date()}, ${dr.updated_at || new Date()})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert focus_sessions
    for (const fs of (dataMap['focus_sessions'] || [])) {
      await sql`
        INSERT INTO public.focus_sessions (id, user_id, task_id, duration_minutes, completed, created_at)
        VALUES (${fs.id}, ${fs.user_id}, ${fs.task_id}, ${fs.duration_minutes}, ${fs.completed ?? true}, ${fs.created_at || new Date()})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert journal_entries
    for (const j of (dataMap['journal_entries'] || [])) {
      await sql`
        INSERT INTO public.journal_entries (id, user_id, date, title, content, mood, created_at, updated_at)
        VALUES (${j.id}, ${j.user_id}, ${j.date}, ${j.title}, ${j.content}, ${j.mood}, ${j.created_at || new Date()}, ${j.updated_at || new Date()})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert motivational_quotes
    for (const q of (dataMap['motivational_quotes'] || [])) {
      await sql`
        INSERT INTO public.motivational_quotes (id, user_id, text, created_at, updated_at)
        VALUES (${q.id}, ${q.user_id}, ${q.text}, ${q.created_at || new Date()}, ${q.updated_at || new Date()})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Insert learning_topics
    for (const lt of (dataMap['learning_topics'] || [])) {
      const resJson = typeof lt.resources === 'string' ? lt.resources : JSON.stringify(lt.resources || []);
      await sql`
        INSERT INTO public.learning_topics (id, user_id, title, description, category, priority, progress, status, current_module, next_module, notes, resources, last_studied_at, created_at, updated_at)
        VALUES (${lt.id}, ${lt.user_id}, ${lt.title}, ${lt.description}, ${lt.category}, ${lt.priority || 'Medium'}, ${lt.progress || 0}, ${lt.status || 'Not Started'}, ${lt.current_module}, ${lt.next_module}, ${lt.notes}, ${resJson}::jsonb, ${lt.last_studied_at}, ${lt.created_at || new Date()}, ${lt.updated_at || new Date()})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    console.log('\n--- 4. Verification of Migrated Records in Neon ---');
    const tableVerification = [
      'users',
      'profiles',
      'tasks',
      'reminders',
      'daily_routines',
      'focus_sessions',
      'journal_entries',
      'motivational_quotes',
      'learning_topics',
      'goals',
      'habits'
    ];

    for (const t of tableVerification) {
      const res = await sql.query(`SELECT count(*) as count FROM public.${t}`);
      console.log(`Neon table [${t}]: ${res[0].count} records`);
    }
  }

  console.log('\nMigration to Neon completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
