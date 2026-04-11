from google import genai
import os
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
        
        if sp500_pct > 0.3:
            return "bull"
        elif sp500_pct < -0.3:
            return "bear"
        else:
            return "neutral"

    def generate_report(self, market_data, news_list, is_krx_open=True):
        now = datetime.now()
        today_str = now.strftime("%Y년 %m월 %d일")
        issue_time = now.strftime("%H:%M AM KST")
        
        sentiment = self.get_market_sentiment(market_data)
        
        themes = {
            "bull": {
                "header_grad": "linear-gradient(135deg, #8B1A20 0%, #C8940A 100%)",
                "accent": "#8B1A20",
                "footer": "#FDF5E6",
                "tag_bg": "rgba(255,255,255,0.2)"
            },
            "bear": {
                "header_grad": "linear-gradient(135deg, #0D3050 0%, #1565C0 100%)",
                "accent": "#1565C0",
                "footer": "#E8F0FB",
                "tag_bg": "rgba(255,255,255,0.2)"
            },
            "neutral": {
                "header_grad": "linear-gradient(135deg, #2A3050 0%, #3A4568 100%)",
                "accent": "#2A3050",
                "footer": "#F4F5F8",
                "tag_bg": "rgba(255,255,255,0.15)"
            }
        }
        
        t = themes[sentiment]
        
        css_framework = f"""
<style>
:root {{
  --primary: {t['accent']};
  --bg: #FFFFFF;
  --body-bg: #F9FAFB;
  --text: #111111;
  --muted: #6B7280;
  --border: #E5E7EB;
  --gold: #C8940A;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ 
  font-family: 'Pretendard', -apple-system, sans-serif; 
  background: var(--body-bg); color: var(--text); line-height: 1.85; 
  -webkit-font-smoothing: antialiased; word-break: keep-all; 
}}
.wrap {{ width: 100%; max-width: 720px; margin: 0 auto; background: var(--bg); min-height: 100vh; position: relative; }}

.magazine-header {{ 
  background: {t['header_grad']}; 
  padding: 80px 50px 60px; color: #fff; position: relative; 
}}
.mag-brand-row {{ display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; }}
.mag-logo {{ font-size: 20px; font-weight: 900; letter-spacing: -1px; }}
.mag-issue-tag {{ 
  font-family: Georgia, serif; font-size: 11px; font-style: italic; letter-spacing: 2px; 
  background: {t['tag_bg']}; padding: 4px 12px; border-radius: 20px; 
}}
.mag-title {{ font-size: 38px; font-weight: 800; line-height: 1.2; letter-spacing: -2px; margin-bottom: 30px; }}
.mag-meta {{ font-size: 13px; color: rgba(255,255,255,0.7); display: flex; gap: 15px; }}

.mag-data-strip {{ 
  display: grid; grid-template-columns: repeat(3, 1fr); 
  background: #fff; border-bottom: 1px solid var(--border); margin-top: -1px; 
}}
.data-box {{ padding: 25px 20px; text-align: center; border-right: 1px solid var(--border); }}
.data-box:last-child {{ border-right: none; }}
.data-label {{ font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; display: block; }}
.data-val {{ font-size: 20px; font-weight: 800; color: var(--primary); }}

.editorial-lead {{ padding: 60px 50px 40px; border-bottom: 1px solid var(--border); }}
.lead-text {{ font-size: 18px; font-weight: 500; color: #374151; line-height: 1.75; position: relative; font-style: italic; }}
.lead-text::before {{ content: '"'; position: absolute; left: -30px; font-family: Georgia, serif; font-size: 60px; color: var(--border); top: -20px; }}

.mag-section {{ padding: 60px 50px; border-bottom: 1px solid var(--border); }}
.mag-section-num {{ font-family: Georgia, serif; font-size: 14px; font-weight: 700; color: var(--gold); display: block; margin-bottom: 15px; letter-spacing: 2px; }}
.mag-section-title {{ font-size: 28px; font-weight: 800; color: var(--primary); margin-bottom: 35px; letter-spacing: -1px; }}
.mag-content {{ font-size: 17px; color: #1F2937; text-align: justify; }}
.mag-content p {{ margin-bottom: 25px; }}

.mag-callout {{ 
  background: #F9FAFB; padding: 35px; margin: 40px 0; border-left: 4px solid var(--primary); 
  font-size: 15.5px; font-weight: 600; color: var(--primary); line-height: 1.7; 
}}
.mag-pull-quote {{ 
  font-family: Georgia, serif; font-size: 24px; font-style: italic; color: var(--gold); 
  text-align: center; padding: 50px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin: 50px 0; line-height: 1.5; 
}}

.magazine-footer {{ 
  background: {t['footer']}; padding: 80px 50px 60px; border-top: 1px solid var(--border); 
}}
.footer-top {{ margin-bottom: 40px; }}
.footer-logo {{ font-size: 22px; font-weight: 900; color: var(--primary); margin-bottom: 15px; display: block; }}
.disclaimer-box {{ 
  background: #fff; padding: 25px; border: 1px solid var(--border); font-size: 12px; color: var(--muted); line-height: 1.8; 
}}

.up {{ color: #EF4444; }}
.down {{ color: #3B82F6; }}

@media (max-width: 640px) {{
  .magazine-header, .mag-section, .magazine-footer, .editorial-lead {{ padding: 40px 24px; }}
  .mag-title {{ font-size: 30px; }}
  .mag-section-title {{ font-size: 24px; }}
}}
</style>
"""

        krx_context = ""
        if is_krx_open:
            krx_context = "오늘은 한국 증시가 개장하는 영업일입니다. 밤사이 뉴욕의 소식이 오늘 아침 9시 코스피/코스닥의 개장가와 장중 흐름에 어떤 변곡점이 될지 심층 분석하세요."
        else:
            krx_context = "오늘은 한국 증시 휴장일입니다. 글로벌 시장의 거시적 흐름을 정리하고 다음 개장일을 위한 체력 점검과 중장기 전략에 집중하세요."

        prompt = f"""
당신은 iM뱅크의 금융 분석 시스템을 총괄하는 편집장입니다. 
밤사이 글로벌 시장 데이터를 바탕으로, **iM뱅크에서 발행하는 고품질 웹 매거진 형식의 리포트**를 HTML로 제작해 주세요.

### 📅 오늘의 리포트 정보:
- 발행일시: {today_str} {issue_time}
- KRX 개장 여부: {"영업일" if is_krx_open else "휴장일"}
- 시장 심리 테마: {sentiment.upper()}
- 데이터: {market_data}
- 뉴스: {news_list}

---

### ✍️ 에디토리얼 작성 지침 (정체성 및 스타일):

1. **주체 명시 지침 (중요)**:
   - 가상의 인물(예: 김현준 등)이나 실재하지 않는 매체 명칭(예: iM 매거진 등)을 절대 사용하지 마세요.
   - 발행 주체는 오직 **'iM뱅크'**로 통일하세요.
   - 본 리포트가 iM뱅크의 AI 기술을 통해 생성되었음을 자연스럽게 명시하세요.

2. **에스테틱 & 분량**:
   - 블로그 스타일을 지양하고, 전문 경제 잡지 내지와 같은 고급스러운 레이아웃을 구성하세요.
   - 충분한 분석 분량(A4 3페이지 이상)을 유지하며 우아한 문체를 사용하세요.
   - `mag-pull-quote`, `mag-callout` 등을 적재적소에 배치하세요.

3. **내용 위계**:
   - **Editorial Lead**: 시장의 흐름을 통찰하는 시적인 서문으로 시작하세요.
   - **Deep Dive Chapters**: 최소 4~5개의 주제별 심층 분석을 수행하세요. {krx_context}
   - **전문성**: 구체적인 하드 데이터(bp, VIX 등)를 정확히 명시하세요.

4. **시각적 제약**:
   - 픽토그램, 이모지 절대 금지. 오직 폰트(Georgia/Pretendard)와 테마 색상으로만 품격을 표현하세요.
   - 강조는 HTML `<strong>` 태그만 사용하며, 마크다운 기호(`**`)는 절대 금지합니다.

출력은 반드시 `<!DOCTYPE html>`로 시작하는 완전한 HTML 코드여야 합니다.
"""

        response = self.client.models.generate_content(
            model=self.model_id,
            contents=prompt
        )
        return response.text
