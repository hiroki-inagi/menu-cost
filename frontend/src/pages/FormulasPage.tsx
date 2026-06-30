import { useState } from 'react'
import { BookOpen } from 'lucide-react'

// ────────────────────────────────────────────
// タブ定義
// ────────────────────────────────────────────
const TABS = [
  { id: 'cost',     label: '食材原価',   icon: '🧅' },
  { id: 'price',    label: '売値の決め方', icon: '💴' },
  { id: 'status',   label: '原価率の信号機', icon: '🚦' },
  { id: 'fl',       label: 'FL比率',     icon: '📊' },
  { id: 'analysis', label: '売上グラフ',  icon: '📈' },
] as const
type TabId = typeof TABS[number]['id']

// ────────────────────────────────────────────
// 共通コンポーネント
// ────────────────────────────────────────────

/** 「何を入力するか」「何が出るか」を示すフロー */
function FlowCard({ inputs, output }: { inputs: string[]; output: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-gray-800/60 rounded-xl px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {inputs.map((inp, i) => (
          <span key={i} className="bg-gray-700 text-gray-200 text-xs px-2.5 py-1 rounded-lg">{inp}</span>
        ))}
      </div>
      <span className="text-gray-500 text-sm">→</span>
      <span className="bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs px-2.5 py-1 rounded-lg font-semibold">{output}</span>
    </div>
  )
}

/** 具体例ブロック */
function ExampleBlock({ scene, lines, result }: { scene: string; lines: string[]; result: string }) {
  return (
    <div className="bg-gray-900/60 rounded-xl overflow-hidden">
      <div className="px-4 py-2 bg-gray-800/60 text-xs text-gray-400 border-b border-gray-800">{scene}</div>
      <div className="px-4 py-3 space-y-1">
        {lines.map((l, i) => (
          <div key={i} className="text-sm text-gray-300 font-mono">{l}</div>
        ))}
        <div className="mt-2 pt-2 border-t border-gray-800 text-sm font-semibold text-orange-400">→ {result}</div>
      </div>
    </div>
  )
}

/** セクション見出し */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-bold text-gray-100 mt-6 mb-3 first:mt-0">{children}</h2>
}

/** ポイントボックス */
function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-orange-500/60 pl-3 text-xs text-gray-400 leading-relaxed">
      💡 {children}
    </div>
  )
}

/** ステータスバッジ */
function StatusBadge({ color, label, desc }: { color: string; label: string; desc: string }) {
  const styles: Record<string, string> = {
    green:  'bg-green-900/40 border-green-700/50 text-green-300',
    yellow: 'bg-yellow-900/40 border-yellow-700/50 text-yellow-300',
    red:    'bg-red-900/40 border-red-700/50 text-red-300',
  }
  return (
    <div className={`rounded-xl border px-4 py-3 ${styles[color]}`}>
      <div className="font-bold text-sm mb-1">{label}</div>
      <div className="text-xs opacity-80 leading-relaxed">{desc}</div>
    </div>
  )
}

// ────────────────────────────────────────────
// タブコンテンツ
// ────────────────────────────────────────────

