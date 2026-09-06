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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 8000, errorMsg: string = 'Database operation timed out'): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutHandle);
      return res;
    }),
    timeoutPromise
  ]);
}

export async function handleAuthRequest(reqBody: any) {
  const { action, email, password, name, avatarUrl, token } = reqBody || {};
  console.log(`[AUTH] request received: action=${action || 'unknown'}`);
  console.log('[AUTH] request body parsed');
  
  let sql;
  try {
    const dbUrl = getDatabaseUrl();
    sql = neon(dbUrl);
    console.log('[AUTH] database connection successful');
  } catch (err: any) {
    console.error('[AUTH] Database URL configuration error:', err.message);
    return { status: 500, data: { error: err.message || 'Database connection error' } };
  }

  try {
    if (action === 'signup') {
      if (!email || !password) {
        return { status: 400, data: { error: 'Email and password are required' } };
      }

      const normalizedEmail = email.toLowerCase().trim();
      const existing = await withTimeout(
        sql`SELECT id FROM public.users WHERE LOWER(email) = ${normalizedEmail}`,
        8000,
        'Database query timed out during signup check'
      );

      console.log(`[AUTH] user lookup completed (existing=${existing && existing.length > 0})`);

      if (existing && existing.length > 0) {
        return { status: 400, data: { error: 'User with this email already exists.' } };
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userName = name || normalizedEmail.split('@')[0] || 'User';

      const userRows = await withTimeout(
        sql`
          INSERT INTO public.users (email, password_hash, name, avatar_url)
          VALUES (${normalizedEmail}, ${passwordHash}, ${userName}, ${avatarUrl || ''})
          RETURNING id, email, name, avatar_url, created_at
        `,
        8000,
        'Database insert timed out during signup'
      );

      const newUser = userRows[0];

      // Upsert into profiles table
      await withTimeout(
        sql`
          INSERT INTO public.profiles (user_id, full_name, email, avatar_url)
          VALUES (${newUser.id}, ${newUser.name}, ${newUser.email}, ${newUser.avatar_url})
          ON CONFLICT (user_id) DO NOTHING
        `,
        8000,
        'Profile insert timed out during signup'
      );

      const sessionToken = jwt.sign(
        { id: newUser.id, email: newUser.email, name: newUser.name, avatar_url: newUser.avatar_url },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      console.log('[AUTH] JWT created');
      console.log('[AUTH] response sent (status=200)');
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

      const normalizedEmail = email.toLowerCase().trim();
      const users = await withTimeout(
        sql`
          SELECT id, email, password_hash, name, avatar_url, created_at 
          FROM public.users 
          WHERE LOWER(email) = ${normalizedEmail}
        `,
        8000,
        'Database user lookup timed out'
      );

      console.log('[AUTH] user lookup completed');
      const userFound = users && users.length > 0;
      console.log(`[AUTH] user found = ${userFound}`);

      if (!userFound) {
        return { status: 401, data: { error: 'Invalid email or password.' } };
      }

      const user = users[0];
      if (!user.password_hash) {
        console.log('[AUTH] user has no password set (OAuth user)');
        return { status: 401, data: { error: 'This account was registered with Google. Please use Continue with Google to sign in.' } };
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      console.log(`[AUTH] password verification result = ${isValid}`);

      if (!isValid) {
        return { status: 401, data: { error: 'Invalid email or password.' } };
      }

      const sessionToken = jwt.sign(
        { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      console.log('[AUTH] JWT created');
      console.log('[AUTH] response sent (status=200)');
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

    if (action === 'get-oauth-config') {
      const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
      return {
        status: 200,
        data: {
          googleClientId,
          configured: !!googleClientId
        }
      };
    }

    if (action === 'google-oauth-callback') {
      const { code, redirectUri } = reqBody || {};
      console.log('[AUTH] Google OAuth callback received');

      if (!code) {
        return { status: 400, data: { error: 'Authorization code is required.' } };
      }

      const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
      const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!googleClientId || !googleClientSecret) {
        console.error('[AUTH] Google OAuth credentials missing in server environment variables.');
        return {
          status: 500,
          data: {
            error: 'Google OAuth is not configured on the server. Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in environment variables.'
          }
        };
      }

      // Step 1: Exchange code for Google tokens
      console.log('[AUTH] Exchanging authorization code with Google OAuth token endpoint...');
      let tokenData: any;
      try {
        const tokenRes = await withTimeout(
          fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: googleClientId,
              client_secret: googleClientSecret,
              redirect_uri: redirectUri || 'http://localhost:5173/auth/callback',
              grant_type: 'authorization_code'
            })
          }),
          8000,
          'Google token exchange timed out'
        );

        tokenData = await tokenRes.json();
        if (!tokenRes.ok || tokenData.error) {
          console.error('[AUTH] Google token exchange error:', tokenData.error_description || tokenData.error);
          return {
            status: 400,
            data: { error: `Google OAuth error: ${tokenData.error_description || tokenData.error || 'Token exchange failed'}` }
          };
        }
      } catch (tokenErr: any) {
        console.error('[AUTH] Network error during Google token exchange:', tokenErr.message);
        return { status: 502, data: { error: 'Failed to communicate with Google authentication servers.' } };
      }

      // Step 2: Fetch verified user info using Google access token
      console.log('[AUTH] Fetching verified Google user profile...');
      let googleProfile: any;
      try {
        const profileRes = await withTimeout(
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
          }),
          8000,
          'Google userinfo request timed out'
        );

        googleProfile = await profileRes.json();
        if (!profileRes.ok || !googleProfile.email) {
          return { status: 400, data: { error: 'Unable to retrieve verified email from Google.' } };
        }
      } catch (profileErr: any) {
        console.error('[AUTH] Network error during Google profile fetch:', profileErr.message);
        return { status: 502, data: { error: 'Failed to fetch user profile from Google.' } };
      }

      const verifiedEmail = googleProfile.email.toLowerCase().trim();
      const verifiedName = googleProfile.name || googleProfile.given_name || verifiedEmail.split('@')[0];
      const verifiedAvatar = googleProfile.picture || '';

      console.log('[AUTH] Google profile verified for email domain');

      // Step 3: Find or Create User in Neon PostgreSQL
      const existingUsers = await withTimeout(
        sql`
          SELECT id, email, name, avatar_url, created_at 
          FROM public.users 
          WHERE LOWER(email) = ${verifiedEmail}
        `,
        8000,
        'Google user lookup query timed out'
      );

      let user: any;
      if (existingUsers && existingUsers.length > 0) {
        user = existingUsers[0];
        console.log('[AUTH] Existing user matched in Neon database');

        // If user avatar or name was not set, update it with Google data
        if (!user.avatar_url && verifiedAvatar) {
          await withTimeout(
            sql`UPDATE public.users SET avatar_url = ${verifiedAvatar} WHERE id = ${user.id}`,
            8000,
            'User avatar update timed out'
          );
          user.avatar_url = verifiedAvatar;
        }
      } else {
        console.log('[AUTH] Creating new user from verified Google profile in Neon...');
        const createdUsers = await withTimeout(
          sql`
            INSERT INTO public.users (email, name, avatar_url)
            VALUES (${verifiedEmail}, ${verifiedName}, ${verifiedAvatar})
            RETURNING id, email, name, avatar_url, created_at
          `,
          8000,
          'User insertion timed out'
        );
        user = createdUsers[0];

        // Upsert into profiles table
        await withTimeout(
          sql`
            INSERT INTO public.profiles (user_id, full_name, email, avatar_url)
            VALUES (${user.id}, ${user.name}, ${user.email}, ${user.avatar_url})
            ON CONFLICT (user_id) DO NOTHING
          `,
          8000,
          'Profile insertion timed out'
        );
      }

      // Step 4: Generate standard Life OS JWT session token
      const sessionToken = jwt.sign(
        { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      console.log('[AUTH] Life OS JWT session created for Google user');
      console.log('[AUTH] response sent (status=200)');
      return {
        status: 200,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
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
        const users = await withTimeout(
          sql`
            SELECT id, email, name, avatar_url, created_at 
            FROM public.users 
            WHERE id = ${decoded.id}
          `,
          8000,
          'Token verification query timed out'
        );

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

      const users = await withTimeout(
        sql`
          SELECT password_hash 
          FROM public.users 
          WHERE email = ${email.toLowerCase().trim()}
        `,
        8000,
        'Password check query timed out'
      );

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
    console.error('[AUTH] Execution error:', err.message);
    return { status: 500, data: { error: err.message || 'Authentication error' } };
  }
}

async function parseRequestBody(req: any): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') {
      if (Buffer.isBuffer(req.body)) {
        try {
          return JSON.parse(req.body.toString('utf-8'));
        } catch {
          return {};
        }
      }
      return req.body;
    }
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
  }

  // If stream is already finished, return empty object immediately
  if (req.readableEnded || req.complete || !req.readable) {
    return {};
  }

  return new Promise((resolve) => {
    let raw = '';
    const timer = setTimeout(() => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    }, 500);

    req.on('data', (chunk: any) => { raw += chunk; });
    req.on('end', () => {
      clearTimeout(timer);
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      clearTimeout(timer);
      resolve({});
    });
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
    console.error('[AUTH] Unhandled serverless handler error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
