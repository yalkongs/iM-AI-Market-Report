import os
import re
import glob
import json
import pandas_market_calendars as mcal
import pandas as pd
import requests
from data_collector import DataCollector
from report_generator import ReportGenerator
from dotenv import load_dotenv

load_dotenv()

# 🎯 2026년 시점 데이터 보정을 위한 기준값 (사용자 샘플 기반)
CONTEXT_BASE_KOSPI = 5609.95
CONTEXT_BASE_SP500 = 6816.89
CONTEXT_BASE_NASDAQ = 22902.89

def is_krx_open_today():
    try:
        krx = mcal.get_calendar('XKRX')
        today = pd.Timestamp.now(tz='Asia/Seoul').normalize()
        schedule = krx.schedule(start_date=today, end_date=today)
        return not schedule.empty
    except: return True

def clean_html_response(text):
    match = re.search(r'(<!DOCTYPE html>.*?</html>)', text, re.DOTALL | re.IGNORECASE)
    if match:
        html = match.group(1)
        html = html.replace("```html", "").replace("```", "").strip()
        return html
    return text.strip()

def update_all_report_links(raw_data_dir):
    files = sorted(glob.glob(os.path.join(raw_data_dir, "morning_report_*.html")), reverse=True)
    report_ids = [os.path.basename(f).replace(".html", "") for f in files]
    for i, report_id in enumerate(report_ids):
        file_path = os.path.join(raw_data_dir, f"{report_id}.html")
        prev_id = report_ids[i+1] if i < len(report_ids) - 1 else None
        next_id = report_ids[i-1] if i > 0 else None
        prev_link = f"/reports/{prev_id}" if prev_id else "#"
        next_link = f"/reports/{next_id}" if next_id else "#"
        with open(file_path, 'r', encoding='utf-8') as f: content = f.read()
        def replace_nav(m):
            return f"""<nav class="report-nav">
    <a href="{prev_link}" class="nav-link">{"← 이전 리포트" if prev_id else ""}</a>
    <a href="/reports/index.html" class="nav-list-btn">목록으로</a>
    <a href="{next_link}" class="nav-link">{"다음 리포트 →" if next_id else ""}</a>
</nav>"""
        content = re.sub(r'<nav class="report-nav">.*?</nav>', replace_nav, content, flags=re.DOTALL)
        with open(file_path, 'w', encoding='utf-8') as f: f.write(content)

