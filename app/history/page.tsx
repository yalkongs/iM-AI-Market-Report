'use client'

import { useEffect, useState, Suspense } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs, orderBy, limit, doc, setDoc, getDoc } from 'firebase/firestore'
import Header from '@/components/Header'
import { AuthProvider, useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { getTodayKST, isBettingOpen, isMarketClosed } from '@/lib/kospi'
import { useSearchParams } from 'next/navigation'

function HistoryContent() {
  const { user, signIn, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const [bets, setBets] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [votingStatus, setVotingStatus] = useState<string | null>(null)

  // 1. 데이터 로드 및 자동 투표 처리
  useEffect(() => {
    if (authLoading) return

    const fetchData = async () => {
      try {
        // (1) 자동 투표 처리 (URL 파라미터 ?vote= 감지 시)
        const vote = searchParams.get('vote')?.toUpperCase()
        if (vote === 'UP' || vote === 'DOWN') {
          if (!user) {
            setVotingStatus('로그인 후 투표를 완료합니다...')
            signIn()
            return
          }
          
          if (isBettingOpen()) {
            const today = getTodayKST()
            const betRef = doc(db, 'bets', `${user.uid}_${today}`)
            const betDoc = await getDoc(betRef)
            
            if (!betDoc.exists()) {
              setVotingStatus(`${vote} 예측을 등록 중입니다...`)
              await setDoc(betRef, {
                uid: user.uid,
                userName: user.displayName || '익명',
                date: today,
                prediction: vote,
                createdAt: Date.now()
              })
              setVotingStatus('🎉 투표가 성공적으로 완료되었습니다!')
            } else {
              setVotingStatus('이미 오늘의 투표에 참여하셨습니다.')
            }
          } else {
            setVotingStatus('아쉽게도 오늘의 베팅이 마감되었습니다.')
          }
        }

        // (2) 나의 베팅 히스토리 로드
        if (user) {
          const qBets = query(
            collection(db, 'bets'),
            where('uid', '==', user.uid),
            orderBy('date', 'desc'),
            limit(10)
          )
          const snapBets = await getDocs(qBets)
          setBets(snapBets.docs.map(doc => doc.data()))
        }

        // (3) 리더보드 로드 (상위 10명)
        const qRank = query(
          collection(db, 'users'),
          orderBy('currentStreak', 'desc'),
          orderBy('updatedAt', 'asc'),
          limit(10)
        )
        const snapRank = await getDocs(qRank)
        setLeaderboard(snapRank.docs.map(doc => doc.data()))

      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, authLoading, searchParams])

  if (loading && !votingStatus) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="h-10 w-10 border-4 border-navy border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">
        
        {/* 리포트 복귀 상단 버튼 */}
        <Link 
          href="/reports/index.html" 
          className="inline-block mb-6 text-sm font-bold text-navy bg-white px-4 py-2 rounded-full border border-navy shadow-sm"
        >
          ← 리포트 게시판으로 돌아가기
        </Link>

        {/* 1. 투표 처리 상태 메시지 */}
        {votingStatus && (
          <div className="bg-indigo-600 text-white p-4 rounded-2xl mb-8 shadow-lg animate-bounce text-center font-bold">
            {votingStatus}
          </div>
        )}

        {/* 2. 나의 도전 기록 섹션 */}
        <section className="mb-12">
          <h2 className="text-2xl font-black text-gray-800 mb-4 flex items-center gap-2">📜 나의 기록</h2>
          {!user ? (
            <div className="card text-center py-10 bg-white">
              <p className="text-gray-500 mb-4">로그인하시면 나의 기록을 볼 수 있습니다.</p>
              <button onClick={() => signIn()} className="bg-navy text-white px-6 py-2 rounded-lg font-bold">로그인</button>
            </div>
          ) : bets.length === 0 ? (
            <div className="card text-center py-10 text-gray-400 bg-white">아직 참여 기록이 없습니다.</div>
          ) : (
            <div className="grid gap-3">
              {bets.map((bet, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-bold text-gray-800">{bet.date}</p>
                    <p className="text-xs text-gray-400">예측: {bet.prediction}</p>
                  </div>
                  <span className={`font-black ${bet.result === 'correct' ? 'text-green-500' : bet.result === 'incorrect' ? 'text-red-500' : 'text-yellow-500'}`}>
                    {bet.result === 'correct' ? '⭕' : bet.result === 'incorrect' ? '❌' : '대기'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3. 통합 리더보드 섹션 (Top 10) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">🏆 실시간 랭킹</h2>
            <Link href="/leaderboard" className="text-xs text-gray-400 font-bold underline">전체 보기</Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {leaderboard.map((player, idx) => (
              <div key={player.uid} className={`flex items-center justify-between p-4 ${idx < 3 ? 'bg-orange-50/30' : ''} border-b last:border-none`}>
                <div className="flex items-center gap-3">
                  <span className={`w-6 text-center font-black ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-400' : 'text-gray-300'}`}>
                    {idx + 1}
                  </span>
                  <span className="font-bold text-gray-700">{player.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-navy">{player.currentStreak}🔥</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 하단 복귀 버튼 */}
        <div className="mt-12 text-center">
          <Link href="/reports/index.html" className="text-gray-400 text-sm underline">마켓 리포트 더 읽으러 가기</Link>
        </div>
      </div>
    </main>
  )
}

export default function HistoryPage() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
        <HistoryContent />
      </Suspense>
    </AuthProvider>
  )
}
