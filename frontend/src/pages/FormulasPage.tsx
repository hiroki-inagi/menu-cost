import { useState } from 'react'
import { ChevronDown, ChevronRight, BookOpen, HelpCircle } from 'lucide-react'

interface FormulaItem {
  title: string
  summary: string         // 一言説明
  steps?: string[]        // ステップ形式の計算手順
  formula?: string        // 式（シンプルな場合のみ）
  example: { scene: string; calc: string[]; result: string }
  why: string             // なぜこの計算が必要か
  tip?: string            // 知っておくと役立つポイント
}

interface Section {
  heading: string
  icon: string
  color: string
  intro: string
  items: FormulaItem[]
}

const SECTIONS: Section[] = [
  {
    heading: '食材の原価を計算する',
    icon: '🧅',
    color: 'orange',
    intro: 'メニュー1品を作るのに、食材代がいくらかかるかを計算します。',
    items: [
      {
        title: '食材1つあたりのコスト',
        summary: '仕入れた食材を「実際に使える分だけ」に換算してコストを出します',
        steps: [
          '① 単価（円）× 使用量 でまず金額を出す',
          '② それを 歩留まり率（実際に使える割合）で割る',
        ],
        formula: '食材コスト ＝ 単価 × 使用量 ÷ 歩留まり率',
        example: {
          scene: '鶏もも肉：1kg あたり 600円。レシピで 200g 使う。皮や骨を除くと実際に使えるのは 80%（0.8）',
          calc: [
            '600円 × 0.2kg = 120円（単純な重さ分）',
            '120円 ÷ 0.8 = 150円（廃棄分も含めた実コスト）',
          ],
          result: 'この食材のコストは 150円',
        },
        why: '食材は捨てる部分があるため、使った重さそのままで計算すると実際のコストより安く見えてしまいます。歩留まりで割ることで正確なコストが出ます。',
        tip: '歩留まり率とは「捨てずに使える割合」のこと。野菜の皮むき・魚の骨・肉の脂身などを除いた後に残る割合です。使い切れる食材（豆腐・卵など）は 1.0 のまま計算します。',
      },
      {
        title: 'レシピ全体の食材費',
        summary: 'レシピに使うすべての食材コストを足し合わせます',
        formula: '総食材費 ＝ 食材Aのコスト ＋ 食材Bのコスト ＋ 食材Cのコスト ＋ …',
        example: {
          scene: 'から揚げ定食のレシピ',
          calc: [
            '鶏もも肉：150円',
            '醤油・みりん：12円',
            'ごはん：30円',
            '漬物・味噌汁：25円',
          ],
          result: '総食材費 ＝ 217円',
        },
        why: '個々の食材コストをすべて把握することで、どの食材が原価を押し上げているかがわかります。',
      },
      {
        title: '1人前の食材費',
        summary: '大量に仕込む場合でも、1人前あたりのコストに換算します',
        formula: '1人前の食材費 ＝ 総食材費 ÷ 何人前で仕込むか',
        example: {
          scene: 'スープを10人前まとめて仕込む。食材費の合計は 2,000円',
          calc: ['2,000円 ÷ 10人前 ＝ 200円'],
          result: '1人前の食材費は 200円',
        },
        why: '多くのレシピはまとめて仕込むため、売価と比較するには1人前に換算する必要があります。',
      },
    ],
  },
  {
    heading: '売価（値段）を決める',
    icon: '💴',
    color: 'blue',
    intro: '食材費から「いくらで売ればいいか」の目安を計算します。',
    items: [
      {
        title: '原価率とは何か',
        summary: '売値に対して食材費が何%かを表す数字です',
        formula: '原価率 ＝ 1人前の食材費 ÷ 売値 × 100',
        example: {
          scene: '1人前食材費 200円、売値 700円',
          calc: ['200円 ÷ 700円 ＝ 0.286 → 28.6%'],
          result: '原価率は 28.6%',
        },
        why: '飲食店では原価率が低いほど利益が出やすいです。一般的に 28〜35% が目安とされています。',
        tip: '原価率は食材費だけの比率です。人件費・家賃・光熱費などは含まれていません。それらを含めた指標が「FL比率」です。',
      },
      {
        title: '目標の売値を自動計算する仕組み',
        summary: '「この原価率で売りたい」という目標から、最低限の売値を逆算します',
        steps: [
          '① 1人前の食材費 ÷ 目標原価率 で「最低限必要な税抜売値」を出す',
          '② 設定した端数処理単位（50円・100円など）で切り上げ、キリのよい数字にする',
          '③ 消費税をかけて「税込売値」を出す',
        ],
        example: {
          scene: '1人前食材費 200円、目標原価率 30%、端数処理 50円単位、消費税 10%',
          calc: [
            '200円 ÷ 0.30 ＝ 666.7円',
            '50円単位で切り上げ → 700円（税抜）',
            '700円 × 1.10 ＝ 770円（税込）',
          ],
          result: '推奨売値は 770円（税込）／700円（税抜）',
        },
        why: '値段を感覚で決めると、原価割れのリスクがあります。目標原価率から逆算することで「最低これ以上で売らないと赤字」という基準が明確になります。',
        tip: '目標原価率はレシピごとに変えることもできます。例えば看板メニューは少し低め（28%）、セットメニューは高め（35%）など使い分けが可能です。',
      },
    ],
  },
  {
    heading: '原価率の信号機（ステータス）',
    icon: '🚦',
    color: 'green',
    intro: '実際の原価率が高いか低いかを、3段階の色で教えてくれます。',
    items: [
      {
        title: '緑・黄・赤の判定基準',
        summary: '原価率に応じて3段階で評価します',
        steps: [
          '🟢 緑（優良）：原価率が 25% 以下 ― 利益率が高く、理想的な状態',
          '🟡 黄（要注意）：原価率が 25〜35% ― 一般的な範囲だが、改善の余地あり',
          '🔴 赤（危険）：原価率が 35% 超 ― このままでは利益が出にくい状態',
        ],
        example: {
          scene: 'ランチメニューA：原価率 40%、ディナーメニューB：原価率 29%',
          calc: [
            'メニューA → 35%超なので 🔴 赤（危険）',
            'メニューB → 25〜35% なので 🟡 黄（要注意）',
          ],
          result: 'メニューAは売値を上げるか食材を見直す必要があります',
        },
        why: 'ダッシュボードの「要改善メニュー」の数は、赤（危険）と判定されたメニューの合計です。ここを減らすことが店舗の利益改善につながります。',
        tip: '25%の基準はあくまで目安です。食材が高価なメニュー（海鮮・和牛など）は35%前後でも問題ない場合があります。',
      },
    ],
  },
  {
    heading: 'FL比率（店舗全体の健全度）',
    icon: '📊',
    color: 'purple',
    intro: '食材費と人件費を合わせた、飲食店の経営健全性を測る代表的な指標です。',
    items: [
      {
        title: 'FL比率の計算',
        summary: '食材費率（F）と人件費率（L）を足したものがFL比率です',
        formula: 'FL比率 ＝ 平均原価率（食材費率）＋ 人件費率',
        example: {
          scene: '全メニューの平均原価率が 30%、売上に対する人件費が 25%',
          calc: ['30% ＋ 25% ＝ 55%'],
          result: 'FL比率は 55%（健全な範囲）',
        },
        why: '食材費だけ見ていても店舗全体の収益性はわかりません。人件費を加えたFL比率で「売上のうち何%が2大コストに使われているか」が把握できます。',
        tip: 'FL比率 60% 以下が健全の目安です。60% を超えると家賃・光熱費・その他を支払うと利益がほとんど残らなくなります。設定ページで人件費率を入力すると自動で計算されます。',
      },
      {
        title: '平均原価率（ダッシュボード表示）',
        summary: '売値が設定されている全メニューの原価率を平均した数字です',
        formula: '平均原価率 ＝ 全メニューの原価率の合計 ÷ メニュー数',
        example: {
          scene: 'メニューが3品：28%・32%・34%',
          calc: ['（28 ＋ 32 ＋ 34）÷ 3 ＝ 31.3%'],
          result: '店舗の平均原価率は 31.3%',
        },
        why: '個々のメニューではなく、店全体としての食材コストの傾向を把握するために使います。',
        tip: '売値が未設定のメニューは計算から除外されます。正確な数字を出すには、全メニューに売値を設定しましょう。',
      },
    ],
  },
  {
    heading: '売上分析グラフの見方',
    icon: '📈',
    color: 'teal',
    intro: '売上分析で使っているグラフの色や強度がどのように決まるかを説明します。',
    items: [
      {
        title: '曜日別ヒートマップの色の濃さ',
        summary: '販売数が多いほど濃いオレンジ、少ないほど薄くなります',
        steps: [
          '全データの中で最も多い数を「最大」とします',
          '各セルの値が最大に近いほど濃く（100%のオレンジ）表示されます',
          '値がある場合は最低でも薄く見える程度（15%）の濃さをキープします',
          '値が 0（データなし）の場合はほぼ透明になります',
        ],
        example: {
          scene: '週最大販売数が 100食。ある曜日のメニューAが 30食',
          calc: ['30 ÷ 100 ＝ 30% → 全体の30%の濃さ（薄めのオレンジ）'],
          result: '販売数が多い曜日ほど濃いオレンジで目立ちます',
        },
        why: '表の数字だけを見るより、色の濃淡で「どの曜日・メニューが売れているか」が一目でわかります。',
      },
      {
        title: '気温×販売数グラフの棒の色',
        summary: '販売数が多い日はオレンジ、少ない日は青で表示されます',
        steps: [
          '一番少ない日 → 青色',
          '一番多い日 → オレンジ色',
          '中間の日 → 青とオレンジの間の色',
        ],
        example: {
          scene: 'アイスコーヒーの販売数：最少 3食（寒い日）、最多 25食（暑い日）',
          calc: ['3食 → 青色で表示', '25食 → オレンジ色で表示'],
          result: '気温が高いほどオレンジになり、温度と売上の関係が一目でわかります',
        },
        why: '「暑い日にこのメニューが売れる」「寒い日はこっちが売れる」という傾向を視覚的に把握するためのグラフです。',
      },
    ],
  },
]

