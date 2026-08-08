import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Search, Bell, Moon } from 'lucide-react';
import { format } from 'date-fns';

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <header className="h-24 px-8 flex items-center justify-between border-none bg-background">
      <div>
        <h2 className="text-2xl font-bold text-gray-100 mb-1 flex items-center gap-2">
          {getGreeting()}, {user?.name.toLowerCase()} <span className="text-2xl">👋</span>
        </h2>
        <p className="text-sm text-gray-500">
          {format(time, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
          <input 
            ref={searchRef}
            type="text" 
            placeholder="Search tasks, notes, etc..." 
            className="w-72 bg-surfaceHighlight/50 border border-border/50 rounded-full py-2 pl-9 pr-14 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <kbd className="hidden sm:inline-block border border-border/50 bg-background rounded px-1.5 text-[10px] text-gray-500 font-sans">⌘</kbd>
            <kbd className="hidden sm:inline-block border border-border/50 bg-background rounded px-1.5 text-[10px] text-gray-500 font-sans">K</kbd>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-gray-500 hover:text-gray-100 rounded-full transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-gray-100 rounded-full"></span>
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 text-gray-500 hover:text-gray-100 rounded-full transition-colors"
          >
            <Moon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 ml-2 hover:bg-primary/30 transition-colors"
          >
            <span className="text-primary font-bold text-xs uppercase">{user?.name.slice(0, 2)}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
