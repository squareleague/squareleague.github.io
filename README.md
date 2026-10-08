# Square League website

Static site served by GitHub Pages at https://squareleague.github.io/

- `index.html`, `site.css`, `site.js` - home page (channels, apps, YouTube videos, Buy Me a Coffee)
- `videos.json` - latest YouTube uploads, refreshed every 6 hours by `.github/workflows/update-videos.yml` (runs `scripts/update_videos.py`; can also be run locally)
- `privacy.html` - Privacy Policy (Play Console, App Store Connect, in-app VIP page)
- `terms.html` - Terms of Use (in-app VIP page)
- `style.css` - styles for the legal pages
- `app-ads.txt` - AdMob authorized sellers
