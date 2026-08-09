import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';

export type Task = {
  id: string;
  user_id?: string;
  recurring?: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  date?: string;
  start_time?: string | null;
  end_time?: string | null;
  estimated_minutes?: number;
  actual_minutes?: number;
  completed: boolean;
  completed_at?: string;
  xp_reward?: number;
  status: string;
};

export const useTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);
    
    let fetchedTasks: Task[] = [];

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id);
      
    if (!error && data) {
      fetchedTasks = data;
    }

    const sortTasksChronologically = (a: Task, b: Task) => {
      const dateA = a.date || '9999-99-99';
      const dateB = b.date || '9999-99-99';
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const hasTimeA = Boolean(a.start_time);
      const hasTimeB = Boolean(b.start_time);
      
      if (hasTimeA && hasTimeB) {
        return (a.start_time as string).localeCompare(b.start_time as string);
      }
      
      if (hasTimeA && !hasTimeB) return -1;
      if (!hasTimeA && hasTimeB) return 1;
      
      return 0;
    };

    fetchedTasks.sort(sortTasksChronologically);

    setTasks(fetchedTasks);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTasks();
    const handleUpdate = () => fetchTasks();
    window.addEventListener('lifeos_tasks_updated', handleUpdate);
    return () => window.removeEventListener('lifeos_tasks_updated', handleUpdate);
  }, [fetchTasks]);

  const addTask = async (taskData: Partial<Task>) => {
    if (!user || !supabase) return;
    const newTask = {
      ...taskData,
      user_id: user.id,
      completed: false,
      status: 'pending'
    };

    const { data, error } = await supabase.from('tasks').insert([newTask]).select();
    if (error) {
      console.error('Error adding task:', error);
      alert('Error saving task: ' + JSON.stringify(error));
      return;
    }
    if (data) {
      setTasks(prev => [...prev, data[0]].sort((a, b) => {
        const dateA = a.date || '9999-99-99';
        const dateB = b.date || '9999-99-99';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const hasTimeA = Boolean(a.start_time);
        const hasTimeB = Boolean(b.start_time);
        if (hasTimeA && hasTimeB) return (a.start_time as string).localeCompare(b.start_time as string);
        if (hasTimeA && !hasTimeB) return -1;
        if (!hasTimeA && hasTimeB) return 1;
        return 0;
      }));
      // Dispatch event so other components know a task was added
      window.dispatchEvent(new Event('lifeos_tasks_updated'));
      return data[0];
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!supabase) return;
    const { error } = await supabase.from('tasks').update(updates).eq('id', id);
    if (!error) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t).sort((a, b) => {
        const dateA = a.date || '9999-99-99';
        const dateB = b.date || '9999-99-99';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const hasTimeA = Boolean(a.start_time);
        const hasTimeB = Boolean(b.start_time);
        if (hasTimeA && hasTimeB) return (a.start_time as string).localeCompare(b.start_time as string);
        if (hasTimeA && !hasTimeB) return -1;
        if (!hasTimeA && hasTimeB) return 1;
        return 0;
      }));
    }
  };

  const deleteTask = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  const completeTask = async (id: string) => {
    await updateTask(id, { 
      completed: true, 
      status: 'completed', 
      completed_at: new Date().toISOString() 
    });
  };
  
  const uncompleteTask = async (id: string) => {
    await updateTask(id, { 
      completed: false, 
      status: 'pending', 
      completed_at: null as unknown as undefined 
    });
  };

  const batchUncompleteTasks = async (ids: string[]) => {
    if (ids.length === 0 || !supabase) return;
    
    const { error } = await supabase
      .from('tasks')
      .update({ completed: false, status: 'pending', completed_at: null })
      .in('id', ids);
      
    if (!error) {
      setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, completed: false, status: 'pending', completed_at: undefined } : t).sort((a, b) => {
        const dateA = a.date || '9999-99-99';
        const dateB = b.date || '9999-99-99';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const hasTimeA = Boolean(a.start_time);
        const hasTimeB = Boolean(b.start_time);
        if (hasTimeA && hasTimeB) return (a.start_time as string).localeCompare(b.start_time as string);
        if (hasTimeA && !hasTimeB) return -1;
        if (!hasTimeA && hasTimeB) return 1;
        return 0;
      }));
    }
  };

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    batchUncompleteTasks,
    refresh: fetchTasks
  };
};
