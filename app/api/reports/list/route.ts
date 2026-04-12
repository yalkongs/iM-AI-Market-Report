import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const jsonPath = path.join(process.cwd(), 'public', 'reports', 'report_list.json')
  
  try {
    // 1. 우선 생성된 JSON 파일이 있는지 확인
    if (fs.existsSync(jsonPath)) {
      const data = fs.readFileSync(jsonPath, 'utf8')
      return NextResponse.json(JSON.parse(data))
    }
    
    // 2. 만약 JSON이 없다면 기존의 동적 스캔 방식 시도 (Fallback)
    const reportsDir = path.join(process.cwd(), 'public', 'reports')
    const files = fs.readdirSync(reportsDir)
      .filter(f => f.startsWith('morning_report_') && f.endsWith('.html'))
      .sort((a, b) => b.localeCompare(a))
    
    return NextResponse.json({ files })
  } catch (error) {
    console.error('Error fetching report list:', error)
    return NextResponse.json({ files: [] })
  }
}
