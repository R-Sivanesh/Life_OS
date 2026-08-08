// Life OS Task Manager Engine

class TaskManager {
  static currentFilter = 'all';

  static async init() {
    const today = new Date().toISOString().slice(0, 10);
    const dateInput = document.getElementById('taskDueDate');
    if (dateInput) dateInput.value = today;

    if (!window.AuthManager || !window.AuthManager.requireAuth()) return;

    const tasks = await window.LifeOSStore.select('tasks');
    this.renderTasks(tasks);
    this.bindEvents();
  }

  static renderTasks(tasks) {
    const container = document.getElementById('tasksList');
    if (!container) return;

    let filtered = tasks;
    if (this.currentFilter === 'pending') filtered = tasks.filter(t => t.status !== 'completed');
    if (this.currentFilter === 'completed') filtered = tasks.filter(t => t.status === 'completed');

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="glass-card" style="padding:32px; text-align:center; color:#9aa3ff;">
          <div style="font-size:2.5rem; margin-bottom:12px;">🎯</div>
          <h3 style="margin:0 0 8px; color:#fff; font-weight:700;">No tasks found</h3>
          <p style="margin:0 0 18px; font-size:0.92rem;">Schedule your primary objectives for today to boost productivity score.</p>
          <button onclick="document.getElementById('addTaskBtn')?.click()" class="btn-primary" style="width:auto; padding:10px 24px;">✨ Create Today's Plan</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(t => `
      <div class="journey-step ${t.status === 'completed' ? 'completed' : ''}" draggable="true" data-id="${t.id}" style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <input type="checkbox" class="task-checkbox" data-id="${t.id}" ${t.status === 'completed' ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer;" />
          <div>
            <h4 style="margin:0; text-decoration: ${t.status === 'completed' ? 'line-through' : 'none'}; font-size:1.05rem;">${t.title}</h4>
            <div style="display:flex; gap:12px; margin-top:4px; font-size:0.85rem; color:#9aa3ff;">
              <span>🏷️ ${t.category || 'General'}</span>
              <span>⏱️ ${t.actual_time || 0} / ${t.estimated_time || 30} mins</span>
              <span>📅 ${t.due_date || 'Today'}</span>
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="reminder-priority ${t.priority || 'medium'}">${(t.priority || 'medium').toUpperCase()}</span>
          <span style="color:#1adb77; font-weight:600; font-size:0.85rem;">+${t.xp_reward || 30} XP</span>
          <button class="edit-task-btn" data-id="${t.id}" style="background:rgba(255,255,255,0.08); color:#fff; padding:6px 12px; border-radius:10px;">Edit</button>
          <button class="delete-task-btn" data-id="${t.id}" style="background:rgba(255,91,121,0.15); color:#ff5b79; padding:6px 12px; border-radius:10px;">Delete</button>
        </div>
      </div>
    `).join('');
  }

  static bindEvents() {
    const addBtn = document.getElementById('addTaskBtn');
    const modal = document.getElementById('taskModal');
    const backdrop = document.getElementById('taskModalBackdrop');
    const closeBtn = document.getElementById('closeTaskModal');
    const form = document.getElementById('taskForm');

    if (addBtn) addBtn.onclick = () => {
      form.reset();
      document.getElementById('taskId').value = '';
      document.getElementById('taskModalTitle').textContent = 'Add New Task';
      backdrop.classList.remove('hidden');
      modal.classList.remove('hidden');
    };

    if (closeBtn) closeBtn.onclick = () => {
      backdrop.classList.add('hidden');
      modal.classList.add('hidden');
    };

    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('taskId').value;
      const data = {
        title: document.getElementById('taskTitle').value,
        category: document.getElementById('taskCategory').value,
        priority: document.getElementById('taskPriority').value,
        estimated_time: parseInt(document.getElementById('taskEstTime').value, 10),
        actual_time: parseInt(document.getElementById('taskActTime').value, 10),
        due_date: document.getElementById('taskDueDate').value,
        xp_reward: parseInt(document.getElementById('taskXP').value, 10),
        status: 'pending',
      };

      if (id) {
        await window.LifeOSStore.update('tasks', id, data);
      } else {
        await window.LifeOSStore.insert('tasks', data);
      }

      backdrop.classList.add('hidden');
      modal.classList.add('hidden');
      TaskManager.init();
    };

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'rgba(255,255,255,0.08)';
          b.style.color = '#c7d1ff';
        });
        btn.classList.add('active');
        btn.style.background = 'rgba(134,82,255,0.25)';
        btn.style.color = '#fff';
        TaskManager.currentFilter = btn.dataset.filter;
        TaskManager.init();
      };
    });

    const list = document.getElementById('tasksList');
    if (list) {
      list.onclick = async (e) => {
        const checkbox = e.target.closest('.task-checkbox');
        const edit = e.target.closest('.edit-task-btn');
        const del = e.target.closest('.delete-task-btn');

        if (checkbox) {
          const id = checkbox.dataset.id;
          const status = checkbox.checked ? 'completed' : 'pending';
          await window.LifeOSStore.update('tasks', id, { status });
          TaskManager.init();
        } else if (edit) {
          const id = edit.dataset.id;
          const tasks = await window.LifeOSStore.select('tasks');
          const t = tasks.find(item => item.id === id);
          if (t) {
            document.getElementById('taskId').value = t.id;
            document.getElementById('taskTitle').value = t.title;
            document.getElementById('taskCategory').value = t.category;
            document.getElementById('taskPriority').value = t.priority;
            document.getElementById('taskEstTime').value = t.estimated_time;
            document.getElementById('taskActTime').value = t.actual_time;
            document.getElementById('taskDueDate').value = t.due_date;
            document.getElementById('taskXP').value = t.xp_reward;
            document.getElementById('taskModalTitle').textContent = 'Edit Task';
            backdrop.classList.remove('hidden');
            modal.classList.remove('hidden');
          }
        } else if (del) {
          const id = del.dataset.id;
          if (confirm('Delete this task?')) {
            await window.LifeOSStore.delete('tasks', id);
            TaskManager.init();
          }
        }
      };
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  TaskManager.init();
});
