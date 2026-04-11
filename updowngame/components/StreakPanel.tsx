'use client'

import { useAuth } from './AuthProvider'
import { useEffect, useState } from 'react'
import { Bet, UserProfile } from '@/lib/types'

type DailyMap = Record<string, 'UP' | 'DOWN' | 'FLAT' | null>

interface RankInfo {
  rank: number | null
  total: number
  nextRankStreak: number | null
}

const BADGE_META: Record<string, { emoji: string; label: string }> = {
  first_bet:    { emoji: '🌱', label: '첫 예측' },
  streak_3:     { emoji: '🔥', label: '3연승' },
  streak_5:     { emoji: '⚡', label: '5연승' },
  streak_10:    { emoji: '💥', label: '10연승' },
  sharpshooter: { emoji: '🎯', label: '정확왕' },
  veteran:      { emoji: '🏅', label: '베테랑' },
  centurion:    { emoji: '🏆', label: '백전노장' },
}

function getNextMilestone(profile: UserProfile): string | null {
  const { currentStreak, maxStreak, totalBets, correctBets, badges = [] } = profile

  if (!badges.includes('streak_3') && currentStreak > 0 && currentStreak < 3)
    return `🔥 3연승까지 ${3 - currentStreak}일!`
  if (!badges.includes('streak_5') && currentStreak > 0 && currentStreak < 5)
    return `⚡ 5연승까지 ${5 - currentStreak}일!`
  if (!badges.includes('streak_10') && currentStreak > 0 && currentStreak < 10)
    return `💥 10연승까지 ${10 - currentStreak}일!`
  if (!badges.includes('veteran') && totalBets < 50 && totalBets > 0)
    return `🏅 베테랑까지 ${50 - totalBets}번!`
  if (!badges.includes('centurion') && totalBets >= 50 && totalBets < 100)
    return `🏆 백전노장까지 ${100 - totalBets}번!`
  const acc = totalBets > 0 ? correctBets / totalBets : 0
  if (!badges.includes('sharpshooter') && totalBets >= 10 && acc < 0.7) {
    const needed = Math.ceil(totalBets * 0.7) - correctBets
    return `🎯 정확왕까지 ${Math.max(1, needed)}번 더!`
  }
  return null
}

function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

function KospiArrow({ direction }: { direction: 'UP' | 'DOWN' | 'FLAT' | null | undefined }) {
  if (direction === 'UP')   return <span className="text-red-500 font-black leading-none" style={{ fontSize: 15 }}>▲</span>
  if (direction === 'DOWN') return <span className="text-blue-500 font-black leading-none" style={{ fontSize: 15 }}>▼</span>
  if (direction === 'FLAT') return <span className="text-gray-400 font-black leading-none" style={{ fontSize: 15 }}>━</span>
  return <span className="text-gray-300 font-black leading-none" style={{ fontSize: 15 }}>?</span>
}

function MyArrow({ prediction }: { prediction: 'UP' | 'DOWN' }) {
  if (prediction === 'UP') return <span className="text-red-400 font-black leading-none" style={{ fontSize: 15 }}>▲</span>
  return <span className="text-blue-400 font-black leading-none" style={{ fontSize: 15 }}>▼</span>
}

function ResultBadge({ result }: { result: 'correct' | 'incorrect' | null }) {
  if (result === 'correct')   return <span className="leading-none" style={{ fontSize: 11 }}>✅</span>
  if (result === 'incorrect') return <span className="leading-none" style={{ fontSize: 11 }}>❌</span>
  return <span className="text-yellow-400 leading-none" style={{ fontSize: 11 }}>⏳</span>
}

