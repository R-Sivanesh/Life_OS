import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function cleanupDuplicates() {
  console.log('Cleaning up duplicate motivational quotes in Neon...');
  
  // Find duplicate quotes by user_id and text
  const quotes = await sql`
    SELECT id, user_id, text, created_at 
    FROM public.motivational_quotes 
    ORDER BY user_id, text, created_at ASC
  `;

  const seen = new Set();
  const duplicateIds = [];

  for (const q of quotes) {
    const key = `${q.user_id}_${q.text}`;
    if (seen.has(key)) {
      duplicateIds.push(q.id);
    } else {
      seen.add(key);
    }
  }

  if (duplicateIds.length > 0) {
    for (const id of duplicateIds) {
      await sql`DELETE FROM public.motivational_quotes WHERE id = ${id}`;
    }
    console.log(`Deleted ${duplicateIds.length} duplicate quote(s) from Neon.`);
  } else {
    console.log('No duplicate quotes found.');
  }

  const remaining = await sql`SELECT * FROM public.motivational_quotes`;
  console.log(`Remaining unique quotes in Neon: ${remaining.length}`);
  console.log(remaining);
}

cleanupDuplicates().catch(console.error);
