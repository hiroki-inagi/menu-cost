import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import { UtensilsCrossed, MailCheck } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || '送信に失敗しました。時間をおいて再度お試しください')
    } finally { setLoading(false) }
  }

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
          {sent ? (
            <div className="text-center space-y-3">
              <MailCheck className="w-10 h-10 text-green-400 mx-auto" />
              <h1 className="text-lg font-semibold">メールを送信しました</h1>
              <p className="text-sm text-gray-400 leading-relaxed">
                <span className="text-gray-200">{email}</span> 宛に再設定用のリンクを送りました。
                メールに記載のリンクから新しいパスワードを設定してください。
              </p>
              <p className="text-xs text-gray-600">
                リンクの有効期限は60分です。届かない場合は迷惑メールフォルダもご確認ください。
              </p>
              <Link to="/login" className="inline-block text-orange-500 hover:underline text-sm pt-2">
                ログイン画面に戻る
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold mb-2">パスワードをお忘れの方</h1>
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                登録済みのメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
              </p>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">メールアドレス</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50">
                  {loading ? '送信中...' : '再設定リンクを送る'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-4">
                <Link to="/login" className="text-orange-500 hover:underline">ログイン画面に戻る</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
