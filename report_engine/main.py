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
    import urllib.parse
    # 1. 실제 HTML 구조만 정밀 추출
    match = re.search(r'(<!DOCTYPE html>.*</html>)', text, re.DOTALL | re.IGNORECASE)
    if match:
        html = match.group(1)
        # 2. 마크다운 코드 블록 기호 제거
        html = html.replace("```html", "").replace("```", "").replace("'''html", "").replace("'''", "").strip()

        # 3. og:image URL 내의 특수문자 및 공백을 완벽하게 인코딩 (urllib.parse.quote 활용)
        def encode_og_image(m):
            full_url = m.group(1)
            # URL을 베이스와 쿼리 파라미터로 분리하여 파라미터만 인코딩
            if '?' in full_url:
                base, query = full_url.split('?', 1)
                # 쿼리 스트링의 파라미터값들을 안전하게 인코딩
                params = urllib.parse.parse_qsl(query)
                encoded_query = urllib.parse.urlencode(params)
                encoded_url = f"{base}?{encoded_query}"
                return f'property="og:image" content="{encoded_url}"'
            return m.group(0)

        html = re.sub(r'property="og:image" content="(.*?)"', encode_og_image, html)
        return html
    return text.replace("```html", "").replace("```", "").strip()


def send_to_telegram(filename):
    """🚫 사용자 지시에 따라 텔레그램 전송 기능을 완전히 차단했습니다. 
    별도의 재개 지시가 있을 때까지 이 함수는 아무 동작도 하지 않습니다.
    """
    print(f"🔇 [TELEGRAM BLOCKED] 전송 시도 건너뜀: {filename}")
    return


def update_all_report_links(raw_data_dir):
    """모든 리포트 파일의 내비게이션 링크를 실제 경로로 직접 박아넣습니다."""
    files = sorted(glob.glob(os.path.join(raw_data_dir, "morning_report_*.html")), reverse=True)
    report_ids = [os.path.basename(f).replace(".html", "") for f in files]
    
    print(f"🔄 총 {len(report_ids)}개 리포트의 내비게이션 링크를 최신화합니다...")
    
    for i, report_id in enumerate(report_ids):
        file_path = os.path.join(raw_data_dir, f"{report_id}.html")
        prev_id = report_ids[i+1] if i < len(report_ids) - 1 else None
        next_id = report_ids[i-1] if i > 0 else None
        
        prev_link = f"/reports/{prev_id}" if prev_id else "#"
        next_link = f"/reports/{next_id}" if next_id else "#"
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 기존 템플릿 치환자 또는 이미 박힌 링크를 최신화
        # 1. 이전 리포트 링크 치환
        content = re.sub(r'href="\{\{\s*prev_link\s*\}\}"', f'href="{prev_link}"', content)
        content = re.sub(r'href="/reports/morning_report_[0-9]+"', f'href="{prev_link}"', content, count=1) # 상단 nav
        
        # 2. 다음 리포트 링크 치환
        content = re.sub(r'href="\{\{\s*next_link\s*\}\}"', f'href="{next_link}"', content)
        # (주의: regex 순서에 따라 덮어쓰기 위험이 있으므로 정교하게 처리 필요)
        # 가장 깔끔한 방법은 generator가 생성한 nav 구조를 통째로 다시 쓰는 것
        
        # 이전/다음 텍스트가 포함된 nav 태그를 찾아 직접 교체
        def replace_nav(m):
            nav_html = f"""<nav class="report-nav">
    <a href="{prev_link}" class="nav-link">{"← 이전 리포트" if prev_id else ""}</a>
    <a href="/reports/index.html" class="nav-list-btn">목록으로</a>
    <a href="{next_link}" class="nav-link">{"다음 리포트 →" if next_id else ""}</a>
</nav>"""
            return nav_html

        content = re.sub(r'<nav class="report-nav">.*?</nav>', replace_nav, content, flags=re.DOTALL)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

