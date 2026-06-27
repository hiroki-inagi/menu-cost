import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { recipeApi } from '../api/recipes'
import { ingredientApi } from '../api/ingredients'
import { Recipe, Ingredient } from '../types'
import { Plus, Pencil, Trash2, X, ChevronRight } from 'lucide-react'
import CostRateBadge from '../components/common/CostRateBadge'

const CATEGORIES = ['前菜', 'スープ', 'メイン', 'サイド', 'デザート', 'ドリンク', 'その他']

function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-gray-900">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
  const [category, setCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', category: '', selling_price: '', target_cost_rate: '', servings: '1', note: '' })
  const [selIngredients, setSelIngredients] = useState<{ ingredient_id: string; quantity: string; yield_rate: string }[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const load = () => recipeApi.list({ category: category || undefined, active_only: false }).then(setRecipes)
  useEffect(() => { load() }, [category])
  useEffect(() => { ingredientApi.list().then(setAllIngredients) }, [])

  const openNew = () => {
    setForm({ name: '', category: '', selling_price: '', target_cost_rate: '', servings: '1', note: '' })
    setSelIngredients([{ ingredient_id: '', quantity: '', yield_rate: '1' }])
    setShowModal(true)
  }

  const addRow = () => setSelIngredients(s => [...s, { ingredient_id: '', quantity: '', yield_rate: '1' }])
  const removeRow = (i: number) => setSelIngredients(s => s.filter((_, j) => j !== i))

  const save = async () => {
    setLoading(true)
    try {
      await recipeApi.create({
        ...form,
        selling_price: form.selling_price ? Number(form.selling_price) : undefined,
        target_cost_rate: form.target_cost_rate ? Number(form.target_cost_rate) / 100 : undefined,
        servings: Number(form.servings),
        ingredients: selIngredients
          .filter(r => r.ingredient_id && r.quantity)
          .map(r => ({ ingredient_id: r.ingredient_id, quantity: Number(r.quantity), yield_rate: Number(r.yield_rate) })),
      })
      setShowModal(false); load()
    } catch (e: any) { alert(e.response?.data?.detail || 'エラー') }
    finally { setLoading(false) }
  }

  const remove = async (r: Recipe) => {
    if (!confirm(`「${r.name}」を削除しますか？`)) return
    await recipeApi.delete(r.id); load()
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">レシピ管理</h1>
        <div className="flex gap-2">
          <button onClick={() => window.open('/api/export/recipes.csv')}
            className="text-sm text-gray-400 hover:text-gray-200 px-3 py-2 border border-gray-700 rounded-lg">CSV出力</button>
          <button onClick={openNew} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg">
            <Plus className="w-4 h-4" /> レシピを追加
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setCategory('')} className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${!category ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>すべて</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${category === c ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>{c}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recipes.map(r => (
          <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold">{r.name}</h3>
                {r.category && <span className="text-xs text-gray-500">{r.category}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => navigate(`/recipes/${r.id}`)}><ChevronRight className="w-4 h-4 text-gray-500 hover:text-orange-400" /></button>
                <button onClick={() => remove(r)}><Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" /></button>
              </div>
            </div>
            {r.calculation && (
              <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                <div className="bg-gray-800/60 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-0.5">食材費 (1人前)</div>
                  <div className="font-mono font-semibold">¥{r.calculation.cost_per_serving.toLocaleString()}</div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-0.5">推奨売価 (税込)</div>
                  <div className="font-mono font-semibold text-orange-400">
                    {r.calculation.recommended_price_in_tax ? `¥${r.calculation.recommended_price_in_tax.toLocaleString()}` : '—'}
                  </div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-0.5">現行売価</div>
                  <div className="font-mono">{r.selling_price ? `¥${r.selling_price.toLocaleString()}` : '未設定'}</div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-0.5">原価率</div>
                  <CostRateBadge rate={r.calculation.effective_cost_rate} status={r.calculation.status} />
                </div>
              </div>
            )}
          </div>
        ))}
        {recipes.length === 0 && (
          <div className="col-span-2 py-16 text-center text-gray-500">レシピが登録されていません</div>
        )}
      </div>

      {showModal && (
        <Modal title="レシピを追加" onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">料理名</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">カテゴリ</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                  <option value="">— 選択 —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">人数</label>
                <input type="number" min="1" value={form.servings} onChange={e => setForm(f => ({ ...f, servings: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">現行売価（税抜）</label>
                <input type="number" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" placeholder="例: 980" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">目標原価率（%）</label>
                <input type="number" value={form.target_cost_rate} onChange={e => setForm(f => ({ ...f, target_cost_rate: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" placeholder="空欄=店舗デフォルト" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400">使用食材</label>
                <button onClick={addRow} className="text-xs text-orange-500 hover:underline">+ 追加</button>
              </div>
              <div className="space-y-2">
                {selIngredients.map((row, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1 items-center">
                    <select value={row.ingredient_id} onChange={e => setSelIngredients(s => s.map((r, j) => j === i ? { ...r, ingredient_id: e.target.value } : r))}
                      className="col-span-5 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-500">
                      <option value="">食材を選択</option>
                      {allIngredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}（/{ing.unit}）</option>)}
                    </select>
                    <input type="number" placeholder="量" value={row.quantity} onChange={e => setSelIngredients(s => s.map((r, j) => j === i ? { ...r, quantity: e.target.value } : r))}
                      className="col-span-3 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-500" />
                    <input type="number" min="0.01" max="1" step="0.01" placeholder="歩留" value={row.yield_rate} onChange={e => setSelIngredients(s => s.map((r, j) => j === i ? { ...r, yield_rate: e.target.value } : r))}
                      className="col-span-3 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-500" />
                    <button onClick={() => removeRow(i)} className="col-span-1 flex justify-center"><X className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2 rounded-lg">キャンセル</button>
              <button onClick={save} disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 rounded-lg disabled:opacity-50">
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
