interface Props {
  total: number
  upCount: number
  downCount: number
}

export default function CommunityBar({ total, upCount, downCount }: Props) {
  const upPct = total > 0 ? Math.round((upCount / total) * 100) : 50
  const downPct = 100 - upPct

  return (
    <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-400 text-center mb-2">
        오늘 <strong className="text-gray-700">{total.toLocaleString()}명</strong>이 참여 중
      </p>
      <div className="flex rounded-full overflow-hidden h-2.5 mb-2">
        <div
          className="bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500"
          style={{ width: `${upPct}%` }}
        />
        <div
          className="bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500"
          style={{ width: `${downPct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-bold">
        <span className="text-red-500">▲ UP {upPct}%</span>
        <span className="text-blue-500">{downPct}% DOWN ▼</span>
      </div>
    </div>
  )
}
