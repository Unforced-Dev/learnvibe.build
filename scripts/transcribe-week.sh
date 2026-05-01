#!/usr/bin/env bash
# transcribe-week.sh — local CLI for the Monday-night recording → transcript
# → lesson-page pipeline.
#
# Usage:
#   ./scripts/transcribe-week.sh <recording-url> <cohort-slug> <week-number>
#
# Optional flags (pass before positional args):
#   --sections <file>    Section-marker JSON for the cleanup pass
#                        (see scripts/lib/transcript_clean.py for format)
#   --title <string>     Lesson title for the transcript header. Default: pulled
#                        from the lesson via MCP `get_lesson`.
#   --skip-upload        Run the pipeline locally but don't POST to MCP.
#                        Cleaned markdown stays in the temp dir.
#   --keep-temp          Don't delete the temp dir on completion (useful for
#                        debugging). Default: delete on success.
#   --endpoint <url>     MCP endpoint (default: https://learnvibe.build/mcp).
#
# Required tools (all already installed on Aaron's laptop):
#   yt-dlp, ffmpeg, parakeet-mlx, python3, jq, curl
#
# Auth — bearer token resolution order:
#   1. $LVB_MCP_TOKEN env var
#   2. ~/.claude/.credentials.json → .mcpOAuth["learnvibe|*"].accessToken
#      (populated by Claude Code's MCP OAuth flow)
#   3. Error with setup instructions.
#
# Idempotency: this calls `admin_upsert_lesson`, which updates by
# (cohortSlug, weekNumber). Re-running on the same week overwrites the
# existing transcript + recording URL — it does NOT create duplicates.

set -euo pipefail

# ---------- defaults ----------
SECTIONS_FILE=""
TITLE=""
SKIP_UPLOAD=0
KEEP_TEMP=0
MCP_ENDPOINT="${LVB_MCP_ENDPOINT:-https://learnvibe.build/mcp}"

# ---------- arg parsing ----------
POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --sections)
      SECTIONS_FILE="$2"; shift 2;;
    --title)
      TITLE="$2"; shift 2;;
    --skip-upload)
      SKIP_UPLOAD=1; shift;;
    --keep-temp)
      KEEP_TEMP=1; shift;;
    --endpoint)
      MCP_ENDPOINT="$2"; shift 2;;
    -h|--help)
      sed -n '1,40p' "$0" | sed 's/^# \{0,1\}//'
      exit 0;;
    --*)
      echo "unknown flag: $1" >&2; exit 2;;
    *)
      POSITIONAL+=("$1"); shift;;
  esac
done

