#!/usr/bin/env python3
"""Extract interview Q&A from the AI-Interview answer-guide DOCX files."""

from __future__ import annotations

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

SOURCE_DIR = Path(r"F:\Documents\AI-Interview")
DEFAULT_OUTPUT = Path("scripts/data/ai-interview-guide.json")
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
QUESTION_RE = re.compile(r"^Q(\d+)\.\s*(.+)$")
CODE_PREFIX_RE = re.compile(
    r"^(export|import|const|let|var|function|type|interface|class|return|await|if|for|while|try|catch|switch|case|default|//|/\*|\*|<\/?[A-Za-z]|\{|\}|\[|\]|`|db\.|fetch\(|console\.|function\s)",
    re.I,
)


def docx_paragraphs(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    paragraphs: list[str] = []
    for paragraph in root.findall(".//w:p", NS):
        text = "".join(node.text or "" for node in paragraph.findall(".//w:t", NS)).strip()
        if text:
            paragraphs.append(text)
    return paragraphs


def looks_like_heading(line: str) -> bool:
    if QUESTION_RE.match(line) or line.startswith(("Answer:", "Interview tip:")):
        return False
    if CODE_PREFIX_RE.match(line):
        return False
    if any(token in line for token in ("=", ";", "{", "}", "<", ">", "(")):
        return False
    return len(line) <= 90 and len(line.split()) <= 12


def parse_guide(path: Path) -> list[dict]:
    category = path.name.replace(" - Interview Answer Guide", "").replace(".docx", "").strip()
    paragraphs = docx_paragraphs(path)
    items: list[dict] = []
    current: dict | None = None
    last_heading = ""

    def flush() -> None:
        nonlocal current
        if not current:
            return
        answer = "\n".join(current["answer_lines"]).strip()
        tip = "\n".join(current["tip_lines"]).strip()
        if answer:
            if tip:
                answer = f"{answer}\n\nInterview tip: {tip}"
            items.append(
                {
                    "category": category,
                    "topic": current["topic"],
                    "question": current["question"],
                    "answer": answer,
                }
            )
        current = None

    for line in paragraphs:
        match = QUESTION_RE.match(line)
        if match:
            flush()
            current = {
                "topic": last_heading,
                "question": match.group(2).strip(),
                "answer_lines": [],
                "tip_lines": [],
                "in_answer": False,
                "in_tip": False,
            }
            continue

        if current is None:
            if looks_like_heading(line):
                last_heading = line
            continue

        if line.startswith("Answer:"):
            current["in_answer"] = True
            current["in_tip"] = False
            current["answer_lines"].append(line[len("Answer:") :].strip())
            continue

        if line.startswith("Interview tip:"):
            current["in_tip"] = True
            current["in_answer"] = False
            current["tip_lines"].append(line[len("Interview tip:") :].strip())
            continue

        if current["in_tip"]:
            if looks_like_heading(line):
                last_heading = line
            elif not QUESTION_RE.match(line):
                current["tip_lines"].append(line)
            continue

        if current["in_answer"]:
            if looks_like_heading(line):
                last_heading = line
                current["in_answer"] = False
            else:
                current["answer_lines"].append(line)
            continue

        if looks_like_heading(line):
            last_heading = line

    flush()
    return items


def main() -> int:
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUTPUT
    guides = sorted(SOURCE_DIR.glob("* - Interview Answer Guide.docx"))
    if not guides:
        print(f"No answer guides found in {SOURCE_DIR}", file=sys.stderr)
        return 1

    all_items: list[dict] = []
    for guide in guides:
        items = parse_guide(guide)
        print(f"{guide.name}: {len(items)} questions")
        all_items.extend(items)

    seen: set[tuple[str, str]] = set()
    unique: list[dict] = []
    for item in all_items:
        key = (item["category"].lower(), re.sub(r"\s+", " ", item["question"]).strip().lower())
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(unique, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Total unique questions: {len(unique)}")
    print(f"Written to {output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
