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

function PrivateRoute({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setUser(null); return }
    authApi.me().then(setUser).catch(() => { localStorage.removeItem('token'); setUser(null) })
  }, [])

  if (user === undefined) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={setUser} />} />
        <Route path="/register" element={<RegisterPage onRegister={setUser} />} />
        <Route path="/" element={
          <PrivateRoute user={user}>
            <Layout user={user} onLogout={() => { localStorage.removeItem('token'); setUser(null) }} />
          </PrivateRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="ingredients" element={<IngredientsPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="recipes/:id" element={<RecipeDetailPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="sales" element={<SalesAnalysisPage />} />
          <Route path="sales/input" element={<SalesInputPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
