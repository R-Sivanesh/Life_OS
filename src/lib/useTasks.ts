import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';

export type Task = {
  id: string;
  user_id?: string;
  routine_id?: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  date?: string;
  start_time?: string;
  end_time?: string;
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

    // Sort tasks: Overdue -> High -> Nearest Time -> Medium -> Low
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    const getPriorityWeight = (p: string) => {
      if (p === 'high') return 3;
      if (p === 'medium') return 2;
      return 1;
    };

    fetchedTasks.sort((a, b) => {
      const aIsOverdue = !a.completed && (a.date! < today || (a.date === today && a.end_time! < currentTime));
      const bIsOverdue = !b.completed && (b.date! < today || (b.date === today && b.end_time! < currentTime));

      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;

      const pWeightA = getPriorityWeight(a.priority);
      const pWeightB = getPriorityWeight(b.priority);

      if (pWeightA !== pWeightB) return pWeightB - pWeightA; // High to Low

      const aTime = a.start_time || '23:59';
      const bTime = b.start_time || '23:59';
      return aTime.localeCompare(bTime);
    });

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
    if (!error && data) {
      setTasks(prev => [data[0], ...prev]);
      return data[0];
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!supabase) return;
    const { error } = await supabase.from('tasks').update(updates).eq('id', id);
    if (!error) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
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
      setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, completed: false, status: 'pending', completed_at: undefined } : t));
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
