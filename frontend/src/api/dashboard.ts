import api from './client'

export const dashboardApi = {
  // summary + cost-ranking + category-breakdown を1リクエストで取得（爆速表示用）
  all: () => api.get('/dashboard/all').then(r => r.data),
  summary: () => api.get('/dashboard/summary').then(r => r.data),
  costRanking: () => api.get('/dashboard/cost-ranking').then(r => r.data),
  categoryBreakdown: () => api.get('/dashboard/category-breakdown').then(r => r.data),
}
