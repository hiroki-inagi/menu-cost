import api from './client'
import { DailySales, RankingItem, WeekdayHeatmapItem, WeatherSalesItem, TodayRecommend } from '../types'

export const salesApi = {
  getDaily: (date?: string) => api.get<DailySales[]>('/sales/daily', { params: { sold_date: date } }).then(r => r.data),
  upsertDaily: (data: { sold_date: string; entries: { recipe_id: string; quantity: number }[] }) =>
    api.post('/sales/daily', data).then(r => r.data),
  ranking: (period: 'day' | 'week' | 'month', ref_date?: string) =>
    api.get<RankingItem[]>('/sales/analysis/ranking', { params: { period, ref_date } }).then(r => r.data),
  byWeekday: () => api.get<WeekdayHeatmapItem[]>('/sales/analysis/by-weekday').then(r => r.data),
  byWeather: (condition?: string) =>
    api.get<WeatherSalesItem[]>('/sales/analysis/by-weather', { params: { condition } }).then(r => r.data),
  todayRecommend: () => api.get<TodayRecommend[]>('/sales/analysis/today-recommend').then(r => r.data),
  weatherCorrelation: (recipe_id: string) =>
    api.get('/sales/analysis/weather-correlation', { params: { recipe_id } }).then(r => r.data),
}
