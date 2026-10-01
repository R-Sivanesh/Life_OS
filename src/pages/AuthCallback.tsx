import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        setError(errorDescription || `Google authentication was cancelled or failed (${errorParam}).`);
        setTimeout(() => navigate('/login', { replace: true }), 3000);
        return;
      }

      try {
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setError(exchangeError.message || 'Failed to exchange authorization code for session.');
            setTimeout(() => navigate('/login', { replace: true }), 3500);
            return;
          }
          if (data?.session) {
            navigate('/dashboard', { replace: true });
            return;
          }
        }

        // Fallback: check active session if token was in hash
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          setError(sessionErr.message);
          setTimeout(() => navigate('/login', { replace: true }), 3500);
          return;
        }

        if (sessionData?.session) {
          navigate('/dashboard', { replace: true });
        } else {
          // Give Supabase a brief tick to process hash
          setTimeout(async () => {
            const { data: retryData } = await supabase.auth.getSession();
            if (retryData?.session) {
              navigate('/dashboard', { replace: true });
            } else {
              setError('No authenticated session could be established.');
              setTimeout(() => navigate('/login', { replace: true }), 3000);
            }
          }, 1000);
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred during Google authentication.');
        setTimeout(() => navigate('/login', { replace: true }), 3500);
      }
    };

    handleCallback();
  }, [location.search, navigate]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan/20 blur-[120px] pointer-events-none" />

      <div className="glass-card w-full max-w-md p-8 relative z-10 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan flex items-center justify-center shadow-glow mb-6">
          <span className="text-3xl font-black text-white">L</span>
        </div>

        {error ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center text-danger">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Authentication Failed</h2>
            <p className="text-sm text-text-muted">{error}</p>
            <p className="text-xs text-text-muted mt-2">Redirecting to login page...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <h2 className="text-lg font-bold text-text-primary">Signing in with Google...</h2>
            <p className="text-xs text-text-muted">Verifying your Google identity and preparing your workspace...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
