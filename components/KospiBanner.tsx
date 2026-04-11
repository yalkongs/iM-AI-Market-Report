import { KospiData } from '@/lib/kospi'

interface Props {
  kospi: KospiData | null
  date: string
  deadlineLabel?: string   // 마감 시각 표시 (기본값 12:00)
  dateLabel?: string       // "어제 종가" 대신 표시할 텍스트 (예: "오늘 종가 ✅")
  subtitle?: string        // 하단 안내 문구 오버라이드
}

export default function KospiBanner({
  kospi, date,
  deadlineLabel = '12:00',
  dateLabel,
  subtitle,
}: Props) {
  const displayDate = date.replace(/-/g, '. ')
  const resolvedDateLabel = dateLabel ?? '어제 종가'
  const resolvedSubtitle = subtitle ?? `KRX 공식 데이터 · 오늘 ${deadlineLabel}까지 예측 가능`

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <div className="px-6 py-5 text-white">
        <p className="text-xs text-white/40 mb-1">{displayDate} {resolvedDateLabel}</p>

        {kospi ? (
          <>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black tracking-tight">
                {kospi.close.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="pb-1">
                <p className={`text-base font-bold ${kospi.change >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                  {kospi.change >= 0 ? '▲' : '▼'} {Math.abs(kospi.change).toFixed(2)}
                  &nbsp;({kospi.change >= 0 ? '+' : ''}{kospi.changeRate.toFixed(2)}%)
                </p>
                <p className="text-xs text-white/30">전일 종가 대비</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-white/35">{resolvedSubtitle}</span>
            </div>
          </>
        ) : (
          <div className="py-2">
            <p className="text-2xl font-black text-white/60">— —</p>
            <p className="text-xs text-white/30 mt-1">데이터를 불러오는 중입니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
