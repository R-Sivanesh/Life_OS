import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';

export type Reminder = {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  priority: string;
  recurring?: string;
  completed: boolean;
};

export const useReminders = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });
      
    if (!error && data) {
      setReminders(data);
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const addReminder = async (reminderData: Partial<Reminder>) => {
    if (!user || !supabase) return;
    const newReminder = {
      ...reminderData,
      user_id: user.id,
      completed: false
    };

    const { data, error } = await supabase.from('reminders').insert([newReminder]).select();
    if (!error && data) {
      setReminders(prev => [...prev, data[0]]);
      return data[0];
    }
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    if (!supabase) return;
    const { error } = await supabase.from('reminders').update(updates).eq('id', id);
    if (!error) {
      setReminders(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    }
  };

  const deleteReminder = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (!error) {
      setReminders(prev => prev.filter(r => r.id !== id));
    }
  };

  const completeReminder = async (id: string) => {
    await updateReminder(id, { completed: true });
  };

  const uncompleteReminder = async (id: string) => {
    await updateReminder(id, { completed: false });
  };

  return {
    reminders,
    loading,
    addReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    uncompleteReminder,
    refresh: fetchReminders
  };
};
