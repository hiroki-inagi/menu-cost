import { useEffect, useState } from 'react'
import { recipeApi } from '../api/recipes'
import { salesApi } from '../api/sales'
import { Recipe, DailySales } from '../types'
import { Save, CheckCircle } from 'lucide-react'
import { useCachedFetch } from '../hooks/useCachedFetch'

export default function SalesInputPage() {
  // キャッシュ済みのアクティブレシピを即座に表示
  const { data: recipesData } = useCachedFetch('recipes_active', () => recipeApi.list({ active_only: true }))
  const recipes: Recipe[] = (recipesData as Recipe[] | null) ?? []

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    salesApi.getDaily(date).then(data => {
      const q: Record<string, number> = {}
      data.forEach((d: DailySales) => { q[d.recipe_id] = d.quantity })
      setQuantities(q)
    })
  }, [date])

  const setQty = (id: string, v: string) => {
    const n = parseInt(v)
    setQuantities(q => ({ ...q, [id]: isNaN(n) ? 0 : Math.max(0, n) }))
  }

  const save = async () => {
    setLoading(true)
    try {
      const entries = Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([recipe_id, quantity]) => ({ recipe_id, quantity }))
      await salesApi.upsertDaily({ sold_date: date, entries })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setLoading(false) }
  }

  const totalRevenue = recipes.reduce((sum, r) => {
    const qty = quantities[r.id] || 0
    return sum + qty * (r.selling_price || 0)
  }, 0)

  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">売上入力</h1>
        <p className="text-gray-400 text-sm mt-1">営業終了後、各メニューの販売数を入力してください</p>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">日付</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-3 text-xs text-gray-400 px-4 py-2 border-b border-gray-800 bg-gray-800/40">
          <span>メニュー名</span>
          <span className="text-right">売価</span>
          <span className="text-right">販売数</span>
        </div>
        {recipes.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500 text-sm">
            メニューが読み込まれていません
          </div>
        ) : recipes.map(r => (
          <div key={r.id} className="grid grid-cols-3 items-center px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/20">
            <div>
              <div className="text-sm font-medium">{r.name}</div>
              {r.category && <div className="text-xs text-gray-500">{r.category}</div>}
            </div>
            <div className="text-right text-sm font-mono text-gray-400">
              {r.selling_price ? `¥${r.selling_price.toLocaleString()}` : '—'}
            </div>
            <div className="flex justify-end">
              <input
                type="number" min="0" value={quantities[r.id] || ''}
                onChange={e => setQty(r.id, e.target.value)}
                placeholder="0"
                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-right font-mono focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <div><span className="text-gray-400">合計販売数：</span><span className="font-bold">{totalQty}食</span></div>
          <div><span className="text-gray-400">概算売上：</span><span className="font-bold font-mono">¥{totalRevenue.toLocaleString()}</span></div>
        </div>
        <button onClick={save} disabled={loading || totalQty === 0}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-40 transition-colors">
          {saved ? <><CheckCircle className="w-4 h-4" /> 保存済み</> : <><Save className="w-4 h-4" />{loading ? '保存中...' : '保存する'}</>}
        </button>
      </div>
    </div>
  )
}
