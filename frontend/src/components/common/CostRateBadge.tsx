export default function CostRateBadge({ rate, status }: { rate: number | null; status?: string }) {
  if (rate === null) return <span className="text-gray-500 text-xs">未設定</span>
  const pct = (rate * 100).toFixed(1) + '%'
  const s = status || (rate <= 0.25 ? 'good' : rate <= 0.35 ? 'warning' : 'danger')
  const cls = s === 'good' ? 'bg-green-900/50 text-green-400 border-green-800'
    : s === 'warning' ? 'bg-yellow-900/50 text-yellow-400 border-yellow-800'
    : 'bg-red-900/50 text-red-400 border-red-800'
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-mono ${cls}`}>{pct}</span>
  )
}
