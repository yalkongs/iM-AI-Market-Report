import os
import re
import glob
from datetime import datetime
import pandas_market_calendars as mcal
import pandas as pd
import requests
from data_collector import DataCollector
from report_generator import ReportGenerator
from dotenv import load_dotenv

load_dotenv()

def is_krx_open_today():
    try:
        krx = mcal.get_calendar('XKRX')
        today = pd.Timestamp.now(tz='Asia/Seoul').normalize()
        schedule = krx.schedule(start_date=today, end_date=today)
        return not schedule.empty
    except Exception as e:
        print(f"⚠️ 휴장일 판별 오류: {e}")
        return True

def clean_html_response(text):
    match = re.search(r'<!DOCTYPE html>.*</html>', text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(0)
    return text.replace("```html", "").replace("```", "").strip()

def send_to_telegram(file_path):
    resume_time = datetime(2026, 4, 12, 21, 0) 
    if datetime.now() < resume_time:
        print(f"🔇 테스트 기간 텔레그램 전송 중단 중")
        return
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id: return
    url = f"https://api.telegram.org/bot{token}/sendDocument"
    caption = (
        f"🌅 iM뱅크 모닝 마켓 리포트 ({datetime.now().strftime('%Y-%m-%d')})\n\n"
        f"🎯 오늘의 KOSPI는 오를까요, 내릴까요?\n"
        f"👉 https://updown-kospi.vercel.app"
    )
    try:
        with open(file_path, 'rb') as f:
            requests.post(url, data={'chat_id': chat_id, 'caption': caption}, files={'document': f})
    except Exception as e: print(f"❌ 텔레그램 오류: {e}")

def update_portal():
    """public/reports 폴더를 스캔하여 리포트 포털(index.html)을 생성합니다."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)
        output_dir = os.path.join(project_root, "public", "reports")
    if not os.path.exists(output_dir): os.makedirs(output_dir)
    
    files = glob.glob(os.path.join(output_dir, "morning_report_*.html"))
    files.sort(reverse=True) 

    latest_report = files[0] if files else None
    latest_filename = os.path.basename(latest_report) if latest_report else ""

    file_links = {}
    for f in files:
        match = re.search(r'(\d{8})', f)
        if match:
            date_str = match.group(1)
            file_links[date_str] = os.path.basename(f)

    portal_html = f"""
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>iM AI Market Report Archive</title>
    <style>
        :root {{ --navy: #2A3050; --gold: #C8940A; --bg: #F5F7F9; --text: #1A1A1A; }}
        body {{ font-family: 'Pretendard', sans-serif; background: var(--bg); margin: 0; color: var(--text); }}
        .header {{ background: var(--navy); color: #fff; padding: 40px 20px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 24px; letter-spacing: -1px; }}
        .header p {{ font-size: 14px; opacity: 0.7; margin-top: 10px; }}
        .container {{ max-width: 800px; margin: -30px auto 40px; padding: 0 20px; }}
        .hero-card {{ background: #fff; border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); margin-bottom: 30px; text-align: center; border: 1px solid #eee; }}
        .hero-tag {{ color: var(--gold); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; display: block; }}
        .hero-title {{ font-size: 22px; font-weight: 800; margin-bottom: 20px; line-height: 1.4; }}
        .btn {{ display: inline-block; background: var(--navy); color: #fff; padding: 12px 30px; border-radius: 30px; text-decoration: none; font-weight: 700; font-size: 15px; transition: 0.3s; }}
        .btn:hover {{ background: var(--gold); transform: translateY(-2px); }}
        .calendar-card {{ background: #fff; border-radius: 20px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); border: 1px solid #eee; }}
        .calendar-title {{ font-size: 18px; font-weight: 800; margin-bottom: 20px; color: var(--navy); }}
        .report-list {{ list-style: none; padding: 0; }}
        .report-item {{ border-bottom: 1px solid #f0f0f0; padding: 15px 0; display: flex; justify-content: space-between; align-items: center; }}
        .report-item:last-child {{ border-bottom: none; }}
        .report-date {{ font-weight: 700; color: #555; }}
        .report-link {{ color: var(--navy); text-decoration: none; font-size: 14px; font-weight: 600; border: 1px solid var(--navy); padding: 4px 12px; border-radius: 15px; }}
        .report-link:hover {{ background: var(--navy); color: #fff; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>iM AI Market Report</h1>
        <p>AI가 분석하는 가장 권위 있는 모닝 브리핑</p>
    </div>
    <div class="container">
        <div class="hero-card">
            <span class="hero-tag">Latest Update</span>
            <div class="hero-title">가장 최신 리포트가 발행되었습니다</div>
            <a href="{latest_filename}" class="btn">지금 읽기</a>
        </div>
        <div class="calendar-card">
            <div class="calendar-title">리포트 아카이브</div>
            <ul class="report-list">
                {"".join([f'<li class="report-item"><span class="report-date">{d[:4]}-{d[4:6]}-{d[6:8]}</span><a href="{file_links[d]}" class="report-link">보기</a></li>' for d in sorted(file_links.keys(), reverse=True)])}
            </ul>
        </div>
    </div>
    <footer style="text-align: center; padding: 40px; color: #aaa; font-size: 12px;">
        &copy; {datetime.now().year} iM Bank AI Report System. All rights reserved.
    </footer>
</body>
</html>
"""
    with open(os.path.join(output_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(portal_html)
    print("✅ 리포트 포털(public/reports/index.html) 업데이트 완료!")

def main():
    print(f"🕒 실행 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    is_open = is_krx_open_today()
    print("🚀 [1/3] 데이터 수집 및 분석 중...")
    collector = DataCollector()
    market_data = collector.get_market_data()
    news_list = collector.get_latest_news(limit=10)
    if not market_data: return
    print(f"🤖 [2/3] AI 리포트 생성 중...")
    try:
        generator = ReportGenerator()
        raw_report = generator.generate_report(market_data, news_list, is_krx_open=is_open)
        html_report = clean_html_response(raw_report)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)
        output_dir = os.path.join(project_root, "public", "reports")
        if not os.path.exists(output_dir): os.makedirs(output_dir)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        filename = f"morning_report_{timestamp}.html"
        output_file = os.path.join(output_dir, filename)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html_report)
        send_to_telegram(output_file)
        print("🌐 [3/3] 메인 포털 업데이트 중...")
        update_portal()
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    main()
