import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Quote {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
}

const seedingUsers = new Set<string>();

export const useQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isFetchingRef = useRef(false);

  const fetchQuotes = useCallback(async () => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }
    
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const { data, error } = await supabase
        .from('motivational_quotes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching quotes from Neon:', error);
      } else {
        if (data && data.length === 0 && !seedingUsers.has(user.id)) {
          seedingUsers.add(user.id);
          // If no quotes exist, populate with defaults
          const defaultQuotes = [
            { user_id: user.id, text: "Hope." },
            { user_id: user.id, text: "With great power comes great responsibility." },
            { user_id: user.id, text: "Be 1% better than yesterday." }
          ];
          
          const { data: insertedData, error: insertError } = await supabase
            .from('motivational_quotes')
            .insert(defaultQuotes)
            .select();
            
          if (insertError) {
            console.error('Error inserting default quotes:', insertError);
          } else if (insertedData) {
            setQuotes(insertedData as Quote[]);
          }
        } else if (data) {
          // Deduplicate quotes by text for clean UI representation
          const uniqueMap = new Map<string, Quote>();
          for (const q of (data as Quote[])) {
            if (q && q.text && !uniqueMap.has(q.text.trim())) {
              uniqueMap.set(q.text.trim(), q);
            }
          }
          setQuotes(Array.from(uniqueMap.values()));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const addQuote = async (text: string) => {
    if (!user || !supabase || !text.trim()) return;
    
    const newQuote = { user_id: user.id, text: text.trim() };
    
    // Optimistic UI update
    const tempId = Date.now().toString();
    setQuotes(prev => [...prev, { ...newQuote, id: tempId, created_at: new Date().toISOString() } as Quote]);

    const { data, error } = await supabase
      .from('motivational_quotes')
      .insert([newQuote])
      .select();

    if (error) {
      console.error('Error adding quote:', error);
      fetchQuotes(); // Revert on error
    } else if (data && data.length > 0) {
      setQuotes(prev => prev.map(q => q.id === tempId ? data[0] : q));
    }
  };

  const updateQuote = async (id: string, text: string) => {
    if (!user || !supabase || !text.trim()) return;

    // Optimistic UI update
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, text: text.trim() } : q));

    const { error } = await supabase
      .from('motivational_quotes')
      .update({ text: text.trim(), updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating quote:', error);
      fetchQuotes(); // Revert on error
    }
  };

  const deleteQuote = async (id: string) => {
    if (!user || !supabase) return;

    // Optimistic UI update
    setQuotes(prev => prev.filter(q => q.id !== id));

    const { error } = await supabase
      .from('motivational_quotes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting quote:', error);
      fetchQuotes(); // Revert on error
    }
  };

  return {
    quotes,
    loading,
    addQuote,
    updateQuote,
    deleteQuote,
    refresh: fetchQuotes
  };
};
