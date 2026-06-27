import { useEffect, useState } from 'react'
import { storeApi } from '../api/store'
import { Store } from '../types'
import { Save, CheckCircle } from 'lucide-react'

export default function SettingsPage() {
  const [store, setStore] = useState<Store | null>(null)
  const [form, setForm] = useState({
    name: '', default_cost_rate: '', tax_rate: '', rounding_unit: '50',
    labor_cost_rate: '', city_name: '',
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    storeApi.getSettings().then(s => {
      setStore(s)
      setForm({
        name: s.name,
        default_cost_rate: String(Math.round(s.default_cost_rate * 100)),
        tax_rate: String(Math.round(s.tax_rate * 100)),
        rounding_unit: String(s.rounding_unit),
        labor_cost_rate: s.labor_cost_rate ? String(Math.round(s.labor_cost_rate * 100)) : '',
        city_name: s.city_name || '',
      })
    })
  }, [])

  const save = async () => {
    setLoading(true)
    try {
      await storeApi.updateSettings({
        name: form.name,
        default_cost_rate: Number(form.default_cost_rate) / 100,
        tax_rate: Number(form.tax_rate) / 100,
        rounding_unit: Number(form.rounding_unit),
        labor_cost_rate: form.labor_cost_rate ? Number(form.labor_cost_rate) / 100 : undefined,
        city_name: form.city_name || undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setLoading(false) }
  }

  if (!store) return <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>

  const fl = form.default_cost_rate && form.labor_cost_rate
    ? Number(form.default_cost_rate) + Number(form.labor_cost_rate)
    : null

  const fields = [
    { key: 'name', label: '店舗名', type: 'text', help: '' },
    { key: 'default_cost_rate', label: 'デフォルト目標原価率（%）', type: 'number', help: '例: 30 → 30%' },
    { key: 'tax_rate', label: '消費税率（%）', type: 'number', help: '例: 10 → 10%' },
    { key: 'rounding_unit', label: '売価の端数処理単位（円）', type: 'number', help: '50 or 100' },
    { key: 'labor_cost_rate', label: '人件費率（%）—任意', type: 'number', help: 'FL比率算出用' },
    { key: 'city_name', label: '都市名（天気API用）', type: 'text', help: '例: Tokyo, Osaka — OpenWeatherMap で使用' },
  ]

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-bold">店舗設定</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        {fields.map(({ key, label, type, help }) => (
          <div key={key}>
            <label className="block text-sm text-gray-300 mb-1">{label}</label>
            <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
            {help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
          </div>
        ))}

        {fl !== null && (
          <div className={`rounded-lg p-3 text-sm ${fl <= 60 ? 'bg-green-900/30 border border-green-800/50 text-green-400' : 'bg-red-900/30 border border-red-800/50 text-red-400'}`}>
            FL比率（食材費率 + 人件費率）= <strong>{fl}%</strong>
            {fl <= 60 ? '　✓ 健全範囲 (〜60%)' : '　⚠ 改善が必要 (60%超)'}
          </div>
        )}

        <button onClick={save} disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50">
          {saved ? <><CheckCircle className="w-4 h-4" /> 保存しました</> : <><Save className="w-4 h-4" />{loading ? '保存中...' : '設定を保存'}</>}
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-sm text-gray-400 space-y-2">
        <h3 className="font-semibold text-gray-300">OpenWeatherMap APIキーの設定</h3>
        <p>天気×売上分析を使うには、バックエンドの <code className="bg-gray-800 px-1 rounded">.env</code> に以下を追加してください：</p>
        <code className="block bg-gray-800 rounded-lg p-3 text-xs text-green-400">OPENWEATHERMAP_API_KEY=your_key_here</code>
        <p>APIキーは <a href="https://openweathermap.org/api" target="_blank" rel="noopener" className="text-orange-400 hover:underline">openweathermap.org</a> で無料取得できます（1日1,000リクエスト）。</p>
      </div>
    </div>
  )
}
