/**
 * KRX 공식 데이터를 사용하여 KOSPI 지수를 가져옵니다.
 * KRX OTP 방식 + 네이버 금융 fallback
 * - 타임아웃: 각 API 4초
 * - 캐시: Next.js unstable_cache (10분)
 */

import { unstable_cache } from 'next/cache'

export interface KospiData {
  date: string       // YYYY-MM-DD
  close: number      // 종가
  open: number       // 시가
  change: number     // 전일대비
  changeRate: number // 등락률 (%)
  direction: 'UP' | 'DOWN' | 'FLAT'
}

/** fetch with timeout helper */
function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

// KRX 공식 API (OTP 방식) — 타임아웃 4초
async function fetchKospiFromKRX(date: string): Promise<KospiData | null> {
  try {
    const yyyymmdd = date.replace(/-/g, '')

    // Step 1: OTP 발급 (최대 4초)
    const otpRes = await fetchWithTimeout(
      'https://data.krx.co.kr/comm/bldAttendant/generateOTP.cmd',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://data.krx.co.kr',
        },
        body: new URLSearchParams({
          bld: 'dbms/MDC/STAT/standard/MDCSTAT00301',
          name: 'fileDown',
          filetype: 'csv',
          inqTpCd: '1',
          idxIndMidclssCd: '01',
          strtDd: yyyymmdd,
          endDd: yyyymmdd,
        }).toString(),
      },
      4000
    )

    const otp = await otpRes.text()
    if (!otp || otp.length > 100) throw new Error('OTP 발급 실패')

    // Step 2: 데이터 조회 (최대 4초)
    const dataRes = await fetchWithTimeout(
      'https://data.krx.co.kr/comm/fileDn/download_csv.cmd',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://data.krx.co.kr',
        },
        body: new URLSearchParams({ code: otp }).toString(),
      },
      4000
    )

    const csv = await dataRes.text()
    const lines = csv.trim().split('\n')
    if (lines.length < 2) throw new Error('데이터 없음')

    const row = lines[1].split(',')
    const closePrice = parseFloat(row[1].replace(/"/g, '').replace(/,/g, ''))
    const change = parseFloat(row[2].replace(/"/g, '').replace(/,/g, ''))
    const changeRate = parseFloat(row[3].replace(/"/g, '').replace(/%/g, ''))
    const openPrice = parseFloat(row[4].replace(/"/g, '').replace(/,/g, ''))

    if (isNaN(closePrice) || closePrice === 0) throw new Error('파싱 실패')

    return {
      date,
      close: closePrice,
      open: openPrice,
      change,
      changeRate,
      direction: change > 0 ? 'UP' : change < 0 ? 'DOWN' : 'FLAT',
    }
  } catch (e) {
    console.warn('KRX API 실패, fallback 시도:', (e as Error).message)
    return null
  }
}

// Naver Finance fallback (최대 3초)
async function fetchKospiFromNaver(): Promise<KospiData | null> {
  try {
    const res = await fetchWithTimeout(
      'https://m.stock.naver.com/api/index/KOSPI/basic',
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
      3000
    )
    const json = await res.json()

    const closePrice = parseFloat(json.closePrice.replace(/,/g, ''))
    const change = parseFloat(json.compareToPreviousClosePrice.replace(/,/g, ''))
    const changeRate = parseFloat(json.fluctuationsRatio)

    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    return {
      date: dateStr,
      close: closePrice,
      open: closePrice - change,
      change,
      changeRate,
      direction: change > 0 ? 'UP' : change < 0 ? 'DOWN' : 'FLAT',
    }
  } catch (e) {
    console.error('Naver API도 실패:', (e as Error).message)
    return null
  }
}

// 내부 fetch 함수 (캐시 미적용)
async function _fetchKospi(date: string): Promise<KospiData | null> {
  const krxData = await fetchKospiFromKRX(date)
  if (krxData) return krxData
  return fetchKospiFromNaver()
}

// 캐시 적용된 공개 함수 — 날짜별 독립 캐시 (10분)
export const getTodayKospi = unstable_cache(
  async (date: string) => _fetchKospi(date),
  ['kospi-data'],
  { revalidate: 600, tags: ['kospi'] }
)

// 크론 전용 — 캐시 없이 항상 최신 종가 조회
export async function getFreshKospi(date: string): Promise<KospiData | null> {
  return _fetchKospi(date)
}

// 오늘 KST 날짜 문자열 반환
export function getTodayKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getKSTHour(): { hour: number; minute: number } {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return { hour: kst.getUTCHours(), minute: kst.getUTCMinutes() }
}

/** 오늘(KST) 베팅 가능 여부: 00:00~09:59 (10:00 마감) */
export function isBettingOpen(): boolean {
  const { hour } = getKSTHour()
  return hour < 10
}

/** 주어진 날짜가 KRX 휴장일(공휴일)인지 — 주말 제외 평일 공휴일만 체크 */
export function isKRXHoliday(dateStr: string): boolean {
  return KRX_HOLIDAYS.has(dateStr)
}

/** 주어진 날짜가 거래 불가일인지 (주말 + 공휴일) */
export function isNonTradingDay(dateStr: string): boolean {
  const date = new Date(`${dateStr}T12:00:00+09:00`)
  return _isNonTradingDay(date)
}

export function isMarketClosed(): boolean {
  const { hour, minute } = getKSTHour()
  return hour > 15 || (hour === 15 && minute >= 30)
}

// ── KRX 공식 휴장일 (주말 제외 평일 공휴일) ─────────────────
// ※ 매년 KRX 공시 기준으로 업데이트 필요
// ※ 토·일 공휴일은 이미 주말 처리되므로 별도 명시 불필요
//   (단, 대체공휴일이 평일로 지정될 경우 해당 날짜 추가)
export const KRX_HOLIDAYS = new Set<string>([
  // ── 2025 ──
  '2025-01-01', // 신정 (수)
  '2025-01-28', // 설날 전날 (화)
  '2025-01-29', // 설날 (수)
  '2025-01-30', // 설날 다음날 (목)
  // 2025-03-01 삼일절 → 토요일, 주말 처리
  '2025-05-05', // 어린이날 = 부처님오신날 (월)
  '2025-05-06', // 어린이날·부처님오신날 겹침 대체공휴일 (화)
  '2025-06-06', // 현충일 (금)
  '2025-08-15', // 광복절 (금)
  '2025-10-03', // 개천절 (금)
  '2025-10-06', // 추석 (월)
  '2025-10-07', // 추석 다음날 (화)
  '2025-10-08', // 추석 전날 대체공휴일 (추석 전날이 일요일) (수)
  '2025-10-09', // 한글날 (목)
  '2025-12-25', // 크리스마스 (목)
  // ── 2026 ──
  '2026-01-01', // 신정 (목)
  '2026-02-16', // 설날 전날 (월)
  '2026-02-17', // 설날 (화)
  '2026-02-18', // 설날 다음날 (수)
  // 2026-03-01 삼일절 → 일요일
  '2026-03-02', // 삼일절 대체공휴일 (월)
  '2026-05-05', // 어린이날 (화)
  '2026-05-24', // 부처님 오신 날 (음력 4/8, 2026년 추정) — KRX 공시 확인 필요
  // 2026-06-06 현충일 → 토요일, 주말 처리
  // 2026-08-15 광복절 → 토요일, 주말 처리
  '2026-09-24', // 추석 전날 (목) — 음력 8/15 = 9/25 기준, KRX 공시 확인 필요
  '2026-09-25', // 추석 (금) — KRX 공시 확인 필요
  '2026-09-28', // 추석 다음날 대체공휴일 (다음날 토→대체 월) — KRX 공시 확인 필요
  // 2026-10-03 개천절 → 토요일, 주말 처리
  '2026-10-09', // 한글날 (금)
  '2026-12-25', // 크리스마스 (금)
  // ── 2027 ──
  '2027-01-01', // 신정 (금)
  // TODO: 2027 설날·추석·부처님오신날 등 매년 KRX 공시 기준 추가
])

function _kstDateStr(kst: Date): string {
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function _isNonTradingDay(date: Date): boolean {
  const dow = date.getUTCDay()
  if (dow === 0 || dow === 6) return true  // 주말
  return KRX_HOLIDAYS.has(_kstDateStr(date))
}

/** 다음 영업일 날짜 반환 (from 기준, 기본값: 오늘 KST) */
export function getNextTradingDay(from?: string): string {
  const now = new Date()
  const kst = from
    ? new Date(`${from}T12:00:00+09:00`)
    : new Date(now.getTime() + 9 * 60 * 60 * 1000)
  kst.setUTCDate(kst.getUTCDate() + 1)
  while (_isNonTradingDay(kst)) {
    kst.setUTCDate(kst.getUTCDate() + 1)
  }
  return _kstDateStr(kst)
}

/** 직전 영업일 날짜 반환 (from 기준, 기본값: 오늘 KST) */
export function getPrevTradingDay(from?: string): string {
  const now = new Date()
  const kst = from
    ? new Date(`${from}T12:00:00+09:00`)
    : new Date(now.getTime() + 9 * 60 * 60 * 1000)
  kst.setUTCDate(kst.getUTCDate() - 1)
  while (_isNonTradingDay(kst)) {
    kst.setUTCDate(kst.getUTCDate() - 1)
  }
  return _kstDateStr(kst)
}

/** bettingDate가 캘린더상 내일이면 "내일", 아니면 "M월 D일(요일)" */
export function getBettingDayLabel(today: string, bettingDate: string): string {
  const todayKst = new Date(`${today}T12:00:00+09:00`)
  const tomorrowKst = new Date(todayKst.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowStr = _kstDateStr(tomorrowKst)
  if (bettingDate === tomorrowStr) return '내일'
  // 다음 거래일이 내일이 아닌 경우 (금요일→월요일, 연휴 등) 날짜 표시
  const [, m, d] = bettingDate.split('-')
  const date = new Date(`${bettingDate}T12:00:00+09:00`)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${parseInt(m)}월 ${parseInt(d)}일(${days[date.getUTCDay()]})`
}
