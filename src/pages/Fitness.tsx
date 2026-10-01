import React, { useState } from 'react';
import { 
  Dumbbell, 
  Plus, 
  CheckCircle2, 
  Flame, 
  History, 
  Layers, 
  ArrowRight
} from 'lucide-react';
import { useFitness, type FitnessExercise } from '../contexts/FitnessContext';
import { FitnessExerciseCard } from '../components/FitnessExerciseCard';
import { FitnessCompletedCard } from '../components/FitnessCompletedCard';
import { FitnessExerciseModal } from '../components/FitnessExerciseModal';
import { FitnessWorkoutHistory } from '../components/FitnessWorkoutHistory';
import { FitnessRestTimerBanner } from '../components/FitnessRestTimerBanner';
import { cn } from '../lib/utils';

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

  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'history'>('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<FitnessExercise | null>(null);

  // Statistics calculation
  const pendingCount = pendingExercises.length;
  const completedCount = completedExercises.length;

  const totalSets = [...pendingExercises, ...completedExercises].reduce(
    (acc, ex) => acc + (ex.sets || 0), 0
  );

  const completedSets = completedExercises.reduce((acc, ex) => acc + (ex.sets || 0), 0) +
    pendingExercises.reduce((acc, ex) => {
      const sets = ex.loggedSets || [];
      return acc + sets.filter(s => s.completed).length;
    }, 0);

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
    <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-20">
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

      {/* Workout Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

        {/* Total Sets Card */}
        <div className="glass-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-cyan">Total Sets</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-text-primary">
              {totalSets}
            </span>
            <span className="text-xs text-text-muted font-medium">sets scheduled</span>
          </div>
        </div>

        {/* Completed Sets / Progress Card */}
        <div className="glass-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-cyan">Done</span>
            <span className="text-[10px] font-bold text-cyan bg-cyan/15 px-1.5 py-0.5 rounded">
              {totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-cyan">
              {completedSets}
            </span>
            <span className="text-sm font-semibold text-text-muted">/ {totalSets} sets</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation System */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2",
              activeTab === 'pending'
                ? "bg-primary text-white shadow-glow"
                : "text-text-cyan hover:text-text-primary hover:bg-surface-elevated"
            )}
          >
            <span>Pending Exercises</span>
            <span className={cn(
              "text-xs px-1.5 py-0.2 rounded-full",
              activeTab === 'pending' ? "bg-white/20 text-white" : "bg-surface-elevated text-text-muted"
            )}>
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2",
              activeTab === 'completed'
                ? "bg-primary text-white shadow-glow"
                : "text-text-cyan hover:text-text-primary hover:bg-surface-elevated"
            )}
          >
            <span>Completed Exercises</span>
            <span className={cn(
              "text-xs px-1.5 py-0.2 rounded-full",
              activeTab === 'completed' ? "bg-white/20 text-white" : "bg-surface-elevated text-text-muted"
            )}>
              {completedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2",
              activeTab === 'history'
                ? "bg-primary text-white shadow-glow"
                : "text-text-cyan hover:text-text-primary hover:bg-surface-elevated"
            )}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
            <span className={cn(
              "text-xs px-1.5 py-0.2 rounded-full",
              activeTab === 'history' ? "bg-white/20 text-white" : "bg-surface-elevated text-text-muted"
            )}>
              {workoutHistory.length}
            </span>
          </button>
        </div>

        {activeTab === 'pending' && pendingCount > 0 && (
          <span className="text-xs text-text-muted hidden md:inline">
            Use ▲ ▼ to reorder pending exercises
          </span>
        )}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-cyan/30 border-t-cyan rounded-full animate-spin" />
          <p className="text-xs text-text-muted">Loading your fitness routines...</p>
        </div>
      ) : (
        <>
          {/* 1. Pending Exercises Tab */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              {pendingExercises.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {pendingExercises.map((exercise, index) => (
                    <FitnessExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      onEdit={handleOpenEditModal}
                      isFirst={index === 0}
                      isLast={index === pendingExercises.length - 1}
                      onMoveUp={() => handleMoveUp(index)}
                      onMoveDown={() => handleMoveDown(index)}
                    />
                  ))}
                </div>
              ) : (
                <div className="glass-card p-10 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-success/15 text-success flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-text-primary">All exercises completed! 🎉</h3>
                  <p className="text-xs text-text-muted max-w-md">
                    You've finished all your planned exercises for today. Great job staying consistent!
                  </p>
                  <button
                    onClick={handleOpenAddModal}
                    className="btn-primary mt-2 text-xs font-semibold py-2 px-4 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Exercise
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. Completed Exercises Tab */}
          {activeTab === 'completed' && (
            <div className="space-y-4">
              {completedExercises.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {completedExercises.map((exercise) => (
                    <FitnessCompletedCard
                      key={exercise.id}
                      exercise={exercise}
                    />
                  ))}
                </div>
              ) : (
                <div className="glass-card p-10 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-surface-elevated text-text-muted flex items-center justify-center">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-text-primary">No completed exercises yet</h3>
                  <p className="text-xs text-text-muted max-w-sm">
                    Start a workout in the Pending tab and complete your sets to see them listed here.
                  </p>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className="btn-primary mt-2 text-xs font-semibold py-2 px-4 flex items-center gap-1.5"
                  >
                    Go to Pending Exercises <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. Workout History Tab */}
          {activeTab === 'history' && (
            <FitnessWorkoutHistory />
          )}
        </>
      )}

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
