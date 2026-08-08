import { supabase } from './supabase';
import type { Routine } from './useRoutines';
import type { Task } from './useTasks';

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

const shouldRunOnDate = (routine: Routine, date: Date) => {
  if (!routine.enabled) return false;
  if (!routine.days || routine.days.length === 0) return true;
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  return routine.days.includes(dayName);
};

export const syncRoutineToTasks = async (routine: Routine, userId: string) => {
  if (!userId || !supabase) return;

  const dates = getUpcomingDates();
  
  let existingTasks: Task[] = [];
  const todayStr = dates[0].toISOString().split('T')[0];
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('routine_id', routine.id)
    .eq('user_id', userId)
    .gte('date', todayStr);
  if (data) existingTasks = data;

  const requiredDates = dates.filter(d => shouldRunOnDate(routine, d)).map(d => d.toISOString().split('T')[0]);
  
  const tasksToDelete = existingTasks.filter(t => t.date && !requiredDates.includes(t.date) && !t.completed);
  const tasksToUpdate = existingTasks.filter(t => t.date && requiredDates.includes(t.date) && !t.completed);
  const existingDates = existingTasks.map(t => t.date);
  const tasksToInsertDates = requiredDates.filter(d => !existingDates.includes(d));

  let endTime = undefined;
  if (routine.time && routine.duration_minutes) {
    const [hours, minutes] = routine.time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes + routine.duration_minutes, 0);
    endTime = date.toTimeString().slice(0, 5);
  }

  if (tasksToDelete.length > 0) {
    const deleteIds = tasksToDelete.map(t => t.id);
    await supabase.from('tasks').delete().in('id', deleteIds);
  }

  if (tasksToUpdate.length > 0) {
    for (const t of tasksToUpdate) {
      const updates = {
        title: routine.title,
        priority: routine.priority || 'medium',
        start_time: routine.time,
        end_time: endTime,
        estimated_minutes: routine.duration_minutes || 30
      };
      await supabase.from('tasks').update(updates).eq('id', t.id);
    }
  }

  if (tasksToInsertDates.length > 0) {
    const newTasks = tasksToInsertDates.map(date => ({
      user_id: userId,
      routine_id: routine.id,
      title: routine.title,
      category: 'Routine',
      priority: routine.priority || 'medium',
      date: date,
      start_time: routine.time,
      end_time: endTime,
      estimated_minutes: routine.duration_minutes || 30,
      completed: false,
      status: 'pending'
    }));
    await supabase.from('tasks').insert(newTasks);
  }
};

export const deleteRoutineTasks = async (routineId: string, userId: string) => {
  if (!userId || !supabase) return;
  const todayStr = new Date().toISOString().split('T')[0];
  
  await supabase.from('tasks')
    .delete()
    .eq('routine_id', routineId)
    .eq('user_id', userId)
    .gte('date', todayStr)
    .eq('completed', false);
};

export const syncAllRoutines = async (routines: Routine[], userId: string) => {
  if (!userId || routines.length === 0) return;
  for (const r of routines) {
    await syncRoutineToTasks(r, userId);
  }
};