import { useEffect } from 'react';
import { useReminders } from '../lib/useReminders';
import { useDeleteModal } from '../contexts/DeleteModalContext';
import { Bell, Check, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { cn, formatTimeDisplay, openReminderModal } from '../lib/utils';
import { format } from 'date-fns';

const Reminders = () => {
  const { reminders, completeReminder, uncompleteReminder, deleteReminder, refresh } = useReminders();
  const { confirmDelete } = useDeleteModal();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pendingReminders = reminders.filter(r => !r.completed).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (!a.time && b.time) return 1;
    if (a.time && !b.time) return -1;
    if (!a.time && !b.time) return 0;
    return a.time!.localeCompare(b.time!);
  });
  
  const completedReminders = reminders.filter(r => r.completed).sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (!a.time && b.time) return 1;
    if (a.time && !b.time) return -1;
    if (!a.time && !b.time) return 0;
    return b.time!.localeCompare(a.time!); // Note: completed sorts reverse for time
  });

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-danger bg-danger/10 border-danger/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'low': return 'text-cyan bg-cyan/10 border-cyan/20';
      default: return 'text-text-cyan bg-surface-elevated border-border';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center text-warning shadow-glow">
          <Bell className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">All Reminders</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card flex-1 flex flex-col overflow-hidden h-[calc(100vh-12rem)]">
          <div className="p-6 border-b border-border bg-surface-elevated/30 sticky top-0 z-10">
            <h3 className="text-text-primary font-bold">Upcoming Reminders</h3>
          </div>
          <div className="p-4 overflow-y-auto space-y-2">
            {pendingReminders.length > 0 ? pendingReminders.map(rem => (
              <div key={rem.id} className="flex items-center gap-4 p-4 rounded-xl bg-surface-elevated border border-border group hover:border-warning/50 transition-colors">
                <button 
                  onClick={() => completeReminder(rem.id)}
                  className="w-5 h-5 rounded flex items-center justify-center border border-border hover:border-warning text-transparent hover:text-warning/50 transition-colors shrink-0"
                >
                  <Check className="w-3 h-3" strokeWidth={3} />
                </button>
                <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0 text-warning">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-text-primary block truncate">{rem.title}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-muted">{rem.date ? format(new Date(rem.date), 'MMM d, yyyy') : 'No date'}</span>
                    {rem.time && <span className="text-xs text-text-muted">• {formatTimeDisplay(rem.time)}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0 items-end">
                  <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded border", getPriorityColor(rem.priority))}>{rem.priority}</span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openReminderModal(undefined, rem)} className="p-1 text-text-muted hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => confirmDelete(`Reminder: ${rem.title}`, () => deleteReminder(rem.id))} className="p-1 text-text-muted hover:text-danger transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-text-muted text-center py-8">No upcoming reminders! 🎉</p>
            )}
          </div>
        </div>

        <div className="glass-card flex-1 flex flex-col overflow-hidden h-[calc(100vh-12rem)] opacity-70 hover:opacity-100 transition-opacity">
          <div className="p-6 border-b border-border bg-surface-elevated/30 sticky top-0 z-10">
            <h3 className="text-text-primary font-bold">Past Reminders</h3>
          </div>
          <div className="p-4 overflow-y-auto space-y-2">
            {completedReminders.length > 0 ? completedReminders.map(rem => (
              <div key={rem.id} className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-transparent group">
                <button 
                  onClick={() => uncompleteReminder(rem.id)}
                  className="w-5 h-5 rounded flex items-center justify-center border bg-warning border-warning text-background shrink-0"
                >
                  <Check className="w-3 h-3" strokeWidth={3} />
                </button>
                <div className="flex-1 min-w-0 opacity-50">
                  <span className="font-medium text-sm text-text-muted line-through block truncate">{rem.title}</span>
                  <span className="text-xs text-text-muted">{rem.date ? format(new Date(rem.date), 'MMM d, yyyy') : ''}</span>
                </div>
                <button onClick={() => confirmDelete(`Reminder: ${rem.title}`, () => deleteReminder(rem.id))} className="p-1 text-text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )) : (
              <p className="text-text-muted text-center py-8">No past reminders yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reminders;
