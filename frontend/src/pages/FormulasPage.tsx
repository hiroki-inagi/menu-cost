import { useState } from 'react'
import { ChevronDown, ChevronRight, FlaskConical } from 'lucide-react'

interface Formula {
  name: string
  formula: string
  variables: { symbol: string; desc: string }[]
  example?: string
  note?: string
}

interface Section {
  title: string
  color: string
  formulas: Formula[]
}

const SECTIONS: Section[] = [
  {
    title: '原価計算',
    color: 'orange',
    formulas: [
      {
        name: '食材費（1食材あたり）',
        formula: '食材費 = 単価 × 使用量 ÷ 歩留まり率',
        variables: [
          { symbol: '単価', desc: '食材の1単位あたりの仕入れ価格（円）' },
          { symbol: '使用量', desc: 'レシピで使用する量（単位はg・mlなど）' },
          { symbol: '歩留まり率', desc: '廃棄を除いた実際に使える割合（0〜1）。例: 0.8 = 80%使用可能' },
        ],
        example: '単価 200円/kg、使用量 150g、歩留まり 0.9 → 200 × 0.15 ÷ 0.9 ≈ 33.3円',
        note: '歩留まりが低いほど（廃棄が多いほど）実質コストが上がります',
      },
      {
        name: '総食材費',
        formula: '総食材費 = Σ 各食材の食材費',
        variables: [
          { symbol: 'Σ', desc: 'レシピに使う全食材の合計' },
        ],
        example: '食材A: 33円、食材B: 120円、食材C: 47円 → 総食材費 = 200円',
      },
      {
        name: '1人前食材費',
        formula: '1人前食材費 = 総食材費 ÷ 提供人数',
        variables: [
          { symbol: '提供人数', desc: 'レシピが何人前の量で作られているか（servings）' },
        ],
        example: '総食材費 600円、提供人数 3人前 → 1人前 200円',
      },
    ],
  },
  {
    title: '売価計算',
    color: 'blue',
    formulas: [
      {
        name: '目標原価率',
        formula: '目標原価率 = レシピ個別設定 または 店舗デフォルト原価率',
        variables: [
          { symbol: 'レシピ個別設定', desc: 'レシピごとに設定した目標原価率（設定されている場合優先）' },
          { symbol: '店舗デフォルト原価率', desc: '「設定」で設定したデフォルト目標原価率' },
        ],
        note: '一般的な飲食店の目標原価率は 28〜35% とされています',
      },
      {
        name: '推奨売価（税抜）',
        formula: '推奨税抜売価 = ⌈（1人前食材費 ÷ 目標原価率）÷ 端数単位⌉ × 端数単位',
        variables: [
          { symbol: '⌈ ⌉', desc: '切り上げ（ceil）' },
          { symbol: '端数単位', desc: '「設定」で設定した売価の端数処理単位（例: 50円 or 100円）' },
        ],
        example: '1人前 200円、目標原価率 30%、端数単位 50円 → 200 ÷ 0.30 = 666.7 → 切り上げ → 700円（税抜）',
      },
      {
        name: '推奨売価（税込）',
        formula: '推奨税込売価 = round（推奨税抜売価 × (1 + 消費税率)）',
        variables: [
          { symbol: '消費税率', desc: '「設定」で設定した消費税率（例: 10% = 0.10）' },
          { symbol: 'round', desc: 'Pythonの組み込み四捨五入' },
        ],
        example: '税抜 700円、消費税 10% → 700 × 1.10 = 770円（税込）',
      },
      {
        name: '実際の原価率',
        formula: '実際の原価率 = 1人前食材費 ÷ 現行売価',
        variables: [
          { symbol: '現行売価', desc: 'レシピに設定されている実際の販売価格（税抜）' },
        ],
        example: '1人前 200円、現行売価 700円 → 200 ÷ 700 ≈ 28.6%',
        note: '現行売価が未設定の場合は表示されません',
      },
    ],
  },
  {
    title: '原価率ステータス判定',
    color: 'green',
    formulas: [
      {
        name: 'ステータス区分',
        formula: '実際の原価率 ≤ 25% → 優良（緑）\n25% < 原価率 ≤ 35% → 要注意（黄）\n原価率 > 35% → 危険（赤）',
        variables: [],
        note: 'ダッシュボードの「要改善メニュー」カウントは「危険（赤）」のレシピ数です',
      },
    ],
  },
  {
    title: 'ダッシュボード集計',
    color: 'purple',
    formulas: [
      {
        name: '平均原価率',
        formula: '平均原価率 = Σ 各レシピの実際原価率 ÷ 実際原価率が設定されているレシピ数',
        variables: [],
        note: '現行売価が設定されていないレシピは計算から除外されます',
      },
      {
        name: 'FL比率',
        formula: 'FL比率 = 平均原価率（F） + 人件費率（L）',
        variables: [
          { symbol: 'F（Food）', desc: '食材費率 = 平均原価率' },
          { symbol: 'L（Labor）', desc: '人件費率（「設定」で任意設定）' },
        ],
        example: '平均原価率 30%、人件費率 25% → FL比率 = 55%',
        note: 'FL比率 60%以下が健全な目安とされています。60%超は改善推奨',
      },
      {
        name: 'カテゴリ別平均原価率',
        formula: 'カテゴリ平均 = そのカテゴリのレシピの実際原価率の平均',
        variables: [],
      },
    ],
  },
  {
    title: '売上分析（ヒートマップ）',
    color: 'teal',
    formulas: [
      {
        name: 'セル色の強度',
        formula: '強度 = 0.15 + (値 ÷ 最大値) × 0.85',
        variables: [
          { symbol: '値', desc: 'そのセルの販売数または売上金額' },
          { symbol: '最大値', desc: 'ヒートマップ全体での最大値' },
          { symbol: '0.15', desc: 'データがある場合の最低透明度（完全に透明にならないようにする）' },
        ],
        example: '値 30、最大 100 → 0.15 + (30/100) × 0.85 = 0.405（約40%の濃さ）',
        note: '値が 0 の場合は強度 0（ほぼ透明）で表示',
      },
    ],
  },
  {
    title: '売上分析（気温×販売数 色）',
    color: 'cyan',
    formulas: [
      {
        name: '棒グラフの色補間',
        formula: 'ratio = (販売数 − 最小値) ÷ (最大値 − 最小値)\nR = 59 + ratio × (249 − 59)\nG = 130 + ratio × (115 − 130)\nB = 246 + ratio × (22 − 246)',
        variables: [
          { symbol: 'ratio', desc: '0〜1の正規化された値（低い=0、高い=1）' },
          { symbol: 'RGB(59,130,246)', desc: '販売数が最小のときの色（青系）' },
          { symbol: 'RGB(249,115,22)', desc: '販売数が最大のときの色（オレンジ系）' },
        ],
        note: '販売数が多いほどオレンジ、少ないほど青で表示されます',
      },
    ],
  },
]

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  orange: { bg: 'bg-orange-900/20', border: 'border-orange-800/40', text: 'text-orange-400', badge: 'bg-orange-900/40 text-orange-300 border-orange-700/50' },
  blue:   { bg: 'bg-blue-900/20',   border: 'border-blue-800/40',   text: 'text-blue-400',   badge: 'bg-blue-900/40 text-blue-300 border-blue-700/50' },
  green:  { bg: 'bg-green-900/20',  border: 'border-green-800/40',  text: 'text-green-400',  badge: 'bg-green-900/40 text-green-300 border-green-700/50' },
  purple: { bg: 'bg-purple-900/20', border: 'border-purple-800/40', text: 'text-purple-400', badge: 'bg-purple-900/40 text-purple-300 border-purple-700/50' },
  teal:   { bg: 'bg-teal-900/20',   border: 'border-teal-800/40',   text: 'text-teal-400',   badge: 'bg-teal-900/40 text-teal-300 border-teal-700/50' },
  cyan:   { bg: 'bg-cyan-900/20',   border: 'border-cyan-800/40',   text: 'text-cyan-400',   badge: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/50' },
}