const colorMap: Record<string, { accent: string; border: string; cardBorder: string; bg: string; tag: string }> = {
  orange: { accent: 'text-orange-400', border: 'border-orange-800/40', cardBorder: 'border-orange-800/30', bg: 'bg-orange-900/10', tag: 'bg-orange-900/40 text-orange-300' },
  blue:   { accent: 'text-blue-400',   border: 'border-blue-800/40',   cardBorder: 'border-blue-800/30',   bg: 'bg-blue-900/10',   tag: 'bg-blue-900/40 text-blue-300' },
  green:  { accent: 'text-green-400',  border: 'border-green-800/40',  cardBorder: 'border-green-800/30',  bg: 'bg-green-900/10',  tag: 'bg-green-900/40 text-green-300' },
  purple: { accent: 'text-purple-400', border: 'border-purple-800/40', cardBorder: 'border-purple-800/30', bg: 'bg-purple-900/10', tag: 'bg-purple-900/40 text-purple-300' },
  teal:   { accent: 'text-teal-400',   border: 'border-teal-800/40',   cardBorder: 'border-teal-800/30',   bg: 'bg-teal-900/10',   tag: 'bg-teal-900/40 text-teal-300' },
}

function FormulaCard({ item, color }: { item: FormulaItem; color: string }) {
  const [open, setOpen] = useState(false)
  const c = colorMap[color]

  return (
    <div className={`border ${c.cardBorder} rounded-xl overflow-hidden bg-gray-800/30`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start justify-between px-4 py-3.5 text-left hover:bg-white/5 transition-colors gap-3"
      >
        <div>
          <div className="text-sm font-semibold text-gray-100">{item.title}</div>
          <div className="text-xs text-gray-400 mt-0.5">{item.summary}</div>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
          : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />}
      </button>

      {open && (
        <div className={`border-t ${c.cardBorder} px-4 pb-5 pt-4 space-y-4 ${c.bg}`}>

          {/* 計算手順 or 式 */}
          {item.steps ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">計算の手順</p>
              <div className="space-y-1.5">
                {item.steps.map((s, i) => (
                  <div key={i} className="text-sm text-gray-200 leading-relaxed bg-gray-900/50 rounded-lg px-3 py-2">
                    {s}
                  </div>
                ))}
              </div>
            </div>
          ) : item.formula ? (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">計算式</p>
              <div className="bg-gray-900/60 rounded-lg px-4 py-3 text-sm text-gray-100 leading-relaxed">
                {item.formula}
              </div>
            </div>
          ) : null}

          {/* 具体例 */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">具体的な例</p>
            <div className="bg-gray-900/40 rounded-xl p-3 space-y-2">
              <p className="text-xs text-gray-400 leading-relaxed">{item.example.scene}</p>
              <div className="space-y-1">
                {item.example.calc.map((line, i) => (
                  <div key={i} className="text-sm text-gray-200 font-mono">{line}</div>
                ))}
              </div>
              <div className={`text-sm font-semibold ${c.accent} pt-1 border-t ${c.cardBorder}`}>
                → {item.example.result}
              </div>
            </div>
          </div>

          {/* なぜ必要か */}
          <div className="flex gap-2.5">
            <HelpCircle className={`w-4 h-4 shrink-0 mt-0.5 ${c.accent}`} />
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">なぜこの計算が必要？</p>
              <p className="text-xs text-gray-300 leading-relaxed">{item.why}</p>
            </div>
          </div>

          {/* ヒント */}
          {item.tip && (
            <div className={`text-xs text-gray-400 leading-relaxed border-l-2 ${c.border} pl-3`}>
              💡 {item.tip}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FormulasPage() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    '食材の原価を計算する': true,
    '売価（値段）を決める': true,
  })

  const toggle = (heading: string) =>
    setOpenSections(prev => ({ ...prev, [heading]: !prev[heading] }))

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-orange-400" />
          計算式ガイド
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          MenuCost が「どんな計算で数字を出しているか」をわかりやすく解説します
        </p>
      </div>

      {SECTIONS.map(section => {
        const c = colorMap[section.color]
        const isOpen = openSections[section.heading] ?? false
        return (
          <div key={section.heading} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(section.heading)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{section.icon}</span>
                <span className={`font-semibold text-sm ${c.accent}`}>{section.heading}</span>
              </div>
              {isOpen
                ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-gray-500 px-1 pb-1">{section.intro}</p>
                {section.items.map(item => (
                  <FormulaCard key={item.title} item={item} color={section.color} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
