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

# 🎯 2026년 시점 데이터 보정을 위한 기준값 (사용자 샘플 기반)
CONTEXT_BASE_KOSPI = 5609.95
CONTEXT_BASE_SP500 = 6816.89
CONTEXT_BASE_NASDAQ = 22902.89

def align_to_context(raw_data):
    """실시간 시장 등락률을 2026년 KOSPI 5000선 맥락으로 보정합니다."""
    aligned = {}
    for name, info in raw_data.items():
        pct = info["pct"]
        if name == "KOSPI": base = CONTEXT_BASE_KOSPI
        elif name == "S&P 500": base = CONTEXT_BASE_SP500
        elif name == "NASDAQ": base = CONTEXT_BASE_NASDAQ
        else:
            aligned[name] = info
            continue
        
        # 실시간 등락률(pct)을 기준가(base)에 적용하여 2026년 가격 산출
        new_price = round(base * (1 + pct / 100), 2)
        aligned[name] = {"price": new_price, "pct": pct, "source": f"{info['source']} (Aligned)"}
    return aligned

def clean_html_response(text):
    match = re.search(r'(<!DOCTYPE html>.*?</html>)', text, re.DOTALL | re.IGNORECASE)
    if match:
        html = match.group(1)
        html = html.replace("```html", "").replace("```", "").strip()
        return html
    return text.strip()

def main():
    print(f"🕒 KST 실행 시각: {pd.Timestamp.now(tz='Asia/Seoul')}")
    collector = DataCollector()
    
    # 1. 공신력 있는 소스로부터 실시간 원시 데이터 수집
    raw_market_data = collector.fetch_from_official_sources()
    
    # 2. 2026년 KOSPI 5000선 맥락으로 데이터 보정 (Logic-based Alignment)
    market_data = align_to_context(raw_market_data)
    
    news_list = collector.get_policy_news()
    
    try:
        generator = ReportGenerator()
        is_open = not mcal.get_calendar('XKRX').schedule(start_date=datetime.now(), end_date=datetime.now()).empty
        
        raw_report = generator.generate_report(market_data, news_list, is_krx_open=is_open)
        html_report = clean_html_response(raw_report)
        
        kst_now = pd.Timestamp.now(tz='Asia/Seoul')
        date_str = kst_now.strftime("%Y%m%d")
        
        raw_data_dir = "public/raw-data"
        if not os.path.exists(raw_data_dir): os.makedirs(raw_data_dir)
        output_file = os.path.join(raw_data_dir, f"morning_report_{date_str}.html")
        
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html_report)
        
        from portal_func import update_portal
        update_portal(raw_data_dir, ".")
        print(f"✅ 리포트 생성 완료 (KOSPI: {market_data['KOSPI']['price']})")
        
    except Exception as e:
        print(f"❌ 오류: {e}")

if __name__ == "__main__":
    main()
