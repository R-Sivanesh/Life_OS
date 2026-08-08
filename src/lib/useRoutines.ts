import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';
import { syncRoutineToTasks, deleteRoutineTasks } from './routineSync';

export type Routine = {
  id: string;
  user_id?: string;
  title: string;
  time?: string;
  duration_minutes?: number;
  days?: string[];
  enabled: boolean;
  priority: string;
};

export const useRoutines = () => {
  const { user } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoutines = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('daily_routines')
      .select('*')
      .eq('user_id', user.id);
      
    if (!error && data) {
      setRoutines(data);
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  const addRoutine = async (routineData: Partial<Routine>) => {
    if (!user || !supabase) return;
    const newRoutine = {
      ...routineData,
      user_id: user.id,
      enabled: true,
      days: routineData.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    };

    const { data, error } = await supabase.from('daily_routines').insert([newRoutine]).select();
    if (!error && data) {
      setRoutines(prev => [...prev, data[0]]);
      await syncRoutineToTasks(data[0], user.id);
      window.dispatchEvent(new Event('lifeos_tasks_updated'));
      return data[0];
    }
  };

  const updateRoutine = async (id: string, updates: Partial<Routine>) => {
    if (!user || !supabase) return;
    const { error } = await supabase.from('daily_routines').update(updates).eq('id', id);
    if (!error) {
      setRoutines(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      const updatedRoutine = { ...routines.find(r => r.id === id), ...updates } as Routine;
      await syncRoutineToTasks(updatedRoutine, user.id);
      window.dispatchEvent(new Event('lifeos_tasks_updated'));
    }
  };

  const deleteRoutine = async (id: string) => {
    if (!user || !supabase) return;
    const { error } = await supabase.from('daily_routines').delete().eq('id', id);
    if (!error) {
      setRoutines(prev => prev.filter(r => r.id !== id));
      await deleteRoutineTasks(id, user.id);
      window.dispatchEvent(new Event('lifeos_tasks_updated'));
    }
  };

  return {
    routines,
    loading,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    refresh: fetchRoutines
  };
};
