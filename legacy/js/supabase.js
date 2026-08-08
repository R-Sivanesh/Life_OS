// Life OS Database Store & Supabase Adapter
// Manages tables: users, daily_routines, tasks, reminders, calendar_events, goals, habits, journal, notes, focus_sessions, xp, streak, statistics, quotes, settings, notifications

const getStoredSetting = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (e) {
    return fallback;
  }
};

const SUPABASE_URL = getStoredSetting('lifeos_supabase_url', 'https://your-supabase-project-url.supabase.co');
const SUPABASE_KEY = getStoredSetting('lifeos_supabase_key', getStoredSetting('lifeos_supabase_anon_key', 'public-anon-key'));

let supabaseClient = null;
if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function' && SUPABASE_URL.startsWith('http')) {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {
    console.warn('Supabase initialization fallback to Local Store:', e);
  }
}

class LifeOSStore {
  static getCollection(tableName) {
    const data = localStorage.getItem(`lifeos_db_${tableName}`);
    return data ? JSON.parse(data) : [];
  }

  static setCollection(tableName, items) {
    localStorage.setItem(`lifeos_db_${tableName}`, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(`lifeos_db_${tableName}_updated`, { detail: items }));
    window.dispatchEvent(new CustomEvent('lifeos_db_any_updated', { detail: { tableName, items } }));
  }

  static async select(tableName, query = {}) {
    if (supabaseClient) {
      try {
        let q = supabaseClient.from(tableName).select('*');
        Object.keys(query).forEach((key) => {
          q = q.eq(key, query[key]);
        });
        const { data, error } = await q;
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn(`Supabase select for ${tableName} failed, falling back:`, e);
      }
    }
    const collection = this.getCollection(tableName);
    return collection.filter((item) => {
      return Object.keys(query).every((k) => item[k] === query[k]);
    });
  }

  static async insert(tableName, item) {
    const newItem = {
      id: item.id || 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...item,
    };

    if (supabaseClient) {
      try {
        await supabaseClient.from(tableName).insert([newItem]);
      } catch (e) {
        console.warn(`Supabase insert for ${tableName} failed:`, e);
      }
    }

    const items = this.getCollection(tableName);
    items.unshift(newItem);
    this.setCollection(tableName, items);
    return newItem;
  }

  static async update(tableName, id, updates) {
    if (supabaseClient) {
      try {
        await supabaseClient.from(tableName).update(updates).eq('id', id);
      } catch (e) {
        console.warn(`Supabase update for ${tableName} failed:`, e);
      }
    }

    const items = this.getCollection(tableName);
    const index = items.findIndex((i) => i.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates, updated_at: new Date().toISOString() };
      this.setCollection(tableName, items);
      return items[index];
    }
    return null;
  }

  static async delete(tableName, id) {
    if (supabaseClient) {
      try {
        await supabaseClient.from(tableName).delete().eq('id', id);
      } catch (e) {
        console.warn(`Supabase delete for ${tableName} failed:`, e);
      }
    }

    const items = this.getCollection(tableName);
    const filtered = items.filter((i) => i.id !== id);
    this.setCollection(tableName, filtered);
    return true;
  }
}

// Export global helpers
window.LifeOSStore = LifeOSStore;
window.supabaseClient = supabaseClient;

// One-time cleanup: remove hardcoded mock/sample data from previous versions
(function cleanupMockData() {
  const MOCK_IDS = ['tsk_1', 'tsk_2', 'tsk_3', 'rem_1', 'rem_2', 'jrn_1', 'jrn_2'];
  const tables = ['tasks', 'reminders', 'journal'];
  let cleaned = false;
  tables.forEach(table => {
    const raw = localStorage.getItem(`lifeos_db_${table}`);
    if (!raw) return;
    try {
      const items = JSON.parse(raw);
      const filtered = items.filter(item => !MOCK_IDS.includes(item.id));
      if (filtered.length !== items.length) {
        localStorage.setItem(`lifeos_db_${table}`, JSON.stringify(filtered));
        cleaned = true;
      }
    } catch(e) {}
  });
  if (cleaned) console.log('[Life OS] Cleaned up hardcoded mock data from localStorage.');
})();
