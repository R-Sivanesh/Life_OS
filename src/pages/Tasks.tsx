import { useEffect } from 'react';
import { useTasks } from '../lib/useTasks';
import { Check, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const Tasks = () => {
  const { tasks, completeTask, uncompleteTask, deleteTask, refresh } = useTasks();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pendingTasks = tasks.filter(t => !t.completed).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const completedTasks = tasks.filter(t => t.completed).sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''));

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-danger bg-danger/10 border-danger/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'low': return 'text-accent bg-accent/10 border-accent/20';
      default: return 'text-gray-400 bg-surfaceHighlight border-border';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'health': return 'text-accent';
      case 'learning': return 'text-primary';
      case 'work': return 'text-secondary';
      case 'personal': return 'text-warning';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-glow">
          <CheckCircle className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold text-gray-100">All Tasks</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card flex-1 flex flex-col overflow-hidden h-[calc(100vh-12rem)]">
          <div className="p-6 border-b border-border bg-surfaceHighlight/30 sticky top-0 z-10">
            <h3 className="text-gray-100 font-bold">Pending Tasks</h3>
          </div>
          <div className="p-4 overflow-y-auto space-y-2">
            {pendingTasks.length > 0 ? pendingTasks.map(task => (
              <div key={task.id} className="flex items-center gap-4 p-4 rounded-xl bg-surfaceHighlight border border-border group hover:border-primary/50 transition-colors">
                <button 
                  onClick={() => completeTask(task.id)}
                  className="w-5 h-5 rounded flex items-center justify-center border border-gray-500 hover:border-accent text-transparent hover:text-accent/50 transition-colors shrink-0"
                >
                  <Check className="w-3 h-3" strokeWidth={3} />
                </button>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-gray-100 block truncate">{task.title}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{task.date ? format(new Date(task.date), 'MMM d, yyyy') : 'No date'}</span>
                    {task.start_time && <span className="text-xs text-gray-500">• {task.start_time}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0 items-end">
                  <div className="flex gap-2">
                    <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded border", getPriorityColor(task.priority))}>{task.priority}</span>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded bg-surfaceHighlight", getCategoryColor(task.category))}>{task.category}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 text-gray-500 hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteTask(task.id)} className="p-1 text-gray-500 hover:text-danger transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-8">No pending tasks! 🎉</p>
            )}
          </div>
        </div>

        <div className="glass-card flex-1 flex flex-col overflow-hidden h-[calc(100vh-12rem)] opacity-70 hover:opacity-100 transition-opacity">
          <div className="p-6 border-b border-border bg-surfaceHighlight/30 sticky top-0 z-10">
            <h3 className="text-gray-100 font-bold">Completed Tasks</h3>
          </div>
          <div className="p-4 overflow-y-auto space-y-2">
            {completedTasks.length > 0 ? completedTasks.map(task => (
              <div key={task.id} className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-transparent group">
                <button 
                  onClick={() => uncompleteTask(task.id)}
                  className="w-5 h-5 rounded flex items-center justify-center border bg-accent border-accent text-background shrink-0"
                >
                  <Check className="w-3 h-3" strokeWidth={3} />
                </button>
                <div className="flex-1 min-w-0 opacity-50">
                  <span className="font-medium text-sm text-gray-500 line-through block truncate">{task.title}</span>
                  <span className="text-xs text-gray-500">{task.completed_at ? `Completed on ${format(new Date(task.completed_at), 'MMM d')}` : ''}</span>
                </div>
                <button onClick={() => deleteTask(task.id)} className="p-1 text-gray-600 hover:text-danger transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )) : (
              <p className="text-gray-600 text-center py-8">No completed tasks yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
