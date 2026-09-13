#!/usr/bin/env python3
"""Download ГИС ЖКХ «Реестр поставщиков информации» XLSX.

Source: https://dom.gosuslugi.ru/#!/organizations
Writes: data/gis-gkh/raw/providers-registry.xlsx

Usage:
  python3 scripts/download-gis-gkh-providers.py
  python3 scripts/build-uk-contacts-index.py
"""

from __future__ import annotations

import json
import ssl
import urllib.request
from pathlib import Path

BASE = "https://dom.gosuslugi.ru"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/140.0.0.0 Safari/537.36"
)
SSL_CTX = ssl._create_unverified_context()
OUT = Path("data/gis-gkh/raw/providers-registry.xlsx")


def fetch(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/json,*/*",
            "Referer": f"{BASE}/#!/organizations",
        },
    )
    with urllib.request.urlopen(req, timeout=300, context=SSL_CTX) as resp:
        return resp.read()


def main() -> None:
    meta = json.loads(
        fetch(
            f"{BASE}/ppa/api/rest/services/ppa/export/public/information/providers"
        ).decode("utf-8")
    )
    file_guid = meta.get("fileGuid")
    if not file_guid:
        raise SystemExit(f"No fileGuid in export meta: {meta}")
    print(f"fileGuid={file_guid} name={meta.get('fileName')}")
    data = fetch(
        f"{BASE}/filestore/publicDownloadServlet?context=ppa&uid={file_guid}"
    )
    if not data.startswith(b"PK"):
        raise SystemExit(f"Expected xlsx zip, got {data[:80]!r}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(data)
    print(f"wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
