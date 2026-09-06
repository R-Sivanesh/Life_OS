import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleDbRequest } from './api/db.ts';
import { handleAuthRequest } from './api/auth.ts';

async function parseMiddlewareBody(req: any): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Ensure DATABASE_URL is in process.env for the server handlers
  if (env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL;
  if (env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL_UNPOOLED = env.DATABASE_URL_UNPOOLED;
  if (env.JWT_SECRET) process.env.JWT_SECRET = env.JWT_SECRET;
  if (env.GOOGLE_CLIENT_ID) process.env.GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
  if (env.GOOGLE_CLIENT_SECRET) process.env.GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
  if (env.VITE_GOOGLE_CLIENT_ID) process.env.VITE_GOOGLE_CLIENT_ID = env.VITE_GOOGLE_CLIENT_ID;


  return {
    plugins: [
      react(),
      {
        name: 'neon-api-dev-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const pathname = req.url ? req.url.split('?')[0] : '';

            if (pathname === '/api/db' || pathname === '/api/auth') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

              if (req.method === 'OPTIONS') {
                res.statusCode = 200;
                res.end();
                return;
              }

              if (req.method === 'POST') {
                try {
                  const body = await parseMiddlewareBody(req);
                  const result = pathname === '/api/db' 
                    ? await handleDbRequest(body)
                    : await handleAuthRequest(body);
                  
                  res.statusCode = result.status;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(result.data));
                } catch (e: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: e.message || 'Server error' }));
                }
                return;
              }
            }

            next();
          });
        }
      }
    ],
  };
});

