#!/bin/sh
# Installiert Piper und die weiblichen Stimmen Kerstin und Eva für ACP Pulse.
# Legt alles nach ~/.local/share/acp-piper und startet den Sprachdienst auf Port 5000.
#
#   sh scripts/install-piper.sh
#   sh scripts/install-piper.sh --no-start
#
# In der Regie unter Dienste → Piper die Adresse eintragen:
#   http://<dieser-rechner>:5000
# Aus dem Pulse-Container ist das nicht 127.0.0.1, sondern die Host-Adresse.

set -eu

ROOT="${PIPER_ROOT:-$HOME/.local/share/acp-piper}"
PORT="${PIPER_PORT:-5000}"
START=1
if [ "${1:-}" = "--no-start" ]; then
  START=0
fi

arch="$(uname -m)"
case "$arch" in
  x86_64) asset="piper_linux_x86_64.tar.gz" ;;
  aarch64|arm64) asset="piper_linux_aarch64.tar.gz" ;;
  *)
    echo "Diese Architektur kann das Skript nicht: $arch" >&2
    exit 1
    ;;
esac

release="2023.11.14-2"
base="https://github.com/rhasspy/piper/releases/download/${release}"
voices="https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE"

mkdir -p "$ROOT/voices"
cd "$ROOT"

if [ ! -x "$ROOT/piper/piper" ]; then
  echo "Lade Piper ${release} (${arch})"
  curl -fsSL "$base/$asset" -o piper.tar.gz
  tar -xzf piper.tar.gz
  rm -f piper.tar.gz
fi

fetch_voice() {
  name="$1"
  path="$2"
  if [ ! -f "$ROOT/voices/${name}.onnx" ]; then
    echo "Lade Stimme ${name}"
    curl -fsSL "$voices/$path/${name}.onnx" -o "$ROOT/voices/${name}.onnx"
    curl -fsSL "$voices/$path/${name}.onnx.json" -o "$ROOT/voices/${name}.onnx.json"
  fi
}

fetch_voice "de_DE-kerstin-low" "kerstin/low"
fetch_voice "de_DE-eva_k-x_low" "eva_k/x_low"

cat > "$ROOT/env" <<EOF
PIPER_ROOT=$ROOT
PIPER_BIN=$ROOT/piper/piper
PIPER_PORT=$PORT
PIPER_HOST=0.0.0.0
EOF

echo "Piper liegt in $ROOT"
echo "Stimmen: Kerstin, Eva"

if [ "$START" = "0" ]; then
  echo "Start später: PIPER_ROOT=$ROOT node scripts/piper-server.mjs"
  exit 0
fi

script_dir="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
if [ ! -f "$script_dir/piper-server.mjs" ]; then
  echo "piper-server.mjs fehlt neben diesem Skript." >&2
  exit 1
fi

if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
  echo "Sprachdienst läuft schon auf Port ${PORT}."
else
  PIPER_ROOT="$ROOT" PIPER_PORT="$PORT" nohup node "$script_dir/piper-server.mjs" > "$ROOT/piper.log" 2>&1 &
  echo $! > "$ROOT/piper.pid"
  sleep 0.4
  echo "Sprachdienst gestartet, Protokoll $ROOT/piper.log"
fi

echo "In der Regie eintragen: http://<dieser-rechner>:${PORT}"
echo "Kerstin ist die ruhige Stimme, Eva die hellere."
