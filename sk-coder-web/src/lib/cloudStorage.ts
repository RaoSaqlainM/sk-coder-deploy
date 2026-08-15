const CLOUD_API_URL = import.meta.env.VITE_API_URL || "/api"
const STORAGE_THRESHOLD = 100 * 1024 * 1024 * 1024

export interface CloudStorageStatus {
  used: number
  total: number
  percent: number
  canStore: boolean
}

export async function getCloudStorageStatus(): Promise<CloudStorageStatus> {
  try {
    const res = await fetch(`${CLOUD_API_URL}/storage/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (!res.ok) {
      return { used: 0, total: 150 * 1024 * 1024 * 1024, percent: 0, canStore: true }
    }

    const data = await res.json() as { used: number; total: number }
    const percent = Math.round((data.used / data.total) * 100)
    const canStore = data.used < STORAGE_THRESHOLD

    return { used: data.used, total: data.total, percent, canStore }
  } catch {
    return { used: 0, total: 150 * 1024 * 1024 * 1024, percent: 0, canStore: true }
  }
}

export async function uploadToCloud(path: string, content: string): Promise<boolean> {
  try {
    const status = await getCloudStorageStatus()

    if (!status.canStore) {
      return false
    }

    const res = await fetch(`${CLOUD_API_URL}/storage/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content, isTemp: false }),
    })

    return res.ok
  } catch {
    return false
  }
}

export async function getFromCloud(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${CLOUD_API_URL}/storage/download?path=${encodeURIComponent(path)}`, {
      method: "GET",
    })

    if (!res.ok) return null

    const data = await res.json() as { content: string }
    return data.content
  } catch {
    return null
  }
}

export async function deleteFromCloud(path: string): Promise<boolean> {
  try {
    const res = await fetch(`${CLOUD_API_URL}/storage/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    })

    return res.ok
  } catch {
    return false
  }
}
