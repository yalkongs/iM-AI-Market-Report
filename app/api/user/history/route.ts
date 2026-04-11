export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { Bet } from '@/lib/types'

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid')
  if (!uid) {
    return NextResponse.json({ error: 'uid 필요' }, { status: 400 })
  }

  try {
    const snapshot = await adminDb.collection('bets')
      .where('uid', '==', uid)
      .orderBy('date', 'desc')
      .limit(14)
      .get()

    const history: Bet[] = snapshot.docs.map(doc => doc.data() as Bet)

    // 각 베팅 날짜의 KOSPI 실제 방향을 daily 컬렉션에서 조회
    const dates = history.map(b => b.date)
    const dailyDocs = await Promise.all(
      dates.map(date => adminDb.collection('daily').doc(date).get())
    )
    const dailyMap: Record<string, 'UP' | 'DOWN' | 'FLAT' | null> = {}
    dailyDocs.forEach(doc => {
      if (doc.exists) {
        const data = doc.data()
        dailyMap[doc.id] = data?.direction ?? null
      }
    })

    return NextResponse.json({ history, dailyMap })
  } catch (e) {
    console.error('히스토리 오류:', e)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
