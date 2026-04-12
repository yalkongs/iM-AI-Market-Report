export const dynamic = 'force-dynamic'
import fs from 'fs'
import path from 'path'
import { notFound } from 'next/navigation'
import NextDynamic from 'next/dynamic'
import { Metadata, ResolvingMetadata } from 'next'

const ClientHydrator = NextDynamic(() => import('./ClientHydrator'), { ssr: false })

interface Props { params: { filename: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { filename } = params
  const rawDataDir = path.join(process.cwd(), 'public', 'raw-data')
  const filePath = path.join(rawDataDir, `${filename}.html`)
  
  if (!fs.existsSync(filePath)) return {}
  const html = fs.readFileSync(filePath, 'utf8')
  
  const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/)
  const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/)

  const title = titleMatch ? titleMatch[1] : 'iM AI Market Report'
  let image = imageMatch ? imageMatch[1].replace(/&amp;/g, '&') : ''

  return {
    title,
    // 🎯 텔레그램 미리보기 최적화 설정
    openGraph: {
      title,
      description: 'iM뱅크 AI 금융 분석 리포트',
      images: [
        {
          url: image,
          secureUrl: image, // HTTPS 보장
          width: 1080,
          height: 1920,
          type: 'image/png',
        },
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      images: [image],
    },
    other: {
      // 🎯 텔레그램 및 기타 크롤러를 위한 명시적 태그
      'telegram:channel': '@im_ai_market',
      'al:web:url': `https://im-ai-market-report.vercel.app/reports/${filename}`,
    }
  }
}

export default async function ReportPage({ params }: Props) {
  const { filename } = params
  const rawDataDir = path.join(process.cwd(), 'public', 'raw-data')
  const filePath = path.join(rawDataDir, `${filename}.html`)
  if (!fs.existsSync(filePath)) notFound()
  const html = fs.readFileSync(filePath, 'utf8')
  const styleMatch = html.match(/<style[^>]*>([\s\S]*)<\/style>/i)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const extractedStyles = styleMatch ? styleMatch[0] : ''
  const extractedBody = bodyMatch ? bodyMatch[1] : html
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: extractedStyles }} />
      <div className="report-content-wrapper" dangerouslySetInnerHTML={{ __html: extractedBody }} />
      <ClientHydrator />
    </>
  )
}
