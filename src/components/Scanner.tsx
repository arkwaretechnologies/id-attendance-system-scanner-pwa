import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Scan, CheckCircle, AlertTriangle, UserCheck } from 'lucide-react';
import * as db from '../lib/db';
import * as supabase from '../lib/supabase';
import { sendAttendanceSms } from '../lib/sms';
import { onOnline, refreshStudentCache } from '../lib/sync';
import type { StudentProfile } from '../types/database';
import type { QueuedScan } from '../types/database';
import type { TodayAttendanceRow } from '../lib/supabase';

type ScanModeType = 'time_in' | 'time_out';

export default function Scanner() {
  // Always start true so server and client first paint match (avoids hydration error)
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [rfId, setRfId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');
  const [lastScannedStudent, setLastScannedStudent] = useState<StudentProfile | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [scanMode, setScanMode] = useState<ScanModeType>('time_in');
  const [recentScans, setRecentScans] = useState<(TodayAttendanceRow | QueuedScan)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadQueueCount = useCallback(async () => {
    const n = await db.getQueueCount();
    setQueueCount(n);
  }, []);

  const loadRecentScans = useCallback(async () => {
    if (isOnline) {
      try {
        const rows = await supabase.getTodayAttendance();
        setRecentScans(rows);
      } catch {
        setRecentScans([]);
      }
    } else {
      const queueItems = await db.getRecentQueueItems(20);
      setRecentScans(queueItems);
    }
  }, [isOnline]);

  useEffect(() => {
    loadQueueCount();
    loadRecentScans();
    if (isOnline) {
      refreshStudentCache().catch(console.error);
    }
  }, [loadQueueCount, loadRecentScans, isOnline]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      onOnline().then(() => {
        loadQueueCount();
        loadRecentScans();
      });
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadQueueCount, loadRecentScans]);

  const handleScan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rfId.trim()) return;
    setScanning(true);
    setMessage('');
    setMessageType('');

    try {
      let profile: StudentProfile | null = null;
      if (isOnline) {
        const { data, error } = await supabase.getStudentByRfId(rfId.trim());
        if (error) throw error;
        profile = data ?? null;
      } else {
        const cached = await db.getStudentByRfId(rfId.trim());
        profile = cached ?? null;
      }

      if (!profile) {
        setMessage(`No student found with RF ID: ${rfId}`);
        setMessageType('error');
        setLastScannedStudent(null);
        setScanning(false);
        setRfId('');
        return;
      }

      if (isOnline) {
        if (scanMode === 'time_in') {
          const { error } = await supabase.recordTimeIn({
            learner_ref_number: profile.learner_reference_number ?? null,
            rfid_tag: profile.rfid_tag ?? null,
            grade_level: profile.grade_level ?? null,
            school_year: profile.school_year ?? '2024-2025',
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.recordTimeOut({
            learner_ref_number: profile.learner_reference_number ?? null,
          });
          if (error) throw error;
        }
        await sendAttendanceSms({
          studentData: {
            first_name: profile.first_name ?? '',
            last_name: profile.last_name ?? '',
            guardian_contact_number: profile.guardian_contact_number ?? null,
          },
          action: scanMode,
          timestamp: new Date().toISOString(),
        });
        await loadRecentScans();
      } else {
        await db.addToQueue({
          rfid_tag: rfId.trim(),
          action: scanMode,
          timestamp_iso: new Date().toISOString(),
        });
        await loadQueueCount();
        await loadRecentScans();
      }

      setMessage(
        isOnline
          ? `✅ ${profile.first_name} ${profile.last_name} ${scanMode === 'time_in' ? 'timed in' : 'timed out'} successfully!`
          : `✅ ${profile.first_name} ${profile.last_name} – saved offline (${queueCount + 1} in queue)`
      );
      setMessageType('success');
      setLastScannedStudent(profile);
      setShowSuccessOverlay(true);
      setTimeout(() => setShowSuccessOverlay(false), 2000);
    } catch (err) {
      setMessage('Error processing scan. Please try again.');
      setMessageType('error');
      console.error(err);
    } finally {
      setScanning(false);
      setRfId('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const displayName = (item: TodayAttendanceRow | QueuedScan) => {
    if ('student_profile' in item && item.student_profile) {
      const p = item.student_profile as { first_name?: string; last_name?: string };
      return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || '—';
    }
    if ('action' in item) return `RFID: ${item.rfid_tag} (${item.action})`;
    return '—';
  };

  const displayTime = (item: TodayAttendanceRow | QueuedScan) => {
    if ('time_in' in item && item.time_in) return new Date(item.time_in).toLocaleTimeString();
    if ('timestamp_iso' in item) return new Date(item.timestamp_iso).toLocaleTimeString();
    return '—';
  };

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      {!isOnline && (
        <div className="mb-4 p-4 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-between">
          <span className="font-medium">Offline – scans will sync when online</span>
          {queueCount > 0 && (
            <span className="px-2 py-1 rounded bg-amber-200 font-semibold">{queueCount} in queue</span>
          )}
        </div>
      )}

      {showSuccessOverlay && lastScannedStudent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl text-center max-w-sm w-11/12 shadow-2xl">
            <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Attendance Recorded!</h2>
            <p className="text-lg text-gray-700">
              {lastScannedStudent.first_name} {lastScannedStudent.last_name}
            </p>
            <p className="text-gray-500 text-sm mt-1">RF ID: {lastScannedStudent.rfid_tag}</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">RF ID Scanner</h1>
        <p className="text-gray-600">Scan student RF IDs to mark attendance</p>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="text-center mb-4">
          <Scan
            size={48}
            className={`mx-auto mb-2 ${scanMode === 'time_in' ? 'text-green-500' : 'text-red-500'}`}
          />
          <h2 className="text-xl font-bold text-gray-900">
            {scanMode === 'time_in' ? 'Time In' : 'Time Out'}
          </h2>
        </div>
        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-100">
            <button
              type="button"
              onClick={() => setScanMode('time_in')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                scanMode === 'time_in' ? 'bg-green-500 text-white' : 'text-gray-600'
              }`}
            >
              Time In
            </button>
            <button
              type="button"
              onClick={() => setScanMode('time_out')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                scanMode === 'time_out' ? 'bg-red-500 text-white' : 'text-gray-600'
              }`}
            >
              Time Out
            </button>
          </div>
        </div>
        <form onSubmit={handleScan} className="max-w-sm mx-auto">
          <input
            ref={inputRef}
            type="text"
            className="w-full text-center text-lg p-4 border border-gray-300 rounded-lg font-mono mb-4"
            value={rfId}
            onChange={(e) => setRfId(e.target.value)}
            placeholder="Enter RF ID"
            disabled={scanning}
            autoFocus
          />
          <button
            type="submit"
            className={`w-full p-4 text-lg font-semibold rounded-lg ${
              scanMode === 'time_in' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
            } text-white disabled:opacity-50`}
            disabled={scanning || !rfId.trim()}
          >
            {scanning ? 'Processing...' : scanMode === 'time_in' ? 'Record Time In' : 'Record Time Out'}
          </button>
        </form>
        {message && (
          <div
            className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
              messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {messageType === 'success' && <CheckCircle size={20} />}
            {messageType === 'error' && <AlertTriangle size={20} />}
            {messageType === 'info' && <UserCheck size={20} />}
            {message}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {isOnline ? "Today's Scans" : 'Queued scans'}
        </h2>
        {recentScans.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            {isOnline ? 'No scans today yet.' : 'No queued scans.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {recentScans.slice(0, 10).map((item, i) => (
              <li
                key={'id' in item ? item.id : i}
                className="flex justify-between items-center p-3 rounded-lg border border-gray-200"
              >
                <span className="font-medium text-gray-900">{displayName(item)}</span>
                <span className="text-sm text-gray-500">
                  {'action' in item ? item.action : ''} {displayTime(item)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
