// Life OS Dashboard Engine – Real Data Only

class DashboardEngine {
  static calendarYear = new Date().getFullYear();
  static calendarMonth = new Date().getMonth();
  static selectedDayPlannerDate = null;

  static async init() {
    if (!window.AuthManager || !window.AuthManager.requireAuth()) return;

    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    await this.ensureTodayRoutinesGenerated();
    await this.renderCurrentFocusCenterpiece();
    await this.renderTodayTimeline();
    await this.renderUpcomingReminder();
    await this.renderAiRecommendation();
    await this.renderFullCalendar();
    await this.renderStatsBar();
    this.bindEvents();
  }

  // ─── Clock ───────────────────────────────────────────────────────────────────
  static updateClock() {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes().toString().padStart(2,'0');
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = (h % 12 || 12).toString().padStart(2,'0');
    const greeting = h < 5 ? 'Good Night 🌙' : h < 12 ? 'Good Morning ☀️' : h < 17 ? 'Good Afternoon 🌤️' : h < 20 ? 'Good Evening 🌆' : 'Good Night 🌌';
    const user = window.AuthManager ? window.AuthManager.getUser() : null;
    const userName = user ? (user.name || user.email.split('@')[0]) : 'there';

    const el = id => document.getElementById(id);
    if (el('greeting')) el('greeting').textContent = `${greeting}, ${userName}`;
    if (el('dashboardSubtitle')) el('dashboardSubtitle').textContent = now.toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    if (el('topLiveClock')) el('topLiveClock').textContent = `${h12}:${m} ${ampm}`;
  }

  // ─── Generate today's routine tasks (from stored routines ONLY) ───────────────
  static async ensureTodayRoutinesGenerated() {
    const today = new Date().toISOString().slice(0, 10);
    const existingTasks = await window.LifeOSStore.select('tasks', { due_date: today });
    const routines = await window.LifeOSStore.select('daily_routines');
    for (const rt of routines.filter(r => r.enabled !== false)) {
      if (!existingTasks.some(t => t.routine_id === rt.id)) {
        await window.LifeOSStore.insert('tasks', {
          title: `${rt.icon || ''} ${rt.title}`.trim(),
          category: 'Routine', priority: rt.priority || 'medium',
          status: 'pending', estimated_time: rt.duration || 30,
          actual_time: 0, due_date: today,
          scheduled_time: rt.time || '09:00',
          routine_id: rt.id, xp_reward: rt.xp || 30,
        });
      }
    }
  }

  // ─── Stats Bar ───────────────────────────────────────────────────────────────
  static async renderStatsBar() {
    const stats = await window.AuthManager.getUserStats();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const xpToNext = 500 - (stats.totalXp % 500);
    set('topStreakVal', stats.streak);
    set('topLvlVal', stats.levelNum);
    set('lvlNumText', stats.levelNum);
    set('currentXpText', `${stats.totalXp} XP • ${xpToNext} to lvl ${stats.levelNum + 1}`);
  }

  // ─── Current Focus Centerpiece ───────────────────────────────────────────────
  static async renderCurrentFocusCenterpiece() {
    const today = new Date().toISOString().slice(0, 10);
    const tasks = await window.LifeOSStore.select('tasks', { due_date: today });
    const completed = tasks.filter(t => t.status === 'completed');
    const pending = tasks.filter(t => t.status !== 'completed')
      .sort((a, b) => (a.scheduled_time || '00:00').localeCompare(b.scheduled_time || '00:00'));

    const pct = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const show = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? 'inline-block' : 'none'; };

    const fillEl = document.getElementById('dashProgressFill');
    if (fillEl) fillEl.style.width = `${pct}%`;
    set('dashProgressPctText', `${pct}% today`);
    set('dashTaskCountDoneText', `${completed.length} of ${tasks.length} done`);

