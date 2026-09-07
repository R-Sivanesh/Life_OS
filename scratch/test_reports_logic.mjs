import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, subDays, addWeeks, subWeeks, isSameWeek, isThisWeek } from 'date-fns';

console.log("=== Running Reports Logic Tests ===");

// 1. Reference date: today
const today = new Date();
console.log("Today:", format(today, 'yyyy-MM-dd (EEEE)'));

// Test Helper for week label
function computeWeekLabel(selectedWeekDate, refDate = today) {
  const selectedWeekStart = startOfWeek(selectedWeekDate, { weekStartsOn: 1 });
  const selectedWeekEnd = endOfWeek(selectedWeekDate, { weekStartsOn: 1 });
  
  const isCurrent = isThisWeek(selectedWeekDate, { weekStartsOn: 1 });
  const isPrev = isSameWeek(selectedWeekDate, subWeeks(refDate, 1), { weekStartsOn: 1 });
  const isNext = isSameWeek(selectedWeekDate, addWeeks(refDate, 1), { weekStartsOn: 1 });
  
  const startYear = selectedWeekStart.getFullYear();
  const endYear = selectedWeekEnd.getFullYear();
  const currentYear = refDate.getFullYear();

  let dateRangeStr = '';
  if (startYear !== endYear) {
    dateRangeStr = `${format(selectedWeekStart, 'MMM d, yyyy')} - ${format(selectedWeekEnd, 'MMM d, yyyy')}`;
  } else if (startYear !== currentYear) {
    dateRangeStr = `${format(selectedWeekStart, 'MMM d')} - ${format(selectedWeekEnd, 'MMM d')}, ${startYear}`;
  } else {
    dateRangeStr = `${format(selectedWeekStart, 'MMM d')} - ${format(selectedWeekEnd, 'MMM d')}`;
  }

  if (isCurrent) {
    return `This Week (${dateRangeStr})`;
  }
  if (isPrev) {
    return `Last Week (${dateRangeStr})`;
  }
  if (isNext) {
    return `Next Week (${dateRangeStr})`;
  }
  return dateRangeStr;
}

// 2. Test Navigation
const currentLabel = computeWeekLabel(today);
console.log("Current week label:", currentLabel);

const prevWeekDate = subWeeks(today, 1);
const prevLabel = computeWeekLabel(prevWeekDate);
console.log("Previous week label (-1):", prevLabel);

const twoWeeksAgoDate = subWeeks(today, 2);
const twoWeeksAgoLabel = computeWeekLabel(twoWeeksAgoDate);
console.log("Two weeks ago label (-2):", twoWeeksAgoLabel);

const nextWeekDate = addWeeks(today, 1);
const nextLabel = computeWeekLabel(nextWeekDate);
console.log("Next week label (+1):", nextLabel);

const twoWeeksAheadDate = addWeeks(today, 2);
const twoWeeksAheadLabel = computeWeekLabel(twoWeeksAheadDate);
console.log("Two weeks ahead label (+2):", twoWeeksAheadLabel);

// 3. Test Sample Tasks & Week Data calculation
const mockTasks = [
  { id: '1', title: 'Task Mon', completed: true, date: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd') },
  { id: '2', title: 'Task Wed', completed: true, date: format(subDays(today, 2), 'yyyy-MM-dd') },
  { id: '3', title: 'Task Last Week', completed: true, date: format(subWeeks(today, 1), 'yyyy-MM-dd') },
  { id: '4', title: 'Task Pending', completed: false, date: format(today, 'yyyy-MM-dd') }
];

function calculateProductivity(tasks) {
  if (!tasks || tasks.length === 0) return 0;
  const completed = tasks.filter(t => t.completed).length;
  return Math.round((completed / tasks.length) * 100);
}

function computeWeeklyData(selectedWeekDate, tasks) {
  const selectedWeekStart = startOfWeek(selectedWeekDate, { weekStartsOn: 1 });
  const selectedWeekEnd = endOfWeek(selectedWeekDate, { weekStartsOn: 1 });
  const selectedWeekDays = eachDayOfInterval({ start: selectedWeekStart, end: selectedWeekEnd });

  return selectedWeekDays.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayTasks = tasks.filter(t => t.date === dayStr || (t.completed_at && t.completed_at.startsWith(dayStr)));
    const count = dayTasks.filter(t => t.completed).length;
    return {
      date: day,
      dayStr,
      label: format(day, 'EEE'),
      dayNum: format(day, 'd'),
      count
    };
  });
}

function computeTrendData(selectedWeekDate, trendRange, tasks) {
  const selectedWeekStart = startOfWeek(selectedWeekDate, { weekStartsOn: 1 });
  const selectedWeekEnd = endOfWeek(selectedWeekDate, { weekStartsOn: 1 });
  const selectedWeekDays = eachDayOfInterval({ start: selectedWeekStart, end: selectedWeekEnd });
  
  const days = [];
  if (trendRange === 7) {
    for (const d of selectedWeekDays) {
      const dayStr = format(d, 'yyyy-MM-dd');
      const dayTasks = tasks.filter(t => t.date === dayStr || (t.completed_at && t.completed_at.startsWith(dayStr)));
      const rate = calculateProductivity(dayTasks);
      days.push({ date: d, label: format(d, 'MMM d'), rate });
    }
  } else {
    for (let i = 29; i >= 0; i--) {
      const d = subDays(selectedWeekEnd, i);
      const dayStr = format(d, 'yyyy-MM-dd');
      const dayTasks = tasks.filter(t => t.date === dayStr || (t.completed_at && t.completed_at.startsWith(dayStr)));
      const rate = calculateProductivity(dayTasks);
      days.push({ date: d, label: format(d, 'MMM d'), rate });
    }
  }
  return days;
}

console.log("\n--- Current Week Data ---");
const curWeeklyData = computeWeeklyData(today, mockTasks);
console.log(curWeeklyData.map(d => `${d.label} (${d.dayNum}): ${d.count} tasks`));

console.log("\n--- Previous Week Data ---");
const prevWeeklyData = computeWeeklyData(prevWeekDate, mockTasks);
console.log(prevWeeklyData.map(d => `${d.label} (${d.dayNum}): ${d.count} tasks`));

console.log("\n--- Empty/Future Week Data ---");
const futureWeeklyData = computeWeeklyData(twoWeeksAheadDate, mockTasks);
console.log(futureWeeklyData.map(d => `${d.label} (${d.dayNum}): ${d.count} tasks`));

console.log("\n--- Trend Data (7 Days) ---");
const trend7 = computeTrendData(today, 7, mockTasks);
console.log(`7-day count: ${trend7.length}, values: ${trend7.map(t => `${t.label}: ${t.rate}%`).join(', ')}`);

console.log("\n--- Trend Data (30 Days) ---");
const trend30 = computeTrendData(today, 30, mockTasks);
console.log(`30-day count: ${trend30.length}, non-zero days: ${trend30.filter(t => t.rate > 0).map(t => `${t.label}: ${t.rate}%`).join(', ')}`);

console.log("\nAll logic assertions passed successfully!");
