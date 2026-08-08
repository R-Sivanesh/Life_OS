// Life OS Reminders & Web Notifications Engine

class ReminderManager {
  static checkInterval = null;

  static async init() {
    const timeInput = document.getElementById('reminderTime');
    if (timeInput) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 15);
      timeInput.value = now.toISOString().slice(0, 16);
    }

    if (!window.AuthManager || !window.AuthManager.requireAuth()) return;

    const reminders = await window.LifeOSStore.select('reminders');
    this.renderReminders(reminders);
    this.bindEvents();
    this.startNotificationChecker();
  }

  static renderReminders(reminders) {
    const container = document.getElementById('remindersList');
    if (!container) return;

    if (reminders.length === 0) {
      container.innerHTML = `
        <div class="glass-card" style="padding:32px; text-align:center; color:#9aa3ff;">
          <div style="font-size:2.5rem; margin-bottom:12px;">🔔</div>
          <h3 style="margin:0 0 8px; color:#fff; font-weight:700;">No reminders today</h3>
          <p style="margin:0 0 18px; font-size:0.92rem;">All scheduled alerts are clear. Set reminders for important milestones.</p>
          <button onclick="document.getElementById('addReminderBtn')?.click()" class="btn-primary" style="width:auto; padding:10px 24px;">+ Create Reminder</button>
        </div>
      `;
      return;
    }

    reminders.sort((a, b) => (a.trigger_at || '').localeCompare(b.trigger_at || ''));

    container.innerHTML = reminders.map(r => `
      <div class="journey-step" style="display:flex; justify-content:space-between; align-items:center; padding:18px 24px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <span style="font-size:1.5rem;">🔔</span>
          <div>
            <h4 style="margin:0; font-size:1.05rem;">${r.title}</h4>
            <div style="margin-top:4px; font-size:0.85rem; color:#9aa3ff;">
              ⏰ Scheduled: ${r.trigger_at ? r.trigger_at.replace('T', ' ') : 'Today'} (${r.recurring !== 'none' ? 'Recurring: ' + r.recurring : 'One-time'})
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="reminder-priority ${r.priority || 'medium'}">${(r.priority || 'medium').toUpperCase()}</span>
          <button class="snooze-rem-btn" data-id="${r.id}" style="background:rgba(255,184,0,0.15); color:#ffb800; padding:6px 12px; border-radius:10px;">Snooze 15m</button>
          <button class="delete-rem-btn" data-id="${r.id}" style="background:rgba(255,91,121,0.15); color:#ff5b79; padding:6px 12px; border-radius:10px;">Dismiss</button>
        </div>
      </div>
    `).join('');
  }

  static startNotificationChecker() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(async () => {
      const reminders = await window.LifeOSStore.select('reminders');
      const nowStr = new Date().toISOString().slice(0, 16);

      for (const r of reminders) {
        if (r.status === 'active' && r.trigger_at && r.trigger_at <= nowStr) {
          this.triggerAlert(r);
          await window.LifeOSStore.update('reminders', r.id, { status: 'triggered' });
        }
      }
    }, 15000);
  }

  static triggerAlert(reminder) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Life OS Reminder: ${reminder.title}`, {
        body: `Scheduled alert triggered for ${reminder.title}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827370.png'
      });
    }

    // Play Web Audio Chime Sound
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}

    alert(`🔔 Life OS Reminder: ${reminder.title}`);
  }

  static bindEvents() {
    const notifBtn = document.getElementById('enableNotifBtn');
    if (notifBtn) {
      notifBtn.onclick = () => {
        if ('Notification' in window) {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              alert('Browser notifications enabled!');
            }
          });
        }
      };
    }

    const addBtn = document.getElementById('addReminderBtn');
    const modal = document.getElementById('reminderModal');
    const backdrop = document.getElementById('reminderModalBackdrop');
    const closeBtn = document.getElementById('closeReminderModal');
    const form = document.getElementById('reminderForm');

    if (addBtn) addBtn.onclick = () => {
      form.reset();
      document.getElementById('reminderId').value = '';
      backdrop.classList.remove('hidden');
      modal.classList.remove('hidden');
    };

    if (closeBtn) closeBtn.onclick = () => {
      backdrop.classList.add('hidden');
      modal.classList.add('hidden');
    };

    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('reminderId').value;
      const data = {
        title: document.getElementById('reminderTitle').value,
        trigger_at: document.getElementById('reminderTime').value,
        priority: document.getElementById('reminderPriority').value,
        recurring: document.getElementById('reminderRecurring').value,
        status: 'active',
      };

      if (id) {
        await window.LifeOSStore.update('reminders', id, data);
      } else {
        await window.LifeOSStore.insert('reminders', data);
      }

      backdrop.classList.add('hidden');
      modal.classList.add('hidden');
      ReminderManager.init();
    };

    const list = document.getElementById('remindersList');
    if (list) {
      list.onclick = async (e) => {
        const snooze = e.target.closest('.snooze-rem-btn');
        const del = e.target.closest('.delete-rem-btn');

        if (snooze) {
          const id = snooze.dataset.id;
          const reminders = await window.LifeOSStore.select('reminders');
          const r = reminders.find(item => item.id === id);
          if (r) {
            const nextTime = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 16);
            await window.LifeOSStore.update('reminders', id, { trigger_at: nextTime, status: 'active' });
            ReminderManager.init();
          }
        } else if (del) {
          const id = del.dataset.id;
          await window.LifeOSStore.delete('reminders', id);
          ReminderManager.init();
        }
      };
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ReminderManager.init();
});
