import React, { useState } from 'react';
import { 
  Play, 
  Check, 
  Edit2, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Clock, 
  TrendingUp, 
  RotateCcw,
  Award
} from 'lucide-react';
import { useFitness, type FitnessExercise, type FitnessSet } from '../contexts/FitnessContext';
import { useDeleteModal } from '../contexts/DeleteModalContext';

interface FitnessExerciseCardProps {
  exercise: FitnessExercise;
  onEdit: (exercise: FitnessExercise) => void;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const FitnessExerciseCard: React.FC<FitnessExerciseCardProps> = ({
  exercise,
  onEdit,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown
}) => {
  const { 
    recordSet, 
    deleteExercise, 
    startRestTimer, 
    resetExerciseSession,
    getExerciseBestAndPrevious 
  } = useFitness();
  const { confirmDelete } = useDeleteModal();

  const [isExpanded, setIsExpanded] = useState(false);

  // Fallback sets if not populated
  const totalSets = exercise.sets || 3;
  const loggedSets: FitnessSet[] = exercise.loggedSets || Array.from({ length: totalSets }, (_, i) => ({
    exercise_id: exercise.id,
    set_number: i + 1,
    target_reps: exercise.target_reps,
    actual_reps: exercise.target_reps,
    weight: Number(exercise.weight) || 0,
    weight_unit: exercise.weight_unit || 'kg',
    completed: false
  }));

  const completedSetsCount = loggedSets.filter(s => s.completed).length;
  const progressPercent = Math.round((completedSetsCount / totalSets) * 100);
  const activeSetIdx = loggedSets.findIndex(s => !s.completed);
  const currentActiveSet = activeSetIdx !== -1 ? loggedSets[activeSetIdx] : loggedSets[loggedSets.length - 1];

  // Performance history comparison
  const stats = getExerciseBestAndPrevious(exercise.name);

  // State for editable inputs on the active set
  const [activeRepsInput, setActiveRepsInput] = useState<number | string>(
    currentActiveSet ? currentActiveSet.actual_reps : exercise.target_reps
  );
  const [activeWeightInput, setActiveWeightInput] = useState<number | string>(
    currentActiveSet ? currentActiveSet.weight : exercise.weight
  );

  // Sync inputs when active set changes
  React.useEffect(() => {
    if (currentActiveSet) {
      setActiveRepsInput(currentActiveSet.actual_reps ?? exercise.target_reps);
      setActiveWeightInput(currentActiveSet.weight ?? exercise.weight);
    }
  }, [currentActiveSet, exercise.target_reps, exercise.weight]);

  const handleCompleteCurrentSet = async () => {
    if (!currentActiveSet) return;
    const reps = Math.max(1, parseInt(String(activeRepsInput), 10) || exercise.target_reps);
    const weight = Math.max(0, parseFloat(String(activeWeightInput)) || 0);

    await recordSet(
      exercise.id,
      currentActiveSet.set_number,
      reps,
      weight,
      true
    );

    // If not the final set, start optional rest timer
    if (currentActiveSet.set_number < totalSets && exercise.rest_time_seconds > 0) {
      startRestTimer(exercise.rest_time_seconds, exercise.name, currentActiveSet.set_number);
    }
  };

  const handleToggleSetManual = async (set: FitnessSet) => {
    await recordSet(
      exercise.id,
      set.set_number,
      set.actual_reps ?? set.target_reps,
      set.weight ?? exercise.weight,
      !set.completed
    );
  };

  const handleUpdateSetReps = async (setNumber: number, repsVal: number) => {
    const s = loggedSets.find(item => item.set_number === setNumber);
    if (!s) return;
    await recordSet(
      exercise.id,
      setNumber,
      Math.max(1, repsVal),
      s.weight ?? exercise.weight,
      s.completed
    );
  };

  const handleUpdateSetWeight = async (setNumber: number, weightVal: number) => {
    const s = loggedSets.find(item => item.set_number === setNumber);
    if (!s) return;
    await recordSet(
      exercise.id,
      setNumber,
      s.actual_reps ?? s.target_reps,
      Math.max(0, weightVal),
      s.completed
    );
  };

  return (
    <div className="glass-card bg-surface/90 border border-border hover:border-cyan/40 transition-all duration-200 overflow-hidden shadow-card">
      {/* Main Card Header / Summary */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title & Performance Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight truncate">
                {exercise.name}
              </h3>

              {stats.progressDelta && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/15 border border-success/30 px-2 py-0.5 rounded-md">
                  <TrendingUp className="w-3 h-3" />
                  {stats.progressDelta}
                </span>
              )}

              {stats.bestReps !== undefined && stats.bestReps > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan bg-cyan/10 border border-cyan/20 px-2 py-0.5 rounded-md">
                  <Award className="w-3 h-3" />
                  Best: {stats.bestReps} reps {stats.bestWeight ? `· ${stats.bestWeight} ${stats.weightUnit}` : ''}
                </span>
              )}
            </div>

            {/* Exercise Configuration Subtitle */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
              <span className="text-text-primary font-semibold">
                {exercise.sets} Sets × {exercise.target_reps} Reps
              </span>
              <span>•</span>
              <span>
                {Number(exercise.weight) > 0 
                  ? `${exercise.weight} ${exercise.weight_unit || 'kg'}` 
                  : 'Bodyweight'}
              </span>
              {exercise.rest_time_seconds > 0 && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-text-cyan">
                    <Clock className="w-3 h-3" /> {exercise.rest_time_seconds}s rest
                  </span>
                </>
              )}
            </div>

            {exercise.notes && (
              <p className="text-xs text-text-muted/80 mt-1.5 line-clamp-1 italic">
                "{exercise.notes}"
              </p>
            )}
          </div>

          {/* Action Buttons: Reorder, Edit, Delete */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex flex-col">
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                className="p-1 text-text-muted hover:text-text-primary disabled:opacity-20 disabled:hover:text-text-muted transition-colors rounded"
                title="Move Up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast}
                className="p-1 text-text-muted hover:text-text-primary disabled:opacity-20 disabled:hover:text-text-muted transition-colors rounded"
                title="Move Down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => onEdit(exercise)}
              className="p-2 text-text-muted hover:text-cyan hover:bg-cyan/10 rounded-xl transition-colors"
              title="Edit Exercise"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => confirmDelete(exercise.name, () => deleteExercise(exercise.id))}
              className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-colors"
              title="Delete Exercise"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Status Line */}
        <div className="mt-4 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-text-cyan">
              Progress: <span className="text-text-primary font-bold">{completedSetsCount} / {totalSets} sets</span>
            </span>
            <span className="text-text-muted font-medium font-mono text-[11px]">
              {progressPercent}%
            </span>
          </div>

