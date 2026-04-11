export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { UserProfile, LeaderboardEntry } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    // 현재 스트릭 기준 상위 50명
    const snapshot = await adminDb.collection('users')
      .orderBy('currentStreak', 'desc')
      .limit(50)
      .get()

    const leaderboard: LeaderboardEntry[] = snapshot.docs
      .filter(doc => {
        const data = doc.data() as UserProfile
        return data.totalBets > 0
      })
      .map(doc => {
        const data = doc.data() as UserProfile
        return {
          uid: data.uid,
          name: data.name,
          photoURL: data.photoURL,
          currentStreak: data.currentStreak || 0,
          maxStreak: data.maxStreak || 0,
          totalBets: data.totalBets || 0,
          correctBets: data.correctBets || 0,
          accuracy: data.totalBets > 0
            ? Math.round((data.correctBets / data.totalBets) * 100)
            : 0,
        }
      })

    return NextResponse.json({ leaderboard })
  } catch (e) {
    console.error('리더보드 오류:', e)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
