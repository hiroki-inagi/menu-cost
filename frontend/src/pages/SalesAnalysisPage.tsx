import { useEffect, useState } from 'react'
import { salesApi } from '../api/sales'
import { weatherApi } from '../api/weather'
import { recipeApi } from '../api/recipes'
import { RankingItem, WeekdayHeatmapItem, WeatherSalesItem, TodayWeather, Recipe } from '../types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell,
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

  useEffect(() => { salesApi.ranking(period).then(setRanking) }, [period])
  useEffect(() => { salesApi.byWeekday().then(setHeatmap) }, [])
  useEffect(() => { salesApi.byWeather(weatherFilter || undefined).then(setWeatherSales) }, [weatherFilter])
  useEffect(() => { weatherApi.today().then(setWeather).catch(() => {}) }, [])
  useEffect(() => { recipeApi.list({ active_only: true }).then(setRecipes) }, [])
  useEffect(() => {
    if (selectedRecipe) salesApi.weatherCorrelation(selectedRecipe).then(setCorrelation)
  }, [selectedRecipe])

  // Heatmap データ整形
  const heatmapRecipes = [...new Set(heatmap.map(h => h.recipe_name))].slice(0, 10)
  const maxHeat = Math.max(...heatmap.map(h => h.total_quantity), 1)

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
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart margin={{ left: 0, right: 20 }}>
                  <XAxis dataKey="temp_max" name="最高気温" unit="℃" tick={{ fill: '#6b7280', fontSize: 11 }} label={{ value: '最高気温 (℃)', position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 11 }} />
                  <YAxis dataKey="quantity" name="販売数" unit="食" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', fontSize: 12 }}
                    formatter={(v: number, name: string) => [v, name === 'temp_max' ? '最高気温' : '販売数']} />
                  <Scatter data={correlation} fill="#f97316" />
                </ScatterChart>
              </ResponsiveContainer>
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">曜日別 メニュー販売数ヒートマップ</h2>
          {heatmapRecipes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="text-left pr-4 pb-2 text-gray-400 font-normal w-32">メニュー</th>
                    {WEEKDAYS.map(d => <th key={d} className="px-2 pb-2 text-gray-400 font-normal text-center">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {heatmapRecipes.map(recipe => (
                    <tr key={recipe}>
                      <td className="pr-4 py-1 text-gray-300 truncate max-w-32">{recipe}</td>
                      {WEEKDAYS.map((_, dow) => {
                        const cell = heatmap.find(h => h.recipe_name === recipe && h.day_of_week === dow)
                        const qty = cell?.total_quantity || 0
                        const intensity = qty / maxHeat
                        return (
                          <td key={dow} className="px-2 py-1 text-center">
                            <div
                              className="w-8 h-8 rounded flex items-center justify-center text-xs font-mono mx-auto"
                              style={{ background: qty > 0 ? `rgba(249,115,22,${0.1 + intensity * 0.9})` : 'rgba(255,255,255,0.03)', color: intensity > 0.5 ? '#fff' : '#6b7280' }}
                              title={`${recipe} ${WEEKDAYS[dow]}: ${qty}食`}
                            >
                              {qty > 0 ? qty : ''}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
                <span>少</span>
                <div className="flex gap-1">
                  {[0.1, 0.3, 0.5, 0.7, 0.9].map(i => (
                    <div key={i} className="w-5 h-5 rounded" style={{ background: `rgba(249,115,22,${i})` }} />
                  ))}
                </div>
                <span>多</span>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500 text-sm">曜日別データがありません</div>
          )}
        </div>
      )}
    </div>
  )
}
