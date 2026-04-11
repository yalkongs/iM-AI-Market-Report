export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { UserProfile } from '@/lib/types'

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid')
  if (!uid) return NextResponse.json({ error: 'uid 필요' }, { status: 400 })

  try {
    const snapshot = await adminDb
      .collection('users')
      .orderBy('currentStreak', 'desc')
      .get()

    const docs = snapshot.docs.filter(d => (d.data() as UserProfile).totalBets > 0)
    const idx = docs.findIndex(d => d.id === uid)
    const rank = idx === -1 ? null : idx + 1
    const total = docs.length
    const nextRankStreak = rank && rank > 1
      ? (docs[idx - 1].data() as UserProfile).currentStreak
      : null

    return NextResponse.json({ rank, total, nextRankStreak })
  } catch {
    return NextResponse.json({ rank: null, total: 0, nextRankStreak: null })
  }
}
