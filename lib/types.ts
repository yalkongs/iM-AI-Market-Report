export interface UserProfile {
  uid: string
  email: string
  name: string
  photoURL: string
  currentStreak: number  // 현재 연속 정답 수
  maxStreak: number      // 역대 최고 연속 정답 수
  totalBets: number      // 총 베팅 수
  correctBets: number    // 정답 수
  lastBetDate: string | null  // 마지막 베팅 날짜 (YYYY-MM-DD)
  badges?: string[]      // 획득한 배지 ID 목록
  updatedAt: number
}

export interface Bet {
  id: string            // {date}_{uid}
  uid: string
  userName: string
  userPhoto: string
  date: string          // YYYY-MM-DD
  prediction: 'UP' | 'DOWN'
  result: 'correct' | 'incorrect' | null  // null = 결과 미확정
  createdAt: number
  updatedAt?: number    // 예측 변경 시 갱신
}

export interface DailyResult {
  date: string          // YYYY-MM-DD
  open: number          // 시가
  close: number | null  // 종가 (장 마감 후 확정)
  prevClose: number     // 전일 종가
  direction: 'UP' | 'DOWN' | 'FLAT' | null
  processedAt: number | null
  changeRate: number | null
}

export interface LeaderboardEntry {
  uid: string
  name: string
  photoURL: string
  currentStreak: number
  maxStreak: number
  totalBets: number
  correctBets: number
  accuracy: number  // 정답률 (%)
}
