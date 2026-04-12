'use client'

import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import GameCard from '@/components/GameCard'
import { AuthProvider } from '@/components/AuthProvider'
import { getTodayKST, getNextTradingDay, isBettingOpen, isMarketClosed } from '@/lib/kospi'

export default function ClientHydrator() {
  useEffect(() => {
    const target = document.getElementById('im-live-game')
    if (target) {
      // 파일명에서 날짜 추출 (morning_report_YYYYMMDD.html)
      const pathParts = window.location.pathname.split('/')
      const filename = pathParts[pathParts.length - 1]
      const dateMatch = filename.match(/(\d{8})/)
      const reportDate = dateMatch ? `${dateMatch[1].slice(0,4)}-${dateMatch[1].slice(4,6)}-${dateMatch[1].slice(6,8)}` : null

      const root = createRoot(target)
      const today = getTodayKST()
      const isClosed = isMarketClosed()
      
      // 만약 과거 리포트라면 해당 날짜로 고정, 오늘 리포트라면 유동적 처리
      const targetDate = (reportDate && reportDate !== today) ? reportDate : (isClosed ? getNextTradingDay(today) : today)

      root.render(
        <AuthProvider>
          <div className="bg-white p-6 border border-gray-100 rounded-xl shadow-inner">
            <GameCard 
              todayDate={targetDate}
              isOpen={reportDate === today && isBettingOpen()} // 오늘 리포트일 때만 투표 가능
              isClosed={reportDate !== today || isClosed}
              deadlineLabel="10:00"
              isNextDay={isClosed && reportDate === today}
            />
          </div>
        </AuthProvider>
      )
    }
  }, [])

  return null
}
