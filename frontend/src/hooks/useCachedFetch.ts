/**
 * stale-while-revalidate フック
 *
 * 使い方:
 *   const { data, loading } = useCachedFetch('dashboard_summary', () => dashboardApi.summary())
 *
 * - キャッシュがあれば loading=false で即座にデータ表示
 * - 裏でAPIを叩いてデータを更新
 */
import { useState, useEffect, useRef } from 'react'
import { getCached, setCached } from '../api/cache'

interface Options {
  enabled?: boolean // false にすると取得しない
}

export function useCachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: Options = {}
) {
  const { enabled = true } = options
  const cached = getCached<T>(cacheKey)

  const [data, setData] = useState<T | null>(cached)
  const [loading, setLoading] = useState<boolean>(cached === null)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  useEffect(() => {
    if (!enabled) return

    // キャッシュがなければローディング表示
    if (cached === null) setLoading(true)

    fetcher()
      .then((fresh) => {
        if (!isMounted.current) return
        setCached(cacheKey, fresh)
        setData(fresh)
        setLoading(false)
      })
      .catch((err) => {
        if (!isMounted.current) return
        setError(err)
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled])

  return { data, loading, error }
}
