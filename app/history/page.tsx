'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import Header from '@/components/Header'
import { AuthProvider } from '@/components/AuthProvider'
import Link from 'next/link'

function HistoryContent() {
  const [user, setUser] = useState<any>(null)
  const [bets, setBets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          console.log('[History] Fetching bets for:', u.uid)
          const q = query(
            collection(db, 'bets'),
            where('uid', '==', u.uid),
            orderBy('date', 'desc')
          )
          const snapshot = await getDocs(q)
          const betsData = snapshot.docs.map(doc => doc.data())
          console.log('[History] Found bets:', betsData.length)
          setBets(betsData)
        } catch (err: any) {
          console.error('[History] Error fetching bets:', err)
          // 색인(Index) 누락 에러인 경우 콘솔에 링크가 표시됩니다.
          setError('데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
        }
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="h-10 w-10 border-4 border-navy border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-500">도전 기록을 불러오는 중입니다...</p>
    </div>
  )

  if (error) return (
    <div className="max-w-lg mx-auto p-20 text-center">
      <p className="text-red-500 mb-4">⚠️ {error}</p>
      <button onClick={() => window.location.reload()} className="text-navy underline">다시 시도</button>
    </div>
  )

  if (!user) {
    return (
      <div className="max-w-lg mx-auto p-20 text-center">
        <p className="text-gray-500 mb-6">로그인하시면 나의 도전 기록을 확인할 수 있습니다.</p>
        <Link href="/" className="bg-navy text-white px-8 py-3 rounded-xl font-bold inline-block shadow-lg">
          로그인하러 가기
        </Link>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-black text-gray-800">📜 나의 도전 기록</h1>
          <Link href="/" className="text-sm text-gray-400">← 홈으로</Link>
        </div>
        <p className="text-sm text-gray-400 mb-8">지금까지 참여하신 KOSPI 예측 히스토리입니다.</p>

        {bets.length === 0 ? (
          <div className="card text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-400">아직 참여한 기록이 없습니다.</p>
            <Link href="/" className="text-navy font-bold underline mt-4 block">첫 번째 도전 시작하기</Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {bets.map((bet, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800 text-lg">{bet.date}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    나의 선택: <span className="font-bold text-gray-600">{bet.prediction === 'UP' ? '▲ 상승' : '▼ 하락'}</span>
                  </p>
                </div>
                <div className="text-right">
                  {bet.result === 'correct' ? (
                    <div className="flex flex-col items-end">
                      <span className="text-green-500 font-black text-xl">정답 ⭕</span>
                    </div>
                  ) : bet.result === 'incorrect' ? (
                    <div className="flex flex-col items-end">
                      <span className="text-red-500 font-black text-xl">오답 ❌</span>
                    </div>
                  ) : (
                    <span className="bg-yellow-50 text-yellow-600 px-3 py-1 rounded-full text-xs font-bold border border-yellow-100">
                      결과 대기 중
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default function HistoryPage() {
  return (
    <AuthProvider>
      <HistoryContent />
    </AuthProvider>
  )
}
