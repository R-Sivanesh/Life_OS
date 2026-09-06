import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'lifeos_jwt_secret_neon_auth_key_2026';

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

export async function handleAuthRequest(reqBody: any) {
  const { action, email, password, name, avatarUrl, token } = reqBody || {};
  
  let sql;
  try {
    sql = neon(getDatabaseUrl());
  } catch (err: any) {
    return { status: 500, data: { error: err.message || 'Database connection error' } };
  }

  try {
    if (action === 'signup') {
      if (!email || !password) {
        return { status: 400, data: { error: 'Email and password are required' } };
      }

      const existing = await sql`SELECT id FROM public.users WHERE email = ${email.toLowerCase().trim()}`;
      if (existing && existing.length > 0) {
        return { status: 400, data: { error: 'User with this email already exists.' } };
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userName = name || email.split('@')[0] || 'User';

      const userRows = await sql`
        INSERT INTO public.users (email, password_hash, name, avatar_url)
        VALUES (${email.toLowerCase().trim()}, ${passwordHash}, ${userName}, ${avatarUrl || ''})
        RETURNING id, email, name, avatar_url, created_at
      `;

      const newUser = userRows[0];

      // Upsert into profiles table
      await sql`
        INSERT INTO public.profiles (user_id, full_name, email, avatar_url)
        VALUES (${newUser.id}, ${newUser.name}, ${newUser.email}, ${newUser.avatar_url})
        ON CONFLICT (user_id) DO NOTHING
      `;

      const sessionToken = jwt.sign(
        { id: newUser.id, email: newUser.email, name: newUser.name, avatar_url: newUser.avatar_url },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return {
        status: 200,
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            avatar_url: newUser.avatar_url,
            created_at: newUser.created_at
          },
          token: sessionToken,
          error: null
        }
      };
    }

    if (action === 'login') {
      if (!email || !password) {
        return { status: 400, data: { error: 'Email and password are required' } };
      }

      const users = await sql`
        SELECT id, email, password_hash, name, avatar_url, created_at 
        FROM public.users 
        WHERE email = ${email.toLowerCase().trim()}
      `;

      if (!users || users.length === 0) {
        return { status: 401, data: { error: 'Invalid email or password.' } };
      }

      const user = users[0];
      if (user.password_hash) {
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          return { status: 401, data: { error: 'Invalid email or password.' } };
        }
      }

      const sessionToken = jwt.sign(
        { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return {
        status: 200,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name || user.email.split('@')[0],
            avatar_url: user.avatar_url || '',
            created_at: user.created_at
          },
          token: sessionToken,
          error: null
        }
      };
    }

    if (action === 'google-login') {
      const googleEmail = (email || 'google_user@lifeos.app').toLowerCase().trim();
      const googleName = name || 'Google User';
      const googleAvatar = avatarUrl || '';

      const existingUsers = await sql`
        SELECT id, email, name, avatar_url, created_at 
        FROM public.users 
        WHERE email = ${googleEmail}
      `;

      let user;
      if (existingUsers && existingUsers.length > 0) {
        user = existingUsers[0];
      } else {
        const created = await sql`
          INSERT INTO public.users (email, name, avatar_url)
          VALUES (${googleEmail}, ${googleName}, ${googleAvatar})
          RETURNING id, email, name, avatar_url, created_at
        `;
        user = created[0];

        await sql`
          INSERT INTO public.profiles (user_id, full_name, email, avatar_url)
          VALUES (${user.id}, ${user.name}, ${user.email}, ${user.avatar_url})
          ON CONFLICT (user_id) DO NOTHING
        `;
      }

      const sessionToken = jwt.sign(
        { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return {
        status: 200,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name || user.email.split('@')[0],
            avatar_url: user.avatar_url || '',
            created_at: user.created_at
          },
          token: sessionToken,
          error: null
        }
      };
    }

    if (action === 'verify-token') {
      if (!token) {
        return { status: 401, data: { user: null, error: 'No token provided' } };
      }

      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const users = await sql`
          SELECT id, email, name, avatar_url, created_at 
          FROM public.users 
          WHERE id = ${decoded.id}
        `;

        if (!users || users.length === 0) {
          return { status: 401, data: { user: null, error: 'User no longer exists' } };
        }

        const user = users[0];
        return {
          status: 200,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name || user.email.split('@')[0],
              avatar_url: user.avatar_url || '',
              created_at: user.created_at
            },
            error: null
          }
        };
      } catch {
        return { status: 401, data: { user: null, error: 'Invalid or expired session token' } };
      }
    }

    if (action === 'verify-password') {
      if (!email || !password) {
        return { status: 400, data: { error: 'Email and password are required' } };
      }

      const users = await sql`
        SELECT password_hash 
        FROM public.users 
        WHERE email = ${email.toLowerCase().trim()}
      `;

      if (!users || users.length === 0 || !users[0].password_hash) {
        return { status: 401, data: { error: 'Invalid password' } };
      }

      const isValid = await bcrypt.compare(password, users[0].password_hash);
      if (!isValid) {
        return { status: 401, data: { error: 'Invalid password' } };
      }

      return { status: 200, data: { success: true, error: null } };
    }

    return { status: 400, data: { error: `Unsupported auth action: ${action}` } };
  } catch (err: any) {
    console.error('Neon Auth Error:', err);
    return { status: 500, data: { error: err.message || 'Authentication error' } };
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
    const result = await handleAuthRequest(body);
    return res.status(result.status).json(result.data);
  } catch (err: any) {
    console.error('Unhandled Vercel Auth Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
