import { useLocation } from 'react-router-dom'
import { UtensilsCrossed, Menu } from 'lucide-react'

interface Props {
  onMenuClick: () => void
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'ダッシュボード',
  '/ingredients': '食材管理',
  '/recipes': 'レシピ管理',
  '/suppliers': '仕入先管理',
  '/sales': '売上分析',
  '/sales/input': '売上入力',
  '/settings': '設定',
}

export default function Header({ onMenuClick }: Props) {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] ?? 'MenuCost'

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-3 sticky top-0 z-50 md:pl-6">
      {/* モバイル用ロゴ */}
      <div className="flex items-center gap-2 md:hidden">
        <UtensilsCrossed className="w-5 h-5 text-orange-500" />
        <span className="font-bold text-orange-500">MenuCost</span>
      </div>

      {/* ページタイトル */}
      <span className="flex-1 text-base font-semibold text-gray-100 hidden md:block">{title}</span>

      {/* スマホ用ハンバーガーボタン（右上） */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors ml-auto"
        aria-label="メニューを開く"
      >
        <Menu className="w-6 h-6" />
      </button>
    </header>
  )
}
