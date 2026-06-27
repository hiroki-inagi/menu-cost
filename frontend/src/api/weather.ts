import api from './client'
import { TodayWeather } from '../types'

export const weatherApi = {
  today: () => api.get<TodayWeather>('/weather/today').then(r => r.data),
}
