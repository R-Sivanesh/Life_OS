import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Plus } from 'lucide-react';
import { GlobalAddModal } from './Modals';
import { useTasks } from '../lib/useTasks';
import { useReminders } from '../lib/useReminders';
import { DeleteModalProvider } from '../contexts/DeleteModalContext';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModalDate, setSelectedModalDate] = useState<string | undefined>();
  const [initialTask, setInitialTask] = useState<any>(undefined);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { addTask, updateTask } = useTasks();
  const { addReminder, updateReminder } = useReminders();

  // Removed obsolete routine generation logic (handled by routineSync.ts)

  useEffect(() => {
    const handleOpenTask = (e: any) => {
      setSelectedModalDate(e.detail?.date);
      setInitialTask(e.detail?.task ? { ...e.detail.task, _type: 'task' } : undefined);
      setIsModalOpen(true);
    };

    const handleOpenReminder = (e: any) => {
      setSelectedModalDate(e.detail?.date);
      setInitialTask(e.detail?.reminder ? { ...e.detail.reminder, _type: 'reminder' } : { _type: 'reminder_new' });
      setIsModalOpen(true);
    };

    window.addEventListener('open-task-modal', handleOpenTask);
    window.addEventListener('open-reminder-modal', handleOpenReminder);

    return () => {
      window.removeEventListener('open-task-modal', handleOpenTask);
      window.removeEventListener('open-reminder-modal', handleOpenReminder);
    };
  }, []);

  return (
    <DeleteModalProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto pt-4 px-4 md:px-8 pb-8 relative">
            {children}
          </main>
          
          {/* FAB */}
          <div className="absolute bottom-6 md:bottom-8 right-6 md:right-8 flex flex-col items-end gap-3 z-40">
            <button 
              onClick={() => { setSelectedModalDate(undefined); setInitialTask(undefined); setIsModalOpen(true); }}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 bg-primary hover:bg-primary-hover hover:scale-105 active:scale-95`}
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <GlobalAddModal 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setInitialTask(undefined); }} 
          onSaveTask={addTask}
          onUpdateTask={updateTask}
          onSaveReminder={addReminder}
          onUpdateReminder={updateReminder}
          initialDate={selectedModalDate}
          initialTask={initialTask}
        />
      </div>
    </DeleteModalProvider>
  );
};

export default Layout;
