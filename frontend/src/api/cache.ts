/**
 * stale-while-revalidate キャッシュユーティリティ
 *
 * 実体は store/dataStore.ts の共有ストア。
 * ここは既存コードから使われている関数名を維持するための薄いラッパー。
 *
 * 従来との違い:
 *   - setCached / clearCache が「同じキーを見ている全画面」に即座に反映される
 *   - 同じキーへの同時リクエストが1本にまとまる
 */
import { getStore, invalidate, markStale, primeStore } from '../store/dataStore'

export function getCached<T>(key: string): T | null {
  return getStore<T>(key).get()
}

/** 取得済みデータでキャッシュを更新する（購読中の画面へ即反映される） */
export function setCached<T>(key: string, data: T): void {
  primeStore<T>(key, data)
}

/** キー指定で破棄。省略時は全キャッシュを破棄（ログアウト時など） */
export function clearCache(key?: string): void {
  invalidate(key)
}

/**
 * データを残したまま再取得対象にする（推奨）。
 * clearCache と違い、次に開いたとき前回値が即表示されてから最新化される。
 */
export function invalidateCache(key: string): void {
  markStale(key)
}
