#!/usr/bin/env bash
#
# Reverse-copy: push frontmatter changes from docs/ back to source repos.
# Only copies files that have frontmatter (start with '---') and where the
# source file does NOT yet have frontmatter.
#
# Usage:
#   bash push-types.sh          # dry-run (default)
#   bash push-types.sh --apply  # actually copy
#
set -euo pipefail

PROJECTS_DIR="/Users/michael/Projects"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCS_DIR="$SCRIPT_DIR/docs"
DRY_RUN=true
UPDATED=0
SKIPPED=0
NOT_FOUND=0

if [ "${1:-}" = "--apply" ]; then
  DRY_RUN=false
fi

# Derive slug from repo directory name (same as gather-docs.sh)
repo_to_slug() {
  echo "$1" \
    | sed 's/^Processity\.//' \
    | tr '.' '-' \
    | tr '[:upper:]' '[:lower:]'
}

# Build slug → repo path mapping as parallel arrays (no associative arrays)
SLUGS=()
REPO_PATHS=()
for repo_path_raw in "$PROJECTS_DIR"/Processity.*/; do
  [ -d "$repo_path_raw" ] || continue
  repo_path="${repo_path_raw%/}"
  repo_name=$(basename "$repo_path")
  [ "$repo_name" = "Processity.Docs" ] && continue
  slug=$(repo_to_slug "$repo_name")
  SLUGS+=("$slug")
  REPO_PATHS+=("$repo_path")
done

# Look up repo path by slug
slug_to_repo() {
  local target="$1"
  for i in "${!SLUGS[@]}"; do
    if [ "${SLUGS[$i]}" = "$target" ]; then
      echo "${REPO_PATHS[$i]}"
      return 0
    fi
  done
  return 1
}

# For a gathered file at docs/<slug>/<rel>, find the source file in the repo.
# gather-docs.sh strips .claude/, .docs/, docs/ prefixes, so we check all candidates.
find_source() {
  local repo_path="$1"
  local rel="$2"

  for prefix in "" ".claude/" ".docs/" "docs/"; do
    local candidate="$repo_path/${prefix}${rel}"
    if [ -f "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

has_frontmatter() {
  head -1 "$1" 2>/dev/null | grep -q '^---'
}

echo "Processity Docs — push frontmatter to source repos"
echo "==================================================="
if $DRY_RUN; then
  echo "Mode: DRY RUN (use --apply to write)"
else
  echo "Mode: APPLY"
fi
echo ""

# Walk all gathered .md files
while IFS= read -r gathered_file; do
  rel="${gathered_file#$DOCS_DIR/}"

  # Extract slug (first path segment)
  slug="${rel%%/*}"
  file_rel="${rel#$slug/}"

  # Skip root-level files (index.md etc.)
  if [ "$slug" = "$rel" ]; then
    continue
  fi

  # Skip files without frontmatter in docs/
  if ! has_frontmatter "$gathered_file"; then
    continue
  fi

  # Find the source repo
  repo_path=$(slug_to_repo "$slug") || true
  if [ -z "$repo_path" ]; then
    continue
  fi

  # Find the source file
  source_file=$(find_source "$repo_path" "$file_rel") || true
  if [ -z "$source_file" ]; then
    echo "  ✗ NOT FOUND: $rel"
    NOT_FOUND=$((NOT_FOUND + 1))
    continue
  fi

  # Skip if source already has frontmatter
  if has_frontmatter "$source_file"; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if $DRY_RUN; then
    echo "  → $source_file"
    UPDATED=$((UPDATED + 1))
  else
    # Prepend frontmatter from gathered file to source file
    tmp="${source_file}.tmp"
    # Extract frontmatter block, then append original source content
    awk '
      NR==1 && /^---/ { print; in_fm=1; next }
      in_fm && /^---/ { print; print ""; in_fm=0; done_fm=1; next }
      in_fm { print; next }
      done_fm { exit }
    ' "$gathered_file" > "$tmp"
    cat "$source_file" >> "$tmp"
    mv "$tmp" "$source_file"
    echo "  ✓ $source_file"
    UPDATED=$((UPDATED + 1))
  fi
done < <(find "$DOCS_DIR" -name '*.md' | sort)

echo ""
echo "Done. Updated: $UPDATED, Skipped (already has frontmatter): $SKIPPED, Not found: $NOT_FOUND"
if $DRY_RUN; then
  echo ""
  echo "Run with --apply to write changes."
fi
