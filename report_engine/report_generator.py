import google.generativeai as genai
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
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-2.5-pro")

    def get_market_sentiment(self, market_data):
        sp500_pct = market_data.get("S&P 500", {}).get("pct", 0)
        if sp500_pct > 0.3: return "bull"
        elif sp500_pct < -0.3: return "bear"
        else: return "neutral"

    def generate_report(self, market_data, news_list, is_krx_open=True, prev_link="#", next_link="#"):
        now = datetime.now()
        today_str = now.strftime("%Y년 %m월 %d일")
        today_kr = now.strftime("%Y년 %m월 %d일")
        issue_time = now.strftime("%H:%M AM KST")
        sentiment = self.get_market_sentiment(market_data)
        encoded_date = requests.utils.quote(today_kr)
        
        themes = {
            "bull": {"header_bg": "#8B1A20", "header_text": "#FFFFFF", "data_strip_bg": "#111111", "footer_bg": "#FDF5E6"},
            "bear": {"header_bg": "#0D3050", "header_text": "#FFFFFF", "data_strip_bg": "#111111", "footer_bg": "#E8F0FB"},
            "neutral": {"header_bg": "#FFFFFF", "header_text": "#111111", "data_strip_bg": "#2A3050", "footer_bg": "#F9FAFB"}
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
body {{ font-family: 'Pretendard', -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.85; -webkit-font-smoothing: antialiased; word-break: keep-all; }}
.wrap {{ width: 100%; max-width: 680px; margin: 0 auto; background: var(--white); min-height: 100vh; box-shadow: 0 0 40px rgba(0, 0, 0, 0.03); }}
.masthead {{ padding: 60px 40px 45px; background: var(--header-bg); color: var(--header-text); border-bottom: 1px solid var(--black); }}
.brand-row {{ display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }}
.brand-logo {{ font-size: 18px; font-weight: 900; color: inherit; }}
.brand-label {{ font-family: Georgia, serif; font-size: 11px; font-style: italic; color: var(--im-gold); padding-left: 10px; border-left: 1px solid var(--border); }}
.ai-tag {{ font-size: 9px; font-weight: 700; color: inherit; opacity: 0.6; border: 1px solid currentColor; padding: 2px 6px; text-transform: uppercase; }}
.masthead-title {{ font-size: 32px; font-weight: 800; line-height: 1.3; letter-spacing: -1.5px; margin-bottom: 25px; }}
.summary-lead {{ font-size: 17px; font-weight: 500; opacity: 0.9; margin-top: 25px; line-height: 1.75; padding-left: 20px; border-left: 3px solid var(--im-gold); }}
.issue-meta {{ display: flex; justify-content: space-between; align-items: flex-end; font-size: 13px; opacity: 0.7; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 15px; margin-top: 20px; }}
.data-strip {{ display: grid; grid-template-columns: repeat(3, 1fr); background: var(--data-bg); color: #fff; border-bottom: 1px solid rgba(0,0,0,0.1); }}
.data-item {{ padding: 15px 10px; text-align: center; border-right: 1px solid rgba(255, 255, 255, 0.1); }}
.data-item:last-child {{ border-right: none; }}
.data-label {{ font-size: 9px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: block; }}
.data-val {{ font-size: 16px; font-weight: 700; font-family: 'Helvetica Neue', sans-serif; }}
.section {{ padding: 55px 40px; border-bottom: 1px solid var(--border); }}
.section-num {{ font-family: Georgia, serif; font-size: 42px; color: #EFEFEF; line-height: 1; margin-bottom: -12px; display: block; }}
.section-title {{ font-size: 24px; font-weight: 800; color: var(--im-navy); margin-bottom: 30px; letter-spacing: -0.8px; border-bottom: 2px solid var(--im-navy); display: inline-block; padding-bottom: 4px; }}
.content-body {{ font-size: 16.5px; color: #222; text-align: justify; }}
.content-body p {{ margin-bottom: 24px; }}
.callout-box {{ background: var(--lnavy); padding: 30px; margin: 35px 0; border-radius: 4px; border-left: 4px solid var(--im-navy); }}
.tech-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
.tech-table th {{ font-size: 11px; color: var(--muted); text-align: left; padding: 10px 0; border-bottom: 2px solid var(--im-navy); text-transform: uppercase; }}
.tech-table td {{ padding: 12px 0; font-size: 14.5px; border-bottom: 1px solid var(--border); }}
.pull-quote {{ font-family: Georgia, serif; font-size: 22px; font-style: italic; color: var(--im-gold); text-align: center; padding: 40px 0; line-height: 1.5; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin: 40px 0; }}
.game-embed-card {{ margin: 50px 0; padding: 40px; background: var(--lnavy); border: 1px solid var(--border); border-radius: 4px; text-align: center; }}
.game-embed-label {{ font-size: 11px; font-weight: 800; color: var(--im-gold); text-transform: uppercase; margin-bottom: 15px; display: block; }}
.game-embed-title {{ font-size: 22px; font-weight: 800; color: var(--im-navy); margin-bottom: 25px; }}
.voting-options {{ display: flex; gap: 15px; justify-content: center; }}
.vote-link {{ flex: 1; max-width: 180px; padding: 18px; border-radius: 2px; text-decoration: none; font-weight: 800; font-size: 16px; color: #fff; transition: 0.3s; }}
.vote-link.up {{ background: var(--red); }}
.vote-link.down {{ background: var(--blue-down); }}
.game-footer-note {{ font-size: 12px; color: var(--muted); margin-top: 20px; }}
.report-nav {{ display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; background: #fff; border-bottom: 1px solid var(--border); }}
.nav-link {{ font-size: 13px; font-weight: 700; color: var(--muted); text-decoration: none; display: flex; align-items: center; gap: 5px; }}
.nav-list-btn {{ font-size: 14px; font-weight: 800; color: var(--im-navy); text-decoration: none; border: 1px solid var(--im-navy); padding: 6px 16px; border-radius: 20px; }}
.footer {{ padding: 60px 40px; background: var(--footer-bg); font-size: 12px; color: var(--muted); border-top: 1px solid var(--border); }}
.footer-brand {{ font-weight: 900; color: var(--im-navy); font-size: 16px; margin-bottom: 15px; display: block; }}
.disclaimer {{ background: #fff; padding: 25px; border: 1px solid var(--border); line-height: 1.8; margin-bottom: 30px; color: #888; }}
.up {{ color: #FF5252; }}
.down {{ color: #448AFF; }}
@media (max-width: 600px) {{ .masthead, .section {{ padding: 45px 24px; }} .masthead-title {{ font-size: 28px; }} }}
</style>
"""

        nav_html = f"""
<nav class="report-nav">
    <a href="{prev_link}" class="nav-link">{"← 이전 리포트" if prev_link != "#" else ""}</a>
    <a href="/reports/index.html" class="nav-list-btn">목록으로</a>
    <a href="{next_link}" class="nav-link">{"다음 리포트 →" if next_link != "#" else ""}</a>
</nav>
"""

        prompt = f"""
당신은 iM뱅크의 최고 투자전략가이자 **'iM뱅크 AI 이코노미스트'**입니다. 
밤사이 글로벌 데이터를 바탕으로, 전문 지식과 대중성을 모두 갖춘 대한민국 최고 수준의 에디토리얼 리포트를 제작해 주세요.

### 🎯 필수 포함 레이어 및 작성 규칙 (절대 준수):

1. **명의 표기**: 리포트의 모든 발행 명의는 오직 **'iM뱅크 AI 이코노미스트'**로만 작성하세요. (수석 전략가, 편집장 등 다른 표현 금지)

2. **한글 소제목 전용**: 모든 섹션의 제목은 오직 **'한글'**로만 작성하세요. (영어 병기나 괄호 내 영어 표기 절대 금지)

3. **5대 분석 레이어 강제**:
   - **시장의 맥 읽기 (Editorial Lead)**: 시장의 공기를 읽어주는 묵직한 서문.
   - **정치경제적 배경**: 배후의 정치적 결정, 입법 동향, 지정학적 리스크 해부.
   - **한국 시장 및 산업 영향**: 오늘 아침 K-반도체, 자동차 등 핵심 산업 파급 효과.
   - **투자자 유의사항**: 오늘 장의 '기회'와 '위험 요소' 명시.
   - **일상 속 나비효과**: 대출 금리, 환율 등 독자의 실생활 영향 해설.

4. **게임 위젯 삽입 (MUST)**: 
   - 반드시 **두 번째 섹션과 세 번째 섹션 사이**에 아래의 게임 위젯 코드를 한 토씨도 틀리지 말고 삽입하세요.
   ```html
   <div id="im-live-game" class="game-embed-card">
       <span class="game-embed-label">iM Special Challenge</span>
       <div class="game-embed-title">오늘의 KOSPI, 당신의 선택은?</div>
       <div class="voting-options">
           <a href="https://im-ai-market-report.vercel.app/history?vote=UP" class="vote-link up">▲ UP (상승)</a>
           <a href="https://im-ai-market-report.vercel.app/history?vote=DOWN" class="vote-link down">▼ DOWN (하락)</a>
       </div>
       <div class="game-footer-note">
          버튼을 클릭하면 iM뱅크 예측 시스템에 즉시 반영됩니다.<br>
          <a href="https://im-ai-market-report.vercel.app/history" style="color:var(--im-gold); text-decoration:underline; margin-top:10px; display:inline-block;">나의 전체 도전 기록 확인하기</a>
       </div>
   </div>
   ```

5. **내비게이션 필수 삽입**: 리포트의 최상단과 최하단에 반드시 아래 코드를 삽입하세요: {nav_html}

6. **Open Graph(미리보기) 설정**:
   - `<head>` 안에 리포트 제목과 날짜를 포함한 메타 태그를 작성하세요. 이미지 URL: `https://im-ai-market-report.vercel.app/api/og?date={encoded_date}&title=[리포트 제목]`

모든 CSS는 `<style>` 태그에 포함하고, 출력은 오직 `<!DOCTYPE html>`로 시작해야 합니다.
"""

        response = self.model.generate_content(prompt)
        return response.text
