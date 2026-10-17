#!/usr/bin/env python3
"""Search a Project Mode project by meaning (Classgrid Code).

The backend turns code chunks into meaning vectors (Cloudflare embeddings); this script keeps them in one
index file per project on the sandbox (never in a database) and does the search here.

  semindex.py plan   <project_dir> <index_file>   -> JSON {"todo": [chunks still without a vector], "total": n}
                                                     (drops chunks of changed or deleted files from the index)
  semindex.py add    <index_file>                 <- stdin JSON [{"file","start","end","sha","vec"}]
  semindex.py search <index_file> <k>             <- stdin JSON query vector -> JSON top-k matches
"""
import hashlib
import json
import os
import subprocess
import sys

CHUNK_LINES = 60          # lines per chunk
OVERLAP = 10              # lines shared with the next chunk, so code split at a border is still found
MAX_FILE_BYTES = 200_000  # bigger files are usually generated or data
MAX_CHUNKS = 5000         # brake for very big repos (the newest files are not indexed past this)
CODE_EXT = {
    "js", "jsx", "ts", "tsx", "mjs", "cjs", "py", "go", "rs", "java", "kt", "rb", "php", "cs", "c", "h", "cpp", "hpp",
    "swift", "vue", "svelte", "html", "css", "scss", "sql", "sh", "md", "yml", "yaml", "toml", "prisma", "graphql",
}
SKIP_DIRS = {"node_modules", "dist", "build", ".next", ".git", "vendor", "__pycache__", ".venv", "venv", "coverage"}
SKIP_FILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml"}


def load(index_file):
    try:
        with open(index_file) as f:
            return json.load(f)
    except Exception:
        return {"chunks": []}


def save(index_file, idx):
    os.makedirs(os.path.dirname(index_file), exist_ok=True)
    tmp = index_file + ".tmp"
    with open(tmp, "w") as f:
        json.dump(idx, f, separators=(",", ":"))
    os.replace(tmp, index_file)


def project_files(root):
    try:
        out = subprocess.run(["git", "-C", root, "ls-files", "--cached", "--others", "--exclude-standard"],
                             capture_output=True, text=True, timeout=60).stdout.splitlines()
    except Exception:
        out = []
    if not out:  # not a git folder: walk it
        for d, dirs, files in os.walk(root):
            dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
            out += [os.path.relpath(os.path.join(d, f), root) for f in files]
    for rel in sorted(set(out)):
        parts = rel.split("/")
        if any(p in SKIP_DIRS for p in parts) or parts[-1] in SKIP_FILES:
            continue
        if rel.rsplit(".", 1)[-1].lower() not in CODE_EXT or rel.endswith(".min.js"):
            continue
        full = os.path.join(root, rel)
        try:
            if os.path.getsize(full) <= MAX_FILE_BYTES:
                yield rel, full
        except OSError:
            pass


def plan(root, index_file):
    idx = load(index_file)
    files = {}
    for rel, full in project_files(root):
        try:
            with open(full, encoding="utf-8", errors="replace") as f:
                text = f.read()
        except OSError:
            continue
        files[rel] = (hashlib.sha1(text.encode("utf-8", "replace")).hexdigest(), text)
    # keep only chunks whose file is unchanged
    kept = [c for c in idx["chunks"] if c["file"] in files and files[c["file"]][0] == c["sha"]]
    done = {c["file"] for c in kept}
    idx["chunks"] = kept
    save(index_file, idx)
    todo, total = [], len(kept)
    for rel, (sha, text) in files.items():
        if rel in done:
            continue
        lines = text.split("\n")
        step = CHUNK_LINES - OVERLAP
        for start in range(0, max(len(lines), 1), step):
            if total >= MAX_CHUNKS:
                break
            body = "\n".join(lines[start:start + CHUNK_LINES]).strip()
            if not body:
                continue
            todo.append({"file": rel, "start": start + 1, "end": min(start + CHUNK_LINES, len(lines)), "sha": sha,
                         "text": f"File: {rel}\n{body}"[:2000]})
            total += 1
    print(json.dumps({"todo": todo, "total": total, "capped": total >= MAX_CHUNKS}))


def add(index_file):
    idx = load(index_file)
    new = json.load(sys.stdin)
    idx["chunks"] += [{"file": c["file"], "start": c["start"], "end": c["end"], "sha": c["sha"],
                       "vec": [round(x, 5) for x in c["vec"]]} for c in new]
    save(index_file, idx)
    print(json.dumps({"added": len(new), "total": len(idx["chunks"])}))


def search(index_file, k):
    idx = load(index_file)
    q = json.load(sys.stdin)
    scored = []
    for c in idx["chunks"]:
        v = c["vec"]
        scored.append((sum(a * b for a, b in zip(q, v)), c))
    scored.sort(key=lambda s: s[0], reverse=True)
    print(json.dumps([{"file": c["file"], "start": c["start"], "end": c["end"], "score": round(s, 3)}
                      for s, c in scored[:k]]))


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "plan":
        plan(sys.argv[2], sys.argv[3])
    elif cmd == "add":
        add(sys.argv[2])
    elif cmd == "search":
        search(sys.argv[2], int(sys.argv[3]))
