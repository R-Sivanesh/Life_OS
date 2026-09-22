import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const openTaskModal = (date?: string, task?: any) => window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { date, task } }));
export const openReminderModal = (date?: string, reminder?: any) => window.dispatchEvent(new CustomEvent('open-reminder-modal', { detail: { date, reminder } }));

export const formatTimeDisplay = (timeString?: string | null): string => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  if (!hours || !minutes) return timeString;
  
  const h = parseInt(hours, 10);
  const m = minutes;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 || 12;
  
  return `${displayHours}:${m} ${ampm}`;
};

export const formatTaskTimeRange = (start?: string | null, end?: string | null): string => {
  if (!start) return 'No specific time';
  const startStr = formatTimeDisplay(start);
  if (!end) return startStr;
  return `${startStr} - ${formatTimeDisplay(end)}`;
};

export const getPriorityWeight = (priority?: string): number => {
  const p = (priority || '').toLowerCase().trim();
  if (p === 'high') return 3;
  if (p === 'medium') return 2;
  if (p === 'low') return 1;
  return 2;
};

export interface WeightedProgressStats {
  percentage: number;
  totalPoints: number;
  completedPoints: number;
  high: { completed: number; total: number; points: number; totalPoints: number };
  medium: { completed: number; total: number; points: number; totalPoints: number };
  low: { completed: number; total: number; points: number; totalPoints: number };
  totalTasks: number;
  completedTasks: number;
}

export const calculateWeightedProgress = (tasks: any[]): WeightedProgressStats => {
  if (!tasks || tasks.length === 0) {
    return {
      percentage: 0,
      totalPoints: 0,
      completedPoints: 0,
      high: { completed: 0, total: 0, points: 0, totalPoints: 0 },
      medium: { completed: 0, total: 0, points: 0, totalPoints: 0 },
      low: { completed: 0, total: 0, points: 0, totalPoints: 0 },
      totalTasks: 0,
      completedTasks: 0,
    };
  }

  let totalPoints = 0;
  let completedPoints = 0;
  let completedTasks = 0;

  const high = { completed: 0, total: 0, points: 0, totalPoints: 0 };
  const medium = { completed: 0, total: 0, points: 0, totalPoints: 0 };
  const low = { completed: 0, total: 0, points: 0, totalPoints: 0 };

  tasks.forEach((task) => {
    const p = (task.priority || 'medium').toLowerCase().trim();
    const weight = getPriorityWeight(p);
    totalPoints += weight;

    const isCompleted = Boolean(task.completed);
    if (isCompleted) {
      completedTasks += 1;
      completedPoints += weight;
    }

    if (p === 'high') {
      high.total += 1;
      high.totalPoints += weight;
      if (isCompleted) {
        high.completed += 1;
        high.points += weight;
      }
    } else if (p === 'low') {
      low.total += 1;
      low.totalPoints += weight;
      if (isCompleted) {
        low.completed += 1;
        low.points += weight;
      }
    } else {
      medium.total += 1;
      medium.totalPoints += weight;
      if (isCompleted) {
        medium.completed += 1;
        medium.points += weight;
      }
    }
  });

  const percentage = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  return {
    percentage,
    totalPoints,
    completedPoints,
    high,
    medium,
    low,
    totalTasks: tasks.length,
    completedTasks,
  };
};

export const calculateProductivity = (tasks: any[], useWeighted: boolean = false): number => {
  if (!tasks || tasks.length === 0) return 0;
  if (useWeighted) {
    return calculateWeightedProgress(tasks).percentage;
  }
  const completed = tasks.filter(t => t.completed).length;
  return Math.round((completed / tasks.length) * 100);
};