function TabCost() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-400 leading-relaxed">
        メニュー1品を作るために食材が<strong className="text-gray-200">いくらかかるか</strong>を計算します。
        これが「原価（げんか）」で、売値の決め方やメニューの見直しの基本になります。
      </p>

      <SectionTitle>① 食材1つのコスト</SectionTitle>
      <p className="text-xs text-gray-400 leading-relaxed mb-2">
        食材には「皮むき」「骨」「脂身」など<strong className="text-gray-300">捨てる部分</strong>があります。
        実際に使える分だけに換算して、正確なコストを出します。
      </p>
      <FlowCard
        inputs={['仕入れ単価', '使う量', '実際に使える割合（歩留まり）']}
        output="この食材のコスト"
      />
      <div className="bg-gray-800/40 rounded-xl px-4 py-3 text-sm text-gray-200">
        食材コスト ＝ 単価 × 使う量 ÷ 歩留まり率
      </div>
      <ExampleBlock
        scene="鶏もも肉：1kgあたり600円、レシピで200g使用、骨・皮を除くと80%使える"
        lines={[
          '600円 × 0.2kg = 120円（重さの分だけ）',
          '120円 ÷ 0.8 = 150円（捨てる分も含めた実際のコスト）',
        ]}
        result="この食材のコストは 150円"
      />
      <TipBox>
        歩留まりとは「捨てずに使える割合」のこと。野菜の皮・魚の骨・肉の脂身などを除いた後に残る量で決まります。
        豆腐・卵・牛乳など捨てる部分がない食材は 100（100%）のままで大丈夫です。
      </TipBox>

      <SectionTitle>② レシピ全体の食材費</SectionTitle>
      <p className="text-xs text-gray-400 leading-relaxed mb-2">
        レシピに使うすべての食材のコストを足し合わせます。
      </p>
      <FlowCard
        inputs={['食材Aのコスト', '食材Bのコスト', '食材C…のコスト']}
        output="総食材費"
      />
      <ExampleBlock
        scene="から揚げ定食のレシピ"
        lines={[
          '鶏もも肉：150円',
          '醤油・みりん：12円',
          'ごはん：30円',
          '漬物・味噌汁：25円',
        ]}
        result="総食材費 = 217円"
      />

      <SectionTitle>③ 1人前の食材費</SectionTitle>
      <p className="text-xs text-gray-400 leading-relaxed mb-2">
        まとめて仕込む場合でも、売値と比べるために「1人前いくらか」に換算します。
      </p>
      <FlowCard
        inputs={['総食材費', '何人前で仕込むか']}
        output="1人前の食材費"
      />
      <div className="bg-gray-800/40 rounded-xl px-4 py-3 text-sm text-gray-200">
        1人前の食材費 ＝ 総食材費 ÷ 仕込み人数
      </div>
      <ExampleBlock
        scene="スープを10人前まとめて仕込む。食材費の合計は2,000円"
        lines={['2,000円 ÷ 10人前 = 200円']}
        result="1人前の食材費は 200円"
      />
    </div>
  )
}

function TabPrice() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-400 leading-relaxed">
        食材費が出たら、次は<strong className="text-gray-200">「いくらで売ればいいか」</strong>の目安を計算します。
        感覚で値段を決めると赤字になるリスクがあるため、数字から逆算します。
      </p>

      <SectionTitle>① 原価率とは何か</SectionTitle>
      <p className="text-xs text-gray-400 leading-relaxed mb-2">
        売値に対して食材費が<strong className="text-gray-300">何パーセントか</strong>を示す数字です。
        この割合が低いほど、利益が大きくなります。
      </p>
      <FlowCard
        inputs={['1人前の食材費', '現行の売値']}
        output="原価率（%）"
      />
      <div className="bg-gray-800/40 rounded-xl px-4 py-3 text-sm text-gray-200">
        原価率 ＝ 1人前の食材費 ÷ 売値 × 100
      </div>
      <ExampleBlock
        scene="1人前食材費 200円、売値 700円"
        lines={['200円 ÷ 700円 = 0.286 → 28.6%']}
        result="原価率は 28.6%。売値の約3割が食材代"
      />
      <TipBox>
        飲食店の目安は 28〜35% です。ただしこれは食材費だけの割合で、人件費・家賃・光熱費は含まれていません。
      </TipBox>

      <SectionTitle>② 推奨売値（目標から逆算）</SectionTitle>
      <p className="text-xs text-gray-400 leading-relaxed mb-2">
        「原価率をこのくらいにしたい」という目標から、最低限いくら以上で売らないといけないかを計算します。
        端数は設定した単位（50円・100円など）で切り上げ、キリよくまとめます。
      </p>
      <FlowCard
        inputs={['1人前の食材費', '目標原価率', '端数処理単位']}
        output="推奨売値（税抜）"
      />
      <div className="bg-gray-800/40 rounded-xl px-4 py-3 space-y-1 text-sm text-gray-200">
        <div>手順① 食材費 ÷ 目標原価率 ＝ 最低限必要な金額</div>
        <div>手順② 端数を設定単位で切り上げる</div>
      </div>
      <ExampleBlock
        scene="1人前食材費 200円、目標原価率 30%、端数処理 50円単位"
        lines={[
          '200 ÷ 0.30 = 666.7円（最低ライン）',
          '50円単位で切り上げ → 700円（税抜）',
        ]}
        result="推奨売値（税抜）は 700円"
      />

      <SectionTitle>③ 推奨売値（税込）</SectionTitle>
      <FlowCard
        inputs={['推奨売値（税抜）', '消費税率']}
        output="推奨売値（税込）"
      />
      <div className="bg-gray-800/40 rounded-xl px-4 py-3 text-sm text-gray-200">
        税込売値 ＝ 税抜売値 × (1 ＋ 消費税率)
      </div>
      <ExampleBlock
        scene="税抜 700円、消費税 10%"
        lines={['700円 × 1.10 = 770円']}
        result="推奨売値（税込）は 770円"
      />
      <TipBox>
        目標原価率はレシピごとに変えられます。高級食材を使うメニューは少し高め（35%）、
        看板メニューは低め（28%）など、メニューの性格に合わせて設定できます。
        空欄のときは店舗設定のデフォルト値が使われます。
      </TipBox>
    </div>
  )
}

