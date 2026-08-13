import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Calendar, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

const Profile = () => {
  const { user } = useAuth();
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (supabase) {
        const { data } = await supabase.auth.getUser();
        if (data.user?.created_at) {
          setCreatedAt(data.user.created_at);
        }
      }
    };
    fetchUserDetails();
  }, []);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">My Profile</h1>
      </div>

      <div className="glass-card p-8 flex flex-col gap-8 max-w-3xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary/30 overflow-hidden shadow-glow">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-primary uppercase">{user.name.slice(0, 2)}</span>
            )}
          </div>
          <div>
            <h2 className="text-3xl font-black text-text-primary">{user.name}</h2>
            <p className="text-text-cyan flex items-center gap-2 mt-1">
              <Shield className="w-4 h-4 text-primary" /> Member
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="bg-surface-elevated/50 border border-border/50 rounded-2xl p-5 flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Full Name</p>
              <p className="text-lg font-bold text-text-primary mt-1">{user.name}</p>
            </div>
          </div>

          <div className="bg-surface-elevated/50 border border-border/50 rounded-2xl p-5 flex items-start gap-4">
            <div className="p-3 bg-cyan/10 rounded-xl">
              <Mail className="w-6 h-6 text-cyan" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Email Address</p>
              <p className="text-lg font-bold text-text-primary mt-1">{user.email}</p>
            </div>
          </div>

          {createdAt && (
            <div className="bg-surface-elevated/50 border border-border/50 rounded-2xl p-5 flex items-start gap-4">
              <div className="p-3 bg-success/10 rounded-xl">
                <Calendar className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-muted">Account Created</p>
                <p className="text-lg font-bold text-text-primary mt-1">
                  {format(new Date(createdAt), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
