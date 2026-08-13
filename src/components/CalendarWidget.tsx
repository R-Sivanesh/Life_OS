import React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  subMonths, 
  addMonths, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Task } from '../lib/useTasks';
import type { Reminder } from '../lib/useReminders';

interface CalendarWidgetProps {
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  tasks: Task[];
  reminders: Reminder[];
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  currentMonth, setCurrentMonth, selectedDate, setSelectedDate, tasks, reminders
}) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = [];
  let day = startDate;
  while (day <= endDate) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  return (
    <div className="glass-card p-4 md:p-6 border-border">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-surface-elevated rounded-lg text-text-muted transition-colors">
          <ChevronLeft className="w-5 h-5"/>
        </button>
        <h3 className="text-text-primary font-bold text-lg">{format(currentMonth, 'MMMM yyyy')}</h3>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(new Date())} className="text-xs px-3 py-1 rounded bg-surface-elevated hover:bg-border text-text-primary transition-colors">Today</button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-surface-elevated rounded-lg text-text-muted transition-colors">
            <ChevronRight className="w-5 h-5"/>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-text-muted font-medium">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {calendarDays.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentToday = isToday(day);
          
          const dayString = format(day, 'yyyy-MM-dd');
          const hasTasks = tasks.some(t => t.date === dayString && !t.completed);
          const hasReminders = reminders.some(r => r.date === dayString && !r.completed);
          
          return (
            <div 
              key={day.toString()} 
              onClick={() => {
                setSelectedDate(day);
                window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { date: dayString } }));
              }}
              className={cn(
                "aspect-square flex items-center justify-center rounded-full cursor-pointer transition-all relative",
                !isCurrentMonth ? "text-text-muted" : "text-text-cyan hover:bg-surface-elevated",
                isSelected && !isCurrentToday && "bg-surface-elevated border border-border text-text-primary font-bold",
                isCurrentToday && "bg-primary text-white font-bold shadow-glow"
              )}>
              {format(day, 'd')}
              
              <div className="absolute bottom-1 flex gap-0.5">
                {hasTasks && <div className="w-1 h-1 rounded-full bg-success" />}
                {hasReminders && <div className="w-1 h-1 rounded-full bg-warning" />}
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-border flex justify-between text-[10px] text-text-muted">
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-success" /> Task</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-warning" /> Reminder</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-cyan" /> Event</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Journal</span>
      </div>
    </div>
  );
};

export default CalendarWidget;