function FormulaCard({ f, color }: { f: Formula; color: string }) {
  const [open, setOpen] = useState(false)
  const c = colorMap[color]

  return (
    <div className={`border ${c.border} rounded-xl overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors`}
      >
        <span className="text-sm font-medium text-gray-200">{f.name}</span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
      </button>

      {open && (
        <div className={`px-4 pb-4 space-y-3 ${c.bg}`}>
          {/* 式 */}
          <div className="bg-gray-950/60 rounded-lg px-4 py-3 font-mono text-sm text-gray-100 whitespace-pre-line leading-relaxed">
            {f.formula}
          </div>

          {/* 変数説明 */}
          {f.variables.length > 0 && (
            <div className="space-y-1.5">
              {f.variables.map(v => (
                <div key={v.symbol} className="flex items-start gap-2 text-xs">
                  <span className={`shrink-0 font-mono px-1.5 py-0.5 rounded border text-[11px] ${c.badge}`}>{v.symbol}</span>
                  <span className="text-gray-400 pt-0.5">{v.desc}</span>
                </div>
              ))}
            </div>
          )}

          {/* 例 */}
          {f.example && (
            <div className="text-xs text-gray-400 bg-gray-800/50 rounded-lg px-3 py-2">
              <span className="text-gray-500 mr-1">例:</span>{f.example}
            </div>
          )}

          {/* 備考 */}
          {f.note && (
            <p className="text-xs text-gray-500 italic">{f.note}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function FormulasPage() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    '原価計算': true,
    '売価計算': true,
  })

  const toggle = (title: string) =>
    setOpenSections(prev => ({ ...prev, [title]: !prev[title] }))

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-orange-400" />
          計算式一覧
        </h1>
        <p className="text-gray-400 text-sm mt-1">MenuCost が使用しているすべての計算式の説明</p>
      </div>

      {SECTIONS.map(section => {
        const c = colorMap[section.color]
        const isOpen = openSections[section.title] ?? false
        return (
          <div key={section.title} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(section.title)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
            >
              <h2 className={`font-semibold text-sm ${c.text}`}>{section.title}</h2>
              {isOpen
                ? <ChevronDown className="w-4 h-4 text-gray-500" />
                : <ChevronRight className="w-4 h-4 text-gray-500" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-2">
                {section.formulas.map(f => (
                  <FormulaCard key={f.name} f={f} color={section.color} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
