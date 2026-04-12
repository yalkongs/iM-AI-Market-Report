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
        let html = await response.text()
        
        // 주변 파일 목록 가져오기
        const listRes = await fetch('/api/reports/list')
        const { files } = await listRes.json()
        
        const currentIndex = files.indexOf(filename)
        const prevFile = currentIndex < files.length - 1 ? files[currentIndex + 1] : null
        const nextFile = currentIndex > 0 ? files[currentIndex - 1] : null
        
        // 치환자 교체 (웹 뷰어용 경로 /reports/파일명)
        html = html.replace(/\{\{prev_link\}\}/g, prevFile ? `/reports/${prevFile}` : '#')
        html = html.replace(/\{\{next_link\}\}/g, nextFile ? `/reports/${nextFile}` : '#')
        
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
