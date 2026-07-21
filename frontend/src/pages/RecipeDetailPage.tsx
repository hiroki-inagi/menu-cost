import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { recipeApi } from '../api/recipes'
import { ingredientApi } from '../api/ingredients'
import { Recipe, Ingredient } from '../types'
import { ArrowLeft, Pencil, Save, X, Trash2, Plus } from 'lucide-react'
import CostRateBadge from '../components/common/CostRateBadge'
import { useCachedFetch } from '../hooks/useCachedFetch'
import { invalidateCache } from '../api/cache'

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)

  // 材料一覧は共有キャッシュから即座に取得（他ページと通信を共有し、待ち時間ゼロ）
  const { data: cachedIngredients } = useCachedFetch('all_ingredients', () => ingredientApi.list())
  const allIngredients: Ingredient[] = (cachedIngredients as Ingredient[] | null) ?? []

  const [editingPrice, setEditingPrice] = useState(false)
  const [newPrice, setNewPrice] = useState('')
  const [addingIng, setAddingIng] = useState(false)
  const [newIng, setNewIng] = useState({ ingredient_id: '', quantity: '', yield_rate: '1' })
  const [editingRiId, setEditingRiId] = useState<string | null>(null)
  const [editIng, setEditIng] = useState({ ingredient_id: '', quantity: '', yield_rate: '1' })

  const load = () => recipeApi.get(id!).then(setRecipe)

  /**
   * 変更を保存した後の再読み込み。
   * 原価が変わるので、一覧とダッシュボードも「次に開いたとき再取得」の印を付ける
   * （データは残すので、開いた瞬間は前回値が出てから最新化される）
   */
  const reload = async () => {
    await load()
    invalidateCache('all_recipes')
    invalidateCache('recipes_active')
    invalidateCache('dashboard_all')
  }

  useEffect(() => { load() }, [id])

  const savePrice = async () => {
    await recipeApi.update(id!, { selling_price: Number(newPrice) })
    setEditingPrice(false); reload()
  }

  const removeIng = async (riId: string) => {
    await recipeApi.removeIngredient(id!, riId); reload()
  }

  const addIng = async () => {
    if (!newIng.ingredient_id || !newIng.quantity) return
    await recipeApi.addIngredient(id!, { ingredient_id: newIng.ingredient_id, quantity: Number(newIng.quantity), yield_rate: Number(newIng.yield_rate) })
    setAddingIng(false); setNewIng({ ingredient_id: '', quantity: '', yield_rate: '1' }); reload()
  }

  const startEditIng = (ri: Recipe['recipe_ingredients'][number]) => {
    setAddingIng(false)
    setEditingRiId(ri.id)
    setEditIng({ ingredient_id: ri.ingredient_id, quantity: String(ri.quantity), yield_rate: String(ri.yield_rate) })
  }

  const saveEditIng = async () => {
    if (!editingRiId || !editIng.ingredient_id || !editIng.quantity) return
    await recipeApi.updateIngredient(id!, editingRiId, {
      ingredient_id: editIng.ingredient_id,
      quantity: Number(editIng.quantity),
      yield_rate: Number(editIng.yield_rate),
    })
    setEditingRiId(null); reload()
  }

  if (!recipe) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>

  const c = recipe.calculation

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/recipes')} className="p-1.5 hover:bg-gray-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold">{recipe.name}</h1>
          {recipe.category && <span className="text-sm text-gray-400">{recipe.category}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 原価計算結果 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-gray-300">原価計算結果</h2>
          {c && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">総食材費</div>
                  <div className="font-mono font-bold text-lg">¥{c.total_cost.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">{recipe.servings}人前分</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">1人前食材費</div>
                  <div className="font-mono font-bold text-lg">¥{c.cost_per_serving.toLocaleString()}</div>
                </div>
                <div className="bg-orange-900/30 border border-orange-800/50 rounded-lg p-3 col-span-2">
                  <div className="text-xs text-orange-400 mb-1">推奨売価（目標原価率 {(c.target_cost_rate * 100).toFixed(0)}%）</div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono font-bold text-2xl text-orange-400">
                      {c.recommended_price_in_tax ? `¥${c.recommended_price_in_tax.toLocaleString()}` : '—'}
                    </span>
                    <span className="text-xs text-gray-400">税込</span>
                    <span className="text-sm text-gray-400">
                      {c.recommended_price_ex_tax ? `（税抜 ¥${c.recommended_price_ex_tax.toLocaleString()}）` : ''}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400 mb-1">現行売価</div>
                  {editingPrice ? (
                    <div className="flex items-center gap-2">
                      <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} autoFocus
                        className="w-28 bg-gray-800 border border-orange-500 rounded px-2 py-1 text-sm font-mono focus:outline-none" />
                      <button onClick={savePrice}><Save className="w-4 h-4 text-orange-400" /></button>
                      <button onClick={() => setEditingPrice(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{recipe.selling_price ? `¥${recipe.selling_price.toLocaleString()}` : '未設定'}</span>
                      <button onClick={() => { setNewPrice(String(recipe.selling_price || '')); setEditingPrice(true) }}>
                        <Pencil className="w-3.5 h-3.5 text-gray-500 hover:text-orange-400" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 mb-1">実際の原価率</div>
                  <CostRateBadge rate={c.effective_cost_rate} status={c.status} />
                  {c.effective_cost_rate && recipe.selling_price && c.recommended_price_ex_tax && (
                    <div className="text-xs mt-1 text-gray-500">
                      {recipe.selling_price < c.recommended_price_ex_tax
                        ? `¥${(c.recommended_price_ex_tax - recipe.selling_price).toLocaleString()} 低い`
                        : `¥${(recipe.selling_price - c.recommended_price_ex_tax).toLocaleString()} 高い`}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 食材内訳 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-gray-300">食材内訳</h2>
            <button onClick={() => { setEditingRiId(null); setAddingIng(true) }} className="flex items-center gap-1 text-xs text-orange-500 hover:underline">
              <Plus className="w-3.5 h-3.5" /> 追加
            </button>
          </div>
          <div className="space-y-2">
            {recipe.recipe_ingredients.map(ri => (
              editingRiId === ri.id ? (
                <div key={ri.id} className="border border-orange-500/50 rounded-lg p-2 space-y-2">
                  <select value={editIng.ingredient_id} onChange={e => setEditIng(n => ({ ...n, ingredient_id: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-500">
                    {allIngredients.map(i => <option className="bg-gray-800 text-white" key={i.id} value={i.id}>{i.name}（/{i.unit}）</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="使用量" value={editIng.quantity} onChange={e => setEditIng(n => ({ ...n, quantity: e.target.value }))}
                      autoFocus
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-500" />
                    <input type="number" placeholder="歩留まり率 (0〜1)" value={editIng.yield_rate} onChange={e => setEditIng(n => ({ ...n, yield_rate: e.target.value }))}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingRiId(null)} className="flex-1 bg-gray-800 text-xs py-1.5 rounded-lg">キャンセル</button>
                    <button onClick={saveEditIng} className="flex-1 bg-orange-500 text-white text-xs py-1.5 rounded-lg">保存</button>
                  </div>
                </div>
              ) : (
                <div key={ri.id} className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{ri.ingredient_name}</span>
                    <span className="text-gray-500 ml-2 text-xs">{ri.quantity}{ri.unit}{ri.yield_rate < 1 ? ` × 歩留${(ri.yield_rate * 100).toFixed(0)}%` : ''}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs text-gray-400">¥{ri.cost.toLocaleString()}</span>
                    <button onClick={() => startEditIng(ri)}><Pencil className="w-3.5 h-3.5 text-gray-600 hover:text-orange-400" /></button>
                    <button onClick={() => removeIng(ri.id)}><Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-red-400" /></button>
                  </div>
                </div>
              )
            ))}
          </div>
          {addingIng && (
            <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
              <select value={newIng.ingredient_id} onChange={e => setNewIng(n => ({ ...n, ingredient_id: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-500">
                <option className="bg-gray-800 text-white" value="">食材を選択</option>
                {allIngredients.map(i => <option className="bg-gray-800 text-white" key={i.id} value={i.id}>{i.name}（/{i.unit}）</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="使用量" value={newIng.quantity} onChange={e => setNewIng(n => ({ ...n, quantity: e.target.value }))}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-500" />
                <input type="number" placeholder="歩留まり率 (0〜1)" value={newIng.yield_rate} onChange={e => setNewIng(n => ({ ...n, yield_rate: e.target.value }))}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAddingIng(false)} className="flex-1 bg-gray-800 text-xs py-1.5 rounded-lg">キャンセル</button>
                <button onClick={addIng} className="flex-1 bg-orange-500 text-white text-xs py-1.5 rounded-lg">追加</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
