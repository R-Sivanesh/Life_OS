import { Play, Pause, Square, CheckCircle, Clock } from 'lucide-react';
import { useTasks } from '../lib/useTasks';
import { useFocus } from '../contexts/FocusContext';
import { cn } from '../lib/utils';

const Focus = () => {
  const { tasks } = useTasks();
  const pendingTasks = tasks.filter(t => !t.completed);
  
  const {
    timeLeft,
    isActive,
    isPaused,
    sessionDuration,
    selectedTaskId,
    setSessionDuration,
    setSelectedTaskId,
    handleStart,
    handlePause,
    handleReset,
    handleComplete
  } = useFocus();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12 min-h-[500px] md:h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-glow">
          <Clock className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Focus Session</h1>
      </div>

      <div className="glass-card flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-cyan">Select Task to Focus On</label>
            <select 
              value={selectedTaskId} 
              onChange={e => setSelectedTaskId(e.target.value)}
              disabled={isActive}
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-primary disabled:opacity-50 appearance-none"
            >
              <option value="">No specific task (General Focus)</option>
              {pendingTasks.map(task => (
                <option key={task.id} value={task.id}>{task.title}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-[80px] md:text-[120px] font-black leading-none tracking-tighter text-text-primary tabular-nums shadow-primary/20" style={{ textShadow: '0 0 40px rgba(59,130,246,0.3)' }}>
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="flex justify-center gap-4">
            {!isActive || isPaused ? (
              <button onClick={handleStart} className="btn-primary w-16 h-16 rounded-2xl flex items-center justify-center shadow-glow">
                <Play className="w-6 h-6 fill-current" />
              </button>
            ) : (
              <button onClick={handlePause} className="w-16 h-16 rounded-2xl bg-warning/20 text-warning hover:bg-warning/30 flex items-center justify-center transition-colors">
                <Pause className="w-6 h-6 fill-current" />
              </button>
            )}
            
            <button onClick={handleReset} className="w-16 h-16 rounded-2xl bg-surface-elevated text-text-cyan hover:text-text-primary flex items-center justify-center transition-colors">
              <Square className="w-6 h-6 fill-current" />
            </button>
            
            <button onClick={handleComplete} disabled={!isActive && timeLeft === sessionDuration * 60} className="w-16 h-16 rounded-2xl bg-success/20 text-success hover:bg-success/30 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <CheckCircle className="w-6 h-6" />
            </button>
          </div>

          {!isActive && (
            <div className="flex justify-center gap-2 pt-8">
              {[15, 25, 45, 60].map(duration => (
                <button
                  key={duration}
                  onClick={() => {
                    setSessionDuration(duration);
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-medium transition-colors border",
                    sessionDuration === duration ? "bg-primary/20 text-primary border-primary/30" : "bg-surface-elevated text-text-muted border-transparent hover:text-text-cyan"
                  )}
                >
                  {duration} min
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Focus;
