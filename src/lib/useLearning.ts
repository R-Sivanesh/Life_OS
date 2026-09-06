import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';

export interface LearningResource {
  title: string;
  url: string;
}

export type LearningTopic = {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  category?: string;
  priority: string;
  progress: number;
  status: string;
  current_module?: string;
  next_module?: string;
  notes?: string;
  resources?: LearningResource[];
  last_studied_at?: string;
  created_at?: string;
  updated_at?: string;
};

export const useLearning = () => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<LearningTopic[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTopics = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('learning_topics')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching learning topics:', error);
    } else if (data) {
      // Sort by priority then by last studied
      data.sort((a: any, b: any) => {
        const priorityOrder: Record<string, number> = { high: 1, medium: 2, low: 3 };
        const pA = priorityOrder[a.priority?.toLowerCase() || 'medium'] || 2;
        const pB = priorityOrder[b.priority?.toLowerCase() || 'medium'] || 2;
        if (pA !== pB) return pA - pB;
        
        const dateA = new Date(a.last_studied_at || a.updated_at || a.created_at || '2000-01-01').getTime();
        const dateB = new Date(b.last_studied_at || b.updated_at || b.created_at || '2000-01-01').getTime();
        return dateB - dateA; // Descending
      });
      setTopics(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTopics();
    const handleUpdate = () => fetchTopics();
    window.addEventListener('lifeos_learning_updated', handleUpdate);
    return () => window.removeEventListener('lifeos_learning_updated', handleUpdate);
  }, [fetchTopics]);

  const addTopic = async (topicData: Partial<LearningTopic>) => {
    if (!user || !supabase) return;
    const newTopic = {
      ...topicData,
      user_id: user.id,
      progress: topicData.progress || 0,
      status: topicData.status || 'Not Started',
      priority: topicData.priority || 'Medium',
      resources: topicData.resources || []
    };

    const { data, error } = await supabase.from('learning_topics').insert([newTopic]).select();
    if (error) {
      console.error('Error adding learning topic:', error);
      alert('Error saving topic: ' + JSON.stringify(error));
      return null;
    }
    if (data) {
      setTopics(prev => [data[0], ...prev]);
      window.dispatchEvent(new Event('lifeos_learning_updated'));
      return data[0];
    }
  };

  const updateTopic = async (id: string, updates: Partial<LearningTopic>) => {
    if (!supabase) return;
    
    // Ensure we handle completion
    if (updates.progress === 100) {
      updates.status = 'Completed';
    }

    const { error } = await supabase.from('learning_topics').update(updates).eq('id', id);
    if (error) {
      console.error('Error updating topic:', error);
      return false;
    }
    
    setTopics(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    return true;
  };

  const deleteTopic = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('learning_topics').delete().eq('id', id);
    if (!error) {
      setTopics(prev => prev.filter(t => t.id !== id));
      return true;
    }
    console.error('Error deleting topic:', error);
    return false;
  };

  return {
    topics,
    loading,
    addTopic,
    updateTopic,
    deleteTopic,
    refresh: fetchTopics
  };
};
