import { KospiData } from '@/lib/kospi'
import Link from 'next/link'

interface Props {
  nextTradingDay: string   // YYYY-MM-DD
  prevKospi: KospiData | null
}

function formatNextDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(`${y}-${m}-${d}T00:00:00+09:00`)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const dow = days[date.getDay()]
  return `${parseInt(m)}월 ${parseInt(d)}일 (${dow})`
}

export default function ClosedDayView({ nextTradingDay, prevKospi }: Props) {
  const nextDayLabel = formatNextDay(nextTradingDay)

  return (
    <div className="space-y-3">
      {/* 휴장 안내 카드 */}
      <div className="card text-center py-10">
        <p className="text-5xl mb-4">🎌</p>
        <p className="text-xl font-black text-gray-800 mb-2">
          오늘은 시장이 쉬는 날이에요
        </p>
        <p className="text-gray-400 text-sm leading-relaxed">
          한국 증시 휴장일입니다.<br />
          <span className="font-bold text-gray-600">{nextDayLabel}</span>에 다시 만나요! 👋
        </p>
      </div>

      {/* 마지막 KOSPI 종가 */}
      {prevKospi && (
        <div className="card">
          <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">마지막 거래일 종가</p>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-black text-gray-900">
              {prevKospi.close.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="pb-0.5">
              <span className={`text-sm font-bold ${prevKospi.change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {prevKospi.change >= 0 ? '▲' : '▼'} {Math.abs(prevKospi.change).toFixed(2)}
                &nbsp;({prevKospi.change >= 0 ? '+' : ''}{prevKospi.changeRate.toFixed(2)}%)
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">{prevKospi.date.replace(/-/g, '. ')} 기준</p>
        </div>
      )}

      {/* 리더보드 바로가기 */}
      <Link
        href="/leaderboard"
        className="card flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div>
          <p className="font-bold text-gray-800">🏆 현재 리더보드</p>
          <p className="text-sm text-gray-400 mt-0.5">지금까지의 스트릭 순위를 확인해보세요</p>
        </div>
        <span className="text-gray-400 text-xl">›</span>
      </Link>
    </div>
  )
}
