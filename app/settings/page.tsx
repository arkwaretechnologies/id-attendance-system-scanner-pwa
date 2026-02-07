'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSchoolId, setSchoolId } from '@/lib/settings';
import * as db from '@/lib/db';

export default function SettingsPage() {
  const [schoolId, setSchoolIdState] = useState('');
  const [savedSchoolId, setSavedSchoolId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const current = getSchoolId();
    setSchoolIdState(current);
    setSavedSchoolId(current);
  }, []);

  const changed = useMemo(() => schoolId.trim() !== savedSchoolId.trim(), [schoolId, savedSchoolId]);

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const next = schoolId.trim();
      const prev = savedSchoolId.trim();

      if (next !== prev) {
        // Prevent mixing caches between schools
        await db.clearStudents();
        await db.clearQueue();
      }

      setSchoolId(next);
      setSavedSchoolId(next);
      setMessage('Saved.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <Link href="/" className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold">
          Back
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">School ID</label>
        <input
          className="w-full p-3 border border-gray-300 rounded-lg font-mono"
          value={schoolId}
          onChange={(e) => setSchoolIdState(e.target.value)}
          placeholder="e.g. SCH-001"
          disabled={saving}
        />
        <p className="text-sm text-gray-500 mt-2">
          The scanner will only fetch/scan students where <code className="font-mono">student_profile.school_id</code> matches this value.
          Changing School ID clears the offline cache and queue to prevent mixing data.
        </p>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !changed}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setSchoolIdState(savedSchoolId)}
            disabled={saving || !changed}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold disabled:opacity-50"
          >
            Reset
          </button>
        </div>

        {message && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-800">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

