#!/bin/bash
set -e

ACCOUNT="${1}"

if [ -z "$ACCOUNT" ]; then
  echo "Użycie: bash run.sh <nazwa_konta>"
  exit 1
fi

cd /app

# Wyznacz prefix pliku na podstawie konta
case "$ACCOUNT" in
  konto) FILE_PREFIX="transactions" ;;
  kk)    FILE_PREFIX="kk_transactions" ;;
  *)
    echo "Nieznane konto: $ACCOUNT"
    exit 1
    ;;
esac

DZIS=$(date +"%Y_%m_%d")
PLIK="${ACCOUNT}/${FILE_PREFIX}_${DZIS}.csv"

echo "=== [$ACCOUNT] Uruchamiam download.js ==="
xvfb-run -a /usr/local/bin/node src/scripts/download.js "$ACCOUNT"

echo "=== [$ACCOUNT] Uruchamiam diff.php ==="
php src/scripts/diff.php "$ACCOUNT"

if [ -f "$PLIK" ]; then
  echo "=== [$ACCOUNT] Znaleziono $PLIK, uruchamiam import.js ==="
  xvfb-run -a /usr/local/bin/node src/scripts/import.js "$ACCOUNT"
  echo "=== [$ACCOUNT] Usuwam $PLIK ==="
  rm "$PLIK"
else
  echo "=== [$ACCOUNT] Brak pliku $PLIK - pomijam import.js ==="
fi
