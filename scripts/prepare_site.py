#!/usr/bin/env python3
"""Create the minimal GitHub Pages artifact in _site/."""

import json
import shutil
from pathlib import Path

root = Path(__file__).resolve().parents[1]
site = root / "_site"
if site.exists():
    shutil.rmtree(site)
site.mkdir()

for filename in ("index.html", "styles.css", "landing.js", "gallery.js", "data.js"):
    shutil.copy2(root / filename, site / filename)
(site / ".nojekyll").write_text("", encoding="utf-8")

slugs = json.loads((root / "scripts" / "generated-pages.json").read_text(encoding="utf-8"))
for slug in slugs:
    source = root / slug / "index.html"
    target = site / slug
    target.mkdir()
    shutil.copy2(source, target / "index.html")

print(f"Prepared GitHub Pages artifact with {len(slugs)} collection pages.")
