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
    # 원본 데이터 경로 수정
    raw_data_dir = os.path.join(project_root, "public", "raw-data")
    public_root = os.path.join(project_root, "public")

    if not os.path.exists(raw_data_dir): os.makedirs(raw_data_dir)

    # ... (중략) ...

    for i in range(delta.days + 1):
        # ... (중략) ...
        output_file = os.path.join(raw_data_dir, filename)

        with open(output_file, "w", encoding="utf-8") as f:
            f.write(raw_report)

    print("✨ 일괄 생성 완료!")
    # 포털 업데이트 호출 (수정된 인자 반영)
    from report_engine.main import update_portal
    update_portal(raw_data_dir, public_root)

    # 포털 업데이트
    from report_engine.main import update_portal
    current_dir = os.path.dirname(os.path.abspath(__file__))
    update_portal(os.path.join(os.path.dirname(current_dir), "public", "reports"))
