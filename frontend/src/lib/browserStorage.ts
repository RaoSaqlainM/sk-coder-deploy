export type BrowserStorageStatus = {
  available: boolean;
  usage: number;
  quota: number;
  remaining: number;
  persistent: boolean;
};

const BLOB_DB_NAME = "sk-coder-project-blobs-v1";
const BLOB_STORE_NAME = "blobs";

function openBlobDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(BLOB_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(BLOB_STORE_NAME)) request.result.createObjectStore(BLOB_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function storeBrowserBlob(file: Blob): Promise<string> {
  const database = await openBlobDatabase();
  if (!database) throw new Error("This browser cannot open local project blob storage.");
  const id = `${Date.now().toString(36)}-${crypto.randomUUID()}`;
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(BLOB_STORE_NAME, "readwrite").objectStore(BLOB_STORE_NAME).put(file, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Browser blob storage failed."));
  });
  return id;
}

export async function loadBrowserBlob(id: string): Promise<Blob | null> {
  const database = await openBlobDatabase();
  if (!database) return null;
  return new Promise((resolve) => {
    const request = database.transaction(BLOB_STORE_NAME, "readonly").objectStore(BLOB_STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => resolve(null);
  });
}

export async function deleteBrowserBlob(id: string): Promise<void> {
  const database = await openBlobDatabase();
  if (!database) return;
  await new Promise<void>((resolve) => {
    const request = database.transaction(BLOB_STORE_NAME, "readwrite").objectStore(BLOB_STORE_NAME).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
}

export async function getBrowserStorageStatus(): Promise<BrowserStorageStatus> {
  if (typeof navigator === "undefined" || !navigator.storage) {
    return { available: false, usage: 0, quota: 0, remaining: 0, persistent: false };
  }
  const [estimate, persistent] = await Promise.all([
    navigator.storage.estimate().catch(() => ({ usage: 0, quota: 0 })),
    navigator.storage.persisted?.().catch(() => false) ?? Promise.resolve(false),
  ]);
  const usage = estimate.usage ?? 0;
  const quota = estimate.quota ?? 0;
  return { available: quota > 0, usage, quota, remaining: Math.max(0, quota - usage), persistent };
}

export async function prepareBrowserProjectImport(bytes: number): Promise<BrowserStorageStatus> {
  const status = await getBrowserStorageStatus();
  if (status.available && bytes > status.remaining) {
    throw new Error(`This device has about ${formatBytes(status.remaining)} available for browser project storage, but the selected import needs ${formatBytes(bytes)}.`);
  }
  if (!status.persistent && typeof navigator !== "undefined" && navigator.storage?.persist) {
    await navigator.storage.persist().catch(() => false);
  }
  return getBrowserStorageStatus();
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
