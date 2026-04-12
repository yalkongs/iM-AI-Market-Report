import os
import re
import json
from datetime import datetime, timedelta
from data_collector import DataCollector
from report_generator import ReportGenerator
import sys

# 프로젝트 루트 경로 설정
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

def generate_past_reports():
    collector = DataCollector()
    generator = ReportGenerator()
    
    # 4월 1일부터 오늘(4월 12일)까지
    start_date = datetime(2026, 4, 1)
    end_date = datetime(2026, 4, 12)
    
    raw_data_dir = os.path.join(project_root, "public", "raw-data")
    if not os.path.exists(raw_data_dir): os.makedirs(raw_data_dir)

    print(f"🗓️ 4월 1일 ~ 12일 리포트 일괄 생성 및 적재 시작 (텔레그램 제외)...")
    
    # 데이터는 현재 데이터를 활용하되 날짜만 변경하여 매거진 스타일 유지
    market_data = collector.get_market_data()
    news_list = collector.get_latest_news(limit=10)

    delta = end_date - start_date
    for i in range(delta.days + 1):
        target_date = start_date + timedelta(days=i)
        date_str = target_date.strftime("%Y%m%d")
        
        # 주말 여부 (토=5, 일=6)
        is_open = target_date.weekday() < 5
        
        print(f"📦 생성 중: {target_date.strftime('%Y-%m-%d')} ({'영업일' if is_open else '휴장일'})")
        
        # 텔레그램 전송 없이 HTML만 생성
        raw_report = generator.generate_report(market_data, news_list, is_krx_open=is_open)
        
        filename = f"morning_report_{date_str}.html"
        output_file = os.path.join(raw_data_dir, filename)
        
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(raw_report)

    print("✨ 리포트 생성 완료. 포털 업데이트를 시작합니다.")
    
    # 포털 업데이트 호출 (main.py의 로직 활용)
    from main import update_portal
    update_portal(raw_data_dir, project_root)

if __name__ == "__main__":
    generate_past_reports()
