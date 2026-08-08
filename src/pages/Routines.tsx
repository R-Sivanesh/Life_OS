import { useEffect, useState } from 'react';
import { useRoutines } from '../lib/useRoutines';
import { Zap, Plus, Trash2, Edit2, CheckCircle, Circle } from 'lucide-react';
import { cn } from '../lib/utils';
import { AddRoutineModal } from '../components/Modals';

const Routines = () => {
  const { routines, addRoutine, updateRoutine, deleteRoutine, refresh } = useRoutines();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <>
    <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-glow">
            <Zap className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">Daily Routines</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsModalOpen(true)} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Routine
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <p className="text-gray-400 mb-6 text-sm">
          Active routines automatically generate tasks for you each day. Keep this list focused on habits you want to build.
        </p>
        
        <div className="space-y-3">
          {routines.length > 0 ? routines.map(routine => (
            <div key={routine.id} className={cn(
              "p-4 border rounded-xl flex items-center gap-4 transition-colors group",
              routine.enabled ? "bg-surfaceHighlight border-border" : "bg-surface border-transparent opacity-50 hover:opacity-80"
            )}>
              <button 
                onClick={() => updateRoutine(routine.id, { enabled: !routine.enabled })}
                className="text-gray-500 hover:text-primary transition-colors shrink-0"
              >
                {routine.enabled ? <CheckCircle className="w-6 h-6 text-primary" /> : <Circle className="w-6 h-6" />}
              </button>
              
              <div className="flex-1 min-w-0">
                <h3 className={cn("font-bold truncate", routine.enabled ? "text-gray-100" : "text-gray-500 line-through")}>{routine.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{routine.time || 'Any time'} • {routine.duration_minutes || 0} min</span>
                  <span className="text-xs text-gray-600 bg-background px-2 py-0.5 rounded border border-border">
                    {routine.days?.join(', ') || 'Everyday'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-gray-500 hover:text-primary transition-colors bg-background rounded-lg"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteRoutine(routine.id)} className="p-2 text-gray-500 hover:text-danger transition-colors bg-background rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Zap className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No routines defined yet. Start building habits!</p>
            </div>
          )}
        </div>
      </div>
    </div>

      <AddRoutineModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={addRoutine}
      />
    </>
  );
};

export default Routines;
