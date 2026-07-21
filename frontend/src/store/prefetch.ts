/**
 * 先読み（プリフェッチ）
 *
 * ログイン直後・アプリ起動直後に、各画面が使うデータをまとめて裏で取得しておく。
 * これにより「ページを開いてから待つ」のではなく「開いた瞬間に出ている」状態になる。
 *
 * 従来（Layout 内で直接 API を叩いていた）との違い:
 *   - 共有ストア経由なので、各ページの取得と重複しない（同時要求は1本に集約）
 *   - 既に新しいキャッシュがある場合は再取得しない（無駄な通信をしない）
 *   - 取得結果は購読中の画面へ即座に反映される
 *
 * 画面をブロックしないので await 不要。失敗は握りつぶす（通常の取得でリカバリされる）。
 */
import { getStore } from './dataStore'
import { dashboardApi } from '../api/dashboard'
import { ingredientApi } from '../api/ingredients'
import { recipeApi } from '../api/recipes'
import { supplierApi } from '../api/suppliers'
import { salesApi } from '../api/sales'
import { weatherApi } from '../api/weather'

type Target = [key: string, fetcher: () => Promise<unknown>]

const now = () => new Date()
const monthKey = (d: Date) =>
  `monthly_sales_${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`

/** 優先度高: 入力フォームで使うマスタ（材料・レシピ・仕入先） */
const HIGH: Target[] = [
  ['all_ingredients', () => ingredientApi.list()],
  ['all_recipes',     () => recipeApi.list({ active_only: false })],
  ['recipes_active',  () => recipeApi.list({ active_only: true })],
  ['suppliers',       () => supplierApi.list()],
]

/** 優先度中: ダッシュボード・売上 */
const MEDIUM = (): Target[] => {
  const d = now()
  return [
    ['dashboard_all',       () => dashboardApi.all()],
    ['sales_heatmap',       () => salesApi.byWeekday()],
    ['sales_ranking_week',  () => salesApi.ranking('week')],
    ['sales_weather_all',   () => salesApi.byWeather(undefined)],
    ['weather_today',       () => weatherApi.today()],
    ['today_recommend',     () => salesApi.todayRecommend()],
    [monthKey(d),           () => salesApi.monthlySales(d.getFullYear(), d.getMonth() + 1)],
  ]
}

/** 優先度低: 他期間の売上ランキング */
const LOW: Target[] = [
  ['sales_ranking_day',   () => salesApi.ranking('day')],
  ['sales_ranking_month', () => salesApi.ranking('month')],
]

/** 1グループぶんを並列取得する（全部終わるまで待つが、失敗は無視） */
const runGroup = (targets: Target[]) =>
  Promise.allSettled(
    targets.map(([key, fetcher]) => getStore(key).revalidate(fetcher))
  )

/**
 * 全画面ぶんのデータを優先度順に先読みする。
 * ログイン直後 / リロード直後に呼ぶ。await 不要。
 */
export const prefetchAll = () => {
  void runGroup(HIGH)
    .then(() => runGroup(MEDIUM()))
    .then(() => runGroup(LOW))
    .catch(() => { /* 先読みの失敗は無視 */ })
}
