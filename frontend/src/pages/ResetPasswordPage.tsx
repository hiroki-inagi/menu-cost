import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth'
import { UtensilsCrossed, CheckCircle, AlertTriangle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()

  const [checking, setChecking] = useState(true)
  const [tokenError, setTokenError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // ページを開いた時点でリンクの有効性を確認する
  useEffect(() => {
    if (!token) { setTokenError('リンクが正しくありません'); setChecking(false); return }
    authApi.verifyResetToken(token)
      .then(r => setEmail(r.email))
      .catch(err => setTokenError(err.response?.data?.detail || 'このリンクは無効です'))
      .finally(() => setChecking(false))
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('パスワードが一致しません'); return }
    if (password.length < 8) { setError('パスワードは8文字以上にしてください'); return }
    setLoading(true); setError('')
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      setError(err.response?.data?.detail || '再設定に失敗しました')
    } finally { setLoading(false) }
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <UtensilsCrossed className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold text-orange-500">MenuCost</span>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">{children}</div>
      </div>
    </div>
  )

  if (checking) return shell(
    <div className="flex justify-center py-4">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (tokenError) return shell(
    <div className="text-center space-y-3">
      <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
      <h1 className="text-lg font-semibold">リンクが使用できません</h1>
      <p className="text-sm text-gray-400">{tokenError}</p>
      <Link to="/forgot-password" className="inline-block text-orange-500 hover:underline text-sm pt-2">
        もう一度お手続きする
      </Link>
    </div>
  )

  if (done) return shell(
    <div className="text-center space-y-3">
      <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
      <h1 className="text-lg font-semibold">パスワードを再設定しました</h1>
      <p className="text-sm text-gray-400">ログイン画面に移動します...</p>
    </div>
  )

  return shell(
    <>
      <h1 className="text-lg font-semibold mb-1">新しいパスワードの設定</h1>
      <p className="text-xs text-gray-500 mb-5">{email}</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">新しいパスワード</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
          <p className="text-xs text-gray-600 mt-1">8文字以上</p>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">新しいパスワード（確認）</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50">
          {loading ? '設定中...' : 'パスワードを設定する'}
        </button>
      </form>
    </>
  )
}
