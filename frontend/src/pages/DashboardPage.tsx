import { useState, useMemo } from 'react'
import { dashboardApi } from '../api/dashboard'
import { weatherApi } from '../api/weather'
import { salesApi } from '../api/sales'
import { TodayWeather, TodayRecommend } from '../types'
import CostRateBadge from '../components/common/CostRateBadge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AlertTriangle, BookOpen, Leaf, TrendingUp, Cloud, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useCachedFetch } from '../hooks/useCachedFetch'

const WEATHER_ICON: Record<string, string> = {
  Clear: '☀️', Clouds: '⛅', Rain: '🌧️', Drizzle: '🌦️', Snow: '❄️',
  Thunderstorm: '⛈️', Mist: '🌫️', Fog: '🌫️',
}

const DOW_LABELS = ['月', '火', '水', '木', '金', '土', '日']

// 月カレンダー + 日別売上コンポーネント
function MonthlySalesCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(
    // デフォルトで今日を選択
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  )

  // キャッシュがあれば即表示、裏で最新データに更新
  const { data: monthData, loading } = useCachedFetch(
    `monthly_sales_${year}_${String(month).padStart(2, '0')}`,
    () => salesApi.monthlySales(year, month)
  ) as { data: any; loading: boolean }

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  // カレンダーのグリッドを生成
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    // 月曜始まりの空白
    const startDow = (firstDay.getDay() + 6) % 7 // 0=Mon
    const days: (number | null)[] = Array(startDow).fill(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d)
    // 週を埋める
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [year, month])

  // 日付→売上マップ
  const revenueMap = useMemo(() => {
    const map: Record<string, number> = {}
    if (!monthData) return map
    for (const d of monthData.daily) map[d.date] = d.total_revenue
    return map
  }, [monthData])

  const maxRevenue = useMemo(() => Math.max(...Object.values(revenueMap), 1), [revenueMap])

  const dateKey = (d: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // 選択日の詳細
  const selectedDetail = useMemo(() => {
    if (!selectedDate || !monthData) return null
    return monthData.daily.find((d: any) => d.date === selectedDate) || null
  }, [selectedDate, monthData])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      {/* ヘッダー：月ナビゲーション */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-gray-300">月次売上管理</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-sm font-medium text-gray-200 w-24 text-center">
            {year}年{month}月
          </span>
          <button
            onClick={nextMonth}
            disabled={year === today.getFullYear() && month === today.getMonth() + 1}
            className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); setSelectedDate(todayKey) }}
            className="ml-2 text-xs text-orange-400 hover:text-orange-300 border border-orange-800/50 hover:border-orange-600/60 px-2 py-0.5 rounded-lg transition-colors"
          >
            今月
          </button>
        </div>
      </div>

      {/* 月間サマリー */}
      {monthData && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">月間売上</div>
            <div className="font-mono font-bold text-orange-400 text-base">
              ¥{Math.round(monthData.total_revenue).toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">売上日数</div>
            <div className="font-mono font-bold text-gray-200 text-base">{monthData.sales_days}日</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">日平均</div>
            <div className="font-mono font-bold text-gray-200 text-base">
              ¥{Math.round(monthData.avg_daily_revenue).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* カレンダーグリッド */}
      <div>
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 mb-1">
          {DOW_LABELS.map((d, i) => (
            <div key={d} className={`text-center text-xs py-1 font-medium ${i === 5 ? 'text-blue-400' : i === 6 ? 'text-red-400' : 'text-gray-500'}`}>
              {d}
            </div>
          ))}
        </div>
        {/* 日付グリッド */}
        <div className={`grid grid-cols-7 gap-0.5 ${loading ? 'opacity-50' : ''}`}>
          {calendarDays.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />
            const dk = dateKey(day)
            const rev = revenueMap[dk] ?? 0
            const isToday = dk === todayKey
            const isSelected = dk === selectedDate
            const hasRevenue = rev > 0
            const barHeight = hasRevenue ? Math.max(3, Math.round((rev / maxRevenue) * 20)) : 0
            const dow = (idx % 7)
            return (
              <button
                key={dk}
                onClick={() => setSelectedDate(isSelected ? null : dk)}
                className={`relative flex flex-col items-center pt-1 pb-1 rounded-lg transition-colors min-h-[52px] text-xs
                  ${isSelected ? 'bg-orange-500/20 border border-orange-500/50' : 'hover:bg-gray-800/60 border border-transparent'}
                  ${isToday && !isSelected ? 'border border-orange-800/50' : ''}
                `}
              >
                <span className={`font-medium mb-1 ${
                  isToday ? 'text-orange-400' :
                  dow === 5 ? 'text-blue-400' :
                  dow === 6 ? 'text-red-400' :
                  'text-gray-300'
                }`}>{day}</span>
                {/* 売上バー */}
                {hasRevenue && (
                  <div className="w-full px-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-sm bg-orange-500/60"
                      style={{ height: `${barHeight}px` }}
                    />
                    <span className="text-gray-400 leading-none" style={{ fontSize: '9px' }}>
                      {rev >= 10000 ? `${(rev / 10000).toFixed(1)}万` : `¥${Math.round(rev / 1000)}k`}
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 選択日の詳細 */}
      {selectedDate && (
        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300">
              {selectedDate.replace(/-/g, '/')} の売上
            </h3>
            <button onClick={() => setSelectedDate(null)} className="text-gray-600 hover:text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          {selectedDetail ? (
            <div className="space-y-2">
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">合計売上</span>
                <span className="font-mono font-bold text-orange-400">
                  ¥{Math.round(selectedDetail.total_revenue).toLocaleString()}
                </span>
              </div>
              {selectedDetail.items.length > 0 && (
                <div className="space-y-1">
                  {selectedDetail.items
                    .sort((a: any, b: any) => b.revenue - a.revenue)
                    .map((item: any) => (
                      <div key={item.recipe_id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-gray-800/40 text-xs">
                        <span className="text-gray-300 truncate flex-1">{item.recipe_name}</span>
                        <span className="text-gray-500 mx-2">{item.quantity}個</span>
                        <span className="font-mono text-gray-200">¥{Math.round(item.revenue).toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-3">この日の売上データはありません</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  // summary/ranking/breakdown を1リクエストで一括取得（3往復→1往復に削減し爆速表示）
  const { data: dashAll } = useCachedFetch('dashboard_all', () => dashboardApi.all()) as {
    data: { summary: any; ranking: any[]; breakdown: any[] } | null
  }
  const summary = dashAll?.summary ?? null
  const ranking: any[] = (dashAll?.ranking ?? []).slice(0, 8)
  const breakdown: any[] = dashAll?.breakdown ?? []
  // 天気・おすすめもキャッシュから即表示し、裏で更新
  const { data: weather } = useCachedFetch<TodayWeather>('weather_today', () => weatherApi.today())
  const { data: recommendsData } = useCachedFetch<TodayRecommend[]>('today_recommend', () => salesApi.todayRecommend())
  const recommends: TodayRecommend[] = recommendsData ?? []

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

      {/* 月次売上カレンダー */}
      <MonthlySalesCalendar />

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
