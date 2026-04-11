export const dynamic = 'force-dynamic'

/**
 * 아침 텔레그램 전송 API
 * daily-market-briefing-new 태스크에서 호출하거나
 * 별도 Vercel Cron으로 실행
 */
import { NextRequest, NextResponse } from 'next/server'
import { getTodayKST, isBettingOpen } from '@/lib/kospi'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = getTodayKST()
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://updown-kospi.vercel.app'

  if (!token || !chatId) {
    return NextResponse.json({ error: 'Telegram 설정 없음' }, { status: 500 })
  }

  const msg = `🎯 *iM뱅크 UPDOWN — ${today}*

오늘 KOSPI가 오를까요, 내릴까요?
iM AI 리포트의 분석을 확인하고 예측해 보세요!

⏰ 베팅 마감: 오전 10:00

👇 지금 바로 선택하세요!
[UP ▲ / DOWN ▼ 선택하기](${appUrl})

---
📖 [iM AI 마켓 리포트 보기](https://yalkongs.github.io/iM-AI-Market-Report/)`

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    })

    const data = await res.json()
    if (!data.ok) throw new Error(data.description)

    return NextResponse.json({ success: true, date: today })
  } catch (e) {
    console.error('아침 Telegram 전송 실패:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
