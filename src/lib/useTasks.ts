import { useTasksContext } from '../contexts/TasksContext';

export type Task = {
  id: string;
  user_id?: string;
  recurring?: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  points?: number;
  progress?: number;
  date?: string;
  start_time?: string | null;
  end_time?: string | null;
  estimated_minutes?: number;
  actual_minutes?: number;
  completed: boolean;
  completed_at?: string;
  xp_reward?: number;
  status: string;
};

export const useTasks = () => {
  const context = useTasksContext();
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
};
