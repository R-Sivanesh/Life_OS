// Life OS Settings & JSON Backup Manager

class SettingsManager {
  static init() {
    if (!window.AuthManager || !window.AuthManager.requireAuth()) return;
    this.loadSavedSettings();
    this.bindEvents();
  }

  static applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'emerald') {
      root.style.setProperty('--accent-purple', '#10b981');
      root.style.setProperty('--accent-blue', '#06b6d4');
    } else if (theme === 'rose') {
      root.style.setProperty('--accent-purple', '#f43f5e');
      root.style.setProperty('--accent-blue', '#fb7185');
    } else {
      root.style.setProperty('--accent-purple', '#8b5cf6');
      root.style.setProperty('--accent-blue', '#3b82f6');
    }
  }

  static loadSavedSettings() {
    const key = localStorage.getItem('lifeos_gemini_api_key');
    const url = localStorage.getItem('lifeos_supabase_url');
    const supabaseKey = localStorage.getItem('lifeos_supabase_key');
    const theme = localStorage.getItem('lifeos_accent_theme') || 'purple';

    this.applyTheme(theme);

    const keyInput = document.getElementById('geminiApiKeyInput');
    const urlInput = document.getElementById('supabaseUrlInput');
    const supabaseKeyInput = document.getElementById('supabaseKeyInput');
    const themeSelect = document.getElementById('themeAccentSelect');

    if (keyInput && key) keyInput.value = key;
    if (urlInput && url) urlInput.value = url;
    if (supabaseKeyInput && supabaseKey) supabaseKeyInput.value = supabaseKey;

    // Load user profile info
    const user = window.AuthManager ? window.AuthManager.getUser() : null;
    if (user) {
      const nameInput = document.getElementById('profileNameInput');
      const emailInput = document.getElementById('profileEmailInput');
      if (nameInput) nameInput.value = user.name || '';
      if (emailInput) emailInput.value = user.email || '';
    }

    if (themeSelect) {
      themeSelect.value = theme;
      themeSelect.onchange = () => {
        const selected = themeSelect.value;
        localStorage.setItem('lifeos_accent_theme', selected);
        SettingsManager.applyTheme(selected);
      };
    }
  }

  static exportBackup() {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      collections: {
        daily_routines: window.LifeOSStore.getCollection('daily_routines'),
        tasks: window.LifeOSStore.getCollection('tasks'),
        reminders: window.LifeOSStore.getCollection('reminders'),
        calendar_events: window.LifeOSStore.getCollection('calendar_events'),
        journal: window.LifeOSStore.getCollection('journal'),
        notes: window.LifeOSStore.getCollection('notes'),
        focus_sessions: window.LifeOSStore.getCollection('focus_sessions'),
      }
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LifeOS_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  static importBackup(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.collections) {
          Object.keys(data.collections).forEach(coll => {
            window.LifeOSStore.setCollection(coll, data.collections[coll]);
          });
          alert('🎉 Life OS Backup restored successfully!');
          window.location.reload();
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Error parsing backup JSON file.');
      }
    };
    reader.readAsText(file);
  }

  static bindEvents() {
    const saveKeysBtn = document.getElementById('saveApiKeysBtn');
    const exportBtn = document.getElementById('exportBackupBtn');
    const importInput = document.getElementById('importBackupInput');
    const resetBtn = document.getElementById('resetDataBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const deleteBtn = document.getElementById('deleteAccountBtn');

    if (saveKeysBtn) saveKeysBtn.onclick = () => {
      const key = document.getElementById('geminiApiKeyInput')?.value.trim();
      const url = document.getElementById('supabaseUrlInput')?.value.trim();
      const supabaseKey = document.getElementById('supabaseKeyInput')?.value.trim();
      if (key) localStorage.setItem('lifeos_gemini_api_key', key);
      if (url) localStorage.setItem('lifeos_supabase_url', url);
      if (supabaseKey) localStorage.setItem('lifeos_supabase_key', supabaseKey);
      const msg = document.getElementById('settingsSaveMsg');
      if (msg) { msg.textContent = '✅ Settings saved! Reload to apply Supabase changes.'; msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 3000); }
    };

    if (exportBtn) exportBtn.onclick = () => this.exportBackup();

    if (importInput) importInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        this.importBackup(e.target.files[0]);
      }
    };

    if (resetBtn) resetBtn.onclick = () => {
      if (confirm('Reset all local tasks, routines, notes, and journal entries?')) {
        localStorage.clear();
        alert('All data reset.');
        window.location.reload();
      }
    };

    if (logoutBtn) logoutBtn.onclick = () => {
      if (window.AuthManager) window.AuthManager.logout();
    };

    if (deleteBtn) deleteBtn.onclick = () => {
      if (window.AuthManager) window.AuthManager.deleteAccount();
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  SettingsManager.init();
});
