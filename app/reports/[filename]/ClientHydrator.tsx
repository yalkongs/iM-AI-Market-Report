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
      const root = createRoot(target)
      const today = getTodayKST()
      const isClosed = isMarketClosed()
      const bettingDate = isClosed ? getNextTradingDay(today) : today

      root.render(
        <AuthProvider>
          <div className="bg-white p-6 border border-gray-100 rounded-xl shadow-inner">
            <GameCard 
              todayDate={bettingDate}
              isOpen={isBettingOpen()}
              isClosed={isClosed}
              deadlineLabel="10:00"
              isNextDay={isClosed}
            />
          </div>
        </AuthProvider>
      )
    }
  }, [])

  return null
}
