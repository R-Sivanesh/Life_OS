import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Dumbbell,
  Book,
  LayoutGrid,
  Calendar,
  Zap,
  CheckCircle,
  Bell,
  Timer,
  BarChart2,
  Target,
  Settings,
  X,
  FolderKanban,
} from 'lucide-react';
import { cn } from '../lib/utils';

// Primary 5 bottom nav items
const primaryNavItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Learning', path: '/learning', icon: BookOpen },
  { name: 'Fitness', path: '/fitness', icon: Dumbbell },
  { name: 'Journal', path: '/journal', icon: Book },
];

// Items shown in the "Others" drawer
const drawerNavItems = [
  { name: 'Calendar', path: '/calendar', icon: Calendar },
  { name: 'Daily Routine', path: '/routine', icon: Zap },
  { name: 'Tasks', path: '/tasks', icon: CheckCircle },
  { name: 'Reminders', path: '/reminders', icon: Bell },
  { name: 'Focus', path: '/focus', icon: Timer },
  { name: 'Projects', path: '/projects', icon: FolderKanban },
  { name: 'Reports', path: '/reports', icon: BarChart2 },
  { name: 'Goals & Habits', path: '/goals', icon: Target },
  { name: 'Settings', path: '/settings', icon: Settings },
];

// Paths that belong to the "Others" group (for active-state detection on the Others button)
const drawerPaths = drawerNavItems.map((item) => item.path);

const BottomNav = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isOthersActive = drawerPaths.some((p) => location.pathname === p);

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  // Close drawer on outside click
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsDrawerOpen(false);
      }
    };
    // small delay so the toggle click itself doesn't immediately close
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isDrawerOpen]);

  return (
    <>
      {/* Others drawer backdrop */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Others drawer — slides up from above the bottom nav */}
      <div
        ref={drawerRef}
        className={cn(
          'fixed left-0 right-0 z-50 md:hidden transition-all duration-300 ease-in-out',
          isDrawerOpen
            ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+64px)] opacity-100 pointer-events-auto'
            : 'bottom-[calc(env(safe-area-inset-bottom,0px)+64px)] opacity-0 pointer-events-none translate-y-4'
        )}
      >
        <div className="mx-3 rounded-2xl border border-border bg-sidebar shadow-2xl overflow-hidden">
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">
              More
            </span>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer items — 2 column grid */}
          <div className="grid grid-cols-2 gap-1 p-3">
            {drawerNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-cyan/10 text-cyan'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium truncate">{item.name}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom navigation bar */}
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 md:hidden',
          'bg-sidebar border-t border-border',
          'flex items-stretch'
        )}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Primary nav items */}
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 min-h-[56px]',
                'transition-colors duration-200 active:scale-95',
                isActive
                  ? 'text-cyan'
                  : 'text-text-muted hover:text-text-primary'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'w-5 h-5 transition-all duration-200',
                    isActive && 'drop-shadow-[0_0_6px_rgba(0,184,255,0.8)]'
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span className="text-[10px] font-medium leading-none">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Others button */}
        <button
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 min-h-[56px]',
            'transition-colors duration-200 active:scale-95',
            isOthersActive || isDrawerOpen ? 'text-cyan' : 'text-text-muted hover:text-text-primary'
          )}
          aria-label="Others menu"
          aria-expanded={isDrawerOpen}
        >
          <LayoutGrid
            className={cn(
              'w-5 h-5 transition-all duration-200',
              (isOthersActive || isDrawerOpen) && 'drop-shadow-[0_0_6px_rgba(0,184,255,0.8)]'
            )}
            strokeWidth={isOthersActive || isDrawerOpen ? 2.5 : 1.8}
          />
          <span className="text-[10px] font-medium leading-none">Others</span>
        </button>
      </nav>
    </>
  );
};

export default BottomNav;

