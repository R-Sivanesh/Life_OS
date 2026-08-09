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
