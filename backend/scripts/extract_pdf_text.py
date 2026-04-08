from __future__ import annotations

import json
import sys
from pathlib import Path

from pypdf import PdfReader


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "pdf path missing"}))
        return 1

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        print(json.dumps({"success": False, "error": f"file not found: {pdf_path}"}))
        return 1

    try:
        reader = PdfReader(str(pdf_path))
        pages = []
        for index, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages.append(
                {
                    "page_number": index + 1,
                    "text": text,
                }
            )

        full_text = "\n\n".join(page["text"] for page in pages if page["text"])
        print(
            json.dumps(
                {
                    "success": True,
                    "page_count": len(reader.pages),
                    "pages": pages,
                    "text": full_text,
                },
                ensure_ascii=True,
            )
        )
        return 0
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"success": False, "error": str(exc)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
