const DB_NAME = "trajeto-offline-v2";
const DB_VERSION = 1;

function openDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve<IDBDatabase | null>(null);
  return new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of ["data", "map"]) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB indisponível"));
  });
}

export async function idbPut<T>(storeName: "data" | "map", key: string, value: T) {
  const db = await openDb().catch(() => null);
  if (!db) return false;
  return new Promise<boolean>((resolve) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value, key);
    transaction.oncomplete = () => { db.close(); resolve(true); };
    transaction.onerror = () => { db.close(); resolve(false); };
  });
}

export async function idbGet<T>(storeName: "data" | "map", key: string) {
  const db = await openDb().catch(() => null);
  if (!db) return null;
  return new Promise<T | null>((resolve) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => { db.close(); resolve((request.result as T | undefined) ?? null); };
    request.onerror = () => { db.close(); resolve(null); };
  });
}
