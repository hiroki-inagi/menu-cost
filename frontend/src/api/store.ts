import api from './client'
import { Store } from '../types'

export const storeApi = {
  getSettings: () => api.get<Store>('/store/settings').then(r => r.data),
  updateSettings: (data: Partial<Store>) => api.put<Store>('/store/settings', data).then(r => r.data),
}
