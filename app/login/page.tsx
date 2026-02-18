'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { User, Lock, Building2, ArrowRight, ArrowLeft } from 'lucide-react';

type Step = 'school' | 'credentials';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  const [step, setStep] = useState<Step>('school');
  const [schoolIdInput, setSchoolIdInput] = useState('');
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [validatingSchool, setValidatingSchool] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const handleSchoolContinue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const raw = schoolIdInput.trim();
    const id = raw ? Number(raw) : NaN;
    if (!Number.isInteger(id) || id <= 0) {
      setError('Please enter a valid school ID (positive number).');
      return;
    }
    setValidatingSchool(true);
    try {
      const res = await fetch('/api/school/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'School ID not found. Please check the ID and try again.');
        return;
      }
      setSchoolName(data.school_name ?? null);
      setStep('credentials');
    } finally {
      setValidatingSchool(false);
    }
  };

  const handleBackToSchool = () => {
    setStep('school');
    setError('');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const raw = schoolIdInput.trim();
    const schoolIdNum = raw ? Number(raw) : NaN;
    if (!Number.isInteger(schoolIdNum) || schoolIdNum <= 0) {
      setError('Invalid school ID. Please go back and enter a valid school ID.');
      return;
    }
    if (!username.trim() || !password) {
      setError('Please fill in username and password.');
      return;
    }
    setSigningIn(true);
    try {
      const { error: signInError } = await signIn(schoolIdNum, username.trim(), password);
      if (signInError) {
        setError(signInError.message ?? 'Sign in failed.');
        return;
      }
      router.replace('/');
    } finally {
      setSigningIn(false);
    }
  };

  if (loading || user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Login</h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
            {error}
          </div>
        )}

        {step === 'school' ? (
          <form onSubmit={handleSchoolContinue}>
            <label className="block text-sm font-medium text-gray-700 mb-1">School ID</label>
            <div className="flex items-center border-b border-gray-300 focus-within:border-cyan-500 transition-colors mb-6">
              <Building2 className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="flex-1 py-2.5 bg-transparent border-0 focus:ring-0 focus:outline-none placeholder:text-gray-400"
                value={schoolIdInput}
                onChange={(e) => setSchoolIdInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Type your school ID"
                required
                disabled={validatingSchool}
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg font-semibold text-white uppercase tracking-wide bg-gradient-to-r from-cyan-400 via-cyan-500 to-fuchsia-500 hover:from-cyan-500 hover:to-fuchsia-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={validatingSchool}
            >
              {validatingSchool ? 'Checking...' : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        ) : (
          <>
            {schoolName && (
              <p className="mb-4 text-sm text-gray-500">
                School: <strong className="text-gray-700">{schoolName}</strong> (ID: {schoolIdInput})
              </p>
            )}
            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="flex items-center border-b border-gray-300 focus-within:border-cyan-500 transition-colors mb-6">
                <User className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  autoComplete="username"
                  className="flex-1 py-2.5 bg-transparent border-0 focus:ring-0 focus:outline-none placeholder:text-gray-400"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Type your username"
                  required
                  disabled={signingIn}
                />
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="flex items-center border-b border-gray-300 focus-within:border-cyan-500 transition-colors mb-2">
                <Lock className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type="password"
                  autoComplete="current-password"
                  className="flex-1 py-2.5 bg-transparent border-0 focus:ring-0 focus:outline-none placeholder:text-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Type your password"
                  required
                  disabled={signingIn}
                />
              </div>
              <div className="text-right mb-6">
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-cyan-600 focus:outline-none"
                  onClick={() => {}}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-lg font-semibold text-white uppercase tracking-wide bg-gradient-to-r from-cyan-400 via-cyan-500 to-fuchsia-500 hover:from-cyan-500 hover:to-fuchsia-600 transition-all disabled:opacity-50 mb-6"
                disabled={signingIn}
              >
                {signingIn ? 'Signing in...' : 'Login'}
              </button>

              <button
                type="button"
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                onClick={handleBackToSchool}
                disabled={signingIn}
              >
                <ArrowLeft className="w-5 h-5" />
                Back to school ID
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
