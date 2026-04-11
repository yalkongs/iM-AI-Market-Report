export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getTodayKST, getNextTradingDay, isNonTradingDay } from '@/lib/kospi'
import { Bet } from '@/lib/types'

/**
 * 베팅 허용 여부 + 허용된 날짜 반환
 *
 * - 00:00~11:59 KST → 오늘 날짜 베팅 허용
 * - 12:00~15:29 KST → 베팅 불허 (대기 중)
 * - 15:30~23:59 KST → 다음 영업일 날짜 베팅 허용
 *
 * Returns: { allowed: boolean, bettingDate: string }
 */
function getServerBettingState(): { allowed: boolean; bettingDate: string } {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const hour   = kst.getUTCHours()
  const minute = kst.getUTCMinutes()
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  const todayStr = `${y}-${m}-${d}`
  const dow = kst.getUTCDay()

  // 주말 또는 KRX 공휴일이면 모두 불허
  if (dow === 0 || dow === 6 || isNonTradingDay(todayStr)) {
    return { allowed: false, bettingDate: todayStr }
  }

  if (hour < 12) {
    // 오늘 베팅 오픈
    return { allowed: true, bettingDate: todayStr }
  }
  if (hour < 15 || (hour === 15 && minute < 30)) {
    // 12:00~15:29: 대기 중
    return { allowed: false, bettingDate: todayStr }
  }
  // 15:30 이후: 다음 영업일 베팅 오픈
  return { allowed: true, bettingDate: getNextTradingDay(todayStr) }
}

export async function POST(req: NextRequest) {
  try {
    const { uid, userName, userPhoto, prediction } = await req.json()

    if (!uid || !prediction || !['UP', 'DOWN'].includes(prediction)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const { allowed, bettingDate } = getServerBettingState()

    if (!allowed) {
      return NextResponse.json({ error: '베팅 시간이 아닙니다. (12:00~15:30은 결과 대기 중)' }, { status: 403 })
    }

    const betId = `${bettingDate}_${uid}`

    // 이미 베팅한 경우: 결과가 확정된 베팅은 변경 불가, 미확정이면 변경 허용
    const existingSnap = await adminDb.collection('bets').doc(betId).get()
    if (existingSnap.exists) {
      const existing = existingSnap.data() as Bet
      if (existing.result !== null) {
        return NextResponse.json({ error: '이미 결과가 확정된 베팅은 변경할 수 없습니다.' }, { status: 409 })
      }
      // 예측만 변경 (결과가 null인 미확정 베팅)
      const updatedBet: Bet = { ...existing, prediction, updatedAt: Date.now() }
      await adminDb.collection('bets').doc(betId).set(updatedBet)
      return NextResponse.json({ success: true, bet: updatedBet })
    }

    const bet: Bet = {
      id: betId,
      uid,
      userName,
      userPhoto,
      date: bettingDate,
      prediction,
      result: null,
      createdAt: Date.now(),
    }
    await adminDb.collection('bets').doc(betId).set(bet)

    await adminDb.collection('users').doc(uid).set({
      uid,
      name: userName,
      photoURL: userPhoto,
      lastBetDate: bettingDate,
      updatedAt: Date.now(),
    }, { merge: true })

    return NextResponse.json({ success: true, bet })
  } catch (e) {
    console.error('베팅 저장 오류:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const uid  = req.nextUrl.searchParams.get('uid')
  const date = req.nextUrl.searchParams.get('date') || getTodayKST()

  if (!uid) {
    return NextResponse.json({ error: 'uid 필요' }, { status: 400 })
  }

  try {
    const betId = `${date}_${uid}`
    const docSnap = await adminDb.collection('bets').doc(betId).get()

    if (!docSnap.exists) {
      return NextResponse.json({ bet: null })
    }

    return NextResponse.json({ bet: docSnap.data() })
  } catch (e) {
    console.error('[GET /api/bet] Firestore 오류:', e)
    return NextResponse.json({ bet: null })  // 오류 시에도 bet:null 반환 — 스켈레톤 탈출 보장
  }
}
