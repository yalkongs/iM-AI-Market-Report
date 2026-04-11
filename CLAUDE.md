# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # 로컬 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
```

테스트 프레임워크 없음. 크론 엔드포인트 수동 테스트:
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/process-result
```

## 환경변수

`.env.local`에 아래 변수 필요 (SETUP.md 참고):

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase 클라이언트 SDK 설정 6개 |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | 결과 알림 텔레그램 봇 |
| `NEXT_PUBLIC_APP_URL` | 앱 URL (텔레그램 링크용) |
| `CRON_SECRET` | 크론 API 보호용 시크릿 |

## 아키텍처

**Next.js 14 App Router + Firebase + Vercel** 스택의 KOSPI 등락 예측 게임.

### 핵심 데이터 흐름

```
사용자 예측(UP/DOWN)
  → POST /api/bet
  → Firestore bets/{date}_{uid}

매일 15:35 KST Vercel Cron
  → GET /api/cron/process-result
  → KOSPI 종가 조회(KRX → 네이버 fallback)
  → bets 결과 확정 + users 스트릭 업데이트
  → Telegram 결과 전송
```

### Firestore 컬렉션

- `bets/{date}_{uid}` — 개별 베팅 (`Bet` 타입, `result: null`이면 미확정)
- `daily/{date}` — 날짜별 KOSPI 결과 (`DailyResult` 타입)
- `users/{uid}` — 유저 통계 (스트릭, 정답률 등)

### 베팅 시간 규칙 (KST)

- `00:00~11:59` → 오늘 날짜 베팅 오픈
- `12:00~15:29` → 베팅 잠금 (결과 대기)
- `15:30~23:59` → 다음 영업일 베팅 오픈
- 주말·KRX 공휴일 → 베팅 불가, `ClosedDayView` 표시

### 주요 모듈

- `lib/kospi.ts` — KRX OTP API → 네이버 금융 순서로 KOSPI 조회, `unstable_cache` 10분 캐시. `getFreshKospi()`는 캐시 우회(크론 전용).
- `lib/firebase-admin.ts` — Proxy 패턴으로 지연 초기화. 모든 서버 API는 `adminDb`를 통해 Firestore 접근.
- `lib/firebase.ts` — 클라이언트 SDK, `getApps()` 중복 초기화 방지.
- `lib/types.ts` — `Bet`, `UserProfile`, `DailyResult`, `LeaderboardEntry` 공용 타입.

### API 라우트

모든 라우트에 `export const dynamic = 'force-dynamic'` 선언.

| 경로 | 설명 |
|------|------|
| `POST /api/bet` | 베팅 생성/변경 (결과 미확정 시 예측 변경 가능) |
| `GET /api/bet?uid=&date=` | 특정 날짜 베팅 조회 |
| `GET /api/cron/process-result` | 장 마감 후 결과 처리 (크론 또는 CRON_SECRET 인증) |
| `GET /api/leaderboard` | 리더보드 데이터 |
| `POST /api/telegram/morning` | 아침 KOSPI 브리핑 전송 |
| `app/api/admin/` | 관리자 전용 API |

### 컴포넌트 구조

`AuthProvider`가 Firebase Google 로그인 상태를 Context로 제공. `page.tsx`에서 상태에 따라 `GameCard` / `WaitingCard` / `ClosedDayView`를 조건부 렌더링.

### 배포

Vercel에 연결된 main 브랜치 push 시 자동 배포. 크론은 `vercel.json`에 `"35 6 * * 1-5"` (평일 15:35 KST) 설정.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
