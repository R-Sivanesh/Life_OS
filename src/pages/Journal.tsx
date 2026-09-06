import { useState, useEffect } from 'react';
import { Save, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

type JournalEntry = {
  id: string;
  date: string;
  content: string;
};

const Journal = () => {
  const { user } = useAuth();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [entry, setEntry] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    if (!user || !supabase) return;
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
      
    if (!error && data) {
      setEntries(data);
      const current = data.find((e: any) => e.date === selectedDate);
      if (current) setEntry(current.content);
      else setEntry('');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [user]);

  useEffect(() => {
    const current = entries.find(e => e.date === selectedDate);
    if (current) setEntry(current.content);
    else setEntry('');
  }, [selectedDate, entries]);

  const handleSave = async () => {
    if (!user || !supabase) return;
    
    const existing = entries.find(e => e.date === selectedDate);
    
    if (existing) {
      const { error } = await supabase
        .from('journal_entries')
        .update({ content: entry, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
        
      if (!error) {
        setEntries(prev => prev.map(e => e.id === existing.id ? { ...e, content: entry } : e));
      }
    } else {
      const { data, error } = await supabase
        .from('journal_entries')
        .insert([{ user_id: user.id, date: selectedDate, content: entry }])
        .select();
        
      if (!error && data) {
        setEntries(prev => [data[0], ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      }
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleNewEntry = () => {
    setSelectedDate(todayStr);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">Journal</h1>
        <button onClick={handleSave} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> {isSaved ? 'Saved!' : 'Save Entry'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)] min-h-[500px]">
        {/* History Sidebar */}
        <div className="glass-card p-4 flex flex-col gap-4 lg:col-span-1 h-full overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <h3 className="font-bold text-text-primary flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" /> History
            </h3>
            <button 
              onClick={handleNewEntry}
              className="text-xs text-primary font-medium hover:underline"
            >
              Today
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
            {loading ? (
              <p className="text-sm text-text-muted">Loading entries...</p>
            ) : entries.length > 0 ? (
              entries.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelectedDate(e.date)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all border",
                    selectedDate === e.date 
                      ? "bg-primary/10 border-primary/30" 
                      : "bg-surface-elevated hover:bg-surface-elevated/80 border-transparent hover:border-border"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className={cn("w-3.5 h-3.5", selectedDate === e.date ? "text-primary" : "text-text-muted")} />
                    <span className={cn("text-xs font-bold", selectedDate === e.date ? "text-primary" : "text-text-primary")}>
                      {format(parseISO(e.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted line-clamp-2">
                    {e.content || "Empty entry"}
                  </p>
                </button>
              ))
            ) : (
              <p className="text-sm text-text-muted text-center py-4">No entries yet.</p>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="glass-card p-6 flex flex-col gap-4 lg:col-span-3 h-full overflow-hidden">
          <h2 className="text-lg font-bold text-text-primary border-b border-border/50 pb-4">
            {selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy') : 'No Date Selected'}
          </h2>
          
          <textarea 
            value={entry}
            onChange={e => setEntry(e.target.value)}
            placeholder="How was your day? What's on your mind?"
            className="flex-1 w-full bg-transparent border-none resize-none text-text-primary placeholder-text-muted focus:outline-none p-2 custom-scrollbar"
          />
        </div>
      </div>
    </div>
  );
};

export default Journal;
