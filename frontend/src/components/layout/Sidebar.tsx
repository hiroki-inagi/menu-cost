import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Leaf, BookOpen, Truck, BarChart2, Settings, LogOut, UtensilsCrossed, PlusCircle } from 'lucide-react'
import { User } from '../../types'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'ダッシュボード', exact: true },
  { to: '/ingredients', icon: Leaf, label: '食材管理' },
  { to: '/recipes', icon: BookOpen, label: 'レシピ管理' },
  { to: '/suppliers', icon: Truck, label: '仕入先管理' },
  { to: '/sales', icon: BarChart2, label: '売上分析' },
  { to: '/sales/input', icon: PlusCircle, label: '売上入力' },
  { to: '/settings', icon: Settings, label: '設定' },
]

export default function Sidebar({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-6 h-6 text-orange-500" />
          <span className="font-bold text-orange-500 text-lg">MenuCost</span>
        </div>
        <p className="text-xs text-gray-500 mt-1 truncate">{user.name}</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-100 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          ログアウト
        </button>
      </div>
    </aside>
  )
}
