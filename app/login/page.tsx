'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, User, Lock, Building2, ArrowRight, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <LogIn className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-500 mt-1">
            {step === 'school'
              ? 'Enter your school ID to continue'
              : 'Sign in to ID Attendance Scanner'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {step === 'school' ? (
          <form onSubmit={handleSchoolContinue}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="w-4 h-4 inline mr-2 align-middle" />
              School ID
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={schoolIdInput}
              onChange={(e) => setSchoolIdInput(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter your school ID"
              required
              disabled={validatingSchool}
              autoFocus
            />
            <button
              type="submit"
              className="w-full mt-4 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2 align-middle" />
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={signingIn}
              />
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2 align-middle" />
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={signingIn}
              />
              <button
                type="submit"
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:opacity-50 mb-3"
                disabled={signingIn}
              >
                {signingIn ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                type="button"
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={handleBackToSchool}
                disabled={signingIn}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to school ID
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
