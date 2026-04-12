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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const q = query(
          collection(db, 'bets'),
          where('uid', '==', u.uid),
          orderBy('date', 'desc')
        )
        const snapshot = await getDocs(q)
        const betsData = snapshot.docs.map(doc => doc.data())
        setBets(betsData)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  if (loading) return <div className="p-20 text-center text-gray-400">기록을 불러오는 중...</div>

  if (!user) {
    return (
      <div className="max-w-lg mx-auto p-10 text-center">
        <p className="text-gray-500 mb-6">로그인하시면 나의 도전 기록을 확인할 수 있습니다.</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="bg-navy text-white px-8 py-3 rounded-xl font-bold"
        >
          로그인하러 가기
        </button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-gray-800 mb-2">📜 나의 도전 기록</h1>
        <p className="text-sm text-gray-400 mb-8">지금까지 참여하신 KOSPI 예측 히스토리입니다.</p>

        {bets.length === 0 ? (
          <div className="card text-center py-20">
            <p className="text-gray-400">아직 참여한 기록이 없습니다.</p>
            <Link href="/" className="text-navy font-bold underline mt-4 block">첫 번째 도전 시작하기</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bets.map((bet, idx) => (
              <div key={idx} className="card flex justify-between items-center py-4">
                <div>
                  <p className="font-bold text-gray-800">{bet.date}</p>
                  <p className="text-xs text-gray-400">예측: {bet.prediction === 'UP' ? '▲ 상승' : '▼ 하락'}</p>
                </div>
                <div>
                  {bet.result === 'correct' ? (
                    <span className="text-green-500 font-black text-xl">⭕ 정답</span>
                  ) : bet.result === 'incorrect' ? (
                    <span className="text-red-500 font-black text-xl">❌ 오답</span>
                  ) : (
                    <span className="text-yellow-500 font-bold text-sm">결과 대기 중</span>
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
