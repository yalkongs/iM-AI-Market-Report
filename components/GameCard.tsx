'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { Bet } from '@/lib/types'

interface GameCardProps {
  todayDate: string
  isOpen: boolean
  isClosed: boolean
  deadlineLabel: string  // 마감 시각 표시용 (예: "12:00")
  isNextDay?: boolean    // true이면 다음 거래일 베팅 (15:30 이후)
  dayLabel?: string      // "오늘" | "내일" | "4월 13일(월)" 등 — 캘린더 기반 정확한 표현
  hideHeader?: boolean   // 리포트 임베드용: 제목 등 헤더 숨기기
}

export default function GameCard({ todayDate, isOpen, isClosed, deadlineLabel, isNextDay = false, dayLabel, hideHeader = false }: GameCardProps) {
  // dayLabel이 없으면 isNextDay 기반으로 fallback
  const _dayLabel = dayLabel ?? (isNextDay ? '다음 거래일' : '오늘')
  const { user, profile, signIn, refreshProfile, loading: authLoading } = useAuth()
  const [todayBet, setTodayBet] = useState<Bet | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const [pendingChoice, setPendingChoice] = useState<'UP' | 'DOWN' | null>(null)
  const [copied, setCopied] = useState(false)

  // URL ?vote= 파라미터 처리 (모닝브리핑 HTML에서 클릭 시)
  useEffect(() => {
    if (!isOpen || authLoading) return
    const params = new URLSearchParams(window.location.search)
    const vote = params.get('vote')?.toUpperCase()
    if (vote === 'UP' || vote === 'DOWN') {
      if (user) {
        console.log(`[GameCard] Auto-betting from URL: ${vote}`)
        handleBet(vote as 'UP' | 'DOWN')
        window.history.replaceState({}, '', window.location.pathname)
      } else {
        console.log(`[GameCard] Pending vote from URL: ${vote}, triggering sign-in`)
        setPendingChoice(vote as 'UP' | 'DOWN')
        window.history.replaceState({}, '', window.location.pathname)
        signIn()
      }
    }
  }, [user, isOpen, authLoading])

  useEffect(() => {
    if (!user) {
      // 비로그인 확정: 베팅 없음으로 명시
      setTodayBet(null)
      return
    }
    // 로그인 확인됨: undefined로 리셋 후 조회 (스켈레톤 유지)
    setTodayBet(undefined)
    fetchTodayBet(user.uid)

    // 안전장치: 8초 내 API 응답 없으면 강제로 스켈레톤 탈출
    // (Vercel cold-start, Firebase 지연, 네트워크 오류 등 모든 케이스 방어)
    const timeoutId = setTimeout(() => {
      setTodayBet(prev => {
        if (prev === undefined) {
          console.warn('[GameCard] fetchTodayBet 8초 초과 — 강제 null 처리')
          return null
        }
        return prev
      })
    }, 8000)

    return () => clearTimeout(timeoutId)
  }, [user])

  // 로그인 직후 pendingChoice 자동 제출 (todayBet=null 확정 후에만 실행)
  useEffect(() => {
    if (user && pendingChoice && todayBet === null) {
      handleBet(pendingChoice)
      setPendingChoice(null)
    }
    // todayBet이 undefined → null로 바뀐 타이밍을 잡음 (user.uid 직접 참조)
  }, [user, todayBet])

  // 카운트다운 타이머
  useEffect(() => {
    if (!isOpen) return
    const [dh, dm] = deadlineLabel.split(':').map(Number)
    const timer = setInterval(() => {
      const now = new Date()
      const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
      const target = new Date(kstNow)
      target.setUTCHours(dh - 9, dm, 0, 0)  // KST → UTC
      if (target <= kstNow) { clearInterval(timer); return }
      const diff = target.getTime() - kstNow.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [isOpen, deadlineLabel])

  // uid를 파라미터로 받아 클로저 stale 값 의존 제거
  const fetchTodayBet = async (uid: string) => {
    try {
      const res = await fetch(`/api/bet?uid=${uid}&date=${todayDate}`)
      const data = await res.json()
      // data.bet이 undefined인 경우도 null로 처리 (스켈레톤 탈출 보장)
      setTodayBet(data.bet ?? null)
    } catch {
      setTodayBet(null)
    }
  }

  const handleBet = async (prediction: 'UP' | 'DOWN') => {
    if (!user) return
    // profile이 아직 로드되지 않은 경우 Auth 정보로 fallback
    const userName = profile?.name || user.displayName || '익명'
    const userPhoto = profile?.photoURL || user.photoURL || ''
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          userName,
          userPhoto,
          prediction,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '오류가 발생했습니다.')
      } else {
        setTodayBet(data.bet)
        await refreshProfile()
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    if (!todayBet) return
    const resultLabel =
      todayBet.result === 'correct'   ? '정답 ⭕' :
      todayBet.result === 'incorrect' ? '오답 ❌' : '결과 대기 중'
    const streak = profile?.currentStreak ?? 0
    const text = [
      `🎯 KOSPI UPDOWN ${todayBet.date}`,
      `예측: ${todayBet.prediction === 'UP' ? '▲ UP' : '▼ DOWN'} → ${resultLabel}`,
      streak > 0 ? `🔥 현재 스트릭: ${streak}일 연속` : '',
      window.location.origin,
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleGuestChoice = (choice: 'UP' | 'DOWN') => {
    setPendingChoice(choice)
    signIn()  // 바로 Google 로그인 팝업
  }

  // ── 로딩 중: 인증 확인 중이거나 베팅 조회 중
  // - authLoading=true: Firebase 세션 복원 중 → 로그인 여부 불명
  // - user 있고 todayBet=undefined: 로그인 확인됐지만 API 아직 응답 전
  // 이 두 경우 모두 UP/DOWN 버튼을 절대 먼저 보여주면 안 됨
  if (authLoading || (user && todayBet === undefined)) {
    return (
      <div className="overflow-hidden rounded-2xl shadow-sm border border-gray-100 bg-white">
        <div className="px-6 pt-10 pb-10 text-center">
          <div className="h-8 w-8 border-4 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-bold">
            {pendingChoice ? `${pendingChoice} 예측을 등록하고 있습니다...` : '데이터를 불러오고 있습니다...'}
          </p>
        </div>
      </div>
    )
  }

  // ── 이미 베팅한 경우 (isOpen 여부와 무관하게 결과 우선 표시)
  if (user && todayBet) {
    return (
      <div className="card text-center">
        <p className="text-sm text-gray-400 mb-3">
          {_dayLabel}({todayDate})의 예측 ✅
        </p>
        <div className={`inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-white text-3xl font-black mb-4 ${
          todayBet.prediction === 'UP'
            ? 'bg-gradient-to-br from-red-500 to-red-600'
            : 'bg-gradient-to-br from-blue-500 to-blue-600'
        }`}>
          {todayBet.prediction === 'UP' ? '▲ UP' : '▼ DOWN'}
        </div>
        {todayBet.result === null ? (
          <>
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              장 마감(15:30) 후 결과가 확정됩니다
            </div>
            {/* 마감(12:00) 전이면 예측 변경 가능 */}
            {isOpen && (
              <button
                onClick={() => setTodayBet(null)}
                className="mt-3 text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 transition-colors"
              >
                예측 변경하기 ({deadlineLabel} 마감)
              </button>
            )}
          </>
        ) : todayBet.result === 'correct' ? (
          <div className="mt-2">
            <span className="text-5xl">⭕</span>
            <p className="text-green-600 font-bold mt-1">정답! 스트릭 +1 🔥</p>
          </div>
        ) : (
          <div className="mt-2">
            <span className="text-5xl">❌</span>
            <p className="text-red-500 font-bold mt-1">오답. 스트릭이 초기화됩니다.</p>
          </div>
        )}
        {isOpen && timeLeft && (
          <p className="text-xs text-gray-300 mt-3 font-mono">마감까지 {timeLeft}</p>
        )}
        <button
          onClick={handleShare}
          className="mt-4 w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          {copied ? '✅ 복사됐습니다!' : '📋 결과 공유하기'}
        </button>
      </div>
    )
  }

  // ── 베팅 마감: isOpen이 아니면 베팅 불가 (15:30 이후 포함)
  if (!isOpen) {
    return (
      <div className="card text-center py-8">
        <p className="text-2xl mb-2">⏰</p>
        <p className="text-gray-600 font-medium">오늘 베팅은 {deadlineLabel}에 마감됐습니다.</p>
        {isClosed ? (
          <p className="text-gray-400 text-sm mt-1">장이 마감됐습니다. 결과는 내일 확인하세요.</p>
        ) : (
          <p className="text-gray-400 text-sm mt-1">결과는 장 마감(15:30) 후 확정됩니다.</p>
        )}
      </div>
    )
  }

  // ── 베팅 UI (isOpen = true인 경우만)
  return (
    <>
      <div className="overflow-hidden rounded-2xl shadow-sm border border-gray-100">
        {!hideHeader && (
          <div className="bg-white px-6 pt-6 pb-4 text-center border-b border-gray-100">
            {isNextDay && (
              <p className="text-xs text-indigo-500 font-bold mb-1 tracking-wide">
                📅 {_dayLabel} KOSPI 예측
              </p>
            )}
            <h2 className="text-xl font-black text-gray-900 leading-snug">
              {_dayLabel} KOSPI가<br />오를까요, 내릴까요?
            </h2>
            {isOpen && timeLeft && (
              <p className="text-sm font-mono text-orange-400 mt-2">⏰ 마감까지 {timeLeft}</p>
            )}
          </div>
        )}

        <div className="flex">
          <button
            className="flex-1 flex flex-col items-center justify-center gap-2 py-10
              bg-red-50 hover:bg-red-500 active:bg-red-600
              text-red-500 hover:text-white
              border-r border-red-100
              transition-all duration-150 group"
            onClick={() => user ? handleBet('UP') : handleGuestChoice('UP')}
            disabled={loading}
          >
            <span className="text-5xl font-black leading-none group-hover:scale-110 transition-transform">▲</span>
            <span className="text-xl font-black tracking-widest">UP</span>
            <span className="text-xs opacity-60">오른다</span>
          </button>

          <button
            className="flex-1 flex flex-col items-center justify-center gap-2 py-10
              bg-blue-50 hover:bg-blue-500 active:bg-blue-600
              text-blue-500 hover:text-white
              transition-all duration-150 group"
            onClick={() => user ? handleBet('DOWN') : handleGuestChoice('DOWN')}
            disabled={loading}
          >
            <span className="text-5xl font-black leading-none group-hover:scale-110 transition-transform">▼</span>
            <span className="text-xl font-black tracking-widest">DOWN</span>
            <span className="text-xs opacity-60">내린다</span>
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm text-center mt-1">{error}</p>}
      {loading && <p className="text-gray-400 text-sm text-center mt-1">저장 중...</p>}
    </>
  )
}
