import { useEffect, useState } from 'react';
import { useRoutines } from '../lib/useRoutines';
import { Zap, Plus, Trash2, Edit2, CheckCircle, Circle } from 'lucide-react';
import { cn, formatTimeDisplay } from '../lib/utils';
import { AddRoutineModal } from '../components/Modals';
import { useDeleteModal } from '../contexts/DeleteModalContext';

const Routines = () => {
  const { routines, addRoutine, updateRoutine, deleteRoutine, refresh } = useRoutines();
  const { confirmDelete } = useDeleteModal();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<any>(null);
  
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
          <h1 className="text-2xl font-bold text-text-primary">Daily Routines</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedRoutine(null); setIsModalOpen(true); }} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Routine
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <p className="text-text-cyan mb-6 text-sm">
          Active routines automatically generate tasks for you each day. Keep this list focused on habits you want to build.
        </p>
        
        <div className="space-y-3">
          {routines.length > 0 ? routines.map(routine => (
            <div key={routine.id} className={cn(
              "p-4 border rounded-xl flex items-center gap-4 transition-colors group",
              routine.enabled ? "bg-surface-elevated border-border" : "bg-surface border-transparent opacity-50 hover:opacity-80"
            )}>
              <button 
                onClick={() => updateRoutine(routine.id, { enabled: !routine.enabled })}
                className="text-text-muted hover:text-primary transition-colors shrink-0"
              >
                {routine.enabled ? <CheckCircle className="w-6 h-6 text-primary" /> : <Circle className="w-6 h-6" />}
              </button>
              
              <div className="flex-1 min-w-0">
                <h3 className={cn("font-bold truncate", routine.enabled ? "text-text-primary" : "text-text-muted line-through")}>{routine.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-muted">{routine.time ? formatTimeDisplay(routine.time) : 'Any time'} • {routine.duration_minutes || 0} min</span>
                  <span className="text-xs text-text-muted bg-background px-2 py-0.5 rounded border border-border">
                    {routine.days?.join(', ') || 'Everyday'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setSelectedRoutine(routine); setIsModalOpen(true); }} className="p-2 text-text-muted hover:text-primary transition-colors bg-background rounded-lg"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => confirmDelete(`Routine: ${routine.title}`, () => deleteRoutine(routine.id))} className="p-2 text-text-muted hover:text-danger transition-colors bg-background rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Zap className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-cyan">No routines defined yet. Start building habits!</p>
            </div>
          )}
        </div>
      </div>
    </div>

      <AddRoutineModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedRoutine(null); }}
        onSave={(routine, id) => {
          if (id) {
            updateRoutine(id, routine);
          } else {
            addRoutine(routine);
          }
        }}
        initialRoutine={selectedRoutine}
      />
    </>
  );
};

export default Routines;
