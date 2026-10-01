import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const getUpcomingDates = () => {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const shouldRunOnDate = (routine, date) => {
  if (!routine.enabled) return false;
  if (!routine.days || routine.days.length === 0) return true;
  const dayName = format(date, 'EEE');
  return routine.days.includes(dayName);
};

async function testRoutineSync() {
  const userId = '1a2b3760-55f5-4523-8b23-e1fd91cb8036';
  const { data: routines } = await supabaseAdmin.from('daily_routines').select('*').eq('user_id', userId);
  console.log('Total daily routines for user:', routines?.length);

  for (const routine of (routines || [])) {
    const dates = getUpcomingDates();
    const todayStr = format(dates[0], 'yyyy-MM-dd');

    const { data: existingTasks } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('recurring', routine.id)
      .eq('user_id', userId)
      .gte('date', todayStr);

    const requiredDates = dates.filter(d => shouldRunOnDate(routine, d)).map(d => format(d, 'yyyy-MM-dd'));
    const existingDates = (existingTasks || []).map(t => (t.date || '').slice(0, 10));
    const tasksToInsertDates = requiredDates.filter(d => !existingDates.includes(d));

    let endTime = undefined;
    if (routine.time && routine.duration_minutes) {
      const [hours, minutes] = routine.time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes + routine.duration_minutes, 0);
      endTime = date.toTimeString().slice(0, 5);
    }

    if (tasksToInsertDates.length > 0) {
      const newTasks = tasksToInsertDates.map(date => ({
        user_id: userId,
        recurring: routine.id,
        title: routine.title,
        category: 'Routine',
        priority: routine.priority || 'medium',
        date: date,
        start_time: routine.time,
        end_time: endTime,
        estimated_minutes: routine.duration_minutes || 30,
        completed: false,
        status: 'pending',
        xp_reward: 10
      }));

      const { data: inserted, error: insErr } = await supabaseAdmin.from('tasks').insert(newTasks).select();
      if (insErr) {
        console.error(`Error inserting tasks for routine ${routine.title}:`, insErr);
      } else {
        console.log(`Inserted ${inserted?.length} task instances for routine: "${routine.title}"`);
      }
    } else {
      console.log(`Routine "${routine.title}" already has tasks for upcoming dates.`);
    }
  }

  // Now count tasks for today
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: todayTasks } = await supabaseAdmin.from('tasks').select('*').eq('user_id', userId).eq('date', todayStr);
  console.log(`\n✅ Total tasks scheduled for today (${todayStr}):`, todayTasks?.length);

  // Total tasks overall
  const { count: totalTasks } = await supabaseAdmin.from('tasks').select('*', { count: 'exact' }).eq('user_id', userId);
  console.log(`✅ Total tasks in database for user:`, totalTasks);
}

testRoutineSync();
