#!/usr/bin/env python3
"""Build Thread Pulse from src/ – kept for tools/release.py and old habits; the build itself is tools/build.mjs
(esbuild). Same as `npm run build`. Needs Node and `npm install` once."""
import shutil, subprocess, sys
from pathlib import Path

here = Path(__file__).parent
if not shutil.which("node"):
    sys.exit("Node is needed to build Thread Pulse (https://nodejs.org)")
if not (here / "node_modules" / "esbuild").exists():
    sys.exit("run `npm install` once (installs esbuild)")
sys.exit(subprocess.run(["node", str(here / "tools" / "build.mjs")]).returncode)
