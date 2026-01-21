'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthUser } from '@/types';
import { SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY, APP_SLUG } from '@/lib/constants';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

// Track user login in shared DB
async function trackUserLogin(supabase: SupabaseClient, userId: string, email: string) {
  try {
    const { error } = await supabase
      .from('user_tracking')
      .upsert(
        {
          user_id: userId,
          email: email,
          app: APP_SLUG,
          last_login_ts: new Date().toISOString(),
          login_cnt: 1,
        },
        {
          onConflict: 'user_id,app',
          ignoreDuplicates: false,
        }
      );

    if (error) {
      // Try increment approach if upsert fails
      const { data: existing } = await supabase
        .from('user_tracking')
        .select('login_cnt')
        .eq('user_id', userId)
        .eq('app', APP_SLUG)
        .single();

      if (existing) {
        await supabase
          .from('user_tracking')
          .update({
            login_cnt: (existing.login_cnt || 0) + 1,
            last_login_ts: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('app', APP_SLUG);
      } else {
        await supabase
          .from('user_tracking')
          .insert({
            user_id: userId,
            email: email,
            app: APP_SLUG,
            last_login_ts: new Date().toISOString(),
            login_cnt: 1,
          });
      }
    }
  } catch (e) {
    console.error('Failed to track user login:', e);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  // Load Supabase dynamically
  useEffect(() => {
    const loadSupabase = async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const client = createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY);
        setSupabase(client);

        // Check for existing session
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) {
          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            avatar_url: session.user.user_metadata?.avatar_url,
          };
          setUser(authUser);
          // Don't track on page load, only on new sign in
        }
        setLoading(false);

        // Listen for auth changes
        const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const authUser: AuthUser = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
              avatar_url: session.user.user_metadata?.avatar_url,
            };
            setUser(authUser);

            // Track user login on SIGNED_IN event
            await trackUserLogin(client, session.user.id, session.user.email || '');
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
        });

        return () => {
          subscription?.unsubscribe();
        };
      } catch (e) {
        console.error('Failed to load Supabase:', e);
        setLoading(false);
      }
    };

    loadSupabase();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      console.error('Supabase not loaded');
      return;
    }

    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : `${process.env.NEXT_PUBLIC_APP_URL || 'https://focus-timer-app.vercel.app'}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error('Google sign in error:', error);
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
