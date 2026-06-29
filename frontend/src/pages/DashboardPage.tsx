import { useEffect, useState } from 'react'
import { dashboardApi } from '../api/dashboard'
import { weatherApi } from '../api/weather'
import { salesApi } from '../api/sales'
import { TodayWeather, TodayRecommend } from '../types'
import CostRateBadge from '../components/common/CostRateBadge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AlertTriangle, BookOpen, Leaf, TrendingUp, Cloud } from 'lucide-react'
import { useCachedFetch } from '../hooks/useCachedFetch'

const WEATHER_ICON: Record<string, string> = {
  Clear: '☀️', Clouds: '⛅', Rain: '🌧️', Drizzle: '🌦️', Snow: '❄️',
  Thunderstorm: '⛈️', Mist: '🌫️', Fog: '🌫️',
}

export default function DashboardPage() {
  const { data: summary } = useCachedFetch('dashboard_summary', () => dashboardApi.summary())
  const { data: rankingRaw } = useCachedFetch('dashboard_ranking', () => dashboardApi.costRanking())
  const { data: breakdownRaw } = useCachedFetch('dashboard_breakdown', () => dashboardApi.categoryBreakdown())
  const ranking: any[] = (rankingRaw as any[] | null)?.slice(0, 8) ?? []
  const breakdown: any[] = (breakdownRaw as any[] | null) ?? []
  const [weather, setWeather] = useState<TodayWeather | null>(null)
  const [recommends, setRecommends] = useState<TodayRecommend[]>([])

  useEffect(() => {
    weatherApi.today().then(w => { setWeather(w); salesApi.todayRecommend().then(setRecommends) }).catch(() => {})
  }, [])

  const kpis = summary ? [
    { label: 'メニュー数', value: summary.total_recipes, icon: BookOpen, color: 'text-blue-400' },
    { label: '平均原価率', value: summary.avg_cost_rate ? (summary.avg_cost_rate * 100).toFixed(1) + '%' : '—', icon: TrendingUp, color: 'text-orange-400' },
    { label: '要改善メニュー', value: summary.danger_count + '件', icon: AlertTriangle, color: 'text-red-400' },
    { label: '食材登録数', value: summary.total_ingredients + '品', icon: Leaf, color: 'text-green-400' },
  ] : []

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold">ダッシュボード</h1>
        <p className="text-gray-400 text-sm mt-1">店舗の原価状況をひと目で確認</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <k.icon className={`w-4 h-4 ${k.color}`} />
              <span className="text-xs text-gray-400">{k.label}</span>
            </div>
            <div className="text-2xl font-bold">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 原価率ランキング */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-4 text-sm text-gray-300">メニュー別原価率（高い順）</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ranking} layout="vertical" margin={{ left: 80, right: 20 }}>
              <XAxis type="number" tickFormatter={v => (v * 100).toFixed(0) + '%'} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis type="category" dataKey="recipe_name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={80} />
              <Tooltip formatter={(v: number) => [(v * 100).toFixed(1) + '%', '原価率']} contentStyle={{ background: '#1f2937', border: '1px solid #374151' }} />
              <Bar dataKey="cost_rate" radius={[0, 4, 4, 0]}>
                {ranking.map((r, i) => (
                  <Cell key={i} fill={r.status === 'danger' ? '#ef4444' : r.status === 'warning' ? '#f59e0b' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 天気パネル */}
        <div className="space-y-4">
          {weather && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Cloud className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-gray-300">今日の天気</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{WEATHER_ICON[weather.condition] || '🌡️'}</span>
                <div>
                  <div className="font-semibold">{weather.condition_label}</div>
                  <div className="text-sm text-gray-400">{weather.temp_min}℃ / {weather.temp_max}℃</div>
                  {weather.city && <div className="text-xs text-gray-500">{weather.city}</div>}
                </div>
              </div>
            </div>
          )}
          {recommends.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">今日のおすすめ</h3>
              <div className="space-y-2">
                {recommends.slice(0, 3).map((r, i) => (
                  <div key={r.recipe_id} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-orange-500">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.recipe_name}</div>
                      <div className="text-xs text-gray-500 truncate">{r.reason}</div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      r.confidence === 'high' ? 'bg-green-900 text-green-400' :
                      r.confidence === 'medium' ? 'bg-yellow-900 text-yellow-400' : 'bg-gray-800 text-gray-400'
                    }`}>{r.confidence === 'high' ? '確実' : r.confidence === 'medium' ? '普通' : '参考'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* カテゴリ別 */}
      {breakdown.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-4 text-sm text-gray-300">カテゴリ別 平均原価率</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {breakdown.map((b: any) => (
              <div key={b.category} className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">{b.category}</div>
                <div className="flex items-center gap-2">
                  <CostRateBadge rate={b.avg_cost_rate} />
                  <span className="text-xs text-gray-500">{b.recipe_count}品</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
