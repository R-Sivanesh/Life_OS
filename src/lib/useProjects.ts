import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectStatus = 'Idea' | 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Archived';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon?: string;
  cover_color?: string;
  status: ProjectStatus;
  repo_url?: string;
  demo_url?: string;
  doc_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  content: string;
  category: string; // 'Technical' | 'Bugs' | 'Solutions' | 'Decisions' | 'Setup' | 'General'
  created_at: string;
  updated_at: string;
}

export interface ProjectExperiment {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  objective?: string;
  hypothesis?: string;
  steps?: string;
  result?: string;
  status: string; // 'Pending' | 'Pass' | 'Fail' | 'Inconclusive'
  errors?: string;
  conclusion?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectBuiltFeature {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description?: string;
  completion_date?: string;
  implementation_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectIdea {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description?: string;
  why_useful?: string;
  priority: string; // 'Low' | 'Medium' | 'High'
  dependencies?: string;
  status: string; // 'Idea' | 'Planned' | 'In Progress' | 'Done'
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectLearning {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  notes?: string;
  resources?: string;
  status: string; // 'Not Started' | 'Learning' | 'Practising' | 'Mastered'
  next_task?: string;
  list_type: string; // 'learned' | 'to_learn'
  created_at: string;
  updated_at: string;
}

export interface ProjectReminder {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  recurring?: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectLink {
  id: string;
  project_id: string;
  user_id: string;
  label: string;
  url: string;
  link_type: string; // 'github' | 'deployment' | 'docs' | 'design' | 'other'
  created_at: string;
}

export interface ProjectProCon {
  id: string;
  project_id: string;
  user_id: string;
  entry_type: string; // 'pro' | 'con' | 'risk' | 'tradeoff'
  title: string;
  explanation?: string;
  created_at: string;
  updated_at: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Projects ──────────────────────────────────────────────────────────────

  const fetchProjects = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
    } else if (data) {
      setProjects(data as Project[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProjects();
    const handleUpdate = () => fetchProjects();
    window.addEventListener('lifeos_projects_updated', handleUpdate);
    return () => window.removeEventListener('lifeos_projects_updated', handleUpdate);
  }, [fetchProjects]);

  const addProject = async (data: Partial<Project>): Promise<Project | null> => {
    if (!user || !supabase) return null;
    const payload = {
      ...data,
      user_id: user.id,
      status: data.status || 'Idea',
    };

    const { data: inserted, error } = await supabase
      .from('projects')
      .insert([payload])
      .select();

    if (error) {
      console.error('Error adding project:', error);
      return null;
    }
    if (inserted && inserted[0]) {
      setProjects(prev => [inserted[0] as Project, ...prev]);
      window.dispatchEvent(new Event('lifeos_projects_updated'));
      return inserted[0] as Project;
    }
    return null;
  };

  const updateProject = async (id: string, updates: Partial<Project>): Promise<boolean> => {
    if (!user || !supabase) return false;
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('projects').update(payload).eq('id', id);
    if (error) {
      console.error('Error updating project:', error);
      return false;
    }
    setProjects(prev =>
      prev.map(p => (p.id === id ? { ...p, ...payload } : p))
    );
    window.dispatchEvent(new Event('lifeos_projects_updated'));
    return true;
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    if (!user || !supabase) return false;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error('Error deleting project:', error);
      return false;
    }
    setProjects(prev => prev.filter(p => p.id !== id));
    window.dispatchEvent(new Event('lifeos_projects_updated'));
    return true;
  };

  // ── Notes ─────────────────────────────────────────────────────────────────

  const getNotes = async (projectId: string): Promise<ProjectNote[]> => {
    if (!user || !supabase) return [];
    const { data, error } = await supabase
      .from('project_notes')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching project notes:', error);
      return [];
    }
    return (data as ProjectNote[]) || [];
  };

  const addNote = async (data: Partial<ProjectNote>): Promise<ProjectNote | null> => {
    if (!user || !supabase) return null;
    const payload = {
      ...data,
      user_id: user.id,
      content: data.content ?? '',
      category: data.category || 'General',
    };

    const { data: inserted, error } = await supabase
      .from('project_notes')
      .insert([payload])
      .select();

    if (error) {
      console.error('Error adding project note:', error);
      return null;
    }
    return inserted?.[0] as ProjectNote ?? null;
  };

  const updateNote = async (id: string, updates: Partial<ProjectNote>): Promise<boolean> => {
    if (!user || !supabase) return false;
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('project_notes').update(payload).eq('id', id);
    if (error) {
      console.error('Error updating project note:', error);
      return false;
    }
    return true;
  };

  const deleteNote = async (id: string): Promise<boolean> => {
    if (!user || !supabase) return false;
    const { error } = await supabase.from('project_notes').delete().eq('id', id);
    if (error) {
      console.error('Error deleting project note:', error);
      return false;
    }
    return true;
  };

  // ── Experiments ───────────────────────────────────────────────────────────

  const getExperiments = async (projectId: string): Promise<ProjectExperiment[]> => {
    if (!user || !supabase) return [];
    const { data, error } = await supabase
      .from('project_experiments')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching experiments:', error);
      return [];
    }
    return (data as ProjectExperiment[]) || [];
  };

  const addExperiment = async (data: Partial<ProjectExperiment>): Promise<ProjectExperiment | null> => {
    if (!user || !supabase) return null;
    const payload = {
      ...data,
      user_id: user.id,
      status: data.status || 'Pending',
    };

    const { data: inserted, error } = await supabase
      .from('project_experiments')
      .insert([payload])
      .select();

    if (error) {
      console.error('Error adding experiment:', error);
      return null;
    }
    return inserted?.[0] as ProjectExperiment ?? null;
  };

  const updateExperiment = async (id: string, updates: Partial<ProjectExperiment>): Promise<boolean> => {
    if (!user || !supabase) return false;
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('project_experiments').update(payload).eq('id', id);
    if (error) {
      console.error('Error updating experiment:', error);
      return false;
    }
    return true;
  };

  const deleteExperiment = async (id: string): Promise<boolean> => {
    if (!user || !supabase) return false;
    const { error } = await supabase.from('project_experiments').delete().eq('id', id);
    if (error) {
      console.error('Error deleting experiment:', error);
      return false;
    }
    return true;
  };

  // ── Built Features ────────────────────────────────────────────────────────

  const getBuiltFeatures = async (projectId: string): Promise<ProjectBuiltFeature[]> => {
    if (!user || !supabase) return [];
    const { data, error } = await supabase
      .from('project_built_features')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching built features:', error);
      return [];
    }
    return (data as ProjectBuiltFeature[]) || [];
  };

