export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

// ── 가상 데이터 상수 ─────────────────────────────────────
const LAST_NAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전', '홍', '고', '문', '양', '손', '배', '백', '허', '유', '남']
const FIRST_NAMES_M = ['민준', '서준', '예준', '도윤', '시우', '주원', '하준', '지호', '준서', '준우', '현우', '유준', '채준', '민재', '윤우', '준혁', '서진', '태양', '민성', '지훈', '승현', '준수', '동현', '재원', '성민', '태민', '현진', '지성', '민호', '준기', '재훈', '성준', '우진', '영재', '상현']
const FIRST_NAMES_F = ['서연', '서윤', '지우', '서현', '민서', '하은', '하린', '수아', '지민', '채원', '지유', '윤서', '다은', '예린', '소연', '지아', '예진', '수빈', '은지', '지현', '나은', '예은', '소희', '민지', '채은', '유진', '수연', '하영', '민아', '지원', '예나', '보미', '채린', '소윤', '아린']

// 20 영업일 날짜 목록 (2026-03-12 ~ 2026-04-09, 주말 제외)
function getBusinessDays(count: number): string[] {
  const days: string[] = []
  const end = new Date('2026-04-09T00:00:00+09:00')
  let cur = new Date(end)
  while (days.length < count) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) {
      const y = cur.getFullYear()
      const m = String(cur.getMonth() + 1).padStart(2, '0')
      const d = String(cur.getDate()).padStart(2, '0')
      days.unshift(`${y}-${m}-${d}`)
    }
    cur.setDate(cur.getDate() - 1)
  }
  return days
}

// seeded pseudo-random (재현 가능한 랜덤)
function seededRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function generateName(rand: () => number, idx: number): string {
  const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]
  const isMale = idx % 2 === 0
  const firsts = isMale ? FIRST_NAMES_M : FIRST_NAMES_F
  const first = firsts[Math.floor(rand() * firsts.length)]
  return `${last}${first}`
}

interface SeedUser {
  uid: string
  name: string
  photoURL: null
  currentStreak: number
  maxStreak: number
  totalBets: number
  correctBets: number
  lastBetDate: string
  updatedAt: number
}

function buildUsers(): SeedUser[] {
  const days = getBusinessDays(20)   // 20 영업일
  const lastDay = days[days.length - 1]  // 2026-04-09
  const now = Date.now()
  const users: SeedUser[] = []

  // ── 스트릭 분포 설계 (총 800명) ──
  // rank 1: 19연속
  // 2~3: 15~18
  // 4~8: 10~14
  // 9~28: 5~9
  // 29~128: 2~4
  // 129~428: 1
  // 429~800: 0 (참여했지만 현재 streak 0)

  const distribution: Array<{ count: number; streakMin: number; streakMax: number }> = [
    { count: 1,   streakMin: 19, streakMax: 19 },
    { count: 2,   streakMin: 15, streakMax: 18 },
    { count: 5,   streakMin: 10, streakMax: 14 },
    { count: 20,  streakMin: 5,  streakMax: 9  },
    { count: 100, streakMin: 2,  streakMax: 4  },
    { count: 300, streakMin: 1,  streakMax: 1  },
    { count: 372, streakMin: 0,  streakMax: 0  },
  ]

  let userIdx = 0
  for (const tier of distribution) {
    for (let t = 0; t < tier.count; t++) {
      const rand = seededRand(userIdx * 31337 + 42)
      const currentStreak = tier.streakMin === tier.streakMax
        ? tier.streakMin
        : tier.streakMin + Math.floor(rand() * (tier.streakMax - tier.streakMin + 1))

      // totalBets: streak 0인 사람도 최소 1번은 참여
      const maxPossible = Math.min(20, days.length)
      const minBets = Math.max(currentStreak + (currentStreak === 0 ? 1 : 0), 1)
      const totalBets = minBets + Math.floor(rand() * (maxPossible - minBets + 1))

      // correctBets: currentStreak만큼은 반드시 포함, 나머지는 50~75% 적중률
      const extraBets = totalBets - currentStreak
      const extraCorrect = Math.floor(extraBets * (0.4 + rand() * 0.35))
      const correctBets = currentStreak + extraCorrect

      // maxStreak: currentStreak 이상, 최대 20
      const maxStreak = currentStreak + Math.floor(rand() * 3)

      const name = generateName(rand, userIdx)
      const uid = `seed_user_${String(userIdx).padStart(4, '0')}`

      users.push({
        uid,
        name,
        photoURL: null,
        currentStreak,
        maxStreak,
        totalBets,
        correctBets,
        lastBetDate: lastDay,
        updatedAt: now - Math.floor(rand() * 3600000),
      })
      userIdx++
    }
  }

  return users
}

// ── API 핸들러 ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  // CRON_SECRET으로 보호
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  // 이미 시드된 경우 체크
  const existingCheck = await adminDb.collection('users').where('uid', '>=', 'seed_user_').where('uid', '<=', 'seed_user_z').limit(1).get()
  if (!existingCheck.empty) {
    return NextResponse.json({ message: '이미 시드 데이터가 존재합니다. 강제 재주입하려면 ?force=true를 사용하세요.' })
  }

  const users = buildUsers()

  // Firestore batch (최대 500개씩)
  const CHUNK = 499
  let written = 0
  for (let i = 0; i < users.length; i += CHUNK) {
    const chunk = users.slice(i, i + CHUNK)
    const batch = adminDb.batch()
    for (const u of chunk) {
      const ref = adminDb.collection('users').doc(u.uid)
      batch.set(ref, u)
    }
    await batch.commit()
    written += chunk.length
  }

  return NextResponse.json({
    success: true,
    message: `${written}명의 가상 사용자 데이터를 주입했습니다.`,
    topUser: users[0],
    totalUsers: users.length,
    streakDistribution: {
      '19': users.filter(u => u.currentStreak === 19).length,
      '10-18': users.filter(u => u.currentStreak >= 10 && u.currentStreak <= 18).length,
      '5-9': users.filter(u => u.currentStreak >= 5 && u.currentStreak <= 9).length,
      '1-4': users.filter(u => u.currentStreak >= 1 && u.currentStreak <= 4).length,
      '0': users.filter(u => u.currentStreak === 0).length,
    }
  })
}

// force 파라미터로 재주입 지원
export async function DELETE(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  // seed_user_ 로 시작하는 문서 삭제
  const snapshot = await adminDb.collection('users').where('uid', '>=', 'seed_user_').where('uid', '<=', 'seed_user_z').get()
  const CHUNK = 499
  let deleted = 0
  for (let i = 0; i < snapshot.docs.length; i += CHUNK) {
    const batch = adminDb.batch()
    snapshot.docs.slice(i, i + CHUNK).forEach(doc => batch.delete(doc.ref))
    await batch.commit()
    deleted += Math.min(CHUNK, snapshot.docs.length - i)
  }
  return NextResponse.json({ success: true, deleted })
}
