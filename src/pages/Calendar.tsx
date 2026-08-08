import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, subMonths, addMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Check, Plus, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTasks } from '../lib/useTasks';
import { useReminders } from '../lib/useReminders';

const Calendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { tasks, completeTask, uncompleteTask, refresh: refreshTasks } = useTasks();
  const { reminders, refresh: refreshReminders } = useReminders();

  useEffect(() => {
    refreshTasks();
    refreshReminders();
  }, [refreshTasks, refreshReminders]);

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

  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const selectedTasks = tasks.filter(t => t.date === selectedDateString);
  const selectedReminders = reminders.filter(r => r.date === selectedDateString);

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full max-w-[1600px] mx-auto pb-12 h-full">
      {/* Main Calendar View */}
      <div className="glass-card flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center bg-surfaceHighlight/30">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-100">{format(currentMonth, 'MMMM yyyy')}</h2>
            <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-surfaceHighlight rounded-lg text-gray-400 transition-colors">
                <ChevronLeft className="w-5 h-5"/>
              </button>
              <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-sm font-medium rounded-lg bg-surfaceHighlight hover:bg-border text-gray-100 transition-colors">
                Today
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-surfaceHighlight rounded-lg text-gray-400 transition-colors">
                <ChevronRight className="w-5 h-5"/>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-7 border-b border-border bg-surfaceHighlight/10">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 flex-1 auto-rows-fr">
            {calendarDays.map(day => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentToday = isToday(day);
              const dayString = format(day, 'yyyy-MM-dd');
              const dayTasks = tasks.filter(t => t.date === dayString && !t.completed);
              const dayReminders = reminders.filter(r => r.date === dayString && !r.completed);

              return (
                <div
                  key={day.toString()}
                  onClick={() => {
                    setSelectedDate(day);
                    window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { date: dayString } }));
                  }}
                  className={cn(
                    "min-h-[100px] border-r border-b border-border/50 p-2 cursor-pointer transition-colors hover:bg-surfaceHighlight/30 flex flex-col gap-1 relative group",
                    !isCurrentMonth ? "bg-background/30" : "",
                    isSelected ? "bg-primary/10 border-primary/30" : ""
                  )}
                >
                  <span className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ml-auto",
                    isCurrentToday ? "bg-primary text-white shadow-glow" : !isCurrentMonth ? "text-gray-600" : "text-gray-300",
                    isSelected && !isCurrentToday ? "border border-border text-gray-100 bg-surfaceHighlight" : ""
                  )}>
                    {format(day, 'd')}
                  </span>

                  <div className="flex-1 overflow-y-auto space-y-1 mt-1 no-scrollbar pr-1">
                    {dayTasks.map(t => (
                      <div key={t.id} className="text-[10px] truncate px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                        {t.title}
                      </div>
                    ))}
                    {dayReminders.map(r => (
                      <div key={r.id} className="text-[10px] truncate px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                        {r.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Date Details */}
      <div className="w-full xl:w-96 flex flex-col gap-6 h-[calc(100vh-8rem)]">
        <div className="glass-card flex-1 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-border bg-surfaceHighlight/30">
            <h3 className="text-xl font-bold text-gray-100">{format(selectedDate, 'EEEE, MMMM d')}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {selectedTasks.length} tasks, {selectedReminders.length} reminders
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tasks</h4>
              <div className="space-y-2">
                {selectedTasks.length > 0 ? selectedTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl bg-surfaceHighlight border border-border">
                    <button 
                      onClick={() => task.completed ? uncompleteTask(task.id) : completeTask(task.id)}
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center border transition-colors mt-0.5",
                        task.completed ? "bg-accent border-accent text-background" : "border-gray-500 hover:border-accent text-transparent hover:text-accent/50"
                      )}
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate transition-colors", task.completed ? "text-gray-500 line-through" : "text-gray-100")}>{task.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{task.start_time || '--:--'} - {task.category}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 text-center py-4">No tasks.</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Reminders</h4>
              <div className="space-y-2">
                {selectedReminders.length > 0 ? selectedReminders.map(rem => (
                  <div key={rem.id} className="flex items-start gap-3 p-3 rounded-xl bg-surfaceHighlight border border-border">
                    <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0 text-warning mt-0.5">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-100 truncate">{rem.title}</h4>
                      <p className="text-xs text-gray-500">{rem.time}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 text-center py-4">No reminders.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
