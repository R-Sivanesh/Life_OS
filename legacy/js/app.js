const modalBackdrop = document.getElementById('modalBackdrop');
const dailyLogModal = document.getElementById('dailyLogModal');
const openLog = document.getElementById('openLog');
const closeLog = document.getElementById('closeLog');
const dailyLogForm = document.getElementById('dailyLogForm');

const clearDailyLogForm = () => {
  ['wakeTime', 'sleepTime', 'skillLearned', 'productivity', 'journalEntry'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const ex = document.getElementById('exerciseToggle');
  if (ex) ex.checked = false;
  const pa = document.getElementById('parentsToggle');
  if (pa) pa.checked = false;
};

const showModal = () => {
  clearDailyLogForm();
  if (modalBackdrop) modalBackdrop.classList.remove('hidden');
  if (dailyLogModal) dailyLogModal.classList.remove('hidden');
};

const hideModal = () => {
  if (modalBackdrop) modalBackdrop.classList.add('hidden');
  if (dailyLogModal) dailyLogModal.classList.add('hidden');
};

if (openLog) openLog.addEventListener('click', showModal);
if (closeLog) closeLog.addEventListener('click', hideModal);
if (modalBackdrop) modalBackdrop.addEventListener('click', hideModal);

if (dailyLogForm) {
  dailyLogForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const wakeTime = document.getElementById('wakeTime')?.value || '';
    const sleepTime = document.getElementById('sleepTime')?.value || '';
    const exercise = document.getElementById('exerciseToggle')?.checked || false;
    const helpedParents = document.getElementById('parentsToggle')?.checked || false;
    const skillLearned = document.getElementById('skillLearned')?.value || '';
    const productivity = document.getElementById('productivity')?.value || '0';
    const journalEntry = document.getElementById('journalEntry')?.value || '';

    const today = new Date().toISOString().slice(0, 10);
    const dailyData = {
      date: today,
      wakeTime,
      sleepTime,
      exercise,
      helpedParents,
      skillLearned,
      productivity: parseInt(productivity, 10) || 0,
      journalEntry,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('lifeOsDaily_' + today, JSON.stringify(dailyData));
    window.dispatchEvent(new CustomEvent('dailyLogSaved', { detail: dailyData }));
    hideModal();
    celebrateSave();
  });
}

window.addEventListener('openDailyLog', (event) => {
  const data = event.detail || {};
  clearDailyLogForm();
  if (data.wakeTime && document.getElementById('wakeTime')) document.getElementById('wakeTime').value = data.wakeTime;
  if (data.sleepTime && document.getElementById('sleepTime')) document.getElementById('sleepTime').value = data.sleepTime;
  if (data.exercise !== undefined && document.getElementById('exerciseToggle')) document.getElementById('exerciseToggle').checked = data.exercise;
  if (data.helpedParents !== undefined && document.getElementById('parentsToggle')) document.getElementById('parentsToggle').checked = data.helpedParents;
  if (data.skillLearned && document.getElementById('skillLearned')) document.getElementById('skillLearned').value = data.skillLearned;
  if (data.productivity !== undefined && document.getElementById('productivity')) document.getElementById('productivity').value = data.productivity;
  if (data.journalEntry && document.getElementById('journalEntry')) document.getElementById('journalEntry').value = data.journalEntry;
  if (modalBackdrop) modalBackdrop.classList.remove('hidden');
  if (dailyLogModal) dailyLogModal.classList.remove('hidden');
});

const celebrateSave = () => {
  const confetti = document.createElement('div');
  confetti.className = 'confetti-animation';
  document.body.appendChild(confetti);
  setTimeout(() => confetti.remove(), 1400);
};
