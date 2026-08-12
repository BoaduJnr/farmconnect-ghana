#!/usr/bin/env bash
set -e
BASE="$(cd "$(dirname "$0")" && pwd -W)"
name="$1"
WIN="$BASE"
ENC=$(echo "$WIN" | sed 's/ /%20/g')
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$BASE/$name.pdf" \
  "file:///$ENC/$name.html" 2>&1 | tail -5
echo "-> $name.pdf"
