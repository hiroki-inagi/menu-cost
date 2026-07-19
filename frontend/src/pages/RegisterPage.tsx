import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import { User } from '../types'
import { UtensilsCrossed, Check, Loader2 } from 'lucide-react'

type Mode = 'create' | 'join'

export default function RegisterPage({ onRegister }: { onRegister: (u: User) => void }) {
  const [mode, setMode] = useState<Mode>('create')
  const [form, setForm] = useState({ email: '', password: '', name: '', store_name: '', invite_code: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [joinStoreName, setJoinStoreName] = useState('')
  const [checking, setChecking] = useState(false)
  const navigate = useNavigate()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // 招待コード入力欄: 大文字に正規化しつつ、8文字揃ったら店舗名を照会する
  const onInviteCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    setForm(f => ({ ...f, invite_code: code }))
    setJoinStoreName('')
    setError('')
    if (code.length === 8) {
      setChecking(true)
      try {
        const { store_name } = await authApi.lookupInviteCode(code)
        setJoinStoreName(store_name)
      } catch {
        setError('招待コードが見つかりません')
      } finally {
        setChecking(false)
      }
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const payload = {
        email: form.email,
        password: form.password,
        name: form.name,
        ...(mode === 'join'
          ? { invite_code: form.invite_code }
          : { store_name: form.store_name }),
      }
      await authApi.register(payload)
      const { access_token } = await authApi.login(form.email, form.password)
      localStorage.setItem('token', access_token)
      const user = await authApi.me()
      onRegister(user)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || '登録に失敗しました')
    } finally { setLoading(false) }
  }

  const switchMode = (m: Mode) => {
    setMode(m); setError(''); setJoinStoreName('')
  }

  const tabClass = (m: Mode) =>
    `flex-1 py-2 text-sm rounded-lg transition-colors ${
      mode === m ? 'bg-orange-500 text-white font-medium' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
    }`

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <UtensilsCrossed className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold text-orange-500">MenuCost</span>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h1 className="text-lg font-semibold mb-5">アカウント登録</h1>

          <div className="flex gap-2 mb-5">
            <button type="button" onClick={() => switchMode('create')} className={tabClass('create')}>
              新しい店舗を作る
            </button>
            <button type="button" onClick={() => switchMode('join')} className={tabClass('join')}>
              店舗に参加する
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {[
              { key: 'name', label: 'お名前', type: 'text' },
              { key: 'email', label: 'メールアドレス', type: 'email' },
              { key: 'password', label: 'パスワード', type: 'password' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-sm text-gray-400 mb-1">{label}</label>
                <input type={type} value={(form as any)[key]} onChange={set(key)} required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
              </div>
            ))}

            {mode === 'create' ? (
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  店舗名<span className="text-gray-600 ml-1">（任意）</span>
                </label>
                <input type="text" value={form.store_name} onChange={set('store_name')}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
              </div>
            ) : (
              <div>
                <label className="block text-sm text-gray-400 mb-1">招待コード</label>
                <input type="text" value={form.invite_code} onChange={onInviteCodeChange} required
                  placeholder="例: K7M2XQ4B" autoCapitalize="characters" autoComplete="off"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm tracking-[0.3em] font-mono uppercase focus:outline-none focus:border-orange-500" />
                <div className="mt-2 min-h-[20px]">
                  {checking && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Loader2 className="w-3 h-3 animate-spin" />確認中...
                    </span>
                  )}
                  {joinStoreName && !checking && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <Check className="w-3 h-3" />「{joinStoreName}」のデータを共有します
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  招待コードは店舗のオーナーが設定画面から確認できます。
                </p>
              </div>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading || (mode === 'join' && !joinStoreName)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50">
              {loading ? '登録中...' : '登録する'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            既にアカウントをお持ちの方は{' '}
            <Link to="/login" className="text-orange-500 hover:underline">ログイン</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
