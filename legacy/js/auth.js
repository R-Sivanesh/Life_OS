// Life OS Authentication Manager
// Integrates with Supabase Auth + Local User Session fallback

class AuthManager {
  static currentUser = null;

  // Called synchronously — localStorage reads are always synchronous
  static init() {
    // 1. Restore session from localStorage immediately (sync)
    const savedSession = localStorage.getItem('lifeos_user_session');
    if (savedSession) {
      try {
        AuthManager.currentUser = JSON.parse(savedSession);
      } catch (e) {
        AuthManager.currentUser = null;
      }
    }

    // 2. If Supabase is configured, async-sync to keep session fresh
    if (window.supabaseClient) {
      window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
          const su = session.user;
          AuthManager.currentUser = {
            id: su.id,
            email: su.email,
            name: su.user_metadata?.full_name || su.email.split('@')[0],
            avatar_url: su.user_metadata?.avatar_url || '',
          };
          localStorage.setItem('lifeos_user_session', JSON.stringify(AuthManager.currentUser));
        }
        AuthManager.updateUI();
      }).catch(() => {
        AuthManager.updateUI();
      });
    } else {
      AuthManager.updateUI();
    }
  }

  // Guard: call at top of each page's init()
  // Returns true if user is authenticated, false (and redirects) if not
  static requireAuth() {
    // Auth is initialized synchronously from localStorage above, so this is reliable
    if (!AuthManager.currentUser) {
      window.location.replace('login.html');
      return false;
    }
    return true;
  }

  static getUser() {
    return AuthManager.currentUser;
  }

  // Real XP / Level / Streak — calculated from actual store data
  static async getUserStats() {
    if (!window.LifeOSStore) return { totalXp: 0, levelNum: 1, streak: 0 };

    const xpRecords = await window.LifeOSStore.select('xp');
    const tasks = await window.LifeOSStore.select('tasks');
    const totalXp = xpRecords.reduce((acc, x) => acc + (parseInt(x.amount) || 0), 0);
    const levelNum = Math.floor(totalXp / 500) + 1;

    // Real streak: consecutive days backwards from today with at least 1 completed task
    const completedDates = new Set(
      tasks
        .filter(t => t.status === 'completed' && t.due_date)
        .map(t => t.due_date.slice(0, 10))
    );

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (completedDates.has(dateStr)) {
        streak++;
      } else {
        break; // streak broken
      }
    }

    return { totalXp, levelNum, streak };
  }

  static async login(email, password, remember = true) {
    if (!email || !password) return { success: false, error: 'Email and password are required.' };

    // Try Supabase first
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (data?.user) {
          AuthManager.currentUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name || email.split('@')[0],
            avatar_url: data.user.user_metadata?.avatar_url || '',
          };
          if (remember) localStorage.setItem('lifeos_user_session', JSON.stringify(AuthManager.currentUser));
          return { success: true, user: AuthManager.currentUser };
        }
        if (error) return { success: false, error: error.message };
      } catch (e) {
        // Supabase failed — fall through to local
        console.warn('Supabase login failed, using local auth:', e);
      }
    }

    // Local fallback — always works without Supabase
    AuthManager.currentUser = {
      id: 'local_' + btoa(email).replace(/=/g, '').slice(0, 16),
      email: email,
      name: email.split('@')[0],
      avatar_url: '',
    };
    if (remember) localStorage.setItem('lifeos_user_session', JSON.stringify(AuthManager.currentUser));
    return { success: true, user: AuthManager.currentUser };
  }

  static async signup(name, email, password) {
    if (!email || !password) return { success: false, error: 'Email and password are required.' };
    if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        });
        if (error) return { success: false, error: error.message };
        if (data?.user) {
          AuthManager.currentUser = {
            id: data.user.id,
            email: data.user.email,
            name: name || email.split('@')[0],
            avatar_url: '',
          };
          localStorage.setItem('lifeos_user_session', JSON.stringify(AuthManager.currentUser));
          return { success: true, user: AuthManager.currentUser };
        }
      } catch (e) {
        console.warn('Supabase signup failed, using local:', e);
      }
    }

    // Local fallback
    AuthManager.currentUser = {
      id: 'local_' + btoa(email).replace(/=/g, '').slice(0, 16),
      email: email,
      name: name || email.split('@')[0],
      avatar_url: '',
    };
    localStorage.setItem('lifeos_user_session', JSON.stringify(AuthManager.currentUser));
    return { success: true, user: AuthManager.currentUser };
  }

  static async loginWithGoogle() {
    if (window.supabaseClient) {
      try {
        const { error } = await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + '/index.html' }
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (e) {
        return { success: false, error: 'Google OAuth not configured. Use email login.' };
      }
    }
    return { success: false, error: 'Supabase not configured. Use email login.' };
  }

  static async forgotPassword(email) {
    if (!email) return { success: false, error: 'Please enter your email address.' };
    if (window.supabaseClient) {
      try {
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/login.html'
        });
        if (error) return { success: false, error: error.message };
        return { success: true, message: 'Password reset email sent! Check your inbox.' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: true, message: 'If this email exists in the system, a reset link would be sent.' };
  }

  static logout() {
    if (window.supabaseClient) {
      try { window.supabaseClient.auth.signOut(); } catch (e) {}
    }
    localStorage.removeItem('lifeos_user_session');
    AuthManager.currentUser = null;
    window.location.replace('login.html');
  }

  static async deleteAccount() {
    if (!confirm('Delete your account and ALL data? This cannot be undone.')) return;
    const tables = ['tasks', 'reminders', 'journal', 'notes', 'calendar_events', 'focus_sessions', 'xp', 'daily_routines'];
    tables.forEach(t => localStorage.removeItem(`lifeos_db_${t}`));
    localStorage.removeItem('lifeos_user_session');
    AuthManager.currentUser = null;
    window.location.replace('login.html');
  }

  static updateUI() {
    const user = AuthManager.currentUser;
    if (!user) return;

    const initials = (user.name || user.email || 'OS').slice(0, 2).toUpperCase();

    document.querySelectorAll('.profile-circle').forEach(el => {
      if (user.avatar_url) {
        el.innerHTML = `<img src="${user.avatar_url}" style="width:100%;height:100%;border-radius:14px;object-fit:cover;" />`;
      } else {
        el.textContent = initials;
      }
    });
    document.querySelectorAll('.sidebar-user-name').forEach(el => {
      el.textContent = user.name || user.email.split('@')[0];
    });
    document.querySelectorAll('.sidebar-user-email').forEach(el => {
      el.textContent = user.email || '';
    });
  }
}

// Initialize synchronously so requireAuth() works immediately in DOMContentLoaded
AuthManager.init();

window.AuthManager = AuthManager;
