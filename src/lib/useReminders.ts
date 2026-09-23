import { useRemindersContext } from '../contexts/RemindersContext';

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
  const context = useRemindersContext();
  if (!context) {
    throw new Error('useReminders must be used within a RemindersProvider');
  }
  return context;
};
