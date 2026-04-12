def update_portal(raw_data_dir, project_root):
    """리포트 목록을 스캔하여 고품질 포털 페이지를 생성합니다."""
    files = sorted(glob.glob(os.path.join(raw_data_dir, "morning_report_*.html")), reverse=True)
    if not files: return

    # 포털 저장 경로 설정 (public/reports/index.html)
    portal_dir = os.path.join(project_root, "public", "reports")
    if not os.path.exists(portal_dir): os.makedirs(portal_dir)
    portal_path = os.path.join(portal_dir, "index.html")

    # 최신 리포트 정보 추출
    latest_file = files[0]
    # 확장자를 뺀 ID를 링크에 사용 (Next.js 라우팅용)
    latest_id = os.path.basename(latest_file).replace(".html", "")
    
    with open(latest_file, 'r', encoding='utf-8') as f:
        content = f.read()
        title_match = re.search(r'<h1 class="masthead-title">(.*?)</h1>', content)
        summary_match = re.search(r'<div class="summary-lead">(.*?)</div>', content, re.DOTALL)
        latest_title = title_match.group(1) if title_match else "최신 마켓 리포트"
        latest_summary = summary_match.group(1).strip() if summary_match else ""
        latest_summary = (latest_summary[:180] + "...") if len(latest_summary) > 180 else latest_summary

    # 아카이브 리스트 생성 (확장자 제거된 ID 사용)
    archive_items = []
    for f in files:
        fname = os.path.basename(f)
        report_id = fname.replace(".html", "")
        date_match = re.search(r'(\d{4})(\d{2})(\d{2})', fname)
        if date_match:
            date_display = f"{date_match.group(1)}년 {date_match.group(2)}월 {date_match.group(3)}일"
            archive_items.append(f"""
                <a href="/reports/{report_id}" class="archive-card">
                    <div class="archive-date">{date_display}</div>
                    <div class="archive-arrow">읽기 →</div>
                </a>
            """)

    portal_html = f"""
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>iM AI Market Report Portal</title>
    <style>
        :root {{ --im-navy: #2A3050; --im-gold: #C8940A; --bg: #F8F9FB; --text: #1A1A1A; }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Pretendard', -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }}
        .header {{ background: var(--im-navy); color: #fff; padding: 60px 30px 80px; text-align: center; position: relative; }}
        .header h1 {{ font-size: 28px; font-weight: 900; letter-spacing: -1px; }}
        .header p {{ font-size: 14px; opacity: 0.6; margin-top: 8px; font-family: Georgia, serif; font-style: italic; letter-spacing: 1px; }}
        .container {{ max-width: 640px; margin: -40px auto 60px; padding: 0 20px; }}
        .featured-card {{ background: #fff; border-radius: 4px; padding: 40px 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.05); border: 1px solid #eee; margin-bottom: 40px; }}
        .featured-label {{ color: var(--im-gold); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; display: block; }}
        .featured-title {{ font-size: 24px; font-weight: 800; color: var(--im-navy); line-height: 1.3; margin-bottom: 20px; letter-spacing: -1px; }}
        .featured-summary {{ font-size: 15px; color: #666; margin-bottom: 30px; line-height: 1.7; text-align: justify; }}
        .btn-main {{ display: block; background: var(--im-navy); color: #fff; padding: 18px; border-radius: 2px; text-decoration: none; font-weight: 800; font-size: 16px; text-align: center; transition: 0.3s; }}
        .btn-main:hover {{ background: #000; }}
        .section-title {{ font-size: 18px; font-weight: 800; color: var(--im-navy); margin-bottom: 20px; padding-left: 5px; border-left: 4px solid var(--im-gold); line-height: 1; }}
        .archive-list {{ display: grid; gap: 12px; }}
        .archive-card {{ background: #fff; border: 1px solid #eee; padding: 20px 24px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; text-decoration: none; color: inherit; transition: 0.2s; }}
        .archive-card:hover {{ border-color: var(--im-gold); transform: translateX(5px); }}
        .archive-date {{ font-size: 16px; font-weight: 700; color: #444; }}
        .archive-arrow {{ font-size: 13px; font-weight: 800; color: var(--im-gold); }}
        footer {{ text-align: center; padding: 60px 20px; color: #bbb; font-size: 12px; border-top: 1px solid #eee; background: #fff; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>iM AI Market Report</h1>
        <p>AI FINANCIAL EDITION</p>
    </div>
    <div class="container">
        <div class="featured-card">
            <span class="featured-label">Latest Insights</span>
            <h2 class="featured-title">{latest_title}</h2>
            <p class="featured-summary">{latest_summary}</p>
            <a href="/reports/{latest_id}" class="btn-main">지금 리포트 읽기</a>
        </div>
        <h3 class="section-title">리포트 아카이브</h3>
        <div class="archive-list">{"".join(archive_items)}</div>
    </div>
    <footer>&copy; {datetime.now().year} iM Bank AI Financial System. All rights reserved.</footer>
</body>
</html>
"""
    with open(portal_path, "w", encoding="utf-8") as f:
        f.write(portal_html)
    
    # JSON 목록 업데이트 (확장자 제거된 ID 리스트)
    report_ids = [os.path.basename(f).replace(".html", "") for f in files]
    with open(os.path.join(raw_data_dir, "report_list.json"), "w", encoding="utf-8") as f:
        json.dump({"files": report_ids}, f, ensure_ascii=False, indent=2)
    print(f"✅ 포털 및 리스트 갱신 완료: {portal_path}")
