import requests
import re
import feedparser
from datetime import datetime
import yfinance as tk

class DataCollector:
    def __init__(self):
        # 공신력 있는 데이터 소스 URL
        self.sources = {
            "KOSPI": "https://finance.naver.com/sise/sise_index.naver?code=KOSPI",
            "KOSDAQ": "https://finance.naver.com/sise/sise_index.naver?code=KOSDAQ",
            "USD/KRW": "https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_USDKRW"
        }

    def fetch_realtime_krx(self):
        """리포트 생성 시점에 KRX 기반 실시간 데이터를 직접 찾아 확인합니다."""
        results = {}
        for name, url in self.sources.items():
            try:
                res = requests.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
                # 실시간 지수/가격 추출 (정규표현식으로 웹페이지 내 실제 수치 타겟팅)
                if "index" in url:
                    val_match = re.search(r'now_value">([\d,.]+)', res.text)
                    diff_match = re.search(r'now_rate">([+-]?[\d,.]+)', res.text)
                else:
                    val_match = re.search(r'value">([\d,.]+)', res.text)
                    diff_match = re.search(r'rate">([+-]?[\d,.]+)', res.text)

                if val_match:
                    price = float(val_match.group(1).replace(',', ''))
                    pct = float(diff_match.group(1)) if diff_match else 0.0
                    results[name] = {"price": price, "pct": pct, "source": "Official Market Data"}
            except Exception as e:
                print(f"⚠️ {name} 실시간 데이터 조회 실패: {e}")
                results[name] = {"price": 0.0, "pct": 0.0, "source": "Fetch Error"}
        
        # 글로벌 지표 (미 국채, VIX 등) - 최신 세션 데이터 수집
        global_targets = {"S&P 500": "^GSPC", "NASDAQ": "^IXIC", "US 10Y Bond": "^TNX", "VIX": "^VIX"}
        for name, ticker in global_targets.items():
            try:
                stock = tk.Ticker(ticker)
                hist = stock.history(period="1d")
                if not hist.empty:
                    results[name] = {
                        "price": round(hist['Close'].iloc[-1], 2),
                        "pct": round(((hist['Close'].iloc[-1] - hist['Open'].iloc[0]) / hist['Open'].iloc[0]) * 100, 2),
                        "source": "Global Exchange"
                    }
            except: pass
            
        return results

    def get_official_news(self):
        """정부기관 및 공신력 있는 외신(Fed, KRX 뉴스 등)에서 정책 데이터를 수집합니다."""
        feeds = [
            "https://www.bok.or.kr/portal/bbs/B0000002/rss.do?menuNo=200133", # 한국은행
            "https://www.fsc.go.kr/rss/fsc_news.xml", # 금융위원회
            "https://www.reutersagency.com/feed/?best-topics=business"
        ]
        all_news = []
        for url in feeds:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:5]:
                    all_news.append({"title": entry.title, "summary": entry.summary[:300]})
            except: pass
        return all_news
