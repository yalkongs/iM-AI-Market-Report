import fs from 'fs'
import path from 'path'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

// 클라이언트 사이드 하이드레이션 (실시간 게임 위젯 교체용만 유지)
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

  if (!fs.existsSync(filePath)) {
    notFound()
  }

  // 링크가 이미 박혀있는 HTML을 그대로 읽어옴
  const html = fs.readFileSync(filePath, 'utf8')

  return (
    <>
      <div 
        className="report-content-wrapper"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
      {/* 게임 위젯 하이드레이션만 수행 */}
      <ClientHydrator />
    </>
  )
}
