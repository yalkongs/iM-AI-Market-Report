from data_collector import DataCollector
from report_generator import ReportGenerator
import sys
import os
import re
from datetime import datetime
import pandas_market_calendars as mcal
import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()

def is_krx_open_today():
    """오늘이 KRX 영업일인지 확인합니다."""
    try:
        krx = mcal.get_calendar('XKRX')
        today = pd.Timestamp.now(tz='Asia/Seoul').normalize()
        schedule = krx.schedule(start_date=today, end_date=today)
        return not schedule.empty
    except Exception as e:
        print(f"⚠️ 휴장일 판별 중 오류 발생 (기본값 영업일로 설정): {e}")
        return True

def clean_html_response(text):
    match = re.search(r'<!DOCTYPE html>.*</html>', text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(0)
    return text.replace("```html", "").replace("```", "").strip()

def send_to_telegram(file_path):
    """생성된 HTML 파일을 텔레그램으로 전송합니다."""
    # [일시 중단 설정] 2026-04-12 21:00 (KST) 까지 전송 중단
    resume_time = datetime(2026, 4, 12, 21, 0) 
    if datetime.now() < resume_time:
        print(f"🔇 테스트 기간입니다. 텔레그램 전송을 24시간 동안 중단합니다. (재개 예정: {resume_time})")
        return

    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    if not token or not chat_id:
        print("⚠️ 텔레그램 설정이 누락되었습니다. 전송을 건너뜁니다.")
        return

    url = f"https://api.telegram.org/bot{token}/sendDocument"
    caption = f"🌅 iM뱅크 모닝 마켓 리포트 ({datetime.now().strftime('%Y-%m-%d')})"
    
    try:
        with open(file_path, 'rb') as f:
            files = {'document': f}
            data = {'chat_id': chat_id, 'caption': caption}
            response = requests.post(url, data=data, files=files)
            if response.status_code == 200:
                print("✅ 텔레그램 리포트 전송 완료!")
            else:
                print(f"❌ 텔레그램 전송 실패: {response.text}")
    except Exception as e:
        print(f"❌ 텔레그램 전송 중 오류 발생: {e}")

def main():
    print(f"🕒 현재 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    is_open = is_krx_open_today()
    print(f"📊 KRX 개장 여부: {'영업일' if is_open else '휴장일'}")

    print("🚀 [1/3] 실시간 시장 데이터 및 뉴스 수집 중...")
    collector = DataCollector()
    market_data = collector.get_market_data()
    news_list = collector.get_latest_news(limit=10)
    
    if not market_data:
        print("❌ 시장 데이터를 가져오는 데 실패했습니다.")
        return

    print(f"🤖 [2/3] AI 리포트 생성 중...")
    try:
        generator = ReportGenerator()
        raw_report = generator.generate_report(market_data, news_list, is_krx_open=is_open)
        html_report = clean_html_response(raw_report)
        
        output_dir = "./results"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        filename = f"morning_report_{timestamp}.html"
        output_file = os.path.join(output_dir, filename)
        
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html_report)
        
        print(f"💾 리포트 저장 완료: {output_file}")

        # 텔레그램 전송
        print("📤 [3/3] 텔레그램 전송 시작...")
        send_to_telegram(output_file)

        # GitHub Pages 배포용 최신 리포트 복사 (index.html로 사용 가능)
        with open(os.path.join(output_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(html_report)

    except Exception as e:
        print(f"❌ 프로세스 중 오류 발생: {e}")

if __name__ == "__main__":
    main()
