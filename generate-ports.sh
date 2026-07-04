#!/usr/bin/env bash
set -euo pipefail

#
# Generates docs/architecture/ports.md by scanning all Processity.* docker-compose files.
# Run after gather-docs.sh, or standalone.
#
# Usage: bash generate-ports.sh
#

PROJECTS_DIR="/Users/michael/Projects"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_FILE="$SCRIPT_DIR/docs/architecture/ports.md"

mkdir -p "$(dirname "$OUT_FILE")"

# Temp file: each line is service\tenv\thost_port\tcontainer_port\ttype
TMPDATA=$(mktemp)
trap 'rm -f "$TMPDATA" "${TMPDATA}.warnings"' EXIT

touch "${TMPDATA}.warnings"

repo_to_label() {
  echo "$1" \
    | sed 's/^Processity\.//' \
    | sed 's/\./ /g' \
    | sed 's/\([a-z]\)\([A-Z]\)/\1 \2/g'
}

classify_service() {
  local svc_name="$1" container_port="$2"
  local lower
  lower=$(echo "$svc_name" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *-db|*-database|*database*|*pgbouncer*|*seed*) echo "db"; return ;;
    *redis*) echo "infra"; return ;;
    *rabbitmq*) echo "infra"; return ;;
    *apertus*) echo "infra"; return ;;
    *sonarqube*|*allure*|*gitea*) echo "infra"; return ;;
    *monitoring*|*aggregator*|*dashboard*) echo "infra"; return ;;
    *telemetry*) echo "infra"; return ;;
  esac
  if [ "$container_port" = "5432" ]; then
    echo "db"
  elif [ "$container_port" = "5672" ] || [ "$container_port" = "15672" ] || [ "$container_port" = "6379" ]; then
    echo "infra"
  else
    echo "api"
  fi
}

build_display_name() {
  local label="$1" svc_name="$2"
  local lower
  lower=$(echo "$svc_name" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *-db|*-database|*database*) echo "$label DB" ;;
    *pgbouncer*|*seed*) echo "$label Seed DB" ;;
    *redis*) echo "$label Redis" ;;
    *rabbitmq*) echo "RabbitMQ" ;;
    *apertus*) echo "Apertus" ;;
    *sonarqube*) echo "SonarQube" ;;
    *allure*) echo "Allure" ;;
    *gitea*) echo "Gitea" ;;
    *telemetry*api*|*telemetry*server*) echo "Telemetry API" ;;
    *telemetry*db*) echo "Telemetry DB" ;;
    *aggregator*) echo "Monitoring Aggregator" ;;
    *dashboard*) echo "Monitoring Dashboard" ;;
    *) echo "$label" ;;
  esac
}

# Determine display name for WebApp.Angular sub-apps from path
webapp_sub_app() {
  local compose_file="$1"
  case "$compose_file" in
    *TestDataGenerator*) echo "Test Data Generator" ;;
    *booking*) echo "Booking App" ;;
    *planning/local*|*planning/dev*) echo "Planning App" ;;
    *immobroker/local*|*immobroker/dev*) echo "ImmoBroker App" ;;
    *instructor*) echo "Instructor App" ;;
    *elearning*) echo "E-learning App" ;;
    *parents*) echo "Parents App" ;;
    *relatives*) echo "Relatives App" ;;
    *referrer*) echo "Referrer Portal" ;;
    *web-app/showcase*) echo "Web App Showcase" ;;
    *web-app*) echo "Web App" ;;
    *) echo "" ;;
  esac
}

determine_env() {
  local f="$1"
  case "$f" in
    */local/*|*/Local/*) echo "local" ;;
    */dev/*|*/Dev/*|*/dev_local_exec/*) echo "dev" ;;
    */uat/*|*/UAT/*) echo "uat" ;;
    */release/*) echo "release" ;;
    */showcase/*) echo "showcase" ;;
    *) echo "default" ;;
  esac
}

extract_ports() {
  # Extracts "service_name\thost_port\tcontainer_port" lines from a docker-compose file.
  # Uses awk to avoid bash read stripping whitespace. POSIX-compatible regex (no +).
  awk '
    { gsub(/\r/, "") }
    /^  [a-zA-Z]/ && /:$/ {
      svc = $0
      gsub(/^[ \t]+/, "", svc)
      gsub(/:$/, "", svc)
    }
    /^[ \t]*-/ && /[0-9][0-9]*:[0-9][0-9]*/ {
      s = $0
      gsub(/[^0-9:]/, " ", s)
      n = split(s, parts, " ")
      for (i = 1; i <= n; i++) {
        if (parts[i] ~ /^[0-9][0-9]*:[0-9][0-9]*$/) {
          split(parts[i], p, ":")
          if (svc != "") print svc "\t" p[1] "\t" p[2]
          break
        }
      }
    }
  ' "$1"
}

