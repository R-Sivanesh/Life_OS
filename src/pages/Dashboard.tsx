import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus, Edit2, Bell } from 'lucide-react';
import { cn, openTaskModal, openReminderModal, formatTaskTimeRange, formatTimeDisplay, calculateProductivity } from '../lib/utils';
import { useTasks } from '../lib/useTasks';
import { useReminders } from '../lib/useReminders';
import { useRoutines } from '../lib/useRoutines';
import CalendarWidget from '../components/CalendarWidget';
import { useQuotes } from '../lib/useQuotes';
import { format } from 'date-fns';
import { syncAllRoutines } from '../lib/routineSync';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [quote, setQuote] = useState('Hope.');

  const { quotes } = useQuotes();
  const lastQuoteIdRef = useRef<string | null>(null);

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

  const { tasks, completeTask, uncompleteTask, refresh: refreshTasks } = useTasks();
  const { reminders, refresh: refreshReminders } = useReminders();
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
  
  // Priority-weighted overall progress calculation:
  // HIGH = 3 points, MEDIUM = 2 points, LOW = 1 point
  // Overall Progress = (completed priority points / total priority points) × 100
  const progressPercent = useMemo(() => {
    return calculateProductivity(todayTasks, true);
  }, [todayTasks]);

  // Nearest 2-3 upcoming reminders
  const topUpcomingReminders = useMemo(() => {
    return reminders
      .filter(r => (r.date ? r.date >= todayString : true) && !r.completed)
      .sort((a, b) => {
        const dateA = a.date || '9999-99-99';
        const dateB = b.date || '9999-99-99';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        if (!a.time && b.time) return 1;
        if (a.time && !b.time) return -1;
        if (!a.time && !b.time) return 0;
        return a.time!.localeCompare(b.time!);
      })
      .slice(0, 3);
  }, [reminders, todayString]);

  const formatReminderDate = (rem: any) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    let datePart = '';
    if (rem.date === todayStr) {
      datePart = 'Today';
    } else if (rem.date === tomorrowStr) {
      datePart = 'Tomorrow';
    } else if (rem.date) {
      try {
        const [y, m, d] = rem.date.split('-').map(Number);
        datePart = format(new Date(y, m - 1, d), 'MMM d');
      } catch {
        datePart = rem.date;
      }
    }

    if (rem.time) {
      const timePart = formatTimeDisplay(rem.time);
      return datePart ? `${datePart} · ${timePart}` : timePart;
    }
    return datePart || 'No date';
  };

  const getPriorityColor = (priority?: string) => {
    switch ((priority || 'medium').toLowerCase()) {
      case 'high': return 'text-danger bg-danger/10 border-danger/20';
      case 'low': return 'text-success bg-success/10 border-success/20';
      case 'medium':
      default: return 'text-warning bg-warning/10 border-warning/20';
    }
  };

  const getPriorityBadgeLabel = (priority?: string) => {
    switch ((priority || 'medium').toLowerCase()) {
      case 'high': return 'HIGH';
      case 'low': return 'LOW';
      case 'medium':
      default: return 'MEDIUM';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch ((category || '').toLowerCase()) {
      case 'health': return 'text-success';
      case 'learning': return 'text-primary';
      case 'work': return 'text-cyan';
      case 'personal': return 'text-warning';
      default: return 'text-text-cyan';
    }
  };

  return (
    <div className="flex flex-col gap-5 md:gap-6 w-full max-w-[1500px] mx-auto pb-12 overflow-y-auto">
      {/* Top 3-Column Grid on Desktop / Stacked Cards on Mobile */}
      <div className="contents lg:grid lg:grid-cols-3 lg:gap-5 xl:gap-6">
        {/* 1. Statistics Card (Left on Desktop: 33.33%, 1st on Mobile) */}
        <div className={cn("order-1 lg:order-1 glass-card p-4 sm:p-5 lg:p-5 xl:p-6 flex items-center justify-between sm:justify-center gap-4 sm:gap-6 xl:gap-8 h-full transition-all duration-700", progressPercent === 100 && totalToday > 0 ? "border-primary/50 shadow-[0_0_30px_rgba(59,130,246,0.15)]" : "")}>
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 xl:w-28 xl:h-28 flex-shrink-0 rounded-full border-[6px] xl:border-[7px] border-surface-elevated/50 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute w-[86%] h-[86%] transform -rotate-90 drop-shadow-lg">
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
                  filter: progressPercent > 0 ? 'drop-shadow(0 0 8px rgba(59,130,246,0.65))' : 'none'
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl sm:text-2xl xl:text-3xl font-black text-text-primary tracking-tight">{progressPercent}%</span>
            </div>
          </div>
          <div className="flex gap-4 sm:gap-6 xl:gap-7">
            <div className="text-center sm:text-left">
              <p className="text-xs xl:text-sm text-text-muted font-medium mb-0.5">Completed</p>
              <p className="text-2xl sm:text-2xl xl:text-3xl font-bold text-success">{completedToday}</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs xl:text-sm text-text-muted font-medium mb-0.5">Total Tasks</p>
              <p className="text-2xl sm:text-2xl xl:text-3xl font-bold text-cyan">{totalToday}</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs xl:text-sm text-text-muted font-medium mb-0.5">Remaining</p>
              <p className="text-2xl sm:text-2xl xl:text-3xl font-bold text-warning">{totalToday - completedToday}</p>
            </div>
          </div>
        </div>
        
        {/* 2. Motivational Quote Card (Center on Desktop: 33.33%, 2nd on Mobile) */}
        <div className="order-2 lg:order-2 glass-card p-4 sm:p-5 lg:p-5 xl:p-6 flex flex-col items-center justify-center text-center h-full">
           <div className="text-3xl sm:text-4xl xl:text-5xl text-primary/30 leading-none -mb-1 font-serif select-none">"</div>
           <p className="text-base sm:text-lg xl:text-xl text-text-primary font-semibold leading-snug max-w-md px-2 line-clamp-3">
             {quote}
           </p>
           <p className="text-xs sm:text-sm text-primary mt-2.5 flex items-center gap-2 font-bold tracking-wide">
             <span className="w-3 h-[2px] bg-primary rounded-full"></span> Keep going!
           </p>
        </div>

        {/* 4. Upcoming Reminders Card (Right on Desktop: 33.33%, 4th on Mobile below Today's Tasks) */}
        <div className="order-4 lg:order-3 glass-card p-4 sm:p-5 lg:p-5 xl:p-6 flex flex-col justify-between h-full min-w-0">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-primary tracking-wider uppercase">
                <Bell className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">Upcoming Reminders</span>
              </div>
              <button 
                onClick={() => openReminderModal()}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-elevated/60 transition-colors shrink-0"
                title="Add reminder"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {topUpcomingReminders.length > 0 ? (
              <div className="space-y-1.5">
                {topUpcomingReminders.map(rem => (
                  <div 
                    key={rem.id} 
                    onClick={() => openReminderModal(undefined, rem)}
                    className="flex items-center gap-2.5 p-1.5 sm:p-2 rounded-xl hover:bg-surface-elevated/60 transition-colors cursor-pointer group text-left"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-warning/15 flex items-center justify-center flex-shrink-0 text-warning">
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                        {rem.title}
                      </p>
                      <p className="text-[11px] sm:text-xs text-text-muted truncate">
                        {formatReminderDate(rem)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-3 text-center">
                <p className="text-xs text-text-muted mb-2">No upcoming reminders</p>
                <button 
                  onClick={() => openReminderModal()} 
                  className="text-xs text-primary hover:text-primary-hover font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Reminder
                </button>
              </div>
            )}
          </div>

          {topUpcomingReminders.length > 0 && (
            <div className="pt-2">
              <Link 
                to="/reminders" 
                className="text-xs sm:text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                View all reminders →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Today's Tasks & Calendar */}
      <div className="contents lg:grid lg:grid-cols-12 lg:gap-6 mb-6 lg:items-start">
        {/* 3. Left Column - Today's Tasks (3rd on Mobile, Left 66.7% on Desktop) */}
        <div className="order-3 lg:order-1 col-span-12 lg:col-span-8 flex flex-col gap-6">
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
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider">Pending ({pendingToday.length})</h4>
                  </div>
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
                          {task.category && (
                            <span className={cn("text-[8px] sm:text-[10px] uppercase font-bold px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0 text-center hidden xs:inline-block", getCategoryColor(task.category), `border-${getCategoryColor(task.category).split('-')[1]}/30 bg-${getCategoryColor(task.category).split('-')[1]}/10`)}>
                              {task.category}
                            </span>
                          )}
                          <span className={cn("text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border shrink-0 uppercase tracking-tight", getPriorityColor(task.priority))}>
                            {getPriorityBadgeLabel(task.priority)}
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
                          {task.category && (
                            <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 text-center opacity-50", getCategoryColor(task.category), `border-${getCategoryColor(task.category).split('-')[1]}/30 bg-${getCategoryColor(task.category).split('-')[1]}/10`)}>
                              {task.category}
                            </span>
                          )}
                          <span className={cn("text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border shrink-0 uppercase tracking-tight opacity-60", getPriorityColor(task.priority))}>
                            {getPriorityBadgeLabel(task.priority)}
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

        {/* 5. Right Column - Calendar (5th on Mobile, Right 33.3% on Desktop) */}
        <div className="order-5 lg:order-2 col-span-12 lg:col-span-4 flex flex-col gap-6">
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
    </div>
  );
};

export default Dashboard;
