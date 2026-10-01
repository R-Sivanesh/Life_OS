import React, { useState } from 'react';
import { 
  Dumbbell, 
  Plus, 
  CheckCircle2, 
  Flame, 
  History as HistoryIcon
} from 'lucide-react';
import { useFitness, type FitnessExercise } from '../contexts/FitnessContext';
import { FitnessExerciseCard } from '../components/FitnessExerciseCard';
import { FitnessCompletedCard } from '../components/FitnessCompletedCard';
import { FitnessExerciseModal } from '../components/FitnessExerciseModal';
import { FitnessWorkoutHistory } from '../components/FitnessWorkoutHistory';
import { FitnessRestTimerBanner } from '../components/FitnessRestTimerBanner';

const Fitness: React.FC = () => {
  const {
    pendingExercises,
    completedExercises,
    workoutHistory,
    addExercise,
    updateExercise,
    reorderExercises,
    loading
  } = useFitness();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<FitnessExercise | null>(null);

  // Statistics calculation
  const pendingCount = pendingExercises.length;
  const completedCount = completedExercises.length;

  const handleOpenAddModal = () => {
    setEditingExercise(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exercise: FitnessExercise) => {
    setEditingExercise(exercise);
    setIsModalOpen(true);
  };

  const handleSaveExercise = async (data: Partial<FitnessExercise>) => {
    if (editingExercise) {
      await updateExercise(editingExercise.id, data);
    } else {
      await addExercise(data);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const reordered = [...pendingExercises];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;
    reorderExercises(reordered);
  };

  const handleMoveDown = (index: number) => {
    if (index >= pendingExercises.length - 1) return;
    const reordered = [...pendingExercises];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;
    reorderExercises(reordered);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1500px] mx-auto pb-24">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan/20 flex items-center justify-center text-cyan shadow-glow">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">Fitness</h1>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                Track your workouts, exercises, sets, reps and progress.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="btn-primary flex items-center justify-center gap-2 py-2.5 px-5 text-sm font-semibold shadow-glow self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Exercise</span>
        </button>
      </div>

      {/* Workout Summary Metric Cards (2 Cards Only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pending Exercises Card */}
        <div className="glass-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-cyan">Pending</span>
            <Flame className="w-4 h-4 text-warning" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-text-primary">
              {pendingCount}
            </span>
            <span className="text-xs text-text-muted font-medium">exercises</span>
          </div>
        </div>

        {/* Completed Exercises Card */}
        <div className="glass-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-cyan">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-success">
              {completedCount}
            </span>
            <span className="text-xs text-text-muted font-medium">done</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Side-by-Side Exercise Area */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-cyan/30 border-t-cyan rounded-full animate-spin" />
          <p className="text-xs text-text-muted">Loading your fitness routines...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT COLUMN: PENDING EXERCISES */}
          <div className="glass-card flex flex-col overflow-hidden border border-border lg:h-[calc(100vh-19rem)] min-h-[460px]">
            {/* Column Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-surface-elevated/40 sticky top-0 z-10 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
                <h3 className="text-sm sm:text-base font-bold text-text-primary tracking-wide uppercase">
                  Pending Exercises
                </h3>
              </div>
              <span className="text-xs font-bold text-cyan bg-cyan/15 border border-cyan/30 px-2.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            </div>

            {/* Scrollable Pending List */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-3.5 custom-scrollbar">
              {pendingExercises.length > 0 ? (
                pendingExercises.map((exercise, index) => (
                  <FitnessExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onEdit={handleOpenEditModal}
                    isFirst={index === 0}
                    isLast={index === pendingExercises.length - 1}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                  />
                ))
              ) : (
                <div className="h-full py-16 flex flex-col items-center justify-center text-center p-6 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-success/15 text-success flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-text-primary">All exercises completed! 🎉</h4>
                  <p className="text-xs text-text-muted max-w-xs">
                    You have finished every planned exercise for today. Add a new exercise to keep going.
                  </p>
                  <button
                    onClick={handleOpenAddModal}
                    className="btn-primary mt-2 text-xs font-semibold py-2 px-4 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Exercise
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: COMPLETED EXERCISES */}
          <div className="glass-card flex flex-col overflow-hidden border border-border lg:h-[calc(100vh-19rem)] min-h-[460px] opacity-90 hover:opacity-100 transition-opacity">
            {/* Column Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-surface-elevated/40 sticky top-0 z-10 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
                <h3 className="text-sm sm:text-base font-bold text-text-primary tracking-wide uppercase">
                  Completed Exercises
                </h3>
              </div>
              <span className="text-xs font-bold text-success bg-success/15 border border-success/30 px-2.5 py-0.5 rounded-full">
                {completedCount}
              </span>
            </div>

            {/* Scrollable Completed List */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
              {completedExercises.length > 0 ? (
                completedExercises.map((exercise) => (
                  <FitnessCompletedCard
                    key={exercise.id}
                    exercise={exercise}
                  />
                ))
              ) : (
                <div className="h-full py-16 flex flex-col items-center justify-center text-center p-6 gap-3 text-text-muted">
                  <div className="w-12 h-12 rounded-2xl bg-surface-elevated flex items-center justify-center">
                    <Dumbbell className="w-6 h-6 opacity-40" />
                  </div>
                  <h4 className="text-sm font-bold text-text-primary">No completed exercises yet</h4>
                  <p className="text-xs text-text-muted max-w-xs">
                    Start an exercise on the left and complete your sets to see them completed here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workout History Section (Positioned below the two-column main area) */}
      <div className="mt-2 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-text-primary uppercase tracking-wider">
            <HistoryIcon className="w-4 h-4 text-primary" />
            <span>Workout History</span>
            <span className="text-xs text-text-muted font-medium">({workoutHistory.length} sessions logged)</span>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-6 border border-border">
          <FitnessWorkoutHistory />
        </div>
      </div>

      {/* Add / Edit Exercise Modal */}
      <FitnessExerciseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveExercise}
        initialExercise={editingExercise}
      />

      {/* Floating Rest Timer Widget */}
      <FitnessRestTimerBanner />
    </div>
  );
};

export default Fitness;
