import yfinance as tk
import requests
import feedparser
from datetime import datetime, timedelta
import re

class DataCollector:
    def __init__(self):
        self.targets = {
            "KOSPI": "^KS11",
            "NASDAQ": "^IXIC",
            "S&P 500": "^GSPC",
            "US 10Y Bond": "^TNX",
            "USD/KRW": "KRW=X",
            "VIX": "^VIX"
        }

    def fetch_market_data(self):
        """실시간 등락률을 수집합니다."""
        results = {}
        for name, ticker in self.targets.items():
            try:
                stock = tk.Ticker(ticker)
                hist = stock.history(period="2d")
                if not hist.empty and len(hist) >= 2:
                    curr = hist['Close'].iloc[-1]
                    prev = hist['Close'].iloc[-2]
                    pct = ((curr - prev) / prev) * 100
                    results[name] = {"price": round(curr, 2), "pct": round(pct, 2)}
                else:
                    results[name] = {"price": 0.0, "pct": 0.0}
            except:
                results[name] = {"price": 0.0, "pct": 0.0}
        return results

    def fetch_news(self):
        """정치경제 뉴스 수집"""
        feeds = [
            "https://www.reutersagency.com/feed/?best-topics=business",
            "https://www.bok.or.kr/portal/bbs/B0000002/rss.do?menuNo=200133"
        ]
        news = []
        for url in feeds:
            try:
                f = feedparser.parse(url)
                for e in f.entries[:5]:
                    news.append({"title": e.title, "summary": e.summary[:200]})
            except: pass
        return news
