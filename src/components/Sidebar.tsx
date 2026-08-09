import { NavLink } from 'react-router-dom';
import { Home, Calendar, Zap, CheckCircle, Bell, Timer, Book, BarChart2, Target, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Calendar', path: '/calendar', icon: Calendar },
  { name: 'Daily Routine', path: '/routine', icon: Zap },
  { name: 'Tasks', path: '/tasks', icon: CheckCircle },
  { name: 'Reminders', path: '/reminders', icon: Bell },
  { name: 'Focus', path: '/focus', icon: Timer },
  { name: 'Journal', path: '/journal', icon: Book },
  { name: 'Reports', path: '/reports', icon: BarChart2 },
  { name: 'Goals & Habits', path: '/goals', icon: Target },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const Sidebar = () => {

  return (
    <aside className="w-64 border-r border-border bg-surface flex flex-col h-full flex-shrink-0">
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
            <span className="text-xl font-black text-white">L</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-100 tracking-tight">Life OS</h1>
            <p className="text-xs text-gray-500">Your life. Your rules.</p>
          </div>
        </div>
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
                  ? "bg-primary/20 text-gray-100 shadow-[inset_4px_0_0_0_#3B82F6]"
                  : "text-gray-500 hover:text-gray-100 hover:bg-surfaceHighlight"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>

    </aside>
  );
};

export default Sidebar;
