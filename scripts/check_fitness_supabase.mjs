import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      let key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1).trim();
      }
      envVars[key] = val;
    }
  }
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkFitness() {
  const { data, error } = await supabase.from('fitness_exercises').select('*').limit(1);
  console.log('Fitness exercises select test:', { data, error });

  const { data: setsData, error: setsErr } = await supabase.from('fitness_sets').select('*').limit(1);
  console.log('Fitness sets select test:', { setsData, setsErr });

  const { data: logsData, error: logsErr } = await supabase.from('fitness_logs').select('*').limit(1);
  console.log('Fitness logs select test:', { logsData, logsErr });
}

checkFitness().catch(console.error);
