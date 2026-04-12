import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  // 🎯 제목이 너무 길면 텔레그램에서 잘리거나 오류가 날 수 있으므로 50자로 제한
  let title = searchParams.get('title') || 'iM AI Market Report'
  if (title.length > 50) title = title.substring(0, 47) + '...'
  
  const date = searchParams.get('date') || ''

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2A3050',
          padding: '60px',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '40px', backgroundColor: '#C8940A' }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '80px' }}>
          <div style={{ fontSize: '44px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-2px' }}>iM BANK</div>
          <div style={{ fontSize: '20px', color: '#C8940A', letterSpacing: '4px', fontWeight: 700, marginTop: '10px' }}>DAILY EDITION</div>
        </div>

        <div
          style={{
            fontSize: '76px',
            fontWeight: 800,
            color: 'white',
            lineHeight: 1.2,
            textAlign: 'center',
            marginBottom: '60px',
            wordBreak: 'keep-all',
            padding: '0 40px',
          }}
        >
          {title}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '120px', height: '3px', backgroundColor: '#C8940A', marginBottom: '30px' }} />
          <div style={{ fontSize: '32px', color: '#ADB5BD', fontWeight: 500 }}>{date}</div>
        </div>

        <div style={{ position: 'absolute', bottom: '80px', fontSize: '20px', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px' }}>
          AI FINANCIAL INTELLIGENCE
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
    }
  )
}
