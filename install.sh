#!/usr/bin/env bash
# Install LaTeX Voice into any Obsidian vault:
#   ./install.sh /path/to/vault
# Copies the built plugin and enables it in community-plugins.json.
set -euo pipefail

VAULT="${1:?Usage: ./install.sh /path/to/obsidian/vault}"
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="$VAULT/.obsidian/plugins/latex-voice"

[ -f "$SRC/main.js" ] || { echo "Run npm run build first"; exit 1; }
[ -d "$VAULT" ] || { echo "Vault not found: $VAULT"; exit 1; }

mkdir -p "$DEST"
cp "$SRC/main.js" "$SRC/manifest.json" "$DEST/"

# enable in community-plugins.json (create or merge)
CP="$VAULT/.obsidian/community-plugins.json"
mkdir -p "$(dirname "$CP")"
if [ -f "$CP" ]; then
	python3 - "$CP" <<'PY'
import json, sys
p = sys.argv[1]
data = json.load(open(p))
if "latex-voice" not in data:
    data.append("latex-voice")
json.dump(data, open(p, "w"), indent=2)
PY
else
	echo '["latex-voice"]' > "$CP"
fi

echo "Installed and enabled in: $VAULT"
echo "Open the vault → Settings → LaTeX Voice → paste your OpenAI API key."
