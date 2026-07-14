#!/usr/bin/env bash
# Installs the humanize-code skill into your Claude Code skills directory.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}/humanize-code"

mkdir -p "$DEST"
cp "$SRC/SKILL.md" "$DEST/"
rm -rf "$DEST/references"
cp -R "$SRC/references" "$DEST/references"

echo "installed humanize-code -> $DEST"
echo "Claude Code loads skills dynamically, no restart needed. Invoke with /humanize-code"
