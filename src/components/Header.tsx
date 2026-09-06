import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Check, Menu } from 'lucide-react';
import { format, isToday, parse, parseISO } from 'date-fns';
import { useTasks } from '../lib/useTasks';
import { useReminders } from '../lib/useReminders';
import { useRoutines } from '../lib/useRoutines';

const Header = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [lastReadTime, setLastReadTime] = useState<number>(() => parseInt(localStorage.getItem('lastReadNotifications') || '0', 10));

  const { tasks } = useTasks();
  const { reminders } = useReminders();
  const { routines } = useRoutines();

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Generate notifications based on tasks, reminders, routines
  useEffect(() => {
    const newNotifications: any[] = [];
    const now = new Date();

    // Helper to safely parse time
    const parseTime = (timeStr: string) => {
      try {
        return parse(timeStr, 'HH:mm:ss', new Date());
      } catch (e) {
        return null;
      }
    };

    // 1. Tasks
    tasks?.forEach(task => {
      if (task.completed) return;
      if (task.date && isToday(parseISO(task.date))) {
        if (task.start_time) {
          const taskTime = parseTime(task.start_time);
          if (taskTime) {
            const minutesUntil = Math.round((taskTime.getTime() - now.getTime()) / 60000);
            
            if (minutesUntil > 0 && minutesUntil <= 60) {
              newNotifications.push({
                id: `task-${task.id}`,
                title: 'Upcoming Task',
                message: `${task.title} starts in ${minutesUntil} minutes`,
                time: taskTime,
                type: 'task'
              });
            } else if (minutesUntil <= 0 && minutesUntil >= -120) { // within last 2 hours
              newNotifications.push({
                id: `task-${task.id}`,
                title: 'Task Due',
                message: `${task.title} started at ${format(taskTime, 'h:mm a')}`,
                time: taskTime,
                type: 'task'
              });
            }
          }
        }
      }
    });

    // 2. Reminders
    reminders?.forEach(reminder => {
      if (reminder.completed) return;
      if (reminder.date && isToday(parseISO(reminder.date))) {
        if (reminder.time) {
          const reminderTime = parseTime(reminder.time);
          if (reminderTime) {
            const minutesUntil = Math.round((reminderTime.getTime() - now.getTime()) / 60000);
            
            if (minutesUntil > 0 && minutesUntil <= 60) {
              newNotifications.push({
                id: `reminder-${reminder.id}`,
                title: 'Upcoming Reminder',
                message: `${reminder.title} reminder at ${format(reminderTime, 'h:mm a')}`,
                time: reminderTime,
                type: 'reminder'
              });
            } else if (minutesUntil <= 0 && minutesUntil >= -120) { // within last 2 hours
              newNotifications.push({
                id: `reminder-${reminder.id}`,
                title: 'Reminder Due',
                message: `${reminder.title} was at ${format(reminderTime, 'h:mm a')}`,
                time: reminderTime,
                type: 'reminder'
              });
            }
          }
        } else {
          // All-day reminder for today
          newNotifications.push({
            id: `reminder-${reminder.id}`,
            title: 'Reminder Today',
            message: reminder.title,
            time: new Date(new Date().setHours(0, 0, 0, 0)),
            type: 'reminder'
          });
        }
      }
    });

    // 3. Routines
    routines?.forEach(routine => {
      if (!routine.enabled) return;
      if (routine.time) {
        const routineTime = parseTime(routine.time);
        if (routineTime) {
          const dayName = format(now, 'E'); // e.g. 'Mon', 'Tue'
          if ((routine.days ?? []).includes(dayName)) {
            const minutesUntil = Math.round((routineTime.getTime() - now.getTime()) / 60000);
            
            if (minutesUntil > 0 && minutesUntil <= 60) {
              newNotifications.push({
                id: `routine-${routine.id}`,
                title: 'Routine Starting Soon',
                message: `${routine.title} starts at ${format(routineTime, 'h:mm a')}`,
                time: routineTime,
                type: 'routine'
              });
            }
          }
        }
      }
    });

    // Sort descending by time
    newNotifications.sort((a, b) => b.time.getTime() - a.time.getTime());
    
    // Deduplicate (in case multiple updates trigger it)
    const uniqueNotifications = Array.from(new Map(newNotifications.map(item => [item.id, item])).values());
    
    setNotifications(uniqueNotifications);
  }, [tasks, reminders, routines, time]);

  const unreadCount = notifications.filter(n => n.time.getTime() > lastReadTime).length;

  const handleOpenNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (isProfileOpen) setIsProfileOpen(false);
  };

  const markAllAsRead = () => {
    const nowTime = Date.now();
    setLastReadTime(nowTime);
    localStorage.setItem('lastReadNotifications', nowTime.toString());
  };

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <header className="h-16 px-4 md:px-8 flex items-center justify-between border-none bg-background pt-2 relative z-30 w-full max-w-full">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 text-text-muted hover:text-text-primary rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <div className="flex flex-col">
          <h2 className="text-lg md:text-xl font-bold text-text-primary flex items-center gap-2 truncate max-w-[200px] sm:max-w-xs">
            {getGreeting()}, {user?.name.toLowerCase().split(' ')[0]} <span className="text-lg md:text-xl shrink-0">👋</span>
          </h2>
          <p className="text-[10px] md:text-xs text-text-muted truncate">
            {format(time, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={handleOpenNotifications}
              className="relative p-2 text-text-muted hover:text-text-primary rounded-full transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-text-primary rounded-full"></span>
              )}
            </button>
            
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-[280px] sm:w-80 glass-card rounded-xl border border-border/50 py-2 shadow-xl bg-surface z-50">
                <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                  <p className="text-sm font-bold text-text-primary">Notifications</p>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs text-text-cyan hover:text-text-primary flex items-center gap-1 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => {
                      const isUnread = notification.time.getTime() > lastReadTime;
                      return (
                        <div 
                          key={notification.id} 
                          className={`px-4 py-3 border-b border-border/30 last:border-0 hover:bg-surface-elevated transition-colors ${isUnread ? 'bg-primary/5' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-semibold text-text-cyan">{notification.title}</span>
                            <span className="text-[10px] text-text-muted">{format(notification.time, 'h:mm a')}</span>
                          </div>
                          <p className="text-sm text-text-primary">{notification.message}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-8 text-center text-text-muted text-sm">
                      No new notifications
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                if (isNotificationsOpen) setIsNotificationsOpen(false);
              }}
              className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 ml-2 hover:bg-primary/30 transition-colors overflow-hidden"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user?.name || ''} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-bold text-xs uppercase">{user?.name?.slice(0, 2)}</span>
              )}
            </button>
            
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 glass-card rounded-xl border border-border/50 py-2 shadow-xl bg-surface z-50">
                <div className="px-4 py-2 border-b border-border/50">
                  <p className="text-sm font-bold text-text-primary truncate">{user?.name}</p>
                  <p className="text-xs text-text-muted truncate mt-0.5">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button 
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-text-cyan hover:text-text-primary hover:bg-surface-elevated transition-colors"
                  >
                    View Profile
                  </button>
                  <button 
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-text-cyan hover:text-text-primary hover:bg-surface-elevated transition-colors"
                  >
                    Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

