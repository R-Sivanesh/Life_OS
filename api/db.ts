import { neon } from '@neondatabase/serverless';

function getDatabaseUrl(): string {
  let url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    throw new Error('DATABASE_URL is not set in environment variables. Please configure DATABASE_URL in Vercel project settings.');
  }
  url = url.trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

const ALLOWED_TABLES = new Set([
  'users',
  'profiles',
  'tasks',
  'reminders',
  'daily_routines',
  'focus_sessions',
  'journal_entries',
  'motivational_quotes',
  'learning_topics',
  'goals',
  'habits'
]);

function normalizeRow(row: any): any {
  if (!row || typeof row !== 'object') return row;
  const out: Record<string, any> = { ...row };

  for (const [key, value] of Object.entries(out)) {
    if (value instanceof Date) {
      if (key === 'date' || key.endsWith('_date')) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        out[key] = `${year}-${month}-${day}`;
      } else {
        out[key] = value.toISOString();
      }
    } else if (typeof value === 'string') {
      if (key === 'date' && value.includes('T')) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          out[key] = `${year}-${month}-${day}`;
        }
      }
    }

    if (key === 'resources' && typeof value === 'string') {
      try {
        out[key] = JSON.parse(value);
      } catch {
        // Keep original if not JSON
      }
    }
  }

  return out;
}

