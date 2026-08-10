import { useState, useEffect } from 'react';
import { Save, User, Bell, Shield, Moon, Database, AlertTriangle, LogOut, Quote, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { ResetTasksModal } from '../components/Modals';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../lib/useTasks';
import { supabase } from '../lib/supabase';
import { useQuotes } from '../lib/useQuotes';
import { useDeleteModal } from '../contexts/DeleteModalContext';

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const { user, logout } = useAuth();
  const { tasks, batchUncompleteTasks } = useTasks();
  
  // Quotes State
  const { quotes, addQuote, updateQuote, deleteQuote } = useQuotes();
  const { confirmDelete } = useDeleteModal();
  const [newQuoteText, setNewQuoteText] = useState('');
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editingQuoteText, setEditingQuoteText] = useState('');

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

  const handleAddQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteText.trim()) return;
    addQuote(newQuoteText);
    setNewQuoteText('');
  };

  const startEditQuote = (quote: any) => {
    setEditingQuoteId(quote.id);
    setEditingQuoteText(quote.text);
  };

  const saveEditQuote = () => {
    if (editingQuoteId && editingQuoteText.trim()) {
      updateQuote(editingQuoteId, editingQuoteText);
    }
    setEditingQuoteId(null);
  };

  const handleDeleteQuote = (id: string, text: string) => {
    confirmDelete(`Quote: "${text.length > 30 ? text.substring(0, 30) + '...' : text}"`, () => {
      deleteQuote(id);
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <button onClick={handleSave} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> {isSaved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="glass-card p-6 flex flex-col gap-8 max-w-3xl">
        {/* Profile Settings */}
        <div>
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Profile
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-cyan mb-1">Display Name</label>
              <input type="text" disabled value={user?.name || ''} className="w-full max-w-md bg-surface-elevated border border-border rounded-xl px-4 py-2 text-sm text-text-muted cursor-not-allowed" />
              <p className="text-xs text-text-muted mt-1">Managed via Supabase Auth</p>
            </div>
            
            <div className="pt-2 mt-4 border-t border-border/50 max-w-md">
              <button
                onClick={logout}
                className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2.5 text-sm font-bold text-danger bg-danger/10 hover:bg-danger/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Motivational Quotes */}
        <div>
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <Quote className="w-5 h-5 text-warning" /> Motivational Quotes
          </h2>
          <div className="space-y-4 max-w-xl">
            <p className="text-xs text-text-cyan">
              These quotes will be displayed on your Dashboard and change automatically.
            </p>
            
            <form onSubmit={handleAddQuote} className="flex gap-2">
              <input 
                type="text" 
                value={newQuoteText} 
                onChange={e => setNewQuoteText(e.target.value)}
                placeholder="Add a new quote..." 
                className="flex-1 bg-surface-elevated border border-border rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
              />
              <button type="submit" disabled={!newQuoteText.trim()} className="btn-primary px-4 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>

            <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {quotes.map(quote => (
                <div key={quote.id} className="flex items-center justify-between p-3 bg-surface-elevated/50 border border-border/50 rounded-xl group">
                  {editingQuoteId === quote.id ? (
                    <div className="flex-1 flex gap-2 mr-2">
                      <input 
                        type="text" 
                        value={editingQuoteText} 
                        onChange={e => setEditingQuoteText(e.target.value)}
                        className="flex-1 bg-surface border border-primary/50 rounded-lg px-3 py-1 text-sm text-text-primary focus:outline-none focus:border-primary"
                        autoFocus
                      />
                      <button onClick={saveEditQuote} className="p-1.5 bg-success/20 text-success rounded-lg hover:bg-success/30 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingQuoteId(null)} className="p-1.5 bg-surface-elevated text-text-muted rounded-lg hover:text-text-primary transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-text-primary italic flex-1 pr-4">"{quote.text}"</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditQuote(quote)} className="p-1.5 text-text-muted hover:text-primary transition-colors rounded-lg bg-background/50">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteQuote(quote.id, quote.text)} className="p-1.5 text-text-muted hover:text-danger transition-colors rounded-lg bg-background/50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {quotes.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4 border border-dashed border-border/50 rounded-xl">No quotes added yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan" /> Preferences
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between max-w-md cursor-pointer group">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-text-cyan group-hover:text-text-primary transition-colors" />
                <span className="text-sm font-medium text-text-cyan group-hover:text-text-primary transition-colors">Enable Notifications</span>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={notifications} onChange={() => setNotifications(!notifications)} />
                <div className="w-11 h-6 bg-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted peer-checked:after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>

            <label className="flex items-center justify-between max-w-md cursor-pointer group">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-text-cyan group-hover:text-text-primary transition-colors" />
                <span className="text-sm font-medium text-text-cyan group-hover:text-text-primary transition-colors">Dark Mode</span>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
                <div className="w-11 h-6 bg-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted peer-checked:after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>
          </div>
        </div>
        
        {/* Data Management */}
        <div>
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-warning" /> Data Management
          </h2>
          <div className="space-y-4">
            <div className="flex flex-col gap-2 max-w-md bg-warning/10 border border-warning/30 p-4 rounded-xl">
              <h3 className="text-sm font-bold text-warning flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Reset Completed Tasks
              </h3>
              <p className="text-xs text-text-cyan mb-2">
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
