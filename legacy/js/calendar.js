// Life OS Interactive Calendar & Day Planner Engine

class CalendarManager {
  static currentDate = new Date();
  static currentView = 'month';
  static selectedDateStr = new Date().toISOString().slice(0, 10);

  static async init() {
    if (!window.AuthManager || !window.AuthManager.requireAuth()) return;

    const urlParams = new URLSearchParams(window.location.search);
    const paramDate = urlParams.get('date');
    if (paramDate) {
      this.selectedDateStr = paramDate;
      this.currentDate = new Date(paramDate + 'T00:00:00');
    }

    this.renderHeader();
    this.renderCalendar();
    this.renderAgenda();
    this.bindEvents();

    if (paramDate) {
      this.openDayPlanner(paramDate);
    }
  }

  static renderHeader() {
    const titleEl = document.getElementById('calendarMonthTitle');
    if (!titleEl) return;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    titleEl.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  static async renderCalendar() {
    const grid = document.getElementById('fullCalendarGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const tasks = await window.LifeOSStore.select('tasks');
    const reminders = await window.LifeOSStore.select('reminders');
    const events = await window.LifeOSStore.select('calendar_events');
    const journalEntries = await window.LifeOSStore.select('journal');

    if (this.currentView === 'day') {
      const dateKey = this.currentDate.toISOString().slice(0, 10);
      grid.style.gridTemplateColumns = '1fr';
      const dayTasks = tasks.filter(t => t.due_date === dateKey);
      const dayEvents = events.filter(e => e.start_time && e.start_time.startsWith(dateKey));

      grid.innerHTML = `
        <div class="glass-card" style="padding:24px;">
          <h3 style="margin:0 0 16px;">Day View - ${dateKey}</h3>
          <div style="display:flex; gap:12px; margin-bottom:16px;">
            <button onclick="CalendarManager.openDayPlanner('${dateKey}')" class="btn-primary" style="width:auto; padding:8px 18px;">Open Full Day Planner</button>
          </div>
          <div style="display:grid; gap:10px;">
            ${dayTasks.map(t => `<div style="background:rgba(255,255,255,0.06); padding:12px; border-radius:12px; display:flex; justify-content:space-between;"><span>✅ <strong>${t.title}</strong> (${t.scheduled_time || '09:00'})</span><span class="reminder-priority ${(t.priority||'medium').toLowerCase()}">${(t.priority||'medium').toUpperCase()}</span></div>`).join('')}
            ${dayEvents.map(e => `<div style="background:rgba(16,185,129,0.15); color:#10b981; padding:12px; border-radius:12px;">📅 <strong>${e.title}</strong></div>`).join('')}
            ${dayTasks.length === 0 && dayEvents.length === 0 ? '<p style="color:#9aa3ff;">No items scheduled for this day.</p>' : ''}
          </div>
        </div>
      `;
      return;
    }

    if (this.currentView === 'week') {
      grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
      const startOfWeek = new Date(this.currentDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        const dateKey = d.toISOString().slice(0, 10);
        const dayTasks = tasks.filter(t => t.due_date === dateKey);

        const cell = document.createElement('div');
        cell.className = 'glass-card cal-day-cell';
        cell.style.padding = '12px';
        cell.style.minHeight = '180px';
        cell.style.cursor = 'pointer';
        cell.style.borderRadius = '16px';
        cell.innerHTML = `
          <div style="font-weight:700; margin-bottom:8px; font-size:0.9rem; color:#8b5cf6;">
            ${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${dayTasks.map(t => `<div style="font-size:0.75rem; background:rgba(59,130,246,0.2); color:#3b82f6; padding:4px 6px; border-radius:6px;">✅ ${t.title}</div>`).join('')}
          </div>
        `;
        cell.onclick = () => this.openDayPlanner(dateKey);
        grid.appendChild(cell);
      }
      return;
    }

    if (this.currentView === 'timeline' || this.currentView === 'agenda') {
      grid.style.gridTemplateColumns = '1fr';
      const allItems = [
        ...tasks.map(t => ({ title: t.title, time: t.scheduled_time || '09:00', date: t.due_date, type: 'Task', color: '#3b82f6' })),
        ...events.map(e => ({ title: e.title, time: e.start_time ? e.start_time.slice(11,16) : '10:00', date: e.start_time ? e.start_time.slice(0,10) : 'Today', type: 'Event', color: '#10b981' })),
        ...reminders.map(r => ({ title: r.title, time: r.trigger_at ? r.trigger_at.slice(11,16) : '12:00', date: r.trigger_at ? r.trigger_at.slice(0,10) : 'Today', type: 'Reminder', color: '#f59e0b' }))
      ];

      allItems.sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));

      grid.innerHTML = `
        <div class="glass-card" style="padding:24px;">
          <h3 style="margin:0 0 16px;">${this.currentView === 'timeline' ? 'Interactive Schedule Timeline' : 'Chronological Agenda'}</h3>
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${allItems.map(item => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:14px; background:rgba(255,255,255,0.04); border-radius:12px; border-left:4px solid ${item.color};">
                <div style="display:flex; align-items:center; gap:12px;">
                  <strong style="color:${item.color}; font-size:0.9rem;">${item.time}</strong>
                  <span>${item.title}</span>
                </div>
                <span style="font-size:0.8rem; color:#9aa3ff;">${item.type} • ${item.date}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      return;
    }

    // Default Month View
    grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i += 1) {
      const empty = document.createElement('div');
      empty.className = 'empty-day';
      empty.style.minHeight = '95px';
      grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = tasks.filter(t => t.due_date === dateKey);
      const dayReminders = reminders.filter(r => r.trigger_at && r.trigger_at.startsWith(dateKey));
      const dayEvents = events.filter(e => e.start_time && e.start_time.startsWith(dateKey));
      const dayJournal = journalEntries.filter(j => j.date === dateKey);

      const cell = document.createElement('div');
      cell.className = 'glass-card cal-day-cell';
      cell.style.padding = '12px';
      cell.style.minHeight = '100px';
      cell.style.cursor = 'pointer';
      cell.style.borderRadius = '16px';
      cell.style.position = 'relative';

      const isToday = dateKey === new Date().toISOString().slice(0, 10);
      if (isToday) {
        cell.style.border = '2px solid #8b5cf6';
        cell.style.background = 'rgba(139,92,246,0.15)';
      }

      cell.ondragover = (e) => e.preventDefault();
      cell.ondrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const raw = e.dataTransfer.getData('application/json');
          if (raw) {
            const { id, table } = JSON.parse(raw);
            if (table === 'tasks') {
              await window.LifeOSStore.update('tasks', id, { due_date: dateKey });
            } else if (table === 'calendar_events') {
              await window.LifeOSStore.update('calendar_events', id, { start_time: `${dateKey}T10:00:00` });
            } else if (table === 'reminders') {
              await window.LifeOSStore.update('reminders', id, { trigger_at: `${dateKey}T10:00` });
            }
            CalendarManager.renderCalendar();
          }
        } catch (err) {}
      };

      cell.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-weight:700; margin-bottom:6px;">
          <span>${day}</span>
          ${isToday ? '<span style="font-size:0.7rem; color:#8b5cf6;">TODAY</span>' : ''}
        </div>
        <div style="display:flex; flex-direction:column; gap:4px;">
          ${dayTasks.slice(0, 2).map(t => `<div draggable="true" ondragstart="event.dataTransfer.setData('application/json', JSON.stringify({id:'${t.id}', table:'tasks'}))" style="font-size:0.75rem; background:rgba(59,130,246,0.2); color:#3b82f6; padding:2px 6px; border-radius:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:grab;">✅ ${t.title}</div>`).join('')}
          ${dayEvents.slice(0, 1).map(e => `<div draggable="true" ondragstart="event.dataTransfer.setData('application/json', JSON.stringify({id:'${e.id}', table:'calendar_events'}))" style="font-size:0.75rem; background:rgba(16,185,129,0.2); color:#10b981; padding:2px 6px; border-radius:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:grab;">📅 ${e.title}</div>`).join('')}
          ${dayReminders.slice(0, 1).map(r => `<div draggable="true" ondragstart="event.dataTransfer.setData('application/json', JSON.stringify({id:'${r.id}', table:'reminders'}))" style="font-size:0.75rem; background:rgba(245,158,11,0.2); color:#f59e0b; padding:2px 6px; border-radius:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:grab;">🔔 ${r.title}</div>`).join('')}
          ${dayJournal.length > 0 ? `<div style="font-size:0.75rem; background:rgba(139,92,246,0.2); color:#8b5cf6; padding:2px 6px; border-radius:6px;">📖 Journal Logged</div>` : ''}
          ${(dayTasks.length + dayEvents.length + dayReminders.length > 3) ? `<span style="font-size:0.7rem; color:#9aa3ff;">+${dayTasks.length + dayEvents.length + dayReminders.length - 3} more</span>` : ''}
        </div>
      `;

      cell.onclick = () => this.openDayPlanner(dateKey);
      grid.appendChild(cell);
    }
  }

