/**
 * Axios HTTP クライアント
 *
 * 方針（household-budget と同じ）:
 *   1. アクセストークンを自動付与
 *   2. 401 が返ったらリフレッシュトークンで再発行し、元のリクエストを自動で再実行
 *      → 期限切れでログイン画面へ飛ばされることがなくなる
 *   3. リフレッシュは同時に何本 401 が来ても 1 回だけ実行（シングルトン）
 *   4. ネットワークエラー / タイムアウトは最大3回リトライ
 *      → Render のコールドスタート中でも画面が壊れない
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  // Render無料プランのコールドスタート(30〜60秒)に耐えられるよう延長
  timeout: 90000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── トークンリフレッシュ（シングルトン）─────────────────────────────────────

let _refreshPromise: Promise<string | null> | null = null

/** リフレッシュ専用インスタンス（メインのインターセプターを通さない） */
const _refreshClient = axios.create({ baseURL: BASE_URL, timeout: 90000 })

// ネットワークエラー時のみ最大2回リトライ。
// これが無いと、コールドスタート中の一瞬の切断で不要なログアウトが発生する。
_refreshClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    const cfg = error.config
    if (!error.response && cfg) {
      cfg._refreshRetry = cfg._refreshRetry ?? 0
      if (cfg._refreshRetry < 2) {
        cfg._refreshRetry += 1
        await new Promise((r) => setTimeout(r, 2000 * cfg._refreshRetry))
        return _refreshClient(cfg)
      }
    }
    return Promise.reject(error)
  }
)

/** ログアウト（トークンとキャッシュを消してログイン画面へ） */
const forceLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('mc_user')
  // 共用端末での情報漏れ防止: SWR キャッシュも全消し
  Object.keys(localStorage)
    .filter((k) => k.startsWith('mc_cache_'))
    .forEach((k) => localStorage.removeItem(k))
  if (window.location.pathname !== '/login') window.location.href = '/login'
}

const refreshAccessToken = (): Promise<string | null> => {
  if (_refreshPromise) return _refreshPromise // 進行中なら同じ Promise を共有する

  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    forceLogout()
    return Promise.resolve(null)
  }

  _refreshPromise = _refreshClient
    .post('/auth/refresh', { refresh_token: refreshToken })
    .then(({ data }) => {
      localStorage.setItem('token', data.access_token)
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
      return data.access_token as string
    })
    .catch(() => {
      // 2回リトライしても失敗＝トークンが本当に無効 → ログアウト
      forceLogout()
      return null
    })
    .finally(() => {
      _refreshPromise = null
    })

  return _refreshPromise
}

// ─── レスポンスインターセプター ──────────────────────────────────────────────

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config

    // ── ネットワークエラー / タイムアウト: 最大3回リトライ ──
    if (!error.response && config) {
      if (axios.isCancel(error)) return Promise.reject(error)
      config._retryCount = config._retryCount ?? 0
      if (config._retryCount < 3) {
        config._retryCount += 1
        // 5秒 → 10秒 → 15秒（Render の起動待ち）
        await new Promise((r) => setTimeout(r, config._retryCount * 5000))
        return api(config)
      }
    }

    const url: string = config?.url ?? ''
    const isAuthRequest =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh')
    const onLoginPage =
      window.location.pathname === '/login' || window.location.pathname === '/register'

    // ── 401: リフレッシュして元リクエストを再実行 ──
    if (error.response?.status === 401 && !isAuthRequest && !onLoginPage && !config._retry) {
      config._retry = true
      const newToken = await refreshAccessToken()
      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`
        return api(config)
      }
      // ログイン画面への遷移は refreshAccessToken 内で開始済み。
      // 解決しない Promise を返し、後続のエラー表示を止める。
      return new Promise(() => {})
    }

    return Promise.reject(error)
  }
)

export default api
