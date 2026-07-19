import { useEffect, useState } from 'react'
import { storeApi, StoreMember } from '../api/store'
import { authApi } from '../api/auth'
import { Store } from '../types'
import { Save, CheckCircle, Eye, EyeOff, Key, MapPin, Locate, Users, Copy, RefreshCw } from 'lucide-react'

export default function SettingsPage() {
  const [store, setStore] = useState<Store | null>(null)
  const [form, setForm] = useState({
    name: '', default_cost_rate: '', tax_rate: '', rounding_unit: '50',
    labor_cost_rate: '', city_name: '', latitude: '', longitude: '',
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiKeyStatus, setApiKeyStatus] = useState<{ has_key: boolean; masked: string } | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const [apiKeyLoading, setApiKeyLoading] = useState(false)

  const [inviteCode, setInviteCode] = useState('')
  const [members, setMembers] = useState<StoreMember[]>([])
  const [myRole, setMyRole] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    storeApi.getWeatherApiKeyStatus().then(setApiKeyStatus).catch(() => {})
    storeApi.getInviteCode().then(r => setInviteCode(r.invite_code)).catch(() => {})
    storeApi.getMembers().then(setMembers).catch(() => {})
    authApi.me().then(u => setMyRole(u.role)).catch(() => {})
  }, [])

  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const regenerateCode = async () => {
    if (!confirm('招待コードを再発行すると、今のコードは使えなくなります。よろしいですか？')) return
    setRegenerating(true)
    try {
      const r = await storeApi.regenerateInviteCode()
      setInviteCode(r.invite_code)
    } finally { setRegenerating(false) }
  }

  const saveApiKey = async () => {
    if (!apiKey.trim()) return
    setApiKeyLoading(true)
    try {
      await storeApi.updateWeatherApiKey(apiKey.trim())
      setApiKeyStatus({ has_key: true, masked: apiKey.slice(0,4) + '****' + apiKey.slice(-4) })
      setApiKey('')
      setApiKeySaved(true)
      setTimeout(() => setApiKeySaved(false), 3000)
    } finally { setApiKeyLoading(false) }
  }

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
        latitude: s.latitude ? String(s.latitude) : '',
        longitude: s.longitude ? String(s.longitude) : '',
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
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setLoading(false) }
  }

  // ブラウザの現在地を取得して自動入力
  const getLocation = () => {
    if (!navigator.geolocation) { alert('このブラウザは現在地取得に対応していません'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
          city_name: '', // 座標を使うので都市名は空にする
        }))
        setLocating(false)
      },
      () => { alert('現在地を取得できませんでした。手動で入力してください。'); setLocating(false) }
    )
  }

  if (!store) return <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>

  const fl = form.default_cost_rate && form.labor_cost_rate
    ? Number(form.default_cost_rate) + Number(form.labor_cost_rate)
    : null

  const fields = [
    { key: 'name', label: '店舗名', type: 'text', help: '' },
    { key: 'default_cost_rate', label: '原価率・食材費率（%）', type: 'number', help: '売上に対する食材費の割合。例: 30 → 売上100円のうち30円が食材費' },
    { key: 'tax_rate', label: '消費税率（%）', type: 'number', help: '例: 10 → 10%' },
    { key: 'rounding_unit', label: '売価の端数処理単位（円）', type: 'number', help: '50 or 100' },
    { key: 'labor_cost_rate', label: '人件費率（%）—任意', type: 'number', help: 'FL比率算出用' },
  ]

  // 天気の場所指定モード（座標 or 都市名）
  const hasCoords = form.latitude && form.longitude
  const locationMode: 'coords' | 'city' | 'none' =
    hasCoords ? 'coords' : form.city_name ? 'city' : 'none'

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-bold">店舗設定</h1>

      {/* 基本設定 */}
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

      {/* メンバー共有（招待コード） */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <h3 className="font-semibold text-gray-300 text-sm">メンバーとデータを共有</h3>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          下の招待コードを渡すと、相手は新規登録時に「店舗に参加する」からコードを入力するだけで、
          この店舗の食材・レシピ・売上データをそのまま共有できます。
        </p>

        <div className="flex gap-2">
          <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-center">
            <span className="text-xl font-mono font-bold tracking-[0.3em] text-purple-300">
              {inviteCode || '--------'}
            </span>
          </div>
          <button onClick={copyInviteCode} disabled={!inviteCode}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-sm px-4 rounded-lg transition-colors">
            {copied ? <><CheckCircle className="w-4 h-4" /> コピー済</> : <><Copy className="w-4 h-4" /> コピー</>}
          </button>
        </div>

        {myRole === 'owner' && (
          <button onClick={regenerateCode} disabled={regenerating}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 disabled:opacity-50 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            招待コードを再発行する
          </button>
        )}

        {members.length > 0 && (
          <div className="pt-2 border-t border-gray-800">
            <p className="text-xs text-gray-400 font-medium mb-2">参加中のメンバー（{members.length}名）</p>
            <ul className="space-y-1.5">
              {members.map(m => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-300">{m.name}</span>
                  <span className="text-xs text-gray-600">{m.email}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${
                    m.role === 'owner'
                      ? 'bg-orange-900/30 border-orange-800/50 text-orange-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}>
                    {m.role === 'owner' ? 'オーナー' : 'スタッフ'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 天気取得場所の設定 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-gray-300 text-sm">天気取得の場所</h3>
          {locationMode === 'coords' && (
            <span className="ml-auto text-xs bg-blue-900/40 border border-blue-800/50 text-blue-400 px-2 py-0.5 rounded-full">✓ 座標で設定済み</span>
          )}
          {locationMode === 'city' && (
            <span className="ml-auto text-xs bg-blue-900/40 border border-blue-800/50 text-blue-400 px-2 py-0.5 rounded-full">✓ 都市名で設定済み</span>
          )}
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          天気×売上分析で使う場所を設定します。<strong className="text-gray-300">座標（緯度・経度）</strong>の方が正確です。
          習志野市など市区町村単位で指定したい場合は座標をおすすめします。
        </p>

        {/* 座標入力 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400 font-medium">緯度・経度（推奨）</label>
            <button
              onClick={getLocation}
              disabled={locating}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
            >
              <Locate className="w-3.5 h-3.5" />
              {locating ? '取得中...' : '現在地を自動取得'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">緯度（北緯）</label>
              <input
                type="number" step="0.000001"
                value={form.latitude}
                onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                placeholder="例: 35.674400"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">経度（東経）</label>
              <input
                type="number" step="0.000001"
                value={form.longitude}
                onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                placeholder="例: 140.019400"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
          {/* 習志野市のクイック設定 */}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs text-gray-600">クイック設定：</span>
            {[
              { label: '習志野市', lat: '35.674400', lon: '140.019400' },
              { label: '東京', lat: '35.689500', lon: '139.691700' },
              { label: '大阪', lat: '34.693700', lon: '135.502100' },
            ].map(city => (
              <button
                key={city.label}
                onClick={() => setForm(f => ({ ...f, latitude: city.lat, longitude: city.lon, city_name: '' }))}
                className="text-xs text-blue-400 hover:text-blue-300 border border-blue-800/40 hover:border-blue-600/60 px-2 py-0.5 rounded-lg transition-colors"
              >
                {city.label}
              </button>
            ))}
          </div>
        </div>

        {/* 区切り */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-600">または</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* 都市名入力 */}
        <div>
          <label className="block text-xs text-gray-400 font-medium mb-1">都市名で指定（英語）</label>
          <input
            type="text"
            value={form.city_name}
            onChange={e => setForm(f => ({ ...f, city_name: e.target.value, latitude: '', longitude: '' }))}
            placeholder="例: Tokyo, Osaka, Chiba"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
          />
          <p className="text-xs text-gray-600 mt-1">
            ※ 座標と都市名を両方入力した場合は<strong className="text-gray-500">座標が優先</strong>されます
          </p>
        </div>

        <button onClick={save} disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50 text-sm">
          {saved ? <><CheckCircle className="w-4 h-4" /> 保存しました</> : <><Save className="w-4 h-4" />{loading ? '保存中...' : '場所を保存'}</>}
        </button>
      </div>

      {/* APIキー設定 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-orange-400" />
          <h3 className="font-semibold text-gray-300 text-sm">OpenWeatherMap APIキー</h3>
          {apiKeyStatus?.has_key && (
            <span className="ml-auto text-xs bg-green-900/40 border border-green-800/50 text-green-400 px-2 py-0.5 rounded-full">✓ 設定済み {apiKeyStatus.masked}</span>
          )}
        </div>

        {!apiKeyStatus?.has_key && (
          <p className="text-xs text-gray-500">
            天気×売上分析を使うために必要です。
            <a href="https://openweathermap.org/api" target="_blank" rel="noopener" className="text-orange-400 hover:underline ml-1">openweathermap.org</a> で無料取得（1日1,000リクエスト）。
          </p>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={apiKeyStatus?.has_key ? '新しいAPIキーを入力（変更する場合）' : 'APIキーを貼り付け'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 pr-9"
            />
            <button onClick={() => setShowKey(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={saveApiKey} disabled={apiKeyLoading || !apiKey.trim()}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm px-4 rounded-lg transition-colors">
            {apiKeySaved ? <><CheckCircle className="w-4 h-4" /> 保存済み</> : apiKeyLoading ? '保存中...' : '保存'}
          </button>
        </div>
        {apiKeySaved && (
          <p className="text-xs text-green-400">✓ APIキーを保存しました。天気×売上分析が使えるようになりました。</p>
        )}
      </div>
    </div>
  )
}
