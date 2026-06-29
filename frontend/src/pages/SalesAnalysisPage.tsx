import { useEffect, useState } from 'react'
import { salesApi } from '../api/sales'
import { weatherApi } from '../api/weather'
import { recipeApi } from '../api/recipes'
import { RankingItem, WeekdayHeatmapItem, WeatherSalesItem, TodayWeather, Recipe } from '../types'
import { useCachedFetch } from '../hooks/useCachedFetch'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts'

const PERIOD_LABELS = { day: '今日', week: '今週', month: '今月' }
const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']
const WEATHER_OPTIONS = [
  { value: '', label: '全天気' },
  { value: 'Clear', label: '☀️ 晴れ' },
  { value: 'Clouds', label: '⛅ 曇り' },
  { value: 'Rain', label: '🌧️ 雨' },
  { value: 'Snow', label: '❄️ 雪' },
]
const WEATHER_ICON: Record<string, string> = { Clear: '☀️', Clouds: '⛅', Rain: '🌧️', Drizzle: '🌦️', Snow: '❄️', Thunderstorm: '⛈️' }

export default function SalesAnalysisPage() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [heatmap, setHeatmap] = useState<WeekdayHeatmapItem[]>([])
  const [weatherSales, setWeatherSales] = useState<WeatherSalesItem[]>([])
  const [weatherFilter, setWeatherFilter] = useState('')
  const [weather, setWeather] = useState<TodayWeather | null>(null)
  const [correlation, setCorrelation] = useState<any[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState('')
  const [activeTab, setActiveTab] = useState<'period' | 'weather' | 'heatmap'>('period')

  // 気温相関グラフ用（気温昇順ソート＋色計算）
  const correlationSorted = [...correlation].sort((a, b) => a.temp_max - b.temp_max)
  const corrMin = correlationSorted.length > 0 ? Math.min(...correlationSorted.map(d => d.quantity)) : 0
  const corrMax = correlationSorted.length > 0 ? Math.max(...correlationSorted.map(d => d.quantity)) : 1
  const corrColor = (qty: number) => {
    const ratio = corrMax === corrMin ? 0.5 : (qty - corrMin) / (corrMax - corrMin)
    const r = Math.round(59 + ratio * (249 - 59))
    const g = Math.round(130 + ratio * (115 - 130))
    const b = Math.round(246 + ratio * (22 - 246))
    return `rgb(${r},${g},${b})`
  }

  const { data: cachedHeatmap } = useCachedFetch('sales_heatmap', () => salesApi.byWeekday())
  const { data: cachedRecipes } = useCachedFetch('recipes_active', () => recipeApi.list({ active_only: true }))
  useEffect(() => { if (cachedHeatmap) setHeatmap(cachedHeatmap as WeekdayHeatmapItem[]) }, [cachedHeatmap])
  useEffect(() => { if (cachedRecipes) setRecipes(cachedRecipes as Recipe[]) }, [cachedRecipes])

  useEffect(() => { salesApi.ranking(period).then(setRanking) }, [period])
  useEffect(() => { salesApi.byWeather(weatherFilter || undefined).then(setWeatherSales) }, [weatherFilter])
  useEffect(() => { weatherApi.today().then(setWeather).catch(() => {}) }, [])
  useEffect(() => {
    if (selectedRecipe) salesApi.weatherCorrelation(selectedRecipe).then(setCorrelation)
  }, [selectedRecipe])

  // Heatmap データ整形
  const heatmapRecipes = [...new Set(heatmap.map(h => h.recipe_name))].slice(0, 10)
  const maxHeat = Math.max(...heatmap.map(h => h.total_quantity), 1)
  const [heatmapMetric, setHeatmapMetric] = useState<'qty' | 'revenue'>('qty')

  // Weather ranking by condition
  const topByWeather: Record<string, WeatherSalesItem[]> = {}
  weatherSales.forEach(w => {
    if (!topByWeather[w.condition]) topByWeather[w.condition] = []
    if (topByWeather[w.condition].length < 5) topByWeather[w.condition].push(w)
  })

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">売上分析</h1>
          {weather && (
            <p className="text-sm text-gray-400 mt-0.5">
              今日の天気: {WEATHER_ICON[weather.condition] || '🌡️'} {weather.condition_label} {weather.temp_min}℃/{weather.temp_max}℃
            </p>
          )}
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {(['period', 'weather', 'heatmap'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${activeTab === t ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
            {t === 'period' ? '期間別' : t === 'weather' ? '天気別' : '曜日別'}
          </button>
        ))}
      </div>

      {/* 期間別タブ */}
      {activeTab === 'period' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['day', 'week', 'month'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${period === p ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">{PERIOD_LABELS[period]}の販売数ランキング</h2>
            {ranking.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={ranking.slice(0, 10)} layout="vertical" margin={{ left: 100, right: 40 }}>
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis type="category" dataKey="recipe_name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                  <Tooltip
                    formatter={(v: number, name: string) => [v, name === 'total_quantity' ? '販売数' : '売上']}
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', fontSize: 12 }}
                  />
                  <Bar dataKey="total_quantity" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
                売上データがありません。「売上入力」から登録してください。
              </div>
            )}
          </div>
        </div>
      )}

      {/* 天気別タブ */}
      {activeTab === 'weather' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {WEATHER_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setWeatherFilter(o.value)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${weatherFilter === o.value ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                {o.label}
              </button>
            ))}
          </div>

          {weatherFilter === '' ? (
            // 天気ごとランキング
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(topByWeather).map(([cond, items]) => (
                <div key={cond} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span>{WEATHER_ICON[cond] || '🌡️'}</span>
                    <span>{items[0]?.condition_label || cond}</span>
                  </h3>
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={item.recipe_id} className="flex items-center gap-3 text-sm">
                        <span className="text-orange-500 font-bold w-4">{i + 1}</span>
                        <span className="flex-1 truncate">{item.recipe_name}</span>
                        <span className="text-gray-400 text-xs font-mono">平均 {item.avg_quantity}食</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(topByWeather).length === 0 && (
                <div className="col-span-2 py-12 text-center text-gray-500 text-sm">
                  天気×売上データがありません。売上を登録し、店舗設定で都市名を設定してください。
                </div>
              )}
            </div>
          ) : (
            // 特定天気でのランキング
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weatherSales.slice(0, 10)} layout="vertical" margin={{ left: 100, right: 40 }}>
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis type="category" dataKey="recipe_name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', fontSize: 12 }}
                    formatter={(v: number) => [v.toFixed(1) + '食', '平均販売数']} />
                  <Bar dataKey="avg_quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 気温×売上 散布図 */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">気温×販売数 相関</h3>
              <select value={selectedRecipe} onChange={e => setSelectedRecipe(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500">
                <option value="">メニューを選択</option>
                {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            {correlation.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={correlationSorted} margin={{ left: 0, right: 8, bottom: 16 }}>
                  <XAxis dataKey="temp_max" unit="℃" tick={{ fill: '#6b7280', fontSize: 11 }}
                    label={{ value: '最高気温', position: 'insideBottom', offset: -8, fill: '#6b7280', fontSize: 11 }} />
                  <YAxis unit="食" tick={{ fill: '#6b7280', fontSize: 11 }} width={36} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', fontSize: 12 }}
                    formatter={(v: number) => [`${v}食`, '販売数']}
                    labelFormatter={(l: number) => `気温 ${l}℃`}
                  />
                  <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                    {correlationSorted.map((d, i) => (
                      <Cell key={i} fill={corrColor(d.quantity)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
            ) : (
              <div className="h-24 flex items-center justify-center text-gray-500 text-sm">
                {selectedRecipe ? 'データが不足しています' : 'メニューを選択してください'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 曜日別ヒートマップ */}
      {activeTab === 'heatmap' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">曜日別 メニュー分析</h2>
            <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
              <button onClick={() => setHeatmapMetric('qty')}
                className={`px-3 py-1 rounded text-xs transition-colors ${heatmapMetric === 'qty' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                販売数
              </button>
              <button onClick={() => setHeatmapMetric('revenue')}
                className={`px-3 py-1 rounded text-xs transition-colors ${heatmapMetric === 'revenue' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                売上金額
              </button>
            </div>
          </div>
          {heatmapRecipes.length > 0 ? (() => {
            const maxVal = heatmapMetric === 'qty'
              ? Math.max(...heatmap.map(h => h.total_quantity), 1)
              : Math.max(...heatmap.map(h => h.total_revenue), 1)
            return (
              <div className="overflow-x-auto">
                {/* 曜日ヘッダー */}
                <div className="grid text-xs text-gray-400 mb-1" style={{ gridTemplateColumns: '9rem repeat(7, 1fr)' }}>
                  <div></div>
                  {['月','火','水','木','金','土','日'].map((d, i) => (
                    <div key={d} className={`text-center font-medium py-1 ${i >= 5 ? 'text-orange-400' : ''}`}>{d}</div>
                  ))}
                </div>
                {/* メニュー行 */}
                <div className="space-y-1.5">
                  {heatmapRecipes.map(recipe => (
                    <div key={recipe} className="grid items-center gap-1" style={{ gridTemplateColumns: '9rem repeat(7, 1fr)' }}>
                      <div className="text-xs text-gray-300 truncate pr-2">{recipe}</div>
                      {[0,1,2,3,4,5,6].map(dow => {
                        const cell = heatmap.find(h => h.recipe_name === recipe && h.day_of_week === dow)
                        const val = heatmapMetric === 'qty' ? (cell?.total_quantity || 0) : (cell?.total_revenue || 0)
                        const intensity = val > 0 ? 0.15 + (val / maxVal) * 0.85 : 0
                        const isWeekend = dow >= 5
                        const color = isWeekend ? `rgba(251,146,60,${intensity})` : `rgba(249,115,22,${intensity})`
                        const label = heatmapMetric === 'qty'
                          ? (val > 0 ? `${val}食` : '')
                          : (val > 0 ? `¥${Math.round(val/1000)}k` : '')
                        const tooltip = heatmapMetric === 'qty'
                          ? `${recipe} (${'月火水木金土日'[dow]}): ${val}食`
                          : `${recipe} (${'月火水木金土日'[dow]}): ¥${val.toLocaleString()}`
                        return (
                          <div key={dow} title={tooltip}
                            className="relative h-12 rounded-lg flex flex-col items-center justify-center cursor-default transition-transform hover:scale-105"
                            style={{ background: val > 0 ? color : 'rgba(255,255,255,0.03)', border: val > 0 ? `1px solid rgba(249,115,22,${intensity * 0.5})` : '1px solid transparent' }}>
                            {val > 0 ? (
                              <>
                                <span className="text-xs font-bold" style={{ color: intensity > 0.5 ? '#fff' : '#d1d5db' }}>{label}</span>
                                <span className="text-[10px] mt-0.5" style={{ color: intensity > 0.5 ? 'rgba(255,255,255,0.7)' : '#6b7280' }}>
                                  {heatmapMetric === 'qty'
                                    ? `¥${Math.round((cell?.total_revenue||0)/1000)}k`
                                    : `${cell?.total_quantity||0}食`}
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-700">—</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
                {/* 凡例 */}
                <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded" style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.1)' }} />
                    <span>少ない</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded" style={{ background: 'rgba(249,115,22,1)' }} />
                    <span>多い</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <div className="w-4 h-4 rounded" style={{ background: 'rgba(251,146,60,0.7)' }} />
                    <span className="text-orange-400">土日</span>
                  </div>
                  <span className="ml-auto text-gray-600">ホバーで詳細表示</span>
                </div>
              </div>
            )
          })() : (
            <div className="py-12 text-center text-gray-500 text-sm">曜日別データがありません</div>
          )}
        </div>
      )}
    </div>
  )
}
