import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface FitnessSet {
  id?: string;
  user_id?: string;
  exercise_id: string;
  set_number: number;
  target_reps: number;
  actual_reps: number;
  weight: number;
  weight_unit: string;
  completed: boolean;
  completed_at?: string;
}

export interface FitnessExercise {
  id: string;
  user_id?: string;
  name: string;
  sets: number;
  target_reps: number;
  weight: number;
  weight_unit: string;
  rest_time_seconds: number;
  notes?: string;
  order_index: number;
  status: 'pending' | 'completed';
  completed: boolean;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  // Local/in-progress tracking state
  loggedSets?: FitnessSet[];
  activeSetIndex?: number;
}

export interface FitnessLog {
  id: string;
  user_id?: string;
  exercise_id?: string;
  exercise_name: string;
  sets_completed: number;
  total_sets: number;
  target_reps: number;
  actual_reps_summary?: string;
  weight: number;
  weight_unit: string;
  duration_seconds?: number;
  completed_at: string;
  created_at?: string;
}

export interface RestTimerState {
  isActive: boolean;
  isPaused: boolean;
  secondsLeft: number;
  totalSeconds: number;
  exerciseName?: string;
  setNumber?: number;
}

interface FitnessContextType {
  exercises: FitnessExercise[];
  pendingExercises: FitnessExercise[];
  completedExercises: FitnessExercise[];
  workoutHistory: FitnessLog[];
  loading: boolean;
  
  // CRUD
  addExercise: (data: Partial<FitnessExercise>) => Promise<FitnessExercise | undefined>;
  updateExercise: (id: string, updates: Partial<FitnessExercise>) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  reorderExercises: (reordered: FitnessExercise[]) => Promise<void>;
  
  // Set & Workout Tracking
  recordSet: (exerciseId: string, setNumber: number, actualReps: number, weight: number, completed: boolean) => Promise<void>;
  completeExercise: (exerciseId: string, customSets?: FitnessSet[]) => Promise<void>;
  reopenExercise: (exerciseId: string) => Promise<void>;
  resetExerciseSession: (exerciseId: string) => void;
  
  // Rest Timer
  timerState: RestTimerState;
  startRestTimer: (seconds: number, exerciseName?: string, setNumber?: number) => void;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
  addTimerSeconds: (seconds: number) => void;
  stopRestTimer: () => void;
  
  // Progress & Stats
  getExerciseBestAndPrevious: (exerciseName: string) => {
    previousSummary?: string;
    bestReps?: number;
    bestWeight?: number;
    weightUnit?: string;
    progressDelta?: string;
    totalCompletions: number;
  };
  
  refresh: () => Promise<void>;
}

const FitnessContext = createContext<FitnessContextType | undefined>(undefined);

// Web Audio sound generator for rest timer completion beep
function playTimerCompleteBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Play a friendly two-tone chime
    const playTone = (freq: number, delay: number, dur: number) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
      }, delay);
    };

    playTone(587.33, 0, 0.2);   // D5
    playTone(880.00, 220, 0.4); // A5
  } catch (e) {
    // AudioContext autoplay restrictions or disabled sound
  }
}

// Default initial starter exercises for a fresh user
const DEFAULT_STARTER_EXERCISES: Omit<FitnessExercise, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Push-ups',
    sets: 3,
    target_reps: 12,
    weight: 0,
    weight_unit: 'kg',
    rest_time_seconds: 60,
    notes: 'Keep core tight and maintain full range of motion.',
    order_index: 0,
    status: 'pending',
    completed: false
  },
  {
    name: 'Squats',
    sets: 4,
    target_reps: 15,
    weight: 0,
    weight_unit: 'kg',
    rest_time_seconds: 60,
    notes: 'Chest up, break at hips and knees down to parallel.',
    order_index: 1,
    status: 'pending',
    completed: false
  },
  {
    name: 'Dumbbell Shoulder Press',
    sets: 3,
    target_reps: 10,
    weight: 5,
    weight_unit: 'kg',
    rest_time_seconds: 90,
    notes: 'Press overhead smoothly without arching lower back.',
    order_index: 2,
    status: 'pending',
    completed: false
  }
];

