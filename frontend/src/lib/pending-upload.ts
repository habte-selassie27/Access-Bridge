/**
 * Hand a file from the dashboard to the upload wizard.
 *
 * Navigation is a real page load (the app uses plain URLs), so the File object
 * cannot be passed in memory. IndexedDB can store its bytes without turning an
 * 8 MB scan into a giant sessionStorage string. The dashboard writes it and the
 * wizard takes it exactly once.
 */
const DB_NAME = "pastewise-pending";
const STORE = "uploads";
const KEY = "current";

interface PendingRecord {
  name: string;
  type: string;
  lastModified: number;
  buffer: ArrayBuffer;
}

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function setPendingUpload(file: File): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;
  try {
    const buffer = await file.arrayBuffer();
    const record: PendingRecord = {
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
      buffer,
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

export async function takePendingUpload(): Promise<File | null> {
  const db = await openDB();
  if (!db) return null;
  try {
    const record = await new Promise<PendingRecord | null>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const get = store.get(KEY);
      get.onsuccess = () => {
        const value = get.result as PendingRecord | undefined;
        store.delete(KEY);
        resolve(value ?? null);
      };
      get.onerror = () => resolve(null);
    });
    if (!record) return null;
    return new File([record.buffer], record.name, {
      type: record.type,
      lastModified: record.lastModified || Date.now(),
    });
  } catch {
    return null;
  } finally {
    db.close();
  }
}
