import { neon } from '@neondatabase/serverless';

async function testNeon() {
  const dbUrl = 'postgresql://neondb_owner:npg_BvSr5yTj1qpU@ep-silent-dream-a5daulda-pooler.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
  try {
    const sql = neon(dbUrl);
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Neon Tables:', tables.map(t => t.table_name));

    for (const t of tables) {
      try {
        const count = await sql`SELECT count(*) FROM public.${sql(t.table_name)}`;
        console.log(`Neon table ${t.table_name}: ${count[0]?.count} rows`);
      } catch (e) {
        console.log(`Neon table ${t.table_name} query error: ${e.message}`);
      }
    }
  } catch (err) {
    console.error('Neon test error:', err.message, err.status || '');
  }
}

testNeon();
