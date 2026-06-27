import api from './client'
import { Ingredient, PriceHistory } from '../types'

export const ingredientApi = {
  list: (params?: { category?: string; q?: string }) =>
    api.get<Ingredient[]>('/ingredients', { params }).then(r => r.data),
  get: (id: string) => api.get<Ingredient>(`/ingredients/${id}`).then(r => r.data),
  create: (data: Omit<Ingredient, 'id' | 'created_at' | 'updated_at' | 'recipe_count'>) =>
    api.post<Ingredient>('/ingredients', data).then(r => r.data),
  update: (id: string, data: Partial<Ingredient>) =>
    api.put<Ingredient>(`/ingredients/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/ingredients/${id}`).then(r => r.data),
  priceHistory: (id: string) => api.get<PriceHistory[]>(`/ingredients/${id}/price-history`).then(r => r.data),
}
