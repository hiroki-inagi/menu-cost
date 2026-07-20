import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { User } from '../../types'
import { setCached } from '../../api/cache'
import { dashboardApi } from '../../api/dashboard'
import { ingredientApi } from '../../api/ingredients'
import { recipeApi } from '../../api/recipes'
import { supplierApi } from '../../api/suppliers'
import { salesApi } from '../../api/sales'
import { weatherApi } from '../../api/weather'

export default function Layout({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ログイン後にバックグラウンドで全ページのデータを先読み
  useEffect(() => {
    const prefetch = async () => {
      // 優先度高: よく使うページ
      const [ingredients, allRecipes, activeRecipes, suppliers] = await Promise.allSettled([
        ingredientApi.list(),
        recipeApi.list({ active_only: false }),
        recipeApi.list({ active_only: true }),
        supplierApi.list(),
      ])
      if (ingredients.status === 'fulfilled') setCached('all_ingredients', ingredients.value)
      if (allRecipes.status === 'fulfilled')  setCached('all_recipes', allRecipes.value)
      if (activeRecipes.status === 'fulfilled') setCached('recipes_active', activeRecipes.value)
      if (suppliers.status === 'fulfilled')   setCached('suppliers', suppliers.value)

      // 優先度中: ダッシュボード・売上
      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth() + 1
      const [summary, ranking, breakdown, heatmap, salesWeek, weatherAll, weatherToday, recommend, monthlySales] = await Promise.allSettled([
        dashboardApi.summary(),
        dashboardApi.costRanking(),
        dashboardApi.categoryBreakdown(),
        salesApi.byWeekday(),
        salesApi.ranking('week'),
        salesApi.byWeather(undefined),
        weatherApi.today(),
        salesApi.todayRecommend(),
        salesApi.monthlySales(y, m),
      ])
      if (summary.status === 'fulfilled')    setCached('dashboard_summary', summary.value)
      if (ranking.status === 'fulfilled')    setCached('dashboard_ranking', ranking.value)
      if (breakdown.status === 'fulfilled')  setCached('dashboard_breakdown', breakdown.value)
      if (heatmap.status === 'fulfilled')    setCached('sales_heatmap', heatmap.value)
      if (salesWeek.status === 'fulfilled')  setCached('sales_ranking_week', salesWeek.value)
      if (weatherAll.status === 'fulfilled') setCached('sales_weather_all', weatherAll.value)
      if (weatherToday.status === 'fulfilled') setCached('weather_today', weatherToday.value)
      if (recommend.status === 'fulfilled')  setCached('today_recommend', recommend.value)
      if (monthlySales.status === 'fulfilled') setCached(`monthly_sales_${y}_${String(m).padStart(2, '0')}`, monthlySales.value)

      // 優先度低: 他の期間の売上ランキング
      const [salesDay, salesMonth] = await Promise.allSettled([
        salesApi.ranking('day'),
        salesApi.ranking('month'),
      ])
      if (salesDay.status === 'fulfilled')   setCached('sales_ranking_day', salesDay.value)
      if (salesMonth.status === 'fulfilled') setCached('sales_ranking_month', salesMonth.value)
    }

    prefetch().catch(() => {}) // バックグラウンド取得なのでエラーは無視
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar
        user={user}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 md:ml-56">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-[99] md:hidden"
        />
      )}
    </div>
  )
}