function TabStatus() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-400 leading-relaxed">
        現行の売値と食材費から算出した「実際の原価率」を、3段階の色で評価します。
        どのメニューが問題あるかを一目で把握するための機能です。
      </p>

      <SectionTitle>何を見ているか</SectionTitle>
      <FlowCard
        inputs={['1人前の食材費', '現行の売値（設定済みの場合）']}
        output="実際の原価率 → 色で判定"
      />
      <p className="text-xs text-gray-500 mt-1">※ 売値が未設定のメニューは判定されません</p>

      <SectionTitle>3段階の判定基準</SectionTitle>
      <div className="space-y-3">
        <StatusBadge
          color="green"
          label="🟢 緑（優良）— 原価率 25% 以下"
          desc="食材費が売値の4分の1以下に抑えられています。利益率が高く、理想的な状態です。"
        />
        <StatusBadge
          color="yellow"
          label="🟡 黄（要注意）— 原価率 25〜35%"
          desc="一般的な飲食店の範囲内です。問題ではありませんが、改善できるとより利益が出ます。"
        />
        <StatusBadge
          color="red"
          label="🔴 赤（危険）— 原価率 35% 超"
          desc="食材費が売値の3分の1を超えています。人件費や家賃を払うと利益がほとんど残りません。売値の見直しか食材コストの削減が必要です。"
        />
      </div>

      <SectionTitle>ダッシュボードとの関係</SectionTitle>
      <div className="bg-gray-800/50 rounded-xl px-4 py-4 space-y-2 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-red-400 font-bold text-base">件</span>
          <div>
            <div className="text-gray-200 font-semibold">「要改善メニュー」の件数</div>
            <div className="text-xs text-gray-500 mt-0.5">🔴 赤（危険）と判定されたメニューの合計数です</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-orange-400 font-bold text-base">%</span>
          <div>
            <div className="text-gray-200 font-semibold">「平均原価率」の数字</div>
            <div className="text-xs text-gray-500 mt-0.5">全メニューの実際の原価率を平均したものです（売値設定済みのメニューのみ）</div>
          </div>
        </div>
      </div>

      <TipBox>
        25% / 35% という基準はあくまで目安です。カニやウニなど高級食材を使うメニューは
        38〜40% でも成立する場合があります。店舗のコンセプトや客単価に合わせて判断してください。
      </TipBox>
    </div>
  )
}

