import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const openTaskModal = (date?: string) => window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { date } }));
export const openReminderModal = (date?: string) => window.dispatchEvent(new CustomEvent('open-reminder-modal', { detail: { date } }));
