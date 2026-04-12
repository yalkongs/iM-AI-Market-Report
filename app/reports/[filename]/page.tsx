import GameCard from '@/components/GameCard'
import { AuthProvider } from '@/components/AuthProvider'
import { getTodayKST, getNextTradingDay, isBettingOpen, isMarketClosed } from '@/lib/kospi'
import fs from 'fs'
import path from 'path'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

// 클라이언트 사이드 하이드레이션 컴포넌트 (게임 위젯 교체용)
const ClientHydrator = dynamic(() => import('./ClientHydrator'), { ssr: false })

interface Props {
  params: { filename: string }
}

export async function generateStaticParams() {
  const rawDataDir = path.join(process.cwd(), 'public', 'raw-data')
  if (!fs.existsSync(rawDataDir)) return []
  
  const files = fs.readdirSync(rawDataDir)
    .filter(f => f.startsWith('morning_report_') && f.endsWith('.html'))
  
  return files.map(filename => ({ filename }))
}

export default async function ReportPage({ params }: Props) {
  const { filename } = params
  const rawDataDir = path.join(process.cwd(), 'public', 'raw-data')
  const filePath = path.join(rawDataDir, filename)
  const jsonPath = path.join(rawDataDir, 'report_list.json')

  if (!fs.existsSync(filePath)) {
    notFound()
  }

  let html = fs.readFileSync(filePath, 'utf8')
  
  // 주변 파일 목록 처리
  let files: string[] = []
  if (fs.existsSync(jsonPath)) {
    files = JSON.parse(fs.readFileSync(jsonPath, 'utf8')).files
  }

  const currentIndex = files.indexOf(filename)
  const prevFile = currentIndex < files.length - 1 ? files[currentIndex + 1] : null
  const nextFile = currentIndex > 0 ? files[currentIndex - 1] : null

  // 서버에서 치환자 미리 교체
  html = html.replace(/\{\{prev_link\}\}/g, prevFile ? `/reports/${prevFile}` : '#')
  html = html.replace(/\{\{next_link\}\}/g, nextFile ? `/reports/${nextFile}` : '#')

  return (
    <>
      <div 
        className="report-content-wrapper"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
      {/* 클라이언트에서 #im-live-game을 실제 게임 카드로 교체 */}
      <ClientHydrator />
    </>
  )
}