function TabFL() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-400 leading-relaxed">
        FL比率は飲食店経営の健全さを測る<strong className="text-gray-200">代表的な指標</strong>です。
        「食材費（Food）」と「人件費（Labor）」の2大コストが売上の何%を占めるかを示します。
      </p>

      <SectionTitle>FL比率とは</SectionTitle>
      <FlowCard
        inputs={['平均原価率（食材費率）', '人件費率（設定ページで入力）']}
        output="FL比率（%）"
      />
      <div className="bg-gray-800/40 rounded-xl px-4 py-3 text-sm text-gray-200">
        FL比率 ＝ 平均原価率（F） ＋ 人件費率（L）
      </div>
      <ExampleBlock
        scene="平均原価率 30%、スタッフの人件費が売上の 25%"
        lines={['30% ＋ 25% = 55%']}
        result="FL比率は 55%（健全な範囲）"
      />

      <SectionTitle>なぜ 60% が目安なのか</SectionTitle>
      <div className="bg-gray-800/50 rounded-xl px-4 py-4 text-sm space-y-3">
        <p className="text-gray-300">売上100円のうち、FL比率が55%なら残り45円が手元に残ります。</p>
        <div className="space-y-1.5 text-xs text-gray-400">
          <div className="flex justify-between"><span>売上</span><span className="font-mono text-gray-200">100円</span></div>
          <div className="flex justify-between text-red-400/80"><span>食材費（F）</span><span className="font-mono">－ 30円</span></div>
          <div className="flex justify-between text-red-400/80"><span>人件費（L）</span><span className="font-mono">－ 25円</span></div>
          <div className="border-t border-gray-700 pt-1 flex justify-between text-gray-200"><span>残り（家賃・光熱費などに充てる）</span><span className="font-mono">45円</span></div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          FL比率が <strong className="text-red-400">60% を超える</strong>と、残り40円では家賃・光熱費・消耗品などを払うと利益がほぼゼロになります。
        </p>
      </div>

      <SectionTitle>平均原価率の算出方法</SectionTitle>
      <p className="text-xs text-gray-400 leading-relaxed mb-2">
        売値が設定されている全メニューの原価率を平均した数字です。
      </p>
      <FlowCard
        inputs={['各メニューの実際の原価率']}
        output="平均原価率"
      />
      <ExampleBlock
        scene="レシピが3品：から揚げ定食 28%、ラーメン 32%、チャーハン 34%"
        lines={['（28 ＋ 32 ＋ 34）÷ 3 = 31.3%']}
        result="店舗全体の平均原価率は 31.3%"
      />
      <TipBox>
        売値が未設定のメニューは平均原価率の計算から除外されます。
        正確な数字を出すには、レシピ管理ページで全メニューに売値を設定しましょう。
        人件費率は「設定」ページで入力すると、FL比率が自動で表示されます。
      </TipBox>
    </div>
  )
}

