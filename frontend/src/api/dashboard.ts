import api from './client'

export const dashboardApi = {
  summary: () => api.get('/dashboard/summary').then(r => r.data),
  costRanking: () => api.get('/dashboard/cost-ranking').then(r => r.data),
  categoryBreakdown: () => api.get('/dashboard/category-breakdown').then(r => r.data),
}