export async function handleDbRequest(reqBody: any) {
  const { action, table, payload, filters, order, limit, onConflict } = reqBody || {};

  if (!table || !ALLOWED_TABLES.has(table)) {
    return { status: 400, data: { error: `Invalid or unauthorized table: ${table}` } };
  }

  let sql;
  try {
    sql = neon(getDatabaseUrl());
  } catch (err: any) {
    return { status: 500, data: { error: err.message || 'Database connection error' } };
  }

  try {
    if (action === 'select') {
      let query = `SELECT * FROM public.${table}`;
      const params: any[] = [];
      const whereClauses: string[] = [];

      if (filters && Array.isArray(filters)) {
        for (const f of filters) {
          const { column, operator, value } = f;
          if (!/^[a-zA-Z0-9_]+$/.test(column)) continue;

          if (operator === 'eq') {
            params.push(value);
            whereClauses.push(`${column} = $${params.length}`);
          } else if (operator === 'gte') {
            params.push(value);
            whereClauses.push(`${column} >= $${params.length}`);
          } else if (operator === 'in' && Array.isArray(value)) {
            if (value.length === 0) {
              whereClauses.push('1 = 0');
            } else {
              const placeholders = value.map(v => {
                params.push(v);
                return `$${params.length}`;
              }).join(', ');
              whereClauses.push(`${column} IN (${placeholders})`);
            }
          } else if (operator === 'not_is_null') {
            whereClauses.push(`${column} IS NOT NULL`);
          }
        }
      }

      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      if (order && order.column && /^[a-zA-Z0-9_]+$/.test(order.column)) {
        query += ` ORDER BY ${order.column} ${order.ascending ? 'ASC' : 'DESC'}`;
      }

      if (limit && Number.isInteger(limit) && limit > 0) {
        query += ` LIMIT ${limit}`;
      }

      const rows = await sql.query(query, params);
      const data = (rows || []).map(normalizeRow);
      return { status: 200, data: { data, error: null } };
    }

    if (action === 'insert') {
      const records = Array.isArray(payload) ? payload : [payload];
      if (records.length === 0) {
        return { status: 200, data: { data: [], error: null } };
      }

      const insertedRows: any[] = [];
      for (const record of records) {
        const cleaned: Record<string, any> = {};
        for (const [k, v] of Object.entries(record)) {
          if (/^[a-zA-Z0-9_]+$/.test(k) && v !== undefined) {
            cleaned[k] = v;
          }
        }

        const keys = Object.keys(cleaned);
        if (keys.length === 0) continue;

        const columns = keys.join(', ');
        const params = Object.values(cleaned);
        const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');

        const query = `INSERT INTO public.${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
        const result = await sql.query(query, params);
        if (result && result.length > 0) {
          insertedRows.push(normalizeRow(result[0]));
        }
      }

      return { status: 200, data: { data: insertedRows, error: null } };
    }

    if (action === 'upsert') {
      const records = Array.isArray(payload) ? payload : [payload];
      if (records.length === 0) {
        return { status: 200, data: { data: [], error: null } };
      }

      const conflictCol = onConflict && /^[a-zA-Z0-9_]+$/.test(onConflict) ? onConflict : 'id';
      const results: any[] = [];

      for (const record of records) {
        const cleaned: Record<string, any> = {};
        for (const [k, v] of Object.entries(record)) {
          if (/^[a-zA-Z0-9_]+$/.test(k) && v !== undefined) {
            cleaned[k] = v;
          }
        }

        const keys = Object.keys(cleaned);
        if (keys.length === 0) continue;

        const columns = keys.join(', ');
        const params = Object.values(cleaned);
        const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');

        const updateSets = keys
          .filter(k => k !== conflictCol)
          .map(k => `${k} = EXCLUDED.${k}`)
          .join(', ');

        let query = `INSERT INTO public.${table} (${columns}) VALUES (${placeholders})`;
        if (updateSets.length > 0) {
          query += ` ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateSets} RETURNING *`;
        } else {
          query += ` ON CONFLICT (${conflictCol}) DO NOTHING RETURNING *`;
        }

        const res = await sql.query(query, params);
        if (res && res.length > 0) {
          results.push(normalizeRow(res[0]));
        }
      }

      return { status: 200, data: { data: results, error: null } };
    }

    if (action === 'update') {
      const updates = payload || {};
      const cleaned: Record<string, any> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (/^[a-zA-Z0-9_]+$/.test(k)) {
          cleaned[k] = v;
        }
      }

      const keys = Object.keys(cleaned);
      if (keys.length === 0) {
        return { status: 200, data: { data: [], error: null } };
      }

      const params: any[] = [];
      const setClauses = keys.map(k => {
        params.push(cleaned[k]);
        return `${k} = $${params.length}`;
      });

      let query = `UPDATE public.${table} SET ${setClauses.join(', ')}`;
      const whereClauses: string[] = [];

      if (filters && Array.isArray(filters)) {
        for (const f of filters) {
          const { column, operator, value } = f;
          if (!/^[a-zA-Z0-9_]+$/.test(column)) continue;

          if (operator === 'eq') {
            params.push(value);
            whereClauses.push(`${column} = $${params.length}`);
          } else if (operator === 'in' && Array.isArray(value)) {
            if (value.length === 0) {
              whereClauses.push('1 = 0');
            } else {
              const placeholders = value.map(v => {
                params.push(v);
                return `$${params.length}`;
              }).join(', ');
              whereClauses.push(`${column} IN (${placeholders})`);
            }
          }
        }
      }

      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      query += ' RETURNING *';
      const rows = await sql.query(query, params);
      const data = (rows || []).map(normalizeRow);
      return { status: 200, data: { data, error: null } };
    }

    if (action === 'delete') {
      let query = `DELETE FROM public.${table}`;
      const params: any[] = [];
      const whereClauses: string[] = [];

      if (filters && Array.isArray(filters)) {
        for (const f of filters) {
          const { column, operator, value } = f;
          if (!/^[a-zA-Z0-9_]+$/.test(column)) continue;

          if (operator === 'eq') {
            params.push(value);
            whereClauses.push(`${column} = $${params.length}`);
          } else if (operator === 'gte') {
            params.push(value);
            whereClauses.push(`${column} >= $${params.length}`);
          } else if (operator === 'in' && Array.isArray(value)) {
            if (value.length === 0) {
              whereClauses.push('1 = 0');
            } else {
              const placeholders = value.map(v => {
                params.push(v);
                return `$${params.length}`;
              }).join(', ');
              whereClauses.push(`${column} IN (${placeholders})`);
            }
          }
        }
      }

      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      query += ' RETURNING *';
      const rows = await sql.query(query, params);
      const data = (rows || []).map(normalizeRow);
      return { status: 200, data: { data, error: null } };
    }

    return { status: 400, data: { error: `Unsupported database action: ${action}` } };
  } catch (err: any) {
    console.error(`Neon DB Error on ${action} ${table}:`, err);
    return { status: 500, data: { error: err.message || 'Database query error' } };
  }
}

async function parseRequestBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch { return {}; }
    }
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: any) => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// Vercel Serverless Function Default Export
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = await parseRequestBody(req);
    const result = await handleDbRequest(body);
    return res.status(result.status).json(result.data);
  } catch (err: any) {
    console.error('Unhandled Vercel DB Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
