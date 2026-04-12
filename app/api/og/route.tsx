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
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2A3050', // iM뱅크 대표 네이비
          padding: '60px',
          position: 'relative',
        }}
      >
        {/* 상단 골드 장식 띠 */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '40px', backgroundColor: '#C8940A' }} />
        
        {/* 중앙 로고 섹션 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '80px' }}>
          <div style={{ fontSize: '40px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-2px', marginBottom: '10px' }}>iM BANK</div>
          <div style={{ fontSize: '20px', color: '#C8940A', letterSpacing: '4px', fontWeight: 700 }}>AI FINANCIAL EDITION</div>
        </div>

        {/* 메인 리포트 제목 (세로형에 맞게 큼직하게 배치) */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 800,
            color: 'white',
            lineHeight: 1.2,
            textAlign: 'center',
            marginBottom: '60px',
            wordBreak: 'keep-all',
            padding: '0 20px',
          }}
        >
          {title}
        </div>

        {/* 날짜 및 발행 정보 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100px', height: '2px', backgroundColor: '#C8940A', marginBottom: '30px' }} />
          <div style={{ fontSize: '28px', color: '#ADB5BD', fontWeight: 500 }}>{date}</div>
        </div>

        {/* 하단 브랜드 슬로건 */}
        <div style={{ position: 'absolute', bottom: '80px', fontSize: '18px', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>
          THE SMART WAY TO MANAGE YOUR WEALTH
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920, // 세로형 모바일 최적화 비율
    }
  )
}
