#!/usr/bin/env python3
"""The user guide lives in docs/wiki/ and is published to the GitHub wiki (no dependencies besides Python 3).

    python3 tools/wiki.py check            # every page link and image in docs/wiki/ exists – used by the validate action
    python3 tools/wiki.py publish <dir>    # replace the pages in <dir> (a clone of the wiki repository) with docs/wiki/

`publish` writes the version from src/version.js wherever a page contains {{VERSION}} – "version 1.5.0",
or "the development version after 1.4.0" for a +dev version. The GitHub actions "Release" (after every release) and
"Wiki" (by hand) call it; edit the pages here, never in the wiki – the next publish overwrites the wiki.
"""
import re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "wiki"
VERSION_FILE = ROOT / "src" / "version.js"
LINK = re.compile(r"\]\(([^)\s]+)\)")


def fail(msg):
    print("ERROR: " + msg)
    sys.exit(1)


def version_text():
    m = re.search(r'const VERSION = "([^"]+)"', VERSION_FILE.read_text(encoding="utf-8"))
    if not m:
        fail("no VERSION in src/version.js")
    v = m.group(1)
    return f"the development version after {v[:-4]}" if v.endswith("+dev") else f"version {v}"


def pages():
    return sorted(SRC.glob("*.md"))


def check():
    names = {p.stem for p in pages()}
    problems = []
    for page in pages():
        for target in LINK.findall(page.read_text(encoding="utf-8")):
            if re.match(r"^[a-z]+:", target) or target.startswith("#"):
                continue                                  # external link or anchor on the same page
            path = target.split("#")[0]
            if path.startswith("images/"):
                if not (SRC / path).is_file():
                    problems.append(f"{page.name}: image {path} not found")
            elif path not in names:
                problems.append(f"{page.name}: link to page {path!r} – no file docs/wiki/{path}.md")
    used = {m for p in pages() for m in re.findall(r"images/[\w.-]+", p.read_text(encoding="utf-8"))}
    for img in sorted((SRC / "images").iterdir()):
        if f"images/{img.name}" not in used:
            problems.append(f"image images/{img.name} is not used on any page")
    for p in problems:
        print("ERROR: " + p)
    if problems:
        sys.exit(1)
    print(f"wiki: {len(names)} pages, links and images OK")


def publish(target):
    target = Path(target)
    if not (target / ".git").exists():
        fail(f"{target} is not a clone of the wiki repository")
    for old in target.iterdir():                          # remove everything except the git data
        if old.name == ".git":
            continue
        shutil.rmtree(old) if old.is_dir() else old.unlink()
    version = version_text()
    for page in pages():
        (target / page.name).write_text(page.read_text(encoding="utf-8").replace("{{VERSION}}", version), encoding="utf-8")
    shutil.copytree(SRC / "images", target / "images")
    print(f"published {len(pages())} pages to {target} (version: {version})")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args == ["check"]:
        check()
    elif args[:1] == ["publish"] and len(args) == 2:
        publish(args[1])
    else:
        print(__doc__)
        sys.exit(2)