process_compose() {
  local compose_file="$1" display_override="$2" type_override="$3"

  local env
  env=$(determine_env "$compose_file")

  # Skip release (same as uat typically)
  [ "$env" = "release" ] && return

  local local_path="${compose_file#$PROJECTS_DIR/}"
  local repo_name
  repo_name=$(echo "$local_path" | cut -d/ -f1)
  local label
  label=$(repo_to_label "$repo_name")

  extract_ports "$compose_file" | while IFS=$'\t' read -r svc_name host_port container_port; do
    local svc_type display_name
    if [ -n "$type_override" ]; then
      svc_type="$type_override"
    else
      svc_type=$(classify_service "$svc_name" "$container_port")
    fi

    if [ -n "$display_override" ]; then
      display_name="$display_override"
    else
      display_name=$(build_display_name "$label" "$svc_name")
    fi

    printf '%s\t%s\t%s\t%s\t%s\n' "$display_name" "$env" "$host_port" "$container_port" "$svc_type" >> "$TMPDATA"

    if [ "$env" = "uat" ]; then
      echo "$display_name exposes port $host_port in UAT" >> "${TMPDATA}.warnings"
    fi
  done
}

# --- Scan standard repo docker-compose files ---
# Skip WebApp.Angular here (handled separately for sub-app naming)
while IFS= read -r compose_file; do
  [ -f "$compose_file" ] || continue
  _path="${compose_file#$PROJECTS_DIR/}"
  repo_name=$(echo "$_path" | cut -d/ -f1)

  # Skip WebApp.Angular — handled below with sub-app detection
  [ "$repo_name" = "Processity.WebApp.Angular" ] && continue

  # Skip TestDataGenerator — handled below
  case "$compose_file" in *TestDataGenerator*) continue ;; esac

  process_compose "$compose_file" "" ""
done < <(find "$PROJECTS_DIR" \( -path "*/Processity.*/.docker/*/docker-compose.yml" -o -path "*/Processity.*/docker-compose.yml" \) 2>/dev/null | grep -v node_modules | sort)

# --- Scan WebApp.Angular sub-apps ---
while IFS= read -r compose_file; do
  [ -f "$compose_file" ] || continue
  sub_app=$(webapp_sub_app "$compose_file")
  [ -z "$sub_app" ] && continue
  process_compose "$compose_file" "$sub_app" "frontend"
done < <(find "$PROJECTS_DIR/Processity.WebApp.Angular/.docker" -name "docker-compose.yml" 2>/dev/null | sort)

# --- Scan TestDataGenerator ---
while IFS= read -r compose_file; do
  [ -f "$compose_file" ] || continue
  process_compose "$compose_file" "Test Data Generator" "frontend"
done < <(find "$PROJECTS_DIR/Processity.Backend/TestDataGenerator" -name "docker-compose.yml" 2>/dev/null | sort)

# --- Scan Calendar/Host (if separate from Calendar) ---
while IFS= read -r compose_file; do
  [ -f "$compose_file" ] || continue
  process_compose "$compose_file" "" ""
done < <(find "$PROJECTS_DIR/Processity.Calendar/Host/.docker" -name "docker-compose.yml" 2>/dev/null | sort)

# --- Lookups ---

lookup() {
  local svc="$1" env="$2" field="$3"
  awk -F'\t' -v s="$svc" -v e="$env" '$1==s && $2==e { print $'"$field"'; exit }' "$TMPDATA"
}

lookup_any() {
  local svc="$1" field="$2"
  awk -F'\t' -v s="$svc" '$1==s { print $'"$field"'; exit }' "$TMPDATA"
}

# Unique services in order
UNIQUE_SERVICES=()
while IFS= read -r svc; do
  UNIQUE_SERVICES+=("$svc")
done < <(awk -F'\t' '!seen[$1]++ { print $1 }' "$TMPDATA")

# Detect conflicts: different services sharing the same host port in the same env.
# Deduplicate rows first (dev + dev_local_exec produce duplicates).
CONFLICTS=()
DEDUPED=$(mktemp)
awk -F'\t' '!seen[$1 FS $2 FS $3]++ { print }' "$TMPDATA" > "$DEDUPED"

