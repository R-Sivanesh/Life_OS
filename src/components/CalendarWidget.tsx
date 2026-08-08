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
    <div className="glass-card p-6 border-border">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-surfaceHighlight rounded-lg text-gray-500 transition-colors">
          <ChevronLeft className="w-5 h-5"/>
        </button>
        <h3 className="text-gray-100 font-bold text-lg">{format(currentMonth, 'MMMM yyyy')}</h3>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(new Date())} className="text-xs px-3 py-1 rounded bg-surfaceHighlight hover:bg-border text-gray-100 transition-colors">Today</button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-surfaceHighlight rounded-lg text-gray-500 transition-colors">
            <ChevronRight className="w-5 h-5"/>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-gray-500 font-medium">
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
                !isCurrentMonth ? "text-gray-600" : "text-gray-300 hover:bg-surfaceHighlight",
                isSelected && !isCurrentToday && "bg-surfaceHighlight border border-border text-gray-100 font-bold",
                isCurrentToday && "bg-primary text-white font-bold shadow-glow"
              )}>
              {format(day, 'd')}
              
              <div className="absolute bottom-1 flex gap-0.5">
                {hasTasks && <div className="w-1 h-1 rounded-full bg-accent" />}
                {hasReminders && <div className="w-1 h-1 rounded-full bg-warning" />}
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-border flex justify-between text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Task</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-warning" /> Reminder</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-secondary" /> Event</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Journal</span>
      </div>
    </div>
  );
};

export default CalendarWidget;
