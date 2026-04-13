export const dynamic = 'force-dynamic'

/**
 * Vercel Cron Job - 매일 평일 15:35 KST (06:35 UTC) 실행
 * KOSPI 종가 확인 → 베팅 결과 처리 → 스트릭 업데이트 → Telegram 전송
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getFreshKospi, getTodayKST } from '@/lib/kospi'
import { DailyResult, Bet, UserProfile } from '@/lib/types'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  // 보안: Vercel Cron 또는 CRON_SECRET 확인
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = getTodayKST()
  console.log(`[cron] 결과 처리 시작: ${today}`)

  try {
    // 1. KOSPI 종가 가져오기 (캐시 우회 — 장 마감 후 최신 종가 필요)
    const kospi = await getFreshKospi(today)
    if (!kospi || kospi.close === null) {
      return NextResponse.json({ error: 'KOSPI 데이터 없음', date: today }, { status: 503 })
    }

    // 2. Daily result 저장
    const dailyRef = adminDb.collection('daily').doc(today)
    const dailyData: DailyResult = {
      date: today,
      open: kospi.open,
      close: kospi.close,
      prevClose: kospi.close - kospi.change,
      direction: kospi.direction,
      changeRate: kospi.changeRate,
      processedAt: Date.now(),
    }
    await dailyRef.set(dailyData)

    // 3. 오늘 모든 베팅 가져오기
    const betsSnapshot = await adminDb.collection('bets')
      .where('date', '==', today)
      .where('result', '==', null)
      .get()

    if (betsSnapshot.empty) {
      console.log('[cron] 오늘 베팅 없음')
      await sendTelegramResult(today, kospi.close, kospi.change, kospi.changeRate, kospi.direction, 0, 0)
      return NextResponse.json({ success: true, bets: 0, date: today })
    }

    // 4. 각 베팅 결과 처리
    const batch = adminDb.batch()
    let correctCount = 0
    let incorrectCount = 0

    const userUpdates: Record<string, { correct: boolean; uid: string }> = {}

    for (const doc of betsSnapshot.docs) {
      const bet = doc.data() as Bet
      // FLAT(보합)은 정답 없음 (UP/DOWN 모두 오답)
      const isCorrect = kospi.direction !== 'FLAT' && bet.prediction === kospi.direction

      const result = isCorrect ? 'correct' : 'incorrect'

      batch.update(doc.ref, { result })

      if (isCorrect) correctCount++
      else incorrectCount++

      userUpdates[bet.uid] = { correct: isCorrect, uid: bet.uid }
    }

    await batch.commit()

    // 5. 유저 스트릭 업데이트
    for (const [uid, { correct }] of Object.entries(userUpdates)) {
      const userRef = adminDb.collection('users').doc(uid)
      const userDoc = await userRef.get()
      const userData = userDoc.data() as UserProfile | undefined

      const currentStreak = userData?.currentStreak || 0
      const maxStreak = userData?.maxStreak || 0
      const totalBets = (userData?.totalBets || 0) + 1
      const correctBets = (userData?.correctBets || 0) + (correct ? 1 : 0)

      let newCurrentStreak: number
      let newMaxStreak: number

      if (correct) {
        newCurrentStreak = currentStreak + 1
        newMaxStreak = Math.max(maxStreak, newCurrentStreak)
      } else {
        // 틀리면 스트릭 리셋 (maxStreak는 유지)
        newCurrentStreak = 0
        newMaxStreak = maxStreak
      }

      const existingBadges = userData?.badges || []
      const newBadges = computeBadges(totalBets, correctBets, newMaxStreak, existingBadges)

      await userRef.set({
        currentStreak: newCurrentStreak,
        maxStreak: newMaxStreak,
        totalBets,
        correctBets,
        badges: newBadges,
        updatedAt: Date.now(),
      }, { merge: true })
    }

    // 6. Telegram 결과 전송
    const totalBets = correctCount + incorrectCount
    await sendTelegramResult(today, kospi.close, kospi.change, kospi.changeRate, kospi.direction, correctCount, totalBets)

    console.log(`[cron] 완료: 정답 ${correctCount}/${totalBets}`)
    return NextResponse.json({
      success: true,
      date: today,
      direction: kospi.direction,
      close: kospi.close,
      correct: correctCount,
      total: totalBets,
    })
  } catch (e) {
    console.error('[cron] 오류:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function computeBadges(
  totalBets: number,
  correctBets: number,
  maxStreak: number,
  existing: string[]
): string[] {
  const result = [...existing]
  const add = (b: string) => { if (!result.includes(b)) result.push(b) }
  if (totalBets >= 1)   add('first_bet')
  if (maxStreak >= 3)   add('streak_3')
  if (maxStreak >= 5)   add('streak_5')
  if (maxStreak >= 10)  add('streak_10')
  if (totalBets >= 20 && correctBets / totalBets >= 0.7) add('sharpshooter')
  if (totalBets >= 50)  add('veteran')
  if (totalBets >= 100) add('centurion')
  return result
}

async function sendTelegramResult(
  date: string,
  close: number,
  change: number,
  changeRate: number | null,
  direction: string | null,
  correct: number,
  total: number
) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const emoji = direction === 'UP' ? '🔴📈' : direction === 'DOWN' ? '🔵📉' : '➖'
  const sign = change >= 0 ? '+' : ''
  const rate = changeRate !== null ? `${sign}${changeRate.toFixed(2)}%` : ''
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://updown-kospi.vercel.app'

  const msg = `${emoji} *iM뱅크 UPDOWN — ${date} 결과*

📊 KOSPI 종가: *${close.toLocaleString('ko-KR')}* (${sign}${change.toLocaleString('ko-KR')}, ${rate})
방향: *${direction === 'UP' ? '상승 ▲' : direction === 'DOWN' ? '하락 ▼' : '보합 ➖'}*

🎯 오늘 정답률: *${accuracy}%* (${correct}/${total}명)

📖 [왜 이렇게 움직였을까? AI 리포트 보기](https://yalkongs.github.io/iM-AI-Market-Report/)
🏆 [리더보드 확인하기](${appUrl}/leaderboard)`

  // 텔레그램 전송 중단
  console.log('🔇 텔레그램 전송이 비활성화되어 있습니다.')
  /*
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    })
  } catch (e) {
    console.error('Telegram 전송 실패:', e)
  }
  */
}
