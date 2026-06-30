import { useEffect, useState, useMemo } from 'react'
import { storeApi } from '../api/store'
import { Store } from '../types'
import { Target, ChevronDown, ChevronRight, Info } from 'lucide-react'

// ─────────────────────────────────────────
// localStorage 保存キー
// ─────────────────────────────────────────
const LS_KEY = 'mc_target_revenue_inputs'

interface Inputs {
  rent: string          // 家賃
  utilities: string     // 光熱費・水道代
  labor_fixed: string   // 固定人件費（正社員など）
  other_fixed: string   // その他固定費
  target_profit: string // 目標利益（任意）
  working_days: string  // 月の営業日数
}

const DEFAULT_INPUTS: Inputs = {
  rent: '', utilities: '', labor_fixed: '', other_fixed: '',
  target_profit: '', working_days: '25',
}

// ─────────────────────────────────────────
// サブコンポーネント
// ─────────────────────────────────────────

function InputRow({
  label, sub, value, onChange, placeholder,
}: {
  label: string; sub?: string; value: string
  onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-300">{label}</div>
        {sub && <div className="text-xs text-gray-500">{sub}</div>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-gray-500 text-sm">¥</span>
        <input
          type="number" min="0" value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '0'}
          className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-right font-mono focus:outline-none focus:border-orange-500"
        />
      </div>
    </div>
  )
}

