import { useState, useEffect } from "react";

export interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  [key: string]: any;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const res = await fetch('https://auth.zuup.dev/api/me', {
          credentials: 'include'
        });
        
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setSession({ user: data.user }); // Provide a mock session object for compatibility
        } else {
          setUser(null);
          setSession(null);
        }
      } catch (err) {
        console.error("Auth check failed", err);
        if (!cancelled) {
          setUser(null);
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = () => {
    const myUrl = window.location.origin + '/profile';
    window.location.href = `https://auth.zuup.dev/login?redirect_to=${encodeURIComponent(myUrl)}`;
  };

  const signOut = () => {
    const myUrl = window.location.origin;
    window.location.href = `https://auth.zuup.dev/api/logout?redirect_to=${encodeURIComponent(myUrl)}`;
  };

  // Mock functions for legacy compatibility so other components don't crash
  const signUp = async () => { signIn(); };
  const sendEmailCode = async () => { signIn(); };
  const verifyEmailCode = async () => { signIn(); };
  const resetPassword = async () => { signIn(); };
  const updatePassword = async () => { console.warn("updatePassword not supported in client dashboard"); };
  const updateProfile = async () => { console.warn("updateProfile not supported in client dashboard"); };
  const updateEmail = async () => { console.warn("updateEmail not supported in client dashboard"); };
  const refreshSession = async () => { return { data: null, error: null }; };

  return {
    user, session, loading,
    signIn, signUp, signOut,
    sendEmailCode, verifyEmailCode,
    resetPassword, updatePassword,
    updateProfile, updateEmail,
    refreshSession,
  };
}
