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
  
  const [expectedEndTime, setExpectedEndTime] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync timeLeft when sessionDuration changes and timer is not active
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(sessionDuration * 60);
    }
  }, [sessionDuration, isActive]);

  const checkTimer = () => {
    if (!expectedEndTime) return;
    const remaining = Math.max(0, Math.round((expectedEndTime - Date.now()) / 1000));
    if (remaining <= 0) {
      handleComplete();
      
      // Request notification if permission hasn't been asked
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("Focus Session Complete", { body: "Great job! Take a break." });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(permission => {
            if (permission === "granted") {
              new Notification("Focus Session Complete", { body: "Great job! Take a break." });
            }
          });
        }
      }
    } else {
      setTimeLeft(remaining);
    }
  };

  useEffect(() => {
    if (isActive && !isPaused && expectedEndTime) {
      timerRef.current = setInterval(checkTimer, 1000);
      
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          checkTimer();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused, expectedEndTime]);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    setExpectedEndTime(Date.now() + timeLeft * 1000);
  };

  const handlePause = () => {
    setIsPaused(true);
    setExpectedEndTime(null);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(sessionDuration * 60);
    setExpectedEndTime(null);
  };

  const handleComplete = async () => {
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(sessionDuration * 60);
    setExpectedEndTime(null);
    
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
