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
  points?: number;
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
      const seenIds = new Set<string>();
      fetchedTasks = [];
      for (const t of data as any[]) {
        if (!t || !t.id || seenIds.has(t.id)) continue;
        seenIds.add(t.id);
        fetchedTasks.push({
          ...t,
          date: t.date ? (typeof t.date === 'string' ? t.date.slice(0, 10) : t.date) : undefined,
          points: t.points !== undefined && t.points !== null ? t.points : (t.xp_reward || 10)
        });
      }
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
    const taskPoints = Math.max(0, parseInt((taskData.points ?? taskData.xp_reward ?? 10) as any, 10) || 10);
    const newTask = {
      ...taskData,
      points: taskPoints,
      xp_reward: taskPoints,
      user_id: user.id,
      completed: false,
      status: 'pending'
    };

    const { data, error } = await supabase.from('tasks').insert([newTask]).select();
    if (error) {
      console.error('Error adding task:', error);
      alert('Error saving task: ' + (error.message || JSON.stringify(error)));
      return;
    }
    if (data && data.length > 0) {
      const created = {
        ...data[0],
        date: data[0].date ? (typeof data[0].date === 'string' ? data[0].date.slice(0, 10) : data[0].date) : undefined,
        points: data[0].points ?? taskPoints
      };
      setTasks(prev => {
        const withoutCreated = prev.filter(t => t.id !== created.id);
        return [...withoutCreated, created].sort((a, b) => {
          const dateA = a.date || '9999-99-99';
          const dateB = b.date || '9999-99-99';
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          const hasTimeA = Boolean(a.start_time);
          const hasTimeB = Boolean(b.start_time);
          if (hasTimeA && hasTimeB) return (a.start_time as string).localeCompare(b.start_time as string);
          if (hasTimeA && !hasTimeB) return -1;
          if (!hasTimeA && hasTimeB) return 1;
          return 0;
        });
      });
      window.dispatchEvent(new Event('lifeos_tasks_updated'));
      window.dispatchEvent(new Event('lifeos_points_updated'));
      return created;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!supabase) return;
    const sanitizedUpdates = { ...updates };
    if ('points' in sanitizedUpdates) {
      sanitizedUpdates.points = Math.max(0, parseInt(sanitizedUpdates.points as any, 10) || 10);
      sanitizedUpdates.xp_reward = sanitizedUpdates.points;
    }

    const { error } = await supabase.from('tasks').update(sanitizedUpdates).eq('id', id);
    if (!error) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...sanitizedUpdates } : t).sort((a, b) => {
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
      window.dispatchEvent(new Event('lifeos_tasks_updated'));
      window.dispatchEvent(new Event('lifeos_points_updated'));
    }
  };

  const deleteTask = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== id));
      window.dispatchEvent(new Event('lifeos_tasks_updated'));
      window.dispatchEvent(new Event('lifeos_points_updated'));
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
      window.dispatchEvent(new Event('lifeos_tasks_updated'));
      window.dispatchEvent(new Event('lifeos_points_updated'));
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