  static async openDayPlanner(dateKey) {
    this.selectedDateStr = dateKey;
    const backdrop = document.getElementById('dayPlannerBackdrop');
    const modal = document.getElementById('dayPlannerModal');
    const dateTitle = document.getElementById('plannerDateTitle');

    if (dateTitle) dateTitle.textContent = `Day Planner - ${dateKey}`;

    const tasks = await window.LifeOSStore.select('tasks', { due_date: dateKey });
    const reminders = await window.LifeOSStore.select('reminders');
    const dayReminders = reminders.filter(r => r.trigger_at && r.trigger_at.startsWith(dateKey));
    const events = await window.LifeOSStore.select('calendar_events');
    const dayEvents = events.filter(e => e.start_time && e.start_time.startsWith(dateKey));
    const journalEntries = await window.LifeOSStore.select('journal', { date: dateKey });
    const notes = await window.LifeOSStore.select('notes');
    const dayNotes = notes.filter(n => n.updated_at && n.updated_at.startsWith(dateKey));

    const totalCount = tasks.length;
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const score = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : (dayEvents.length > 0 ? 100 : 0);
    const xpEarned = completedCount * 50;

    const weatherAdviceEl = document.getElementById('plannerWeatherAdvice');
    if (weatherAdviceEl) {
      weatherAdviceEl.textContent = `Completion Rate: ${score}% (${completedCount}/${totalCount} tasks) • Daily XP: +${xpEarned} XP`;
    }

    const tasksContainer = document.getElementById('plannerTasksList');
    if (tasksContainer) {
      if (tasks.length === 0 && dayReminders.length === 0) {
        tasksContainer.innerHTML = '<p style="color:#9aa3ff; font-size:0.9rem;">No tasks or reminders scheduled for this date.</p>';
      } else {
        tasksContainer.innerHTML = [
          ...tasks.map(t => `<div style="background:rgba(255,255,255,0.06); padding:10px; border-radius:10px; font-size:0.9rem; display:flex; justify-content:space-between; align-items:center;"><span>✅ <strong>${t.title}</strong></span><span class="reminder-priority ${(t.priority||'medium').toLowerCase()}">${(t.priority||'medium').toUpperCase()}</span></div>`),
          ...dayReminders.map(r => `<div style="background:rgba(245,158,11,0.15); color:#f59e0b; padding:10px; border-radius:10px; font-size:0.9rem;">🔔 <strong>${r.title}</strong> - ${r.trigger_at.slice(11,16)}</div>`)
        ].join('');
      }
    }

    const eventsContainer = document.getElementById('plannerEventsList');
    if (eventsContainer) {
      if (dayEvents.length === 0 && journalEntries.length === 0 && dayNotes.length === 0) {
        eventsContainer.innerHTML = '<p style="color:#9aa3ff; font-size:0.9rem;">No events, journal entries, or notes logged for this date.</p>';
      } else {
        eventsContainer.innerHTML = [
          ...dayEvents.map(e => `
            <div style="background:rgba(16,185,129,0.15); color:#10b981; padding:10px; border-radius:10px; font-size:0.9rem;">
              📅 <strong>${e.title}</strong> (${e.start_time ? e.start_time.slice(11,16) : 'All Day'})
            </div>
          `),
          ...journalEntries.map(j => `
            <div style="background:rgba(139,92,246,0.15); color:#8b5cf6; padding:10px; border-radius:10px; font-size:0.9rem;">
              📖 <strong>Journal: ${j.mood || '😊'}</strong> ${j.content.slice(0,60)}...
            </div>
          `),
          ...dayNotes.map(n => `
            <div style="background:rgba(255,255,255,0.08); color:#e8ecff; padding:10px; border-radius:10px; font-size:0.9rem;">
              📝 <strong>Note: ${n.title}</strong>
            </div>
          `)
        ].join('');
      }
    }

    if (backdrop && modal) {
      backdrop.classList.remove('hidden');
      modal.classList.remove('hidden');
    }
  }

