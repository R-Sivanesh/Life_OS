import { useState, useEffect, useMemo } from 'react';
import { useTasks } from '../lib/useTasks';
import { useReminders } from '../lib/useReminders';
import { BarChart2, Calendar, CheckCircle2, Clock, LayoutGrid, Target, Zap, CircleDashed } from 'lucide-react';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, subDays } from 'date-fns';
import { cn } from '../lib/utils';

const Reports = () => {
  const { tasks, refresh: refreshTasks } = useTasks();
  const { reminders, refresh: refreshReminders } = useReminders();

  useEffect(() => {
    refreshTasks();
    refreshReminders();
  }, [refreshTasks, refreshReminders]);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const nowTime = format(today, 'HH:mm');

  // --- 1. Top Summary Cards (All Time) ---
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const overallRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const totalFocusMinutes = tasks.filter(t => t.completed).reduce((acc, t) => acc + (t.estimated_minutes || 0), 0);
  const focusHours = Math.floor(totalFocusMinutes / 60);
  const focusMins = totalFocusMinutes % 60;

  // --- 2. Activity Status (Today) ---
  const todayTasks = tasks.filter(t => t.date === todayStr);
  const todayCompleted = todayTasks.filter(t => t.completed).length;
  const todayPending = todayTasks.filter(t => !t.completed && (t.end_time ? t.end_time >= nowTime : true)).length;
  const todayOverdue = todayTasks.filter(t => !t.completed && (t.end_time ? t.end_time < nowTime : false)).length;
  const todaySkipped = todayTasks.filter(t => t.status === 'skipped').length; 
  const todayTotal = todayTasks.length;

  const donutData = [
    { label: 'Completed', value: todayCompleted, color: '#10B981', displayColor: 'bg-emerald-500' }, 
    { label: 'Pending', value: todayPending, color: '#F59E0B', displayColor: 'bg-amber-500' }, 
    { label: 'Overdue', value: todayOverdue, color: '#EF4444', displayColor: 'bg-red-500' }, 
    { label: 'Skipped', value: todaySkipped, color: '#6B7280', displayColor: 'bg-gray-500' }, 
  ];

  let currentOffset = 25; 
  const donutSegments = donutData.map(d => {
    const percentage = todayTotal > 0 ? (d.value / todayTotal) * 100 : 0;
    const dashArray = `${percentage} ${100 - percentage}`;
    const offset = currentOffset; 
    currentOffset -= percentage;
    return { ...d, percentage, dashArray, offset };
  });

  // --- 3. Today's Breakdown ---
  const todayRemaining = todayTotal - todayCompleted;
  const todayRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
  
  const todayFocusMinutes = todayTasks.filter(t => t.completed).reduce((acc, t) => acc + (t.estimated_minutes || 0), 0);
  const todayFocusFormatted = `${Math.floor(todayFocusMinutes / 60)}h ${todayFocusMinutes % 60}m`;
  
  const todayRoutines = todayTasks.filter(t => t.category.includes('Routine'));
  const todayRoutinesCompleted = todayRoutines.filter(t => t.completed).length;
  const routineCompletionRate = todayRoutines.length > 0 ? Math.round((todayRoutinesCompleted / todayRoutines.length) * 100) : 0;

  const todayReminders = reminders.filter(r => r.date === todayStr);
  const todayRemindersCompleted = todayReminders.filter(r => r.completed).length;

  const timelineItems = useMemo(() => {
    const items: any[] = [];
    todayTasks.forEach(t => {
      let statusColor = 'bg-amber-500'; 
      if (t.completed) statusColor = 'bg-emerald-500'; 
      else if (t.end_time && t.end_time < nowTime) statusColor = 'bg-red-500'; 
      
      items.push({
        id: `t_${t.id}`,
        title: t.title,
        time: t.start_time || '00:00',
        formattedTime: t.start_time ? format(new Date(`${todayStr}T${t.start_time}`), 'hh:mm a') : 'Anytime',
        statusColor
      });
    });
    
    todayReminders.forEach(r => {
      items.push({
        id: `r_${r.id}`,
        title: r.title,
        time: r.time || '00:00',
        formattedTime: r.time ? format(new Date(`${todayStr}T${r.time}`), 'hh:mm a') : 'Anytime',
        statusColor: r.completed ? 'bg-emerald-500' : (r.time && r.time < nowTime ? 'bg-red-500' : 'bg-amber-500')
      });
    });

    return items.sort((a, b) => a.time.localeCompare(b.time));
  }, [todayTasks, todayReminders, nowTime, todayStr]);

  // --- 4. Weekly Performance ---
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const weeklyData = weekDays.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const count = tasks.filter(t => t.completed && (t.completed_at?.startsWith(dayStr) || t.date === dayStr)).length;
    return {
      date: day,
      label: format(day, 'EEE'), 
      count
    };
  });
  const maxWeeklyCount = Math.max(...weeklyData.map(d => d.count), 1);

  // --- 5. Productivity Trend ---
  const [trendRange, setTrendRange] = useState<7 | 30>(7);
  
  const trendData = useMemo(() => {
    const days = [];
    for (let i = trendRange - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const dayStr = format(d, 'yyyy-MM-dd');
      
      const dayTasks = tasks.filter(t => t.date === dayStr || (t.completed_at && t.completed_at.startsWith(dayStr)));
      const completed = dayTasks.filter(t => t.completed).length;
      const total = dayTasks.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      days.push({
        date: d,
        label: format(d, 'MMM d'),
        rate
      });
    }
    return days;
  }, [tasks, trendRange, today]);

  const createPolylinePoints = () => {
    if (trendData.length === 0) return '';
    const width = 1000;
    const height = 200;
    
    return trendData.map((d, index) => {
      const x = (index / (trendData.length - 1)) * width;
      const y = height - ((d.rate / 100) * height);
      return `${x},${y}`;
    }).join(' ');
  };

  const trendPoints = createPolylinePoints();
  const trendPolygon = trendPoints ? `0,200 ${trendPoints} 1000,200` : '';

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-12 overflow-y-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-glow">
          <BarChart2 className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold text-gray-100">Reports</h1>
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-5 border-l-4 border-l-surfaceHighlight flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-surfaceHighlight flex items-center justify-center flex-shrink-0 text-gray-400">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-medium mb-1">Total Tasks</div>
            <div className="text-2xl font-black text-gray-100">{totalTasks}</div>
            <div className="text-[10px] text-gray-500 mt-1">All time</div>
          </div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-emerald-500 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-medium mb-1">Completed</div>
            <div className="text-2xl font-black text-emerald-500">{completedTasks}</div>
            <div className="text-[10px] text-gray-500 mt-1">All time</div>
          </div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-amber-500 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-500">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-medium mb-1">Pending</div>
            <div className="text-2xl font-black text-amber-500">{pendingTasks}</div>
            <div className="text-[10px] text-gray-500 mt-1">All time</div>
          </div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-primary flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-medium mb-1">Completion Rate</div>
            <div className="text-2xl font-black text-primary">{overallRate}%</div>
            <div className="text-[10px] text-gray-500 mt-1">All time</div>
          </div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-blue-500 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-500">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-medium mb-1">Focus Time</div>
            <div className="text-2xl font-black text-blue-500">{focusHours}h {focusMins}m</div>
            <div className="text-[10px] text-gray-500 mt-1">All time</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 2. ACTIVITY STATUS (TODAY) */}
        <div className="glass-card p-6 flex flex-col">
          <h3 className="text-sm font-bold text-gray-100 mb-6">Activity Status (Today)</h3>
          
          <div className="flex-1 flex flex-col items-center justify-center gap-6 pb-4">
            <div className="relative w-48 h-48">
              {todayTotal === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                  <CircleDashed className="w-12 h-12 mb-2 opacity-20" />
                  <span className="text-xs">No tasks today</span>
                </div>
              ) : (
                <>
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 drop-shadow-lg">
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#0B132B" strokeWidth="4" />
                    {donutSegments.map((segment, index) => {
                      if (segment.percentage === 0) return null;
                      return (
                        <circle
                          key={index}
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="transparent"
                          stroke={segment.color}
                          strokeWidth="4"
                          strokeDasharray={segment.dashArray}
                          strokeDashoffset={segment.offset}
                          className="transition-all duration-1000 ease-in-out"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-gray-100">{todayTotal}</span>
                    <span className="text-xs text-gray-400">Total</span>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 w-full max-w-[280px]">
              {donutData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", d.displayColor)} />
                    <span className="text-gray-400">{d.label}</span>
                  </div>
                  <div className="text-gray-200 ml-2 whitespace-nowrap">
                    {d.value} <span className="text-gray-600">({todayTotal > 0 ? Math.round((d.value/todayTotal)*100) : 0}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. TODAY'S BREAKDOWN & TIMELINE */}
        <div className="glass-card flex flex-col lg:col-span-2 overflow-hidden relative">
          <div className="grid grid-cols-1 md:grid-cols-2 h-full">
            <div className="p-6 border-r border-border/50 flex flex-col">
              <h3 className="text-sm font-bold text-gray-100 mb-6">Today's Breakdown</h3>
              
              <div className="flex flex-col gap-4 flex-1 justify-center pb-4">
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Tasks Completed</span>
                  <span className="font-bold text-gray-100">{todayCompleted}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><CircleDashed className="w-4 h-4 text-primary"/> Tasks Remaining</span>
                  <span className="font-bold text-gray-100">{todayRemaining}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><Target className="w-4 h-4 text-blue-500"/> Completion Rate</span>
                  <span className="font-bold text-gray-100">{todayRate}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500"/> Focus Time</span>
                  <span className="font-bold text-gray-100">{todayFocusFormatted}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><Zap className="w-4 h-4 text-warning"/> Routine Completion</span>
                  <span className="font-bold text-gray-100">{routineCompletionRate}%</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><Calendar className="w-4 h-4 text-rose-500"/> Reminders Completed</span>
                  <span className="font-bold text-gray-100">{todayRemindersCompleted}</span>
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col h-full bg-surfaceHighlight/10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-gray-100">Today Activity Timeline</h3>
                <span className="text-[10px] text-primary cursor-pointer hover:underline">View All</span>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[280px] custom-scrollbar">
                {timelineItems.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    No activities scheduled for today.
                  </div>
                ) : (
                  timelineItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-4">
                      <div className="flex flex-col items-center mt-1">
                        <div className={cn("w-2.5 h-2.5 rounded-full shadow-glow", item.statusColor)} />
                        <div className="w-[1px] h-8 bg-border/50 mt-1" />
                      </div>
                      <div className="flex flex-col pb-2">
                        <span className="text-[11px] font-medium text-gray-500 mb-0.5">{item.formattedTime}</span>
                        <span className="text-sm text-gray-200 line-clamp-1">{item.title}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        {/* 4. WEEKLY PERFORMANCE */}
        <div className="glass-card p-6 flex flex-col h-[340px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-bold text-gray-100">Weekly Performance</h3>
            <select className="bg-surfaceHighlight border border-border/50 rounded-lg text-xs text-gray-300 px-3 py-1.5 focus:outline-none focus:border-primary cursor-pointer">
              <option>This Week</option>
            </select>
          </div>
          
          <div className="flex-1 flex items-end gap-3 justify-between px-2 pb-2">
            {weeklyData.map((data, index) => {
              const heightPercent = maxWeeklyCount > 0 ? Math.round((data.count / maxWeeklyCount) * 100) : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center justify-end h-full gap-3 group">
                  <div className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    {data.count}
                  </div>
                  <div className="w-full relative h-full flex items-end justify-center">
                    <div 
                      className={cn(
                        "w-full max-w-[36px] rounded-t-md transition-all duration-700 relative overflow-hidden",
                        isSameDay(data.date, today) ? "bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "bg-primary/40 group-hover:bg-primary/60"
                      )}
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
                    </div>
                  </div>
                  <div className={cn(
                    "text-xs font-medium uppercase mt-1",
                    isSameDay(data.date, today) ? "text-primary font-bold" : "text-gray-500"
                  )}>
                    {data.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. PRODUCTIVITY TREND */}
        <div className="glass-card p-6 flex flex-col h-[340px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-bold text-gray-100">Productivity Trend</h3>
            <div className="flex bg-surfaceHighlight border border-border/50 rounded-lg overflow-hidden">
              <button 
                onClick={() => setTrendRange(7)}
                className={cn("px-3 py-1.5 text-xs font-medium transition-colors", trendRange === 7 ? "bg-primary text-white" : "text-gray-400 hover:text-gray-200")}
              >
                7 Days
              </button>
              <button 
                onClick={() => setTrendRange(30)}
                className={cn("px-3 py-1.5 text-xs font-medium transition-colors", trendRange === 30 ? "bg-primary text-white" : "text-gray-400 hover:text-gray-200")}
              >
                30 Days
              </button>
            </div>
          </div>
          
          <div className="flex-1 relative w-full h-full pb-6 pl-8">
            {/* Y-Axis Labels */}
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-gray-500 font-medium">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>

            {/* Grid lines */}
            <div className="absolute inset-0 left-8 bottom-6 flex flex-col justify-between">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="w-full border-b border-border/20 h-0" />
              ))}
            </div>
            
            {/* SVG Line Chart */}
            <div className="absolute inset-0 left-8 bottom-6">
              <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {trendPoints && (
                  <>
                    <polygon 
                      points={trendPolygon} 
                      fill="url(#trendGradient)" 
                      className="transition-all duration-1000 ease-in-out"
                    />
                    <polyline 
                      points={trendPoints} 
                      fill="none" 
                      stroke="#3B82F6" 
                      strokeWidth="4" 
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-1000 ease-in-out shadow-glow"
                    />
                    
                    {/* Data Points */}
                    {trendData.map((d, i) => {
                      const width = 1000;
                      const height = 200;
                      const x = (i / (trendData.length - 1)) * width;
                      const y = height - ((d.rate / 100) * height);
                      
                      if (trendRange === 30 && i % 3 !== 0 && i !== trendData.length - 1) return null;
                      
                      return (
                        <g key={i} className="group">
                          <circle cx={x} cy={y} r="5" fill="#0B132B" stroke="#3B82F6" strokeWidth="3" className="transition-all duration-300 group-hover:r-7 group-hover:fill-primary cursor-pointer" />
                          <text x={x} y={y - 15} textAnchor="middle" fill="#E5E7EB" fontSize="18" fontWeight="bold" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {d.rate}%
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}
              </svg>
            </div>

            {/* X-Axis Labels */}
            <div className="absolute left-8 right-0 bottom-0 flex justify-between text-[10px] font-medium text-gray-500 pt-2">
              {trendData.map((d, i) => {
                if (trendRange === 30 && i % 5 !== 0 && i !== trendData.length - 1) return null;
                return <span key={i}>{d.label}</span>;
              })}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default Reports;
