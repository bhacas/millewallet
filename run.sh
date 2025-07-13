#!/bin/bash

# Ustawienie dzisiejszej daty w formacie YYYY_MM_DD
DZIS=$(date +"%Y_%m_%d")
PLIK="transactions_${DZIS}.csv"

# Uruchomienie node millenium.js
echo "Uruchamiam millenium.js..."
xvfb-run -a node millenium.js

# Uruchomienie php diff.php
echo "Uruchamiam diff.php..."
php diff.php

# Sprawdzenie, czy istnieje plik transactions_YYYY_MM_DD.csv
if [ -f "$PLIK" ]; then
  echo "Znaleziono $PLIK, uruchamiam importer.js..."
  xvfb-run -a node importer.js
  echo "Usuwam $PLIK..."
  rm "$PLIK"
else
  echo "Brak pliku $PLIK - pomijam importer.js"
fi