    if (pending.length > 0) {
      const cur = pending[0];
      const estMins = cur.estimated_time || 30;
      const finishDate = new Date(Date.now() + estMins * 60000);
      const finishStr = finishDate.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
      const priorityColors = { high:'#f43f5e', medium:'#f59e0b', low:'#10b981' };
      const pColor = priorityColors[(cur.priority||'medium').toLowerCase()] || '#f59e0b';

      set('focusTaskTitle', cur.title);
      const metaEl = document.getElementById('focusTimeMeta');
      if (metaEl) metaEl.innerHTML = `<span>⏱️ ${estMins} mins</span> &nbsp;•&nbsp; <span style="color:${pColor};font-weight:700;">${(cur.priority||'medium').toUpperCase()}</span>${cur.scheduled_time ? ` &nbsp;•&nbsp; ⏰ ${cur.scheduled_time}` : ''} &nbsp;•&nbsp; <span style="color:#10b981;">Finish ~${finishStr}</span>`;

      show('centerpieceStartFocusBtn', true);
      show('centerpieceCompleteBtn', true);
      show('centerpieceSkipBtn', true);
      show('centerpieceEditBtn', true);
      show('createPlanBtn', false);

      const focusBtn = document.getElementById('centerpieceStartFocusBtn');
      if (focusBtn) focusBtn.onclick = () => window.location.href = `focus.html?taskId=${cur.id}`;

      const completeBtn = document.getElementById('centerpieceCompleteBtn');
      if (completeBtn) completeBtn.onclick = async () => {
        completeBtn.disabled = true; completeBtn.textContent = '✔ Saving...';
        await window.LifeOSStore.update('tasks', cur.id, { status: 'completed' });
        await window.LifeOSStore.insert('xp', { amount: cur.xp_reward || 50, source: `Task: ${cur.title}`, timestamp: new Date().toISOString() });
        await DashboardEngine.init();
      };

      const skipBtn = document.getElementById('centerpieceSkipBtn');
      if (skipBtn) skipBtn.onclick = async () => {
        await window.LifeOSStore.update('tasks', cur.id, { scheduled_time: '23:59' });
        await DashboardEngine.renderCurrentFocusCenterpiece();
        await DashboardEngine.renderTodayTimeline();
      };

      const editBtn = document.getElementById('centerpieceEditBtn');
      if (editBtn) editBtn.onclick = () => DashboardEngine.openTaskModal(cur);

    } else {
      set('focusTaskTitle', tasks.length > 0 ? '🎉 All done today!' : 'No tasks yet.');
      const metaEl = document.getElementById('focusTimeMeta');
      if (metaEl) metaEl.textContent = tasks.length > 0 ? 'Great work! Journal your wins or plan tomorrow.' : 'Click "+ Task" to schedule your first task.';
      show('centerpieceStartFocusBtn', false);
      show('centerpieceCompleteBtn', false);
      show('centerpieceSkipBtn', false);
      show('centerpieceEditBtn', false);

      const createBtn = document.getElementById('createPlanBtn');
      if (createBtn) {
        createBtn.style.display = 'inline-block';
        createBtn.onclick = () => DashboardEngine.openTaskModal(null);
      }
    }
  }

  // ─── Today's Timeline ────────────────────────────────────────────────────────
  static async renderTodayTimeline() {
    const container = document.getElementById('todayTimelineList');
    if (!container) return;
    const today = new Date().toISOString().slice(0, 10);
    const tasks = await window.LifeOSStore.select('tasks', { due_date: today });

    if (tasks.length === 0) {
      container.innerHTML = `<div style="padding:24px;text-align:center;color:#9aa3ff;background:rgba(255,255,255,0.03);border-radius:16px;border:1px dashed rgba(255,255,255,0.1);">
        <div style="font-size:1.8rem;margin-bottom:8px;">📋</div>
        <p style="margin:0;font-size:0.85rem;">No tasks for today.</p>
        <button onclick="DashboardEngine.openTaskModal(null)" class="btn-primary" style="width:auto;margin-top:12px;padding:8px 18px;font-size:0.8rem;">+ Add First Task</button>
      </div>`;
      return;
    }

    tasks.sort((a, b) => (a.scheduled_time || '00:00').localeCompare(b.scheduled_time || '00:00'));
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const priorityColors = { high:'#f43f5e', medium:'#f59e0b', low:'#10b981' };

    container.innerHTML = tasks.map(t => {
      const isDone = t.status === 'completed';
      const timeStr = t.scheduled_time || '';
      const taskMins = timeStr ? parseInt(timeStr.split(':')[0])*60 + parseInt(timeStr.split(':')[1]) : -1;
      const isCurrent = !isDone && taskMins >= 0 && taskMins <= nowMins+60 && taskMins >= nowMins-30;
      const pColor = priorityColors[(t.priority||'medium').toLowerCase()] || '#f59e0b';

      return `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:${isDone?'rgba(255,255,255,0.02)':isCurrent?'rgba(139,92,246,0.1)':'rgba(255,255,255,0.04)'};border-radius:14px;border:1px solid ${isDone?'rgba(255,255,255,0.04)':isCurrent?'rgba(139,92,246,0.3)':'rgba(255,255,255,0.07)'};transition:all 0.2s;">
        <input type="checkbox" class="tl-chk" data-id="${t.id}" ${isDone?'checked':''} style="width:18px;height:18px;cursor:pointer;flex-shrink:0;accent-color:#8b5cf6;" />
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">
            ${timeStr ? `<span style="font-size:0.78rem;font-weight:700;color:#8b5cf6;flex-shrink:0;">${timeStr}</span>` : ''}
            <span style="font-size:0.88rem;font-weight:600;text-decoration:${isDone?'line-through':'none'};color:${isDone?'#9aa3ff':'#fff'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.title}</span>
            ${isCurrent ? '<span style="background:rgba(139,92,246,0.25);color:#a78bfa;padding:2px 7px;border-radius:5px;font-size:0.65rem;font-weight:800;flex-shrink:0;">NOW</span>' : ''}
            ${isDone ? '<span style="background:rgba(16,185,129,0.15);color:#10b981;padding:2px 7px;border-radius:5px;font-size:0.65rem;font-weight:800;flex-shrink:0;">✔ DONE</span>' : ''}
          </div>
          <div style="font-size:0.75rem;color:#9aa3ff;display:flex;gap:8px;flex-wrap:wrap;">
            <span>🏷️ ${t.category||'General'}</span>
            <span>⏱️ ${t.estimated_time||30}m</span>
            <span style="color:${pColor};font-weight:600;">● ${(t.priority||'medium').toUpperCase()}</span>
            <span style="color:#f59e0b;font-weight:600;">+${t.xp_reward||30} XP</span>
          </div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0;">
          ${!isDone?`<button class="tl-focus-btn" data-id="${t.id}" style="background:rgba(139,92,246,0.15);color:#a78bfa;padding:5px 10px;border-radius:9px;font-size:0.75rem;font-weight:600;border:1px solid rgba(139,92,246,0.2);">⏱️</button>`:''}
          <button class="tl-edit-btn" data-id="${t.id}" style="background:rgba(255,255,255,0.06);color:#c7d1ff;padding:5px 10px;border-radius:9px;font-size:0.75rem;border:1px solid rgba(255,255,255,0.09);">✏️</button>
          <button class="tl-del-btn" data-id="${t.id}" style="background:rgba(244,63,94,0.1);color:#f87171;padding:5px 10px;border-radius:9px;font-size:0.75rem;border:1px solid rgba(244,63,94,0.18);">🗑️</button>
        </div>
      </div>`;
    }).join('');
  }

  // ─── AI Recommendation ───────────────────────────────────────────────────────
  static async renderAiRecommendation() {
    const today = new Date().toISOString().slice(0, 10);
    const tasks = await window.LifeOSStore.select('tasks', { due_date: today });
    const pending = tasks.filter(t => t.status !== 'completed');
    const completed = tasks.filter(t => t.status === 'completed');
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    if (tasks.length === 0) {
      set('aiRecTitle', '📋 No tasks today');
      set('aiRecMsg', 'Add your first task to get personalized recommendations.');
      const btn = document.getElementById('aiRecActionBtn');
      if (btn) { btn.textContent = '+ Add Task'; btn.onclick = () => DashboardEngine.openTaskModal(null); }
      return;
    }

    if (pending.length === 0) {
      set('aiRecTitle', '🎉 All complete!');
      set('aiRecMsg', `${completed.length} tasks done today. Write your reflections in the journal.`);
      const btn = document.getElementById('aiRecActionBtn');
      if (btn) { btn.textContent = '📖 Open Journal'; btn.onclick = () => window.location.href = 'journal.html'; }
      return;
    }

    const highPri = pending.filter(t => t.priority === 'high');
    const topTask = highPri.length > 0 ? highPri[0] : pending[0];
    const completionRate = Math.round((completed.length / tasks.length) * 100);
    set('aiRecTitle', `🎯 ${topTask.title}`);
    set('aiRecMsg', `${pending.length} task${pending.length > 1?'s':''} remaining (${100-completionRate}% left). "${topTask.title}" needs ~${topTask.estimated_time||30} mins.`);
    const btn = document.getElementById('aiRecActionBtn');
    if (btn) { btn.textContent = '⏱️ Start Focus'; btn.onclick = () => window.location.href = `focus.html?taskId=${topTask.id}`; }
  }

  // ─── Upcoming Reminder ───────────────────────────────────────────────────────
  static async renderUpcomingReminder() {
    const reminders = await window.LifeOSStore.select('reminders');
    const nowStr = new Date().toISOString().slice(0, 16);
    const upcoming = reminders
      .filter(r => r.status === 'active' && r.trigger_at && r.trigger_at >= nowStr)
      .sort((a, b) => a.trigger_at.localeCompare(b.trigger_at));
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    if (upcoming.length === 0) {
      set('remTitle', 'No upcoming reminders');
      const tagEl = document.getElementById('remPriorityTag');
      if (tagEl) tagEl.style.display = 'none';
      set('remSub', 'Add one via the Reminders page.');
      return;
    }

    const nearest = upcoming[0];
    const timeStr = new Date(nearest.trigger_at).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    set('remTitle', nearest.title);
    const tagEl = document.getElementById('remPriorityTag');
    if (tagEl) {
      tagEl.style.display = 'inline-block';
      tagEl.className = `reminder-priority ${(nearest.priority||'medium').toLowerCase()}`;
      tagEl.textContent = (nearest.priority||'MEDIUM').toUpperCase();
    }
    set('remSub', `⏰ ${timeStr}${upcoming.length > 1 ? ` • +${upcoming.length-1} more` : ''}`);
  }

  // ─── Full Month Calendar ─────────────────────────────────────────────────────
  static async renderFullCalendar() {
    const grid = document.getElementById('dashCalGrid');
    const titleEl = document.getElementById('dashCalMonthTitle');
    if (!grid) return;

    const year = this.calendarYear;
    const month = this.calendarMonth;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    if (titleEl) titleEl.textContent = `${monthNames[month]} ${year}`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const todayStr = new Date().toISOString().slice(0, 10);

    const tasks = await window.LifeOSStore.select('tasks');
    const reminders = await window.LifeOSStore.select('reminders');
    const journalEntries = await window.LifeOSStore.select('journal');

    // Build date → items map
    const tasksByDate = {};
    tasks.forEach(t => {
      if (t.due_date) {
        tasksByDate[t.due_date] = tasksByDate[t.due_date] || [];
        tasksByDate[t.due_date].push(t);
      }
    });
    const remindersByDate = {};
    reminders.forEach(r => {
      if (r.trigger_at) {
        const d = r.trigger_at.slice(0, 10);
        remindersByDate[d] = remindersByDate[d] || [];
        remindersByDate[d].push(r);
      }
    });
    const journalByDate = {};
    journalEntries.forEach(j => {
      if (j.date) {
        journalByDate[j.date] = journalByDate[j.date] || [];
        journalByDate[j.date].push(j);
      }
    });

    grid.innerHTML = '';

    // Day headers
    ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(h => {
      const span = document.createElement('div');
      span.className = 'cal-day-header';
      span.textContent = h;
      grid.appendChild(span);
    });

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.style.cssText = 'min-height:64px;';
      grid.appendChild(empty);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const isToday = dateKey === todayStr;
      const isSelected = dateKey === this.selectedDayPlannerDate;

      const cell = document.createElement('div');
      cell.className = `cal-day-cell${isToday?' today':''}${isSelected?' selected':''}`;
      cell.dataset.date = dateKey;

      // Day number
      const numDiv = document.createElement('div');
      numDiv.className = 'cal-day-num';
      numDiv.textContent = day;
      cell.appendChild(numDiv);

      // Dots
      const dayTasks = tasksByDate[dateKey] || [];
      const dayRems = remindersByDate[dateKey] || [];
      const dayJournal = journalByDate[dateKey] || [];

      if (dayTasks.length > 0 || dayRems.length > 0 || dayJournal.length > 0) {
        const dotsDiv = document.createElement('div');
        dotsDiv.className = 'cal-day-dots';

        if (dayTasks.length > 0) {
          const dot = document.createElement('span');
          dot.className = 'cal-dot';
          dot.style.background = '#3b82f6';
          dot.title = `${dayTasks.length} task${dayTasks.length>1?'s':''}`;
          dotsDiv.appendChild(dot);
        }
        if (dayRems.length > 0) {
          const dot = document.createElement('span');
          dot.className = 'cal-dot';
          dot.style.background = '#f59e0b';
          dot.title = `${dayRems.length} reminder${dayRems.length>1?'s':''}`;
          dotsDiv.appendChild(dot);
        }
        if (dayJournal.length > 0) {
          const dot = document.createElement('span');
          dot.className = 'cal-dot';
          dot.style.background = '#10b981';
          dot.title = 'Journal entry';
          dotsDiv.appendChild(dot);
        }
        cell.appendChild(dotsDiv);

        // Mini preview label
        if (dayTasks.length > 0) {
          const label = document.createElement('div');
          label.className = 'cal-day-mini-label';
          const completedDay = dayTasks.filter(t => t.status === 'completed').length;
          label.textContent = `${completedDay}/${dayTasks.length} tasks`;
          cell.appendChild(label);
        }
      }

      cell.onclick = () => DashboardEngine.openDayDetail(dateKey);
      grid.appendChild(cell);
    }
  }

  // ─── Day Detail Panel (inline, below calendar) ───────────────────────────────
  static async openDayDetail(dateKey) {
    this.selectedDayPlannerDate = dateKey;
    await this.renderFullCalendar(); // refresh selection highlight

    const card = document.getElementById('dayDetailCard');
    if (!card) return;

    const dateObj = new Date(dateKey + 'T00:00:00');
    const dateLabel = dateObj.toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long' });
    document.getElementById('dayDetailTitle').textContent = dateLabel;
    card.style.display = 'block';

    // Set default dates on planner add buttons
    const plannerAddTask = document.getElementById('plannerAddTask');
    const plannerAddReminder = document.getElementById('plannerAddReminder');
    const plannerAddJournal = document.getElementById('plannerAddJournal');

    if (plannerAddTask) plannerAddTask.onclick = () => {
      DashboardEngine.selectedDayPlannerDate = dateKey;
      DashboardEngine.openTaskModal(null);
    };
    if (plannerAddReminder) plannerAddReminder.onclick = () => {
      DashboardEngine.selectedDayPlannerDate = dateKey;
      DashboardEngine.openReminderModal();
    };
    if (plannerAddJournal) plannerAddJournal.onclick = () => {
      DashboardEngine.selectedDayPlannerDate = dateKey;
      DashboardEngine.openJournalModal();
    };

    await this.refreshDayDetail(dateKey);
  }

  static closeDayDetail() {
    const card = document.getElementById('dayDetailCard');
    if (card) card.style.display = 'none';
    DashboardEngine.selectedDayPlannerDate = null;
    DashboardEngine.renderFullCalendar();
  }

  static async refreshDayDetail(dateKey) {
    const tasks = await window.LifeOSStore.select('tasks', { due_date: dateKey });
    const reminders = await window.LifeOSStore.select('reminders');
    const dayReminders = reminders.filter(r => r.trigger_at && r.trigger_at.startsWith(dateKey));
    const journalEntries = await window.LifeOSStore.select('journal', { date: dateKey });

    // Progress
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const pct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
    const progEl = document.getElementById('plannerProgress');
    if (progEl) {
      progEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:0.78rem;color:#9aa3ff;">
          <span>${completedCount}/${tasks.length} tasks done</span>
          <span style="color:#8b5cf6;font-weight:700;">${pct}%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.07);border-radius:6px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#8b5cf6,#3b82f6,#10b981);transition:width 0.5s ease;"></div>
        </div>`;
    }

    // Tasks
    const tasksEl = document.getElementById('plannerTasksList');
    if (tasksEl) {
      if (tasks.length === 0) {
        tasksEl.innerHTML = `<p style="color:#9aa3ff;font-size:0.8rem;margin:0;">No tasks for this date.</p>`;
      } else {
        tasksEl.innerHTML = tasks
          .sort((a, b) => (a.scheduled_time||'00:00').localeCompare(b.scheduled_time||'00:00'))
          .map(t => `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
            <input type="checkbox" class="planner-task-chk" data-id="${t.id}" ${t.status==='completed'?'checked':''} style="width:16px;height:16px;cursor:pointer;accent-color:#8b5cf6;flex-shrink:0;" />
            <div style="flex:1;min-width:0;">
              <div style="font-size:0.83rem;font-weight:600;text-decoration:${t.status==='completed'?'line-through':'none'};color:${t.status==='completed'?'#9aa3ff':'#fff'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.title}</div>
              <div style="font-size:0.7rem;color:#9aa3ff;">${t.scheduled_time||''} ${t.category?'• '+t.category:''}</div>
            </div>
            <button class="planner-del-task" data-id="${t.id}" style="background:rgba(244,63,94,0.1);color:#f87171;padding:3px 7px;border-radius:7px;font-size:0.72rem;border:1px solid rgba(244,63,94,0.18);flex-shrink:0;">🗑️</button>
          </div>`).join('');
      }
    }

    // Reminders
    const remsEl = document.getElementById('plannerRemindersList');
    if (remsEl) {
      if (dayReminders.length === 0) {
        remsEl.innerHTML = `<p style="color:#9aa3ff;font-size:0.8rem;margin:0;">No reminders.</p>`;
      } else {
        remsEl.innerHTML = dayReminders.map(r => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(245,158,11,0.07);border-radius:10px;border:1px solid rgba(245,158,11,0.14);">
            <div>
              <div style="font-size:0.83rem;font-weight:600;color:#fff;">🔔 ${r.title}</div>
              <div style="font-size:0.7rem;color:#f59e0b;">${r.trigger_at?r.trigger_at.slice(11,16):''} • ${(r.priority||'medium').toUpperCase()}</div>
            </div>
            <button class="planner-del-rem" data-id="${r.id}" style="background:rgba(244,63,94,0.1);color:#f87171;padding:3px 7px;border-radius:7px;font-size:0.72rem;border:1px solid rgba(244,63,94,0.18);">🗑️</button>
          </div>`).join('');
      }
    }

    // Journal
    const journalEl = document.getElementById('plannerJournalEntry');
    if (journalEl) {
      if (journalEntries.length === 0) {
        journalEl.innerHTML = `<p style="color:#9aa3ff;font-size:0.8rem;margin:0;">No journal entry.</p>`;
      } else {
        journalEl.innerHTML = journalEntries.map(j => `
          <div style="padding:10px;background:rgba(139,92,246,0.07);border-radius:10px;border:1px solid rgba(139,92,246,0.18);">
            <div style="font-size:1.1rem;margin-bottom:4px;">${j.mood||'😊'}</div>
            <p style="margin:0;font-size:0.8rem;color:#e8ecff;line-height:1.5;">${(j.content||'').slice(0,200)}${j.content&&j.content.length>200?'...':''}</p>
          </div>`).join('');
      }
    }

    // Bind planner interactions
    document.querySelectorAll('.planner-task-chk').forEach(chk => {
      chk.onchange = async () => {
        const status = chk.checked ? 'completed' : 'pending';
        await window.LifeOSStore.update('tasks', chk.dataset.id, { status });
        if (chk.checked) {
          const allTasks = await window.LifeOSStore.select('tasks');
          const t = allTasks.find(x => x.id === chk.dataset.id);
          if (t) await window.LifeOSStore.insert('xp', { amount: t.xp_reward||30, source:`Task: ${t.title}`, timestamp: new Date().toISOString() });
        }
        await DashboardEngine.refreshDayDetail(dateKey);
        await DashboardEngine.renderCurrentFocusCenterpiece();
        await DashboardEngine.renderTodayTimeline();
        await DashboardEngine.renderStatsBar();
        await DashboardEngine.renderFullCalendar();
      };
    });

    document.querySelectorAll('.planner-del-task').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Delete this task?')) return;
        await window.LifeOSStore.delete('tasks', btn.dataset.id);
        await DashboardEngine.refreshDayDetail(dateKey);
        await DashboardEngine.renderCurrentFocusCenterpiece();
        await DashboardEngine.renderTodayTimeline();
        await DashboardEngine.renderFullCalendar();
      };
    });

    document.querySelectorAll('.planner-del-rem').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Delete this reminder?')) return;
        await window.LifeOSStore.delete('reminders', btn.dataset.id);
        await DashboardEngine.refreshDayDetail(dateKey);
        await DashboardEngine.renderUpcomingReminder();
        await DashboardEngine.renderFullCalendar();
      };
    });
  }

  // ─── Task Modal ──────────────────────────────────────────────────────────────
  static openTaskModal(task = null) {
    const backdrop = document.getElementById('taskQuickBackdrop');
    if (!backdrop) return;

    const isEdit = !!task;
    document.getElementById('tqmTitle').textContent = isEdit ? 'Edit Task' : 'Add Task';
    document.getElementById('tqmId').value = task ? task.id : '';
    document.getElementById('tqmTaskTitle').value = task ? task.title : '';
    document.getElementById('tqmCategory').value = task ? (task.category||'Work') : 'Work';
    document.getElementById('tqmPriority').value = task ? (task.priority||'medium') : 'medium';
    document.getElementById('tqmTime').value = task ? (task.scheduled_time||'') : '';
    document.getElementById('tqmDate').value = task ? (task.due_date||'') : (DashboardEngine.selectedDayPlannerDate || new Date().toISOString().slice(0,10));
    document.getElementById('tqmDuration').value = task ? (task.estimated_time||30) : 30;
    document.getElementById('tqmXP').value = task ? (task.xp_reward||50) : 50;
    document.getElementById('tqmNotes').value = task ? (task.notes||'') : '';

    backdrop.classList.remove('hidden');
    setTimeout(() => document.getElementById('tqmTaskTitle')?.focus(), 50);
  }

  static closeTaskModal() {
    document.getElementById('taskQuickBackdrop')?.classList.add('hidden');
  }

  // ─── Reminder Modal ──────────────────────────────────────────────────────────
  static openReminderModal() {
    const backdrop = document.getElementById('reminderQuickBackdrop');
    if (!backdrop) return;
    const today = DashboardEngine.selectedDayPlannerDate || new Date().toISOString().slice(0, 10);
    document.getElementById('rqmDate').value = today;
    document.getElementById('rqmTime').value = '09:00';
    document.getElementById('rqmTitle').value = '';
    document.getElementById('rqmPriority').value = 'medium';
    backdrop.classList.remove('hidden');
    setTimeout(() => document.getElementById('rqmTitle')?.focus(), 50);
  }

  static closeReminderModal() {
    document.getElementById('reminderQuickBackdrop')?.classList.add('hidden');
  }

  // ─── Journal Modal ───────────────────────────────────────────────────────────
  static openJournalModal() {
    const backdrop = document.getElementById('journalQuickBackdrop');
    if (!backdrop) return;
    const today = DashboardEngine.selectedDayPlannerDate || new Date().toISOString().slice(0, 10);
    document.getElementById('jqmDate').value = today;
    document.getElementById('jqmContent').value = '';
    document.getElementById('jqmMood').value = '😊';
    backdrop.classList.remove('hidden');
    setTimeout(() => document.getElementById('jqmContent')?.focus(), 50);
  }

  static closeJournalModal() {
    document.getElementById('journalQuickBackdrop')?.classList.add('hidden');
  }

  // ─── Bind Events ─────────────────────────────────────────────────────────────
  static bindEvents() {
    // Timeline
    const timeline = document.getElementById('todayTimelineList');
    if (timeline) {
      timeline.addEventListener('click', async (e) => {
        const chk = e.target.closest('.tl-chk');
        const focusBtn = e.target.closest('.tl-focus-btn');
        const editBtn = e.target.closest('.tl-edit-btn');
        const delBtn = e.target.closest('.tl-del-btn');

        if (chk) {
          const status = chk.checked ? 'completed' : 'pending';
          await window.LifeOSStore.update('tasks', chk.dataset.id, { status });
          if (chk.checked) {
            const allTasks = await window.LifeOSStore.select('tasks');
            const t = allTasks.find(x => x.id === chk.dataset.id);
            if (t) await window.LifeOSStore.insert('xp', { amount: t.xp_reward||30, source: `Task: ${t.title}`, timestamp: new Date().toISOString() });
          }
          await DashboardEngine.renderCurrentFocusCenterpiece();
          await DashboardEngine.renderTodayTimeline();
          await DashboardEngine.renderStatsBar();
          await DashboardEngine.renderFullCalendar();
        } else if (focusBtn) {
          window.location.href = `focus.html?taskId=${focusBtn.dataset.id}`;
        } else if (editBtn) {
          const allTasks = await window.LifeOSStore.select('tasks');
          const t = allTasks.find(x => x.id === editBtn.dataset.id);
          if (t) DashboardEngine.openTaskModal(t);
        } else if (delBtn) {
          if (confirm('Delete this task?')) {
            await window.LifeOSStore.delete('tasks', delBtn.dataset.id);
            await DashboardEngine.renderCurrentFocusCenterpiece();
            await DashboardEngine.renderTodayTimeline();
            await DashboardEngine.renderFullCalendar();
          }
        }
      });
    }

    // Calendar prev/next/today
    document.getElementById('prevMonthMiniBtn')?.addEventListener('click', async () => {
      DashboardEngine.calendarMonth--;
      if (DashboardEngine.calendarMonth < 0) { DashboardEngine.calendarMonth = 11; DashboardEngine.calendarYear--; }
      await DashboardEngine.renderFullCalendar();
    });
    document.getElementById('nextMonthMiniBtn')?.addEventListener('click', async () => {
      DashboardEngine.calendarMonth++;
      if (DashboardEngine.calendarMonth > 11) { DashboardEngine.calendarMonth = 0; DashboardEngine.calendarYear++; }
      await DashboardEngine.renderFullCalendar();
    });
    document.getElementById('todayMiniBtn')?.addEventListener('click', async () => {
      DashboardEngine.calendarYear = new Date().getFullYear();
      DashboardEngine.calendarMonth = new Date().getMonth();
      await DashboardEngine.renderFullCalendar();
    });

    // Close day detail
    document.getElementById('closeDayDetail')?.addEventListener('click', DashboardEngine.closeDayDetail);

    // Header quick add
    document.getElementById('btnQuickAddTask')?.addEventListener('click', () => DashboardEngine.openTaskModal(null));
    document.getElementById('btnQuickAddReminder')?.addEventListener('click', () => DashboardEngine.openReminderModal());
    document.getElementById('btnQuickAddJournal')?.addEventListener('click', () => DashboardEngine.openJournalModal());
    document.getElementById('addTimelineTaskBtn')?.addEventListener('click', () => DashboardEngine.openTaskModal(null));
    document.getElementById('openLog')?.addEventListener('click', () => DashboardEngine.openTaskModal(null));

    // Modal backdrops close on click outside
    document.getElementById('taskQuickBackdrop')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) DashboardEngine.closeTaskModal();
    });
    document.getElementById('reminderQuickBackdrop')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) DashboardEngine.closeReminderModal();
    });
    document.getElementById('journalQuickBackdrop')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) DashboardEngine.closeJournalModal();
    });

    // Modal close buttons
    document.getElementById('closeTaskQuickModal')?.addEventListener('click', DashboardEngine.closeTaskModal);
    document.getElementById('closeReminderQuickModal')?.addEventListener('click', DashboardEngine.closeReminderModal);
    document.getElementById('closeJournalQuickModal')?.addEventListener('click', DashboardEngine.closeJournalModal);

    // Task form submit
    document.getElementById('taskQuickForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ Saving...'; }

      const id = document.getElementById('tqmId').value;
      const data = {
        title: document.getElementById('tqmTaskTitle').value.trim(),
        category: document.getElementById('tqmCategory').value,
        priority: document.getElementById('tqmPriority').value,
        scheduled_time: document.getElementById('tqmTime').value,
        due_date: document.getElementById('tqmDate').value || new Date().toISOString().slice(0, 10),
        estimated_time: parseInt(document.getElementById('tqmDuration').value) || 30,
        xp_reward: parseInt(document.getElementById('tqmXP').value) || 50,
        notes: document.getElementById('tqmNotes').value,
        status: 'pending',
      };

      if (id) {
        await window.LifeOSStore.update('tasks', id, data);
      } else {
        await window.LifeOSStore.insert('tasks', data);
      }

      DashboardEngine.closeTaskModal();
      await DashboardEngine.renderCurrentFocusCenterpiece();
      await DashboardEngine.renderTodayTimeline();
      await DashboardEngine.renderFullCalendar();
      await DashboardEngine.renderAiRecommendation();

      if (DashboardEngine.selectedDayPlannerDate) {
        await DashboardEngine.refreshDayDetail(DashboardEngine.selectedDayPlannerDate);
      }

      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '💾 Save Task'; }
    });

    // Reminder form submit
    document.getElementById('reminderQuickForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const date = document.getElementById('rqmDate').value;
      const time = document.getElementById('rqmTime').value;
      await window.LifeOSStore.insert('reminders', {
        title: document.getElementById('rqmTitle').value.trim(),
        trigger_at: `${date}T${time}`,
        priority: document.getElementById('rqmPriority').value,
        status: 'active',
      });
      DashboardEngine.closeReminderModal();
      await DashboardEngine.renderUpcomingReminder();
      await DashboardEngine.renderFullCalendar();
      if (DashboardEngine.selectedDayPlannerDate) {
        await DashboardEngine.refreshDayDetail(DashboardEngine.selectedDayPlannerDate);
      }
    });

    // Journal form submit
    document.getElementById('journalQuickForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await window.LifeOSStore.insert('journal', {
        date: document.getElementById('jqmDate').value,
        mood: document.getElementById('jqmMood').value,
        content: document.getElementById('jqmContent').value.trim(),
      });
      DashboardEngine.closeJournalModal();
      await DashboardEngine.renderFullCalendar();
      if (DashboardEngine.selectedDayPlannerDate) {
        await DashboardEngine.refreshDayDetail(DashboardEngine.selectedDayPlannerDate);
      }
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        DashboardEngine.openTaskModal(null);
      }
      if (e.key === 'Escape') {
        DashboardEngine.closeTaskModal();
        DashboardEngine.closeReminderModal();
        DashboardEngine.closeJournalModal();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  DashboardEngine.init();
});
