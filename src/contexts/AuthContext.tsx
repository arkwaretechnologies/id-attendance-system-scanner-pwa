'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface AppUser {
  id: string;
  user_id: number;
  username: string;
  fullname: string;
  role: string;
  school_id: number | null;
  email: string;
  email_address: string | null;
  contact_no: string | null;
}

export interface AuthContextValue {
  user: AppUser | null;
  schoolId: string;
  schoolName: string | null;
  loading: boolean;
  signIn: (schoolId: number, username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [schoolId, setSchoolId] = useState('');
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setSchoolId(data.schoolId != null ? String(data.schoolId) : '');
        setSchoolName(data.schoolName ?? null);
      } else {
        setUser(null);
        setSchoolId('');
        setSchoolName(null);
      }
    } catch {
      setUser(null);
      setSchoolId('');
      setSchoolName(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const signIn = useCallback(
    async (schoolIdParam: number, username: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          schoolId: schoolIdParam,
          username: username.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: new Error(data.error ?? 'Sign in failed.') };
      }
      setUser(data.user);
      setSchoolId(String(data.schoolId ?? ''));
      setSchoolName(data.schoolName ?? null);
      return { error: null };
    },
    []
  );

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    setSchoolId('');
    setSchoolName(null);
  }, []);

  const value: AuthContextValue = {
    user,
    schoolId,
    schoolName,
    loading,
    signIn,
    signOut,
    refreshSession: fetchSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
