import yfinance as tk
import feedparser
from datetime import datetime, timedelta

class DataCollector:
    def __init__(self):
        # 더 풍부한 시장 지표 수집
        self.indices = {
            "S&P 500": "^GSPC",
            "Nasdaq": "^IXIC",
            "Dow Jones": "^DJI",
            "KOSPI": "^KS11",
            "USD/KRW": "KRW=X",
            "WTI Oil": "CL=F",
            "VIX": "^VIX",             # 공포 지수
            "US 10Y Bond": "^TNX",      # 미 국채 10년물 금리
            "SOX": "^SOX"               # 필라델피아 반도체 지수 (한국 증시 직결)
        }
        # 주요 주도주 (Magnificent 7 위주)
        self.tech_stocks = {
            "NVIDIA": "NVDA",
            "Apple": "AAPL",
            "Tesla": "TSLA",
            "Microsoft": "MSFT"
        }
        self.news_feeds = [
            "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664",
            "https://www.reutersagency.com/feed/?best-topics=business&post_type=best",
        ]

    def get_market_data(self):
        data = {}
        # 주요 지수 수집
        for name, ticker in self.indices.items():
            try:
                stock = tk.Ticker(ticker)
                hist = stock.history(period="5d") # 넉넉하게 5일치 가져옴
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
        
        # 주도주 데이터 추가 수집
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

    def get_latest_news(self, limit=10):
        all_news = []
        for url in self.news_feeds:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:limit]:
                    all_news.append({
                        "title": entry.title,
                        "summary": entry.summary if 'summary' in entry else "",
                        "link": entry.link
                    })
            except Exception as e:
                print(f"Error fetching news from {url}: {e}")
        return all_news

if __name__ == "__main__":
    collector = DataCollector()
    print("Fetching enriched market data...")
    res = collector.get_market_data()
    print(res)
