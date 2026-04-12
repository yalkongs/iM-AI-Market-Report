from google import genai
import os
import requests
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

class ReportGenerator:
    def __init__(self, api_key=None):
        api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found. Please set it in .env file.")
        self.client = genai.Client(api_key=api_key)
        self.model_id = "gemini-2.5-flash"

    def get_market_sentiment(self, market_data):
        """시장 데이터에서 오늘의 심리 상태를 추출합니다."""
        sp500_pct = market_data.get("S&P 500", {}).get("pct", 0)
        if sp500_pct > 0.3: return "bull"
        elif sp500_pct < -0.3: return "bear"
        else: return "neutral"

    def generate_report(self, market_data, news_list, is_krx_open=True):
        now = datetime.now()
        today_str = now.strftime("%Y년 %m월 %d일")
        today_compact = now.strftime("%Y-%m-%d")
        today_kr = now.strftime("%Y년 %m월 %d일")
        issue_time = now.strftime("%H:%M AM KST")
        
        sentiment = self.get_market_sentiment(market_data)
        
        # 메타 데이터 준비 (OG 태그용)
        og_title_placeholder = f"iM뱅크 모닝 마켓 브리프\n({today_kr})"
        og_image_base = f"https://im-ai-market-report.vercel.app/api/og?date={requests.utils.quote(today_kr)}"
        
        # [2043 Style + Dynamic Theme]
        themes = {
            "bull": {
                "header_bg": "#8B1A20", # 딥 레드
                "header_text": "#FFFFFF",
                "data_strip_bg": "#111111",
                "footer_bg": "#FDF5E6",
                "accent": "#C8940A"
            },
            "bear": {
                "header_bg": "#0D3050", # 딥 블루
                "header_text": "#FFFFFF",
                "data_strip_bg": "#111111",
                "footer_bg": "#E8F0FB",
                "accent": "#1565C0"
            },
            "neutral": {
                "header_bg": "#FFFFFF", # 2043 오리지널 화이트
                "header_text": "#111111",
                "data_strip_bg": "#2A3050",
                "footer_bg": "#F9FAFB",
                "accent": "#C8940A"
            }
        }
        
        t = themes[sentiment]
        
        css_framework = f"""
<style>
:root {{
    --im-navy: #2A3050; --im-blue: #3A4568; --im-gold: #C8940A;
    --black: #111111; --white: #FFFFFF; --bg: #F9FAFB;
    --border: #E8E8E8; --muted: #777777; --red: #C62828;
    --blue-down: #1565C0; --lnavy: #F4F6F9;
    --header-bg: {t['header_bg']}; --header-text: {t['header_text']};
    --footer-bg: {t['footer_bg']}; --data-bg: {t['data_strip_bg']};
}}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ 
    font-family: 'Pretendard', -apple-system, sans-serif; background: var(--bg); 
    color: var(--black); line-height: 1.85; -webkit-font-smoothing: antialiased; word-break: keep-all; 
}}
.wrap {{ width: 100%; max-width: 680px; margin: 0 auto; background: var(--white); min-height: 100vh; box-shadow: 0 0 40px rgba(0, 0, 0, 0.03); }}

/* 2043 기반 Masthead */
.masthead {{ padding: 60px 40px 45px; background: var(--header-bg); color: var(--header-text); border-bottom: 1px solid var(--black); }}
.brand-row {{ display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }}
.brand-left {{ display: flex; align-items: center; gap: 10px; }}
.brand-logo {{ font-size: 18px; font-weight: 900; letter-spacing: -0.5px; color: inherit; }}
.brand-label {{ font-family: Georgia, serif; font-size: 11px; font-style: italic; letter-spacing: 2px; text-transform: uppercase; color: var(--im-gold); padding-left: 10px; border-left: 1px solid var(--border); }}
.ai-tag {{ font-size: 9px; font-weight: 700; color: inherit; opacity: 0.6; border: 1px solid currentColor; padding: 2px 6px; letter-spacing: 0.5px; text-transform: uppercase; }}
.masthead-title {{ font-size: 32px; font-weight: 800; line-height: 1.3; letter-spacing: -1.5px; margin-bottom: 25px; }}
.summary-lead {{ font-size: 17px; font-weight: 500; opacity: 0.9; margin-top: 25px; line-height: 1.75; position: relative; padding-left: 20px; border-left: 3px solid var(--im-gold); }}
.issue-meta {{ display: flex; justify-content: space-between; align-items: flex-end; font-size: 13px; opacity: 0.7; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 15px; margin-top: 20px; }}

/* Data Strip */
.data-strip {{ display: grid; grid-template-columns: repeat(3, 1fr); background: var(--data-bg); color: #fff; }}
.data-item {{ padding: 22px 15px; text-align: center; border-right: 1px solid rgba(255, 255, 255, 0.1); }}
.data-item:last-child {{ border-right: none; }}
.data-label {{ font-size: 10px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; display: block; }}
.data-val {{ font-size: 18px; font-weight: 700; font-family: 'Helvetica Neue', sans-serif; }}
.data-pct {{ font-size: 11px; font-weight: 600; margin-top: 3px; }}

/* Section */
.section {{ padding: 55px 40px; border-bottom: 1px solid var(--border); }}
.section-num {{ font-family: Georgia, serif; font-size: 42px; font-weight: 400; color: #EFEFEF; line-height: 1; margin-bottom: -12px; display: block; }}
.section-title {{ font-size: 24px; font-weight: 800; color: var(--im-navy); margin-bottom: 30px; letter-spacing: -0.8px; border-bottom: 2px solid var(--im-navy); display: inline-block; padding-bottom: 4px; }}
.content-body {{ font-size: 16.5px; color: #222; text-align: justify; }}
.content-body p {{ margin-bottom: 24px; }}

/* Components */
.callout-box {{ background: var(--lnavy); padding: 30px; margin: 35px 0; border-radius: 4px; border-left: 4px solid var(--im-navy); }}
.tech-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
.tech-table th {{ font-size: 11px; color: var(--muted); text-align: left; padding: 10px 0; border-bottom: 2px solid var(--im-navy); text-transform: uppercase; }}
.tech-table td {{ padding: 12px 0; font-size: 14.5px; border-bottom: 1px solid var(--border); }}
.pull-quote {{ font-family: Georgia, serif; font-size: 22px; font-style: italic; color: var(--im-gold); text-align: center; padding: 40px 0; line-height: 1.5; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin: 40px 0; }}

/* Footer */
.life-insight {{ background: var(--im-navy); color: #fff; padding: 45px 40px; }}
.footer {{ padding: 60px 40px; background: var(--footer-bg); font-size: 12px; color: var(--muted); border-top: 1px solid var(--border); }}
.footer-brand {{ font-weight: 900; color: var(--im-navy); font-size: 16px; margin-bottom: 15px; display: block; }}
.disclaimer {{ background: #fff; padding: 25px; border: 1px solid var(--border); line-height: 1.8; margin-bottom: 30px; color: #888; }}

/* Game Engagement Section */
.game-section {{ background: var(--im-gold); color: #fff; padding: 45px 40px; text-align: center; }}
.game-title {{ font-size: 20px; font-weight: 800; margin-bottom: 15px; letter-spacing: -0.5px; }}
.game-btn {{ display: inline-block; background: var(--im-navy); color: #fff; padding: 15px 35px; border-radius: 4px; text-decoration: none; font-weight: 800; font-size: 15px; transition: 0.3s; }}
.game-btn:hover {{ background: #000; transform: translateY(-2px); }}

/* Live Game Embed Card */
.game-embed-card {{ 
    margin: 50px 0; padding: 40px; background: var(--lnavy); border: 1px solid var(--border); 
    border-radius: 4px; text-align: center; position: relative;
}}
.game-embed-label {{ 
    font-size: 11px; font-weight: 800; color: var(--im-gold); text-transform: uppercase; 
    letter-spacing: 2px; margin-bottom: 15px; display: block; 
}}
.game-embed-title {{ font-size: 22px; font-weight: 800; color: var(--im-navy); margin-bottom: 25px; }}
.voting-options {{ display: flex; gap: 15px; justify-content: center; }}
.vote-link {{ 
    flex: 1; max-width: 180px; padding: 18px; border-radius: 2px; text-decoration: none; 
    font-weight: 800; font-size: 16px; color: #fff; transition: 0.3s; 
}}
.vote-link.up {{ background: var(--red); }}
.vote-link.down {{ background: var(--blue-down); }}
.vote-link:hover {{ filter: brightness(1.1); transform: translateY(-2px); }}
.game-footer-note {{ font-size: 12px; color: var(--muted); margin-top: 20px; font-style: italic; }}

/* Report Navigation */
.report-nav {{ display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; background: #fff; border-bottom: 1px solid var(--border); }}
.report-nav.bottom {{ border-bottom: none; border-top: 1px solid var(--border); margin-top: 40px; }}
.nav-link {{ font-size: 13px; font-weight: 700; color: var(--muted); text-decoration: none; display: flex; align-items: center; gap: 5px; }}
.nav-link:hover {{ color: var(--im-navy); }}
.nav-list-btn {{ font-size: 14px; font-weight: 800; color: var(--im-navy); text-decoration: none; border: 1px solid var(--im-navy); padding: 6px 16px; border-radius: 20px; }}
.nav-list-btn:hover {{ background: var(--im-navy); color: #fff; }}

.up {{ color: #FF5252; }}
.down {{ color: #448AFF; }}

@media (max-width: 600px) {{
    .masthead {{ padding: 45px 24px; }}
    .section {{ padding: 45px 24px; }}
    .masthead-title {{ font-size: 28px; }}
}}
</style>
"""

        krx_context = ""
        if is_krx_open:
            krx_context = "오늘은 KRX 영업일입니다. 밤사이 뉴욕의 상황이 오늘 아침 9시 한국 증시 개장가와 방향성에 미칠 파급력을 집중 해석하세요."
        else:
            krx_context = "오늘은 KRX 휴장일입니다. 글로벌 거시 흐름을 정리하고 다음 개장일을 준비하는 관점에서 분석하세요."

        prompt = f"""
당신은 iM뱅크의 금융 분석 시스템을 총괄하는 수석 에디터입니다. 
제공된 시장 데이터를 바탕으로, **2043 버전의 레이아웃 구조를 엄격히 따르면서도 오늘의 시장 심리를 반영한** 프리미엄 에디토리얼 리포트를 제작해 주세요.

### 📅 오늘의 리포트 정보:
- 발행시각: {today_str} {issue_time}
- KRX 개장 여부: {"영업일" if is_krx_open else "휴장일"}
- 시장 심리 테마: {sentiment.upper()} (헤더/푸터 색상에 반영됨)
- 데이터: {market_data}
- 뉴스: {news_list}

---

### ✍️ 에디토리얼 작성 지침 (2043 스타일 계승):

1. **레이아웃 유지**:
   - `brand-row` (좌측 로고, 우측 AI 태그) -> `masthead-title` -> `summary-lead` -> `issue-meta` 순서를 엄격히 지키세요.
   - `data-strip`은 헤더 바로 아래에 배치하세요.
   - 모든 섹션은 `section-num`과 `section-title`로 시작하고, 텍스트는 양쪽 정렬(justify)로 작성하세요.

2. **내용의 깊이와 분량**:
   - 단순 요약이 아닌 심층 분석(A4 3페이지 이상)을 수행하세요. {krx_context}
   - `pull-quote`, `callout-box`, `tech-table`을 적재적소에 배치하여 잡지 스타일을 완성하세요.

3. **게임 연동 (Full Context Engagement)**:
   - **인터랙티브 투표 카드 삽입**: 리포트의 **두 번째 심층 분석 섹션이 끝나는 지점**에 반드시 아래의 정적 투표 카드를 삽입하세요.
     ```html
     <div id="im-live-game" class="game-embed-card">
         <span class="game-embed-label">iM Special Challenge</span>
         <div class="game-embed-title">오늘의 KOSPI, 당신의 선택은?</div>
         <div class="voting-options">
             <a href="https://im-ai-market-report.vercel.app?vote=UP" class="vote-link up">▲ UP (상승)</a>
             <a href="https://im-ai-market-report.vercel.app?vote=DOWN" class="vote-link down">▼ DOWN (하락)</a>
         </div>
         <div class="game-footer-note">
            버튼을 클릭하면 iM뱅크 예측 시스템에 즉시 반영됩니다.<br>
            <a href="https://im-ai-market-report.vercel.app/history" style="color:var(--im-gold); text-decoration:underline; margin-top:10px; display:inline-block;">나의 전체 도전 기록 확인하기</a>
         </div>
     </div>
     ```
   - 이 카드는 텔레그램이나 오프라인 파일에서도 완벽하게 보이며, 웹사이트에서는 실시간 데이터로 교체됩니다.

4. **내비게이션 (Navigation)**:
   - 리포트의 **최상단(masthead 이전)**과 **최하단(footer 이후)**에 반드시 아래의 내비게이션 섹션을 삽입하세요.
     ```html
     <nav class="report-nav">
         <a href="{{prev_link}}" class="nav-link">← 이전 리포트</a>
         <a href="/reports/index.html" class="nav-list-btn">목록으로</a>
         <a href="{{next_link}}" class="nav-link">다음 리포트 →</a>
     </nav>
     ```
   - 주의: `{{prev_link}}`와 `{{next_link}}` 문자열을 그대로 사용하세요. 나중에 시스템에서 실제 링크로 치환됩니다. 만약 이전/다음 리포트가 없는 경우에도 링크 형식은 유지하세요.

5. **시각적 제약**:
   - 픽토그램, 이모지 절대 금지. 오직 폰트와 선으로만 격을 표현하세요.
   - 강조는 HTML `<strong>` 태그만 사용하며, 마크다운 기호(`**`)는 절대 금지합니다.

4. **언어의 품격**:
   - iM뱅크의 신뢰를 담은 우아하고 전문적인 문체를 사용하세요.

출력은 반드시 `<!DOCTYPE html>`로 시작하는 완전한 HTML 코드여야 합니다. 

### 💻 출력 요구사항 (필수):
- `<head>` 안에 다음 메타 태그를 반드시 포함하세요. (제목 부분에는 당신이 정한 리포트 제목을 넣으세요):
  ```html
  <meta property="og:title" content="[리포트 제목]">
  <meta property="og:description" content="iM뱅크 AI가 분석한 오늘의 글로벌 시장 인사이트">
  <meta property="og:image" content="https://im-ai-market-report.vercel.app/api/og?date={today_compact}&title=[리포트 제목]">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  ```
- **주의**: `[리포트 제목]` 부분은 반드시 실제 당신이 지은 매력적인 제목으로 교체하세요. 이때 **`og:title`의 content에는 일반 공백**을 사용하고, **`og:image`의 content URL 안에서도 일반 공백**을 사용하세요. (시스템이 나중에 처리할 것이니 당신이 직접 %20으로 바꿀 필요가 없습니다.)
- 모든 CSS는 `<style>` 태그에 포함하세요. ({css_framework})
"""

        response = self.client.models.generate_content(
            model=self.model_id,
            contents=prompt
        )
        return response.text
