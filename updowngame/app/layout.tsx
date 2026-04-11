import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'KOSPI UPDOWN — 오늘의 KOSPI를 맞혀라!',
  description: '매일 아침 KOSPI가 오를지 내릴지 예측하고 연속 정답 스트릭을 쌓아보세요!',
  openGraph: {
    title: 'KOSPI UPDOWN',
    description: '오늘 KOSPI가 오를까요, 내릴까요?',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          {children}
          <footer className="mt-8 pb-8 text-center">
            <p className="text-xs text-gray-300">
              Powered by{' '}
              <span className="font-semibold text-gray-400">iM뱅크</span>
              {' '}· KOSPI 데이터 KRX 공식
            </p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  )
}
