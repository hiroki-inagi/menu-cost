/**
 * 共有データストア（stale-while-revalidate）
 *
 * 目的:
 *   画面を「待たずに」表示する。ページを開いた瞬間に前回値が出て、
 *   最新データは裏で取得して差分だけ差し替える。
 *
 * 仕組み（household-budget の masterData.ts と同じ設計）:
 *   1. localStorage に永続化 → リロード直後・ログイン直後でも即座に前回値を表示
 *   2. 同じキーへの同時リクエストは 1 本に集約（in-flight 共有）
 *      → 例: 材料一覧を材料ページとレシピページが同時に要求しても API は1回
 *   3. 購読型なので、あるページで更新すると同じキーを見ている画面が即座に追従する
 *   4. 中身が変わったときだけ再描画を通知（無駄な再レンダーを防ぐ）
 *   5. ログアウト時に全消し（共用端末での情報漏れ防止）
 */

const CACHE_PREFIX = 'mc_cache_'

/** これより古いキャッシュは表示に使わない（それ以外は即表示し裏で更新） */
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24時間

/** これを過ぎたら「古い」とみなして裏で再取得する（表示自体はブロックしない） */
const STALE_MS = 60 * 1000 // 60秒

interface CacheEntry<T> {
  data: T
  timestamp: number
}

type Listener = () => void

export class SharedStore<T = unknown> {
  private entry: CacheEntry<T> | null
  private inFlight: Promise<T> | null = null
  private listeners = new Set<Listener>()

  constructor(private readonly key: string) {
    this.entry = this.readStorage()
  }

  // ── localStorage 連携 ──────────────────────────────────────────────────────

  private readStorage(): CacheEntry<T> | null {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + this.key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as CacheEntry<T>
      if (typeof parsed?.timestamp !== 'number') return null
      // 古すぎるキャッシュは捨てる
      if (Date.now() - parsed.timestamp > MAX_AGE_MS) return null
      return parsed
    } catch {
      return null
    }
  }

  private writeStorage(entry: CacheEntry<T>) {
    try {
      localStorage.setItem(CACHE_PREFIX + this.key, JSON.stringify(entry))
    } catch {
      // 容量超過などは無視（メモリキャッシュだけで動作する）
    }
  }

  // ── 購読 ──────────────────────────────────────────────────────────────────

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  private emit() {
    this.listeners.forEach((fn) => fn())
  }

  // ── 読み取り ──────────────────────────────────────────────────────────────

  /** 現在の値（無ければ null）。同期的に返るので待ち時間ゼロ。 */
  get(): T | null {
    return this.entry ? this.entry.data : null
  }

  hasData(): boolean {
    return this.entry !== null
  }

  private isStale(): boolean {
    return !this.entry || Date.now() - this.entry.timestamp > STALE_MS
  }

  // ── 更新 ──────────────────────────────────────────────────────────────────

  /** 実際に取得してキャッシュを更新する（同時呼び出しは 1 本に集約） */
  private load(fetcher: () => Promise<T>): Promise<T> {
    if (this.inFlight) return this.inFlight

    this.inFlight = fetcher()
      .then((data) => {
        const prev = this.entry ? JSON.stringify(this.entry.data) : null
        this.entry = { data, timestamp: Date.now() }
        this.writeStorage(this.entry)
        if (prev !== JSON.stringify(data)) this.emit()
        return data
      })
      .finally(() => { this.inFlight = null })

    return this.inFlight
  }

  /** 古ければ裏で取得する。返り値は待たなくてよい。 */
  revalidate(fetcher: () => Promise<T>, force = false): Promise<T | null> {
    if (!force && !this.isStale()) return Promise.resolve(this.get())
    return this.load(fetcher).catch(() => this.get()) // 失敗時は既存キャッシュを維持
  }

  /** 書き込み後などにローカルを即時更新する（楽観的更新） */
  setLocal(data: T) {
    this.entry = { data, timestamp: Date.now() }
    this.writeStorage(this.entry)
    this.emit()
  }

  /**
   * データは残したまま「古い」印だけ付ける。
   * 次に表示されたとき、前回値を即座に出しつつ裏で最新化する
   * （clear と違って画面が一瞬空白になったりスピナーに戻ったりしない）。
   */
  markStale() {
    if (!this.entry) return
    this.entry = { data: this.entry.data, timestamp: 0 }
    this.writeStorage(this.entry)
  }

  /** キャッシュを破棄する（次回アクセス時に再取得される） */
  clear() {
    this.entry = null
    this.inFlight = null
    try { localStorage.removeItem(CACHE_PREFIX + this.key) } catch { /* noop */ }
    this.emit()
  }
}

// ─── レジストリ ───────────────────────────────────────────────────────────────

const registry = new Map<string, SharedStore<any>>()

export function getStore<T>(key: string): SharedStore<T> {
  let store = registry.get(key)
  if (!store) {
    store = new SharedStore<T>(key)
    registry.set(key, store)
  }
  return store as SharedStore<T>
}

/** 指定キー（省略時は全キー）のキャッシュを破棄する */
export function invalidate(key?: string) {
  if (key) {
    getStore(key).clear()
    return
  }
  registry.forEach((s) => s.clear())
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  } catch { /* noop */ }
}

/** 取得済みデータでキャッシュを上書きする（保存直後の即反映用） */
export function primeStore<T>(key: string, data: T) {
  getStore<T>(key).setLocal(data)
}

/**
 * データは残したまま再取得対象にする。
 * 「他画面の変更を次回表示時に反映したいが、画面を空にはしたくない」場合に使う。
 */
export function markStale(key: string) {
  getStore(key).markStale()
}
