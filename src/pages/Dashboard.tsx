import { useState, useMemo, useEffect, useRef } from 'react';
import { Check, Plus, Edit2, Trash2, Bell, Square, Play, Pause } from 'lucide-react';
import { cn, openTaskModal, openReminderModal, formatTaskTimeRange, formatTimeDisplay, calculateProductivity } from '../lib/utils';
import { useTasks } from '../lib/useTasks';
import { useReminders } from '../lib/useReminders';
import { useRoutines } from '../lib/useRoutines';
import CalendarWidget from '../components/CalendarWidget';
import { useFocus } from '../contexts/FocusContext';
import { useQuotes } from '../lib/useQuotes';
import { useDeleteModal } from '../contexts/DeleteModalContext';

import { format, isToday } from 'date-fns';

import { syncAllRoutines } from '../lib/routineSync';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [quote, setQuote] = useState('Hope.');
  const [activeReminderMenu, setActiveReminderMenu] = useState<string | null>(null);

  const { confirmDelete } = useDeleteModal();
  const { quotes } = useQuotes();
  const lastQuoteIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveReminderMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!quotes || quotes.length === 0) return;

    const setNextQuote = () => {
      if (quotes.length === 1) {
        setQuote(quotes[0].text);
        lastQuoteIdRef.current = quotes[0].id;
        return;
      }
      
      const otherQuotes = quotes.filter(q => q.id !== lastQuoteIdRef.current);
      const pool = otherQuotes.length > 0 ? otherQuotes : quotes;
      const picked = pool[Math.floor(Math.random() * pool.length)];
      
      setQuote(picked.text);
      lastQuoteIdRef.current = picked.id;
    };

    setNextQuote();
    const interval = setInterval(setNextQuote, 15000);
    return () => clearInterval(interval);
  }, [quotes]);
  
  const {
    timeLeft,
    isActive,
    isPaused,
    handleStart,
    handlePause,
    handleReset,
  } = useFocus();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const { tasks, completeTask, uncompleteTask, refresh: refreshTasks } = useTasks();
  const { reminders, deleteReminder, refresh: refreshReminders } = useReminders();
  const { routines } = useRoutines();

  useEffect(() => {
    refreshTasks();
    refreshReminders();
  }, [refreshTasks, refreshReminders]);

  useEffect(() => {
    // Automatically sync routines to tasks once per day
    if (routines.length > 0 && user) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const flagKey = `lifeos_routines_synced_${user.id}_${todayStr}`;
      if (!localStorage.getItem(flagKey)) {
        syncAllRoutines(routines, user.id).then(() => {
          localStorage.setItem(flagKey, 'true');
          window.dispatchEvent(new Event('lifeos_tasks_updated'));
        });
      }
    }
  }, [routines, user]);


  const todayString = format(new Date(), 'yyyy-MM-dd');

  // Stats calculation
  const todayTasks = useMemo(() => {
    return tasks.filter(t => t.date === todayString);
  }, [tasks, todayString]);

  const pendingToday = todayTasks.filter(t => !t.completed);
  const completedTodayTasks = todayTasks.filter(t => t.completed);
  
  const completedToday = completedTodayTasks.length;
  const totalToday = todayTasks.length;
  const progressPercent = calculateProductivity(todayTasks);

  // Selected date tasks/reminders
  const upcomingReminders = reminders.filter(r => r.date >= todayString && !r.completed).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (!a.time && b.time) return 1;
    if (a.time && !b.time) return -1;
    if (!a.time && !b.time) return 0;
    return a.time!.localeCompare(b.time!);
  }).slice(0, 5);

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-danger bg-danger/10 border-danger/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'low': return 'text-cyan bg-cyan/10 border-cyan/20';
      default: return 'text-text-cyan bg-surface-elevated border-border';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'health': return 'text-success';
      case 'learning': return 'text-primary';
      case 'work': return 'text-cyan';
      case 'personal': return 'text-warning';
      default: return 'text-text-cyan';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 overflow-y-auto">
      {/* Top Stats Row */}
      <div className={cn("glass-card flex flex-col lg:flex-row items-center justify-between px-4 md:px-6 py-4 gap-6 lg:gap-0 transition-all duration-700", progressPercent === 100 && totalToday > 0 ? "border-primary/50 shadow-[0_0_30px_rgba(59,130,246,0.15)]" : "")}>
        {/* Circle Progress (LEFT) */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full lg:w-auto lg:flex-1 justify-center lg:justify-start">
          <div className="relative w-20 h-20 flex-shrink-0 rounded-full border-[6px] border-surface-elevated/40 flex items-center justify-center">
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
              <span className="text-xl font-black text-text-primary">{progressPercent}%</span>
            </div>
          </div>
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-text-muted mb-1">Completed</p>
              <p className="text-2xl font-bold text-success">{completedToday}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Total Tasks</p>
              <p className="text-2xl font-bold text-cyan">{totalToday}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Remaining</p>
              <p className="text-2xl font-bold text-warning">{totalToday - completedToday}</p>
            </div>
          </div>
        </div>
        
        {/* Focus Timer (CENTER) */}
        <div className="flex flex-col items-center justify-center w-full lg:w-auto lg:flex-1 border-y lg:border-y-0 lg:border-x border-border/50 py-4 lg:py-0 px-4 lg:px-6 mx-0 lg:mx-6">
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase mb-1">Focus</span>
          <span className="text-3xl font-black text-text-primary tabular-nums leading-none mb-3 tracking-tight">
            {formatTime(timeLeft)}
          </span>
          
          <div className="flex items-center gap-2">
            {!isActive || isPaused ? (
              <button onClick={handleStart} className="btn-primary px-5 py-2 rounded-xl text-xs font-bold shadow-glow flex items-center gap-2">
                <Play className="w-3 h-3 fill-current" /> {isPaused ? 'Resume' : 'Start Focus'}
              </button>
            ) : (
              <button onClick={handlePause} className="px-5 py-2 rounded-xl bg-warning/20 text-warning hover:bg-warning/30 transition-colors text-xs font-bold flex items-center gap-2">
                <Pause className="w-3 h-3 fill-current" /> Pause
              </button>
            )}
            
            {(isActive || isPaused) && (
              <button onClick={handleReset} className="px-4 py-2 rounded-xl bg-surface-elevated text-text-cyan hover:text-text-primary flex items-center gap-2 transition-colors text-xs font-bold">
                <Square className="w-3 h-3 fill-current" /> Stop
              </button>
            )}
            
            {!isActive && !isPaused && (
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-elevated/30 text-text-cyan text-xs font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Ready to focus
              </div>
            )}
          </div>
        </div>
        
        {/* Quote (RIGHT) */}
        <div className="flex flex-col items-center sm:items-start justify-center w-full lg:w-auto lg:flex-1 lg:pl-4 text-center sm:text-left">
           <div className="text-4xl text-primary/20 leading-none mb-1 font-serif">"</div>
           <p className="text-sm text-text-cyan leading-relaxed font-medium pr-4">
             {quote}
           </p>
           <p className="text-[11px] text-primary mt-3 flex items-center gap-2">
             <span className="w-3 h-[1px] bg-primary"></span> Keep going!
           </p>
        </div>
      </div>

      {/* Main Grid Row 1 */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        
        {/* Left Column - Today's Tasks */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">
          {/* Today's Tasks */}
          <div className="glass-card flex flex-col overflow-hidden">
            <div className="p-4 md:p-6 border-b border-border/50 flex justify-between items-center">
              <h3 className="text-text-primary font-bold">Today's Tasks</h3>
              <button onClick={() => openTaskModal(todayString)} className="btn-primary text-xs py-1.5 px-3 rounded-lg shadow-glow flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </div>
            
            <div className="p-4 space-y-6 custom-scrollbar pr-2">
              {pendingToday.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-primary mb-3 uppercase tracking-wider">Pending ({pendingToday.length})</h4>
                  <div className="space-y-1">
                    {pendingToday.map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-elevated/50 transition-colors group border border-transparent">
                        <button 
                          onClick={() => completeTask(task.id)}
                          className="w-4 h-4 rounded-full flex items-center justify-center border transition-colors shrink-0 border-border hover:border-success text-transparent hover:text-success/50"
                        >
                          <Check className="w-2.5 h-2.5" strokeWidth={3} />
                        </button>
                        <div className="flex-1 flex items-center gap-4 min-w-0">
                          <span className="w-16 sm:w-32 text-[10px] sm:text-xs text-primary/80 shrink-0 truncate">
                            {formatTaskTimeRange(task.start_time, task.end_time)}
                          </span>
                          <span className="font-medium text-xs sm:text-sm transition-colors flex-1 text-text-primary truncate">
                            {task.title}
                          </span>
                          <span className={cn("text-[8px] sm:text-[10px] uppercase font-bold px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0 text-center hidden xs:inline-block", getCategoryColor(task.category), `border-${getCategoryColor(task.category).split('-')[1]}/30 bg-${getCategoryColor(task.category).split('-')[1]}/10`)}>
                            {task.category}
                          </span>
                          <span className={cn("text-[8px] sm:text-[10px] font-bold w-10 sm:w-14 shrink-0 text-right hidden xs:inline-block", getPriorityColor(task.priority).split(' ')[0])}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => openTaskModal(undefined, task)} className="p-2 sm:p-1 text-text-muted hover:text-primary rounded transition-colors"><Edit2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {completedTodayTasks.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-success mb-3 uppercase tracking-wider">Completed ({completedTodayTasks.length})</h4>
                  <div className="space-y-1">
                    {completedTodayTasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-elevated/50 transition-colors group border border-transparent">
                        <button 
                          onClick={() => uncompleteTask(task.id)}
                          className="w-4 h-4 rounded-full flex items-center justify-center border transition-colors shrink-0 bg-success border-success text-background"
                        >
                          <Check className="w-2.5 h-2.5" strokeWidth={3} />
                        </button>
                        <div className="flex-1 flex items-center gap-2 sm:gap-4 min-w-0">
                          <span className="w-16 sm:w-32 text-[10px] sm:text-xs text-text-muted shrink-0 line-through truncate">
                            {formatTaskTimeRange(task.start_time, task.end_time)}
                          </span>
                          <span className="font-medium text-xs sm:text-sm transition-colors flex-1 text-text-muted line-through truncate">
                            {task.title}
                          </span>
                          <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 text-center opacity-50", getCategoryColor(task.category), `border-${getCategoryColor(task.category).split('-')[1]}/30 bg-${getCategoryColor(task.category).split('-')[1]}/10`)}>
                            {task.category}
                          </span>
                          <span className={cn("text-[10px] font-bold w-14 shrink-0 text-right opacity-50", getPriorityColor(task.priority).split(' ')[0])}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => openTaskModal(undefined, task)} className="p-1 text-text-muted hover:text-primary rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {todayTasks.length === 0 && (
                <div className="py-8 flex flex-col items-center justify-center text-text-muted">
                  <Check className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No tasks scheduled for today.</p>
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


        </div>
      </div>

      {/* Main Grid Row 2 - Upcoming Reminders */}
      <div className="glass-card flex flex-col overflow-hidden">
        <div className="p-6 border-b border-border/50 flex justify-between items-center">
          <h3 className="text-text-primary font-bold">Upcoming Reminders</h3>
          <button onClick={() => openReminderModal()} className="p-1.5 bg-surface-elevated text-text-cyan hover:text-text-primary rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {upcomingReminders.length > 0 ? upcomingReminders.map(rem => (
            <div key={rem.id} className="flex items-start gap-3 p-4 rounded-xl bg-surface-elevated/50 border border-border/50 relative group">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary mt-0.5">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-text-primary truncate">{rem.title}</h4>
                <p className="text-xs text-text-muted mt-1">{isToday(new Date(rem.date)) ? 'Today' : format(new Date(rem.date), 'MMM d')}, {formatTimeDisplay(rem.time)}</p>
              </div>
              <span className={cn("text-[10px] uppercase font-bold", getPriorityColor(rem.priority).split(' ')[0])}>
                {rem.priority}
              </span>
              
              <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveReminderMenu(activeReminderMenu === rem.id ? null : rem.id); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-primary transition-all"
                >
                  <div className="flex flex-col gap-0.5 pointer-events-none">
                    <div className="w-1 h-1 bg-current rounded-full" />
                    <div className="w-1 h-1 bg-current rounded-full" />
                    <div className="w-1 h-1 bg-current rounded-full" />
                  </div>
                </button>
                {activeReminderMenu === rem.id && (
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 w-32 bg-surface-elevated border border-border rounded-xl shadow-xl z-20 py-1 flex flex-col overflow-hidden">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openReminderModal(undefined, rem); setActiveReminderMenu(null); }}
                      className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface transition-colors flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); confirmDelete(`Reminder: ${rem.title}`, () => deleteReminder(rem.id)); setActiveReminderMenu(null); }}
                      className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="col-span-full py-8 text-center text-sm text-text-muted">
              No upcoming reminders.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
