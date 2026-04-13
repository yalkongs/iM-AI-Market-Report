import yfinance as tk
import requests
import pandas as pd
from datetime import datetime, timedelta
import re

class DataCollector:
    def __init__(self):
        # 1. 공신력 있는 매크로 데이터 소스 (FRED 등 연동 준비)
        self.fred_base_url = "https://api.stlouisfed.org/fred/series/observations"
        
        # 2. 다중 교차 검증을 위한 지수 리스트
        self.targets = {
            "KOSPI": {"ticker": "^KS11", "source": "KRX/Naver"},
            "S&P 500": {"ticker": "^GSPC", "source": "Yahoo/Standard"},
            "NASDAQ": {"ticker": "^IXIC", "source": "Yahoo/Standard"},
            "US 10Y Bond": {"ticker": "^TNX", "source": "CBOE/Fed"},
            "VIX": {"ticker": "^VIX", "source": "CBOE"},
            "USD/KRW": {"ticker": "KRW=X", "source": "FX Market"}
        }

    def fetch_from_official_sources(self):
        """각 기관별 공식 데이터에 기반하여 마켓 데이터를 수집합니다."""
        results = {}
        
        # [A] 국내 데이터: 네이버 금융/KRX 실시간 데이터 정밀 크롤링 (가장 오차 적음)
        results["KOSPI"] = self._get_krx_data("KOSPI")
        results["KOSDAQ"] = self._get_krx_data("KOSDAQ")
        
        # [B] 글로벌 데이터: Yahoo Finance 및 전문 소스 연동
        for name, info in self.targets.items():
            if name in ["KOSPI", "KOSDAQ"]: continue
            try:
                stock = tk.Ticker(info["ticker"])
                hist = stock.history(period="2d")
                if not hist.empty:
                    curr = hist['Close'].iloc[-1]
                    prev = hist['Close'].iloc[-2]
                    results[name] = {
                        "price": round(curr, 2),
                        "pct": round(((curr - prev) / prev) * 100, 2),
                        "source": info["source"]
                    }
            except Exception as e:
                print(f"⚠️ {name} 수집 실패: {e}")
        
        return results

    def _get_krx_data(self, market_type):
        """국내 거래소의 실시간 지표를 정밀하게 수집합니다."""
        url = f"https://finance.naver.com/sise/sise_index.naver?code={market_type}"
        try:
            res = requests.get(url, timeout=5)
            # 수치 추출 (할루시네이션 방지를 위해 정규표현식으로 엄격히 필터링)
            price_match = re.search(r'now_value">([\d,.]+)', res.text)
            rate_match = re.search(r'now_rate">([+-]?[\d,.]+)', res.text)
            
            if price_match:
                price = float(price_match.group(1).replace(',', ''))
                rate = float(rate_match.group(1)) if rate_match else 0.0
                return {"price": price, "pct": rate, "source": "KRX Official"}
        except:
            pass
        return {"price": 0.0, "pct": 0.0, "source": "Error"}

    def get_policy_news(self):
        """Bloomberg, Fed 등의 정책 및 입법 동향 뉴스를 수집합니다."""
        feeds = [
            "https://www.reutersagency.com/feed/?best-topics=political-general",
            "https://www.bok.or.kr/portal/bbs/B0000002/rss.do?menuNo=200133" # 한은 보도자료
        ]
        all_news = []
        import feedparser
        for url in feeds:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:5]:
                    all_news.append({"title": entry.title, "summary": entry.summary[:200]})
            except: pass
        return all_news
