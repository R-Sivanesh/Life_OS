import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Reminder } from '../lib/useReminders';

interface RemindersContextType {
  reminders: Reminder[];
  loading: boolean;
  addReminder: (reminderData: Partial<Reminder>) => Promise<Reminder | undefined>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  completeReminder: (id: string) => Promise<void>;
  uncompleteReminder: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const RemindersContext = createContext<RemindersContextType | undefined>(undefined);

export const sortReminders = (a: Reminder, b: Reminder) => {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  if (!a.time && b.time) return 1;
  if (!a.time && !b.time) return 0;
  if (a.time && !b.time) return -1;
  return a.time!.localeCompare(b.time!);
};

export const RemindersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const remindersRef = useRef<Reminder[]>([]);
  remindersRef.current = reminders;

  const fetchReminders = useCallback(async (isInitial = false) => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }

    if (isInitial && remindersRef.current.length === 0) {
      setLoading(true);
    }
    
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
        
      if (!error && data) {
        setReminders(data);
      }
    } catch (err) {
      console.error('Error fetching reminders:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReminders(true);
  }, [fetchReminders]);

  // OPTIMISTIC ADD REMINDER
  const addReminder = useCallback(async (reminderData: Partial<Reminder>): Promise<Reminder | undefined> => {
    if (!user || !supabase) return;

    const tempId = `temp_rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticReminder: Reminder = {
      id: tempId,
      user_id: user.id,
      title: reminderData.title || '',
      description: reminderData.description || '',
      date: reminderData.date || new Date().toISOString().slice(0, 10),
      time: reminderData.time,
      priority: reminderData.priority || 'medium',
      recurring: reminderData.recurring,
      completed: false,
      ...reminderData
    };

    // 1. Immediate local update
    setReminders(prev => [...prev, optimisticReminder].sort(sortReminders));

    // 2. Background database insert
    (async () => {
      try {
        const payload: any = {
          ...reminderData,
          user_id: user.id,
          completed: false
        };
        delete payload.id;
        delete payload._type;

        const { data, error } = await supabase.from('reminders').insert([payload]).select();
        if (error) {
          console.error('Error inserting reminder in background:', error);
          setReminders(prev => prev.filter(r => r.id !== tempId));
        } else if (data && data.length > 0) {
          setReminders(prev => prev.map(r => r.id === tempId ? data[0] : r).sort(sortReminders));
        }
      } catch (err) {
        console.error('Network error inserting reminder:', err);
        setReminders(prev => prev.filter(r => r.id !== tempId));
      }
    })();

    return optimisticReminder;
  }, [user]);

  // OPTIMISTIC UPDATE REMINDER
  const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
    if (!supabase) return;

    const prevReminder = remindersRef.current.find(r => r.id === id);
    if (!prevReminder) return;

    const sanitizedUpdates = { ...updates };
    delete (sanitizedUpdates as any)._type;

    const updatedReminder: Reminder = {
      ...prevReminder,
      ...sanitizedUpdates
    };

    // 1. Immediate local update
    setReminders(prev => prev.map(r => r.id === id ? updatedReminder : r).sort(sortReminders));

    // 2. Background database sync
    (async () => {
      try {
        const { error } = await supabase.from('reminders').update(sanitizedUpdates).eq('id', id);
        if (error) {
          console.error('Error updating reminder in background:', error);
          setReminders(prev => prev.map(r => r.id === id ? prevReminder : r).sort(sortReminders));
        }
      } catch (err) {
        console.error('Network error updating reminder:', err);
        setReminders(prev => prev.map(r => r.id === id ? prevReminder : r).sort(sortReminders));
      }
    })();
  }, []);

  // OPTIMISTIC DELETE REMINDER
  const deleteReminder = useCallback(async (id: string) => {
    if (!supabase) return;

    const prevReminder = remindersRef.current.find(r => r.id === id);

    // 1. Immediate local update
    setReminders(prev => prev.filter(r => r.id !== id));

    // 2. Background database delete
    (async () => {
      try {
        const { error } = await supabase.from('reminders').delete().eq('id', id);
        if (error) {
          console.error('Error deleting reminder in background:', error);
          if (prevReminder) {
            setReminders(prev => [...prev, prevReminder].sort(sortReminders));
          }
        }
      } catch (err) {
        console.error('Network error deleting reminder:', err);
        if (prevReminder) {
          setReminders(prev => [...prev, prevReminder].sort(sortReminders));
        }
      }
    })();
  }, []);

  // OPTIMISTIC COMPLETE REMINDER
  const completeReminder = useCallback(async (id: string) => {
    await updateReminder(id, { completed: true });
  }, [updateReminder]);

  // OPTIMISTIC UNCOMPLETE REMINDER
  const uncompleteReminder = useCallback(async (id: string) => {
    await updateReminder(id, { completed: false });
  }, [updateReminder]);

  const value = useMemo(() => ({
    reminders,
    loading,
    addReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    uncompleteReminder,
    refresh: () => fetchReminders(false)
  }), [
    reminders,
    loading,
    addReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    uncompleteReminder,
    fetchReminders
  ]);

  return (
    <RemindersContext.Provider value={value}>
      {children}
    </RemindersContext.Provider>
  );
};

export const useRemindersContext = () => {
  const context = useContext(RemindersContext);
  return context;
};
