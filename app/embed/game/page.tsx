'use client'

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getTodayKST, getNextTradingDay, isBettingOpen, isMarketClosed } from '@/lib/kospi'
import GameCard from '@/components/GameCard'
import { AuthProvider } from '@/components/AuthProvider'

function GameEmbedContent() {
  const [today, setToday] = useState('')
  const [isNextDay, setIsNextDay] = useState(false)
  const [bettingDate, setBettingDate] = useState('')

  useEffect(() => {
    const t = getTodayKST()
    setToday(t)
    const closed = isMarketClosed()
    setIsNextDay(closed)
    setBettingDate(closed ? getNextTradingDay(t) : t)
  }, [])

  if (!today) return null

  return (
    <div className="bg-white max-w-[500px] mx-auto p-4">
      <GameCard 
        todayDate={bettingDate}
        isOpen={isBettingOpen()}
        isClosed={isMarketClosed()}
        deadlineLabel="10:00"
        isNextDay={isNextDay}
        hideHeader={true}
      />
      <style jsx global>{`
        body { background: transparent !important; margin: 0; padding: 0; }
      `}</style>
    </div>
  )
}

export default function GameEmbedPage() {
  return (
    <AuthProvider>
      <GameEmbedContent />
    </AuthProvider>
  )
}
