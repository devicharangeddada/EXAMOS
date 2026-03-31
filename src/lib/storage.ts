import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'study-app-files';
const STORE_NAME = 'files';
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export async function saveFile(id: string, blob: Blob): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, blob, id);
}

export async function getFile(id: string): Promise<Blob | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function deleteFile(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function getFileUrl(id: string): Promise<string | null> {
  const blob = await getFile(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
