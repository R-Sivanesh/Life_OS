import { useState, useCallback, useEffect } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Quote {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export const useQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchQuotes = useCallback(async () => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('motivational_quotes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching quotes:', error);
      } else {
        if (data && data.length === 0) {
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
        } else {
          setQuotes((data as Quote[]) || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const addQuote = async (text: string) => {
    if (!user || !supabase) return;
    
    const newQuote = { user_id: user.id, text };
    
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
    } else if (data) {
      setQuotes(prev => prev.map(q => q.id === tempId ? data[0] : q));
    }
  };

  const updateQuote = async (id: string, text: string) => {
    if (!user || !supabase) return;

    // Optimistic UI update
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, text } : q));

    const { error } = await supabase
      .from('motivational_quotes')
      .update({ text, updated_at: new Date().toISOString() })
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
