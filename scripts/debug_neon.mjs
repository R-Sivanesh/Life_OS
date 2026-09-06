import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function test() {
  console.log('--- Checking Motivational Quotes in Neon ---');
  const allQuotes = await sql`SELECT * FROM public.motivational_quotes`;
  console.log(`Total quotes in Neon: ${allQuotes.length}`);
  console.log('Sample quotes:', allQuotes);

  console.log('\n--- Checking Users in Neon ---');
  const allUsers = await sql`SELECT * FROM public.users`;
  console.log(`Total users in Neon: ${allUsers.length}`);
  console.log('Sample users:', allUsers);

  console.log('\n--- Checking Journal Entries in Neon ---');
  const allJournal = await sql`SELECT * FROM public.journal_entries`;
  console.log(`Total journal entries in Neon: ${allJournal.length}`);
  console.log('Sample journal entries:', allJournal);

  console.log('\n--- Testing Date / Time formatting in Neon ---');
  if (allUsers.length > 0) {
    const uid = allUsers[0].id;
    const inserted = await sql`
      INSERT INTO public.journal_entries (user_id, date, content)
      VALUES (${uid}, '2026-09-06', 'Debug test entry')
      RETURNING *
    `;
    console.log('Inserted journal row:', inserted[0]);
    console.log('Type of date:', typeof inserted[0].date, inserted[0].date);

    const queried = await sql`SELECT * FROM public.journal_entries WHERE id = ${inserted[0].id}`;
    console.log('Queried journal row:', queried[0]);
    console.log('Type of date in queried:', typeof queried[0].date, queried[0].date);

    // Clean up debug entry
    await sql`DELETE FROM public.journal_entries WHERE id = ${inserted[0].id}`;
  }
}

test().catch(console.error);
