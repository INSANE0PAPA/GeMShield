import re
from pathlib import Path
import pymupdf
def extract(file_path: str | Path) -> dict:
    file_path = Path(file_path)
    doc = pymupdf.open(str(file_path))
    pages = []
    for i, page in enumerate(doc, start=1):
        raw = page.get_text("text")       
        cleaned = _clean(raw)
        pages.append({"page": i, "text": cleaned})
    doc.close()
    full_text = "\n".join(p["text"] for p in pages)
    return {
        "full_text":  full_text,
        "pages":      pages,
        "page_count": len(pages),
        "char_count": len(full_text),
    }
def find_evidence_page(snippet: str, pages: list[dict]) -> int | None:
    if not snippet:
        return None
    snippet_lower = snippet.lower()
    for p in pages:
        if snippet_lower in p["text"].lower():
            return p["page"]
    return None
def extract_evidence_sentence(keyword: str, full_text: str, window: int = 120) -> str:
    idx = full_text.lower().find(keyword.lower())
    if idx == -1:
        return ""
    start = max(0, idx - 40)
    end   = min(len(full_text), idx + window)
    snippet = full_text[start:end].strip()
    return re.sub(r"\s+", " ", snippet)
def _clean(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"\r\n|\r", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)             
    text = re.sub(r"\n{3,}", "\n\n", text)          
    return text.strip()
if __name__ == "__main__":
    import sys, json
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if not path:
        print("Usage: python document_processor.py <pdf_path>")
        sys.exit(1)
    result = extract(path)
    print(f"Pages : {result['page_count']}")
    print(f"Chars : {result['char_count']}")
    for p in result["pages"]:
        preview = p["text"][:200].replace("\n", " ")
        print(f"  Page {p['page']}: {preview}…")
