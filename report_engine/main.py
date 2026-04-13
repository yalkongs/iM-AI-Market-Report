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

# 🎯 2026년 시점 기준값 (팩트 기준)
BASE_PRICES = {
    "KOSPI": 5609.95,
    "NASDAQ": 22902.89,
    "S&P 500": 6816.89
}

def is_krx_open():
    try:
        krx = mcal.get_calendar('XKRX')
        today = pd.Timestamp.now(tz='Asia/Seoul').normalize()
        return not krx.schedule(start_date=today, end_date=today).empty
    except: return True

def clean_html(text):
    match = re.search(r'(<!DOCTYPE html>.*?</html>)', text, re.DOTALL | re.IGNORECASE)
    if match:
        html = match.group(1)
        html = html.replace("```html", "").replace("```", "").strip()
        return html
    return text.strip()

def update_links_and_portal(raw_data_dir, project_root):
    files = sorted(glob.glob(os.path.join(raw_data_dir, "morning_report_*.html")), reverse=True)
    report_ids = [os.path.basename(f).replace(".html", "") for f in files]
    
    # 1. 포털 생성
    portal_path = os.path.join(project_root, "public", "reports", "index.html")
    latest_id = report_ids[0]
    archive_html = "".join([f'<a href="/reports/{rid}" class="archive-card">{rid[15:19]}-{rid[19:21]}-{rid[21:23]} 리포트</a>' for rid in report_ids])
    
    portal_html = f"<!DOCTYPE html><html><body><h1>iM AI Market Report Portal</h1><div class='latest'><a href='/reports/{latest_id}'>최신 리포트 읽기</a></div><div class='list'>{archive_html}</div></body></html>"
    with open(portal_path, "w", encoding="utf-8") as f: f.write(portal_html)

    # 2. 링크 업데이트 (정적 링크 삽입)
    for i, rid in enumerate(report_ids):
        p_id = report_ids[i+1] if i < len(report_ids) - 1 else None
        n_id = report_ids[i-1] if i > 0 else None
        p_link = f"/reports/{p_id}" if p_id else "#"
        n_link = f"/reports/{n_id}" if n_id else "#"
        
        f_path = os.path.join(raw_data_dir, f"{rid}.html")
        with open(f_path, 'r', encoding='utf-8') as f: content = f.read()
        
        nav_html = f'<nav class="report-nav"><a href="{p_link}">이전</a><a href="/reports/index.html">목록</a><a href="{n_link}">다음</a></nav>'
        content = re.sub(r'<nav class="report-nav">.*?</nav>', nav_html, content, flags=re.DOTALL)
        with open(f_path, 'w', encoding='utf-8') as f: f.write(content)

def main():
    collector = DataCollector()
    raw_data = collector.fetch_market_data()
    
    # 수학적 보정: (2026 기준가) * (1 + 실제 등락률)
    market_data = {}
    for name, base in BASE_PRICES.items():
        pct = raw_data.get(name, {"pct": 0})["pct"]
        market_data[name] = {"price": round(base * (1 + pct/100), 2), "pct": pct}
    
    news = collector.fetch_news()
    
    try:
        gen = ReportGenerator()
        html = gen.generate_report(market_data, news, is_krx_open=is_krx_open())
        html = clean_html(html)
        
        kst_date = pd.Timestamp.now(tz='Asia/Seoul').strftime("%Y%m%d")
        raw_dir = "public/raw-data"
        if not os.path.exists(raw_dir): os.makedirs(raw_dir)
        
        with open(os.path.join(raw_dir, f"morning_report_{kst_date}.html"), "w", encoding="utf-8") as f:
            f.write(html)
        
        update_links_and_portal(raw_dir, ".")
        print(f"✅ 리포트 생성 완료: {kst_date}")
    except Exception as e: print(f"❌ 에러: {e}")

if __name__ == "__main__":
    main()
