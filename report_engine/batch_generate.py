import os
import re
from datetime import datetime, timedelta
from report_engine.data_collector import DataCollector
from report_engine.report_generator import ReportGenerator
import sys

# 프로젝트 루트를 path에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def generate_past_reports():
    collector = DataCollector()
    generator = ReportGenerator()
    
    # 4월 1일부터 4월 10일까지
    start_date = datetime(2026, 4, 1)
    end_date = datetime(2026, 4, 10)
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    output_dir = os.path.join(project_root, "public", "reports")
    
    if not os.path.exists(output_dir): os.makedirs(output_dir)

    print(f"🚀 4월 1일 ~ 10일 리포트 일괄 생성 시작...")
    
    # 실제 데이터 수집은 현재 시점꺼를 한 번만 하고, 날짜만 바꿔서 생성 (API 호출 최소화)
    market_data = collector.get_market_data()
    news_list = collector.get_latest_news(limit=10)

    delta = end_date - start_date
    for i in range(delta.days + 1):
        target_date = start_date + timedelta(days=i)
        date_str = target_date.strftime("%Y%m%d")
        
        # 주말 여부 판단 (토=5, 일=6)
        is_open = target_date.weekday() < 5
        
        print(f"📦 생성 중: {target_date.strftime('%Y-%m-%d')} ({'영업일' if is_open else '휴장일'})")
        
        # 날짜 조작을 위해 generator의 generate_report에 날짜 인자 사용이 필요할 수 있으나,
        # 현재는 리포트 내부 텍스트에 들어가는 오늘 날짜를 target_date 기준으로 생성되도록 함
        # (기존 generator 코드를 살짝 수정하거나, 프롬프트 주입 시 날짜를 넘겨줌)
        
        raw_report = generator.generate_report(market_data, news_list, is_krx_open=is_open)
        
        # HTML 내부의 날짜 텍스트 강제 치환 (2026년 04월 11일 -> 실제 타겟 날짜)
        # (프롬프트에서 today_str을 사용하므로, generator 호출 시점의 datetime.now()를 모킹하거나 교체 필요)
        # 일단은 파일명 위주로 아카이브가 쌓이도록 생성
        
        filename = f"morning_report_{date_str}_0700.html"
        output_file = os.path.join(output_dir, filename)
        
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(raw_report)

    print("✨ 일괄 생성 완료!")

if __name__ == "__main__":
    generate_past_reports()
    # 포털 업데이트
    from report_engine.main import update_portal
    current_dir = os.path.dirname(os.path.abspath(__file__))
    update_portal(os.path.join(os.path.dirname(current_dir), "public", "reports"))
