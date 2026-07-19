import api from './client'
import { User } from '../types'

export const authApi = {
  register: (data: { email: string; password: string; name: string; store_name?: string; invite_code?: string }) =>
    api.post<User>('/auth/register', data).then(r => r.data),
  // 招待コードから参加先の店舗名を確認する(登録前のプレビュー用)
  lookupInviteCode: (code: string) =>
    api.get<{ store_name: string }>(`/auth/invite-code/${encodeURIComponent(code)}`).then(r => r.data),
  login: (email: string, password: string) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    return api.post<{ access_token: string }>('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }).then(r => r.data)
  },
  me: () => api.get<User>('/auth/me').then(r => r.data),
  changePassword: (current_password: string, new_password: string) =>
    api.post<{ message: string }>('/auth/change-password', { current_password, new_password }).then(r => r.data),
  // サーバーのウォームアップ用(Renderコールドスタート対策)
  ping: () => api.get('/health').then(r => r.data),
}
