import api from './client'
import { Store } from '../types'

export const storeApi = {
  getSettings: () => api.get<Store>('/store/settings').then(r => r.data),
  updateSettings: (data: Partial<Store>) => api.put<Store>('/store/settings', data).then(r => r.data),
  updateWeatherApiKey: (api_key: string) => api.post('/store/weather-api-key', { api_key }).then(r => r.data),
  getWeatherApiKeyStatus: () => api.get<{ has_key: boolean; masked: string }>('/store/weather-api-key-status').then(r => r.data),
}
