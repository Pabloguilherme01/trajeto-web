import { openIndexedDatabase } from "./indexedDbAccess";
const DB_NAME = "trajeto-offline-v2";
const DB_VERSION = 1;

function openDb() {
  return openIndexedDatabase(DB_NAME, DB_VERSION, db => {
    for (const store of ["data", "map"]) {
      if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
    }
  });
}

async function access<T>(storeName: "data" | "map", mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest, fallback: T): Promise<T> {
  const db = await openDb().catch(() => null);
  if (!db) return fallback;
  return new Promise<T>(resolve => {
    let finished = false;
    let transaction: IDBTransaction | undefined;
    const finish = (result: T) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      db.close();
      resolve(result);
    };
    const timer = setTimeout(() => {
      try { transaction?.abort(); } catch {}
      finish(fallback);
    }, 5000);
    try {
      transaction = db.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      let result = fallback;
      request.onsuccess = () => { result = (mode === "readwrite" ? true : request.result ?? null) as T; };
      transaction.oncomplete = () => finish(result);
      transaction.onerror = transaction.onabort = () => finish(fallback);
      request.onerror = () => finish(fallback);
    } catch {
      try { transaction?.abort(); } catch {}
      finish(fallback);
    }
  });
}

export function idbPut<T>(storeName: "data" | "map", key: string, value: T) {
  return access(storeName, "readwrite", store => store.put(value, key), false);
}

export function idbGet<T>(storeName: "data" | "map", key: string) {
  return access<T | null>(storeName, "readonly", store => store.get(key), null);
}