function TabAnalysis() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-400 leading-relaxed">
        売上分析ページに表示されるグラフの<strong className="text-gray-200">色や濃さの意味</strong>を解説します。
        どちらも「数字を見なくても傾向がわかる」ことを目的にしています。
      </p>

      <SectionTitle>曜日別ヒートマップの色の濃さ</SectionTitle>
      <p className="text-xs text-gray-400 leading-relaxed mb-3">
        売上分析 →「曜日別」タブに表示される表です。
        メニューごとに曜日別の売れ行きをオレンジの濃淡で表しています。
      </p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { style: 'rgba(249,115,22,0.15)', label: 'ほぼ売れていない', sub: '（データあり・最低限の薄さ）' },
          { style: 'rgba(249,115,22,0.5)',  label: 'そこそこ売れている' , sub: '' },
          { style: 'rgba(249,115,22,1.0)',  label: '一番売れている', sub: '（最大値）' },
        ].map((c, i) => (
          <div key={i} className="rounded-xl p-3 flex flex-col items-center gap-2"
            style={{ background: c.style, border: `1px solid rgba(249,115,22,0.3)` }}>
            <span className="text-xs text-center text-white font-semibold leading-tight">{c.label}</span>
            {c.sub && <span className="text-[10px] text-white/60 text-center">{c.sub}</span>}
          </div>
        ))}
      </div>

      <div className="bg-gray-800/50 rounded-xl px-4 py-4 space-y-2">
        <p className="text-xs font-semibold text-gray-300 mb-2">色の濃さの決まり方</p>
        <div className="space-y-1.5 text-xs text-gray-400">
          <div>① その週・期間で<strong className="text-gray-200">最も売れた数を「最大値」</strong>とします</div>
          <div>② 各セルの値が最大値に近いほど<strong className="text-orange-400">濃いオレンジ</strong>になります</div>
          <div>③ データがある場合は最低でも薄く見える程度の濃さをキープ</div>
          <div>④ データがない（0食）は<strong className="text-gray-300">ほぼ透明</strong>で表示</div>
        </div>
      </div>
      <ExampleBlock
        scene="その期間で最も売れたメニューの販売数が 100食"
        lines={[
          '30食のセル → 30 ÷ 100 = 30% の濃さ（薄め）',
          '80食のセル → 80 ÷ 100 = 80% の濃さ（濃いめ）',
          '0食のセル  → ほぼ透明',
        ]}
        result="売れているほど濃く、売れていないほど薄く表示される"
      />

      <SectionTitle>気温×販売数グラフの棒の色</SectionTitle>
      <p className="text-xs text-gray-400 leading-relaxed mb-3">
        売上分析 →「天気別」タブ →「気温×販売数 相関」に表示されるグラフです。
        同じメニューが、気温によってどれだけ売れ方が変わるかを棒グラフで見られます。
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.4)' }}>
          <div className="text-blue-300 font-bold text-sm">青色</div>
          <div className="text-xs text-blue-200/70 mt-1">販売数が少ない日</div>
          <div className="text-xs text-blue-200/50 mt-0.5">（寒い日・売れにくい日）</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(249,115,22,0.25)', border: '1px solid rgba(249,115,22,0.4)' }}>
          <div className="text-orange-300 font-bold text-sm">オレンジ色</div>
          <div className="text-xs text-orange-200/70 mt-1">販売数が多い日</div>
          <div className="text-xs text-orange-200/50 mt-0.5">（暑い日・売れやすい日）</div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl px-4 py-4 text-xs text-gray-400 leading-relaxed">
        棒の色はすべての日の中での<strong className="text-gray-200">相対的な売れ具合</strong>で決まります。
        一番売れた日がオレンジ、一番売れなかった日が青、その間は段階的に色が変わります。
      </div>

      <ExampleBlock
        scene="アイスコーヒーを選択。最少3食（寒い日）、最多25食（暑い日）"
        lines={[
          '3食の棒  → 青色で表示',
          '14食の棒 → 青とオレンジの中間色',
          '25食の棒 → オレンジ色で表示',
        ]}
        result="気温が上がるほど棒がオレンジになり、温度と売上の関係が一目でわかる"
      />
      <TipBox>
        このグラフを使うには、売上が十分に蓄積されている必要があります。
        まずは売上入力を毎日続けることで、より精度の高いデータが見られるようになります。
      </TipBox>
    </div>
  )
}

const TAB_CONTENT: Record<TabId, React.ReactNode> = {
  cost:     <TabCost />,
  price:    <TabPrice />,
  status:   <TabStatus />,
  fl:       <TabFL />,
  analysis: <TabAnalysis />,
}

// ────────────────────────────────────────────
// メインページ
// ────────────────────────────────────────────
export default function FormulasPage() {
  const [activeTab, setActiveTab] = useState<TabId>('cost')
  const active = TABS.find(t => t.id === activeTab)!

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-orange-400" />
          計算式ガイド
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          MenuCost の各数字がどのように算出されているかをわかりやすく解説します
        </p>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-800">
          <span className="text-2xl">{active.icon}</span>
          <h2 className="font-bold text-gray-100">{active.label}</h2>
        </div>
        {TAB_CONTENT[activeTab]}
      </div>
    </div>
  )
}
