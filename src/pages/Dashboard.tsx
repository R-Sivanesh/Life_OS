import { useState, useMemo, useEffect } from 'react';
import { Check, Plus, Edit2, Trash2, Bell } from 'lucide-react';
import { cn, openTaskModal } from '../lib/utils';
import { useTasks } from '../lib/useTasks';
import { useReminders } from '../lib/useReminders';
import { useRoutines } from '../lib/useRoutines';
import CalendarWidget from '../components/CalendarWidget';

import { format, isToday } from 'date-fns';

import { syncAllRoutines } from '../lib/routineSync';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { tasks, completeTask, uncompleteTask, deleteTask, refresh: refreshTasks } = useTasks();
  const { reminders, refresh: refreshReminders } = useReminders();
  const { routines } = useRoutines();

  useEffect(() => {
    refreshTasks();
    refreshReminders();
  }, [refreshTasks, refreshReminders]);

  useEffect(() => {
    // Automatically sync routines to tasks once per day
    if (routines.length > 0 && user) {
      const todayStr = new Date().toISOString().split('T')[0];
      const flagKey = `lifeos_routines_synced_${user.id}_${todayStr}`;
      if (!localStorage.getItem(flagKey)) {
        syncAllRoutines(routines, user.id).then(() => {
          localStorage.setItem(flagKey, 'true');
          window.dispatchEvent(new Event('lifeos_tasks_updated'));
        });
      }
    }
  }, [routines, user]);

  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const todayString = format(new Date(), 'yyyy-MM-dd');

  // Stats calculation
  const todayTasks = useMemo(() => {
    return tasks.filter(t => t.date === todayString);
  }, [tasks, todayString]);

  const completedToday = todayTasks.filter(t => t.completed).length;
  const totalToday = todayTasks.length;
  const progressPercent = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;


  // Selected date tasks/reminders
  const selectedDateTasks = tasks.filter(t => t.date === selectedDateString).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  const upcomingReminders = reminders.filter(r => r.date >= todayString && !r.completed).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time || '').localeCompare(b.time || '');
  }).slice(0, 5);

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-danger bg-danger/10 border-danger/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'low': return 'text-accent bg-accent/10 border-accent/20';
      default: return 'text-gray-400 bg-surfaceHighlight border-border';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'health': return 'text-accent';
      case 'learning': return 'text-primary';
      case 'work': return 'text-secondary';
      case 'personal': return 'text-warning';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 overflow-y-auto">
      {/* Top Stats Row */}
      <div className={cn("glass-card flex items-center justify-between px-8 py-6 transition-all duration-700", progressPercent === 100 && totalToday > 0 ? "border-primary/50 shadow-[0_0_30px_rgba(59,130,246,0.15)]" : "")}>
        {/* Circle Progress */}
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 flex-shrink-0 rounded-full border-[6px] border-surfaceHighlight/40 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute w-[85%] h-[85%] transform -rotate-90 drop-shadow-lg">
              <circle 
                cx="50" cy="50" r="40" 
                fill="transparent" 
                stroke="#0B132B" 
                strokeWidth="8" 
              />
              <circle 
                cx="50" cy="50" r="40" 
                fill="transparent" 
                stroke="#3B82F6" 
                strokeWidth="8" 
                strokeLinecap="round"
                strokeDasharray={251.327}
                strokeDashoffset={251.327 - (progressPercent / 100) * 251.327}
                className="transition-all duration-1000 ease-in-out"
                style={{
                  filter: progressPercent > 0 ? 'drop-shadow(0 0 6px rgba(59,130,246,0.6))' : 'none'
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-gray-100">{progressPercent}%</span>
            </div>
          </div>
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-gray-500 mb-1">Completed</p>
              <p className="text-2xl font-bold text-accent">{completedToday}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Tasks</p>
              <p className="text-2xl font-bold text-secondary">{totalToday}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Remaining</p>
              <p className="text-2xl font-bold text-warning">{totalToday - completedToday}</p>
            </div>
          </div>
        </div>
        
        {/* Horizontal Progress */}
        <div className="w-64">
          <div className={cn("text-xs mb-2 text-right transition-colors duration-500", progressPercent === 100 && totalToday > 0 ? "text-primary font-bold animate-pulse" : "text-gray-400")}>
            {progressPercent === 100 && totalToday > 0 ? "Amazing! All tasks completed today. 🎉" : "Keep going! You're doing great. 🚀"}
          </div>
          <div className="h-2 w-full bg-surfaceHighlight rounded-full overflow-hidden">
            <div className={cn("h-full bg-primary rounded-full transition-all duration-500", progressPercent === 100 && totalToday > 0 ? "shadow-[0_0_15px_rgba(59,130,246,0.8)]" : "shadow-glow")} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Column - Today's Tasks & Reminders */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">
          {/* Today's Tasks */}
          <div className="glass-card flex flex-col overflow-hidden">
            <div className="p-6 border-b border-border/50 flex justify-between items-center">
              <h3 className="text-gray-100 font-bold">Today's Tasks</h3>
              <button onClick={() => openTaskModal(todayString)} className="btn-primary text-xs py-1.5 px-3 rounded-lg shadow-glow flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </div>
            
            <div className="p-4 space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar pr-2">
              {todayTasks.length > 0 ? todayTasks.map(task => (
                <div key={task.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surfaceHighlight/50 transition-colors group border border-transparent">
                  <button 
                    onClick={() => task.completed ? uncompleteTask(task.id) : completeTask(task.id)}
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center border transition-colors shrink-0",
                      task.completed ? "bg-accent border-accent text-background" : "border-gray-500 hover:border-accent text-transparent hover:text-accent/50"
                    )}
                  >
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </button>
                  <div className="flex-1 flex items-center gap-4">
                    <span className={cn("font-medium text-sm transition-colors flex-1", task.completed ? "text-gray-500 line-through" : "text-gray-100")}>
                      {task.title}
                    </span>
                    <span className="w-32 text-xs text-gray-500 text-center">
                      {task.start_time || '--:--'} {task.end_time ? `- ${task.end_time}` : ''}
                    </span>
                    <span className={cn("text-[10px] uppercase font-bold px-3 py-1 rounded-full border w-24 text-center", getCategoryColor(task.category), `border-${getCategoryColor(task.category).split('-')[1]}/30 bg-${getCategoryColor(task.category).split('-')[1]}/10`)}>
                      {task.category}
                    </span>
                    <span className={cn("text-[10px] font-bold w-16 text-center", getPriorityColor(task.priority).split(' ')[0])}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-gray-500 hover:text-primary rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteTask(task.id)} className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )) : (
                <div className="py-8 flex flex-col items-center justify-center text-gray-500">
                  <Check className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No tasks scheduled for today.</p>
                </div>
              )}
              
              <div className="pt-2 text-center">
                <button className="text-xs text-primary hover:text-primary-hover font-medium py-2">
                  View All Tasks &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Upcoming Reminders */}
          <div className="glass-card flex flex-col overflow-hidden">
            <div className="p-6 border-b border-border/50 flex justify-between items-center">
              <h3 className="text-gray-100 font-bold">Upcoming Reminders</h3>
              <button className="text-xs text-primary hover:text-primary-hover font-medium">
                View All &rarr;
              </button>
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingReminders.length > 0 ? upcomingReminders.map(rem => (
                <div key={rem.id} className="flex items-start gap-3 p-4 rounded-xl bg-surfaceHighlight/50 border border-border/50 relative group">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary mt-0.5">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-100 truncate">{rem.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{isToday(new Date(rem.date)) ? 'Today' : format(new Date(rem.date), 'MMM d')}, {rem.time}</p>
                  </div>
                  <span className={cn("text-[10px] uppercase font-bold", getPriorityColor(rem.priority).split(' ')[0])}>
                    {rem.priority}
                  </span>
                  
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-primary transition-all">
                    <div className="flex flex-col gap-0.5">
                      <div className="w-1 h-1 bg-current rounded-full" />
                      <div className="w-1 h-1 bg-current rounded-full" />
                      <div className="w-1 h-1 bg-current rounded-full" />
                    </div>
                  </button>
                </div>
              )) : (
                <div className="col-span-full py-8 text-center text-sm text-gray-500">
                  No upcoming reminders.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Calendar & Reminders */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
          <CalendarWidget 
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            tasks={tasks}
            reminders={reminders}
          />

          {/* Selected Date Details */}
          <div className="glass-card flex-1 flex flex-col overflow-hidden overflow-visible relative">
            <div className="p-6 border-b border-border/50 flex justify-between items-center relative">
              <h3 className="text-gray-100 font-bold">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h3>
              
              <button 
                onClick={() => openTaskModal(selectedDateString)}
                className="btn-primary text-xs py-1.5 px-3 rounded-lg shadow-glow flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Tasks Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-gray-100">Tasks</h4>
                </div>
                <div className="space-y-2">
                  {selectedDateTasks.length > 0 ? selectedDateTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-surfaceHighlight/30 border border-border/50">
                      <button 
                        onClick={() => task.completed ? uncompleteTask(task.id) : completeTask(task.id)}
                        className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center border transition-colors shrink-0",
                          task.completed ? "bg-accent border-accent text-background" : "border-gray-500 hover:border-accent text-transparent"
                        )}
                      >
                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      </button>
                      <span className={cn("font-medium text-xs flex-1 truncate", task.completed ? "text-gray-500 line-through" : "text-gray-100")}>
                        {task.title}
                      </span>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {task.start_time || '--:--'}
                      </span>
                      <span className={cn("text-[10px] uppercase font-bold", getPriorityColor(task.priority).split(' ')[0])}>
                        {task.priority}
                      </span>
                    </div>
                  )) : (
                    <p className="text-xs text-gray-500 text-center py-2">No tasks</p>
                  )}
                </div>
              </div>

              {/* Reminders Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-gray-100">Reminders</h4>
                </div>
                <div className="space-y-2">
                  {reminders.filter(r => r.date === selectedDateString && !r.completed).map(rem => (
                    <div key={rem.id} className="flex items-center gap-3 p-3 rounded-xl bg-surfaceHighlight/30 border border-border/50">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                        <Bell className="w-3 h-3" />
                      </div>
                      <span className="font-medium text-xs flex-1 text-gray-100 truncate">
                        {rem.title}
                      </span>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {rem.time}
                      </span>
                      <span className={cn("text-[10px] uppercase font-bold", getPriorityColor(rem.priority).split(' ')[0])}>
                        {rem.priority}
                      </span>
                    </div>
                  ))}
                  {reminders.filter(r => r.date === selectedDateString && !r.completed).length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">No reminders</p>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
