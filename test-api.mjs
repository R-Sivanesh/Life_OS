const supabaseUrl = 'https://yugeyuvjiaqebhfnnfbx.supabase.co/rest/v1/tasks?limit=1';
const supabaseKey = 'sb_publishable_990S9IjpdDtm5QbI3ao0cQ_t3AhjdqL';

fetch(supabaseUrl, {
  headers: {
    'apikey': supabaseKey,
    'Authorization': 'Bearer ' + supabaseKey
  }
}).then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));
