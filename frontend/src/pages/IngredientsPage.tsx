import { useEffect, useState, useMemo } from 'react'
import { ingredientApi } from '../api/ingredients'
import { Ingredient, PriceHistory, Supplier } from '../types'
import { supplierApi } from '../api/suppliers'
import { Plus, Search, Pencil, Trash2, X, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useCachedFetch } from '../hooks/useCachedFetch'
import { invalidateCache, setCached } from '../api/cache'

const CATEGORIES = ['肉類', '魚介類', '野菜', '乳製品', '調味料', '飲料', 'その他']

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export default function IngredientsPage() {
  // 全食材を一度だけ取得してキャッシュ（検索・フィルタはブラウザ内で即時実行）
  const { data: allIngredientsData, loading } = useCachedFetch('all_ingredients', () => ingredientApi.list())
  const allIngredients: Ingredient[] = (allIngredientsData as Ingredient[] | null) ?? []

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [editing, setEditing] = useState<Ingredient | null | 'new'>(null)
  const [history, setHistory] = useState<{ ing: Ingredient; data: PriceHistory[] } | null>(null)
  const [form, setForm] = useState({ name: '', unit: '', unit_price: '', category: '', supplier_id: '', note: '' })
  const [calcMode, setCalcMode] = useState(true)
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseQty, setPurchaseQty] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [error, setError] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const { data: cachedSuppliers } = useCachedFetch('suppliers', () => supplierApi.list())
  useEffect(() => { if (cachedSuppliers) setSuppliers(cachedSuppliers as Supplier[]) }, [cachedSuppliers])

  // フィルタはブラウザ内で即時実行 — APIを叩かない
  const ingredients = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allIngredients.filter(i =>
      (!q || i.name.toLowerCase().includes(q)) &&
      (!category || i.category === category)
    )
  }, [allIngredients, search, category])

  // CRUD後: キャッシュを更新してUIを即反映
  const refreshIngredients = async () => {
    const fresh = await ingredientApi.list()
    setCached('all_ingredients', fresh)
    // ダッシュボードは「前回値を出しつつ裏で再取得」させる（開いた瞬間に空にしない）
    invalidateCache('dashboard_all')
  }

  const openNew = () => {
    setForm({ name: '', unit: 'g', unit_price: '', category: '', supplier_id: '', note: '' })
    setCalcMode(true); setPurchasePrice(''); setPurchaseQty('')
    setEditing('new')
  }
  const openEdit = (i: Ingredient) => {
    setForm({ name: i.name, unit: i.unit, unit_price: String(i.unit_price), category: i.category || '', supplier_id: (i as any).supplier_id || '', note: i.note || '' })
    setCalcMode(false); setPurchasePrice(''); setPurchaseQty('')
    setEditing(i)
  }

  const save = async (overridePrice?: string) => {
    setSaveLoading(true); setError('')
    try {
      const price = overridePrice ?? form.unit_price
      const data = { ...form, unit_price: Number(price), category: form.category || undefined, supplier_id: form.supplier_id || undefined }
      if (editing === 'new') await ingredientApi.create(data as any)
      else if (editing) await ingredientApi.update(editing.id, data as any)
      setEditing(null)
      await refreshIngredients()
    } catch (e: any) { setError(e.response?.data?.detail || 'エラーが発生しました') }
    finally { setSaveLoading(false) }
  }

  const remove = async (i: Ingredient) => {
    if (!confirm(`「${i.name}」を削除しますか？`)) return
    try {
      await ingredientApi.delete(i.id)
      await refreshIngredients()
    } catch (e: any) { alert(e.response?.data?.detail || '削除できません') }
  }

  const showHistory = async (i: Ingredient) => {
    const data = await ingredientApi.priceHistory(i.id)
    setHistory({ ing: i, data })
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">食材管理</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> 食材を追加
        </button>
      </div>

      {/* フィルター */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="食材名で検索..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
          <option className="bg-gray-900 text-white" value="">すべてのカテゴリ</option>
          {CATEGORIES.map(c => <option className="bg-gray-900 text-white" key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => { const url = '/api/export/ingredients.csv'; window.open(url) }}
          className="text-sm text-gray-400 hover:text-gray-200 px-3 py-2 border border-gray-700 rounded-lg">CSV出力</button>
      </div>

      {/* テーブル */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs">
              <th className="text-left px-4 py-3">食材名</th>
              <th className="text-left px-4 py-3">カテゴリ</th>
              <th className="text-right px-4 py-3">単価</th>
              <th className="text-right px-4 py-3">使用レシピ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map(i => (
              <tr key={i.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium">{i.name}</td>
                <td className="px-4 py-3 text-gray-400">{i.category || '—'}</td>
                <td className="px-4 py-3 text-right font-mono">¥{i.unit_price.toLocaleString()} / {i.unit}</td>
                <td className="px-4 py-3 text-right text-gray-400">{i.recipe_count}件</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => showHistory(i)} title="単価履歴"><TrendingUp className="w-4 h-4 text-gray-500 hover:text-blue-400" /></button>
                    <button onClick={() => openEdit(i)} title="編集"><Pencil className="w-4 h-4 text-gray-500 hover:text-orange-400" /></button>
                    <button onClick={() => remove(i)} title="削除"><Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {loading && allIngredients.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center">
                <div className="flex justify-center"><div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
              </td></tr>
            )}
            {!loading && ingredients.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                {search || category ? '条件に一致する食材がありません' : '食材が登録されていません'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 編集モーダル */}
      {editing && (() => {
        const calcedPrice = (calcMode && purchasePrice && purchaseQty)
          ? (Number(purchasePrice) / Number(purchaseQty)).toFixed(4)
          : ''
        const displayPrice = calcMode ? calcedPrice : form.unit_price
        const unitLabel = form.unit || '単位'
        return (
          <Modal title={editing === 'new' ? '食材を追加' : '食材を編集'} onClose={() => setEditing(null)}>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">食材名</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  placeholder="例：鶏もも肉" />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">単位</label>
                <div className="flex gap-2">
                  {['g', 'ml', '個', '枚', '本', '袋'].map(u => (
                    <button key={u} onClick={() => setForm(f => ({ ...f, unit: u }))}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${form.unit === u ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                      {u}
                    </button>
                  ))}
                  <input value={['g','ml','個','枚','本','袋'].includes(form.unit) ? '' : form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="その他"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-500" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400">仕入れ単価</label>
                  <button onClick={() => { setCalcMode(m => !m); setPurchasePrice(''); setPurchaseQty('') }}
                    className="text-xs text-orange-500 hover:underline">
                    {calcMode ? '単価を直接入力する' : '購入金額から計算する'}
                  </button>
                </div>

                {calcMode ? (
                  <div className="bg-gray-800/60 rounded-xl p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">購入金額（¥）</label>
                        <input type="number" min="0" value={purchasePrice}
                          onChange={e => setPurchasePrice(e.target.value)}
                          placeholder="例: 300"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">購入量（{unitLabel}）</label>
                        <input type="number" min="0" value={purchaseQty}
                          onChange={e => setPurchaseQty(e.target.value)}
                          placeholder="例: 1000"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
                      </div>
                    </div>
                    {calcedPrice && (
                      <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
                        <span className="text-xs text-gray-400">計算された単価</span>
                        <span className="font-mono font-bold text-orange-400">¥{Number(calcedPrice).toLocaleString(undefined,{maximumFractionDigits:2})} / {unitLabel}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">¥</span>
                    <input type="number" min="0" step="0.01" value={form.unit_price}
                      onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                      placeholder="例: 0.30"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
                    <span className="text-sm text-gray-400">/ {unitLabel}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">カテゴリ</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                  <option className="bg-gray-800 text-white" value="">— 選択 —</option>
                  {CATEGORIES.map(c => <option className="bg-gray-800 text-white" key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">仕入れ先</label>
                <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                  <option className="bg-gray-800 text-white" value="">— 選択なし —</option>
                  {suppliers.map(s => <option className="bg-gray-800 text-white" key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">備考</label>
                <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="仕入れ先・ブランドなど"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditing(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-sm py-2 rounded-lg">キャンセル</button>
                <button
                  onClick={() => save(calcMode && calcedPrice ? calcedPrice : undefined)}
                  disabled={saveLoading || (calcMode ? !calcedPrice : !form.unit_price)}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 rounded-lg disabled:opacity-50">
                  {saveLoading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </Modal>
        )
      })()}

      {/* 単価履歴モーダル */}
      {history && (
        <Modal title={`${history.ing.name} — 単価履歴`} onClose={() => setHistory(null)}>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history.data.map(h => ({ date: h.recorded_at.slice(0, 10), price: h.unit_price }))}>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151' }} />
                <Line type="monotone" dataKey="price" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
            {[...history.data].reverse().map(h => (
              <div key={h.id} className="flex justify-between text-xs text-gray-400">
                <span>{h.recorded_at.slice(0, 10)}</span>
                <span className="font-mono">¥{h.unit_price.toLocaleString()} / {history.ing.unit}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
