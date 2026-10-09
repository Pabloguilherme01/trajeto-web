const STORAGE_TIMEOUT_MS = 5000;

/** A blocked upgrade or an unresponsive browser must not hold the UI forever. */
export function openIndexedDatabase(name: string, version: number, upgrade: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let finished = false;
    const fail = (error: unknown) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(error);
    };
    const timer = setTimeout(() => fail(new Error("O armazenamento offline não respondeu. Tente fechar outras abas do Trajeto.")), STORAGE_TIMEOUT_MS);
    try {
      const request = indexedDB.open(name, version);
      request.onerror = () => fail(request.error ?? new Error("Armazenamento offline indisponível."));
      request.onblocked = () => fail(new Error("Outra aba está bloqueando a atualização do armazenamento offline."));
      request.onupgradeneeded = () => {
        if (finished) { request.transaction?.abort(); return; }
        try { upgrade(request.result); } catch (error) { request.transaction?.abort(); fail(error); }
      };
      request.onsuccess = () => {
        const db = request.result;
        if (finished) { db.close(); return; }
        finished = true;
        clearTimeout(timer);
        db.onversionchange = () => db.close();
        resolve(db);
      };
    } catch (error) {
      fail(error);
    }
  });
}
