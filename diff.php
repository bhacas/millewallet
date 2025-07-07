<?php

$sciezka = __DIR__ . '/downloads';
$wzor = '/Historia_transakcji_(\d{8})_(\d{6})\.csv$/';
$naglowek = '﻿"Numer rachunku/karty","Data transakcji","Data rozliczenia","Rodzaj transakcji","Na konto/Z konta","Odbiorca/Zleceniodawca","Opis","Obciążenia","Uznania","Saldo","Waluta"';

// Znajdź wszystkie pliki CSV pasujące do wzoru
$pliki = array_filter(glob($sciezka . DIRECTORY_SEPARATOR . "Historia_transakcji_*.csv"), function($plik) use ($wzor) {
    return preg_match($wzor, basename($plik));
});

// Posortuj po dacie i godzinie malejąco (najnowszy pierwszy)
usort($pliki, function($a, $b) use ($wzor) {
    preg_match($wzor, basename($a), $a_match);
    preg_match($wzor, basename($b), $b_match);
    return strcmp($b_match[1] . $b_match[2], $a_match[1] . $a_match[2]);
});

// Wymagane są przynajmniej dwa pliki
if (count($pliki) < 2) {
    die("Wymagane co najmniej 2 pliki Historia_transakcji_*.csv\n");
}

// Weź tylko dwa najnowsze pliki
$plik_najnowszy = $pliki[0];
$plik_poprzedni = $pliki[1];

// Pobierz datę i godzinę z najnowszego
preg_match($wzor, basename($plik_najnowszy), $match);
$data = $match[1];
$godzina = $match[2];
$plik_wyjsciowy = "transactions.csv";

// Wczytaj linie z obu plików (bez nagłówków)
$linie_najnowszy = array_slice(file($plik_najnowszy, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES), 1);
$linie_poprzedni = array_slice(file($plik_poprzedni, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES), 1);

// Usuń linie wspólne
$roznice = array_diff($linie_najnowszy, $linie_poprzedni);

// Jeśli brak różnic, nie zapisuj
if (empty($roznice)) {
    echo "Brak nowych unikalnych transakcji – nie utworzono pliku.\n";
    exit;
}

// Zapisz wynik z nagłówkiem
array_unshift($roznice, $naglowek);
file_put_contents($plik_wyjsciowy, implode(PHP_EOL, $roznice) . PHP_EOL);

echo "Zapisano wynikowy plik: $plik_wyjsciowy\n";
