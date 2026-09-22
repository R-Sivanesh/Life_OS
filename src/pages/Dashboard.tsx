import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  Plus, 
  Edit2, 
  Trash2, 
  Bell, 
  Square, 
  Play, 
  Pause, 
  BarChart2, 
  Clock, 
  Target, 
  Zap, 
  ArrowUpRight, 
  Activity,
  Layers,
  Flame,
  ArrowDown,
  Info,
  Sparkles
} from 'lucide-react';
import { 
  cn, 
  openTaskModal, 
  openReminderModal, 
  formatTaskTimeRange, 
  formatTimeDisplay, 
  calculateWeightedProgress,
  calculateProductivity 
} from '../lib/utils';
import { useTasks, type Task } from '../lib/useTasks';
import { useReminders } from '../lib/useReminders';
import { useRoutines } from '../lib/useRoutines';
import CalendarWidget from '../components/CalendarWidget';
import { useFocus } from '../contexts/FocusContext';
import { useQuotes } from '../lib/useQuotes';
import { useDeleteModal } from '../contexts/DeleteModalContext';
import { format, isToday, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { syncAllRoutines } from '../lib/routineSync';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [quote, setQuote] = useState('Hope.');
  const [activeReminderMenu, setActiveReminderMenu] = useState<string | null>(null);
  const [focusSessions, setFocusSessions] = useState<any[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

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

  // Fetch focus sessions for real focus time reporting
  useEffect(() => {
    if (!user || !supabase) return;
    supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .then(res => {
        if (res.data) setFocusSessions(res.data);
      });
  }, [user]);

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
  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const isSelectedToday = isToday(selectedDate);

  // Stats calculation for Today using Priority Weighting
  const todayTasks = useMemo(() => {
    return tasks.filter(t => t.date === todayString);
  }, [tasks, todayString]);

  const todayWeightedStats = useMemo(() => {
    return calculateWeightedProgress(todayTasks);
  }, [todayTasks]);

  // Active view tasks (based on selected date)
  const activeTasks = useMemo(() => {
    return tasks.filter(t => t.date === selectedDateString);
  }, [tasks, selectedDateString]);

  const activeWeightedStats = useMemo(() => {
    return calculateWeightedProgress(activeTasks);
  }, [activeTasks]);

  // Filtered tasks for the task table
  const filteredActiveTasks = useMemo(() => {
    if (priorityFilter === 'all') return activeTasks;
    return activeTasks.filter(t => (t.priority || 'medium').toLowerCase() === priorityFilter);
  }, [activeTasks, priorityFilter]);

  const pendingActiveTasks = filteredActiveTasks.filter(t => !t.completed);
  const completedActiveTasks = filteredActiveTasks.filter(t => t.completed);

  // Helper to compute individual task progress
  const getTaskProgress = (task: Task): number => {
    if (task.completed) return 100;
    if (typeof task.progress === 'number') return Math.max(0, Math.min(100, task.progress));
    if (task.actual_minutes && task.estimated_minutes && task.estimated_minutes > 0) {
      return Math.min(99, Math.round((task.actual_minutes / task.estimated_minutes) * 100));
    }
    return 0;
  };

  // Toggle complete / uncomplete with progress sync
  const handleToggleTask = async (task: Task) => {
    if (task.completed) {
      await uncompleteTask(task.id);
    } else {
      await completeTask(task.id);
    }
  };

  // Reminders
  const upcomingReminders = reminders.filter(r => r.date >= todayString && !r.completed).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (!a.time && b.time) return 1;
    if (a.time && !b.time) return -1;
    if (!a.time && !b.time) return 0;
    return a.time!.localeCompare(b.time!);
  }).slice(0, 4);

  // Real Reports Calculations
  const totalAllTasks = tasks.length;
  const completedAllTasks = tasks.filter(t => t.completed).length;
  const overallRate = calculateProductivity(tasks, true);

  // Focus time calculation
  const taskFocusMinutes = tasks.filter(t => t.completed).reduce((acc, t) => acc + (t.estimated_minutes || t.actual_minutes || 0), 0);
  const sessionFocusMinutes = focusSessions.filter(f => f.completed).reduce((acc, f) => acc + (f.duration_minutes || 0), 0);
  const totalFocusMinutes = taskFocusMinutes + sessionFocusMinutes;
  const focusHours = Math.floor(totalFocusMinutes / 60);
  const focusMins = totalFocusMinutes % 60;

  // Routine completion
  const todayRoutineTasks = todayTasks.filter(t => t.category?.toLowerCase() === 'routine' || t.recurring);
  const routineCompletionRate = todayRoutineTasks.length > 0
    ? Math.round((todayRoutineTasks.filter(t => t.completed).length / todayRoutineTasks.length) * 100)
    : (routines.length > 0 ? 0 : 100);

  // Weekly performance breakdown
  const weeklyReportData = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end: endOfWeek(new Date(), { weekStartsOn: 1 }) });
    return days.map(d => {
      const dStr = format(d, 'yyyy-MM-dd');
      const dayTasks = tasks.filter(t => t.date === dStr || (t.completed_at && t.completed_at.startsWith(dStr)));
      const completedCount = dayTasks.filter(t => t.completed).length;
      const totalCount = dayTasks.length;
      return {
        date: d,
        dayName: format(d, 'EEE'),
        dayNum: format(d, 'd'),
        completedCount,
        totalCount,
        isCurrentDay: isSameDay(d, new Date())
      };
    });
  }, [tasks]);

  const maxWeeklyTasks = Math.max(...weeklyReportData.map(d => d.totalCount), 1);

  // Category distribution
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; completed: number }> = {};
    tasks.forEach(t => {
      const cat = t.category || 'General';
      if (!counts[cat]) counts[cat] = { total: 0, completed: 0 };
      counts[cat].total += 1;
      if (t.completed) counts[cat].completed += 1;
    });
    return Object.entries(counts).map(([name, data]) => ({
      name,
      ...data,
      pct: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
    }));
  }, [tasks]);

  // Priority Badge Component
  const PriorityBadge = ({ priority }: { priority?: string }) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'high') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase bg-danger/15 text-danger border border-danger/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]">
          <Flame className="w-3.5 h-3.5 fill-danger/30 text-danger" />
          <span>HIGH</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-danger/25 font-mono text-danger">3x</span>
        </span>
      );
    }
    if (p === 'low') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase bg-success/15 text-success border border-success/30">
          <ArrowDown className="w-3.5 h-3.5 text-success" />
          <span>LOW</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-success/25 font-mono text-success">1x</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase bg-warning/15 text-warning border border-warning/30">
        <Zap className="w-3.5 h-3.5 fill-warning/30 text-warning" />
        <span>MED</span>
        <span className="text-[9px] px-1 py-0.2 rounded bg-warning/25 font-mono text-warning">2x</span>
      </span>
    );
  };

  const getCategoryBadgeClass = (category?: string) => {
    const c = (category || 'General').toLowerCase();
    switch (c) {
      case 'health': return 'text-success bg-success/10 border-success/20';
      case 'learning': return 'text-cyan bg-cyan/10 border-cyan/20';
      case 'work': return 'text-primary bg-primary/10 border-primary/20';
      case 'personal': return 'text-warning bg-warning/10 border-warning/20';
      case 'routine': return 'text-primary bg-primary/10 border-primary/20';
      default: return 'text-text-secondary bg-surface-elevated border-border';
    }
  };

  const targetWeightedStats = isSelectedToday ? todayWeightedStats : activeWeightedStats;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 overflow-y-auto">
      
      {/* ── 1. TOP PROGRESS CARD (Hero Priority Progress & Focus Timer) ── */}
      <div className={cn(
        "glass-card p-5 md:p-6 transition-all duration-700 relative overflow-hidden border border-border/70",
        targetWeightedStats.percentage === 100 && targetWeightedStats.totalTasks > 0
          ? "border-primary/60 shadow-[0_0_35px_rgba(59,130,246,0.2)]" 
          : "hover:border-border-strong"
      )}>
        <div className="flex flex-col xl:flex-row items-stretch justify-between gap-6 xl:gap-8">
          
          {/* Priority Progress Section (LEFT) */}
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {isSelectedToday ? "Today's Priority Progress" : `Priority Progress (${format(selectedDate, 'MMM d')})`}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
                <span className="font-mono text-text-primary font-bold">
                  {targetWeightedStats.completedPoints} / {targetWeightedStats.totalPoints}
                </span>
                <span>pts</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-6 py-4">
              {/* Circular Gauge */}
              <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {/* Background Track */}
                  <circle 
                    cx="50" cy="50" r="42" 
                    fill="transparent" 
                    stroke="currentColor" 
                    strokeWidth="8"
                    className="text-surface-elevated/70"
                  />
                  {/* Progress Track */}
                  <circle 
                    cx="50" cy="50" r="42" 
                    fill="transparent" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    strokeLinecap="round"
                    strokeDasharray={263.89}
                    strokeDashoffset={263.89 - (targetWeightedStats.percentage / 100) * 263.89}
                    className={cn(
                      "transition-all duration-1000 ease-out",
                      targetWeightedStats.percentage === 100 
                        ? "text-success" 
                        : "text-primary"
                    )}
                    style={{
                      filter: targetWeightedStats.percentage > 0 
                        ? targetWeightedStats.percentage === 100 
                          ? 'drop-shadow(0 0 10px rgba(16,185,129,0.7))'
                          : 'drop-shadow(0 0 10px rgba(59,130,246,0.7))' 
                        : 'none'
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-text-primary tracking-tight font-mono">
                    {targetWeightedStats.percentage}%
                  </span>
                  <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                    Weighted
                  </span>
                </div>
              </div>

              {/* Priority Breakdown & Legend */}
              <div className="flex-1 flex flex-col justify-center gap-3 w-full">
                <div className="grid grid-cols-3 gap-2.5">
                  {/* High Tier Card */}
                  <div className="p-3 rounded-xl bg-surface-elevated/50 border border-danger/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-bold text-danger flex items-center gap-1">
                        <Flame className="w-3 h-3" /> High
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-danger/20 text-danger font-bold">
                        3x
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-black text-text-primary font-mono">
                        {targetWeightedStats.high.completed}/{targetWeightedStats.high.total}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono">
                        {targetWeightedStats.high.points}/{targetWeightedStats.high.totalPoints} pts
                      </span>
                    </div>
                  </div>

                  {/* Medium Tier Card */}
                  <div className="p-3 rounded-xl bg-surface-elevated/50 border border-warning/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-bold text-warning flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Medium
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-warning/20 text-warning font-bold">
                        2x
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-black text-text-primary font-mono">
                        {targetWeightedStats.medium.completed}/{targetWeightedStats.medium.total}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono">
                        {targetWeightedStats.medium.points}/{targetWeightedStats.medium.totalPoints} pts
                      </span>
                    </div>
                  </div>

                  {/* Low Tier Card */}
                  <div className="p-3 rounded-xl bg-surface-elevated/50 border border-success/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-bold text-success flex items-center gap-1">
                        <ArrowDown className="w-3 h-3" /> Low
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-success/20 text-success font-bold">
                        1x
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-black text-text-primary font-mono">
                        {targetWeightedStats.low.completed}/{targetWeightedStats.low.total}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono">
                        {targetWeightedStats.low.points}/{targetWeightedStats.low.totalPoints} pts
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
                  <span>Total completed: <strong className="text-text-primary font-mono">{targetWeightedStats.completedTasks}</strong> of <strong className="text-text-primary font-mono">{targetWeightedStats.totalTasks}</strong> tasks</span>
                  <span className="text-primary font-medium">Weighted priority algorithm active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Focus Timer Section (CENTER/RIGHT) */}
          <div className="w-full xl:w-72 flex flex-col justify-between pt-6 xl:pt-0 border-t xl:border-t-0 xl:border-l border-border/50 xl:pl-8">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-primary tracking-widest uppercase">Focus Session</span>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-primary animate-ping" : "bg-text-muted")} />
                <span className="text-[10px] font-medium text-text-muted uppercase">
                  {isActive ? (isPaused ? 'Paused' : 'Running') : 'Idle'}
                </span>
              </div>
            </div>

            <div className="my-auto py-3 text-center">
              <span className="text-4xl font-black text-text-primary tabular-nums tracking-tight font-mono drop-shadow-md">
                {formatTime(timeLeft)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!isActive || isPaused ? (
                <button 
                  onClick={handleStart} 
                  className="btn-primary flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> {isPaused ? 'Resume' : 'Start Focus'}
                </button>
              ) : (
                <button 
                  onClick={handlePause} 
                  className="flex-1 py-2.5 rounded-xl bg-warning/20 text-warning hover:bg-warning/30 border border-warning/30 transition-colors text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" /> Pause
                </button>
              )}

              {(isActive || isPaused) && (
                <button 
                  onClick={handleReset} 
                  className="px-3.5 py-2.5 rounded-xl bg-surface-elevated text-text-secondary hover:text-danger hover:bg-danger/10 border border-border/60 flex items-center justify-center transition-colors text-xs font-bold"
                  title="Reset Timer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              )}
            </div>
          </div>

          {/* Inspirational Quote Widget (RIGHT) */}
          <div className="hidden 2xl:flex w-64 flex-col justify-between border-l border-border/50 pl-8">
            <div className="flex items-center gap-2 text-text-muted text-xs">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold uppercase text-[10px] tracking-wider">Daily Inspiration</span>
            </div>
            <div className="my-auto py-2">
              <p className="text-xs text-text-secondary italic leading-relaxed font-medium">
                "{quote}"
              </p>
            </div>
            <div className="text-[10px] text-primary flex items-center gap-1.5 font-medium">
              <span className="w-4 h-[1px] bg-primary/60" /> Stay disciplined today
            </div>
          </div>

        </div>
      </div>

      {/* ── 2. MAIN GRID ROW 1 - Tasks & Calendar ── */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Column - Today's Tasks Table */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">
          <div className="glass-card flex flex-col overflow-hidden border border-border/70">
            
            {/* Card Header & Controls */}
            <div className="p-4 md:p-6 border-b border-border/50 flex flex-wrap justify-between items-center gap-4 bg-surface/50">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-text-primary font-bold text-base md:text-lg flex items-center gap-2.5">
                    {isSelectedToday ? "Today's Tasks" : `Tasks for ${format(selectedDate, 'MMM d, yyyy')}`}
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-surface-elevated border border-border text-text-secondary">
                      {filteredActiveTasks.length}
                    </span>
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {isSelectedToday ? format(new Date(), 'EEEE, MMMM d, yyyy') : (
                      <button 
                        onClick={() => setSelectedDate(new Date())} 
                        className="text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        ← Back to Today
                      </button>
                    )}
                  </p>
                </div>
              </div>

              {/* Priority Filter Tabs & Add Button */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center bg-surface-elevated/70 p-1 rounded-xl border border-border text-xs font-medium">
                  <button 
                    onClick={() => setPriorityFilter('all')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors",
                      priorityFilter === 'all' ? "bg-primary text-white font-bold" : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    All ({activeTasks.length})
                  </button>
                  <button 
                    onClick={() => setPriorityFilter('high')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1",
                      priorityFilter === 'high' ? "bg-danger text-white font-bold" : "text-danger/70 hover:text-danger"
                    )}
                  >
                    High ({activeWeightedStats.high.total})
                  </button>
                  <button 
                    onClick={() => setPriorityFilter('medium')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1",
                      priorityFilter === 'medium' ? "bg-warning text-white font-bold" : "text-warning/70 hover:text-warning"
                    )}
                  >
                    Med ({activeWeightedStats.medium.total})
                  </button>
                  <button 
                    onClick={() => setPriorityFilter('low')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1",
                      priorityFilter === 'low' ? "bg-success text-white font-bold" : "text-success/70 hover:text-success"
                    )}
                  >
                    Low ({activeWeightedStats.low.total})
                  </button>
                </div>

                <button 
                  onClick={() => openTaskModal(selectedDateString)} 
                  className="btn-primary text-xs py-2 px-3.5 rounded-xl shadow-glow flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Task
                </button>
              </div>
            </div>

            {/* Structured Table Layout: CHECKBOX | TIME | TASK | PRIORITY | PROGRESS | ACTIONS */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-b border-border/50 text-[11px] font-bold text-text-muted uppercase tracking-wider bg-surface-elevated/30">
                    <th className="py-3 px-4 w-12 text-center">Status</th>
                    <th className="py-3 px-4 w-32">Time</th>
                    <th className="py-3 px-4">Task</th>
                    <th className="py-3 px-4 w-32 text-center">Priority</th>
                    <th className="py-3 px-4 w-44">Progress</th>
                    <th className="py-3 px-4 w-20 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-xs">
                  {/* Pending Tasks */}
                  {pendingActiveTasks.map((task) => {
                    const taskProg = getTaskProgress(task);
                    return (
                      <tr 
                        key={task.id} 
                        className="hover:bg-surface-elevated/40 transition-colors group"
                      >
                        {/* 1. CHECKBOX */}
                        <td className="py-3.5 px-4 text-center">
                          <button 
                            onClick={() => handleToggleTask(task)}
                            className="w-5 h-5 rounded-lg flex items-center justify-center border transition-all border-border/80 hover:border-primary text-transparent hover:text-primary/50 cursor-pointer mx-auto bg-surface"
                            title="Mark completed"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                        </td>

                        {/* 2. TIME */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-text-secondary whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-text-muted shrink-0" />
                            <span>{formatTaskTimeRange(task.start_time, task.end_time)}</span>
                          </div>
                        </td>

                        {/* 3. TASK */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 max-w-[280px] sm:max-w-none">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-text-primary text-sm tracking-tight truncate">
                                {task.title}
                              </span>
                              {task.category && (
                                <span className={cn("text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border", getCategoryBadgeClass(task.category))}>
                                  {task.category}
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-[11px] text-text-muted truncate max-w-md">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* 4. PRIORITY */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <PriorityBadge priority={task.priority} />
                        </td>

                        {/* 5. PROGRESS */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden border border-border/40">
                              <div 
                                className="h-full bg-gradient-to-r from-primary to-cyan rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                                style={{ width: `${taskProg}%` }}
                              />
                            </div>
                            <span className="w-9 text-right font-mono font-bold text-[11px] text-text-secondary">
                              {taskProg}%
                            </span>
                          </div>
                        </td>

                        {/* 6. ACTIONS */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openTaskModal(undefined, task)} 
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors"
                              title="Edit task"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => confirmDelete(task.title, () => uncompleteTask(task.id))} 
                              className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Completed Tasks */}
                  {completedActiveTasks.map((task) => (
                    <tr 
                      key={task.id} 
                      className="bg-surface-elevated/20 hover:bg-surface-elevated/30 transition-colors group opacity-75 hover:opacity-100"
                    >
                      {/* 1. CHECKBOX */}
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => handleToggleTask(task)}
                          className="w-5 h-5 rounded-lg flex items-center justify-center border transition-all bg-success border-success text-background cursor-pointer mx-auto shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                          title="Mark incomplete"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </button>
                      </td>

                      {/* 2. TIME */}
                      <td className="py-3 px-4 font-mono text-[11px] text-text-muted line-through whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-text-muted shrink-0" />
                          <span>{formatTaskTimeRange(task.start_time, task.end_time)}</span>
                        </div>
                      </td>

                      {/* 3. TASK */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-text-muted line-through text-sm truncate">
                            {task.title}
                          </span>
                          {task.category && (
                            <span className={cn("text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border opacity-50", getCategoryBadgeClass(task.category))}>
                              {task.category}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. PRIORITY */}
                      <td className="py-3 px-4 text-center opacity-70 whitespace-nowrap">
                        <PriorityBadge priority={task.priority} />
                      </td>

                      {/* 5. PROGRESS */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden border border-border/40">
                            <div 
                              className="h-full bg-success rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <span className="w-9 text-right font-mono font-bold text-[11px] text-success">
                            100%
                          </span>
                        </div>
                      </td>

                      {/* 6. ACTIONS */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openTaskModal(undefined, task)} 
                            className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors"
                            title="Edit task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Empty state */}
              {activeTasks.length === 0 && (
                <div className="py-14 flex flex-col items-center justify-center text-text-muted">
                  <div className="w-14 h-14 rounded-2xl bg-surface-elevated/70 border border-border flex items-center justify-center mb-3">
                    <Check className="w-6 h-6 text-primary/60" />
                  </div>
                  <p className="text-sm font-semibold text-text-primary">
                    No tasks scheduled for {isSelectedToday ? 'today' : format(selectedDate, 'MMM d')}.
                  </p>
                  <p className="text-xs text-text-muted mt-1 mb-4">
                    Add high, medium, or low priority tasks to track your weighted productivity.
                  </p>
                  <button 
                    onClick={() => openTaskModal(selectedDateString)} 
                    className="btn-primary text-xs py-2 px-4 rounded-xl shadow-glow flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add First Task
                  </button>
                </div>
              )}
            </div>

            {/* ── 5. PRIORITY EXPLANATION FOOTER ── */}
            <div className="p-4 md:px-6 md:py-3.5 bg-surface-secondary/60 border-t border-border/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-text-secondary">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="font-semibold text-text-primary">Progress is based on task priority. </span>
                  <span className="text-text-muted">High priority tasks contribute more to your overall progress.</span>
                </div>
              </div>

              {/* Multiplier Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-danger/10 border border-danger/20 text-danger text-[11px] font-bold font-mono">
                  🔴 High = 3x
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/10 border border-warning/20 text-warning text-[11px] font-bold font-mono">
                  🟡 Medium = 2x
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/10 border border-success/20 text-success text-[11px] font-bold font-mono">
                  🟢 Low = 1x
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column - Calendar Widget */}
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

      {/* ── 3. PRODUCTIVITY REPORTS & ANALYTICS SECTION ── */}
      <div className="glass-card flex flex-col overflow-hidden p-6 gap-6 border border-border/70">
        <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-glow">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-text-primary font-bold text-lg flex items-center gap-2">
                Productivity Reports & Analytics
                <span className="text-[10px] font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
                  Live Weighted
                </span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">Calculated in real-time with priority weights from your database</p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-cyan transition-colors bg-surface-elevated/60 hover:bg-surface-elevated border border-border px-3.5 py-2 rounded-xl"
          >
            Detailed Reports <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border/50 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted font-medium">Completion Rate</span>
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-text-primary mb-1 font-mono">{overallRate}%</div>
            <span className="text-[10px] text-text-muted">All-time ({completedAllTasks}/{totalAllTasks})</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border/50 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted font-medium">Weighted Today</span>
              <Activity className="w-4 h-4 text-success" />
            </div>
            <div className="text-2xl font-black text-success mb-1 font-mono">{todayWeightedStats.percentage}%</div>
            <span className="text-[10px] text-text-muted">{todayWeightedStats.completedPoints} of {todayWeightedStats.totalPoints} priority pts</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border/50 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted font-medium">Focus Time</span>
              <Clock className="w-4 h-4 text-cyan" />
            </div>
            <div className="text-2xl font-black text-cyan mb-1 font-mono">{focusHours}h {focusMins}m</div>
            <span className="text-[10px] text-text-muted">Tasks & sessions logged</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border/50 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted font-medium">Routine Consistency</span>
              <Zap className="w-4 h-4 text-warning" />
            </div>
            <div className="text-2xl font-black text-warning mb-1 font-mono">{routineCompletionRate}%</div>
            <span className="text-[10px] text-text-muted">{routines.length} active daily routines</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border/50 flex flex-col col-span-2 md:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted font-medium">Total Activity</span>
              <Layers className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="text-2xl font-black text-text-primary mb-1 font-mono">{totalAllTasks}</div>
            <span className="text-[10px] text-text-muted">Total tasks in Life OS</span>
          </div>
        </div>

        {/* Visual Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Weekly Performance Bar Chart */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-surface-elevated/30 border border-border/40 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-sm font-bold text-text-primary">This Week's Activity</h4>
                <p className="text-[11px] text-text-muted mt-0.5">Tasks completed daily</p>
              </div>
              <span className="text-xs font-semibold text-primary font-mono">Weekly View</span>
            </div>

            <div className="flex-1 flex items-end justify-between gap-2 sm:gap-4 pt-4 pb-2 px-2 min-h-[160px]">
              {weeklyReportData.map((d, i) => {
                const heightPct = d.totalCount > 0 ? Math.round((d.completedCount / maxWeeklyTasks) * 100) : 0;
                const minHeight = d.completedCount > 0 ? Math.max(heightPct, 15) : 8;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] font-bold text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                      {d.completedCount}/{d.totalCount}
                    </div>
                    <div className="w-full max-w-[36px] bg-surface-elevated rounded-t-lg overflow-hidden flex flex-col justify-end h-28 relative border border-border/30">
                      <div 
                        style={{ height: `${minHeight}%` }}
                        className={cn(
                          "w-full rounded-t-lg transition-all duration-700",
                          d.isCurrentDay 
                            ? "bg-gradient-to-t from-primary to-cyan shadow-[0_0_12px_rgba(59,130,246,0.4)]" 
                            : "bg-primary/50 group-hover:bg-primary/80"
                        )}
                      />
                    </div>
                    <span className={cn("text-[11px] font-medium", d.isCurrentDay ? "text-primary font-bold" : "text-text-muted")}>
                      {d.dayName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-surface-elevated/30 border border-border/40 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-text-primary">Category Performance</h4>
                <span className="text-[11px] text-text-muted font-mono">{categoryCounts.length} categories</span>
              </div>

              <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {categoryCounts.length > 0 ? categoryCounts.map(c => (
                  <div key={c.name} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-text-primary">{c.name}</span>
                      <span className="text-text-muted font-mono">{c.completed}/{c.total} ({c.pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden border border-border/30">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-700", c.pct === 100 ? "bg-success" : "bg-primary")}
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-text-muted py-6 text-center">No category data yet.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border/40 flex justify-between items-center text-xs text-text-muted">
              <span>Looking for deep breakdowns?</span>
              <button 
                onClick={() => navigate('/reports')}
                className="text-primary hover:underline font-bold"
              >
                Full Analytics →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. UPCOMING REMINDERS SECTION ── */}
      <div className="glass-card flex flex-col overflow-hidden border border-border/70">
        <div className="p-6 border-b border-border/50 flex justify-between items-center bg-surface/50">
          <div>
            <h3 className="text-text-primary font-bold">Upcoming Reminders</h3>
            <p className="text-xs text-text-muted mt-0.5">Stay on track with schedule alerts</p>
          </div>
          <button 
            onClick={() => openReminderModal()} 
            className="p-2 bg-surface-elevated text-text-secondary hover:text-text-primary rounded-xl transition-colors border border-border/50 shadow-sm"
            title="Add reminder"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {upcomingReminders.length > 0 ? upcomingReminders.map(rem => (
            <div key={rem.id} className="flex items-start gap-3 p-4 rounded-xl bg-surface-elevated/50 border border-border/50 relative group hover:border-primary/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary mt-0.5">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-text-primary truncate">{rem.title}</h4>
                <p className="text-xs text-text-muted mt-1">{isToday(new Date(rem.date)) ? 'Today' : format(new Date(rem.date), 'MMM d')}, {formatTimeDisplay(rem.time)}</p>
              </div>
              <PriorityBadge priority={rem.priority} />
              
              <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveReminderMenu(activeReminderMenu === rem.id ? null : rem.id); }}
                  className="p-1 text-text-muted hover:text-primary transition-all rounded ml-1"
                >
                  <div className="flex flex-col gap-0.5 pointer-events-none">
                    <div className="w-1 h-1 bg-current rounded-full" />
                    <div className="w-1 h-1 bg-current rounded-full" />
                    <div className="w-1 h-1 bg-current rounded-full" />
                  </div>
                </button>
                {activeReminderMenu === rem.id && (
                  <div className="absolute right-0 top-8 w-32 bg-surface-elevated border border-border rounded-xl shadow-xl z-20 py-1 flex flex-col overflow-hidden">
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
