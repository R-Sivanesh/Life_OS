import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yugeyuvjiaqebhfnnfbx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_990S9IjpdDtm5QbI3ao0cQ_t3AhjdqL';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanupDuplicates() {
  console.log('Fetching tasks...');
  
  // Fetch all tasks
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*');

  if (error) {
    console.error('Error fetching tasks:', error);
    return;
  }

  const recurringTasks = tasks.filter(t => t.recurring);
  console.log(`Found ${tasks.length} total tasks.`);
  console.log(`Found ${recurringTasks.length} recurring tasks.`);

  // Group by date, recurring, user_id
  const groups = {};
  for (const task of recurringTasks) {
    if (!task.date || !task.recurring || !task.user_id) continue;
    
    const key = `${task.date}_${task.recurring}_${task.user_id}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(task);
  }

  const idsToDelete = [];

  for (const [key, group] of Object.entries(groups)) {
    if (group.length > 1) {
      console.log(`Found ${group.length} duplicates for ${key}`);
      
      // Sort: completed first, then oldest created_at
      group.sort((a, b) => {
        if (a.completed && !b.completed) return -1;
        if (!a.completed && b.completed) return 1;
        
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateA - dateB;
      });

      // Keep the first one, delete the rest
      for (let i = 1; i < group.length; i++) {
        idsToDelete.push(group[i].id);
      }
    }
  }

  if (idsToDelete.length > 0) {
    console.log(`Deleting ${idsToDelete.length} duplicate tasks...`);
    
    // Supabase allows deleting in batches with .in()
    // We'll do it in chunks of 100 just to be safe
    for (let i = 0; i < idsToDelete.length; i += 100) {
      const chunk = idsToDelete.slice(i, i + 100);
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .in('id', chunk);
        
      if (deleteError) {
        console.error('Error deleting chunk:', deleteError);
      } else {
        console.log(`Deleted chunk of ${chunk.length} tasks.`);
      }
    }
    console.log('Cleanup complete!');
  } else {
    console.log('No duplicates found to clean up.');
  }
}

cleanupDuplicates().catch(console.error);