if [[ ${#POSITIONAL[@]} -ne 3 ]]; then
  echo "usage: $0 [flags] <recording-url> <cohort-slug> <week-number>" >&2
  echo "       $0 --help" >&2
  exit 2
fi

RECORDING_URL="${POSITIONAL[0]}"
COHORT_SLUG="${POSITIONAL[1]}"
WEEK_NUMBER="${POSITIONAL[2]}"

if ! [[ "$WEEK_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "error: week-number must be a positive integer (got: $WEEK_NUMBER)" >&2
  exit 2
fi

if [[ -n "$SECTIONS_FILE" && ! -f "$SECTIONS_FILE" ]]; then
  echo "error: --sections file not found: $SECTIONS_FILE" >&2
  exit 2
fi

# ---------- tool checks ----------
need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: required tool not on PATH: $1" >&2
    exit 1
  fi
}
need yt-dlp
need ffmpeg
need parakeet-mlx
need python3
need jq
need curl

# ---------- token resolution ----------
TOKEN=""
if [[ -n "${LVB_MCP_TOKEN:-}" ]]; then
  TOKEN="$LVB_MCP_TOKEN"
elif [[ -f "$HOME/.claude/.credentials.json" ]]; then
  # Walk mcpOAuth entries; pick the first non-empty accessToken whose key starts
  # with "learnvibe|". Quietly returns "" if none.
  TOKEN="$(jq -r '
    (.mcpOAuth // {}) | to_entries
    | map(select((.key | startswith("learnvibe|")) and ((.value.accessToken // "") != "")))
    | (.[0].value.accessToken // "")
  ' "$HOME/.claude/.credentials.json" 2>/dev/null || echo "")"
fi

if [[ $SKIP_UPLOAD -eq 0 && -z "$TOKEN" ]]; then
  cat >&2 <<EOF
error: no LVB MCP bearer token found.

Set one of:
  - export LVB_MCP_TOKEN=lvb_<your_api_key>
    (mint at https://learnvibe.build/settings/api-keys)
  - or complete the Claude Code MCP OAuth flow for the 'learnvibe' server,
    which writes a token to ~/.claude/.credentials.json.

Or pass --skip-upload to run the local pipeline without uploading.
EOF
  exit 1
fi

# ---------- temp dir ----------
WORK_DIR="$(mktemp -d -t lvb-transcribe-XXXXXX)"
cleanup() {
  if [[ $KEEP_TEMP -eq 1 ]]; then
    echo "→ keeping temp dir: $WORK_DIR" >&2
  else
    rm -rf "$WORK_DIR"
  fi
}
trap cleanup EXIT

echo "→ work dir: $WORK_DIR" >&2

# ---------- step 1: download ----------
VIDEO_PATH="$WORK_DIR/recording.mp4"
echo "→ downloading recording…" >&2
yt-dlp --no-warnings -o "$VIDEO_PATH" "$RECORDING_URL"
if [[ ! -s "$VIDEO_PATH" ]]; then
  echo "error: yt-dlp produced no output for $RECORDING_URL" >&2
  exit 1
fi

# ---------- step 2: extract audio ----------
AUDIO_PATH="$WORK_DIR/audio.mp3"
echo "→ extracting audio…" >&2
ffmpeg -y -loglevel error -i "$VIDEO_PATH" \
  -vn -acodec mp3 -ab 64k -ac 1 -ar 16000 \
  "$AUDIO_PATH"

# ---------- step 3: transcribe ----------
echo "→ transcribing with parakeet-mlx (this can take a few minutes)…" >&2
# parakeet-mlx writes <basename>.srt next to the input by default.
parakeet-mlx --output-format srt "$AUDIO_PATH" >/dev/null
SRT_PATH="$WORK_DIR/audio.srt"
if [[ ! -s "$SRT_PATH" ]]; then
  echo "error: parakeet-mlx didn't produce $SRT_PATH" >&2
  exit 1
fi

# ---------- step 4: optionally fetch existing lesson title ----------
mcp_call() {
  # mcp_call <method> <params-json> — prints the .result on stdout, or fails.
  local method="$1"; local params="$2"
  local resp
  resp="$(curl -sS -X POST "$MCP_ENDPOINT" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$method\",\"params\":$params}")"
  if echo "$resp" | jq -e '.error' >/dev/null 2>&1; then
    echo "MCP error from $method:" >&2
    echo "$resp" | jq '.error' >&2
    return 1
  fi
  if echo "$resp" | jq -e '.result.isError == true' >/dev/null 2>&1; then
    echo "MCP tool error from $method:" >&2
    echo "$resp" | jq -r '.result.content[0].text' >&2
    return 1
  fi
  echo "$resp"
}

if [[ -z "$TITLE" && $SKIP_UPLOAD -eq 0 ]]; then
  echo "→ fetching lesson title…" >&2
  PARAMS=$(jq -nc \
    --arg slug "$COHORT_SLUG" \
    --argjson week "$WEEK_NUMBER" \
    '{name:"get_lesson",arguments:{cohortSlug:$slug,weekNumber:$week}}')
  if RESP="$(mcp_call tools/call "$PARAMS" 2>/dev/null)"; then
    TITLE="$(echo "$RESP" | jq -r '.result.content[0].text' | jq -r '.title // ""')"
  else
    echo "  (lesson not found yet — proceeding with no title in header)" >&2
  fi
fi

# ---------- step 5: clean ----------
TRANSCRIPT_PATH="$WORK_DIR/transcript.md"
echo "→ cleaning transcript…" >&2
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_ARGS=("$SCRIPT_DIR/lib/transcript_clean.py" "$SRT_PATH" "$TRANSCRIPT_PATH" --week "$WEEK_NUMBER")
if [[ -n "$TITLE" ]]; then
  PYTHON_ARGS+=(--title "$TITLE")
fi
if [[ -n "$SECTIONS_FILE" ]]; then
  PYTHON_ARGS+=(--sections "$SECTIONS_FILE")
fi
python3 "${PYTHON_ARGS[@]}"

if [[ ! -s "$TRANSCRIPT_PATH" ]]; then
  echo "error: cleanup produced no transcript at $TRANSCRIPT_PATH" >&2
  exit 1
fi

# ---------- step 6: upload via MCP ----------
if [[ $SKIP_UPLOAD -eq 1 ]]; then
  # Copy result somewhere the user can find it before temp dir is deleted.
  KEEP_TEMP=1
  echo "→ skipping upload (--skip-upload). Cleaned transcript: $TRANSCRIPT_PATH" >&2
  exit 0
fi

echo "→ uploading to LVB MCP…" >&2
PARAMS=$(jq -nc \
  --arg slug "$COHORT_SLUG" \
  --argjson week "$WEEK_NUMBER" \
  --arg url  "$RECORDING_URL" \
  --rawfile body "$TRANSCRIPT_PATH" \
  '{
     name: "admin_upsert_lesson",
     arguments: {
       cohortSlug: $slug,
       weekNumber: $week,
       recordingUrl: $url,
       transcriptMarkdown: $body
     }
   }')
RESP="$(mcp_call tools/call "$PARAMS")"
ACTION="$(echo "$RESP" | jq -r '.result.content[0].text' | jq -r '.action // "unknown"')"
LESSON_ID="$(echo "$RESP" | jq -r '.result.content[0].text' | jq -r '.id // "?"')"

echo "✓ lesson $ACTION (id=$LESSON_ID, week=$WEEK_NUMBER, cohort=$COHORT_SLUG)" >&2
echo "  recording: $RECORDING_URL" >&2
echo "  transcript: $(wc -c < "$TRANSCRIPT_PATH" | tr -d ' ') bytes" >&2
