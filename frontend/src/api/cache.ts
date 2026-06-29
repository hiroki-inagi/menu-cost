/**
 * stale-while-revalidate キャッシュユーティリティ
 * - キャッシュがあれば即座に返す（表示が瞬時になる）
 * - 裏でAPIを叩いて新しいデータに更新する
 */

const CACHE_PREFIX = 'mc_cache_'
const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5分

interface CacheEntry<T> {
  data: T
  timestamp: number
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    // 5分以上古いキャッシュは無視
    if (Date.now() - entry.timestamp > DEFAULT_TTL_MS) return null
    return entry.data
  } catch {
    return null
  }
}

export function setCached<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // localStorage がいっぱいの場合は無視
  }
}

export function clearCache(key?: string): void {
  if (key) {
    localStorage.removeItem(CACHE_PREFIX + key)
  } else {
    // 全キャッシュを削除
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  }
}
