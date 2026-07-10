"""
Run this to ingest all files in sample_docs/ into Supabase.

Usage:
    python ingest.py
    python ingest.py --topic "operating-systems"

Supports .txt and .pdf files. Drop your notes/PDFs into sample_docs/ first.
"""

import argparse
import os
from pypdf import PdfReader
from rag import ingest_document

SAMPLE_DOCS_DIR = os.path.join(os.path.dirname(__file__), "sample_docs")


def read_txt(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def read_pdf(path: str) -> str:
    reader = PdfReader(path)
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", default=None, help="Optional topic tag applied to every ingested file")
    args = parser.parse_args()

    if not os.path.isdir(SAMPLE_DOCS_DIR) or not os.listdir(SAMPLE_DOCS_DIR):
        print(f"No files found in {SAMPLE_DOCS_DIR}. Add some .txt or .pdf files first.")
        return

    for filename in os.listdir(SAMPLE_DOCS_DIR):
        path = os.path.join(SAMPLE_DOCS_DIR, filename)
        ext = filename.lower().split(".")[-1]

        if ext == "txt":
            text = read_txt(path)
        elif ext == "pdf":
            text = read_pdf(path)
        else:
            print(f"Skipping unsupported file: {filename}")
            continue

        if not text.strip():
            print(f"Skipping empty file: {filename}")
            continue

        count = ingest_document(text, source=filename, topic=args.topic)
        print(f"Ingested {filename}: {count} chunks stored (topic={args.topic})")


if __name__ == "__main__":
    main()
