#!/usr/bin/env python3
"""Release helper for Thread Pulse (no dependencies besides Python 3).

    python3 tools/release.py prepare 1.5.0   # set VERSION, turn "Unreleased" into "[1.5.0] – <today>", update links, build
    python3 tools/release.py dev             # after the release: VERSION "<release>+dev", build
    python3 tools/release.py check 1.5.0     # VERSION, changelog section and generated files match – used by the release action
    python3 tools/release.py notes 1.5.0     # release notes (changelog section + installation) – used by the release action

Typical release:
  1. branch release/X.Y.Z, `prepare X.Y.Z`, pull request, merge
  2. tag the merge commit: git tag -a vX.Y.Z -m "Thread Pulse X.Y.Z" && git push origin vX.Y.Z
     → the GitHub action "Release" checks everything and creates the GitHub release (never with attachments)
  3. branch chore/post-X.Y.Z, `dev`, pull request, merge
"""
import datetime, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = "https://github.com/riticulus/ha-thread-pulse"
VERSION_FILE = ROOT / "src" / "version.js"
CHANGELOG = ROOT / "CHANGELOG.md"
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")


def fail(msg):
    print("ERROR: " + msg)
    sys.exit(1)


def current_version():
    m = re.search(r'const VERSION = "([^"]+)"', VERSION_FILE.read_text(encoding="utf-8"))
    if not m:
        fail("no VERSION in src/version.js")
    return m.group(1)


def set_version(v):
    text = VERSION_FILE.read_text(encoding="utf-8")
    new, n = re.subn(r'const VERSION = "[^"]+";', f'const VERSION = "{v}";', text, count=1)
    if n != 1:
        fail("could not set VERSION in src/version.js")
    VERSION_FILE.write_text(new, encoding="utf-8")


def build():
    subprocess.run([sys.executable, str(ROOT / "build.py")], check=True)


def section(text, version):
    """Body of the changelog section [version] (without its heading)."""
    m = re.search(r"^## \[" + re.escape(version) + r"\][^\n]*\n(.*?)(?=^## \[|^\[Unreleased\]:)", text, re.S | re.M)
    return m.group(1).strip() if m else None


def last_release(text):
    m = re.search(r"^## \[(\d+\.\d+\.\d+)\]", text, re.M)
    return m.group(1) if m else None


def prepare(version):
    if not SEMVER.match(version):
        fail(f"version must look like 1.2.3, got {version!r}")
    text = CHANGELOG.read_text(encoding="utf-8")
    if f"## [{version}]" in text:
        fail(f"CHANGELOG.md already has a section [{version}]")
    unreleased = section(text, "Unreleased")
    if not unreleased:
        fail("the [Unreleased] section of CHANGELOG.md is empty – nothing to release")
    previous = last_release(text)
    today = datetime.date.today().isoformat()
    text = text.replace("## [Unreleased]\n", f"## [Unreleased]\n\n## [{version}] – {today}\n", 1)
    old_link = f"[Unreleased]: {REPO}/compare/v{previous}...HEAD"
    if old_link not in text:
        fail(f"link line {old_link!r} not found in CHANGELOG.md")
    text = text.replace(old_link, f"[Unreleased]: {REPO}/compare/v{version}...HEAD\n[{version}]: {REPO}/compare/v{previous}...v{version}")
    CHANGELOG.write_text(text, encoding="utf-8")
    set_version(version)
    build()
    print(f"prepared {version} (previous release {previous}): src/version.js, CHANGELOG.md, generated files")


def dev():
    v = current_version()
    if not SEMVER.match(v):
        fail(f"VERSION is {v!r} – 'dev' expects a release number like 1.2.3")
    set_version(v + "+dev")
    build()
    print(f"development version {v}+dev")


def check(version):
    problems = []
    if current_version() != version:
        problems.append(f"src/version.js has {current_version()!r}, expected {version!r}")
    text = CHANGELOG.read_text(encoding="utf-8")
    if not section(text, version):
        problems.append(f"CHANGELOG.md has no (or an empty) section [{version}]")
    if f"[{version}]: {REPO}/compare/" not in text and f"[{version}]: {REPO}/releases/tag/" not in text:
        problems.append(f"CHANGELOG.md has no link line for [{version}]")
    build()
    diff = subprocess.run(["git", "status", "--porcelain", "--", "dist"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    if diff:
        problems.append("generated files in dist/ are not up to date – run python3 build.py and commit:\n" + diff)
    for p in problems:
        print("ERROR: " + p)
    if problems:
        sys.exit(1)
    print(f"release {version}: version, changelog and generated files OK")


def notes(version):
    body = section(CHANGELOG.read_text(encoding="utf-8"), version)
    if not body:
        fail(f"CHANGELOG.md has no section [{version}]")
    print(body)
    print(f"""
**Install / update**
- **HACS:** Thread Pulse shows the update to {version} – install it and reload the browser. New installation: HACS → ⋮ → Custom repositories → `{REPO}`, type *Dashboard*.
- **Manual card:** download *Source code (zip)* below, copy `dist/ha-thread-pulse.js` and `dist/thread-pulse-vis-network.js` to `/config/www/`.
- **Standalone page:** from *Source code (zip)*, copy `dist/thread-pulse.html` and `dist/thread-pulse-vis-network.js` to `/config/www/` and raise `?v=` in the card URL.

See the [user guide]({REPO}/wiki) and the [changelog]({REPO}/blob/main/CHANGELOG.md).""")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["prepare"] and len(args) == 2:
        prepare(args[1])
    elif args == ["dev"]:
        dev()
    elif args[:1] == ["check"] and len(args) == 2:
        check(args[1])
    elif args[:1] == ["notes"] and len(args) == 2:
        notes(args[1])
    else:
        print(__doc__)
        sys.exit(2)