  static async renderAgenda() {
    const agendaContainer = document.getElementById('calendarAgendaList');
    if (!agendaContainer) return;

    const tasks = await window.LifeOSStore.select('tasks');
    const events = await window.LifeOSStore.select('calendar_events');

    const combined = [
      ...tasks.map(t => ({ title: t.title, date: t.due_date || 'Today', type: 'Task', color: '#3b82f6' })),
      ...events.map(e => ({ title: e.title, date: e.start_time ? e.start_time.slice(0, 10) : 'Today', type: 'Event', color: '#10b981' }))
    ].slice(0, 8);

    agendaContainer.innerHTML = combined.map(item => `
      <div class="journey-step" style="display:flex; justify-content:space-between; padding:14px 18px; background:rgba(255,255,255,0.04); border-radius:14px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="width:10px; height:10px; border-radius:50%; background:${item.color}; display:inline-block;"></span>
          <strong>${item.title}</strong>
        </div>
        <div style="color:#9aa3ff; font-size:0.85rem;">${item.type} • ${item.date}</div>
      </div>
    `).join('');
  }

  static bindEvents() {
    const prevBtn = document.getElementById('prevMonthBtn');
    const nextBtn = document.getElementById('nextMonthBtn');
    const todayBtn = document.getElementById('todayCalBtn');
    const backdrop = document.getElementById('dayPlannerBackdrop');
    const modal = document.getElementById('dayPlannerModal');
    const closeBtn = document.getElementById('closePlannerModal');

    document.querySelectorAll('.cal-view-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.cal-view-btn').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = '#c7d1ff';
        });
        btn.classList.add('active');
        btn.style.background = 'rgba(134,82,255,0.3)';
        btn.style.color = '#fff';
        CalendarManager.currentView = btn.dataset.view;
        CalendarManager.renderCalendar();
      };
    });

    if (prevBtn) prevBtn.onclick = () => {
      if (this.currentView === 'week') {
        this.currentDate.setDate(this.currentDate.getDate() - 7);
      } else {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      }
      this.renderHeader();
      this.renderCalendar();
    };

    if (nextBtn) nextBtn.onclick = () => {
      if (this.currentView === 'week') {
        this.currentDate.setDate(this.currentDate.getDate() + 7);
      } else {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      }
      this.renderHeader();
      this.renderCalendar();
    };

    if (todayBtn) todayBtn.onclick = () => {
      this.currentDate = new Date();
      this.renderHeader();
      this.renderCalendar();
    };

    if (closeBtn) closeBtn.onclick = () => {
      backdrop.classList.add('hidden');
      modal.classList.add('hidden');
    };

    // Quick Action button handlers inside Day Planner
    // Add Task via modal
    const addTaskBtn = document.getElementById('addPlannerTask');
    if (addTaskBtn) addTaskBtn.onclick = () => CalendarManager.openCalModal('task');

    const addReminderBtn = document.getElementById('addPlannerReminder');
    if (addReminderBtn) addReminderBtn.onclick = () => CalendarManager.openCalModal('reminder');

    const addEventBtn = document.getElementById('addPlannerEvent');
    if (addEventBtn) addEventBtn.onclick = () => CalendarManager.openCalModal('event');

    const addNoteBtn = document.getElementById('addPlannerNote');
    if (addNoteBtn) addNoteBtn.onclick = () => CalendarManager.openCalModal('journal');

    // Modal close buttons
    document.getElementById('closeCalTaskModal')?.addEventListener('click', () => CalendarManager.closeCalModal('task'));
    document.getElementById('closeCalRemModal')?.addEventListener('click', () => CalendarManager.closeCalModal('reminder'));
    document.getElementById('closeCalEventModal')?.addEventListener('click', () => CalendarManager.closeCalModal('event'));
    document.getElementById('closeCalJournalModal')?.addEventListener('click', () => CalendarManager.closeCalModal('journal'));

    // Modal form submissions
    document.getElementById('calTaskForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dateKey = document.getElementById('calTaskDate').value || CalendarManager.selectedDateStr;
      await window.LifeOSStore.insert('tasks', {
        title: document.getElementById('calTaskTitle').value.trim(),
        priority: document.getElementById('calTaskPriority').value,
        category: document.getElementById('calTaskCategory').value,
        scheduled_time: document.getElementById('calTaskTime').value,
        due_date: dateKey,
        status: 'pending',
        estimated_time: 30,
        xp_reward: 50,
      });
      CalendarManager.closeCalModal('task');
      CalendarManager.openDayPlanner(CalendarManager.selectedDateStr);
      CalendarManager.renderCalendar();
    });

    document.getElementById('calRemForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dateKey = document.getElementById('calRemDate').value || CalendarManager.selectedDateStr;
      const time = document.getElementById('calRemTime').value;
      await window.LifeOSStore.insert('reminders', {
        title: document.getElementById('calRemTitle').value.trim(),
        trigger_at: `${dateKey}T${time}`,
        priority: document.getElementById('calRemPriority').value,
        status: 'active',
      });
      CalendarManager.closeCalModal('reminder');
      CalendarManager.openDayPlanner(CalendarManager.selectedDateStr);
      CalendarManager.renderCalendar();
    });

    document.getElementById('calEventForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dateKey = document.getElementById('calEventDate').value || CalendarManager.selectedDateStr;
      const start = document.getElementById('calEventStart').value;
      const end = document.getElementById('calEventEnd').value;
      await window.LifeOSStore.insert('calendar_events', {
        title: document.getElementById('calEventTitle').value.trim(),
        start_time: `${dateKey}T${start}:00`,
        end_time: `${dateKey}T${end}:00`,
      });
      CalendarManager.closeCalModal('event');
      CalendarManager.openDayPlanner(CalendarManager.selectedDateStr);
      CalendarManager.renderCalendar();
    });

    document.getElementById('calJournalForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dateKey = document.getElementById('calJournalDate').value || CalendarManager.selectedDateStr;
      await window.LifeOSStore.insert('journal', {
        date: dateKey,
        mood: document.getElementById('calJournalMood').value,
        content: document.getElementById('calJournalContent').value.trim(),
      });
      CalendarManager.closeCalModal('journal');
      CalendarManager.openDayPlanner(CalendarManager.selectedDateStr);
      CalendarManager.renderCalendar();
    });

    // Escape key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['task','reminder','event','journal'].forEach(t => CalendarManager.closeCalModal(t));
        const backdrop = document.getElementById('dayPlannerBackdrop');
        const modal = document.getElementById('dayPlannerModal');
        backdrop?.classList.add('hidden');
        modal?.classList.add('hidden');
      }
    });
  }

  static openCalModal(type) {
    const dateKey = CalendarManager.selectedDateStr;
    const modalMap = { task: 'calTaskBackdrop', reminder: 'calRemBackdrop', event: 'calEventBackdrop', journal: 'calJournalBackdrop' };
    const dateMap = { task: 'calTaskDate', reminder: 'calRemDate', event: 'calEventDate', journal: 'calJournalDate' };
    const dateEl = document.getElementById(dateMap[type]);
    if (dateEl) dateEl.value = dateKey;
    document.getElementById(modalMap[type])?.classList.remove('hidden');
  }

  static closeCalModal(type) {
    const modalMap = { task: 'calTaskBackdrop', reminder: 'calRemBackdrop', event: 'calEventBackdrop', journal: 'calJournalBackdrop' };
    document.getElementById(modalMap[type])?.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  CalendarManager.init();
});
