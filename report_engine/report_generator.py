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

    def generate_report(self, market_data, news_list, is_krx_open=True, prev_link="#", next_link="#"):
        now = datetime.now()
        today_kr = now.strftime("%Y년 %m월 %d일")
        issue_time = now.strftime("%H:%M AM KST")
        
        # 🎯 데이터 대시보드 HTML 생성 (파이썬에서 직접 생성하여 수치 무결성 보장)
        def get_trend(pct): return f'{"▲" if pct >= 0 else "▼"} {abs(pct)}%'
        def get_cls(pct): return "up" if pct >= 0 else "down"
        
        db_html = '<section class="data-strip">'
        for name in ["KOSPI", "NASDAQ", "S&P 500"]:
            d = market_data.get(name, {"price": 0, "pct": 0})
            db_html += f"""
            <div class="data-item">
                <span class="data-label">{name}</span>
                <span class="data-val">{d['price']:,}</span>
                <span class="data-pct {get_cls(d['pct'])}">{get_trend(d['pct'])}</span>
            </div>"""
        db_html += '</section>'

        # 🎯 단순하고 강력한 UPDOWN 게임 위젯
        game_html = f"""
        <div id="im-live-game" class="game-embed-card">
            <div class="game-embed-title">오늘 KOSPI, 오를까요 내릴까요?</div>
            <div class="voting-options">
                <a href="https://im-ai-market-report.vercel.app/history?vote=UP" class="vote-link up">▲ 상승 (UP)</a>
                <a href="https://im-ai-market-report.vercel.app/history?vote=DOWN" class="vote-link down">▼ 하락 (DOWN)</a>
            </div>
            <div class="game-footer-note">로그인 후 클릭 한 번으로 참여가 완료됩니다.</div>
        </div>"""

        # 🎯 내비게이션
        nav_html = f"""
        <nav class="report-nav">
            <a href="{prev_link}" class="nav-link">{"← 이전 리포트" if prev_link != "#" else ""}</a>
            <a href="/reports/index.html" class="nav-list-btn">목록으로</a>
            <a href="{next_link}" class="nav-link">{"다음 리포트 →" if next_link != "#" else ""}</a>
        </nav>"""

        prompt = f"""
당신은 iM뱅크의 **'iM뱅크 AI 이코노미스트'**입니다. 
제공된 시장 데이터를 바탕으로, 최고 품질의 심층 분석 에디토리얼 리포트를 HTML로 제작하세요.

### 📋 작성 규칙 (반드시 준수):
1. **분량**: 전체 텍스트 분량은 **A4 4페이지 이상**의 압도적인 정보량을 제공해야 합니다. 피상적인 서술을 금지합니다.
2. **소제목**: 모든 소제목은 반드시 **'한글'**로만 작성하세요.
3. **명의**: 발행 명의는 오직 **'iM뱅크 AI 이코노미스트'**입니다.
4. **5대 필수 분석 레이어**:
   - [시장 상황 해설]: 지표 간 상관관계 분석.
   - [정치경제적 배경]: 국내외 정책, 입법, 지정학적 이슈의 배후 해설.
   - [한국 시장과 산업 영향]: 핵심 섹터별 파급 효과 및 실적 전망.
   - [투자자 가이드]: 주목할 기회와 유의해야 할 리스크 명시.
   - [실생활 영향]: 독자의 대출, 물가, 환율 등 생활 경제 연결.

### 🏗️ 레이아웃 구조 (이 순서대로 배치):
1. **Masthead**: 제목과 날짜({today_kr}) 명시.
2. **Navigation**: {nav_html} 삽입.
3. **Dashboard**: {db_html} 삽입.
4. **Editorial Lead**: 시장의 공기를 읽어주는 묵직한 서문.
5. **Section 01 & 02**: 심층 분석 내용.
6. **Game Widget**: {game_html} 삽입.
7. **Section 03, 04 & 05**: 나머지 심층 분석 내용.
8. **Navigation**: {nav_html} 하단에 한 번 더 삽입.

### 📊 데이터 및 뉴스:
- 데이터: {market_data}
- 뉴스: {news_list}

모든 CSS는 <style> 태그에 포함하고, 출력은 오직 `<!DOCTYPE html>`로 시작하는 완전한 HTML 코드여야 합니다.
"""
        response = self.model.generate_content(prompt)
        return response.text
