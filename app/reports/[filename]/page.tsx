'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import GameCard from '@/components/GameCard'
import { AuthProvider } from '@/components/AuthProvider'
import { getTodayKST, getNextTradingDay, isBettingOpen, isMarketClosed } from '@/lib/kospi'
import { createRoot } from 'react-dom/client'

function ReportViewer() {
  const params = useParams()
  const [htmlContent, setHtmlContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const filename = params.filename as string
        const response = await fetch(`/reports/${filename}`)
        if (!response.ok) throw new Error('Report not found')
        const html = await response.text()
        
        // 1. HTML 콘텐츠 내보내기 (불필요한 스타일/태그 제거 로직 등)
        setHtmlContent(html)
        setLoading(false)
      } catch (error) {
        console.error('Error loading report:', error)
        setLoading(false)
      }
    }
    fetchReport()
  }, [params.filename])

  useEffect(() => {
    if (!loading && htmlContent) {
      // 2. 하이드레이션: HTML 내부의 #im-live-game 찾기
      const target = document.getElementById('im-live-game')
      if (target) {
        // 기존의 정적 버튼 삭제 후 React 컴포넌트 주입
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
    }
  }, [loading, htmlContent])

  if (loading) return <div className="flex justify-center p-20 text-gray-400">리포트를 불러오는 중...</div>
  if (!htmlContent) return <div className="p-20 text-center">리포트를 찾을 수 없습니다.</div>

  return (
    <div 
      className="report-content-wrapper"
      dangerouslySetInnerHTML={{ __html: htmlContent }} 
    />
  )
}

export default function ReportPage() {
  return <ReportViewer />
}
