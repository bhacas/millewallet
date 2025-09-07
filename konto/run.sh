#!/bin/bash
set -e

cd /app/kk
DZIS=$(date +"%Y_%m_%d")
PLIK="transactions_${DZIS}.csv"

echo "Uruchamiam millenium.js..."
xvfb-run -a /usr/local/bin/node millenium.js

echo "Uruchamiam diff.php..."
php diff.php

if [ -f "$PLIK" ]; then
  echo "Znaleziono $PLIK, uruchamiam importer.js..."
  xvfb-run -a /usr/local/bin/node importer.js
  echo "Usuwam $PLIK..."
  rm "$PLIK"
else
  echo "Brak pliku $PLIK - pomijam importer.js"
fi