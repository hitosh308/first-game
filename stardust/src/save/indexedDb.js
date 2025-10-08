const DB_NAME = "stardust-runner";
const DB_VERSION = 1;
const STORE_GAME = "game";
const STORE_META = "meta";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_GAME)) {
        db.createObjectStore(STORE_GAME);
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(storeName, mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = callback(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

export function saveGame(state) {
  return withStore(STORE_GAME, "readwrite", (store) => {
    store.put(state, "current");
  });
}

export function loadGame() {
  return withStore(STORE_GAME, "readonly", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get("current");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

export function saveMeta(meta) {
  return withStore(STORE_META, "readwrite", (store) => {
    store.put(meta, "meta");
  });
}

export function loadMeta() {
  return withStore(STORE_META, "readonly", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get("meta");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}
