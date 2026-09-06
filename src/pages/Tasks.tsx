import { useEffect, useState } from 'react';
import { useTasks } from '../lib/useTasks';
import { Check, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { cn, openTaskModal, formatTaskTimeRange } from '../lib/utils';
import { format } from 'date-fns';
import { useDeleteModal } from '../contexts/DeleteModalContext';

const Tasks = () => {
  const { tasks, completeTask, uncompleteTask, deleteTask, refresh } = useTasks();
  const { confirmDelete } = useDeleteModal();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const [view, setView] = useState<'today' | 'other'>('today');
  const todayString = format(new Date(), 'yyyy-MM-dd');

  const displayedTasks = tasks.filter(t => {
    if (view === 'today') {
      return t.date === todayString;
    } else {
      return t.category !== 'Routine' && !t.recurring;
    }
  });

  const pendingTasks = displayedTasks.filter(t => !t.completed);
  const completedTasks = displayedTasks.filter(t => t.completed);

  const pendingNormal = pendingTasks.filter(t => t.category !== 'Routine' && !t.recurring);
  const pendingRoutines = pendingTasks.filter(t => t.category === 'Routine' || !!t.recurring);

  const completedNormal = completedTasks.filter(t => t.category !== 'Routine' && !t.recurring);
  const completedRoutines = completedTasks.filter(t => t.category === 'Routine' || !!t.recurring);

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-danger bg-danger/10 border-danger/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'low': return 'text-cyan bg-cyan/10 border-cyan/20';
      default: return 'text-text-cyan bg-surface-elevated border-border';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'health': return 'text-success';
      case 'learning': return 'text-primary';
      case 'work': return 'text-cyan';
      case 'personal': return 'text-warning';
      default: return 'text-text-cyan';
    }
  };

  const renderTask = (task: any, isCompleted: boolean) => (
    <div key={task.id} className={cn("flex items-center gap-4 p-4 rounded-xl group transition-colors", isCompleted ? "bg-surface border border-transparent" : "bg-surface-elevated border border-border hover:border-primary/50")}>
      <button 
        onClick={() => isCompleted ? uncompleteTask(task.id) : completeTask(task.id)}
        className={cn("w-5 h-5 rounded flex items-center justify-center border shrink-0 transition-colors", isCompleted ? "bg-success border-success text-background" : "border-border hover:border-success text-transparent hover:text-success/50")}
      >
        <Check className="w-3 h-3" strokeWidth={3} />
      </button>
      <div className={cn("flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2", isCompleted ? "opacity-50" : "")}>
        <span className={cn("font-medium text-sm block truncate w-full", isCompleted ? "text-text-muted line-through" : "text-text-primary")}>{task.title}</span>
        <div className="flex items-center gap-2 mt-0 sm:mt-1 shrink-0">
          {isCompleted ? (
            <span className="text-xs text-text-muted">{task.completed_at ? `Completed on ${format(new Date(task.completed_at), 'MMM d')}` : ''}</span>
          ) : (
            <>
              <span className="text-xs text-text-muted">{task.date ? format(new Date(task.date), 'MMM d, yyyy') : 'No date'}</span>
              <span className="text-xs text-text-muted">• {formatTaskTimeRange(task.start_time, task.end_time)}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 shrink-0 items-end">
        <div className="flex items-center gap-2">
          {!isCompleted && (
            <>
              <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded border", getPriorityColor(task.priority))}>{task.priority}</span>
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded bg-surface-elevated", getCategoryColor(task.category))}>{task.category}</span>
            </>
          )}
        </div>
        <div className={cn("flex items-center gap-2 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100")}>
          {!isCompleted && <button onClick={() => openTaskModal(undefined, task)} className="p-2 sm:p-1 text-text-muted hover:text-primary transition-colors"><Edit2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>}
          <button onClick={() => confirmDelete(task.title, () => deleteTask(task.id))} className={cn("p-2 sm:p-1 transition-colors", isCompleted ? "text-text-muted hover:text-danger" : "text-text-muted hover:text-danger")}><Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-12">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-glow">
            <CheckCircle className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Tasks</h1>
        </div>

        <div className="flex items-center gap-2 bg-surface p-1 rounded-xl w-fit border border-border">
          <button 
            onClick={() => setView('today')}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", view === 'today' ? "bg-primary text-white" : "text-text-cyan hover:text-text-primary")}
          >
            Today's Tasks
          </button>
          <button 
            onClick={() => setView('other')}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", view === 'other' ? "bg-primary text-white" : "text-text-cyan hover:text-text-primary")}
          >
            Other Tasks
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card flex-1 flex flex-col overflow-hidden lg:h-[calc(100vh-14rem)] min-h-[400px]">
          <div className="p-4 md:p-6 border-b border-border bg-surface-elevated/30 sticky top-0 z-10">
            <h3 className="text-text-primary font-bold">Pending Tasks</h3>
          </div>
          <div className="p-3 md:p-4 overflow-y-auto space-y-4 md:space-y-6">
            {view === 'today' && pendingTasks.length > 0 && (
              <>
                {pendingNormal.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-text-cyan uppercase tracking-wider mb-2">Normal Tasks</h4>
                    <div className="space-y-2">
                       {pendingNormal.map(task => renderTask(task, false))}
                    </div>
                  </div>
                )}
                {pendingRoutines.length > 0 && (
                  <div className={pendingNormal.length > 0 ? "mt-4" : ""}>
                    <h4 className="text-[10px] font-bold text-text-cyan uppercase tracking-wider mb-2">Daily Routines</h4>
                    <div className="space-y-2">
                       {pendingRoutines.map(task => renderTask(task, false))}
                    </div>
                  </div>
                )}
              </>
            )}
            {view === 'other' && pendingTasks.length > 0 && (
              <div className="space-y-2">
                {pendingTasks.map(task => renderTask(task, false))}
              </div>
            )}
            {pendingTasks.length === 0 && (
              <p className="text-text-muted text-center py-8">No pending tasks! 🎉</p>
            )}
          </div>
        </div>

        <div className="glass-card flex-1 flex flex-col overflow-hidden lg:h-[calc(100vh-14rem)] min-h-[400px] opacity-70 hover:opacity-100 transition-opacity">
          <div className="p-4 md:p-6 border-b border-border bg-surface-elevated/30 sticky top-0 z-10">
            <h3 className="text-text-primary font-bold">Completed Tasks</h3>
          </div>
          <div className="p-3 md:p-4 overflow-y-auto space-y-4 md:space-y-6">
            {view === 'today' && completedTasks.length > 0 && (
              <>
                {completedNormal.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-text-cyan uppercase tracking-wider mb-2">Normal Tasks</h4>
                    <div className="space-y-2">
                       {completedNormal.map(task => renderTask(task, true))}
                    </div>
                  </div>
                )}
                {completedRoutines.length > 0 && (
                  <div className={completedNormal.length > 0 ? "mt-4" : ""}>
                    <h4 className="text-[10px] font-bold text-text-cyan uppercase tracking-wider mb-2">Daily Routines</h4>
                    <div className="space-y-2">
                       {completedRoutines.map(task => renderTask(task, true))}
                    </div>
                  </div>
                )}
              </>
            )}
            {view === 'other' && completedTasks.length > 0 && (
              <div className="space-y-2">
                {completedTasks.map(task => renderTask(task, true))}
              </div>
            )}
            {completedTasks.length === 0 && (
              <p className="text-text-muted text-center py-8">No completed tasks yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
