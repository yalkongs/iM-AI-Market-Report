export const dynamic = 'force-dynamic'

// 서버 컴포넌트 — 공유 lib/leaderboard.ts 사용
import Header from '@/components/Header'
import { getLeaderboard } from '@/lib/leaderboard'
import { LeaderboardEntry } from '@/lib/types'
import Link from 'next/link'

function medalEmoji(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `${rank}`
}

function streakColor(streak: number) {
  if (streak >= 10) return 'text-orange-500'
  if (streak >= 5) return 'text-yellow-500'
  if (streak >= 3) return 'text-green-500'
  return 'text-gray-700'
}

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard()

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black text-gray-800">🏆 리더보드</h1>
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← 게임 홈</Link>
          </div>
          
          {/* 리포트 게시판 이동 버튼 추가 */}
          <Link 
            href="/reports/index.html" 
            className="flex items-center justify-center gap-2 w-full py-3 bg-navy text-white rounded-xl font-bold text-sm shadow-sm hover:bg-opacity-90 transition-all"
          >
            📖 iM AI 마켓 리포트 게시판 가기
          </Link>
        </div>

        <p className="text-xs text-gray-400 mb-4">현재 스트릭 기준 순위 (이름 외 개인정보는 노출되지 않습니다)</p>

        {leaderboard.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-3xl mb-2">🌱</p>
            <p className="text-gray-500">아직 베팅한 사람이 없습니다.</p>
            <p className="text-gray-400 text-sm mt-1">첫 번째 참가자가 되어보세요!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, index) => {
              const rank = index + 1
              return (
                <div
                  key={entry.uid}
                  className={`card flex items-center gap-3 py-4 ${
                    rank <= 3 ? 'border-yellow-200 bg-yellow-50' : ''
                  }`}
                >
                  <div className="w-8 text-center font-black text-lg">
                    {medalEmoji(rank)}
                  </div>

                  {entry.photoURL ? (
                    <img src={entry.photoURL} alt="" className="w-9 h-9 rounded-full" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                      {entry.name[0]}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{entry.name}</p>
                    <p className="text-xs text-gray-400">
                      {entry.totalBets}번 베팅 · 정답률 {entry.accuracy}%
                    </p>
                  </div>

                  <div className="text-right">
                    <p className={`text-2xl font-black ${streakColor(entry.currentStreak)}`}>
                      🔥{entry.currentStreak}
                    </p>
                    <p className="text-xs text-gray-400">최고 {entry.maxStreak}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 card text-xs text-gray-400 space-y-1">
          <p className="font-medium text-gray-500 mb-2">스트릭이란?</p>
          <p>연속으로 정답을 맞춘 횟수입니다. 한 번 틀리면 0으로 초기화됩니다.</p>
          <p>예: 5일 연속 정답 후 틀리면 → 내 베트 스코어 = <strong>5</strong></p>
        </div>
      </div>
    </main>
  )
}
