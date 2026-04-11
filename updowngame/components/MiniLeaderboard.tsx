import { LeaderboardEntry } from '@/lib/types'
import Link from 'next/link'

interface Props {
  entries: LeaderboardEntry[]
}

function medalEmoji(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `${rank}`
}

function streakColor(streak: number) {
  if (streak >= 10) return 'text-orange-500'
  if (streak >= 5)  return 'text-yellow-500'
  if (streak >= 3)  return 'text-green-600'
  return 'text-gray-700'
}

export default function MiniLeaderboard({ entries }: Props) {
  const top = entries.slice(0, 10)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="font-black text-gray-800">🏆 리더보드</p>
          <p className="text-xs text-gray-400 mt-0.5">현재 스트릭 순위</p>
        </div>
        <Link
          href="/leaderboard"
          className="text-xs text-blue-500 font-medium hover:text-blue-700 transition-colors"
        >
          전체 보기 →
        </Link>
      </div>

      {/* 목록 */}
      {top.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">
          <p className="text-3xl mb-2">🌱</p>
          아직 참가자가 없습니다.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {top.map((entry, index) => {
            const rank = index + 1
            return (
              <div
                key={entry.uid}
                className={`flex items-center gap-3 px-5 py-3 ${
                  rank <= 3 ? 'bg-yellow-50/60' : ''
                }`}
              >
                {/* 순위 */}
                <span className="w-6 text-center text-sm font-black text-gray-400 shrink-0">
                  {medalEmoji(rank)}
                </span>

                {/* 프로필 사진 */}
                {entry.photoURL ? (
                  <img src={entry.photoURL} alt="" className="w-8 h-8 rounded-full shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                    {entry.name?.[0] ?? '?'}
                  </div>
                )}

                {/* 이름 + 정답률 */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{entry.name}</p>
                  <p className="text-xs text-gray-400">
                    {entry.totalBets}번 · 정답률 {entry.accuracy}%
                  </p>
                </div>

                {/* 스트릭 */}
                <div className="text-right shrink-0">
                  <p className={`text-lg font-black ${streakColor(entry.currentStreak)}`}>
                    🔥{entry.currentStreak}
                  </p>
                  <p className="text-xs text-gray-400">최고 {entry.maxStreak}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
