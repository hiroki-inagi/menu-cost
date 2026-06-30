/**
 * stale-while-revalidate フック
 *
 * 使い方:
 *   const { data, loading } = useCachedFetch('dashboard_summary', () => dashboardApi.summary())
 *
 * - キャッシュがあれば loading=false で即座にデータ表示
 * - 裏でAPIを叩いてデータを更新
 * - cacheKey が変わったとき（例: 期間切り替え）も新しいキャッシュを即座に反映
 */
import { useState, useEffect, useRef } from 'react'
import { getCached, setCached } from '../api/cache'

interface Options {
  enabled?: boolean
}

export function useCachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: Options = {}
) {
  const { enabled = true } = options

  // cacheKey が変わるたびに最新キャッシュを即反映するため関数初期化
  const [data, setData] = useState<T | null>(() => getCached<T>(cacheKey))
  const [loading, setLoading] = useState<boolean>(() => getCached<T>(cacheKey) === null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  useEffect(() => {
    if (!enabled) return

    // キー変更時: 新しいキーのキャッシュがあれば即表示、なければローディング
    const cached = getCached<T>(cacheKey)
    if (cached !== null) {
      setData(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    fetcher()
      .then((fresh) => {
        if (!isMounted.current) return
        setCached(cacheKey, fresh)
        setData(fresh)
        setLoading(false)
      })
      .catch(() => {
        if (!isMounted.current) return
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled])

  return { data, loading }
}
