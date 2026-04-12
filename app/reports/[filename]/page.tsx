export const dynamic = 'force-dynamic'

import fs from 'fs'
import path from 'path'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

const ClientHydrator = dynamic(() => import('./ClientHydrator'), { ssr: false })

interface Props {
  params: { filename: string }
}

// 정적 생성을 제거하고 모든 요청을 실시간으로 처리하도록 변경
export default async function ReportPage({ params }: Props) {
  const { filename } = params
  const rawDataDir = path.join(process.cwd(), 'public', 'raw-data')
  const filePath = path.join(rawDataDir, `${filename}.html`)
  const jsonPath = path.join(rawDataDir, 'report_list.json')

  // 파일 존재 여부 확인
  if (!fs.existsSync(filePath)) {
    notFound()
  }

  const html = fs.readFileSync(filePath, 'utf8')

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
