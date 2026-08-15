import { uploadToCloud, getFromCloud, deleteFromCloud, getCloudStorageStatus } from "./cloudStorage"

const STORAGE_KEY = "sk_files"
const METADATA_KEY = "sk_metadata"
const QUOTA_BYTES = parseInt(import.meta.env.VITE_STORAGE_QUOTA_BYTES || "150000000000")
const WARN_PERCENT = parseInt(import.meta.env.VITE_STORAGE_WARN_PERCENT || "80")
const CRITICAL_PERCENT = parseInt(import.meta.env.VITE_STORAGE_CRITICAL_PERCENT || "90")
const TTL_HOURS = parseInt(import.meta.env.VITE_TEMP_FILE_TTL_HOURS || "72")
const CLOUD_THRESHOLD = 100 * 1024 * 1024 * 1024

interface FileMetadata {
  path: string
  size: number
  createdAt: number
  isTemp: boolean
  expiresAt?: number
  location: "cloud" | "indexdb"
}

interface StorageStatus {
  used: number
  total: number
  percent: number
  status: "ok" | "warning" | "critical"
  cloudUsed: number
  indexdbUsed: number
}

let db: IDBDatabase | null = null

async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open("SKCoderDB", 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains("files")) {
        database.createObjectStore("files", { keyPath: "path" })
      }
      if (!database.objectStoreNames.contains("metadata")) {
        database.createObjectStore("metadata", { keyPath: "path" })
      }
    }
  })
}

async function cleanExpiredFiles(): Promise<void> {
  try {
    const database = await initDB()
    const tx = database.transaction("metadata", "readwrite")
    const store = tx.objectStore("metadata")
    const allMetadata = await new Promise<FileMetadata[]>((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })

    const now = Date.now()
    for (const meta of allMetadata) {
      if (meta.expiresAt && meta.expiresAt < now) {
        await deleteFile(meta.path)
      }
    }
  } catch (e) {
    console.error("Error cleaning expired files:", e)
  }
}

export async function saveFile(path: string, content: string, isTemp = false): Promise<void> {
  const size = new Blob([content]).size
  const cloudStatus = await getCloudStorageStatus()
  let location: "cloud" | "indexdb" = "cloud"

  if (cloudStatus.used + size > CLOUD_THRESHOLD) {
    location = "indexdb"
  }

  const metadata: FileMetadata = {
    path,
    size,
    createdAt: Date.now(),
    isTemp,
    expiresAt: isTemp ? Date.now() + TTL_HOURS * 3600000 : undefined,
    location,
  }

  if (location === "cloud") {
    const cloudSuccess = await uploadToCloud(path, content)
    if (!cloudSuccess) {
      location = "indexdb"
    }
  }

  const database = await initDB()
  const tx = database.transaction(["files", "metadata"], "readwrite")

  if (location === "indexdb") {
    tx.objectStore("files").put({ path, content })
  }

  tx.objectStore("metadata").put(metadata)

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })

  await cleanExpiredFiles()
}

export async function getFile(path: string): Promise<string | null> {
  const database = await initDB()
  const tx = database.transaction("metadata", "readonly")
  const metaStore = tx.objectStore("metadata")

  const metadata = await new Promise<FileMetadata | undefined>((resolve, reject) => {
    const req = metaStore.get(path)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  if (!metadata) return null

  if (metadata.location === "cloud") {
    return await getFromCloud(path)
  }

  const filesTx = database.transaction("files", "readonly")
  const filesStore = filesTx.objectStore("files")

  return new Promise((resolve, reject) => {
    const req = filesStore.get(path)
    req.onsuccess = () => resolve(req.result?.content || null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteFile(path: string): Promise<void> {
  const database = await initDB()
  const tx = database.transaction(["files", "metadata"], "readwrite")

  const metaStore = tx.objectStore("metadata")
  const metadata = await new Promise<FileMetadata | undefined>((resolve, reject) => {
    const req = metaStore.get(path)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  if (metadata?.location === "cloud") {
    await deleteFromCloud(path)
  }

  tx.objectStore("files").delete(path)
  tx.objectStore("metadata").delete(path)

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const database = await initDB()
  const tx = database.transaction("metadata", "readonly")
  const store = tx.objectStore("metadata")

  const allMetadata = await new Promise<FileMetadata[]>((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  const cloudUsed = allMetadata.filter(m => m.location === "cloud").reduce((sum, m) => sum + m.size, 0)
  const indexdbUsed = allMetadata.filter(m => m.location === "indexdb").reduce((sum, m) => sum + m.size, 0)
  const used = cloudUsed + indexdbUsed
  const percent = Math.round((used / QUOTA_BYTES) * 100)
  let status: "ok" | "warning" | "critical" = "ok"

  if (percent >= CRITICAL_PERCENT) status = "critical"
  else if (percent >= WARN_PERCENT) status = "warning"

  return { used, total: QUOTA_BYTES, percent, status, cloudUsed, indexdbUsed }
}

export async function offloadToUserDevice(path: string): Promise<Blob | null> {
  const content = await getFile(path)
  if (!content) return null
  return new Blob([content], { type: "application/octet-stream" })
}

export async function getAllFiles(): Promise<FileMetadata[]> {
  const database = await initDB()
  const tx = database.transaction("metadata", "readonly")
  const store = tx.objectStore("metadata")

  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
