import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import { User } from '../types'
import { UtensilsCrossed } from 'lucide-react'

export default function RegisterPage({ onRegister }: { onRegister: (u: User) => void }) {
  const [form, setForm] = useState({ email: '', password: '', name: '', store_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await authApi.register(form)
      const { access_token } = await authApi.login(form.email, form.password)
      localStorage.setItem('token', access_token)
      const user = await authApi.me()
      onRegister(user)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || '登録に失敗しました')
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
          <h1 className="text-lg font-semibold mb-5">アカウント登録</h1>
          <form onSubmit={submit} className="space-y-4">
            {[
              { key: 'name', label: 'お名前', type: 'text' },
              { key: 'email', label: 'メールアドレス', type: 'email' },
              { key: 'password', label: 'パスワード', type: 'password' },
              { key: 'store_name', label: '店舗名', type: 'text' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-sm text-gray-400 mb-1">{label}{key === 'store_name' && <span className="text-gray-600 ml-1">（任意）</span>}</label>
                <input type={type} value={(form as any)[key]} onChange={set(key)} required={key !== 'store_name'}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
              </div>
            ))}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
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
