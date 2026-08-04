#!/usr/bin/env python3
"""Synchronise the public Google Drive scans tree with the static archive data."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ROOT_FOLDER_ID = "1R48OtZQh_5hbaf9Cctzo2KzpIyAagbeD"
FOLDER_MIME = "application/vnd.google-apps.folder"
PDF_MIME = "application/pdf"
PROJECT_DIR = Path(__file__).resolve().parents[1]


def natural_key(value: str):
    return [int(part) if part.isdigit() else part.casefold() for part in re.split(r"(\d+)", value)]


def request_json(url: str):
    for attempt in range(5):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "TBZ-Scans-Archive/1.0"})
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.load(response)
        except Exception:
            if attempt == 4:
                raise
            time.sleep(2**attempt)


def list_children(folder_id: str, api_key: str):
    files = []
    page_token = None
    while True:
        params = {
            "q": f"'{folder_id}' in parents and trashed = false",
            "key": api_key,
            "pageSize": "1000",
            "orderBy": "folder,name_natural",
            "fields": "nextPageToken,files(id,name,mimeType,size,modifiedTime,imageMediaMetadata(width,height))",
        }
        if page_token:
            params["pageToken"] = page_token
        url = "https://www.googleapis.com/drive/v3/files?" + urllib.parse.urlencode(params)
        payload = request_json(url)
        files.extend(payload.get("files", []))
        page_token = payload.get("nextPageToken")
        if not page_token:
            return sorted(files, key=lambda item: natural_key(item.get("name", "")))


def crawl(folder_id: str, api_key: str, name: str = "SCANS ARCHIVE"):
    children = list_children(folder_id, api_key)
    result = {"id": folder_id, "name": name, "mimeType": FOLDER_MIME, "children": []}
    for item in children:
        if item.get("mimeType") == FOLDER_MIME:
            node = crawl(item["id"], api_key, item["name"])
            if item.get("modifiedTime"):
                node["modifiedTime"] = item["modifiedTime"]
            result["children"].append(node)
        else:
            result["children"].append(item)
    return result


def clean_collection_name(name: str):
    return re.sub(r"^\s*\d+\s*[.\-_]\s*", "", name).strip()


def bilingual_name(name: str):
    cleaned = clean_collection_name(name)
    match = re.match(r"^(.*?)\s*\(([^()]*)\)\s*$", cleaned)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return cleaned, cleaned


def slugify(value: str):
    english, _ = bilingual_name(value)
    normalized = unicodedata.normalize("NFKD", english).encode("ascii", "ignore").decode("ascii").replace("'", "")
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.casefold()).strip("-")
    return slug or "collection"


def image_record(item: dict):
    metadata = item.get("imageMediaMetadata") or {}
    return {
        "id": item["id"],
        "name": item.get("name", "Scan"),
        "modifiedTime": item.get("modifiedTime", ""),
        "width": metadata.get("width"),
        "height": metadata.get("height"),
    }


def collect_gallery(folder: dict):
    groups = []
    pdfs = []
    other_files = []

    def walk(node: dict, relative_parts: list[str]):
        local_images = []
        for child in node.get("children", []):
            mime = child.get("mimeType", "")
            if mime.startswith("image/"):
                local_images.append(image_record(child))
            elif mime == PDF_MIME:
                pdfs.append({"id": child["id"], "name": child.get("name", "PDF")})
            elif mime != FOLDER_MIME:
                other_files.append({"id": child["id"], "name": child.get("name", "File"), "mimeType": mime})
        if local_images:
            groups.append({
                "name": " / ".join(relative_parts) if relative_parts else "MAIN",
                "images": sorted(local_images, key=lambda item: natural_key(item["name"])),
            })
        for child in node.get("children", []):
            if child.get("mimeType") == FOLDER_MIME:
                walk(child, relative_parts + [child["name"]])

    walk(folder, [])
    images = [image for group in groups for image in group["images"]]
    dates = [image["modifiedTime"] for image in images if image.get("modifiedTime")]
    return {
        "id": folder["id"],
        "folderId": folder["id"],
        "name": folder["name"].strip(),
        "imageCount": len(images),
        "coverId": images[0]["id"] if images else "",
        "updatedAt": max(dates, default=folder.get("modifiedTime", "")),
        "groups": groups,
        "pdfs": pdfs,
        "otherFiles": other_files,
    }


def build_archive(tree: dict):
    collections = []
    used_slugs = set()
    for position, folder in enumerate(tree.get("children", []), start=1):
        if folder.get("mimeType") != FOLDER_MIME:
            continue
        slug = slugify(folder["name"])
        base = slug
        suffix = 2
        while slug in used_slugs:
            slug = f"{base}-{suffix}"
            suffix += 1
        used_slugs.add(slug)
        name_en, name_ko = bilingual_name(folder["name"])
        galleries = [
            collect_gallery(child)
            for child in folder.get("children", [])
            if child.get("mimeType") == FOLDER_MIME
        ]
        loose = {
            "id": folder["id"],
            "name": "OTHER SCANS",
            "children": [child for child in folder.get("children", []) if child.get("mimeType") != FOLDER_MIME],
        }
        loose_gallery = collect_gallery(loose)
        if loose_gallery["imageCount"] or loose_gallery["pdfs"]:
            loose_gallery["id"] = f"{folder['id']}-other"
            loose_gallery["folderId"] = folder["id"]
            galleries.append(loose_gallery)
        galleries = [gallery for gallery in galleries if gallery["imageCount"] or gallery["pdfs"]]
        dates = [gallery["updatedAt"] for gallery in galleries if gallery.get("updatedAt")]
        collections.append({
            "position": position,
            "id": folder["id"],
            "slug": slug,
            "name": clean_collection_name(folder["name"]),
            "nameEn": name_en,
            "nameKo": name_ko,
            "galleryCount": len(galleries),
            "imageCount": sum(gallery["imageCount"] for gallery in galleries),
            "updatedAt": max(dates, default=folder.get("modifiedTime", "")),
            "galleries": galleries,
        })
    dates = [collection["updatedAt"] for collection in collections if collection.get("updatedAt")]
    return {
        "version": 1,
        "sourceFolderId": ROOT_FOLDER_ID,
        "updatedAt": max(dates, default=""),
        "collectionCount": len(collections),
        "imageCount": sum(collection["imageCount"] for collection in collections),
        "collections": collections,
    }


def write_outputs(archive: dict):
    payload = json.dumps(archive, ensure_ascii=False, separators=(",", ":"))
    (PROJECT_DIR / "data.js").write_text(f"window.SCANS_DATA={payload};\n", encoding="utf-8")

    template_path = PROJECT_DIR / "scripts" / "collection-template.html"
    template = template_path.read_text(encoding="utf-8")
    for collection in archive["collections"]:
        target_dir = PROJECT_DIR / collection["slug"]
        target_dir.mkdir(parents=True, exist_ok=True)
        page = template.replace("{{COLLECTION_SLUG}}", collection["slug"])
        (target_dir / "index.html").write_text(page, encoding="utf-8")

    manifest_path = PROJECT_DIR / "scripts" / "generated-pages.json"
    previous = []
    if manifest_path.exists():
        previous = json.loads(manifest_path.read_text(encoding="utf-8"))
    current = [collection["slug"] for collection in archive["collections"]]
    for stale_slug in set(previous) - set(current):
        stale_dir = (PROJECT_DIR / stale_slug).resolve()
        if stale_dir.parent == PROJECT_DIR.resolve() and (stale_dir / ".generated-scan-page").exists():
            shutil.rmtree(stale_dir)
    for slug in current:
        (PROJECT_DIR / slug / ".generated-scan-page").write_text("generated by scripts/update_scans.py\n", encoding="utf-8")
    manifest_path.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tree-file", type=Path, help="Use a saved Drive tree instead of the API")
    args = parser.parse_args()
    if args.tree_file:
        tree = json.loads(args.tree_file.read_text(encoding="utf-8"))
    else:
        api_key = os.environ.get("GOOGLE_DRIVE_API_KEY", "").strip()
        if not api_key:
            raise SystemExit("GOOGLE_DRIVE_API_KEY is required")
        tree = crawl(ROOT_FOLDER_ID, api_key)
    archive = build_archive(tree)
    write_outputs(archive)
    print(f"Updated {archive['collectionCount']} collections and {archive['imageCount']} scans.")


if __name__ == "__main__":
    main()


