import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

type User = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{success: boolean, error?: string}>;
  signup: (name: string, email: string, pass: string) => Promise<{success: boolean, error?: string}>;
  loginWithGoogle: () => Promise<{success: boolean, error?: string}>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();


  // Helper to upsert profile in Supabase
  const upsertProfile = async (sessionUser: any) => {
    if (!supabase) return;
    const { id, email, user_metadata } = sessionUser;
    const name = user_metadata?.full_name || email?.split('@')[0] || 'User';
    const avatar = user_metadata?.avatar_url || '';

    // Upsert into profiles table
    await supabase.from('profiles').upsert({
      user_id: id,
      full_name: name,
      email: email,
      avatar_url: avatar
    }, { onConflict: 'user_id' });
  };

  useEffect(() => {
    const initAuth = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          avatar_url: session.user.user_metadata?.avatar_url || '',
        });
        await upsertProfile(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatar_url: session.user.user_metadata?.avatar_url || '',
          });
          await upsertProfile(session.user);
        } else {
          setUser(null);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const login = async (email: string, pass: string) => {
    if (!supabase) return { success: false, error: 'Database connection failed' };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return { success: false, error: error.message };
    if (data.user) {
      navigate('/dashboard');
      return { success: true };
    }
    return { success: false, error: 'Unknown error occurred' };
  };

  const signup = async (name: string, email: string, pass: string) => {
    if (!supabase) return { success: false, error: 'Database connection failed' };
    const { data, error } = await supabase.auth.signUp({
      email, password: pass,
      options: { data: { full_name: name } }
    });
    if (error) return { success: false, error: error.message };
    if (data.user) {
      navigate('/dashboard');
      return { success: true };
    }
    return { success: false, error: 'Unknown error occurred' };
  };

  const loginWithGoogle = async () => {
    if (!supabase) return { success: false, error: 'Database connection failed' };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
