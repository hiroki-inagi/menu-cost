import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect, useState } from 'react'
import { authApi } from './api/auth'
import { User } from './types'
import Layout from './components/layout/Layout'

// ── ページの遅延読み込み（recharts等の重いライブラリを初期表示から除外し、爆速表示を実現）──
const LoginPage         = lazy(() => import('./pages/LoginPage'))
const RegisterPage      = lazy(() => import('./pages/RegisterPage'))
const DashboardPage     = lazy(() => import('./pages/DashboardPage'))
const IngredientsPage   = lazy(() => import('./pages/IngredientsPage'))
const RecipesPage       = lazy(() => import('./pages/RecipesPage'))
const RecipeDetailPage  = lazy(() => import('./pages/RecipeDetailPage'))
const SuppliersPage     = lazy(() => import('./pages/SuppliersPage'))
const SalesAnalysisPage = lazy(() => import('./pages/SalesAnalysisPage'))
const SalesInputPage    = lazy(() => import('./pages/SalesInputPage'))
const SettingsPage      = lazy(() => import('./pages/SettingsPage'))
const FormulasPage      = lazy(() => import('./pages/FormulasPage'))
const TargetRevenuePage = lazy(() => import('./pages/TargetRevenuePage'))

/** ページ読み込み中のフォールバック（軽量スピナー） */
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function PrivateRoute({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

const USER_CACHE_KEY = 'mc_user'

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export default function App() {
  // 起動時: トークン + キャッシュ済みユーザーがあれば検証を待たずに即描画(爆速表示)
  const [user, setUser] = useState<User | null | undefined>(() => {
    const token = localStorage.getItem('token')
    if (!token) return null
    return readCachedUser() ?? undefined
  })

  const handleLogin = (u: User) => {
    try { localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u)) } catch { /* ignore */ }
    setUser(u)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem(USER_CACHE_KEY)
    setUser(null)
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    // 裏でトークンを検証しユーザー情報を最新化(画面はブロックしない)
    authApi.me()
      .then((u) => {
        try { localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u)) } catch { /* ignore */ }
        setUser(u)
      })
      .catch((err) => {
        // 401(トークン無効)のみログアウト。ネットワークエラーやコールドスタートでは
        // キャッシュ済みユーザーで表示を継続する
        if (err?.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem(USER_CACHE_KEY)
          setUser(null)
        } else if (!readCachedUser()) {
          setUser(null)
        }
      })
  }, [])

  // キャッシュなし・トークンありの初回のみ短時間スピナー
  if (user === undefined) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/register" element={<RegisterPage onRegister={handleLogin} />} />
        <Route path="/" element={
          <PrivateRoute user={user}>
            <Layout user={user!} onLogout={handleLogout} />
          </PrivateRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="ingredients" element={<IngredientsPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="recipes/:id" element={<RecipeDetailPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="sales" element={<SalesAnalysisPage />} />
          <Route path="sales/input" element={<SalesInputPage />} />
          <Route path="formulas" element={<FormulasPage />} />
          <Route path="target-revenue" element={<TargetRevenuePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

