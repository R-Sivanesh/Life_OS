import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { format } from 'date-fns';

const Journal = () => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [entry, setEntry] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`lifeos_journal_${todayStr}`);
    if (saved) setEntry(saved);
  }, [todayStr]);

  const handleSave = () => {
    localStorage.setItem(`lifeos_journal_${todayStr}`, entry);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12 h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">Journal</h1>
        <button onClick={handleSave} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> {isSaved ? 'Saved!' : 'Save Entry'}
        </button>
      </div>
      
      <div className="glass-card p-6 flex flex-col gap-4 flex-1 min-h-[500px]">
        <h2 className="text-lg font-bold text-text-primary border-b border-border/50 pb-4">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </h2>
        
        <textarea 
          value={entry}
          onChange={e => setEntry(e.target.value)}
          placeholder="How was your day? What's on your mind?"
          className="flex-1 w-full bg-transparent border-none resize-none text-text-primary placeholder-text-muted focus:outline-none p-2"
        />
      </div>
    </div>
  );
};

export default Journal;
