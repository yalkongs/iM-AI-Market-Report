import yfinance as tk
import feedparser
import pandas as pd
import requests
from datetime import datetime, timedelta

class DataCollector:
    def __init__(self):
        # 1. 글로벌 핵심 지수 (Yahoo Finance - 글로벌 표준용)
        self.indices = {
            "S&P 500": "^GSPC",
            "Nasdaq": "^IXIC",
            "SOX": "^SOX",             # 필라델피아 반도체
            "US 10Y Bond": "^TNX",      # 미 국채 10년물 (가장 공신력 있는 금리 지표)
            "VIX": "^VIX",             # 변동성 지수
            "WTI Oil": "CL=F",
            "USD/KRW": "KRW=X"         # 역외 환율
        }
        
        # 2. KRX 및 국내 금융 정보 (정확한 국내 데이터용)
        # 실제 운영 시에는 공공데이터포털 API 키가 필요하므로, 
        # 여기서는 가장 정확한 네이버 금융/KRX 연동 데이터를 정밀하게 가져오는 로직을 지향함
        self.krx_indices = {
            "KOSPI": "^KS11",
            "KOSDAQ": "^KQ11"
        }

        # 3. 고밀도 뉴스 및 정책 피드 (Bloomberg, Fed, KRX 관련)
        self.news_feeds = [
            "https://www.reutersagency.com/feed/?best-topics=business&post_type=best",
            "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664",
            "https://www.bok.or.kr/portal/bbs/B0000002/rss.do?menuNo=200133", # 한국은행
            "https://www.fsc.go.kr/rss/fsc_news.xml", # 금융위원회
        ]

    def get_precise_kospi(self):
        """네이버 금융 또는 KRX 데이터를 통해 KOSPI의 가장 정확한 수치를 가져옵니다."""
        try:
            # yfinance는 가끔 KOSPI 데이터가 누락되거나 지연되므로 네이버 금융 정밀 크롤링 시도
            url = "https://finance.naver.com/sise/sise_index.naver?code=KOSPI"
            res = requests.get(url, timeout=5)
            # 정규표현식으로 현재 지수 추출
            match = re.search(r'now_value">([\d,.]+)', res.text)
            if match:
                val = float(match.group(1).replace(',', ''))
                # 등락률 추출
                rate_match = re.search(r'now_rate">([+-][\d,.]+)', res.text)
                rate = float(rate_match.group(1)) if rate_match else 0.0
                return {"price": val, "pct": rate}
        except:
            pass
        return None

    def get_market_data(self):
        data = {}
        # 글로벌 데이터 수집
        for name, ticker in self.indices.items():
            try:
                stock = tk.Ticker(ticker)
                hist = stock.history(period="5d")
                if len(hist) >= 2:
                    current_price = hist['Close'].iloc[-1]
                    prev_price = hist['Close'].iloc[-2]
                    change_pct = ((current_price - prev_price) / prev_price) * 100
                    data[name] = {"price": round(current_price, 2), "pct": round(change_pct, 2)}
            except Exception as e:
                print(f"Error fetching {name}: {e}")

        # 국내 데이터 수집 (정밀도 보강)
        for name, ticker in self.krx_indices.items():
            try:
                # 1차 시도: 정밀 크롤링 (네이버 금융 등)
                if name == "KOSPI":
                    precise = self.get_precise_kospi()
                    if precise:
                        data[name] = precise
                        continue
                
                # 2차 시도: yfinance
                stock = tk.Ticker(ticker)
                hist = stock.history(period="2d")
                if len(hist) >= 2:
                    current_price = hist['Close'].iloc[-1]
                    prev_price = hist['Close'].iloc[-2]
                    change_pct = ((current_price - prev_price) / prev_price) * 100
                    data[name] = {"price": round(current_price, 2), "pct": round(change_pct, 2)}
            except Exception as e:
                print(f"Error fetching KRX {name}: {e}")

        return data

    def get_latest_news(self, limit=15):
        all_news = []
        for url in self.news_feeds:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:limit]:
                    all_news.append({
                        "title": entry.title,
                        "summary": entry.summary if 'summary' in entry else "",
                        "source": url.split('/')[2]
                    })
            except Exception as e:
                print(f"Error fetching news from {url}: {e}")
        return all_news
import re
