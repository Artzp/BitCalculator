#!/usr/bin/env bash
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

(
  cd "$SCRIPT_DIR"
  python3 ./crafting_data.py
  python3 ./travelers_data.py
)

echo "Writing game data version..."
if cd "$SCRIPT_DIR/BitCraft_GameData" 2>/dev/null; then
  commitDate=$(git show -s --format=%ci 2>/dev/null | cut -f1 -d' ' || date +%F)
  commitHash=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  cd - >/dev/null
else
  commitDate=$(date +%F)
  commitHash="unknown"
fi

# Write to legacy location
mkdir -p "$SCRIPT_DIR/../BitPlanner"
echo "${commitDate}" > "$SCRIPT_DIR/../BitPlanner/data_version.txt"

# Also write JSON version file into app public data for cache busting
PUBLIC_DATA_DIR="$SCRIPT_DIR/../bitcraft-planner/public/data"
mkdir -p "$PUBLIC_DATA_DIR"
cat > "$PUBLIC_DATA_DIR/data_version.json" <<EOF
{
  "date": "${commitDate}",
  "commit": "${commitHash}"
}
EOF

echo "Data generation complete. Version: ${commitDate} (${commitHash})"
