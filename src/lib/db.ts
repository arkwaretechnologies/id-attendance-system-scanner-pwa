import { openDB, type IDBPDatabase } from 'idb';
import type { StudentProfile, QueuedScan } from '../types/database';

const DB_NAME = 'scanner-pwa';
const DB_VERSION = 1;
const STORE_STUDENTS = 'students';
const STORE_QUEUE = 'queue';

type Schema = {
  students: { key: string; value: StudentProfile; indexes: { 'by-rfid': string } };
  queue: { key: string; value: QueuedScan; indexes: { 'by-synced': number } };
};

export type ScannerDB = IDBPDatabase<Schema>;

let dbPromise: Promise<ScannerDB> | null = null;

export function getDB(): Promise<ScannerDB> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(database: IDBPDatabase<Schema>) {
        if (!database.objectStoreNames.contains(STORE_STUDENTS)) {
          const studentsStore = database.createObjectStore(STORE_STUDENTS, { keyPath: 'rfid_tag' });
          studentsStore.createIndex('by-rfid', 'rfid_tag', { unique: true });
        }
        if (!database.objectStoreNames.contains(STORE_QUEUE)) {
          const queueStore = database.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
          queueStore.createIndex('by-synced', 'synced');
        }
      },
    }) as Promise<ScannerDB>;
  }
  return dbPromise;
}

export async function putStudents(profiles: StudentProfile[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction(STORE_STUDENTS, 'readwrite');
  const store = tx.objectStore(STORE_STUDENTS);
  await store.clear();
  for (const p of profiles) {
    if (p.rfid_tag) await store.put(p);
  }
  await tx.done;
}

export async function getStudentByRfId(rfid: string): Promise<StudentProfile | undefined> {
  const database = await getDB();
  const value = await database.get(STORE_STUDENTS, rfid.trim());
  return value as StudentProfile | undefined;
}

export async function addToQueue(scan: Omit<QueuedScan, 'id' | 'synced'>): Promise<QueuedScan> {
  const db = await getDB();
  const id = `q-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const item: QueuedScan = { ...scan, id, synced: false };
  await db.put(STORE_QUEUE, item);
  return item;
}

export async function getUnsyncedQueue(): Promise<QueuedScan[]> {
  const database = await getDB();
  const all = (await database.getAll(STORE_QUEUE)) as QueuedScan[];
  return all.filter((item) => !item.synced);
}

export async function markQueueItemSynced(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get(STORE_QUEUE, id);
  if (item) {
    await db.put(STORE_QUEUE, { ...item, synced: true });
  }
}

export async function deleteQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_QUEUE, id);
}

export async function getQueueCount(): Promise<number> {
  const list = await getUnsyncedQueue();
  return list.length;
}

export async function getRecentQueueItems(limit: number): Promise<QueuedScan[]> {
  const database = await getDB();
  const all = (await database.getAll(STORE_QUEUE)) as QueuedScan[];
  all.sort((a, b) => new Date(b.timestamp_iso).getTime() - new Date(a.timestamp_iso).getTime());
  return all.slice(0, limit);
}
