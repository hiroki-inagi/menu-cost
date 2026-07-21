/**
 * セッション（トークン）の保存・破棄をまとめる。
 * ログイン / 登録 / ログアウトで同じ処理を使うことで、消し忘れによる不具合を防ぐ。
 */
import { clearCache } from './cache'

export const USER_CACHE_KEY = 'mc_user'

/** ログイン成功時: トークンを永続化する */
export function saveSession(tokens: { access_token: string; refresh_token?: string }) {
  localStorage.setItem('token', tokens.access_token)
  if (tokens.refresh_token) localStorage.setItem('refresh_token', tokens.refresh_token)
}

/** ログアウト時: トークンと全キャッシュを破棄する（共用端末での情報漏れ防止） */
export function clearSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem(USER_CACHE_KEY)
  clearCache()
}
