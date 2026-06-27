import api from './client'
import { Recipe } from '../types'

export const recipeApi = {
  list: (params?: { category?: string; active_only?: boolean }) =>
    api.get<Recipe[]>('/recipes', { params }).then(r => r.data),
  get: (id: string) => api.get<Recipe>(`/recipes/${id}`).then(r => r.data),
  create: (data: any) => api.post<Recipe>('/recipes', data).then(r => r.data),
  update: (id: string, data: any) => api.put<Recipe>(`/recipes/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/recipes/${id}`).then(r => r.data),
  addIngredient: (id: string, data: { ingredient_id: string; quantity: number; yield_rate: number }) =>
    api.post<Recipe>(`/recipes/${id}/ingredients`, data).then(r => r.data),
  removeIngredient: (id: string, riId: string) =>
    api.delete<Recipe>(`/recipes/${id}/ingredients/${riId}`).then(r => r.data),
}
