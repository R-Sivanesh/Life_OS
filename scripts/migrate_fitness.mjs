import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
if (!dbUrl) {
  console.error('No DATABASE_URL found!');
  process.exit(1);
}

const sql = neon(dbUrl.trim().replace(/^["']|["']$/g, ''));

async function migrate() {
  console.log('Running Fitness schema migration on Neon...');
  
  await sql`
    CREATE TABLE IF NOT EXISTS public.fitness_exercises (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sets INTEGER NOT NULL DEFAULT 3,
      target_reps INTEGER NOT NULL DEFAULT 12,
      weight NUMERIC DEFAULT 0,
      weight_unit TEXT DEFAULT 'kg',
      rest_time_seconds INTEGER DEFAULT 60,
      notes TEXT,
      order_index INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  console.log('Created fitness_exercises table');

  await sql`
    CREATE TABLE IF NOT EXISTS public.fitness_sets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      exercise_id UUID REFERENCES public.fitness_exercises(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      target_reps INTEGER NOT NULL,
      actual_reps INTEGER,
      weight NUMERIC DEFAULT 0,
      weight_unit TEXT DEFAULT 'kg',
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  console.log('Created fitness_sets table');

  await sql`
    CREATE TABLE IF NOT EXISTS public.fitness_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      exercise_id UUID,
      exercise_name TEXT NOT NULL,
      sets_completed INTEGER NOT NULL,
      total_sets INTEGER NOT NULL,
      target_reps INTEGER NOT NULL,
      actual_reps_summary TEXT,
      weight NUMERIC DEFAULT 0,
      weight_unit TEXT DEFAULT 'kg',
      duration_seconds INTEGER DEFAULT 0,
      completed_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  console.log('Created fitness_logs table');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_fitness_exercises_user ON public.fitness_exercises(user_id, status);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_fitness_sets_exercise ON public.fitness_sets(exercise_id, set_number);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_fitness_logs_user ON public.fitness_logs(user_id, completed_at);
  `;
  console.log('Created fitness indexes');
  console.log('Fitness database tables successfully set up!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
