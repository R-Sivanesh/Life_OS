import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Plus } from 'lucide-react';
import { GlobalAddModal } from './Modals';
import { useTasks } from '../lib/useTasks';
import { useReminders } from '../lib/useReminders';
import { useRoutines } from '../lib/useRoutines';
import { format } from 'date-fns';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModalDate, setSelectedModalDate] = useState<string | undefined>();
  
  const { tasks, addTask } = useTasks();
  const { addReminder } = useReminders();
  const { routines } = useRoutines();

  useEffect(() => {
    if (routines.length > 0 && tasks.length > 0) {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const dayOfWeek = format(today, 'EEE'); // 'Mon', 'Tue'
      
      const lastGen = localStorage.getItem('lifeos_last_routine_gen');
      if (lastGen === todayStr) return;
      
      const activeRoutinesToday = routines.filter(r => r.enabled && r.days?.includes(dayOfWeek));
      const todayTasks = tasks.filter(t => t.date === todayStr && (t.category === 'Routine' || t.category === 'Routine (Auto)'));
      
      activeRoutinesToday.forEach(routine => {
        const alreadyExists = todayTasks.some(t => t.title === routine.title);
        if (!alreadyExists) {
          addTask({
            title: routine.title,
            category: 'Routine',
            priority: routine.priority,
            date: todayStr,
            start_time: routine.time,
            estimated_minutes: routine.duration_minutes || 30
          });
        }
      });
      
      localStorage.setItem('lifeos_last_routine_gen', todayStr);
    }
  }, [routines, tasks, addTask]);

  useEffect(() => {
    const handleOpenTask = (e: any) => {
      setSelectedModalDate(e.detail?.date);
      setIsModalOpen(true);
    };
    
    // We only need one modal, both events open the same unified modal
    window.addEventListener('open-task-modal', handleOpenTask);
    window.addEventListener('open-reminder-modal', handleOpenTask);

    return () => {
      window.removeEventListener('open-task-modal', handleOpenTask);
      window.removeEventListener('open-reminder-modal', handleOpenTask);
    };
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </main>
        
        {/* FAB */}
        <div className="absolute bottom-8 right-8 flex flex-col items-end gap-3 z-40">
          <button 
            onClick={() => { setSelectedModalDate(undefined); setIsModalOpen(true); }}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 bg-primary hover:bg-primary-hover hover:scale-105 active:scale-95`}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      <GlobalAddModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSaveTask={addTask}
        onSaveReminder={addReminder}
        initialDate={selectedModalDate}
      />
    </div>
  );
};

export default Layout;
