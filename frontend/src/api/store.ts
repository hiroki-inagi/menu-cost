import api from './client'
import { Store } from '../types'

export const storeApi = {
  getSettings: () => api.get<Store>('/store/settings').then(r => r.data),
  updateSettings: (data: Partial<Store>) => api.put<Store>('/store/settings', data).then(r => r.data),
  updateWeatherApiKey: (api_key: string) => api.post('/store/weather-api-key', { api_key }).then(r => r.data),
  getWeatherApiKeyStatus: () => api.get<{ has_key: boolean; masked: string }>('/store/weather-api-key-status').then(r => r.data),
  getInviteCode: () => api.get<{ invite_code: string; store_name: string }>('/store/invite-code').then(r => r.data),
  regenerateInviteCode: () => api.post<{ invite_code: string }>('/store/invite-code/regenerate').then(r => r.data),
  getMembers: () => api.get<StoreMember[]>('/store/members').then(r => r.data),
  // mode='remove': 店舗から外すだけ / mode='delete': アカウントごと完全削除
  removeMember: (userId: string, mode: 'remove' | 'delete') =>
    api.delete(`/store/members/${userId}`, { params: { mode } }).then(r => r.data),
  // メール送信設定の確認とテスト送信
  getMailStatus: () => api.get<MailStatus>('/store/mail-status').then(r => r.data),
  sendTestMail: () => api.post<{ ok: boolean; sent_to: string }>('/store/mail-test').then(r => r.data),
}

export interface MailStatus {
  configured: boolean
  host: string
  from_address: string
  frontend_url: string
}

export interface StoreMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'staff'
  created_at: string
}
