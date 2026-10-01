import React from 'react';
import { Play, Pause, FastForward, X, Timer, Plus } from 'lucide-react';
import { useFitness } from '../contexts/FitnessContext';

export const FitnessRestTimerBanner: React.FC = () => {
  const {
    timerState,
    pauseRestTimer,
    resumeRestTimer,
    addTimerSeconds,
    stopRestTimer
  } = useFitness();

  if (!timerState.isActive) return null;

  const minutes = Math.floor(timerState.secondsLeft / 60);
  const seconds = timerState.secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  const progressPercent = timerState.totalSeconds > 0 
    ? Math.max(0, Math.min(100, (timerState.secondsLeft / timerState.totalSeconds) * 100))
    : 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md animate-in slide-in-from-bottom-5 duration-300">
      <div className="glass-card bg-surface/95 backdrop-blur-xl border border-cyan/40 p-4 rounded-2xl shadow-[0_8px_32px_rgba(0,184,255,0.18)] flex flex-col gap-3">
        {/* Top line with title and close button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan/20 text-cyan flex items-center justify-center animate-pulse">
              <Timer className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Rest Timer</span>
              {timerState.exerciseName && (
                <span className="text-[11px] text-text-muted ml-2">
                  {timerState.exerciseName} {timerState.setNumber ? `(Set ${timerState.setNumber})` : ''}
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={stopRestTimer}
            className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-elevated transition-colors"
            title="Close timer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Timer Display & Controls Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-cyan tracking-tight font-mono">
              {timeFormatted}
            </span>
            {timerState.isPaused && (
              <span className="text-[10px] font-bold text-warning uppercase px-1.5 py-0.5 rounded bg-warning/15 border border-warning/30">
                Paused
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* +15s button */}
            <button
              onClick={() => addTimerSeconds(15)}
              className="px-2.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-selected border border-border text-xs font-semibold text-text-cyan hover:text-cyan transition-colors flex items-center gap-1"
              title="Add 15 seconds"
            >
              <Plus className="w-3 h-3" /> 15s
            </button>

            {/* Pause / Resume button */}
            {timerState.isPaused ? (
              <button
                onClick={resumeRestTimer}
                className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Resume
              </button>
            ) : (
              <button
                onClick={pauseRestTimer}
                className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-selected border border-border text-xs font-bold text-text-primary transition-colors flex items-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5 fill-current" /> Pause
              </button>
            )}

            {/* Skip button */}
            <button
              onClick={stopRestTimer}
              className="px-3 py-1.5 rounded-xl bg-danger/15 hover:bg-danger/25 border border-danger/30 text-xs font-bold text-danger transition-colors flex items-center gap-1"
              title="Skip rest"
            >
              <FastForward className="w-3.5 h-3.5" /> Skip
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan to-primary transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
