import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { User } from '../../types'

export default function Layout({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
