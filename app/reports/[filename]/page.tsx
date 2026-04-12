import GameCard from '@/components/GameCard'
import { AuthProvider } from '@/components/AuthProvider'
import { getTodayKST, getNextTradingDay, isBettingOpen, isMarketClosed } from '@/lib/kospi'
import fs from 'fs'
import path from 'path'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

const ClientHydrator = dynamic(() => import('./ClientHydrator'), { ssr: false })

interface Props {
  params: { filename: string }
}

export async function generateStaticParams() {
  const rawDataDir = path.join(process.cwd(), 'public', 'raw-data')
  if (!fs.existsSync(rawDataDir)) return []
  
  const files = fs.readdirSync(rawDataDir)
    .filter(f => f.startsWith('morning_report_') && f.endsWith('.html'))
  
  // URL에서 .html을 제거한 순수 ID만 파라미터로 등록
  return files.map(f => ({ 
    filename: f.replace('.html', '') 
  }))
}

export default async function ReportPage({ params }: Props) {
  const { filename } = params // 이제 filename은 확장자가 없는 ID입니다.
  const rawDataDir = path.join(process.cwd(), 'public', 'raw-data')
  
  // 실제 파일 읽기 시에는 .html을 붙여서 찾음
  const filePath = path.join(rawDataDir, `${filename}.html`)
  const jsonPath = path.join(rawDataDir, 'report_list.json')

  if (!fs.existsSync(filePath)) {
    notFound()
  }

  let html = fs.readFileSync(filePath, 'utf8')
  
  let files: string[] = []
  if (fs.existsSync(jsonPath)) {
    files = JSON.parse(fs.readFileSync(jsonPath, 'utf8')).files
  }

  const currentIndex = files.indexOf(filename)
  const prevFile = currentIndex < files.length - 1 ? files[currentIndex + 1] : null
  const nextFile = currentIndex > 0 ? files[currentIndex - 1] : null

  // 네비게이션 링크 생성 (확장자 없는 깔끔한 주소 유지)
  html = html.replace(/\{\{prev_link\}\}/g, prevFile ? `/reports/${prevFile}` : '#')
  html = html.replace(/\{\{next_link\}\}/g, nextFile ? `/reports/${nextFile}` : '#')

  return (
    <>
      <div 
        className="report-content-wrapper"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
      <ClientHydrator />
    </>
  )
}
