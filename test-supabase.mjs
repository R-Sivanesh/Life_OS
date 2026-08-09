import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yugeyuvjiaqebhfnnfbx.supabase.co';
const supabaseKey = 'sb_publishable_990S9IjpdDtm5QbI3ao0cQ_t3AhjdqL';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const newTask = {
    title: 'Test',
    description: '',
    date: '2026-08-09',
    start_time: '09:00',
    end_time: '10:00',
    priority: 'medium',
    category: 'General',
    estimated_minutes: 60,
    user_id: 'e4cc0fbf-a111-422f-a3ff-24958ce3e720', // wait, I don't know a valid user_id
    completed: false,
    status: 'pending'
  };

  const { data, error } = await supabase.from('tasks').insert([newTask]).select();
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
