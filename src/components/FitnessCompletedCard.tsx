import { CheckCircle2, RotateCcw, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useFitness, type FitnessExercise } from '../contexts/FitnessContext';
import { useDeleteModal } from '../contexts/DeleteModalContext';

interface FitnessCompletedCardProps {
  exercise: FitnessExercise;
}

export const FitnessCompletedCard: React.FC<FitnessCompletedCardProps> = ({ exercise }) => {
  const { reopenExercise, deleteExercise } = useFitness();
  const { confirmDelete } = useDeleteModal();

  const formattedTime = exercise.completed_at 
    ? (() => {
        try {
          return format(new Date(exercise.completed_at), 'h:mm a');
        } catch {
          return '';
        }
      })()
    : 'Today';

  const formattedDate = exercise.completed_at
    ? (() => {
        try {
          return format(new Date(exercise.completed_at), 'MMMM d, yyyy');
        } catch {
          return '';
        }
      })()
    : '';

  // Get actual logged sets summary if available
  const loggedSets = exercise.loggedSets || [];
  const repsSummary = loggedSets.length > 0 
    ? loggedSets.map(s => s.actual_reps ?? s.target_reps).join(', ')
    : `${exercise.target_reps} reps`;

  return (
    <div className="glass-card bg-surface/70 border border-success/30 hover:border-success/50 transition-all duration-200 p-4 sm:p-5 rounded-2xl shadow-card relative overflow-hidden group">
      {/* Subtle green glow accent in background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-success/20 text-success flex items-center justify-center shrink-0 border border-success/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text-primary">
                {exercise.name}
              </h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-success/15 border border-success/30 text-success">
                Done
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted mt-1">
              <span className="text-text-primary font-medium">
                {exercise.sets} Sets × {exercise.target_reps} Reps
              </span>
              <span>•</span>
              <span>
                {Number(exercise.weight) > 0 
                  ? `${exercise.weight} ${exercise.weight_unit || 'kg'}` 
                  : 'Bodyweight'}
              </span>
              {loggedSets.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-text-cyan">Logged: [{repsSummary}]</span>
                </>
              )}
            </div>

            {formattedTime && (
              <p className="text-[11px] text-success/90 font-medium flex items-center gap-1.5 mt-2">
                <Clock className="w-3 h-3" />
                Completed at {formattedTime} {formattedDate ? `· ${formattedDate}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Reopen & Delete Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => reopenExercise(exercise.id)}
            className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-selected border border-border text-xs font-semibold text-text-cyan hover:text-cyan transition-colors flex items-center gap-1.5"
            title="Move back to Pending to do again"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Repeat</span>
          </button>

          <button
            onClick={() => confirmDelete(exercise.name, () => deleteExercise(exercise.id))}
            className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-colors"
            title="Delete Exercise"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