  const addBuiltFeature = async (data: Partial<ProjectBuiltFeature>): Promise<ProjectBuiltFeature | null> => {
    if (!user || !supabase) return null;
    const payload = { ...data, user_id: user.id };

    const { data: inserted, error } = await supabase
      .from('project_built_features')
      .insert([payload])
      .select();

    if (error) {
      console.error('Error adding built feature:', error);
      return null;
    }
    return inserted?.[0] as ProjectBuiltFeature ?? null;
  };

  const updateBuiltFeature = async (id: string, updates: Partial<ProjectBuiltFeature>): Promise<boolean> => {
    if (!user || !supabase) return false;
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('project_built_features').update(payload).eq('id', id);
    if (error) {
      console.error('Error updating built feature:', error);
      return false;
    }
    return true;
  };

  const deleteBuiltFeature = async (id: string): Promise<boolean> => {
    if (!user || !supabase) return false;
    const { error } = await supabase.from('project_built_features').delete().eq('id', id);
    if (error) {
      console.error('Error deleting built feature:', error);
      return false;
    }
    return true;
  };

  // ── Ideas ─────────────────────────────────────────────────────────────────

  const getIdeas = async (projectId: string): Promise<ProjectIdea[]> => {
    if (!user || !supabase) return [];
    const { data, error } = await supabase
      .from('project_ideas')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching ideas:', error);
      return [];
    }
    return (data as ProjectIdea[]) || [];
  };

  const addIdea = async (data: Partial<ProjectIdea>): Promise<ProjectIdea | null> => {
    if (!user || !supabase) return null;
    const payload = {
      ...data,
      user_id: user.id,
      priority: data.priority || 'Medium',
      status: data.status || 'Idea',
      order_index: data.order_index ?? 0,
    };

    const { data: inserted, error } = await supabase
      .from('project_ideas')
      .insert([payload])
      .select();

    if (error) {
      console.error('Error adding idea:', error);
      return null;
    }
    return inserted?.[0] as ProjectIdea ?? null;
  };

  const updateIdea = async (id: string, updates: Partial<ProjectIdea>): Promise<boolean> => {
    if (!user || !supabase) return false;
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('project_ideas').update(payload).eq('id', id);
    if (error) {
      console.error('Error updating idea:', error);
      return false;
    }
    return true;
  };

  const deleteIdea = async (id: string): Promise<boolean> => {
    if (!user || !supabase) return false;
    const { error } = await supabase.from('project_ideas').delete().eq('id', id);
    if (error) {
      console.error('Error deleting idea:', error);
      return false;
    }
    return true;
  };

  // ── Learning ──────────────────────────────────────────────────────────────

  const getLearningItems = async (projectId: string): Promise<ProjectLearning[]> => {
    if (!user || !supabase) return [];
    const { data, error } = await supabase
      .from('project_learning')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching project learning items:', error);
      return [];
    }
    return (data as ProjectLearning[]) || [];
  };

  const addLearningItem = async (data: Partial<ProjectLearning>): Promise<ProjectLearning | null> => {
    if (!user || !supabase) return null;
    const payload = {
      ...data,
      user_id: user.id,
      status: data.status || 'Not Started',
      list_type: data.list_type || 'to_learn',
    };

    const { data: inserted, error } = await supabase
      .from('project_learning')
      .insert([payload])
      .select();

    if (error) {
      console.error('Error adding project learning item:', error);
      return null;
    }
    return inserted?.[0] as ProjectLearning ?? null;
  };

  const updateLearningItem = async (id: string, updates: Partial<ProjectLearning>): Promise<boolean> => {
    if (!user || !supabase) return false;
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('project_learning').update(payload).eq('id', id);
    if (error) {
      console.error('Error updating project learning item:', error);
      return false;
    }
    return true;
  };

  const deleteLearningItem = async (id: string): Promise<boolean> => {
    if (!user || !supabase) return false;
    const { error } = await supabase.from('project_learning').delete().eq('id', id);
    if (error) {
      console.error('Error deleting project learning item:', error);
      return false;
    }
    return true;
  };

  // ── Reminders ─────────────────────────────────────────────────────────────

  const getProjectReminders = async (projectId: string): Promise<ProjectReminder[]> => {
    if (!user || !supabase) return [];
    const { data, error } = await supabase
      .from('project_reminders')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching project reminders:', error);
      return [];
    }
    return (data as ProjectReminder[]) || [];
  };

  const addProjectReminder = async (data: Partial<ProjectReminder>): Promise<ProjectReminder | null> => {
    if (!user || !supabase) return null;
    const payload = {
      ...data,
      user_id: user.id,
      completed: data.completed ?? false,
    };

    const { data: inserted, error } = await supabase
      .from('project_reminders')
      .insert([payload])
      .select();

    if (error) {
      console.error('Error adding project reminder:', error);
      return null;
    }
    return inserted?.[0] as ProjectReminder ?? null;
  };

  const updateProjectReminder = async (id: string, updates: Partial<ProjectReminder>): Promise<boolean> => {
    if (!user || !supabase) return false;
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('project_reminders').update(payload).eq('id', id);
    if (error) {
      console.error('Error updating project reminder:', error);
      return false;
    }
    return true;
  };

  const deleteProjectReminder = async (id: string): Promise<boolean> => {
    if (!user || !supabase) return false;
    const { error } = await supabase.from('project_reminders').delete().eq('id', id);
    if (error) {
      console.error('Error deleting project reminder:', error);
      return false;
    }
    return true;
  };

  const getAllUpcomingReminders = async (): Promise<(ProjectReminder & { project_name: string })[]> => {
    if (!user || !supabase) return [];

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const [remindersResult, projectsResult] = await Promise.all([
      supabase
        .from('project_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .gte('date', today)
        .order('date', { ascending: true }),
      supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id),
    ]);

    if (remindersResult.error) {
      console.error('Error fetching upcoming reminders:', remindersResult.error);
      return [];
    }
    if (projectsResult.error) {
      console.error('Error fetching projects for reminders:', projectsResult.error);
      return [];
    }

    const projectMap = new Map<string, string>(
      (projectsResult.data || []).map((p: { id: string; name: string }) => [p.id, p.name])
    );

    return ((remindersResult.data as ProjectReminder[]) || []).map(reminder => ({
      ...reminder,
      project_name: projectMap.get(reminder.project_id) || 'Unknown Project',
    }));
  };

  // ── Links ─────────────────────────────────────────────────────────────────

  const getLinks = async (projectId: string): Promise<ProjectLink[]> => {
    if (!user || !supabase) return [];
    const { data, error } = await supabase
      .from('project_links')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching project links:', error);
      return [];
    }
    return (data as ProjectLink[]) || [];
  };

  const addLink = async (data: Partial<ProjectLink>): Promise<ProjectLink | null> => {
    if (!user || !supabase) return null;
    const payload = {
      ...data,
      user_id: user.id,
      link_type: data.link_type || 'other',
    };

    const { data: inserted, error } = await supabase
      .from('project_links')
      .insert([payload])
      .select();

    if (error) {
      console.error('Error adding project link:', error);
      return null;
    }
    return inserted?.[0] as ProjectLink ?? null;
  };

  const updateLink = async (id: string, updates: Partial<ProjectLink>): Promise<boolean> => {
    if (!user || !supabase) return false;
    const { error } = await supabase.from('project_links').update(updates).eq('id', id);
    if (error) {
      console.error('Error updating project link:', error);
      return false;
    }
    return true;
  };

  const deleteLink = async (id: string): Promise<boolean> => {
    if (!user || !supabase) return false;
    const { error } = await supabase.from('project_links').delete().eq('id', id);
    if (error) {
      console.error('Error deleting project link:', error);
      return false;
    }
    return true;
  };

  // ── Pros / Cons ───────────────────────────────────────────────────────────

  const getProsCons = async (projectId: string): Promise<ProjectProCon[]> => {
    if (!user || !supabase) return [];
    const { data, error } = await supabase
      .from('project_pros_cons')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pros/cons:', error);
      return [];
    }
    return (data as ProjectProCon[]) || [];
  };

  const addProCon = async (data: Partial<ProjectProCon>): Promise<ProjectProCon | null> => {
    if (!user || !supabase) return null;
    const payload = { ...data, user_id: user.id };

    const { data: inserted, error } = await supabase
      .from('project_pros_cons')
      .insert([payload])
      .select();

    if (error) {
      console.error('Error adding pro/con:', error);
      return null;
    }
    return inserted?.[0] as ProjectProCon ?? null;
  };

  const updateProCon = async (id: string, updates: Partial<ProjectProCon>): Promise<boolean> => {
    if (!user || !supabase) return false;
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('project_pros_cons').update(payload).eq('id', id);
    if (error) {
      console.error('Error updating pro/con:', error);
      return false;
    }
    return true;
  };

  const deleteProCon = async (id: string): Promise<boolean> => {
    if (!user || !supabase) return false;
    const { error } = await supabase.from('project_pros_cons').delete().eq('id', id);
    if (error) {
      console.error('Error deleting pro/con:', error);
      return false;
    }
    return true;
  };

  // ─── Return ───────────────────────────────────────────────────────────────

  return {
    projects,
    loading,
    addProject,
    updateProject,
    deleteProject,
    refresh: fetchProjects,

    // Notes
    getNotes,
    addNote,
    updateNote,
    deleteNote,

    // Experiments
    getExperiments,
    addExperiment,
    updateExperiment,
    deleteExperiment,

    // Built features
    getBuiltFeatures,
    addBuiltFeature,
    updateBuiltFeature,
    deleteBuiltFeature,

    // Ideas
    getIdeas,
    addIdea,
    updateIdea,
    deleteIdea,

    // Learning
    getLearningItems,
    addLearningItem,
    updateLearningItem,
    deleteLearningItem,

    // Reminders
    getProjectReminders,
    addProjectReminder,
    updateProjectReminder,
    deleteProjectReminder,
    getAllUpcomingReminders,

    // Links
    getLinks,
    addLink,
    updateLink,
    deleteLink,

    // Pros/Cons
    getProsCons,
    addProCon,
    updateProCon,
    deleteProCon,
  };
};