function ResultCard({
  label, sub, value, accent, large,
}: {
  label: string; sub?: string; value: string; accent?: boolean; large?: boolean
}) {
  return (
    <div className={`rounded-xl p-4 ${accent
      ? 'bg-orange-500/15 border border-orange-500/40'
      : 'bg-gray-800/60 border border-gray-700/50'}`}>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`font-mono font-bold ${large ? 'text-2xl' : 'text-lg'} ${accent ? 'text-orange-400' : 'text-gray-100'}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

function Explain({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/40 transition-colors text-left"
      >
        <span className="text-sm font-medium text-gray-300">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1 text-xs text-gray-400 leading-relaxed space-y-2 border-t border-gray-800 bg-gray-900/40">{children}</div>}
    </div>
  )
}

// ─────────────────────────────────────────
// メインページ
// ─────────────────────────────────────────
export default function TargetRevenuePage() {
  const [store, setStore] = useState<Store | null>(null)
  const [inputs, setInputs] = useState<Inputs>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      return saved ? { ...DEFAULT_INPUTS, ...JSON.parse(saved) } : DEFAULT_INPUTS
    } catch { return DEFAULT_INPUTS }
  })

  useEffect(() => { storeApi.getSettings().then(setStore) }, [])

  // 入力をlocalStorageに自動保存
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(inputs))
  }, [inputs])

  const set = (key: keyof Inputs) => (v: string) => setInputs(p => ({ ...p, [key]: v }))

  const num = (v: string) => Number(v) || 0

  // ─── 計算 ───
  const result = useMemo(() => {
    if (!store) return null

    const foodRate   = store.default_cost_rate              // 食材費率（例: 0.30）
    const laborRate  = store.labor_cost_rate ?? 0           // 人件費率（例: 0.25）
    const variableRate = foodRate + laborRate               // 変動費率合計

    const fixedTotal =
      num(inputs.rent) + num(inputs.utilities) +
      num(inputs.labor_fixed) + num(inputs.other_fixed)     // 月間固定費合計

    const workDays = Math.max(1, num(inputs.working_days))
    const targetProfit = num(inputs.target_profit)

    // 損益分岐点月商（固定費を回収するだけで利益ゼロ）
    const breakEvenMonthly = variableRate < 1
      ? fixedTotal / (1 - variableRate)
      : null

    // 目標月商（利益込み）
    const targetMonthly = variableRate < 1
      ? (fixedTotal + targetProfit) / (1 - variableRate)
      : null

    return {
      foodRate, laborRate, variableRate,
      fixedTotal, workDays, targetProfit,
      breakEvenMonthly,
      breakEvenDaily: breakEvenMonthly ? breakEvenMonthly / workDays : null,
      targetMonthly,
      targetDaily: targetMonthly ? targetMonthly / workDays : null,
    }
  }, [store, inputs])

  const fmt = (n: number | null) =>
    n === null ? '—' : `¥${Math.ceil(n).toLocaleString()}`

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`

  if (!store) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const r = result!

  return (
    <div className="max-w-xl space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Target className="w-5 h-5 text-orange-400" />
          目標売上シミュレーター
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          月の固定費を入力すると、<strong className="text-gray-200">1日いくら売ればいいか</strong>が自動でわかります
        </p>
      </div>

      {/* 店舗設定からの自動取得 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-sm font-semibold text-gray-300">店舗設定から自動で取得</span>
        </div>

        {/* 原価率の説明 */}
        <div className="bg-blue-950/30 border border-blue-900/40 rounded-lg px-3 py-2.5 text-xs text-blue-300/80 leading-relaxed">
          <strong className="text-blue-200">原価率（食材費率）とは？</strong><br />
          売上のうち「食材費が占める割合」です。<br />
          例えば原価率 30% なら、1,000円売れるたびに 300円分の食材を使っていることになります。<br />
          <span className="text-blue-400/60 mt-1 block">「設定」ページの「デフォルト目標原価率」がここに反映されています。</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/60 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">原価率（食材費）</div>
            <div className="text-lg font-bold text-orange-400">{pct(r.foodRate)}</div>
            <div className="text-xs text-gray-600 mt-1">設定の「目標原価率」</div>
          </div>
          <div className="bg-gray-800/60 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">人件費率</div>
            <div className={`text-lg font-bold ${r.laborRate > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
              {r.laborRate > 0 ? pct(r.laborRate) : '未設定'}
            </div>
            <div className="text-xs text-gray-600 mt-1">設定の「人件費率」</div>
          </div>
          <div className={`rounded-lg p-3 text-center ${r.variableRate <= 0.6 ? 'bg-green-900/20 border border-green-800/30' : 'bg-red-900/20 border border-red-800/30'}`}>
            <div className="text-xs text-gray-500 mb-1">合計（FL比率）</div>
            <div className={`text-lg font-bold ${r.variableRate <= 0.6 ? 'text-green-400' : 'text-red-400'}`}>{pct(r.variableRate)}</div>
            <div className="text-xs text-gray-600 mt-1">60%以下が目安</div>
          </div>
        </div>
        {r.laborRate === 0 && (
          <p className="text-xs text-yellow-500/80">
            ⚠ 人件費率が未設定のため合計が低く出ています。「設定」ページで人件費率を入力するとより正確になります。
          </p>
        )}
      </div>

      {/* 月間固定費の入力 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">月間の固定費を入力</h2>
        <p className="text-xs text-gray-500 -mt-2">毎月必ずかかる費用を入力してください。入力内容は自動保存されます。</p>

        <div className="space-y-3 divide-y divide-gray-800/60">
          <InputRow label="家賃" sub="店舗の賃料（月額）" value={inputs.rent} onChange={set('rent')} placeholder="例: 150000" />
          <div className="pt-3">
            <InputRow label="光熱費・水道代" sub="電気・ガス・水道の合計（月額）" value={inputs.utilities} onChange={set('utilities')} placeholder="例: 30000" />
          </div>
          <div className="pt-3">
            <InputRow label="固定の人件費" sub="正社員・固定給スタッフの給与（月額）" value={inputs.labor_fixed} onChange={set('labor_fixed')} placeholder="例: 200000" />
          </div>
          <div className="pt-3">
            <InputRow label="その他固定費" sub="通信費・リース料・保険料など（月額）" value={inputs.other_fixed} onChange={set('other_fixed')} placeholder="例: 20000" />
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-400">月間固定費 合計</span>
          <span className="font-mono font-bold text-gray-100 text-lg">¥{r.fixedTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* 営業日数・目標利益 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">営業日数・目標利益</h2>
        <div className="space-y-3 divide-y divide-gray-800/60">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm text-gray-300">月の営業日数</div>
              <div className="text-xs text-gray-500">定休日を除いた日数</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number" min="1" max="31" value={inputs.working_days}
                onChange={e => set('working_days')(e.target.value)}
                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-right font-mono focus:outline-none focus:border-orange-500"
              />
              <span className="text-gray-500 text-sm">日</span>
            </div>
          </div>
          <div className="pt-3">
            <InputRow
              label="月の目標利益（任意）"
              sub="「これだけ手元に残したい」という金額"
              value={inputs.target_profit}
              onChange={set('target_profit')}
              placeholder="例: 100000"
            />
          </div>
        </div>
      </div>

      {/* 結果 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">シミュレーション結果</h2>

        {r.fixedTotal === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">固定費を入力すると結果が表示されます</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <ResultCard
                label="損益分岐点（1日）"
                sub="これ以上売れば赤字にならない"
                value={fmt(r.breakEvenDaily)}
                large
                accent
              />
              <ResultCard
                label="損益分岐点（月）"
                sub={`月${r.workDays}日営業の場合`}
                value={fmt(r.breakEvenMonthly)}
              />
            </div>

            {r.targetProfit > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <ResultCard
                  label={`目標売上（1日）`}
                  sub={`月利益¥${r.targetProfit.toLocaleString()}を含む`}
                  value={fmt(r.targetDaily)}
                  large
                  accent
                />
                <ResultCard
                  label="目標売上（月）"
                  value={fmt(r.targetMonthly)}
                />
              </div>
            )}

            {/* 内訳バー */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500">1日の売上内訳イメージ（損益分岐点ベース）</p>
              {r.breakEvenDaily && (() => {
                const daily = r.breakEvenDaily
                const foodAmt  = daily * r.foodRate
                const laborAmt = daily * r.laborRate
                const fixedAmt = daily - foodAmt - laborAmt
                const bars = [
                  { label: '食材費', pct: r.foodRate * 100, color: 'bg-red-500', amt: foodAmt },
                  { label: '人件費', pct: r.laborRate * 100, color: 'bg-yellow-500', amt: laborAmt },
                  { label: '固定費（家賃など）', pct: (fixedAmt / daily) * 100, color: 'bg-blue-500', amt: fixedAmt },
                ]
                return (
                  <div className="space-y-2">
                    <div className="flex h-6 rounded-lg overflow-hidden w-full">
                      {bars.map(b => b.pct > 0 && (
                        <div key={b.label} className={`${b.color} opacity-80`} style={{ width: `${b.pct}%` }} title={`${b.label}: ${b.pct.toFixed(1)}%`} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {bars.map(b => (
                        <div key={b.label} className="flex items-center gap-1.5 text-xs text-gray-400">
                          <div className={`w-2.5 h-2.5 rounded-sm ${b.color} opacity-80`} />
                          <span>{b.label}</span>
                          <span className="font-mono text-gray-300">¥{Math.ceil(b.amt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          </>
        )}
      </div>

      {/* 計算式の説明 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300">この数字はどうやって出しているか</h2>

        <Explain title="① 変動費率とは何か">
          <p>売上が上がるほど比例して増える費用の割合を「変動費率」といいます。</p>
          <p className="mt-1">飲食店では <strong className="text-gray-300">食材費率（F）＋ 人件費率（L）</strong>が変動費にあたります。</p>
          <div className="bg-gray-800/60 rounded-lg px-3 py-2 mt-2 font-mono text-gray-200">
            変動費率 ＝ 食材費率 ＋ 人件費率
          </div>
          <p className="mt-2">例えば食材費率 30%、人件費率 25% なら変動費率は 55% です。売上100円のうち55円が食材と人件費に消えます。</p>
        </Explain>

        <Explain title="② 損益分岐点（赤字にならない最低売上）の計算">
          <p>「変動費を引いた残り」で固定費をちょうどまかなえる売上が損益分岐点です。</p>
          <div className="bg-gray-800/60 rounded-lg px-3 py-2 mt-2 space-y-1 font-mono text-gray-200 text-xs">
            <div>月間損益分岐点 ＝ 月間固定費 ÷ (1 − 変動費率)</div>
            <div className="text-gray-500">1日の損益分岐点 ＝ 月間損益分岐点 ÷ 営業日数</div>
          </div>
          <div className="mt-2 bg-gray-800/40 rounded-lg px-3 py-2 text-xs text-gray-300 space-y-1">
            <div className="text-gray-500">例：固定費 40万円、変動費率 55%、営業25日の場合</div>
            <div>400,000 ÷ (1 − 0.55) ＝ 888,889円（月間）</div>
            <div>888,889 ÷ 25日 ＝ <strong className="text-orange-400">35,556円 / 日</strong></div>
          </div>
          <p className="mt-2">「(1 − 変動費率)」は売上1円のうち固定費にまわせる割合です。変動費率が高いほど、より多く売らないと固定費がまかなえません。</p>
        </Explain>

        <Explain title="③ 目標利益を含む場合">
          <p>利益も「固定費と同じ」扱いにして計算します。月に10万円残したいなら、固定費に10万円を上乗せするだけです。</p>
          <div className="bg-gray-800/60 rounded-lg px-3 py-2 mt-2 space-y-1 font-mono text-gray-200 text-xs">
            <div>目標月商 ＝ (月間固定費 ＋ 目標利益) ÷ (1 − 変動費率)</div>
            <div className="text-gray-500">1日の目標売上 ＝ 目標月商 ÷ 営業日数</div>
          </div>
        </Explain>

        <Explain title="④ 内訳バーの見方">
          <p>損益分岐点の1日売上を「何にいくら使われるか」に分解して表示しています。</p>
          <div className="space-y-1 mt-1">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-red-500 opacity-80" /><span>食材費 ＝ 1日売上 × 食材費率</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-yellow-500 opacity-80" /><span>人件費 ＝ 1日売上 × 人件費率</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-blue-500 opacity-80" /><span>固定費 ＝ 月間固定費 ÷ 営業日数</span></div>
          </div>
          <p className="mt-2">損益分岐点では「3色の合計 ＝ 1日売上」になっており、利益はゼロです。目標利益を設定すると、その分だけ全体の売上目標が大きくなります。</p>
        </Explain>

        <Explain title="⑤ この計算の限界・注意点">
          <p>このシミュレーターはあくまで<strong className="text-gray-300">目安</strong>です。以下の点に注意してください：</p>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>食材費率・人件費率は平均値です。メニュー構成や曜日によって変わります</li>
            <li>アルバイトの時給は「変動費」ですが、ここでは「固定の人件費」欄に入力してください</li>
            <li>消費税の扱いは含んでいません（税込売上で入力する場合は別途調整が必要です）</li>
            <li>借入返済・設備投資は「その他固定費」に含めてください</li>
          </ul>
        </Explain>
      </div>
    </div>
  )
}