export const FitnessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<FitnessExercise[]>([]);
  const [setsData, setSetsData] = useState<FitnessSet[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<FitnessLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Rest Timer State
  const [timerState, setTimerState] = useState<RestTimerState>({
    isActive: false,
    isPaused: false,
    secondsLeft: 0,
    totalSeconds: 0
  });

  const exercisesRef = useRef<FitnessExercise[]>([]);
  exercisesRef.current = exercises;

  const setsDataRef = useRef<FitnessSet[]>([]);
  setsDataRef.current = setsData;

  // LocalStorage keys for instant persistence & offline resiliency
  const getStorageKey = useCallback((suffix: string) => {
    return `lifeos_fitness_${user?.id || 'guest'}_${suffix}`;
  }, [user]);

  // Load from database / local storage
  const fetchFitnessData = useCallback(async () => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Exercises
      const { data: exData, error: exErr } = await supabase
        .from('fitness_exercises')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true });

      // 2. Fetch Sets
      const { data: setData, error: setErr } = await supabase
        .from('fitness_sets')
        .select('*')
        .eq('user_id', user.id)
        .order('set_number', { ascending: true });

      // 3. Fetch Workout History Logs
      const { data: logData, error: logErr } = await supabase
        .from('fitness_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (!exErr && exData) {
        if (exData.length === 0 && !localStorage.getItem(getStorageKey('initialized'))) {
          // Initialize default starter exercises for new user
          localStorage.setItem(getStorageKey('initialized'), 'true');
          const seeded: FitnessExercise[] = [];
          for (let i = 0; i < DEFAULT_STARTER_EXERCISES.length; i++) {
            const def = DEFAULT_STARTER_EXERCISES[i];
            const payload = {
              ...def,
              user_id: user.id,
              order_index: i
            };
            const { data: inserted } = await supabase.from('fitness_exercises').insert([payload]).select();
            if (inserted && inserted.length > 0) {
              seeded.push(inserted[0]);
              // Create initial empty set rows
              for (let s = 1; s <= inserted[0].sets; s++) {
                await supabase.from('fitness_sets').insert([{
                  user_id: user.id,
                  exercise_id: inserted[0].id,
                  set_number: s,
                  target_reps: inserted[0].target_reps,
                  actual_reps: inserted[0].target_reps,
                  weight: inserted[0].weight || 0,
                  weight_unit: inserted[0].weight_unit || 'kg',
                  completed: false
                }]);
              }
            }
          }
          if (seeded.length > 0) {
            setExercises(seeded);
          }
        } else {
          setExercises(exData);
        }
      }

      if (!setErr && setData) {
        setSetsData(setData);
      }

      if (!logErr && logData) {
        setWorkoutHistory(logData);
      }
    } catch (err) {
      console.error('[FITNESS] Error fetching fitness data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, getStorageKey]);

  useEffect(() => {
    fetchFitnessData();
  }, [fetchFitnessData]);

  // Rest Timer Interval Worker
  useEffect(() => {
    if (!timerState.isActive || timerState.isPaused) return;

    const interval = setInterval(() => {
      setTimerState(prev => {
        if (!prev.isActive || prev.isPaused) return prev;
        if (prev.secondsLeft <= 1) {
          playTimerCompleteBeep();
          return {
            ...prev,
            isActive: false,
            secondsLeft: 0
          };
        }
        return {
          ...prev,
          secondsLeft: prev.secondsLeft - 1
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isActive, timerState.isPaused]);

  // Combine exercises with their logged sets
  const enrichedExercises = useMemo(() => {
    return exercises.map(ex => {
      const exSets = setsData
        .filter(s => s.exercise_id === ex.id)
        .sort((a, b) => a.set_number - b.set_number);

      // If setsData doesn't have records for this exercise yet, create defaults
      let populatedSets = exSets;
      if (populatedSets.length === 0) {
        populatedSets = Array.from({ length: ex.sets }, (_, i) => ({
          exercise_id: ex.id,
          set_number: i + 1,
          target_reps: ex.target_reps,
          actual_reps: ex.target_reps,
          weight: Number(ex.weight) || 0,
          weight_unit: ex.weight_unit || 'kg',
          completed: ex.completed
        }));
      }

      const activeSetIdx = populatedSets.findIndex(s => !s.completed);

      return {
        ...ex,
        loggedSets: populatedSets,
        activeSetIndex: activeSetIdx === -1 ? populatedSets.length : activeSetIdx
      };
    });
  }, [exercises, setsData]);

  const pendingExercises = useMemo(() => {
    return enrichedExercises.filter(e => !e.completed && e.status !== 'completed');
  }, [enrichedExercises]);

  const completedExercises = useMemo(() => {
    return enrichedExercises.filter(e => e.completed || e.status === 'completed');
  }, [enrichedExercises]);

  // Rest Timer Controls
  const startRestTimer = useCallback((seconds: number, exerciseName?: string, setNumber?: number) => {
    if (seconds <= 0) return;
    setTimerState({
      isActive: true,
      isPaused: false,
      secondsLeft: seconds,
      totalSeconds: seconds,
      exerciseName,
      setNumber
    });
  }, []);

  const pauseRestTimer = useCallback(() => {
    setTimerState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resumeRestTimer = useCallback(() => {
    setTimerState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const addTimerSeconds = useCallback((seconds: number) => {
    setTimerState(prev => ({
      ...prev,
      secondsLeft: prev.secondsLeft + seconds,
      totalSeconds: Math.max(prev.totalSeconds, prev.secondsLeft + seconds)
    }));
  }, []);

  const stopRestTimer = useCallback(() => {
    setTimerState({
      isActive: false,
      isPaused: false,
      secondsLeft: 0,
      totalSeconds: 0
    });
  }, []);

  // CRUD Actions
  const addExercise = useCallback(async (data: Partial<FitnessExercise>): Promise<FitnessExercise | undefined> => {
    if (!user || !supabase) return;

    const tempId = `temp_ex_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
    const newSetsCount = Math.max(1, parseInt(data.sets as any, 10) || 3);
    const newTargetReps = Math.max(1, parseInt(data.target_reps as any, 10) || 12);
    const newWeight = Math.max(0, parseFloat(data.weight as any) || 0);
    const restTime = Math.max(0, parseInt(data.rest_time_seconds as any, 10) || 60);

    const nextOrder = exercisesRef.current.length > 0 
      ? Math.max(...exercisesRef.current.map(e => e.order_index || 0)) + 1 
      : 0;

    const optimisticExercise: FitnessExercise = {
      id: tempId,
      user_id: user.id,
      name: (data.name || 'New Exercise').trim(),
      sets: newSetsCount,
      target_reps: newTargetReps,
      weight: newWeight,
      weight_unit: data.weight_unit || 'kg',
      rest_time_seconds: restTime,
      notes: data.notes || '',
      order_index: nextOrder,
      status: 'pending',
      completed: false,
      created_at: new Date().toISOString()
    };

    // Optimistically create default set rows
    const optimisticSets: FitnessSet[] = Array.from({ length: newSetsCount }, (_, i) => ({
      id: `temp_set_${tempId}_${i + 1}`,
      user_id: user.id,
      exercise_id: tempId,
      set_number: i + 1,
      target_reps: newTargetReps,
      actual_reps: newTargetReps,
      weight: newWeight,
      weight_unit: data.weight_unit || 'kg',
      completed: false
    }));

    setExercises(prev => [...prev, optimisticExercise]);
    setSetsData(prev => [...prev, ...optimisticSets]);

    // Background sync
    (async () => {
      try {
        const payload: any = {
          user_id: user.id,
          name: optimisticExercise.name,
          sets: optimisticExercise.sets,
          target_reps: optimisticExercise.target_reps,
          weight: optimisticExercise.weight,
          weight_unit: optimisticExercise.weight_unit,
          rest_time_seconds: optimisticExercise.rest_time_seconds,
          notes: optimisticExercise.notes,
          order_index: optimisticExercise.order_index,
          status: 'pending',
          completed: false
        };

        const { data: dbEx, error } = await supabase.from('fitness_exercises').insert([payload]).select();
        if (error) {
          console.error('[FITNESS] Insert error:', error);
          // Revert
          setExercises(prev => prev.filter(e => e.id !== tempId));
          setSetsData(prev => prev.filter(s => s.exercise_id !== tempId));
        } else if (dbEx && dbEx.length > 0) {
          const realExercise = dbEx[0];
          // Replace tempId with real database id
          setExercises(prev => prev.map(e => e.id === tempId ? realExercise : e));

          // Insert actual set rows in DB
          const setsPayload = Array.from({ length: newSetsCount }, (_, i) => ({
            user_id: user.id,
            exercise_id: realExercise.id,
            set_number: i + 1,
            target_reps: newTargetReps,
            actual_reps: newTargetReps,
            weight: newWeight,
            weight_unit: data.weight_unit || 'kg',
            completed: false
          }));

          const { data: dbSets } = await supabase.from('fitness_sets').insert(setsPayload).select();
          if (dbSets) {
            setSetsData(prev => [
              ...prev.filter(s => s.exercise_id !== tempId),
              ...dbSets
            ]);
          }
        }
      } catch (e) {
        console.error('[FITNESS] Add exercise network error:', e);
      }
    })();

    return optimisticExercise;
  }, [user]);

  const updateExercise = useCallback(async (id: string, updates: Partial<FitnessExercise>) => {
    if (!supabase) return;

    const prevExercise = exercisesRef.current.find(e => e.id === id);
    if (!prevExercise) return;

    const cleanedUpdates = { ...updates };
    delete cleanedUpdates.loggedSets;
    delete cleanedUpdates.activeSetIndex;

    const updatedExercise: FitnessExercise = {
      ...prevExercise,
      ...cleanedUpdates
    };

    // 1. Optimistic update
    setExercises(prev => prev.map(e => e.id === id ? updatedExercise : e));

    // If sets or target_reps changed, adapt the setsData state
    if (updates.sets !== undefined || updates.target_reps !== undefined || updates.weight !== undefined) {
      const newSetsCount = updates.sets !== undefined ? Math.max(1, updates.sets) : prevExercise.sets;
      const newTargetReps = updates.target_reps !== undefined ? Math.max(1, updates.target_reps) : prevExercise.target_reps;
      const newWeight = updates.weight !== undefined ? updates.weight : prevExercise.weight;

      setSetsData(prev => {
        const existingForEx = prev.filter(s => s.exercise_id === id);
        const otherSets = prev.filter(s => s.exercise_id !== id);

        const adjusted: FitnessSet[] = [];
        for (let i = 1; i <= newSetsCount; i++) {
          const match = existingForEx.find(s => s.set_number === i);
          if (match) {
            adjusted.push({
              ...match,
              target_reps: newTargetReps,
              weight: match.completed ? match.weight : (newWeight ?? match.weight)
            });
          } else {
            adjusted.push({
              user_id: user?.id,
              exercise_id: id,
              set_number: i,
              target_reps: newTargetReps,
              actual_reps: newTargetReps,
              weight: newWeight || 0,
              weight_unit: updates.weight_unit || prevExercise.weight_unit || 'kg',
              completed: false
            });
          }
        }
        return [...otherSets, ...adjusted];
      });
    }

    // 2. Background sync
    (async () => {
      try {
        const { error } = await supabase.from('fitness_exercises').update(cleanedUpdates).eq('id', id);
        if (error) {
          console.error('[FITNESS] Update error:', error);
          setExercises(prev => prev.map(e => e.id === id ? prevExercise : e));
        }
      } catch (e) {
        console.error('[FITNESS] Update network error:', e);
        setExercises(prev => prev.map(e => e.id === id ? prevExercise : e));
      }
    })();
  }, [user]);

  const deleteExercise = useCallback(async (id: string) => {
    if (!supabase) return;

    const prevExercises = [...exercisesRef.current];
    const prevSets = [...setsDataRef.current];

    // 1. Optimistic remove
    setExercises(prev => prev.filter(e => e.id !== id));
    setSetsData(prev => prev.filter(s => s.exercise_id !== id));

    // 2. Background DB delete
    (async () => {
      try {
        await supabase.from('fitness_sets').delete().eq('exercise_id', id);
        const { error } = await supabase.from('fitness_exercises').delete().eq('id', id);
        if (error) {
          console.error('[FITNESS] Delete error:', error);
          setExercises(prevExercises);
          setSetsData(prevSets);
        }
      } catch (e) {
        console.error('[FITNESS] Delete network error:', e);
        setExercises(prevExercises);
        setSetsData(prevSets);
      }
    })();
  }, []);

  const reorderExercises = useCallback(async (reordered: FitnessExercise[]) => {
    if (!supabase) return;

    // Apply updated order indices locally
    const updated = reordered.map((ex, idx) => ({
      ...ex,
      order_index: idx
    }));

    setExercises(prev => {
      const remaining = prev.filter(p => !updated.some(u => u.id === p.id));
      return [...updated, ...remaining];
    });

    // Background sync
    (async () => {
      try {
        for (const item of updated) {
          await supabase.from('fitness_exercises').update({ order_index: item.order_index }).eq('id', item.id);
        }
      } catch (e) {
        console.error('[FITNESS] Reorder sync error:', e);
      }
    })();
  }, []);

  // Complete full exercise, generate history log & update state
  const completeExercise = useCallback(async (exerciseId: string, customSets?: FitnessSet[]) => {
    if (!user || !supabase) return;

    const targetExercise = exercisesRef.current.find(e => e.id === exerciseId);
    if (!targetExercise) return;

    const completedAt = new Date().toISOString();
    const exSets = customSets || setsDataRef.current.filter(s => s.exercise_id === exerciseId);

    // Build actual reps summary e.g. "12, 12, 10"
    const repsSummary = exSets.length > 0 
      ? exSets.sort((a, b) => a.set_number - b.set_number).map(s => s.actual_reps ?? s.target_reps).join(', ')
      : `${targetExercise.target_reps} reps`;

    const avgOrMaxWeight = exSets.length > 0 
      ? Math.max(...exSets.map(s => Number(s.weight) || 0))
      : targetExercise.weight;

    // 1. Optimistic exercise update
    setExercises(prev => prev.map(e => e.id === exerciseId ? {
      ...e,
      status: 'completed',
      completed: true,
      completed_at: completedAt
    } : e));

    // Ensure all sets are marked complete
    setSetsData(prev => prev.map(s => s.exercise_id === exerciseId ? {
      ...s,
      completed: true,
      completed_at: s.completed_at || completedAt
    } : s));

    // 2. Add to Workout History Logs
    const newLog: FitnessLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user_id: user.id,
      exercise_id: exerciseId,
      exercise_name: targetExercise.name,
      sets_completed: targetExercise.sets,
      total_sets: targetExercise.sets,
      target_reps: targetExercise.target_reps,
      actual_reps_summary: repsSummary,
      weight: avgOrMaxWeight,
      weight_unit: targetExercise.weight_unit || 'kg',
      completed_at: completedAt,
      created_at: completedAt
    };

    setWorkoutHistory(prev => [newLog, ...prev]);

    // 3. Background DB sync
    (async () => {
      try {
        await supabase.from('fitness_exercises').update({
          status: 'completed',
          completed: true,
          completed_at: completedAt
        }).eq('id', exerciseId);

        // Insert log record
        const logPayload = {
          user_id: user.id,
          exercise_id: exerciseId,
          exercise_name: targetExercise.name,
          sets_completed: targetExercise.sets,
          total_sets: targetExercise.sets,
          target_reps: targetExercise.target_reps,
          actual_reps_summary: repsSummary,
          weight: avgOrMaxWeight,
          weight_unit: targetExercise.weight_unit || 'kg',
          completed_at: completedAt
        };

        const { data: insertedLog } = await supabase.from('fitness_logs').insert([logPayload]).select();
        if (insertedLog && insertedLog.length > 0) {
          setWorkoutHistory(prev => prev.map(l => l.id === newLog.id ? insertedLog[0] : l));
        }
      } catch (e) {
        console.error('[FITNESS] Complete exercise DB error:', e);
      }
    })();
  }, [user]);

  // Complete an individual set & check for full exercise completion
  const recordSet = useCallback(async (
    exerciseId: string,
    setNumber: number,
    actualReps: number,
    weight: number,
    completed: boolean
  ) => {
    if (!user || !supabase) return;

    const nowIso = new Date().toISOString();
    const targetExercise = exercisesRef.current.find(e => e.id === exerciseId);
    if (!targetExercise) return;

    // Update sets in local state
    let updatedSetsForEx: FitnessSet[] = [];
    setSetsData(prev => {
      const existing = prev.find(s => s.exercise_id === exerciseId && s.set_number === setNumber);
      const other = prev.filter(s => !(s.exercise_id === exerciseId && s.set_number === setNumber));

      const updatedSet: FitnessSet = existing ? {
        ...existing,
        actual_reps: actualReps,
        weight: weight,
        completed: completed,
        completed_at: completed ? nowIso : undefined
      } : {
        user_id: user.id,
        exercise_id: exerciseId,
        set_number: setNumber,
        target_reps: targetExercise.target_reps,
        actual_reps: actualReps,
        weight: weight,
        weight_unit: targetExercise.weight_unit || 'kg',
        completed: completed,
        completed_at: completed ? nowIso : undefined
      };

      const nextAll = [...other, updatedSet];
      updatedSetsForEx = nextAll.filter(s => s.exercise_id === exerciseId);
      return nextAll;
    });

    // Sync set to DB
    (async () => {
      try {
        const setPayload = {
          user_id: user.id,
          exercise_id: exerciseId,
          set_number: setNumber,
          target_reps: targetExercise.target_reps,
          actual_reps: actualReps,
          weight: weight,
          weight_unit: targetExercise.weight_unit || 'kg',
          completed: completed,
          completed_at: completed ? nowIso : null
        };

        const existingInDb = setsDataRef.current.find(s => s.exercise_id === exerciseId && s.set_number === setNumber && s.id);
        if (existingInDb && existingInDb.id && !existingInDb.id.startsWith('temp_')) {
          await supabase.from('fitness_sets').update(setPayload).eq('id', existingInDb.id);
        } else {
          await supabase.from('fitness_sets').insert([setPayload]);
        }
      } catch (e) {
        console.error('[FITNESS] Record set DB error:', e);
      }
    })();

    // Check if all sets for this exercise are completed
    const totalRequiredSets = targetExercise.sets;
    const completedCount = updatedSetsForEx.filter(s => s.completed).length;

    if (completed && completedCount >= totalRequiredSets) {
      // AUTOMATICALLY MOVE TO COMPLETED EXERCISES!
      await completeExercise(exerciseId, updatedSetsForEx);
    }
  }, [user, completeExercise]);

  // Reopen or Restart exercise (move back from completed to pending)
  const reopenExercise = useCallback(async (exerciseId: string) => {
    if (!user || !supabase) return;

    const targetExercise = exercisesRef.current.find(e => e.id === exerciseId);
    if (!targetExercise) return;

    // 1. Optimistic update
    setExercises(prev => prev.map(e => e.id === exerciseId ? {
      ...e,
      status: 'pending',
      completed: false,
      completed_at: undefined
    } : e));

    // Reset sets completion to false so user can perform again
    setSetsData(prev => prev.map(s => s.exercise_id === exerciseId ? {
      ...s,
      completed: false,
      completed_at: undefined
    } : s));

    // 2. Background DB update
    (async () => {
      try {
        await supabase.from('fitness_exercises').update({
          status: 'pending',
          completed: false,
          completed_at: null
        }).eq('id', exerciseId);

        await supabase.from('fitness_sets').update({
          completed: false,
          completed_at: null
        }).eq('exercise_id', exerciseId);
      } catch (e) {
        console.error('[FITNESS] Reopen exercise error:', e);
      }
    })();
  }, [user]);

  // Reset in-progress sets for an active exercise session without changing exercise config
  const resetExerciseSession = useCallback((exerciseId: string) => {
    setSetsData(prev => prev.map(s => s.exercise_id === exerciseId ? {
      ...s,
      completed: false,
      completed_at: undefined
    } : s));
  }, []);

  // Performance over time & progress insights for an exercise
  const getExerciseBestAndPrevious = useCallback((exerciseName: string) => {
    if (!exerciseName) return { totalCompletions: 0 };

    const matchingLogs = workoutHistory
      .filter(l => l.exercise_name.toLowerCase().trim() === exerciseName.toLowerCase().trim())
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

    if (matchingLogs.length === 0) {
      return { totalCompletions: 0 };
    }

    const latest = matchingLogs[0];
    const previous = matchingLogs.length > 1 ? matchingLogs[1] : undefined;

    let bestReps = 0;
    let bestWeight = 0;
    let weightUnit = latest.weight_unit || 'kg';

    matchingLogs.forEach(log => {
      if (Number(log.weight) > bestWeight) {
        bestWeight = Number(log.weight);
        weightUnit = log.weight_unit || 'kg';
      }
      if (log.actual_reps_summary) {
        const parsedReps = log.actual_reps_summary
          .split(',')
          .map(r => parseInt(r.trim(), 10))
          .filter(n => !isNaN(n));
        parsedReps.forEach(r => {
          if (r > bestReps) bestReps = r;
        });
      }
      if (log.target_reps > bestReps) {
        bestReps = Math.max(bestReps, log.target_reps);
      }
    });

    let progressDelta: string | undefined;
    if (previous && latest) {
      const prevTotalReps = previous.target_reps;
      const currTotalReps = latest.target_reps;
      const diff = currTotalReps - prevTotalReps;
      if (diff > 0) {
        progressDelta = `+${diff} reps per set`;
      } else if (Number(latest.weight) > Number(previous.weight)) {
        progressDelta = `+${Number(latest.weight) - Number(previous.weight)} ${latest.weight_unit}`;
      }
    }

    const prevSummary = previous 
      ? `${previous.sets_completed} × ${previous.target_reps} ${previous.weight > 0 ? `(${previous.weight} ${previous.weight_unit})` : ''}`
      : undefined;

    return {
      previousSummary: prevSummary,
      bestReps: bestReps > 0 ? bestReps : undefined,
      bestWeight: bestWeight > 0 ? bestWeight : undefined,
      weightUnit,
      progressDelta,
      totalCompletions: matchingLogs.length
    };
  }, [workoutHistory]);

  const value = useMemo(() => ({
    exercises: enrichedExercises,
    pendingExercises,
    completedExercises,
    workoutHistory,
    loading,
    addExercise,
    updateExercise,
    deleteExercise,
    reorderExercises,
    recordSet,
    completeExercise,
    reopenExercise,
    resetExerciseSession,
    timerState,
    startRestTimer,
    pauseRestTimer,
    resumeRestTimer,
    addTimerSeconds,
    stopRestTimer,
    getExerciseBestAndPrevious,
    refresh: fetchFitnessData
  }), [
    enrichedExercises,
    pendingExercises,
    completedExercises,
    workoutHistory,
    loading,
    addExercise,
    updateExercise,
    deleteExercise,
    reorderExercises,
    recordSet,
    completeExercise,
    reopenExercise,
    resetExerciseSession,
    timerState,
    startRestTimer,
    pauseRestTimer,
    resumeRestTimer,
    addTimerSeconds,
    stopRestTimer,
    getExerciseBestAndPrevious,
    fetchFitnessData
  ]);

  return (
    <FitnessContext.Provider value={value}>
      {children}
    </FitnessContext.Provider>
  );
};

export const useFitness = () => {
  const context = useContext(FitnessContext);
  if (!context) {
    throw new Error('useFitness must be used within a FitnessProvider');
  }
  return context;
};
