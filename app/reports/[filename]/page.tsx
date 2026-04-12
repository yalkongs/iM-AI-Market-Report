export const dynamic = 'force-dynamic'

import fs from 'fs'
import path from 'path'
import { notFound } from 'next/navigation'
import NextDynamic from 'next/dynamic'
import { Metadata, ResolvingMetadata } from 'next'

const ClientHydrator = NextDynamic(() => import('./ClientHydrator'), { ssr: false })

interface Props {
  params: { filename: string }
}

// 🎯 텔레그램 미리보기를 위한 동적 메타데이터 생성
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { filename } = params
  const rawDataDir = path.join(process.cwd(), 'public', 'raw-data')
  const filePath = path.join(rawDataDir, `${filename}.html`)

  if (!fs.existsSync(filePath)) return {}

  const html = fs.readFileSync(filePath, 'utf8')
  
  // HTML에서 메타 태그 정보 추출
  const titleMatch = html.match(/<meta property="og:title" content="(.*?)"/)
  const descMatch = html.match(/<meta property="og:description" content="(.*?)"/)
  const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/)

  const title = titleMatch ? titleMatch[1] : 'iM AI Market Report'
  const description = descMatch ? descMatch[1] : 'iM뱅크 AI 금융 분석 리포트'
  const image = imageMatch ? imageMatch[1] : 'https://im-ai-market-report.vercel.app/og-default.png'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function ReportPage({ params }: Props) {
  const { filename } = params
  const rawDataDir = path.join(process.cwd(), 'public', 'raw-data')
  const filePath = path.join(rawDataDir, `${filename}.html`)

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
