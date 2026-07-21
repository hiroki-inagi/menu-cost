/**
 * stale-while-revalidate フック
 *
 * 使い方（従来と同じ）:
 *   const { data, loading } = useCachedFetch('dashboard_all', () => dashboardApi.all())
 *
 * - キャッシュがあれば loading=false で即座にデータ表示（待ち時間ゼロ）
 * - 裏でAPIを叩いて最新化。中身が変わったときだけ再描画する
 * - 同じキーを複数ページが使っても API 呼び出しは1本に集約される
 * - 他の画面が同じキーを更新すると即座に追従する（購読型）
 */
import { useEffect, useRef, useState } from 'react'
import { getStore } from '../store/dataStore'

interface Options {
  enabled?: boolean
}

export function useCachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: Options = {}
) {
  const { enabled = true } = options

  const store = getStore<T>(cacheKey)

  // cacheKey が変わるたびに最新キャッシュを即反映するため関数初期化
  const [data, setData] = useState<T | null>(() => store.get())
  const [loading, setLoading] = useState<boolean>(() => store.get() === null)

  // fetcher は毎レンダー新しい関数になるため ref に逃がす（依存配列に入れない）
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    if (!enabled) return

    let alive = true
    const current = getStore<T>(cacheKey)

    // キー変更時: 新しいキーのキャッシュがあれば即表示、なければローディング
    const cached = current.get()
    setData(cached)
    setLoading(cached === null)

    // 同じキーの更新を購読（他画面での保存も即座に反映される）
    const unsubscribe = current.subscribe(() => {
      if (!alive) return
      setData(current.get())
      setLoading(false)
    })

    // 古ければ裏で再取得（同時呼び出しは1本に集約される）
    current
      .revalidate(() => fetcherRef.current())
      .then(() => { if (alive) setLoading(false) })
      .catch(() => { if (alive) setLoading(false) })

    return () => {
      alive = false
      unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled])

  return { data, loading }
}
