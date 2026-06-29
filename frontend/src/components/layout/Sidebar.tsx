import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Leaf, BookOpen, Truck, BarChart2, Settings, LogOut, UtensilsCrossed, PlusCircle } from 'lucide-react'
import { User } from '../../types'

interface Props {
  user: User
  onLogout: () => void
  isOpen: boolean
  onClose: () => void
}

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'ダッシュボード', exact: true },
  { to: '/ingredients', icon: Leaf, label: '食材管理' },
  { to: '/recipes', icon: BookOpen, label: 'レシピ管理' },
  { to: '/suppliers', icon: Truck, label: '仕入先管理' },
  { to: '/sales', icon: BarChart2, label: '売上分析', exact: true },
  { to: '/sales/input', icon: PlusCircle, label: '売上入力' },
  { to: '/settings', icon: Settings, label: '設定' },
]

export default function Sidebar({ user, onLogout, isOpen, onClose }: Props) {
  return (
    <>
      <style>{`
        .sidebar {
          width: 224px;
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 100;
          transition: transform 0.25s ease;
          transform: translateX(0);
        }
        @media (max-width: 767px) {
          .sidebar {
            left: auto;
            right: 0;
            transform: translateX(100%);
          }
          .sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>

      <aside className={`sidebar bg-gray-900 border-l border-gray-800 md:border-l-0 md:border-r flex flex-col${isOpen ? ' open' : ''}`}>
        {/* ロゴ */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-orange-500" />
            <span className="font-bold text-orange-500 text-lg">MenuCost</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">{user.name}</p>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={onClose}
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

        {/* ログアウト */}
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
    </>
  )
}
