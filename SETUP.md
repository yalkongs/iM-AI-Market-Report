# UPDOWN KOSPI — 설정 가이드

## 1. Firebase 프로젝트 생성

1. https://console.firebase.google.com 접속
2. **프로젝트 추가** → 이름: `updown-kospi`
3. Google Analytics 비활성화 후 생성

### Firestore 설정
1. 좌측 메뉴 → **Firestore Database** → **데이터베이스 만들기**
2. **프로덕션 모드** 선택 → 위치: `asia-northeast3` (서울)
3. 생성 후 **규칙** 탭 → `firestore.rules` 내용으로 교체 후 게시

### Google Auth 설정
1. 좌측 메뉴 → **Authentication** → **시작하기**
2. **로그인 방법** → **Google** → 활성화
3. 지원 이메일 입력 후 저장

### 웹 앱 등록 & Config 확인
1. 프로젝트 설정(톱니바퀴) → **앱 추가** → 웹(</>) → 이름: `updown-kospi`
2. Firebase SDK 설정 코드에서 `firebaseConfig` 값 복사

### Admin SDK 키 발급
1. 프로젝트 설정 → **서비스 계정** 탭
2. **새 비공개 키 생성** → JSON 다운로드
3. JSON에서 `project_id`, `client_email`, `private_key` 확인

## 2. Vercel 환경변수 설정

Vercel 프로젝트 → Settings → Environment Variables에 아래 추가:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=updown-kospi.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=updown-kospi
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=updown-kospi.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234...

FIREBASE_PROJECT_ID=updown-kospi
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@updown-kospi.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

TELEGRAM_BOT_TOKEN=<Daily market briefing에서 사용하는 봇 토큰>
TELEGRAM_CHAT_ID=<채널 또는 그룹 ID>

NEXT_PUBLIC_APP_URL=https://updown-kospi.vercel.app
CRON_SECRET=<임의의 랜덤 문자열>
```

## 3. Firebase Auth 승인 도메인 추가

Firebase Console → Authentication → Settings → **승인된 도메인**
→ `updown-kospi.vercel.app` 추가

## 4. 텔레그램 아침 전송 연동

`daily-market-briefing-new` 태스크에 아래 코드 추가:

```python
import requests

app_url = "https://updown-kospi.vercel.app"
cron_secret = "<CRON_SECRET>"

requests.post(
    f"{app_url}/api/telegram/morning",
    headers={"Authorization": f"Bearer {cron_secret}"}
)
```

## 5. Vercel Cron 확인

`vercel.json`에 설정된 크론:
- `/api/cron/process-result` → 매일 평일 15:35 KST (06:35 UTC)
- 장 마감 후 자동으로 KOSPI 종가 확인 → 결과 처리 → 텔레그램 전송
