import os
import re
import glob
import json
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
    # 1. 마크다운 코드 블록 기호 전면 제거
    cleaned = text.replace("```html", "").replace("```", "").replace("'''html", "").replace("'''", "").strip()
    
    # 2. 실제 HTML 부분만 정밀 추출
    match = re.search(r'(<!DOCTYPE html>.*</html>)', cleaned, re.DOTALL | re.IGNORECASE)
    if match:
        html = match.group(1)
        # og:image URL 내의 공백 인코딩
        def encode_og_image(m):
            url = m.group(1)
            encoded_url = url.replace(" ", "%20")
            return f'property="og:image" content="{encoded_url}"'
        html = re.sub(r'property="og:image" content="(.*?)"', encode_og_image, html)
        return html
    return cleaned
def send_to_telegram(filename):
    """생성된 리포트의 URL만 텔레그램으로 전송합니다. (미리보기 활용)"""
    resume_time = datetime(2026, 4, 11, 23, 0) 
    if datetime.now() < resume_time: return

    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id: return

    # 오직 URL만 전송 (Link Preview가 모든 정보를 노출함)
    report_url = f"https://im-ai-market-report.vercel.app/reports/{filename}"

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        requests.post(url, data={
            'chat_id': chat_id, 
            'text': report_url, 
            'disable_web_page_preview': False # 미리보기 강제 활성화
        })
        print(f"✅ 텔레그램 리포트 URL 전송 완료! ({report_url})")
    except Exception as e: print(f"❌ 텔레그램 오류: {e}")


