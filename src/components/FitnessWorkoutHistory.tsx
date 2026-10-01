import React from 'react';
import { Calendar, Check, History, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useFitness, type FitnessLog } from '../contexts/FitnessContext';

export const FitnessWorkoutHistory: React.FC = () => {
  const { workoutHistory } = useFitness();

  // Group workout logs by date string
  const groupedByDate = React.useMemo(() => {
    const groups: { [dateStr: string]: FitnessLog[] } = {};

    workoutHistory.forEach((log) => {
      let dateKey = 'Earlier';
      try {
        if (log.completed_at) {
          dateKey = format(new Date(log.completed_at), 'MMMM d, yyyy');
        }
      } catch {
        dateKey = 'Recent';
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });

    return Object.entries(groups);
  }, [workoutHistory]);

  if (workoutHistory.length === 0) {
    return (
      <div className="glass-card p-8 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-surface-elevated text-text-muted flex items-center justify-center">
          <History className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-text-primary">No workout history yet</h4>
        <p className="text-xs text-text-muted max-w-sm">
          Complete exercises in your workout list to start logging your session history and tracking performance over time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedByDate.map(([dateStr, logs]) => (
        <div key={dateStr} className="space-y-3">
          {/* Date Header */}
          <div className="flex items-center gap-2 text-xs font-bold text-cyan uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            <span>{dateStr}</span>
            <span className="text-text-muted font-normal">({logs.length} completed)</span>
          </div>

          {/* Cards for that date */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {logs.map((log) => {
              const timeStr = log.completed_at 
                ? (() => {
                    try {
                      return format(new Date(log.completed_at), 'h:mm a');
                    } catch {
                      return '';
                    }
                  })()
                : '';

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-xl bg-surface/80 border border-border hover:border-cyan/30 transition-all flex items-start justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-success/15 text-success flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {log.exercise_name}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted mt-0.5">
                        <span className="text-text-primary font-medium">
                          {log.sets_completed} × {log.target_reps}
                        </span>
                        <span>•</span>
                        <span>
                          {Number(log.weight) > 0
                            ? `${log.weight} ${log.weight_unit || 'kg'}`
                            : 'Bodyweight'}
                        </span>
                      </div>

                      {log.actual_reps_summary && (
                        <p className="text-[11px] text-text-cyan mt-1">
                          Sets: [{log.actual_reps_summary}]
                        </p>
                      )}
                    </div>
                  </div>

                  {timeStr && (
                    <span className="text-[10px] text-text-muted shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {timeStr}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
