import api from './client'
import { Supplier } from '../types'

export const supplierApi = {
  list: () => api.get<Supplier[]>('/suppliers').then(r => r.data),
  create: (data: { name: string; contact?: string; note?: string }) =>
    api.post<Supplier>('/suppliers', data).then(r => r.data),
  update: (id: string, data: Partial<Supplier>) =>
    api.put<Supplier>(`/suppliers/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/suppliers/${id}`).then(r => r.data),
}