def update_portal(raw_data_dir, project_root):
    """리포트 목록을 스캔하여 고품질 포털 페이지를 생성합니다."""
    files = sorted(glob.glob(os.path.join(raw_data_dir, "morning_report_*.html")), reverse=True)
    if not files: return

    # 포털 저장 경로 설정 (public/reports/index.html)
    portal_dir = os.path.join(project_root, "public", "reports")
    if not os.path.exists(portal_dir): os.makedirs(portal_dir)
    portal_path = os.path.join(portal_dir, "index.html")

    # 최신 리포트 정보 추출
    latest_file = files[0]
    latest_filename = os.path.basename(latest_file)
    with open(latest_file, 'r', encoding='utf-8') as f:
        content = f.read()
        title_match = re.search(r'<h1 class="masthead-title">(.*?)</h1>', content)
        summary_match = re.search(r'<div class="summary-lead">(.*?)</div>', content, re.DOTALL)
        latest_title = title_match.group(1) if title_match else "최신 마켓 리포트"
        latest_summary = summary_match.group(1).strip() if summary_match else ""
        latest_summary = (latest_summary[:180] + "...") if len(latest_summary) > 180 else latest_summary

    # 아카이브 리스트 생성
    archive_items = []
    for f in files:
        fname = os.path.basename(f)
        date_match = re.search(r'(\d{4})(\d{2})(\d{2})', fname)
        if date_match:
            date_display = f"{date_match.group(1)}년 {date_match.group(2)}월 {date_match.group(3)}일"
            archive_items.append(f"""
                <a href="/reports/{fname}" class="archive-card">
                    <div class="archive-date">{date_display}</div>
                    <div class="archive-arrow">읽기 →</div>
                </a>
            """)

    portal_html = f"""
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>iM AI Market Report Portal</title>
    <style>
        :root {{ --im-navy: #2A3050; --im-gold: #C8940A; --bg: #F8F9FB; --text: #1A1A1A; }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Pretendard', -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }}
        .header {{ background: var(--im-navy); color: #fff; padding: 60px 30px 80px; text-align: center; position: relative; }}
        .header h1 {{ font-size: 28px; font-weight: 900; letter-spacing: -1px; }}
        .header p {{ font-size: 14px; opacity: 0.6; margin-top: 8px; font-family: Georgia, serif; font-style: italic; letter-spacing: 1px; }}
        .container {{ max-width: 640px; margin: -40px auto 60px; padding: 0 20px; }}
        .featured-card {{ background: #fff; border-radius: 4px; padding: 40px 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.05); border: 1px solid #eee; margin-bottom: 40px; }}
        .featured-label {{ color: var(--im-gold); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; display: block; }}
        .featured-title {{ font-size: 24px; font-weight: 800; color: var(--im-navy); line-height: 1.3; margin-bottom: 20px; letter-spacing: -1px; }}
        .featured-summary {{ font-size: 15px; color: #666; margin-bottom: 30px; line-height: 1.7; text-align: justify; }}
        .btn-main {{ display: block; background: var(--im-navy); color: #fff; padding: 18px; border-radius: 2px; text-decoration: none; font-weight: 800; font-size: 16px; text-align: center; transition: 0.3s; }}
        .btn-main:hover {{ background: #000; }}
        .section-title {{ font-size: 18px; font-weight: 800; color: var(--im-navy); margin-bottom: 20px; padding-left: 5px; border-left: 4px solid var(--im-gold); line-height: 1; }}
        .archive-list {{ display: grid; gap: 12px; }}
        .archive-card {{ 
            background: #fff; border: 1px solid #eee; padding: 20px 24px; border-radius: 4px; 
            display: flex; justify-content: space-between; align-items: center; 
            text-decoration: none; color: inherit; transition: 0.2s;
        }}
        .archive-card:hover {{ border-color: var(--im-gold); transform: translateX(5px); }}
        .archive-date {{ font-size: 16px; font-weight: 700; color: #444; }}
        .archive-arrow {{ font-size: 13px; font-weight: 800; color: var(--im-gold); }}
        footer {{ text-align: center; padding: 60px 20px; color: #bbb; font-size: 12px; border-top: 1px solid #eee; background: #fff; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>iM AI Market Report</h1>
        <p>AI FINANCIAL EDITION</p>
    </div>
    <div class="container">
        <div class="featured-card">
            <span class="featured-label">Latest Insights</span>
            <h2 class="featured-title">{latest_title}</h2>
            <p class="featured-summary">{latest_summary}</p>
            <a href="/reports/{latest_filename}" class="btn-main">지금 리포트 읽기</a>
        </div>
        <h3 class="section-title">리포트 아카이브</h3>
        <div class="archive-list">{"".join(archive_items)}</div>
    </div>
    <footer>&copy; {datetime.now().year} iM Bank AI Financial System. All rights reserved.</footer>
</body>
</html>
"""
    with open(portal_path, "w", encoding="utf-8") as f:
        f.write(portal_html)
    
    # JSON 목록 업데이트 (raw-data 폴더)
    report_names = [os.path.basename(f) for f in files]
    with open(os.path.join(raw_data_dir, "report_list.json"), "w", encoding="utf-8") as f:
        json.dump({"files": report_names}, f, ensure_ascii=False, indent=2)
    print(f"✅ 포털 및 리스트 갱신 완료: {portal_path}")

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--force-open', action='store_true')
    args = parser.parse_args()
    is_open = True if args.force_open else is_krx_open_today()
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    raw_data_dir = os.path.join(project_root, "public", "raw-data")
    if not os.path.exists(raw_data_dir): os.makedirs(raw_data_dir)
    print(f"🚀 리포트 생성 중 (KRX 개장: {is_open})...")
    collector = DataCollector()
    market_data = collector.get_market_data()
    news_list = collector.get_latest_news(limit=10)
    if not market_data: return
    try:
        generator = ReportGenerator()
        raw_report = generator.generate_report(market_data, news_list, is_krx_open=is_open)
        html_report = clean_html_response(raw_report)
        # 날짜별 유니크한 파일명 (중복 방지)
        date_str = datetime.now().strftime("%Y%m%d")
        filename = f"morning_report_{date_str}.html"
        output_file = os.path.join(raw_data_dir, filename)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html_report)
        send_to_telegram(filename)
        update_portal(raw_data_dir, project_root)
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    main()
