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
  const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/)
  const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/)
  const title = titleMatch ? titleMatch[1] : 'iM AI Market Report'
  const description = descMatch ? descMatch[1] : 'iM뱅크 AI 금융 분석 리포트'
  let image = imageMatch ? imageMatch[1].replace(/&amp;/g, '&') : ''
  return {
    title, description,
    openGraph: { title, description, images: [{ url: image, width: 1080, height: 1920 }], type: 'article' },
    twitter: { card: 'summary_large_image', images: [image] }
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
