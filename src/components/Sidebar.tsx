import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Calendar, Zap, CheckCircle, Bell, Timer, Book, BarChart2, Target, Settings, LogOut } from 'lucide-react';
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
  const { user, logout } = useAuth();

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

      {user && (
        <div className="p-4 mt-auto">
          <div className="glass-card p-4 rounded-2xl bg-surfaceHighlight/50 border border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-sm">{user.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-gray-100 truncate">{user.name}</p>
                <p className="text-[10px] text-gray-500 truncate cursor-pointer hover:text-primary transition-colors">View Profile</p>
              </div>
            </div>

            <div className="space-y-1 mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-primary font-bold">Level 1</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>0 / 500 XP</span>
              </div>
              <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[5%] rounded-full opacity-30" />
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center gap-3 text-sm text-danger hover:bg-danger/10 py-2 px-2 rounded-lg transition-colors mt-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
