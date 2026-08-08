// Life OS Daily Routines & Habit Engine

class RoutineManager {
  static defaultRoutines = [
    { id: 'rt_1', title: 'Wake Up', time: '05:30', duration: 30, priority: 'high', xp: 50, color: '#ffb800', icon: '🌅', enabled: true },
    { id: 'rt_2', title: 'Morning Exercise', time: '06:00', duration: 30, priority: 'high', xp: 60, color: '#1adb77', icon: '💪', enabled: true },
    { id: 'rt_3', title: 'Evening Exercise', time: '17:30', duration: 30, priority: 'medium', xp: 60, color: '#3aa4ff', icon: '🏃', enabled: true },
    { id: 'rt_4', title: 'Help Parents', time: '19:00', duration: 45, priority: 'medium', xp: 50, color: '#ff5b79', icon: '❤️', enabled: true },
    { id: 'rt_5', title: 'Learn New Skills', time: '20:00', duration: 60, priority: 'high', xp: 100, color: '#8652ff', icon: '📚', enabled: true },
    { id: 'rt_6', title: 'Clean Room', time: '21:15', duration: 15, priority: 'low', xp: 30, color: '#00d2ff', icon: '🧹', enabled: true },
    { id: 'rt_7', title: 'Sleep Before 10:30 PM', time: '22:30', duration: 480, priority: 'high', xp: 70, color: '#a855f7', icon: '🌙', enabled: true }
  ];

  static async init() {
    if (!window.AuthManager || !window.AuthManager.requireAuth()) return;

    let routines = await window.LifeOSStore.select('daily_routines');
    if (!routines || routines.length === 0) {
      for (const rt of this.defaultRoutines) {
        await window.LifeOSStore.insert('daily_routines', rt);
      }
      routines = await window.LifeOSStore.select('daily_routines');
    }
    this.renderRoutines(routines);
    this.autoGenerateTodayTasks(routines);
    this.bindEvents();
  }

  static async autoGenerateTodayTasks(routines) {
    const today = new Date().toISOString().slice(0, 10);
    const existingTasks = await window.LifeOSStore.select('tasks', { due_date: today });
    const enabledRoutines = routines.filter(r => r.enabled);

    for (const rt of enabledRoutines) {
      const alreadyCreated = existingTasks.some(t => t.routine_id === rt.id);
      if (!alreadyCreated) {
        await window.LifeOSStore.insert('tasks', {
          title: `${rt.icon} ${rt.title}`,
          category: 'Routine',
          priority: rt.priority,
          status: 'pending',
          estimated_time: rt.duration,
          actual_time: 0,
          due_date: today,
          routine_id: rt.id,
          xp_reward: rt.xp,
        });
      }
    }
  }

  static renderRoutines(routines) {
    const container = document.getElementById('routinesList');
    if (!container) return;

    container.innerHTML = routines.map(rt => `
      <div class="glass-card" style="padding: 20px; border-left: 4px solid ${rt.color}; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span style="font-size:1.8rem;">${rt.icon}</span>
            <span class="reminder-priority ${rt.priority}">${rt.priority.toUpperCase()}</span>
          </div>
          <h4 style="margin:0 0 6px; font-size:1.1rem;">${rt.title}</h4>
          <p style="margin:0; color:#9aa3ff; font-size:0.9rem;">Target: ${rt.time} (${rt.duration} mins)</p>
          <span style="display:inline-block; margin-top:8px; font-size:0.85rem; color:#1adb77; font-weight:600;">+${rt.xp} XP</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:18px; pt-3; border-top:1px solid rgba(255,255,255,0.06);">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.9rem; color:#c7d1ff;">
            <input type="checkbox" class="toggle-routine" data-id="${rt.id}" ${rt.enabled ? 'checked' : ''} /> Active
          </label>
          <div style="display:flex; gap:8px;">
            <button class="edit-rt-btn" data-id="${rt.id}" style="background:rgba(255,255,255,0.08); color:#fff; padding:6px 12px; border-radius:10px;">Edit</button>
            <button class="delete-rt-btn" data-id="${rt.id}" style="background:rgba(255,91,121,0.15); color:#ff5b79; padding:6px 12px; border-radius:10px;">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  static bindEvents() {
    const addBtn = document.getElementById('addRoutineBtn');
    const modal = document.getElementById('routineModal');
    const backdrop = document.getElementById('routineModalBackdrop');
    const closeBtn = document.getElementById('closeRoutineModal');
    const form = document.getElementById('routineForm');

    if (addBtn) addBtn.onclick = () => {
      form.reset();
      document.getElementById('routineId').value = '';
      document.getElementById('routineModalTitle').textContent = 'Add Daily Routine';
      backdrop.classList.remove('hidden');
      modal.classList.remove('hidden');
    };

    if (closeBtn) closeBtn.onclick = () => {
      backdrop.classList.add('hidden');
      modal.classList.add('hidden');
    };

    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('routineId').value;
      const data = {
        title: document.getElementById('routineTitle').value,
        icon: document.getElementById('routineIcon').value || '⚡',
        time: document.getElementById('routineStartTime').value,
        duration: parseInt(document.getElementById('routineDuration').value, 10),
        priority: document.getElementById('routinePriority').value,
        xp: parseInt(document.getElementById('routineXP').value, 10),
        color: document.getElementById('routineColor').value,
        enabled: document.getElementById('routineEnabled').checked,
      };

      if (id) {
        await window.LifeOSStore.update('daily_routines', id, data);
      } else {
        await window.LifeOSStore.insert('daily_routines', data);
      }

      backdrop.classList.add('hidden');
      modal.classList.add('hidden');
      RoutineManager.init();
    };

    const list = document.getElementById('routinesList');
    if (list) {
      list.onclick = async (e) => {
        const toggle = e.target.closest('.toggle-routine');
        const edit = e.target.closest('.edit-rt-btn');
        const del = e.target.closest('.delete-rt-btn');

        if (toggle) {
          const id = toggle.dataset.id;
          await window.LifeOSStore.update('daily_routines', id, { enabled: toggle.checked });
        } else if (edit) {
          const id = edit.dataset.id;
          const routines = await window.LifeOSStore.select('daily_routines');
          const rt = routines.find(r => r.id === id);
          if (rt) {
            document.getElementById('routineId').value = rt.id;
            document.getElementById('routineTitle').value = rt.title;
            document.getElementById('routineIcon').value = rt.icon;
            document.getElementById('routineStartTime').value = rt.time;
            document.getElementById('routineDuration').value = rt.duration;
            document.getElementById('routinePriority').value = rt.priority;
            document.getElementById('routineXP').value = rt.xp;
            document.getElementById('routineColor').value = rt.color;
            document.getElementById('routineEnabled').checked = rt.enabled;
            document.getElementById('routineModalTitle').textContent = 'Edit Routine';
            backdrop.classList.remove('hidden');
            modal.classList.remove('hidden');
          }
        } else if (del) {
          const id = del.dataset.id;
          if (confirm('Delete this routine?')) {
            await window.LifeOSStore.delete('daily_routines', id);
            RoutineManager.init();
          }
        }
      };
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  RoutineManager.init();
});