def update_portal(raw_data_dir, project_root):
    """리포트 목록을 스캔하여 고품질 포털 페이지를 생성합니다."""
    files = sorted(glob.glob(os.path.join(raw_data_dir, "morning_report_*.html")), reverse=True)
    if not files: return

    portal_dir = os.path.join(project_root, "public", "reports")
    if not os.path.exists(portal_dir): os.makedirs(portal_dir)
    portal_path = os.path.join(portal_dir, "index.html")

    latest_file = files[0]
    latest_id = os.path.basename(latest_file).replace(".html", "")
    
    with open(latest_file, 'r', encoding='utf-8') as f:
        content = f.read()
        title_match = re.search(r'<h1 class="masthead-title">(.*?)</h1>', content)
        summary_match = re.search(r'<div class="summary-lead">(.*?)</div>', content, re.DOTALL)
        latest_title = title_match.group(1) if title_match else "최신 마켓 리포트"
        latest_summary = summary_match.group(1).strip() if summary_match else ""
        latest_summary = (latest_summary[:180] + "...") if len(latest_summary) > 180 else latest_summary

    archive_items = []
    for f in files:
        fname = os.path.basename(f)
        report_id = fname.replace(".html", "")
        date_match = re.search(r'(\d{4})(\d{2})(\d{2})', fname)
        if date_match:
            date_display = f"{date_match.group(1)}년 {date_match.group(2)}월 {date_match.group(3)}일"
            archive_items.append(f'<a href="/reports/{report_id}" class="archive-card"><div class="archive-date">{date_display}</div><div class="archive-arrow">읽기 →</div></a>')

    portal_html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>iM AI Market Report Portal</title>
    <style>
        :root {{ --im-navy: #2A3050; --im-gold: #C8940A; --bg: #F8F9FB; --text: #1A1A1A; }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Pretendard', -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }}
        .header {{ background: var(--im-navy); color: #fff; padding: 60px 30px 80px; text-align: center; }}
        .header h1 {{ font-size: 28px; font-weight: 900; letter-spacing: -1px; }}
        .header p {{ font-size: 14px; opacity: 0.6; margin-top: 8px; font-family: Georgia, serif; font-style: italic; letter-spacing: 1px; }}
        .container {{ max-width: 640px; margin: -40px auto 60px; padding: 0 20px; }}
        .featured-card {{ background: #fff; border-radius: 4px; padding: 40px 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.05); border: 1px solid #eee; margin-bottom: 40px; }}
        .featured-label {{ color: var(--im-gold); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; display: block; }}
        .featured-title {{ font-size: 24px; font-weight: 800; color: var(--im-navy); line-height: 1.3; margin-bottom: 20px; letter-spacing: -1px; }}
        .featured-summary {{ font-size: 15px; color: #666; margin-bottom: 30px; line-height: 1.7; }}
        .btn-main {{ display: block; background: var(--im-navy); color: #fff; padding: 18px; border-radius: 2px; text-decoration: none; font-weight: 800; font-size: 16px; text-align: center; }}
        .btn-main:hover {{ background: #000; }}
        .section-title {{ font-size: 18px; font-weight: 800; color: var(--im-navy); margin-bottom: 20px; padding-left: 5px; border-left: 4px solid var(--im-gold); line-height: 1; }}
        .archive-list {{ display: grid; gap: 12px; }}
        .archive-card {{ background: #fff; border: 1px solid #eee; padding: 20px 24px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; text-decoration: none; color: inherit; transition: 0.2s; }}
        .archive-card:hover {{ border-color: var(--im-gold); transform: translateX(5px); }}
        .archive-date {{ font-size: 16px; font-weight: 700; color: #444; }}
        .archive-arrow {{ font-size: 13px; font-weight: 800; color: var(--im-gold); }}
        footer {{ text-align: center; padding: 60px 20px; color: #bbb; font-size: 12px; border-top: 1px solid #eee; background: #fff; }}
    </style>
</head>
<body>
    <div class="header"><h1>iM AI Market Report</h1><p>AI FINANCIAL EDITION</p></div>
    <div class="container">
        <div class="featured-card">
            <span class="featured-label">Latest Insights</span>
            <h2 class="featured-title">{latest_title}</h2>
            <p class="featured-summary">{latest_summary}</p>
            <a href="/reports/{latest_id}" class="btn-main">지금 리포트 읽기</a>
        </div>
        <h3 class="section-title">리포트 아카이브</h3>
        <div class="archive-list">{"".join(archive_items)}</div>
    </div>
    <footer>&copy; {datetime.now().year} iM Bank AI Financial System. All rights reserved.</footer>
</body>
</html>"""
    with open(portal_path, "w", encoding="utf-8") as f: f.write(portal_html)
    
    # 모든 리포트의 내비게이션 링크 강제 업데이트 (치환 방식)
    update_all_report_links(raw_data_dir)
    
    # JSON 목록 업데이트 (확장자 제거된 ID 리스트)
    report_ids = [os.path.basename(f).replace(".html", "") for f in files]
    with open(os.path.join(raw_data_dir, "report_list.json"), "w", encoding="utf-8") as f:
        json.dump({"files": report_ids}, f, ensure_ascii=False, indent=2)
    print(f"✅ 포털 및 전체 리포트 링크 갱신 완료!")

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

        # [수정] 항상 한국 시간(KST) 기준으로 날짜 계산
        kst_now = pd.Timestamp.now(tz='Asia/Seoul')
        date_str = kst_now.strftime("%Y%m%d")

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
