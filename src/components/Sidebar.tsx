import { NavLink } from 'react-router-dom';
import { Home, Calendar, Zap, CheckCircle, Bell, Timer, Book, BookOpen, BarChart2, Target, Settings, X } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Calendar', path: '/calendar', icon: Calendar },
  { name: 'Daily Routine', path: '/routine', icon: Zap },
  { name: 'Tasks', path: '/tasks', icon: CheckCircle },
  { name: 'Learning Hub', path: '/learning', icon: BookOpen },
  { name: 'Reminders', path: '/reminders', icon: Bell },
  { name: 'Focus', path: '/focus', icon: Timer },
  { name: 'Journal', path: '/journal', icon: Book },
  { name: 'Reports', path: '/reports', icon: BarChart2 },
  { name: 'Goals & Habits', path: '/goals', icon: Target },
  { name: 'Settings', path: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar Container */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-sidebar flex flex-col h-full flex-shrink-0 transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan flex items-center justify-center shadow-glow">
              <span className="text-xl font-black text-white">L</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary tracking-tight">Life OS</h1>
              <p className="text-xs text-text-muted">Your life. Your rules.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="md:hidden p-2 text-text-muted hover:text-text-primary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-cyan/10 text-cyan shadow-[inset_4px_0_0_0_var(--cyan)]"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>

    </aside>
    </>
  );
};

export default Sidebar;
