#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
SOURCE="$SOURCE_DIR/codex-sync"
BIN="$HOME/.local/bin"
LINK="$BIN/codex-sync"

if [ -e "$LINK" ] || [ -L "$LINK" ]; then
  if [ ! -L "$LINK" ] || [ "$(readlink -- "$LINK")" != "$SOURCE" ]; then
    echo "ERROR: Refusing to overwrite existing path: $LINK" >&2
    exit 1
  fi
fi

chmod +x "$SOURCE"
mkdir -p -- "$BIN"
if [ ! -L "$LINK" ]; then
  ln -s -- "$SOURCE" "$LINK"
fi

PATH_LINE='case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) export PATH="$HOME/.local/bin:$PATH" ;; esac # codex-sync'
for profile in "$HOME/.profile" "$HOME/.bashrc"; do
  if ! grep -Fqx -- "$PATH_LINE" "$profile" 2>/dev/null; then
    printf '\n%s\n' "$PATH_LINE" >> "$profile"
  fi
done

printf 'Installed: %s -> %s\n' "$LINK" "$SOURCE"
printf 'Run source ~/.bashrc in your current shell, or open a new Bash, then run codex-sync.\n'
