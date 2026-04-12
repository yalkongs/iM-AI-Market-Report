export const dynamic = 'force-dynamic'

import fs from 'fs'
import path from 'path'
import { notFound } from 'next/navigation'
import NextDynamic from 'next/dynamic'

const ClientHydrator = NextDynamic(() => import('./ClientHydrator'), { ssr: false })

interface Props {
  params: { filename: string }
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