export default function StreakPanel() {
  const { user, profile } = useAuth()
  const [history, setHistory] = useState<Bet[]>([])
  const [dailyMap, setDailyMap] = useState<DailyMap>({})
  const [rankInfo, setRankInfo] = useState<RankInfo | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoadingHistory(true)
    Promise.all([
      fetch(`/api/user/history?uid=${user.uid}`).then(r => r.json()),
      fetch(`/api/user/rank?uid=${user.uid}`).then(r => r.json()),
    ]).then(([histData, rankData]) => {
      setHistory(histData.history || [])
      setDailyMap(histData.dailyMap || {})
      setRankInfo(rankData)
    }).catch(() => {}).finally(() => setLoadingHistory(false))
  }, [user])

  if (!user || !profile) return null

  const accuracy = profile.totalBets > 0
    ? Math.round((profile.correctBets / profile.totalBets) * 100)
    : 0

  const chronological = [...history].reverse()
  const milestone = getNextMilestone(profile)

  return (
    <div className="card">
      {/* 프로필 */}
      <div className="flex items-center gap-3 mb-5">
        {profile.photoURL ? (
          <img src={profile.photoURL} alt="프로필" className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-lg">
            {profile.name[0]}
          </div>
        )}
        <div>
          <p className="font-bold text-gray-800">{profile.name}</p>
          <p className="text-xs text-gray-400">{profile.email}</p>
        </div>
      </div>

      {/* 스탯 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center bg-orange-50 rounded-xl p-3">
          <p className="text-2xl font-black text-orange-500">🔥{profile.currentStreak}</p>
          <p className="text-xs text-gray-500 mt-1">현재 스트릭</p>
        </div>
        <div className="text-center bg-yellow-50 rounded-xl p-3">
          <p className="text-2xl font-black text-yellow-600">⭐{profile.maxStreak}</p>
          <p className="text-xs text-gray-500 mt-1">최고 스트릭</p>
        </div>
        <div className="text-center bg-blue-50 rounded-xl p-3">
          <p className="text-2xl font-black text-blue-600">{accuracy}%</p>
          <p className="text-xs text-gray-500 mt-1">정답률</p>
        </div>
      </div>

      {/* 나의 순위 */}
      {rankInfo?.rank && (
        <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-2.5 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏅</span>
            <div>
              <p className="text-sm font-black text-indigo-700">#{rankInfo.rank}위</p>
              <p className="text-xs text-indigo-400">{rankInfo.total}명 중</p>
            </div>
          </div>
          {rankInfo.nextRankStreak !== null && rankInfo.rank > 1 && (
            <p className="text-xs text-indigo-500 font-medium">
              앞 순위까지 스트릭 {rankInfo.nextRankStreak - (profile.currentStreak || 0)}개
            </p>
          )}
        </div>
      )}

      {/* 다음 목표 넛지 */}
      {milestone && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-sm font-medium text-amber-700">
          {milestone}
        </div>
      )}

      {/* 획득한 배지 */}
      {profile.badges && profile.badges.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 font-medium mb-2">획득한 배지</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.badges.map(b => {
              const meta = BADGE_META[b]
              if (!meta) return null
              return (
                <span key={b} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 text-xs font-medium text-gray-600">
                  {meta.emoji} {meta.label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* 화살표 히스토리 바 */}
      {loadingHistory && (
        <p className="text-xs text-gray-300 text-center py-2">불러오는 중...</p>
      )}

      {!loadingHistory && chronological.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400 font-medium">최근 {chronological.length}일 기록</p>
            <p className="text-xs text-gray-300">{profile.totalBets}번 · {profile.correctBets}정답</p>
          </div>

          <div className="flex gap-2">
            {/* 좌측 행 레이블 */}
            <div className="flex flex-col justify-around text-right flex-shrink-0 pb-5" style={{ paddingTop: 2 }}>
              <p className="text-gray-400 leading-none" style={{ fontSize: 10 }}>시장</p>
              <p className="text-gray-400 leading-none" style={{ fontSize: 10 }}>나</p>
            </div>

            {/* 셀 목록 */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
              {chronological.map((bet) => {
                const kospiDir = dailyMap[bet.date]
                const isPending = bet.result === null
                return (
                  <div
                    key={bet.id}
                    className={`flex-shrink-0 flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 w-10 ${
                      isPending
                        ? 'bg-yellow-50 border border-yellow-200'
                        : bet.result === 'correct'
                        ? 'bg-green-50 border border-green-100'
                        : 'bg-red-50 border border-red-100'
                    }`}
                  >
                    <KospiArrow direction={kospiDir} />
                    <MyArrow prediction={bet.prediction} />
                    <ResultBadge result={bet.result} />
                    <p className="text-gray-400 mt-0.5 leading-none" style={{ fontSize: 9 }}>
                      {formatShortDate(bet.date)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 범례 */}
          <div className="flex gap-3 mt-1 text-gray-300" style={{ fontSize: 11 }}>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-100 inline-block" />정답</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-100 inline-block" />오답</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-100 inline-block" />미확정</span>
          </div>
        </div>
      )}
    </div>
  )
}
