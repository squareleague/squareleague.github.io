"""Refresh videos.json from the Square League YouTube channel.

Reads the public RSS feed (latest 15 uploads with view counts) and, when
reachable, the channel page for the subscriber and video totals.
Run locally or from .github/workflows/update-videos.yml.
"""
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

CHANNEL_ID = "UCy6sJ8RYieJa0Evh-dK7mFA"
HANDLE = "@squareleague2d"
OUT = Path(__file__).resolve().parent.parent / "videos.json"
UA = {"User-Agent": "Mozilla/5.0 (compatible; squareleague-site/1.0)", "Accept-Language": "en-US,en;q=0.9"}
NS = {
    "a": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def fetch_videos():
    root = ET.fromstring(get(f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"))
    videos = []
    for e in root.findall("a:entry", NS):
        stats = e.find("media:group/media:community/media:statistics", NS)
        videos.append({
            "id": e.findtext("yt:videoId", namespaces=NS),
            "title": e.findtext("a:title", namespaces=NS),
            "published": e.findtext("a:published", namespaces=NS)[:10],
            "views": int(stats.get("views", 0)) if stats is not None else 0,
        })
    return videos


def fetch_totals():
    try:
        html = get(f"https://www.youtube.com/{HANDLE}")
    except Exception as exc:  # channel page is optional
        print("channel page unavailable:", exc, file=sys.stderr)
        return {}
    out = {}
    m = re.search(r'"content":"([\d.,]+[KMB]?) subscribers"', html)
    if m:
        out["subscribers"] = m.group(1)
    m = re.search(r'"content":"([\d,]+) videos"', html)
    if m:
        out["videoCount"] = m.group(1)
    return out


def main():
    old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    channel = dict(old.get("channel", {}))
    channel.update({"handle": HANDLE, "url": f"https://www.youtube.com/{HANDLE}"})
    channel.update(fetch_totals())
    data = {"channel": channel, "videos": fetch_videos()}
    if not data["videos"]:
        sys.exit("feed returned no videos; keeping the old file")
    if {k: v for k, v in old.items() if k != "updated"} == data:
        print("no changes")
        return
    data["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(data['videos'])} videos to {OUT.name}")


if __name__ == "__main__":
    main()
