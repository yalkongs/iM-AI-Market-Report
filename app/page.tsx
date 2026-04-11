export const dynamic = 'force-dynamic'

import Header from '@/components/Header'
import GameCard from '@/components/GameCard'
import WaitingCard from '@/components/WaitingCard'
import StreakPanel from '@/components/StreakPanel'
import KospiBanner from '@/components/KospiBanner'
import CommunityBar from '@/components/CommunityBar'
import MiniLeaderboard from '@/components/MiniLeaderboard'
import { getTodayKospi, getNextTradingDay, getPrevTradingDay, getBettingDayLabel, isNonTradingDay } from '@/lib/kospi'
import { getLeaderboard } from '@/lib/leaderboard'
import { adminDb } from '@/lib/firebase-admin'
import { unstable_cache } from 'next/cache'

// ── 날짜 유틸 ─────────────────────────────────────────────

function kstDateStr(kst: Date): string {
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getKSTTime() {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return {
    hour: kst.getUTCHours(),
    minute: kst.getUTCMinutes(),
    dateStr: kstDateStr(kst),
    dayOfWeek: kst.getUTCDay(),
  }
}


// ── 서버사이드 데이터 조회 ─────────────────────────────────

const getCommunityStats = unstable_cache(
  async (date: string) => {
    try {
      const snapshot = await adminDb.collection('bets').where('date', '==', date).get()
      let upCount = 0, downCount = 0
      snapshot.forEach(doc => {
        if (doc.data().prediction === 'UP') upCount++
        else downCount++
      })
      return { total: snapshot.size, upCount, downCount }
    } catch {
      return { total: 0, upCount: 0, downCount: 0 }
    }
  },
  ['community-stats'],
  { revalidate: 60, tags: ['community'] }
)

// ── 페이지 ────────────────────────────────────────────────

export default async function Home() {
  const { hour, minute, dateStr: today, dayOfWeek } = getKSTTime()
  // 주말 또는 KRX 공휴일(평일 휴장) 모두 휴장 처리
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 || isNonTradingDay(today)

  // ── 상태 분류 (평일 기준) ──
  // isWaiting:    10:00~15:29  — 베팅 마감, 결과 대기
  // isAfterClose: 15:30+       — 결과 확정, 다음 영업일 베팅 오픈
  // isOpenToday:  00:00~09:59  — 오늘 베팅 오픈
  const isWaiting    = !isWeekend && hour >= 10 && (hour < 15 || (hour === 15 && minute < 30))
  const isAfterClose = !isWeekend && (hour > 15 || (hour === 15 && minute >= 30))
  const isOpenToday  = !isWeekend && hour < 10

  // 실제 베팅 대상 날짜
  const bettingDate = isAfterClose ? getNextTradingDay(today) : today
  const isOpen      = isOpenToday || isAfterClose
  const isNextDay   = isAfterClose

  // KospiBanner에 표시할 KOSPI 기준 날짜
  // - 오늘 베팅 중 / 대기 중: 전일 종가 (직전 영업일)
  // - 15:30 이후: 오늘 종가 (결과 확정)
  const kospiRefDate   = isAfterClose ? today : getPrevTradingDay(today)
  const nextTradingDay = getNextTradingDay(today)

  // "내일" vs "다음 거래일(X월 Y일(요일))" — 캘린더상 내일인지 확인
  // isOpenToday: "오늘", isAfterClose: 캘린더 비교, isWaiting: n/a
  const dayLabel = isOpenToday ? '오늘' : getBettingDayLabel(today, bettingDate)

  const [refKospi, communityStats, leaderboardEntries] = await Promise.all([
    getTodayKospi(kospiRefDate).catch(() => null),
    getCommunityStats(today).catch(() => ({ total: 0, upCount: 0, downCount: 0 })),
    !isOpenToday ? getLeaderboard().catch(() => []) : Promise.resolve([]),
  ])

  // ── 주말/휴장일 레이아웃 ──
  if (isWeekend) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 text-center">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-lg font-black text-gray-800 mb-1">오늘은 시장이 쉬는 날이에요</p>
            <p className="text-sm text-gray-400">
              다음 거래일 <span className="font-bold text-gray-600">{formatDay(nextTradingDay)}</span>에 다시 만나요
            </p>
          </div>
          {refKospi && (
            <KospiBanner
              kospi={refKospi}
              date={kospiRefDate}
              subtitle="KRX 공식 데이터 · 주말 휴장 중"
            />
          )}
          <StreakPanel />
          <MiniLeaderboard entries={leaderboardEntries} />
        </div>
      </main>
    )
  }

  // ── 대기 상태 레이아웃 (12:00~15:30) ──
  if (isWaiting) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
          <KospiBanner
            kospi={refKospi}
            date={kospiRefDate}
            subtitle="KRX 공식 데이터 · 오늘 베팅 마감 · 15:30 결과 확정"
          />
          <WaitingCard todayDate={today} communityStats={communityStats} />
          <StreakPanel />
          {leaderboardEntries.length > 0 && (
            <MiniLeaderboard entries={leaderboardEntries} />
          )}
        </div>
      </main>
    )
  }

  // ── 베팅 오픈 레이아웃 (오늘 or 내일) ──
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">

        <KospiBanner
          kospi={refKospi}
          date={kospiRefDate}
          dateLabel={isNextDay ? '오늘 종가 ✅' : undefined}
          subtitle={
            isNextDay
              ? `오늘 장 마감 · ${dayLabel === '내일' ? '내일' : `다음 거래일(${dayLabel})`} 예측까지 10:00`
              : 'KRX 공식 데이터 · 오늘 10:00까지 예측 가능'
          }
        />

        {/* 베팅 오픈 & 오늘 날짜: 커뮤니티 참여 바 */}
        {isOpenToday && communityStats.total > 0 && (
          <CommunityBar
            total={communityStats.total}
            upCount={communityStats.upCount}
            downCount={communityStats.downCount}
          />
        )}

        <GameCard
          todayDate={bettingDate}
          isOpen={isOpen}
          isClosed={false}
          deadlineLabel="10:00"
          isNextDay={isNextDay}
          dayLabel={dayLabel}
        />

        <StreakPanel />

        {/* 15:30 이후: 오늘 최종 커뮤니티 + 리더보드 */}
        {isNextDay && (
          <>
            {communityStats.total > 0 && (
              <CommunityBar
                total={communityStats.total}
                upCount={communityStats.upCount}
                downCount={communityStats.downCount}
              />
            )}
            {leaderboardEntries.length > 0 && (
              <MiniLeaderboard entries={leaderboardEntries} />
            )}
          </>
        )}

        {/* 오늘 베팅 오픈 시 게임 설명 */}
        {isOpenToday && (
          <div className="card text-sm text-gray-500 space-y-2">
            <p className="font-bold text-gray-700 mb-3">📖 게임 방법</p>
            <div className="flex gap-2">
              <span className="text-base">1️⃣</span>
              <p>매일 오전 <strong>오전 10:00 전</strong>에 KOSPI가 오를지(▲UP) 내릴지(▼DOWN) 예측합니다.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-base">2️⃣</span>
              <p>장 마감(15:30) 후 결과가 확정되며 <strong>O / X</strong>로 표시됩니다.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-base">3️⃣</span>
              <p>연속으로 맞출수록 <strong>🔥 스트릭</strong>이 쌓입니다. 틀리면 0으로 초기화!</p>
            </div>
            <div className="flex gap-2">
              <span className="text-base">4️⃣</span>
              <p>리더보드에서 누가 가장 길게 연속 정답을 기록하는지 경쟁하세요.</p>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}

// ── 날짜 포매터 ──────────────────────────────────────────

function formatDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  // 정오(12:00) KST 기준으로 UTC 날짜 이동 방지
  const date = new Date(`${y}-${m}-${d}T12:00:00+09:00`)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${parseInt(m)}월 ${parseInt(d)}일(${days[date.getUTCDay()]})`
}
