import { Square } from 'lucide-react';
import { useFocus } from '../contexts/FocusContext';
import { useNavigate } from 'react-router-dom';

const FocusTimerWidget = () => {
  const {
    timeLeft,
    isActive,
    isPaused,
    sessionDuration,
    handleStart,
    handlePause,
    handleReset,
  } = useFocus();

  const navigate = useNavigate();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalSeconds = sessionDuration * 60;
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;

  return (
    <div className="glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[320px]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Progress Ring */}
        <div className="relative w-48 h-48 flex items-center justify-center cursor-pointer group" onClick={() => navigate('/focus')}>
          <svg viewBox="0 0 100 100" className="absolute w-full h-full transform -rotate-90 drop-shadow-lg">
            <circle 
              cx="50" cy="50" r="45" 
              fill="transparent" 
              stroke="#0B132B" 
              strokeWidth="4" 
            />
            <circle 
              cx="50" cy="50" r="45" 
              fill="transparent" 
              stroke="#3B82F6" 
              strokeWidth="4" 
              strokeLinecap="round"
              strokeDasharray={282.743}
              strokeDashoffset={282.743 - (progressPercent / 100) * 282.743}
              className="transition-all duration-1000 ease-linear"
              style={{
                filter: isActive && !isPaused ? 'drop-shadow(0 0 8px rgba(59,130,246,0.5))' : 'none'
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-text-primary tabular-nums tracking-tighter" style={{ textShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <p className="text-sm font-medium text-text-cyan mt-6 mb-6 h-5">
          {!isActive && !isPaused && 'Ready to focus'}
          {isActive && !isPaused && <span className="text-primary animate-pulse">Focus Session</span>}
          {isActive && isPaused && <span className="text-warning">Paused</span>}
        </p>

        <div className="flex items-center justify-center gap-3">
          {!isActive || isPaused ? (
            <button 
              onClick={handleStart} 
              className="btn-primary px-6 py-2 rounded-xl flex items-center justify-center shadow-glow text-sm font-bold flex-1 max-w-[120px]"
            >
              {isPaused ? 'Resume' : 'Start Focus'}
            </button>
          ) : (
            <button 
              onClick={handlePause} 
              className="px-6 py-2 rounded-xl bg-warning/20 text-warning hover:bg-warning/30 flex items-center justify-center transition-colors text-sm font-bold flex-1 max-w-[120px]"
            >
              Pause
            </button>
          )}
          
          {(isActive || isPaused) && (
            <button 
              onClick={handleReset} 
              className="w-10 h-10 rounded-xl bg-surface-elevated text-text-cyan hover:text-text-primary flex items-center justify-center transition-colors shrink-0"
              title="Stop Session"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FocusTimerWidget;
