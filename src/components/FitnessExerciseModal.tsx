import React, { useState, useEffect } from 'react';
import { X, Dumbbell, Clock, Repeat, Hash, FileText } from 'lucide-react';
import type { FitnessExercise } from '../contexts/FitnessContext';

interface FitnessExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exercise: Partial<FitnessExercise>) => void;
  initialExercise?: FitnessExercise | null;
}

const POPULAR_EXERCISES = [
  'Push-ups',
  'Squats',
  'Pull-ups',
  'Lunges',
  'Plank',
  'Bench Press',
  'Dumbbell Shoulder Press',
  'Dumbbell Rows',
  'Dumbbell Curls',
  'Bicep Curls',
  'Tricep Dips',
  'Deadlift',
  'Running',
  'Cycling'
];

export const FitnessExerciseModal: React.FC<FitnessExerciseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialExercise
}) => {
  const [name, setName] = useState('');
  const [sets, setSets] = useState<number | string>(3);
  const [targetReps, setTargetReps] = useState<number | string>(12);
  const [isBodyweight, setIsBodyweight] = useState(true);
  const [weight, setWeight] = useState<number | string>(0);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [restTimeSeconds, setRestTimeSeconds] = useState<number | string>(60);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialExercise) {
        setName(initialExercise.name || '');
        setSets(initialExercise.sets || 3);
        setTargetReps(initialExercise.target_reps || 12);
        const w = Number(initialExercise.weight) || 0;
        setIsBodyweight(w <= 0);
        setWeight(w);
        setWeightUnit((initialExercise.weight_unit as 'kg' | 'lb') || 'kg');
        setRestTimeSeconds(initialExercise.rest_time_seconds ?? 60);
        setNotes(initialExercise.notes || '');
      } else {
        setName('');
        setSets(3);
        setTargetReps(12);
        setIsBodyweight(true);
        setWeight(0);
        setWeightUnit('kg');
        setRestTimeSeconds(60);
        setNotes('');
      }
      setErrorMsg('');
    }
  }, [isOpen, initialExercise]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Exercise name is required');
      return;
    }

    const setsNum = parseInt(String(sets), 10);
    if (isNaN(setsNum) || setsNum <= 0) {
      setErrorMsg('Sets must be a positive integer (e.g. 1, 2, 3...)');
      return;
    }

    const repsNum = parseInt(String(targetReps), 10);
    if (isNaN(repsNum) || repsNum <= 0) {
      setErrorMsg('Target reps must be a positive integer');
      return;
    }

    const weightNum = isBodyweight ? 0 : Math.max(0, parseFloat(String(weight)) || 0);
    if (weightNum < 0) {
      setErrorMsg('Weight cannot be negative');
      return;
    }

    const restNum = Math.max(0, parseInt(String(restTimeSeconds), 10) || 0);
    if (restNum < 0) {
      setErrorMsg('Rest time cannot be negative');
      return;
    }

    onSave({
      name: trimmedName,
      sets: setsNum,
      target_reps: repsNum,
      weight: weightNum,
      weight_unit: weightUnit,
      rest_time_seconds: restNum,
      notes: notes.trim()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-border shadow-2xl">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b border-border bg-surface-elevated/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan/15 text-cyan flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">
              {initialExercise ? 'Edit Exercise' : 'Add Exercise'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Exercise Name */}
          <div>
            <label className="block text-xs font-medium text-text-cyan mb-1.5">
              Exercise Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMsg('');
              }}
              placeholder="e.g. Push-ups, Squats, Bench Press..."
              required
              autoFocus
              className="w-full bg-surface border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan transition-colors"
            />
            
            {/* Quick preset chips */}
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-text-muted mr-1">Suggestions:</span>
              {POPULAR_EXERCISES.slice(0, 6).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                    name === preset
                      ? 'bg-cyan/20 border-cyan text-cyan'
                      : 'bg-surface border-border text-text-muted hover:text-text-primary hover:border-cyan/40'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Sets & Target Reps Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-cyan mb-1.5">
                Sets <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  required
                  className="w-full bg-surface border border-border rounded-xl py-2.5 pl-9 pr-3 text-sm text-text-primary focus:outline-none focus:border-cyan transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-cyan mb-1.5">
                Target Reps <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Repeat className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={targetReps}
                  onChange={(e) => setTargetReps(e.target.value)}
                  required
                  className="w-full bg-surface border border-border rounded-xl py-2.5 pl-9 pr-3 text-sm text-text-primary focus:outline-none focus:border-cyan transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Weight & Bodyweight Options */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-border/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-cyan">Load / Resistance</span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-primary select-none">
                <input
                  type="checkbox"
                  checked={isBodyweight}
                  onChange={(e) => {
                    setIsBodyweight(e.target.checked);
                    if (e.target.checked) setWeight(0);
                  }}
                  className="w-3.5 h-3.5 rounded text-cyan bg-surface border-border focus:ring-cyan cursor-pointer"
                />
                Bodyweight (No added weight)
              </label>
            </div>

            {!isBodyweight && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-text-muted mb-1">Weight</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 5 or 20"
                    className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary focus:outline-none focus:border-cyan transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-muted mb-1">Unit</label>
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lb')}
                    className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary focus:outline-none focus:border-cyan appearance-none cursor-pointer"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="lb">lb (Pounds)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Rest Time */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-text-cyan">Rest Time (seconds)</label>
              <div className="flex gap-1.5">
                {[30, 60, 90, 120].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setRestTimeSeconds(sec)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      Number(restTimeSeconds) === sec
                        ? 'bg-cyan/20 border-cyan text-cyan'
                        : 'bg-surface border-border text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="number"
                min="0"
                step="5"
                value={restTimeSeconds}
                onChange={(e) => setRestTimeSeconds(e.target.value)}
                placeholder="60"
                className="w-full bg-surface border border-border rounded-xl py-2.5 pl-9 pr-3 text-sm text-text-primary focus:outline-none focus:border-cyan transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-text-cyan mb-1.5">
              Notes (optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-text-muted" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Form cues, tempo, seat position, adjustments..."
                className="w-full bg-surface border border-border rounded-xl py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan transition-colors resize-none"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-text-cyan hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-sm font-semibold px-5 py-2"
            >
              {initialExercise ? 'Save Changes' : 'Add Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
