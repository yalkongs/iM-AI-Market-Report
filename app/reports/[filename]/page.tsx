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

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { filename } = params
  const rawDataDir = path.join(process.cwd(), 'public', 'raw-data')
  const filePath = path.join(rawDataDir, `${filename}.html`)

  if (!fs.existsSync(filePath)) return {}

  const html = fs.readFileSync(filePath, 'utf8')
  
  // 🎯 정규식 개선: 따옴표 종류나 공백에 상관없이 추출
  const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/)
  const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/)
  const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/)

  const title = titleMatch ? titleMatch[1] : 'iM AI Market Report'
  const description = descMatch ? descMatch[1] : 'iM뱅크 AI 금융 분석 리포트'
  
  // 🎯 &amp; 문제를 방지하기 위해 텍스트를 디코딩하여 깨끗한 URL 생성
  let image = imageMatch ? imageMatch[1].replace(/&amp;/g, '&') : 'https://im-ai-market-report.vercel.app/og-default.png'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{
        url: image,
        width: 1080,
        height: 1920,
      }],
      type: 'article',
    },
    twitter: {
      // 🎯 세로형 이미지는 summary 카드가 더 안정적일 수 있음
      card: 'summary', 
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

  let html = fs.readFileSync(filePath, 'utf8')

  // 🎯 중첩된 HTML 구조 제거: <body> 태그 내부의 내용만 추출
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const cleanBody = bodyMatch ? bodyMatch[1] : html

  return (
    <>
      <div 
        className="report-content-wrapper"
        dangerouslySetInnerHTML={{ __html: cleanBody }} 
      />
      <ClientHydrator />
    </>
  )
}
