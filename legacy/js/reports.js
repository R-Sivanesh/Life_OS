// Life OS Reports Engine – Real Data Only

class ReportsEngine {
  static async init() {
    if (!window.AuthManager || !window.AuthManager.requireAuth()) return;

    const tasks = await window.LifeOSStore.select('tasks');
    const focusSessions = await window.LifeOSStore.select('focus_sessions');
    const xpRecords = await window.LifeOSStore.select('xp');
    const journalEntries = await window.LifeOSStore.select('journal');

    const todayStr = new Date().toISOString().slice(0, 10);

    // Daily completion
    const todayTasks = tasks.filter(t => t.due_date === todayStr);
    const todayCompleted = todayTasks.filter(t => t.status === 'completed');
    const dailyRate = todayTasks.length > 0
      ? Math.round((todayCompleted.length / todayTasks.length) * 100)
      : 0;

    // Weekly completion (last 7 days)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekTasks = tasks.filter(t => t.due_date && t.due_date >= weekStartStr && t.due_date <= todayStr);
    const weekCompleted = weekTasks.filter(t => t.status === 'completed');
    const weeklyRate = weekTasks.length > 0
      ? Math.round((weekCompleted.length / weekTasks.length) * 100)
      : 0;

    // Monthly completion (this calendar month)
    const monthStart = todayStr.slice(0, 7) + '-01';
    const monthTasks = tasks.filter(t => t.due_date && t.due_date >= monthStart && t.due_date <= todayStr);
    const monthCompleted = monthTasks.filter(t => t.status === 'completed');
    const monthlyRate = monthTasks.length > 0
      ? Math.round((monthCompleted.length / monthTasks.length) * 100)
      : 0;

    // Overall rate
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const completedCount = completedTasks.length;
    const rate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    // Focus hours (real)
    const totalXp = xpRecords.reduce((acc, x) => acc + (x.amount || 0), 0);
    const focusMinutes = focusSessions.reduce((acc, f) => acc + (f.duration_minutes || 25), 0);
    const focusHours = (focusMinutes / 60).toFixed(1);

    // Study hours from learning category tasks
    const studyTasks = completedTasks.filter(t => (t.category || '').toLowerCase() === 'learning');
    const studyMins = studyTasks.reduce((acc, t) => acc + (t.actual_time || t.estimated_time || 30), 0);
    const studyHours = (studyMins / 60).toFixed(1);

    // Exercise sessions (completed tasks with exercise/workout in title or health category)
    const exerciseTasks = completedTasks.filter(t =>
      (t.title || '').toLowerCase().includes('exercise') ||
      (t.title || '').toLowerCase().includes('workout') ||
      (t.title || '').toLowerCase().includes('gym') ||
      (t.category || '').toLowerCase() === 'health'
    );
    const exerciseCount = exerciseTasks.length;

    // Routine completion rate
    const routineTasks = tasks.filter(t => t.category === 'Routine');
    const habitCompRate = routineTasks.length > 0
      ? Math.round((routineTasks.filter(t => t.status === 'completed').length / routineTasks.length) * 100)
      : 0;

    // Journal consistency — unique dates with entries this month
    const journalDatesThisMonth = new Set(
      journalEntries.filter(j => j.date && j.date >= monthStart && j.date <= todayStr).map(j => j.date)
    );
    const daysInCurrentMonth = new Date().getDate(); // days elapsed in current month
    const journalRate = daysInCurrentMonth > 0
      ? Math.round((journalDatesThisMonth.size / daysInCurrentMonth) * 100)
      : 0;

    // Streak calculation
    const stats = window.AuthManager ? await window.AuthManager.getUserStats() : { streak: 0, levelNum: 1 };

    // No data state
    const hasData = totalTasks > 0 || focusSessions.length > 0;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    if (!hasData) {
      ['repDailyComp', 'repWeeklyComp', 'repMonthlyComp', 'repFocusHours',
        'repStudyHours', 'repExercise', 'repSleep', 'repTotalXP', 'repHabitComp',
        'repCompletionRate', 'repJournalRate', 'repStreak'].forEach(id => set(id, '—'));

      document.getElementById('chartContainer1')?.classList.add('hidden');
      document.getElementById('chartContainer2')?.classList.add('hidden');
      document.getElementById('noDataBanner1')?.classList.remove('hidden');
      document.getElementById('noDataBanner2')?.classList.remove('hidden');
    } else {
      set('repDailyComp', dailyRate + '%');
      set('repWeeklyComp', weeklyRate + '%');
      set('repMonthlyComp', monthlyRate + '%');
      set('repFocusHours', focusHours + ' hrs');
      set('repStudyHours', studyHours + ' hrs');
      set('repExercise', exerciseCount + ' sessions');
      set('repSleep', journalEntries.length > 0 ? journalRate + '% consistency' : 'No data');
      set('repTotalXP', totalXp + ' XP');
      set('repHabitComp', habitCompRate + '%');
      set('repCompletionRate', rate + '%');
      set('repJournalRate', journalRate + '%');
      set('repStreak', (stats.streak || 0) + ' days');

      document.getElementById('chartContainer1')?.classList.remove('hidden');
      document.getElementById('chartContainer2')?.classList.remove('hidden');
      document.getElementById('noDataBanner1')?.classList.add('hidden');
      document.getElementById('noDataBanner2')?.classList.add('hidden');

      this.renderCharts(completedCount, totalTasks - completedCount, focusSessions.length, {
        daily: dailyRate,
        weekly: weeklyRate,
        monthly: monthlyRate
      });
    }
  }

  static renderCharts(completedCount, pendingCount, focusCount, rates) {
    const ctx1 = document.getElementById('scoreChart');
    if (ctx1 && typeof Chart !== 'undefined') {
      // Destroy previous chart instance if any
      if (ctx1._chartInstance) ctx1._chartInstance.destroy();
      const chart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: ['Completed Tasks', 'Pending Tasks'],
          datasets: [{
            data: [completedCount, pendingCount],
            backgroundColor: ['#10b981', '#8b5cf6'],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          cutout: '72%',
          plugins: {
            legend: { labels: { color: '#e8ecff', font: { family: 'Plus Jakarta Sans', weight: '600' } } }
          }
        }
      });
      ctx1._chartInstance = chart;
    }

    const ctx2 = document.getElementById('activityChart');
    if (ctx2 && typeof Chart !== 'undefined') {
      if (ctx2._chartInstance) ctx2._chartInstance.destroy();
      const chart = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: ['Daily %', 'Weekly %', 'Monthly %', 'Focus Sessions'],
          datasets: [{
            label: 'Stats',
            data: [rates.daily, rates.weekly, rates.monthly, focusCount],
            backgroundColor: ['#8b5cf6', '#3b82f6', '#06b6d4', '#f59e0b'],
            borderRadius: 10,
            borderSkipped: false,
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: '#e8ecff', font: { family: 'Plus Jakarta Sans', weight: '600' } } }
          },
          scales: {
            x: { ticks: { color: '#9aa3ff' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#9aa3ff' }, grid: { color: 'rgba(255,255,255,0.05)' }, max: 100 }
          }
        }
      });
      ctx2._chartInstance = chart;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ReportsEngine.init();
});
