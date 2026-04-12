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
        if (!filename) return

        // 1. 원본 데이터(raw-data) 경로에서 HTML 가져오기
        const response = await fetch(`/raw-data/${filename}`)
        if (!response.ok) throw new Error('Report not found')
        let html = await response.text()
        
        // 2. 목록 JSON 가져오기 (raw-data 내 위치)
        const listRes = await fetch('/raw-data/report_list.json')
        const { files } = await listRes.json()
        
        const currentIndex = files.indexOf(filename)
        const prevFile = currentIndex < files.length - 1 ? files[currentIndex + 1] : null
        const nextFile = currentIndex > 0 ? files[currentIndex - 1] : null
        
        // 3. 네비게이션 치환자 교체
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
    }
  }, [loading, htmlContent])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="h-10 w-10 border-4 border-navy border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-500 font-medium">리포트를 불러오는 중입니다...</p>
    </div>
  )
  
  if (!htmlContent) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <p className="text-gray-400 text-lg mb-6">리포트를 찾을 수 없습니다.</p>
      <a href="/index.html" className="px-6 py-2 bg-navy text-white rounded-full text-sm font-bold">목록으로 돌아가기</a>
    </div>
  )

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
