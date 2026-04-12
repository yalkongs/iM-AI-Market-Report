import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'iM AI Market Report'
  const date = searchParams.get('date') || ''

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#2A3050', // iM뱅크 네이비
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* 우측 상단 골드 포인트 라인 */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '400px', height: '10px', backgroundColor: '#C8940A' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-1px' }}>iM BANK</div>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '0 20px' }} />
          <div style={{ fontSize: '18px', color: '#C8940A', letterSpacing: '2px' }}>AI FINANCIAL EDITION</div>
        </div>

        <div
          style={{
            fontSize: '60px',
            fontWeight: 800,
            color: 'white',
            lineHeight: 1.3,
            marginBottom: '30px',
            wordBreak: 'keep-all',
          }}
        >
          {title}
        </div>

        <div style={{ fontSize: '24px', color: '#ADB5BD', fontWeight: 500 }}>
          {date} | iM뱅크 투자전략부 발행
        </div>

        {/* 하단 장식 요소 */}
        <div style={{ position: 'absolute', bottom: '60px', left: '80px', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '2px', backgroundColor: '#C8940A', marginRight: '15px' }} />
          <div style={{ fontSize: '16px', color: '#C8940A', fontWeight: 700 }}>READ MORE ON IM-AI</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
