import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const [key, value] of Object.entries(out)) {
    if (value instanceof Date) {
      // If it's a date-only column (like date in tasks, reminders, journal_entries)
      // or check if key is 'date'
      if (key === 'date') {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        out[key] = `${year}-${month}-${day}`;
      } else {
        out[key] = value.toISOString();
      }
    }
  }
  return out;
}

async function test() {
  const users = await sql`SELECT id FROM public.users LIMIT 1`;
  if (users.length > 0) {
    const uid = users[0].id;
    // Insert journal entry
    const inserted = await sql`
      INSERT INTO public.journal_entries (user_id, date, content)
      VALUES (${uid}, '2026-09-06', 'Testing normalized date')
      RETURNING *
    `;

    console.log('Raw inserted date:', inserted[0].date);
    const normalizedInserted = normalizeRow(inserted[0]);
    console.log('Normalized inserted date:', normalizedInserted.date);

    // Query back
    const queried = await sql`
      SELECT * FROM public.journal_entries 
      WHERE user_id = ${uid} AND date = '2026-09-06'
    `;
    console.log('Queried count:', queried.length);
    const normalizedQueried = queried.map(normalizeRow);
    console.log('Normalized queried row:', normalizedQueried[0]);

    // Clean up
    await sql`DELETE FROM public.journal_entries WHERE id = ${inserted[0].id}`;
  }
}

test().catch(console.error);
