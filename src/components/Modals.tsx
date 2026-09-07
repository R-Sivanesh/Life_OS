import React, { useState } from 'react';
import type { Task } from '../lib/useTasks';
import { X, Clock, Calendar as CalendarIcon, Tag, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface GlobalAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask?: (task: Partial<Task>) => void;
  onUpdateTask?: (id: string, task: Partial<Task>) => void;
  onSaveReminder?: (reminder: any) => void;
  onUpdateReminder?: (id: string, reminder: any) => void;
  initialDate?: Date | string;
  initialTask?: any;
}

export const GlobalAddModal: React.FC<GlobalAddModalProps> = ({ isOpen, onClose, onSaveTask, onUpdateTask, onSaveReminder, onUpdateReminder, initialDate, initialTask }) => {
  const [type, setType] = useState<'task' | 'reminder'>('task');
  
  // Shared fields
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate ? format(new Date(initialDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [priority, setPriority] = useState('Medium');
  
  // Task specific fields
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState('General');
  const [points, setPoints] = useState<number>(10);
  const [noSpecificTime, setNoSpecificTime] = useState(false);
  
  // Reminder specific fields
  const [reminderTime, setReminderTime] = useState('12:00');
  const [recurring, setRecurring] = useState('None');

  React.useEffect(() => {
    if (isOpen) {
      if (initialTask && initialTask._type !== 'reminder_new') {
        const isReminder = initialTask._type === 'reminder';
        setType(isReminder ? 'reminder' : 'task');
        setTitle(initialTask.title || '');
        setDate(initialTask.date || format(new Date(), 'yyyy-MM-dd'));
        setPriority(initialTask.priority ? initialTask.priority.charAt(0).toUpperCase() + initialTask.priority.slice(1) : 'Medium');
        
        if (isReminder) {
          setRecurring(initialTask.recurring || 'None');
          if (initialTask.time) {
            setReminderTime(initialTask.time.slice(0, 5));
            setNoSpecificTime(false);
          } else {
            setNoSpecificTime(true);
            setReminderTime('12:00');
          }
        } else {
          setDescription(initialTask.description || '');
          setCategory(initialTask.category || 'General');
          setPoints(typeof initialTask.points === 'number' && initialTask.points >= 0 ? initialTask.points : 10);
          if (initialTask.start_time) {
            setStartTime(initialTask.start_time.slice(0, 5));
            setEndTime(initialTask.end_time ? initialTask.end_time.slice(0, 5) : '10:00');
            setNoSpecificTime(false);
          } else {
            setNoSpecificTime(true);
          }
        }
      } else {
        if (initialTask && initialTask._type === 'reminder_new') {
          setType('reminder');
        } else {
          setType('task');
        }
        setTitle('');
        setDescription('');
        setDate(initialDate ? (typeof initialDate === 'string' && initialDate.includes('-') ? initialDate : format(new Date(initialDate), 'yyyy-MM-dd')) : format(new Date(), 'yyyy-MM-dd'));
        setPriority('Medium');
        setCategory('General');
        setPoints(10);
        setStartTime('09:00');
        setEndTime('10:00');
        setReminderTime('12:00');
        setRecurring('None');
        setNoSpecificTime(false);
      }
    }
  }, [isOpen, initialTask, initialDate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (type === 'task') {
      const safePoints = Math.max(0, Math.min(10000, Math.floor(Number(points) || 10)));
      const taskPayload: any = {
        title,
        description,
        date,
        start_time: noSpecificTime ? null : startTime,
        end_time: noSpecificTime ? null : endTime,
        priority: priority.toLowerCase(),
        category,
        points: safePoints,
        estimated_minutes: 60
      };
      
      if (initialTask && onUpdateTask) {
        onUpdateTask(initialTask.id as string, taskPayload);
      } else if (onSaveTask) {
        onSaveTask(taskPayload);
      }
    } else if (type === 'reminder' && onSaveReminder) {
      const reminderPayload: any = {
        title,
        date,
        time: noSpecificTime ? null : reminderTime,
        priority: priority.toLowerCase(),
        recurring: recurring === 'None' ? undefined : recurring
      };
      
      if (initialTask && initialTask._type === 'reminder' && onUpdateReminder) {
        onUpdateReminder(initialTask.id as string, reminderPayload);
      } else {
        onSaveReminder(reminderPayload);
      }
    }

    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-border bg-surface-elevated/50">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            {initialTask && initialTask._type !== 'reminder_new' ? `Edit ${initialTask._type === 'reminder' ? 'Reminder' : 'Task'}` : 'Add New'}
            {(!initialTask || initialTask._type === 'reminder_new') && (
              <div className="flex bg-surface rounded-lg p-0.5 ml-2 border border-border">
                <button 
                  type="button"
                  onClick={() => setType('task')}
                  className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors", type === 'task' ? "bg-primary text-white" : "text-text-cyan hover:text-text-primary")}
                >
                  Task
                </button>
                <button 
                  type="button"
                  onClick={() => setType('reminder')}
                  className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors", type === 'reminder' ? "bg-warning text-white" : "text-text-cyan hover:text-text-primary")}
                >
                  Reminder
                </button>
              </div>
            )}
          </h2>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-cyan mb-1">{type === 'task' ? 'Task Name' : 'Reminder Title'}</label>
            <input 
              type="text" value={title} onChange={e => setTitle(e.target.value)} required
              placeholder={type === 'task' ? "e.g. Learn Backend Development" : "e.g. Call Mom"} 
              className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {type === 'task' && (
            <div>
              <label className="block text-xs font-medium text-text-cyan mb-1">Description (optional)</label>
              <textarea 
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Add details..." rows={2}
                className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-cyan mb-1">Date</label>
              <div className="relative">
                <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input 
                  type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl py-2 pl-8 pr-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="col-span-full sm:col-span-2 flex items-center mb-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-cyan hover:text-text-primary transition-colors">
                <input 
                  type="checkbox" 
                  checked={noSpecificTime} 
                  onChange={e => setNoSpecificTime(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-primary bg-background border-border focus:ring-primary/50 cursor-pointer"
                />
                No specific time
              </label>
            </div>

            {type === 'task' ? (
              <>
                {!noSpecificTime && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-text-cyan mb-1">Start Time</label>
                      <div className="relative">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input 
                          type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                          className="w-full bg-surface border border-border rounded-xl py-2 pl-8 pr-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-cyan mb-1">End Time</label>
                      <div className="relative">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input 
                          type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                          className="w-full bg-surface border border-border rounded-xl py-2 pl-8 pr-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {!noSpecificTime && (
                  <div>
                    <label className="block text-xs font-medium text-text-cyan mb-1">Time</label>
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input 
                        type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl py-2 pl-8 pr-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-text-cyan mb-1">Priority</label>
              <div className="relative">
                <AlertCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <select 
                  value={priority} onChange={e => setPriority(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl py-2 pl-8 pr-3 text-sm text-text-primary focus:outline-none focus:border-primary appearance-none"
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>

            {type === 'task' ? (
              <div>
                <label className="block text-xs font-medium text-text-cyan mb-1">Category</label>
                <div className="relative">
                  <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <select 
                    value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl py-2 pl-8 pr-3 text-sm text-text-primary focus:outline-none focus:border-primary appearance-none"
                  >
                    <option>Work</option>
                    <option>Health</option>
                    <option>Learning</option>
                    <option>Personal</option>
                    <option>General</option>
                    <option>Study</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-text-cyan mb-1">Repeat</label>
                <select 
                  value={recurring} onChange={e => setRecurring(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary focus:outline-none focus:border-primary appearance-none"
                >
                  <option>None</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-text-cyan hover:text-text-primary hover:bg-surface-elevated transition-colors">
              Cancel
            </button>
            <button type="submit" className={cn("text-sm", type === 'task' ? "btn-primary" : "btn-warning")}>
              {initialTask ? 'Save Changes' : `Save ${type === 'task' ? 'Task' : 'Reminder'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ResetTasksModal = ({ 
  isOpen, 
  onClose, 
  onReset 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onReset: (scope: 'today' | 'all', password: string) => void 
}) => {
  const [scope, setScope] = useState<'today' | 'all'>('today');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    onReset(scope, password);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-surface-elevated border border-border w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border/50">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <span className="text-warning text-xl">⚠️</span> Reset Completed Tasks
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-text-cyan mb-3">Which tasks do you want to reset?</label>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" checked={scope === 'today'} onChange={() => setScope('today')} className="w-4 h-4 text-primary bg-background border-border focus:ring-primary/50" />
                <span className="text-text-cyan group-hover:text-text-primary transition-colors">Today's Completed Tasks</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} className="w-4 h-4 text-warning bg-background border-border focus:ring-warning/50" />
                <span className="text-text-cyan group-hover:text-text-primary transition-colors">All Completed Tasks (Entire History)</span>
              </label>
            </div>
          </div>
          
          <div className="pt-2">
            <label className="block text-sm font-medium text-text-cyan mb-1">Enter your password to confirm</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-warning focus:ring-1 focus:ring-warning transition-all"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-text-cyan hover:text-text-primary hover:bg-surface transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!password} className="btn-warning text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              Confirm Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AddRoutineModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  initialRoutine
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (routine: any, id?: string) => void,
  initialRoutine?: any
}) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [noSpecificTime, setNoSpecificTime] = useState(false);
  const [priority, setPriority] = useState('Medium');
  const [days, setDays] = useState<string[]>(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [errorMsg, setErrorMsg] = useState('');
  
  React.useEffect(() => {
    if (isOpen) {
      if (initialRoutine) {
        setTitle(initialRoutine.title || '');
        setPriority(initialRoutine.priority ? initialRoutine.priority.charAt(0).toUpperCase() + initialRoutine.priority.slice(1) : 'Medium');
        setDays(initialRoutine.days || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
        if (initialRoutine.time) {
          setStartTime(initialRoutine.time.slice(0, 5));
          if (initialRoutine.duration_minutes) {
            const [h, m] = initialRoutine.time.split(':').map(Number);
            const date = new Date();
            date.setHours(h, m + initialRoutine.duration_minutes, 0);
            setEndTime(date.toTimeString().slice(0, 5));
          } else {
            setEndTime('10:00');
          }
          setNoSpecificTime(false);
        } else {
          setNoSpecificTime(true);
          setStartTime('09:00');
          setEndTime('10:00');
        }
      } else {
        setTitle('');
        setStartTime('09:00');
        setEndTime('10:00');
        setNoSpecificTime(false);
        setPriority('Medium');
        setDays(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
      }
      setErrorMsg('');
    }
  }, [isOpen, initialRoutine]);

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    setDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    if (days.length === 0) {
      setErrorMsg('Please select at least one day');
      return;
    }

    let finalStartTime = startTime;
    let finalDuration = 30;

    if (!noSpecificTime) {
      const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
      const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
      
      if (endMinutes <= startMinutes) {
        setErrorMsg('End Time must be after Start Time');
        return;
      }
      finalDuration = endMinutes - startMinutes;
    }

    onSave({
      title,
      time: noSpecificTime ? null : finalStartTime,
      duration_minutes: noSpecificTime ? null : finalDuration,
      priority: priority.toLowerCase(),
      enabled: initialRoutine ? initialRoutine.enabled : true,
      days: days
    }, initialRoutine?.id);
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-surface-elevated border border-border w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border/50">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            {initialRoutine ? 'Edit Daily Routine' : 'New Daily Routine'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <label className="block text-xs font-medium text-text-cyan mb-1">Routine Title</label>
            <input 
              type="text" 
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Morning Workout"
              autoFocus
              required
              className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="noSpecificTimeRoutine" 
                checked={noSpecificTime} 
                onChange={e => setNoSpecificTime(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-primary focus:ring-offset-surface-elevated"
              />
              <label htmlFor="noSpecificTimeRoutine" className="text-xs text-text-cyan select-none cursor-pointer">
                No specific time
              </label>
            </div>

            {!noSpecificTime && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-cyan mb-1">Start Time</label>
                  <input 
                    type="time" 
                    value={startTime} onChange={e => { setStartTime(e.target.value); setErrorMsg(''); }}
                    required={!noSpecificTime}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-all [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-cyan mb-1">End Time</label>
                  <input 
                    type="time" 
                    value={endTime} onChange={e => { setEndTime(e.target.value); setErrorMsg(''); }}
                    required={!noSpecificTime}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
            )}
            {errorMsg && <p className="text-danger text-xs">{errorMsg}</p>}
          </div>
          
          <div>
            <label className="block text-xs font-medium text-text-cyan mb-1">Priority</label>
            <select 
              value={priority} onChange={e => setPriority(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary appearance-none"
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-cyan mb-2">Days</label>
            <div className="flex justify-between gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <button 
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "px-1 sm:px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex-1 text-center",
                    days.includes(day) ? "bg-primary text-white border-primary" : "bg-surface border border-border text-text-muted hover:text-text-primary hover:border-primary/50"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-text-cyan hover:text-text-primary hover:bg-surface transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!title} className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              Save Routine
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const GlobalDeleteModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  itemName 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void,
  itemName?: string
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-surface-elevated border border-border w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-border/50">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-danger" /> Delete this item?
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-2">
          {itemName && <p className="text-text-primary font-medium text-center">"{itemName}"</p>}
          <p className="text-text-cyan text-sm text-center">This action cannot be undone.</p>
        </div>
        
        <div className="flex justify-end gap-3 p-4 bg-surface/50 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-text-cyan hover:text-text-primary hover:bg-surface-elevated transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="text-sm font-bold bg-danger text-white px-4 py-2 rounded-xl hover:bg-danger/90 transition-colors shadow-lg shadow-danger/20">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
