import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, Trash2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { useFitness, type FitnessExercise } from '../contexts/FitnessContext';
import { useDeleteModal } from '../contexts/DeleteModalContext';

interface FitnessCompletedCardProps {
  exercise: FitnessExercise;
}

export const FitnessCompletedCard: React.FC<FitnessCompletedCardProps> = ({ exercise }) => {
  const { reopenExercise, deleteExercise } = useFitness();
  const { confirmDelete } = useDeleteModal();
  const [showDetails, setShowDetails] = useState(false);

  const formattedTime = exercise.completed_at 
    ? (() => {
        try {
          return format(new Date(exercise.completed_at), 'h:mm a');
        } catch {
          return '';
        }
      })()
    : 'Completed';

  // Get actual logged sets
  const loggedSets = exercise.loggedSets || [];
  const repsSummary = loggedSets.length > 0 
    ? loggedSets.map(s => s.actual_reps ?? s.target_reps).join(', ')
    : `${exercise.target_reps} reps`;

  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-surface/90 border border-success/20 hover:border-success/40 transition-all duration-200 shadow-sm relative overflow-hidden group">
      <div className="flex items-start justify-between gap-3">
        {/* Left icon + details */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-success/15 text-success flex items-center justify-center shrink-0 border border-success/30 shadow-[0_0_10px_rgba(16,185,129,0.15)] mt-0.5">
            <CheckCircle2 className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-text-primary truncate">
                {exercise.name}
              </h4>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-success/15 border border-success/30 text-success">
                Done
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted mt-1">
              <span className="text-text-primary font-medium">
                {exercise.sets} Sets × {exercise.target_reps} Reps
              </span>
              <span>•</span>
              <span>
                {Number(exercise.weight) > 0 
                  ? `${exercise.weight} ${exercise.weight_unit || 'kg'}` 
                  : 'Bodyweight'}
              </span>
            </div>

            {formattedTime && (
              <p className="text-[11px] text-text-muted flex items-center gap-1 mt-1.5">
                <Clock className="w-3 h-3 text-success/80" />
                Completed: <span className="text-success font-medium">{formattedTime}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right Action buttons: Repeat, View Details, Delete */}
        <div className="flex items-center gap-1.5 shrink-0">
          {loggedSets.length > 0 && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-2 py-1 rounded-lg bg-surface-elevated hover:bg-surface-selected border border-border text-[11px] font-medium text-text-cyan hover:text-text-primary transition-colors flex items-center gap-1"
              title="View set breakdown"
            >
              <span>{showDetails ? 'Hide' : 'Details'}</span>
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          <button
            onClick={() => reopenExercise(exercise.id)}
            className="px-2 py-1 rounded-lg bg-surface-elevated hover:bg-surface-selected border border-border text-[11px] font-semibold text-text-cyan hover:text-cyan transition-colors flex items-center gap-1"
            title="Move back to Pending to do again"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Repeat</span>
          </button>

          <button
            onClick={() => confirmDelete(exercise.name, () => deleteExercise(exercise.id))}
            className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
            title="Delete Exercise"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Details Breakdown */}
      {showDetails && loggedSets.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/60 text-xs animate-in slide-in-from-top-1 duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {loggedSets.map((s) => (
              <div key={s.set_number} className="bg-surface-elevated/60 px-2.5 py-1.5 rounded-lg border border-border/50 flex items-center justify-between">
                <span className="text-[11px] text-text-muted font-medium">Set {s.set_number}:</span>
                <span className="text-[11px] font-bold text-text-primary">
                  {s.actual_reps ?? s.target_reps} reps {Number(s.weight) > 0 ? `· ${s.weight}${s.weight_unit || 'kg'}` : ''}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-text-muted mt-2">
            Summary: [{repsSummary}]
          </p>
        </div>
      )}
    </div>
  );
};
