import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { User } from '../../types'
import { prefetchAll } from '../../store/prefetch'

export default function Layout({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ログイン後にバックグラウンドで全ページのデータを先読み
  // （既に新しいキャッシュがあるキーは再取得されないので無駄な通信は起きない）
  useEffect(() => {
    prefetchAll()
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
