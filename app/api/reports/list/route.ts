import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const reportsDir = path.join(process.cwd(), 'public', 'reports')
  
  try {
    const files = fs.readdirSync(reportsDir)
      .filter(f => f.startsWith('morning_report_') && f.endsWith('.html'))
      .sort((a, b) => b.localeCompare(a)) // 최신순
    
    return NextResponse.json({ files })
  } catch (error) {
    return NextResponse.json({ files: [] })
  }
}
