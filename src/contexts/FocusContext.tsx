import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type FocusContextType = {
  timeLeft: number;
  isActive: boolean;
  isPaused: boolean;
  sessionDuration: number;
  selectedTaskId: string;
  setSessionDuration: (duration: number) => void;
  setSelectedTaskId: (id: string) => void;
  handleStart: () => void;
  handlePause: () => void;
  handleReset: () => void;
  handleComplete: () => Promise<void>;
};

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export const FocusProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [sessionDuration, setSessionDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync timeLeft when sessionDuration changes and timer is not active
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(sessionDuration * 60);
    }
  }, [sessionDuration, isActive]);

  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused]);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(sessionDuration * 60);
  };

  const handleComplete = async () => {
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(sessionDuration * 60);
    
    if (user && supabase) {
      await supabase.from('focus_sessions').insert([{
        user_id: user.id,
        task_id: selectedTaskId || null,
        duration_minutes: sessionDuration,
        completed: true
      }]);
    }
  };

  return (
    <FocusContext.Provider value={{
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
    }}>
      {children}
    </FocusContext.Provider>
  );
};

export const useFocus = () => {
  const context = useContext(FocusContext);
  if (context === undefined) throw new Error('useFocus must be used within a FocusProvider');
  return context;
};
