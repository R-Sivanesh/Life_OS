const { format } = require('date-fns');

const getUpcomingDates = (now) => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const simulate = () => {
  let db = [];
  
  const sync = (today) => {
    const dates = getUpcomingDates(today);
    const todayStr = format(dates[0], 'yyyy-MM-dd');
    
    // Simulate concurrent run: both fetch before either inserts
    let existingTasks1 = db.filter(t => t.date >= todayStr);
    let existingTasks2 = db.filter(t => t.date >= todayStr);
    
    const requiredDates = dates.map(d => format(d, 'yyyy-MM-dd'));
    
    const runInstance = (existingTasks) => {
        const existingDates = existingTasks.map(t => t.date);
        const tasksToInsertDates = requiredDates.filter(d => !existingDates.includes(d));
        for (const d of tasksToInsertDates) {
            db.push({ date: d });
        }
    };

    // run concurrently
    runInstance(existingTasks1);
    runInstance(existingTasks2);
  };
  
  // Let's say we start on Monday
  const startDate = new Date('2026-08-10T12:00:00Z'); // Monday
  for (let i = 0; i < 14; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      console.log(`\n--- Syncing on ${format(d, 'EEEE, yyyy-MM-dd')} ---`);
      sync(d);
      
      // count duplicates
      const counts = {};
      for (const t of db) {
          counts[t.date] = (counts[t.date] || 0) + 1;
      }
      for (const [date, count] of Object.entries(counts)) {
          if (count > 1) {
              console.log(`Duplicate found for: ${date} (${count} tasks)`);
          }
      }
  }
};

simulate();
