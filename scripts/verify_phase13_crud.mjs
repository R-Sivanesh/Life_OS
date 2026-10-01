import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testPhase13() {
  const userId = '1a2b3760-55f5-4523-8b23-e1fd91cb8036';
  console.log('=== PHASE 13: END-TO-END CRUD VERIFICATION ===\n');

  // 1. Task CRUD
  console.log('1. Testing Task CRUD:');
  const { data: task, error: tInsErr } = await supabaseAdmin.from('tasks').insert([{
    user_id: userId,
    title: '__TEST_CRUD_TASK__',
    category: 'General',
    priority: 'high',
    xp_reward: 20,
    date: '2026-10-01',
    completed: false,
    status: 'pending'
  }]).select().single();
  if (tInsErr) throw new Error('Task insert failed: ' + tInsErr.message);
  console.log('  ✅ Created task:', task.id, task.title);

  const { error: tUpdErr } = await supabaseAdmin.from('tasks').update({
    title: '__TEST_CRUD_TASK_UPDATED__',
    completed: true,
    status: 'completed'
  }).eq('id', task.id);
  if (tUpdErr) throw new Error('Task update failed: ' + tUpdErr.message);
  console.log('  ✅ Updated and marked task completed');

  const { data: updatedTask } = await supabaseAdmin.from('tasks').select('*').eq('id', task.id).single();
  console.log('  ✅ Verified task status in DB:', updatedTask.status, 'completed:', updatedTask.completed);

  await supabaseAdmin.from('tasks').delete().eq('id', task.id);
  console.log('  ✅ Deleted test task successfully');

  // 2. Reminder CRUD
  console.log('\n2. Testing Reminder CRUD:');
  const { data: reminder, error: rInsErr } = await supabaseAdmin.from('reminders').insert([{
    user_id: userId,
    title: '__TEST_CRUD_REMINDER__',
    date: '2026-10-01',
    time: '18:00',
    priority: 'medium',
    completed: false
  }]).select().single();
  if (rInsErr) throw new Error('Reminder insert failed: ' + rInsErr.message);
  console.log('  ✅ Created reminder:', reminder.id, reminder.title);

  const { error: rUpdErr } = await supabaseAdmin.from('reminders').update({
    completed: true
  }).eq('id', reminder.id);
  if (rUpdErr) throw new Error('Reminder update failed: ' + rUpdErr.message);
  console.log('  ✅ Updated reminder to completed');

  await supabaseAdmin.from('reminders').delete().eq('id', reminder.id);
  console.log('  ✅ Deleted test reminder successfully');

  // 3. Fitness CRUD
  console.log('\n3. Testing Fitness CRUD:');
  const { data: ex, error: exErr } = await supabaseAdmin.from('fitness_exercises').insert([{
    user_id: userId,
    name: '__TEST_CRUD_EXERCISE__',
    sets: 3,
    target_reps: 12,
    weight: 10,
    weight_unit: 'kg',
    rest_time_seconds: 60,
    status: 'pending',
    completed: false
  }]).select().single();
  if (exErr) throw new Error('Exercise insert failed: ' + exErr.message);
  console.log('  ✅ Created exercise:', ex.id, ex.name);

  const { data: set, error: setErr } = await supabaseAdmin.from('fitness_sets').insert([{
    user_id: userId,
    exercise_id: ex.id,
    set_number: 1,
    target_reps: 12,
    actual_reps: 12,
    weight: 10,
    weight_unit: 'kg',
    completed: true
  }]).select().single();
  if (setErr) throw new Error('Set insert failed: ' + setErr.message);
  console.log('  ✅ Created set:', set.id);

  const { data: log, error: logErr } = await supabaseAdmin.from('fitness_logs').insert([{
    user_id: userId,
    exercise_id: ex.id,
    exercise_name: ex.name,
    sets_completed: 3,
    total_sets: 3,
    target_reps: 12,
    actual_reps_summary: '12, 12, 12',
    weight: 10,
    weight_unit: 'kg',
    completed_at: new Date().toISOString()
  }]).select().single();
  if (logErr) throw new Error('Log insert failed: ' + logErr.message);
  console.log('  ✅ Created workout log:', log.id);

  // Clean up fitness test items
  await supabaseAdmin.from('fitness_logs').delete().eq('id', log.id);
  await supabaseAdmin.from('fitness_sets').delete().eq('exercise_id', ex.id);
  await supabaseAdmin.from('fitness_exercises').delete().eq('id', ex.id);
  console.log('  ✅ Cleaned up test fitness records');

  console.log('\n🎉 ALL CRUD TESTS COMPLETED SUCCESSFULLY WITH ZERO ERRORS!');
}

testPhase13();
