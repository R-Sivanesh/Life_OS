import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Task } from '../lib/useTasks';

interface TasksContextType {
  tasks: Task[];
  loading: boolean;
  addTask: (taskData: Partial<Task>) => Promise<Task | undefined>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  uncompleteTask: (id: string) => Promise<void>;
  batchUncompleteTasks: (ids: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const sortTasksChronologically = (a: Task, b: Task) => {
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

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = tasks;

  const normalizeDate = (rawDate: any): string | undefined => {
    if (!rawDate) return undefined;
    if (typeof rawDate === 'string') {
      return rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.slice(0, 10);
    }
    if (rawDate instanceof Date) {
      const y = rawDate.getFullYear();
      const m = String(rawDate.getMonth() + 1).padStart(2, '0');
      const d = String(rawDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return undefined;
  };

  const fetchTasks = useCallback(async (isInitial = false) => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }

    if (isInitial && tasksRef.current.length === 0) {
      setLoading(true);
    }
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);
        
      if (!error && data) {
        const seenIds = new Set<string>();
        const fetchedTasks: Task[] = [];
        
        for (const t of data as any[]) {
          if (!t || !t.id || seenIds.has(t.id)) continue;
          seenIds.add(t.id);

          fetchedTasks.push({
            ...t,
            date: normalizeDate(t.date),
            points: t.points !== undefined && t.points !== null ? t.points : (t.xp_reward || 10)
          });
        }

        fetchedTasks.sort(sortTasksChronologically);
        setTasks(fetchedTasks);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks(true);
    const handleUpdate = () => fetchTasks(false);
    window.addEventListener('lifeos_tasks_updated', handleUpdate);
    return () => window.removeEventListener('lifeos_tasks_updated', handleUpdate);
  }, [fetchTasks]);

  // OPTIMISTIC ADD TASK
  const addTask = useCallback(async (taskData: Partial<Task>): Promise<Task | undefined> => {
    if (!user || !supabase) return;

    const taskPoints = Math.max(0, parseInt((taskData.points ?? taskData.xp_reward ?? 10) as any, 10) || 10);
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const normalizedTaskDate = normalizeDate(taskData.date) || new Date().toISOString().slice(0, 10);

    const optimisticTask: Task = {
      id: tempId,
      user_id: user.id,
      title: taskData.title || '',
      description: taskData.description || '',
      category: taskData.category || 'General',
      priority: taskData.priority || 'medium',
      points: taskPoints,
      xp_reward: taskPoints,
      date: normalizedTaskDate,
      start_time: taskData.start_time ?? null,
      end_time: taskData.end_time ?? null,
      estimated_minutes: taskData.estimated_minutes || 60,
      actual_minutes: 0,
      completed: false,
      status: 'pending',
      ...taskData
    };

    // 1. Immediately update UI local state
    setTasks(prev => {
      const filtered = prev.filter(t => t.id !== tempId);
      return [...filtered, optimisticTask].sort(sortTasksChronologically);
    });

    window.dispatchEvent(new Event('lifeos_points_updated'));

    // 2. Background database sync
    (async () => {
      try {
        const payload: any = {
          ...taskData,
          points: taskPoints,
          xp_reward: taskPoints,
          user_id: user.id,
          completed: false,
          status: 'pending',
          date: normalizedTaskDate
        };
        delete payload.id;
        delete payload._type;

        const { data, error } = await supabase.from('tasks').insert([payload]).select();
        if (error) {
          console.error('Error adding task in background:', error);
          // Rollback
          setTasks(prev => prev.filter(t => t.id !== tempId));
        } else if (data && data.length > 0) {
          const serverTask: Task = {
            ...data[0],
            date: normalizeDate(data[0].date),
            points: data[0].points ?? taskPoints
          };
          // Seamlessly swap tempId with persistent DB id without UI flicker
          setTasks(prev => prev.map(t => t.id === tempId ? serverTask : t).sort(sortTasksChronologically));
        }
      } catch (err) {
        console.error('Network error adding task:', err);
        setTasks(prev => prev.filter(t => t.id !== tempId));
      }
    })();

    return optimisticTask;
  }, [user]);

  // OPTIMISTIC UPDATE TASK
  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    if (!supabase) return;

    const prevTask = tasksRef.current.find(t => t.id === id);
    if (!prevTask) return;

    const sanitizedUpdates: any = { ...updates };
    if ('points' in sanitizedUpdates) {
      sanitizedUpdates.points = Math.max(0, parseInt(sanitizedUpdates.points as any, 10) || 10);
      sanitizedUpdates.xp_reward = sanitizedUpdates.points;
    }
    if ('date' in sanitizedUpdates) {
      sanitizedUpdates.date = normalizeDate(sanitizedUpdates.date);
    }
    delete sanitizedUpdates._type;

    const updatedTask: Task = {
      ...prevTask,
      ...sanitizedUpdates
    };

    // 1. Immediately update UI local state
    setTasks(prev => prev.map(t => t.id === id ? updatedTask : t).sort(sortTasksChronologically));
    window.dispatchEvent(new Event('lifeos_points_updated'));

    // 2. Background database sync (only sending changed fields)
    (async () => {
      try {
        const { error } = await supabase.from('tasks').update(sanitizedUpdates).eq('id', id);
        if (error) {
          console.error('Error updating task in background:', error);
          // Revert optimistic update
          setTasks(prev => prev.map(t => t.id === id ? prevTask : t).sort(sortTasksChronologically));
        }
      } catch (err) {
        console.error('Network error updating task:', err);
        setTasks(prev => prev.map(t => t.id === id ? prevTask : t).sort(sortTasksChronologically));
      }
    })();
  }, []);

