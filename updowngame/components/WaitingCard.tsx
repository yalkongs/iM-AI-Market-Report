'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthProvider'
import { Bet } from '@/lib/types'

interface Props {
  todayDate: string
  communityStats: { total: number; upCount: number; downCount: number }
}

const MESSAGES = [
  '지금 이 순간도 시장이 방향을 정하는 중 📊',
  '내 예측이 맞을지, 틀릴지... 두근두근 💓',
  '전 세계 투자자들이 KOSPI를 밀고 당기는 중 🌏',
  '오늘 리더보드 순위, 지금도 바뀔 수 있어요 🏆',
  '장 마감 카운트다운. 곧 결과가 나옵니다 🎯',
]

export default function WaitingCard({ todayDate, communityStats }: Props) {
  const { user } = useAuth()
  const [todayBet, setTodayBet] = useState<Bet | null | undefined>(undefined)
  const [h, setH] = useState(0)
  const [m, setM] = useState(0)
  const [s, setS] = useState(0)
  const [totalMs, setTotalMs] = useState(1)  // 1 = 아직 계산 전 (0이면 만료)
  const [progress, setProgress] = useState(0) // 0~100 (12:00~15:30 경과 %)
  const [msgIdx, setMsgIdx] = useState(0)
  const msgTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // 사용자 베팅 조회
  useEffect(() => {
    if (!user) { setTodayBet(null); return }
    fetch(`/api/bet?uid=${user.uid}&date=${todayDate}`)
      .then(r => r.json())
      .then(d => setTodayBet(d.bet ?? null))
      .catch(() => setTodayBet(null))
  }, [user, todayDate])

  // 15:30 KST 카운트다운 + 진행 바
  useEffect(() => {
    const tick = () => {
      const nowMs = Date.now()
      const kstNow = new Date(nowMs + 9 * 60 * 60 * 1000)
      // 15:30 KST = 06:30 UTC
      const target = Date.UTC(
        kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate(),
        6, 30, 0
      )
      // 12:00 KST = 03:00 UTC
      const windowStart = Date.UTC(
        kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate(),
        3, 0, 0
      )
      const windowTotal = 3.5 * 3600 * 1000  // 3시간 30분

      const diff = target - nowMs
      if (diff <= 0) {
        setH(0); setM(0); setS(0); setTotalMs(0)
        setProgress(100)
        return
      }
      setTotalMs(diff)
      setH(Math.floor(diff / 3600000))
      setM(Math.floor((diff % 3600000) / 60000))
      setS(Math.floor((diff % 60000) / 1000))
      const elapsed = nowMs - windowStart
      setProgress(Math.min(Math.max((elapsed / windowTotal) * 100, 0), 100))
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  // 메시지 순환 (4초마다)
  useEffect(() => {
    msgTimer.current = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES.length)
    }, 4000)
    return () => { if (msgTimer.current) clearInterval(msgTimer.current) }
  }, [])

  const total = communityStats.total
  const upPct  = total > 0 ? Math.round((communityStats.upCount  / total) * 100) : 50
  const downPct = 100 - upPct
  const userSide = todayBet?.prediction   // 'UP' | 'DOWN' | undefined

  // 커뮤니티와 내 예측 일치 여부
  const majorityAgrees =
    userSide === 'UP'   ? upPct >= 50 :
    userSide === 'DOWN' ? downPct >= 50 : null

  const contextMsg =
    !userSide || total === 0 ? null :
    majorityAgrees
      ? `커뮤니티의 ${userSide === 'UP' ? upPct : downPct}%가 같은 생각! 🤝`
      : `커뮤니티 ${userSide === 'UP' ? downPct : upPct}%와 반대 예측 — 역발상 도전 중 🎯`

  return (
    <div className="card overflow-hidden">

      {/* ── 상단 헤더 ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse" />
          <span className="text-sm font-bold text-gray-700">장 진행 중 · 결과 대기</span>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {todayDate}
        </span>
      </div>

      {/* ── 진행 바 (12:00 → 15:30) ── */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>베팅 마감 12:00</span>
          <span>결과 발표 15:30</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
            }}
          />
        </div>
      </div>

      {/* ── 내 예측 표시 ── */}
      {todayBet ? (
        <div className={`relative rounded-xl p-5 mb-4 text-center overflow-hidden ${
          todayBet.prediction === 'UP'
            ? 'bg-gradient-to-br from-red-500 to-red-600'
            : 'bg-gradient-to-br from-blue-500 to-blue-600'
        }`}>
          {/* 배경 글로우 */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full blur-2xl opacity-30 animate-pulse"
            style={{ background: todayBet.prediction === 'UP' ? '#fca5a5' : '#93c5fd' }}
          />
          <p className="text-white/70 text-xs mb-1 relative">내 예측</p>
          <p className="text-white text-3xl font-black relative leading-none mb-1">
            {todayBet.prediction === 'UP' ? '▲ UP' : '▼ DOWN'}
          </p>
          <p className="text-white/60 text-xs relative">
            {todayBet.prediction === 'UP' ? '오른다' : '내린다'}
          </p>
          {contextMsg && (
            <p className="text-white/80 text-xs mt-2 relative font-medium">{contextMsg}</p>
          )}
        </div>
      ) : todayBet === null ? (
        <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 p-4 text-center mb-4">
          <p className="text-2xl mb-1">😶</p>
          <p className="text-gray-500 text-sm font-medium">오늘 베팅에 참여하지 않았습니다</p>
          <p className="text-gray-400 text-xs mt-0.5">결과는 15:30 이후 확인 가능합니다</p>
        </div>
      ) : (
        // 로딩 중
        <div className="rounded-xl bg-gray-100 p-5 mb-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto" />
        </div>
      )}

      {/* ── 커뮤니티 현황 ── */}
      {total > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 font-medium mb-2.5">
            오늘 커뮤니티 현황 <span className="text-gray-400">({total.toLocaleString()}명 참여)</span>
          </p>
          <div className="space-y-2">
            {[
              { label: '▲ UP',   pct: upPct,   count: communityStats.upCount,   color: 'bg-red-400',  text: 'text-red-500',  isUser: userSide === 'UP' },
              { label: '▼ DOWN', pct: downPct, count: communityStats.downCount, color: 'bg-blue-400', text: 'text-blue-500', isUser: userSide === 'DOWN' },
            ].map(({ label, pct, count, color, text, isUser }) => (
              <div key={label} className={`flex items-center gap-2 ${isUser ? 'opacity-100' : 'opacity-60'}`}>
                <span className={`text-xs font-bold w-12 ${text}`}>
                  {label}{isUser && ' ◀'}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-600 w-12 text-right">
                  {pct}% <span className="text-gray-400 font-normal">({count})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 카운트다운 ── */}
      <div
        className="rounded-xl px-4 py-4 text-center mb-3"
        style={{ background: '#0f172a' }}
      >
        <p className="text-gray-500 text-xs mb-2">결과 발표까지</p>
        {totalMs > 0 ? (
          <div className="flex items-end justify-center gap-1">
            {[
              { val: h, unit: '시간' },
              { val: m, unit: '분' },
              { val: s, unit: '초' },
            ].map(({ val, unit }, i) => (
              <span key={unit} className="flex items-end">
                {i > 0 && <span className="text-gray-600 text-2xl font-black pb-1 mx-0.5">:</span>}
                <span className="flex flex-col items-center">
                  <span className="text-white text-4xl font-black font-mono w-12 text-center leading-none">
                    {String(val).padStart(2, '0')}
                  </span>
                  <span className="text-gray-600 text-xs mt-0.5">{unit}</span>
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-yellow-400 text-sm font-bold animate-pulse">결과 확인 중...</p>
        )}
      </div>

      {/* ── 분위기 메시지 ── */}
      <p className="text-center text-xs text-gray-400 min-h-4 transition-opacity duration-500">
        {MESSAGES[msgIdx]}
      </p>

    </div>
  )
}