          <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan to-primary transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Start / Expand Workout Button Area */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {!isExpanded ? (
            <button
              onClick={() => setIsExpanded(true)}
              className="btn-primary w-full sm:w-auto py-2 px-5 text-xs font-bold flex items-center justify-center gap-2 shadow-glow"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {completedSetsCount > 0 ? 'Continue Workout' : 'Start Workout'}
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsExpanded(false)}
                className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-selected border border-border text-xs font-medium text-text-cyan hover:text-text-primary transition-colors"
              >
                Minimize
              </button>
              {completedSetsCount > 0 && (
                <button
                  onClick={() => resetExerciseSession(exercise.id)}
                  className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-selected border border-border text-xs font-medium text-text-muted hover:text-warning transition-colors flex items-center gap-1"
                  title="Reset completed sets for today"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Sets
                </button>
              )}
            </div>
          )}

          {stats.previousSummary && (
            <span className="text-[11px] text-text-muted">
              Previous: <strong className="text-text-cyan">{stats.previousSummary}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Expanded Workout / Set-by-Set Tracking Panel */}
      {isExpanded && (
        <div className="bg-surface-elevated/40 border-t border-border p-4 sm:p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Active Set Quick-Complete Banner */}
          {activeSetIdx !== -1 && currentActiveSet && (
            <div className="p-4 rounded-xl bg-cyan/10 border border-cyan/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan">
                    Current: Set {currentActiveSet.set_number} / {totalSets}
                  </span>
                </div>
                <p className="text-sm font-semibold text-text-primary mt-1">
                  Target: {exercise.target_reps} reps {Number(exercise.weight) > 0 ? `· ${exercise.weight} ${exercise.weight_unit}` : ''}
                </p>
              </div>

              {/* Editable inputs for actual reps & weight + Complete button */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl px-2.5 py-1.5">
                  <span className="text-xs text-text-muted">Reps:</span>
                  <input
                    type="number"
                    min="1"
                    value={activeRepsInput}
                    onChange={(e) => setActiveRepsInput(e.target.value)}
                    className="w-12 bg-transparent text-sm font-bold text-text-primary focus:outline-none text-center"
                  />
                </div>

                {!Number.isNaN(Number(exercise.weight)) && (
                  <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl px-2.5 py-1.5">
                    <span className="text-xs text-text-muted">Weight:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={activeWeightInput}
                      onChange={(e) => setActiveWeightInput(e.target.value)}
                      className="w-12 bg-transparent text-sm font-bold text-text-primary focus:outline-none text-center"
                    />
                    <span className="text-[11px] text-text-muted">{exercise.weight_unit || 'kg'}</span>
                  </div>
                )}

                <button
                  onClick={handleCompleteCurrentSet}
                  className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-glow whitespace-nowrap"
                >
                  <Check className="w-4 h-4" strokeWidth={3} />
                  Complete Set
                </button>
              </div>
            </div>
          )}

          {/* All Sets Breakdown Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-text-cyan uppercase tracking-wider">
                All Sets ({completedSetsCount}/{totalSets} Done)
              </h4>
              <span className="text-[11px] text-text-muted">
                Tap checkmark or edit reps to customize each set
              </span>
            </div>

            <div className="space-y-2">
              {loggedSets.map((set) => {
                const isCurrent = activeSetIdx === set.set_number - 1;
                return (
                  <div
                    key={set.set_number}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      set.completed
                        ? 'bg-success/5 border-success/30 text-text-primary'
                        : isCurrent
                        ? 'bg-surface border-cyan/50 shadow-[inset_3px_0_0_0_var(--cyan)]'
                        : 'bg-surface border-border opacity-70'
                    }`}
                  >
                    {/* Set Number & Status */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleSetManual(set)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors shrink-0 ${
                          set.completed
                            ? 'bg-success border-success text-background shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                            : 'border-border hover:border-cyan text-transparent hover:text-cyan/40'
                        }`}
                        title={set.completed ? 'Set completed' : 'Mark set as completed'}
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </button>

                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-text-primary">
                          Set {set.set_number}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          Target: {set.target_reps} reps
                        </span>
                      </div>
                    </div>

                    {/* Actual Reps & Weight inputs */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-text-muted hidden sm:inline">Reps:</label>
                        <input
                          type="number"
                          min="1"
                          value={set.actual_reps ?? set.target_reps}
                          onChange={(e) => handleUpdateSetReps(set.set_number, parseInt(e.target.value, 10) || 1)}
                          className="w-12 bg-surface border border-border rounded-lg py-1 px-1.5 text-xs text-center font-semibold text-text-primary focus:outline-none focus:border-cyan"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-text-muted hidden sm:inline">Load:</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={set.weight ?? exercise.weight ?? 0}
                          onChange={(e) => handleUpdateSetWeight(set.set_number, parseFloat(e.target.value) || 0)}
                          className="w-14 bg-surface border border-border rounded-lg py-1 px-1.5 text-xs text-center font-semibold text-text-primary focus:outline-none focus:border-cyan"
                        />
                        <span className="text-[10px] text-text-muted">{exercise.weight_unit || 'kg'}</span>
                      </div>

                      <span className="text-xs font-bold shrink-0 w-6 text-center">
                        {set.completed ? (
                          <span className="text-success">✓</span>
                        ) : (
                          <span className="text-text-muted">○</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