for env_name in local dev; do
  prev_port=""
  prev_svc=""
  while IFS=$'\t' read -r port svc; do
    if [ "$port" = "$prev_port" ] && [ "$svc" != "$prev_svc" ]; then
      CONFLICTS+=("Port $port ($env_name): $prev_svc + $svc")
    fi
    prev_port="$port"
    prev_svc="$svc"
  done < <(awk -F'\t' -v e="$env_name" '$2==e { print $3 "\t" $1 }' "$DEDUPED" | sort -t$'\t' -k1,1n -k2,2)
done
rm -f "$DEDUPED"

# --- Write markdown ---

{
  cat <<'HEADER'
---
type: architecture
---

# Service Ports Overview

> Auto-generated by `generate-ports.sh` — do not edit manually.

Host port allocations for local and dev environments. UAT should not expose any ports (blocked by firewall).

## Convention

- **API services**: 5043–5070 (host) → 8080 (container)
- **Databases**: API port + 1000 (e.g. API on 5045 → DB on 6045)
- **Frontend apps**: 4200–4209 (dev), 5200–5210 (prod)
- **Infrastructure**: well-known ports (5672, 15672, 6379)

HEADER

  render_section() {
    local section_type="$1" title="$2" show_container="$3"

    echo "## $title"
    echo ""
    if [ "$section_type" = "db" ]; then
      echo "All databases expose 5432 inside the container. Host port = API port + 1000."
      echo ""
    fi
    if [ "$show_container" = "yes" ]; then
      echo "| Service | Local | Dev | Container |"
      echo "|---------|-------|-----|-----------|"
    else
      echo "| Service | Local | Dev |"
      echo "|---------|-------|-----|"
    fi

    for svc in "${UNIQUE_SERVICES[@]}"; do
      svc_type=$(lookup_any "$svc" 5)
      [ "$svc_type" = "$section_type" ] || continue
      local_port=$(lookup "$svc" "local" 3)
      dev_port=$(lookup "$svc" "dev" 3)
      cport=$(lookup_any "$svc" 4)
      [ -z "$local_port" ] && local_port="—"
      [ -z "$dev_port" ] && dev_port="—"
      if [ "$show_container" = "yes" ]; then
        echo "| $svc | $local_port | $dev_port | $cport |"
      else
        echo "| $svc | $local_port | $dev_port |"
      fi
    done
    echo ""
  }

  render_section "api" "🛜 API Services" "yes"
  render_section "db" "🛢️ Databases" "no"
  render_section "frontend" "📱 Frontend / Web Apps" "yes"
  render_section "infra" "🛤️ Infrastructure" "yes"

  # Warnings (UAT port exposure)
  if [ -s "${TMPDATA}.warnings" ]; then
    echo "## 🚨 Warnings: UAT Port Exposure"
    echo ""
    echo "The following services expose ports in UAT. These should be removed — UAT ports are blocked by firewall."
    echo ""
    echo "| Service | Exposed Port |"
    echo "|---------|-------------|"
    awk -F' exposes port ' '{ print "| " $1 " | " $2 " |" }' "${TMPDATA}.warnings"
    echo ""
  fi

  # Conflicts
  if [ ${#CONFLICTS[@]} -gt 0 ]; then
    echo "## ⚡️ Port Conflicts"
    echo ""
    echo "| Conflict |"
    echo "|----------|"
    for c in "${CONFLICTS[@]}"; do
      echo "| $c |"
    done
    echo ""
  fi

  cat <<'RANGES'
## Port Ranges

| Range | Purpose |
|-------|---------|
| 3000 | Telemetry API |
| 4200–4205 | Angular dev servers |
| 5001 | API Gateway |
| 5043–5064 | API services (sequential) |
| 5070 | Docs Viewer |
| 5153 | Apertus |
| 5200–5210 | Frontend production builds |
| 5672 / 15672 | RabbitMQ |
| 6043–6064 | PostgreSQL databases (API port + 1000) |
| 6145 | Backend Seed DB |
| 6379 | Redis |
RANGES

} > "$OUT_FILE"

warn_count=$(wc -l < "${TMPDATA}.warnings" | tr -d ' ')
echo "Generated: $OUT_FILE"
echo "  Services: ${#UNIQUE_SERVICES[@]}"
echo "  Warnings: $warn_count"
echo "  Conflicts: ${#CONFLICTS[@]}"
