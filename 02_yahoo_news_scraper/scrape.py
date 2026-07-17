import csv
import datetime
import os
import bs4
import requests

URL = "https://news.yahoo.co.jp/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def scrape_yahoo_news():
    print("Yahoo!ニュースのデータ収集を開始します...\n")

    # 1. HTMLの取得
    try:
        response = requests.get(URL, headers=HEADERS, timeout=10)
        response.raise_for_status()
    except Exception as e:
        print(f"エラー: ウェブサイトに接続できませんでした。 ({e})")
        return

    # 2. HTMLの解析
    soup = bs4.BeautifulSoup(response.content, "html.parser")
    articles = soup.select("a.sc-dJZMsz.eZvxLp")

    if not articles:
        articles = [
            a
            for a in soup.find_all("a")
            if "news.yahoo.co.jp/pickup/" in a.get("href", "")
        ]

    if not articles:
        print("ニュース記事が見つかりませんでした。")
        return

    # 3. CSVファイルの準備
    filename = "yahoo_news.csv"
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Excelで開いても文字化けしないように utf-8-sig エンコーディングを使用します
    with open(filename, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["取得日時", "ニュースタイトル", "記事URL"])

        count = 0
        for article in articles:
            title = article.text.strip()
            url = article.get("href")

            if title and url:
                if not url.startswith("http"):
                    url = "https://news.yahoo.co.jp" + url

                # CSVに書き込み
                writer.writerow([now, title, url])
                count += 1

                # 画面への出力
                print(f"[{count}] {title}")
                print(f"    URL: {url}")
                print("-" * 50)

    print(
        f"\nデータ収集が完了しました！\n取得件数: {count}件\nCSV保存先: {os.path.abspath(filename)}"
    )


if __name__ == "__main__":
    scrape_yahoo_news()
