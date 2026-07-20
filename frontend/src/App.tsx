import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { authApi } from './api/auth'
import { User } from './types'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import IngredientsPage from './pages/IngredientsPage'
import RecipesPage from './pages/RecipesPage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import SuppliersPage from './pages/SuppliersPage'
import SalesAnalysisPage from './pages/SalesAnalysisPage'
import SalesInputPage from './pages/SalesInputPage'
import SettingsPage from './pages/SettingsPage'
import FormulasPage from './pages/FormulasPage'
import TargetRevenuePage from './pages/TargetRevenuePage'

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
    </BrowserRouter>
  )
}

