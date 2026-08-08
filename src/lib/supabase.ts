import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('lifeos_supabase_url') || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('lifeos_supabase_key') || '';

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
