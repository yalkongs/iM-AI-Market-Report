import yfinance as tk
import feedparser
from datetime import datetime, timedelta

class DataCollector:
    def __init__(self):
        self.indices = {
            "S&P 500": "^GSPC",
            "Nasdaq": "^IXIC",
            "Dow Jones": "^DJI",
            "KOSPI": "^KS11",
            "USD/KRW": "KRW=X",
            "WTI Oil": "CL=F",
            "VIX": "^VIX",
            "US 10Y Bond": "^TNX",
            "SOX": "^SOX"
        }
        self.tech_stocks = {
            "NVIDIA": "NVDA", "Apple": "AAPL", "Tesla": "TSLA", "Microsoft": "MSFT"
        }
        
        # 정치경제, 입법, 정책 중심의 피드 확장
        self.news_feeds = [
            # 국제 정치경제/정책
            "https://www.reutersagency.com/feed/?best-topics=political-general&post_type=best",
            "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000113", # CNBC Politics
            "https://www.ft.com/world-politics?format=rss", # Financial Times
            
            # 국내 정책/경제 (RSS 기반 수집 가능 경로)
            "https://www.bok.or.kr/portal/bbs/B0000002/rss.do?menuNo=200133", # 한국은행 보도자료
            "https://www.fsc.go.kr/rss/fsc_news.xml", # 금융위원회 보도자료
            "https://www.moef.go.kr/rss/moef_press_release.xml", # 기획재정부 보도자료
        ]

    def get_market_data(self):
        data = {}
        for name, ticker in self.indices.items():
            try:
                stock = tk.Ticker(ticker)
                hist = stock.history(period="5d")
                if len(hist) >= 2:
                    current_price = hist['Close'].iloc[-1]
                    prev_price = hist['Close'].iloc[-2]
                    change = current_price - prev_price
                    change_pct = (change / prev_price) * 100
                    data[name] = {
                        "price": round(current_price, 2),
                        "change": round(change, 2),
                        "pct": round(change_pct, 2)
                    }
            except Exception as e:
                print(f"Error fetching {name}: {e}")
        
        data["Tech_Stocks"] = {}
        for name, ticker in self.tech_stocks.items():
            try:
                stock = tk.Ticker(ticker)
                hist = stock.history(period="2d")
                if len(hist) >= 2:
                    current_price = hist['Close'].iloc[-1]
                    change_pct = ((current_price - hist['Close'].iloc[-2]) / hist['Close'].iloc[-2]) * 100
                    data["Tech_Stocks"][name] = {"price": round(current_price, 2), "pct": round(change_pct, 2)}
            except Exception as e:
                print(f"Error fetching tech stock {name}: {e}")
        return data

    def get_latest_news(self, limit=15):
        all_news = []
        for url in self.news_feeds:
            try:
                feed = feedparser.parse(url)
                # 각 피드별로 뉴스 수집 (정치/정책 이슈 비중 확대)
                for entry in feed.entries[:limit]:
                    # 제목이나 요약에 경제/입법 키워드가 있는지 확인 (필터링 가능)
                    all_news.append({
                        "title": entry.title,
                        "summary": entry.summary if 'summary' in entry else "",
                        "source": url.split('/')[2] # 도메인 추출
                    })
            except Exception as e:
                print(f"Error fetching news from {url}: {e}")
        return all_news
