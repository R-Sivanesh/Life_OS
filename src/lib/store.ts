import { supabase } from './supabase';

export const store = {
  async select(tableName: string) {
    if (!supabase) throw new Error('Supabase not connected');
    const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insert(tableName: string, item: any) {
    if (!supabase) throw new Error('Supabase not connected');
    const newItem = {
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...item,
    };
    const { data, error } = await supabase.from(tableName).insert([newItem]).select();
    if (error) throw error;
    return data ? data[0] : null;
  },

  async update(tableName: string, id: string, updates: any) {
    if (!supabase) throw new Error('Supabase not connected');
    updates.updated_at = new Date().toISOString();
    const { error } = await supabase.from(tableName).update(updates).eq('id', id);
    if (error) throw error;
    return true;
  },

  async delete(tableName: string, id: string) {
    if (!supabase) throw new Error('Supabase not connected');
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
