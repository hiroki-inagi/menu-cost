/**
 * stale-while-revalidate キャッシュユーティリティ
 * - キャッシュがあれば即座に返す（表示が瞬時になる）
 * - 裏でAPIを叩いて新しいデータに更新する
 */

const CACHE_PREFIX = 'mc_cache_'
// stale-while-revalidate: 表示は常にキャッシュから即時、裏でAPIが最新化するため
// TTLは長めでよい(古すぎるデータだけ捨てる)
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 24時間

interface CacheEntry<T> {
  data: T
  timestamp: number
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    // 24時間以上古いキャッシュのみ無視(それ以外は即表示し裏で更新)
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
