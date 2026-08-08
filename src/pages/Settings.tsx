import React, { useState, useEffect } from 'react';
import { Save, User, Bell, Shield, Moon, Database, AlertTriangle } from 'lucide-react';
import { ResetTasksModal } from '../components/Modals';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../lib/useTasks';
import { supabase } from '../lib/supabase';

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const { user } = useAuth();
  const { tasks, batchUncompleteTasks } = useTasks();

  useEffect(() => {
    const savedNotifs = localStorage.getItem('lifeos_settings_notifs');
    if (savedNotifs !== null) setNotifications(savedNotifs === 'true');
  }, []);

  const handleSave = () => {
    localStorage.setItem('lifeos_settings_notifs', notifications.toString());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetTasks = async (scope: 'today' | 'all', password: string) => {
    if (!user) return;
    
    // Verify password via Supabase
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });
      if (error) {
        alert('Invalid password. Please try again.');
        return;
      }
    }
    
    // Get task IDs to reset
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const completedTasks = tasks.filter(t => t.completed);
    const tasksToReset = scope === 'today' 
      ? completedTasks.filter(t => t.date === todayStr)
      : completedTasks;
      
    if (tasksToReset.length > 0) {
      const ids = tasksToReset.map(t => t.id);
      await batchUncompleteTasks(ids);
      alert(`Successfully reset ${ids.length} task(s).`);
    } else {
      alert('No completed tasks found to reset.');
    }
    setIsResetModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <button onClick={handleSave} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> {isSaved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="glass-card p-6 flex flex-col gap-8 max-w-3xl">
        {/* Profile Settings */}
        <div>
          <h2 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Profile
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
              <input type="text" disabled value="fw" className="w-full max-w-md bg-surfaceHighlight border border-border rounded-xl px-4 py-2 text-sm text-gray-500 cursor-not-allowed" />
              <p className="text-xs text-gray-500 mt-1">Managed via Supabase Auth</p>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <h2 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-secondary" /> Preferences
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between max-w-md cursor-pointer group">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-gray-400 group-hover:text-gray-100 transition-colors" />
                <span className="text-sm font-medium text-gray-300 group-hover:text-gray-100 transition-colors">Enable Notifications</span>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={notifications} onChange={() => setNotifications(!notifications)} />
                <div className="w-11 h-6 bg-surfaceHighlight peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>

            <label className="flex items-center justify-between max-w-md cursor-pointer group">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-gray-400 group-hover:text-gray-100 transition-colors" />
                <span className="text-sm font-medium text-gray-300 group-hover:text-gray-100 transition-colors">Dark Mode</span>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
                <div className="w-11 h-6 bg-surfaceHighlight peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>
          </div>
        </div>
        
        {/* Data Management */}
        <div>
          <h2 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-warning" /> Data Management
          </h2>
          <div className="space-y-4">
            <div className="flex flex-col gap-2 max-w-md bg-warning/10 border border-warning/30 p-4 rounded-xl">
              <h3 className="text-sm font-bold text-warning flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Reset Completed Tasks
              </h3>
              <p className="text-xs text-gray-400 mb-2">
                If you need a fresh start, you can uncomplete today's tasks or your entire task history. This action requires your password.
              </p>
              <button 
                onClick={() => setIsResetModalOpen(true)}
                className="btn-warning w-fit px-4 py-2 text-sm"
              >
                Reset Tasks...
              </button>
            </div>
          </div>
        </div>
      </div>

      <ResetTasksModal 
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onReset={handleResetTasks}
      />
    </div>
  );
};

export default Settings;
