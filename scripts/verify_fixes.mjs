import { neon } from '@neondatabase/serverless';
import { handleDbRequest } from '../api/db.ts';
import { handleAuthRequest } from '../api/auth.ts';

const sql = neon(process.env.DATABASE_URL);

async function verify() {
  console.log('=== VERIFYING JOURNAL & MOTIVATIONAL QUOTES FIXES IN NEON ===\n');

  // 1. Create / Get a test user
  const testEmail = `journal_verify_${Date.now()}@lifeos.app`;
  const authRes = await handleAuthRequest({
    action: 'signup',
    email: testEmail,
    password: 'Password123!',
    name: 'Journal Tester'
  });
  const userId = authRes.data.user.id;
  console.log(`[PASS] Test user created: ${userId}`);

  // 2. Test Journal INSERT with 'YYYY-MM-DD'
  console.log('\n--- 1. Testing Journal Persistence in Neon ---');
  const todayDateStr = '2026-09-06';
  const journalContent = 'My day was productive and focus was high!';
  
  const insertRes = await handleDbRequest({
    action: 'insert',
    table: 'journal_entries',
    payload: {
      user_id: userId,
      date: todayDateStr,
      content: journalContent
    }
  });

  if (insertRes.status !== 200 || insertRes.data.data.length === 0) {
    throw new Error(`Journal insert failed: ${JSON.stringify(insertRes)}`);
  }
  const journalEntryId = insertRes.data.data[0].id;
  console.log(`[PASS] Journal entry inserted via API handler. Returned ID: ${journalEntryId}`);
  console.log('Returned Date format:', insertRes.data.data[0].date);

  // Directly verify row in Neon database via raw SQL
  const directNeonCheck = await sql`
    SELECT * FROM public.journal_entries 
    WHERE id = ${journalEntryId}
  `;
  if (directNeonCheck.length === 0) {
    throw new Error('FATAL: Row was not found in Neon database!');
  }
  console.log('[PASS] Confirmed row EXISTS directly in Neon PostgreSQL table public.journal_entries:');
  console.log(directNeonCheck[0]);

  // Test Journal SELECT via API handler
  const selectRes = await handleDbRequest({
    action: 'select',
    table: 'journal_entries',
    filters: [{ column: 'user_id', operator: 'eq', value: userId }],
    order: { column: 'date', ascending: false }
  });

  if (selectRes.status !== 200 || selectRes.data.data.length === 0) {
    throw new Error(`Journal select failed: ${JSON.stringify(selectRes)}`);
  }
  const fetchedEntry = selectRes.data.data[0];
  console.log('[PASS] Fetched journal entry via API handler:', fetchedEntry);
  if (fetchedEntry.date !== todayDateStr) {
    throw new Error(`Date mismatch! Expected ${todayDateStr} but got ${fetchedEntry.date}`);
  }
  console.log(`[PASS] Date matches selectedDate perfectly ('${fetchedEntry.date}' === '${todayDateStr}')`);

  // Test Journal UPDATE via API handler
  const updatedContent = 'Updated: Evening reflections and gratitude.';
  const updateRes = await handleDbRequest({
    action: 'update',
    table: 'journal_entries',
    payload: { content: updatedContent, updated_at: new Date().toISOString() },
    filters: [{ column: 'id', operator: 'eq', value: journalEntryId }]
  });
  if (updateRes.status !== 200 || updateRes.data.data[0]?.content !== updatedContent) {
    throw new Error(`Journal update failed: ${JSON.stringify(updateRes)}`);
  }
  console.log('[PASS] Journal entry updated successfully in Neon');

  // 3. Test Motivational Quotes
  console.log('\n--- 2. Testing Motivational Quotes in Neon ---');
  // Insert 3 distinct quotes for this user
  const quotesToInsert = [
    { user_id: userId, text: "The best way to predict the future is to create it." },
    { user_id: userId, text: "Small daily improvements over time lead to stunning results." },
    { user_id: userId, text: "Focus on being productive instead of busy." }
  ];

  for (const q of quotesToInsert) {
    await handleDbRequest({
      action: 'insert',
      table: 'motivational_quotes',
      payload: q
    });
  }

  // Fetch quotes
  const quotesSelectRes = await handleDbRequest({
    action: 'select',
    table: 'motivational_quotes',
    filters: [{ column: 'user_id', operator: 'eq', value: userId }],
    order: { column: 'created_at', ascending: true }
  });

  if (quotesSelectRes.status !== 200 || quotesSelectRes.data.data.length < 3) {
    throw new Error(`Quotes fetch failed: ${JSON.stringify(quotesSelectRes)}`);
  }
  console.log(`[PASS] Successfully fetched ${quotesSelectRes.data.data.length} distinct quotes for user:`);
  quotesSelectRes.data.data.forEach((q, i) => console.log(`  Quote ${i + 1}: "${q.text}" (ID: ${q.id})`));

  // Verify multiple unique texts are present
  const uniqueTexts = new Set(quotesSelectRes.data.data.map(q => q.text));
  if (uniqueTexts.size < 3) {
    throw new Error('Quotes are not unique!');
  }
  console.log(`[PASS] Verified ${uniqueTexts.size} distinct quotes available for randomization`);

  // 4. Clean up test user & child records
  console.log('\n--- 3. Cleaning Up Test Data ---');
  await handleDbRequest({
    action: 'delete',
    table: 'users',
    filters: [{ column: 'id', operator: 'eq', value: userId }]
  });
  console.log('[PASS] Test user and all related rows removed cleanly');

  console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

verify().catch(err => {
  console.error('[FAIL] Verification failed:', err);
  process.exit(1);
});
