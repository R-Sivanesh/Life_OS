import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const clean = line.replace(/\r/g, '').trim();
  const idx = clean.indexOf('=');
  if (idx > 0 && !clean.startsWith('#')) {
    const k = clean.slice(0, idx).trim();
    let v = clean.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
});

async function checkNeon() {
  const urls = [env.DATABASE_URL, env.DATABASE_URL_UNPOOLED];
  for (const url of urls) {
    if (!url) continue;
    console.log('Testing url:', url.slice(0, 40) + '...');
    try {
      const sql = neon(url);
      const res = await sql`SELECT count(*) FROM public.journal_entries`;
      console.log('Neon count:', res);
      const rows = await sql`SELECT date, content FROM public.journal_entries ORDER BY date DESC`;
      console.log('Neon rows:', rows);
    } catch (e) {
      console.log('Error:', e.message, e.status);
    }
  }
}

checkNeon().catch(console.error);
