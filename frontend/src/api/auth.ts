import api from './client'
import { User } from '../types'

export const authApi = {
  register: (data: { email: string; password: string; name: string; store_name?: string }) =>
    api.post<User>('/auth/register', data).then(r => r.data),
  login: (email: string, password: string) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    return api.post<{ access_token: string }>('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }).then(r => r.data)
  },
  me: () => api.get<User>('/auth/me').then(r => r.data),
  // サーバーのウォームアップ用(Renderコールドスタート対策)
  ping: () => api.get('/health').then(r => r.data),
}
