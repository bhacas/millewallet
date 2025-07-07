#!/bin/bash

# Uruchomienie node millenium.js
echo "Uruchamiam millenium.js..."
node millenium.js

# Uruchomienie php diff.php
echo "Uruchamiam diff.php..."
php diff.php

# Sprawdzenie, czy istnieje plik transactions.csv
if [ -f "transactions.csv" ]; then
  echo "Znaleziono transactions.csv, uruchamiam importer.js..."
  node importer.js
  echo "Usuwam transactions.csv..."
  rm transactions.csv
else
  echo "Brak pliku transactions.csv - pomijam importer.js"
fi
