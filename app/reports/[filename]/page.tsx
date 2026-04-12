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
  return files.map(f => ({ filename: f.replace('.html', '') }))
}

export default async function ReportPage({ params }: Props) {
  const { filename } = params
  const rawDataDir = path.join(process.cwd(), 'public', 'raw-data')
  const filePath = path.join(rawDataDir, `${filename}.html`)
  const jsonPath = path.join(rawDataDir, 'report_list.json')

  if (!fs.existsSync(filePath)) {
    console.error(`[ReportPage] File not found: ${filePath}`)
    notFound()
  }

  let html = fs.readFileSync(filePath, 'utf8')
  
  // 리포트 목록 로드
  let files: string[] = []
  try {
    if (fs.existsSync(jsonPath)) {
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
      files = jsonData.files || []
    } else {
      // JSON이 없으면 직접 디렉토리 스캔 (Fallback)
      files = fs.readdirSync(rawDataDir)
        .filter(f => f.startsWith('morning_report_') && f.endsWith('.html'))
        .map(f => f.replace('.html', ''))
        .sort((a, b) => b.localeCompare(a))
    }
  } catch (e) {
    console.error('[ReportPage] Error loading report list:', e)
  }

  const currentIndex = files.indexOf(filename)
  const prevFile = (currentIndex !== -1 && currentIndex < files.length - 1) ? files[currentIndex + 1] : null
  const nextFile = (currentIndex !== -1 && currentIndex > 0) ? files[currentIndex - 1] : null

  // 치환 로직 강화: 정규식으로 유연하게 매칭
  const prevLink = prevFile ? `/reports/${prevFile}` : '#'
  const nextLink = nextFile ? `/reports/${nextFile}` : '#'
  
  html = html.replace(/\{\{\s*prev_link\s*\}\}/g, prevLink)
  html = html.replace(/\{\{\s*next_link\s*\}\}/g, nextLink)
  
  // 혹시 모를 %7B%7B 형색의 인코딩된 문자열도 방어
  html = html.replace(/%7B%7Bprev_link%7D%7D/g, prevLink)
  html = html.replace(/%7B%7Bnext_link%7D%7D/g, nextLink)

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