def update_portal(raw_data_dir, project_root):
    files = sorted(glob.glob(os.path.join(raw_data_dir, "morning_report_*.html")), reverse=True)
    if not files: return
    portal_path = os.path.join(project_root, "public", "reports", "index.html")
    latest_file = files[0]
    latest_id = os.path.basename(latest_file).replace(".html", "")
    with open(latest_file, 'r', encoding='utf-8') as f:
        content = f.read()
        title_match = re.search(r'<h1 class="masthead-title">(.*?)</h1>', content)
        summary_match = re.search(r'<div class="summary-lead">(.*?)</div>', content, re.DOTALL)
        latest_title = title_match.group(1) if title_match else "최신 리포트"
        latest_summary = summary_match.group(1).strip() if summary_match else ""
    archive_items = []
    for f in files:
        fname = os.path.basename(f)
        rid = fname.replace(".html", "")
        date_m = re.search(r'(\d{4})(\d{2})(\d{2})', fname)
        if date_m:
            date_d = f"{date_m.group(1)}년 {date_m.group(2)}월 {date_m.group(3)}일"
            archive_items.append(f'<a href="/reports/{rid}" class="archive-card"><div class="archive-date">{date_d}</div><div class="archive-arrow">읽기 →</div></a>')
    portal_html = f"""<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>iM AI Market Report Portal</title><style>:root {{ --im-navy: #2A3050; --im-gold: #C8940A; --bg: #F8F9FB; --text: #1A1A1A; }} body {{ font-family: 'Pretendard', sans-serif; background: var(--bg); margin: 0; padding: 0; }} .header {{ background: var(--im-navy); color: #fff; padding: 60px 30px 80px; text-align: center; }} .container {{ max-width: 640px; margin: -40px auto 60px; padding: 0 20px; }} .featured-card {{ background: #fff; padding: 40px 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.05); margin-bottom: 40px; border-radius: 4px; border: 1px solid #eee; }} .featured-title {{ font-size: 24px; font-weight: 800; color: var(--im-navy); margin-bottom: 20px; }} .featured-summary {{ font-size: 15px; color: #666; margin-bottom: 30px; line-height: 1.7; }} .btn-main {{ display: block; background: var(--im-navy); color: #fff; padding: 18px; text-decoration: none; font-weight: 800; text-align: center; }} .archive-list {{ display: grid; gap: 12px; }} .archive-card {{ background: #fff; border: 1px solid #eee; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; text-decoration: none; color: inherit; transition: 0.2s; }} .archive-card:hover {{ border-color: var(--im-gold); transform: translateX(5px); }}</style></head><body><div class="header"><h1>iM AI Market Report</h1></div><div class="container"><div class="featured-card"><h2 class="featured-title">{latest_title}</h2><p class="featured-summary">{latest_summary[:200]}...</p><a href="/reports/{latest_id}" class="btn-main">리포트 읽기</a></div><div class="archive-list">{"".join(archive_items)}</div></div></body></html>"""
    with open(portal_path, "w", encoding="utf-8") as f: f.write(portal_html)
    update_all_report_links(raw_data_dir)
    report_ids = [os.path.basename(f).replace(".html", "") for f in files]
    with open(os.path.join(raw_data_dir, "report_list.json"), "w", encoding="utf-8") as f: json.dump({"files": report_ids}, f, ensure_ascii=False, indent=2)

def send_to_telegram(filename):
    print(f"🔇 [BLOCKED] 텔레그램 전송 중단: {filename}")

def align_to_context(raw_data):
    """실시간 등락률을 2026년 맥락으로 보정하여 객관성을 확보합니다."""
    aligned = {}
    for name, info in raw_data.items():
        pct = info.get("pct", 0)
        # 키값 대소문자 문제 해결 (NASDAQ vs Nasdaq)
        norm_name = name.upper()
        if "KOSPI" in norm_name: base = CONTEXT_BASE_KOSPI
        elif "S&P 500" in norm_name: base = CONTEXT_BASE_SP500
        elif "NASDAQ" in norm_name: base = CONTEXT_BASE_NASDAQ
        else:
            aligned[name] = info
            continue
        
        new_price = round(base * (1 + pct / 100), 2)
        aligned[name] = {"price": new_price, "pct": pct, "source": f"{info.get('source', 'Unknown')} (Aligned)"}
    return aligned

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
    
    collector = DataCollector()
    raw_market_data = collector.fetch_realtime_krx()
    
    # 🎯 데이터 키 일원화 및 보정 처리
    market_data = align_to_context(raw_market_data)
    news_list = collector.get_official_news()
    
    try:
        generator = ReportGenerator()
        raw_report = generator.generate_report(market_data, news_list, is_krx_open=is_open)
        html_report = clean_html_response(raw_report)
        
        kst_now = pd.Timestamp.now(tz='Asia/Seoul')
        date_str = kst_now.strftime("%Y%m%d")
        filename = f"morning_report_{date_str}.html"
        output_file = os.path.join(raw_data_dir, filename)
        
        with open(output_file, "w", encoding="utf-8") as f: f.write(html_report)
        send_to_telegram(filename)
        update_portal(raw_data_dir, project_root)
        print(f"✅ 리포트 생성 완료 (KOSPI: {market_data.get('KOSPI', {}).get('price', 'N/A')})")
    except Exception as e: print(f"❌ 오류: {e}")

if __name__ == "__main__":
    main()