  // OPTIMISTIC DELETE TASK
  const deleteTask = useCallback(async (id: string) => {
    if (!supabase) return;

    const prevTask = tasksRef.current.find(t => t.id === id);

    // 1. Immediately remove from local state
    setTasks(prev => prev.filter(t => t.id !== id));
    window.dispatchEvent(new Event('lifeos_points_updated'));

    // 2. Background database delete
    (async () => {
      try {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) {
          console.error('Error deleting task in background:', error);
          // Rollback
          if (prevTask) {
            setTasks(prev => [...prev, prevTask].sort(sortTasksChronologically));
          }
        }
      } catch (err) {
        console.error('Network error deleting task:', err);
        if (prevTask) {
          setTasks(prev => [...prev, prevTask].sort(sortTasksChronologically));
        }
      }
    })();
  }, []);

  // OPTIMISTIC COMPLETE TASK
  const completeTask = useCallback(async (id: string) => {
    await updateTask(id, { 
      completed: true, 
      status: 'completed', 
      completed_at: new Date().toISOString() 
    });
  }, [updateTask]);

  // OPTIMISTIC UNCOMPLETE TASK
  const uncompleteTask = useCallback(async (id: string) => {
    await updateTask(id, { 
      completed: false, 
      status: 'pending', 
      completed_at: undefined 
    });
  }, [updateTask]);

  // OPTIMISTIC BATCH UNCOMPLETE
  const batchUncompleteTasks = useCallback(async (ids: string[]) => {
    if (ids.length === 0 || !supabase) return;

    const previousSnapshot = [...tasksRef.current];

    // 1. Immediate local update
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, completed: false, status: 'pending', completed_at: undefined } : t).sort(sortTasksChronologically));
    window.dispatchEvent(new Event('lifeos_points_updated'));

    // 2. Background sync
    (async () => {
      try {
        const { error } = await supabase
          .from('tasks')
          .update({ completed: false, status: 'pending', completed_at: null })
          .in('id', ids);

        if (error) {
          console.error('Error batch uncompleting tasks in background:', error);
          setTasks(previousSnapshot);
        }
      } catch (err) {
        console.error('Network error batch uncompleting tasks:', err);
        setTasks(previousSnapshot);
      }
    })();
  }, []);

  const value = useMemo(() => ({
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    batchUncompleteTasks,
    refresh: () => fetchTasks(false)
  }), [
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    batchUncompleteTasks,
    fetchTasks
  ]);

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasksContext = () => {
  const context = useContext(TasksContext);
  return context;
};
