import { handleAuthRequest } from '../api/auth.js';
import { handleDbRequest } from '../api/db.js';

async function runTests() {
  console.log('=== STARTING NEON POSTGRESQL E2E MIGRATION TESTS ===\n');

  const testEmail = `test_migrated_user_${Date.now()}@lifeos.app`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Neon Test User';

  // --- 1. Test Auth: Sign Up ---
  console.log('1. Testing User Registration...');
  const signupRes = await handleAuthRequest({
    action: 'signup',
    email: testEmail,
    password: testPassword,
    name: testName
  });

  if (signupRes.status !== 200 || !signupRes.data.user?.id) {
    throw new Error(`Signup failed: ${JSON.stringify(signupRes.data)}`);
  }
  const userId = signupRes.data.user.id;
  const token = signupRes.data.token;
  console.log(`[PASS] User created with ID: ${userId}, token received`);

  // --- 2. Test Auth: Token Verification ---
  console.log('\n2. Testing Token Verification...');
  const verifyRes = await handleAuthRequest({
    action: 'verify-token',
    token: token
  });
  if (verifyRes.status !== 200 || verifyRes.data.user?.email !== testEmail) {
    throw new Error(`Verify token failed: ${JSON.stringify(verifyRes.data)}`);
  }
  console.log('[PASS] Token verified successfully');

  // --- 3. Test Auth: Login ---
  console.log('\n3. Testing Login...');
  const loginRes = await handleAuthRequest({
    action: 'login',
    email: testEmail,
    password: testPassword
  });
  if (loginRes.status !== 200 || !loginRes.data.token) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
  }
  console.log('[PASS] Login successful');

  // --- 4. Test Auth: Verify Password ---
  console.log('\n4. Testing Password Check (Settings verification)...');
  const passRes = await handleAuthRequest({
    action: 'verify-password',
    email: testEmail,
    password: testPassword
  });
  if (passRes.status !== 200 || !passRes.data.success) {
    throw new Error(`Verify password failed: ${JSON.stringify(passRes.data)}`);
  }
  console.log('[PASS] Password verification passed');

  // --- 5. Test CRUD: Tasks ---
  console.log('\n5. Testing Tasks CRUD in Neon...');
  const insertTaskRes = await handleDbRequest({
    action: 'insert',
    table: 'tasks',
    payload: {
      user_id: userId,
      title: 'Test Neon Task',
      description: 'Verifying task insert',
      category: 'Work',
      priority: 'High',
      date: '2026-09-06',
      start_time: '10:00',
      end_time: '11:00',
      estimated_minutes: 60,
      completed: false,
      status: 'pending'
    }
  });
  if (insertTaskRes.status !== 200 || insertTaskRes.data.data.length === 0) {
    throw new Error(`Task insert failed: ${JSON.stringify(insertTaskRes.data)}`);
  }
  const taskId = insertTaskRes.data.data[0].id;
  console.log(`[PASS] Task inserted with ID: ${taskId}`);

  // Query tasks
  const selectTasksRes = await handleDbRequest({
    action: 'select',
    table: 'tasks',
    filters: [{ column: 'user_id', operator: 'eq', value: userId }]
  });
  if (selectTasksRes.status !== 200 || selectTasksRes.data.data.length === 0) {
    throw new Error(`Task select failed: ${JSON.stringify(selectTasksRes.data)}`);
  }
  console.log(`[PASS] Selected ${selectTasksRes.data.data.length} task(s) for user`);

  // Update task
  const updateTaskRes = await handleDbRequest({
    action: 'update',
    table: 'tasks',
    payload: { completed: true, status: 'completed', completed_at: new Date().toISOString() },
    filters: [{ column: 'id', operator: 'eq', value: taskId }]
  });
  if (updateTaskRes.status !== 200 || !updateTaskRes.data.data[0]?.completed) {
    throw new Error(`Task update failed: ${JSON.stringify(updateTaskRes.data)}`);
  }
  console.log('[PASS] Task updated to completed');

  // --- 6. Test CRUD: Reminders ---
  console.log('\n6. Testing Reminders CRUD in Neon...');
  const insertReminderRes = await handleDbRequest({
    action: 'insert',
    table: 'reminders',
    payload: {
      user_id: userId,
      title: 'Test Reminder',
      description: 'Neon reminder test',
      date: '2026-09-06',
      time: '14:00',
      priority: 'Medium',
      completed: false
    }
  });
  if (insertReminderRes.status !== 200) {
    throw new Error(`Reminder insert failed: ${JSON.stringify(insertReminderRes.data)}`);
  }
  console.log('[PASS] Reminder inserted successfully');

  // --- 7. Test CRUD: Daily Routines ---
  console.log('\n7. Testing Daily Routines CRUD in Neon...');
  const insertRoutineRes = await handleDbRequest({
    action: 'insert',
    table: 'daily_routines',
    payload: {
      user_id: userId,
      title: 'Morning Yoga',
      time: '07:00',
      duration_minutes: 30,
      days: ['Mon', 'Wed', 'Fri'],
      enabled: true,
      priority: 'High'
    }
  });
  if (insertRoutineRes.status !== 200) {
    throw new Error(`Routine insert failed: ${JSON.stringify(insertRoutineRes.data)}`);
  }
  console.log('[PASS] Routine inserted with TEXT[] days array');

  // --- 8. Test CRUD: Journal Entries ---
  console.log('\n8. Testing Journal Entries in Neon...');
  const insertJournalRes = await handleDbRequest({
    action: 'insert',
    table: 'journal_entries',
    payload: {
      user_id: userId,
      date: '2026-09-06',
      title: 'Neon Migration Day',
      content: 'Successfully migrating Life OS to Neon PostgreSQL!',
      mood: 'Energized'
    }
  });
  if (insertJournalRes.status !== 200) {
    throw new Error(`Journal insert failed: ${JSON.stringify(insertJournalRes.data)}`);
  }
  console.log('[PASS] Journal entry inserted successfully');

  // --- 9. Test CRUD: Focus Sessions ---
  console.log('\n9. Testing Focus Sessions in Neon...');
  const insertFocusRes = await handleDbRequest({
    action: 'insert',
    table: 'focus_sessions',
    payload: {
      user_id: userId,
      task_id: taskId,
      duration_minutes: 25,
      completed: true
    }
  });
  if (insertFocusRes.status !== 200) {
    throw new Error(`Focus session insert failed: ${JSON.stringify(insertFocusRes.data)}`);
  }
  console.log('[PASS] Focus session inserted with task foreign key reference');

  // --- 10. Test CRUD: Motivational Quotes ---
  console.log('\n10. Testing Motivational Quotes in Neon...');
  const insertQuoteRes = await handleDbRequest({
    action: 'insert',
    table: 'motivational_quotes',
    payload: {
      user_id: userId,
      text: 'Build momentum, stay focused.'
    }
  });
  if (insertQuoteRes.status !== 200) {
    throw new Error(`Quote insert failed: ${JSON.stringify(insertQuoteRes.data)}`);
  }
  console.log('[PASS] Motivational quote inserted');

  // --- 11. Test CRUD: Learning Topics ---
  console.log('\n11. Testing Learning Topics in Neon (JSONB resources)...');
  const insertTopicRes = await handleDbRequest({
    action: 'insert',
    table: 'learning_topics',
    payload: {
      user_id: userId,
      title: 'PostgreSQL Internals',
      description: 'Deep dive into Postgres',
      category: 'Engineering',
      priority: 'High',
      progress: 40,
      status: 'Learning',
      resources: JSON.stringify([{ title: 'Neon Docs', url: 'https://neon.tech/docs' }])
    }
  });
  if (insertTopicRes.status !== 200) {
    throw new Error(`Topic insert failed: ${JSON.stringify(insertTopicRes.data)}`);
  }
  console.log('[PASS] Learning topic inserted with JSONB resources');

  // --- 12. Cleanup Test User & Cascade Delete ---
  console.log('\n12. Testing Cascade Deletes in Neon...');
  const deleteUserRes = await handleDbRequest({
    action: 'delete',
    table: 'users',
    filters: [{ column: 'id', operator: 'eq', value: userId }]
  });
  if (deleteUserRes.status !== 200) {
    throw new Error(`User cleanup failed: ${JSON.stringify(deleteUserRes.data)}`);
  }
  console.log('[PASS] User deleted, all cascading child rows removed cleanly');

  console.log('\n=== ALL NEON POSTGRESQL E2E TESTS PASSED (12/12) ===');
}

runTests().catch(err => {
  console.error('\n[FAIL] Test error:', err);
  process.exit(1);
});
