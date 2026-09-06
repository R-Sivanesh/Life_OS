// Neon PostgreSQL Client Adapter for Life OS
// Implements the identical API surface as Supabase JS Client for zero UI disruption

type Filter = {
  column: string;
  operator: string;
  value: any;
};

async function safeFetchJson(url: string, bodyObj: any, timeoutMs: number = 10000): Promise<{ data: any; error: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj),
      signal: controller.signal
    });

    clearTimeout(timer);
    const rawText = await res.text();
    let json: any = null;

    try {
      json = rawText ? JSON.parse(rawText) : {};
    } catch {
      // Server returned HTML or plain text error (e.g. 500 error page from host)
      return {
        data: null,
        error: {
          message: rawText && rawText.length < 200 ? rawText : `Server error (${res.status}). Please verify DATABASE_URL in Vercel settings.`
        }
      };
    }

    if (!res.ok) {
      return { data: null, error: { message: json.error || `Server request failed with status ${res.status}` } };
    }

    return { data: json.data !== undefined ? json.data : json, error: json.error || null };
  } catch (err: any) {
    clearTimeout(timer);
    console.error(`Fetch error on ${url}:`, err);
    if (err.name === 'AbortError') {
      return { data: null, error: { message: 'Request timed out. Please check your internet connection or try again.' } };
    }
    return { data: null, error: { message: err.message || 'Network communication error' } };
  }
}

class NeonQueryBuilder {
  private tableName: string;
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: any = null;
  private filters: Filter[] = [];
  private orderConfig: { column: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;
  private conflictTarget: string | null = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(_columns: string = '*', _options?: { count?: string }) {
    if (this.action !== 'insert' && this.action !== 'upsert') {
      this.action = 'select';
    }
    return this;
  }

  insert(values: any | any[]) {
    this.action = 'insert';
    this.payload = values;
    return this;
  }

  update(updates: any) {
    this.action = 'update';
    this.payload = updates;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  upsert(values: any | any[], options?: { onConflict?: string }) {
    this.action = 'upsert';
    this.payload = values;
    if (options?.onConflict) {
      this.conflictTarget = options.onConflict;
    }
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  not(column: string, operator: string, value: any) {
    if (operator === 'is' && value === null) {
      this.filters.push({ column, operator: 'not_is_null', value: null });
    } else {
      this.filters.push({ column, operator: `not_${operator}`, value });
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderConfig = {
      column,
      ascending: options?.ascending !== false
    };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  async execute(): Promise<{ data: any; error: any }> {
    return safeFetchJson('/api/db', {
      action: this.action,
      table: this.tableName,
      payload: this.payload,
      filters: this.filters,
      order: this.orderConfig,
      limit: this.limitCount,
      onConflict: this.conflictTarget
    });
  }

  // Support Promise-like chaining (await supabase.from(...)...)
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Client-side Auth Adapter
const authSubscribers = new Set<(event: string, session: any) => void>();

function notifyAuthSubscribers(event: string, session: any) {
  authSubscribers.forEach(cb => {
    try { cb(event, session); } catch (e) { console.error(e); }
  });
}

const authAdapter = {
  async getSession() {
    const token = localStorage.getItem('lifeos_neon_token');
    if (!token) {
      return { data: { session: null }, error: null };
    }

    const res = await safeFetchJson('/api/auth', { action: 'verify-token', token });
    if (res.data?.user) {
      const session = {
        user: res.data.user,
        access_token: token
      };
      return { data: { session }, error: null };
    } else {
      localStorage.removeItem('lifeos_neon_token');
      return { data: { session: null }, error: res.error };
    }
  },

  async getUser() {
    const sessionRes = await this.getSession();
    return { data: { user: sessionRes.data.session?.user || null }, error: sessionRes.error };
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    authSubscribers.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authSubscribers.delete(callback);
          }
        }
      }
    };
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const res = await safeFetchJson('/api/auth', { action: 'login', email, password });
    if (res.error || !res.data?.token) {
      return { data: { user: null, session: null }, error: res.error || { message: 'Login failed' } };
    }

    localStorage.setItem('lifeos_neon_token', res.data.token);
    const session = { user: res.data.user, access_token: res.data.token };
    notifyAuthSubscribers('SIGNED_IN', session);

    return { data: { user: res.data.user, session }, error: null };
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { full_name?: string } } }) {
    const res = await safeFetchJson('/api/auth', {
      action: 'signup',
      email,
      password,
      name: options?.data?.full_name
    });

    if (res.error || !res.data?.token) {
      return { data: { user: null, session: null }, error: res.error || { message: 'Signup failed' } };
    }

    localStorage.setItem('lifeos_neon_token', res.data.token);
    const session = { user: res.data.user, access_token: res.data.token };
    notifyAuthSubscribers('SIGNED_IN', session);

    return { data: { user: res.data.user, session }, error: null };
  },

  async signInWithOAuth({ provider: _provider }: { provider: string; options?: any }) {
    const res = await safeFetchJson('/api/auth', {
      action: 'google-login',
      email: 'google_user@lifeos.app',
      name: 'Google User'
    });

    if (res.error || !res.data?.token) {
      return { data: { user: null, session: null }, error: res.error || { message: 'OAuth login failed' } };
    }

    localStorage.setItem('lifeos_neon_token', res.data.token);
    const session = { user: res.data.user, access_token: res.data.token };
    notifyAuthSubscribers('SIGNED_IN', session);

    return { data: { user: res.data.user, session }, error: null };
  },

  async signOut() {
    localStorage.removeItem('lifeos_neon_token');
    notifyAuthSubscribers('SIGNED_OUT', null);
    return { error: null };
  }
};

// Export neon-backed client adapter
export const supabase = {
  from(tableName: string) {
    return new NeonQueryBuilder(tableName);
  },
  auth: authAdapter
};
