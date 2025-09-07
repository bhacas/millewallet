<?php

function usunStarePliki($sciezka, $wzor, $dni = 30) {
    $limitCzasu = strtotime("-$dni days");
    foreach (glob($sciezka . DIRECTORY_SEPARATOR . "Historia_transakcji_*.csv") as $plik) {
        if (preg_match($wzor, basename($plik))) {
            if (filemtime($plik) < $limitCzasu) {
                @unlink($plik);
                echo "Usunięto stary plik: " . basename($plik) . PHP_EOL;
            }
        }
    }
}

function sanitizeCsvLine(string $line): string {
    // 1) normalizacja NBSP i niewidków
    $line = str_replace(["\xC2\xA0", "\xE2\x80\x8B"], ' ', $line); // NBSP, zero-width space

    // 2) brakujący przecinek między polami: ..."""+... -> ...","...
    // powtarzamy zamianę aż znikną wszystkie """ (na wypadek wielu błędów w linii)
    while (strpos($line, '"""') !== false) {
        $line = str_replace('"""', '","', $line);
    }

    // 3) goły cudzysłów w środku słowa (np. Synowie"s.c) -> Synowie""s.c
    $line = preg_replace('/(?<=\pL|\pN)"(?=\pL|\pN)/u', '""', $line);

    // 4) jeśli łączna liczba cudzysłowów jest nieparzysta – domknij na końcu
    if ((substr_count($line, '"') % 2) !== 0) {
        $line .= '"';
    }

    return $line;
}

function reformatCsvLineDates(string $line, int $expectedCols = 11): string {
    $cols = str_getcsv($line, ',', '"');
    if (count($cols) !== $expectedCols) {
        return $line; // zostaw bez zmian jeśli coś nie pasuje
    }

    foreach ([1, 2] as $i) { // Data transakcji i Data rozliczenia
        if (!empty($cols[$i]) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $cols[$i])) {
            $dt = DateTime::createFromFormat('Y-m-d', $cols[$i]);
            if ($dt) {
                $cols[$i] = $dt->format('d-m-Y');
            }
        }
    }

    // odbuduj poprawną linię CSV
    return '"' . implode('","', array_map(
            fn($v) => str_replace('"', '""', $v),
            $cols
        )) . '"';
}

function loadFixedLines(string $path, string $expectedHeader, int $expectedCols = 11): array {
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) return [];

    // pomiń nagłówek
    array_shift($lines);

    $out = [];
    foreach ($lines as $line) {
        // 1) napraw klasyczny błąd z brakującym przecinkiem: """ -> ","
        while (strpos($line, '"""') !== false) {
            $line = str_replace('"""', '","', $line);
        }

        // 2) domknij niezbalansowane cudzysłowy
        if ((substr_count($line, '"') % 2) !== 0) {
            $line .= '"';
        }

        // 3) sparsuj CSV
        $cols = str_getcsv($line, ',', '"');
        if (count($cols) !== $expectedCols) {
            // jeśli dalej źle — pomiń wiersz
            continue;
        }

        // 4) USUŃ niepoprawne " tylko z nazw/opi­sów (kolumny 5 i 6)
        foreach ([5, 6] as $i) {
            if (isset($cols[$i]) && $cols[$i] !== '') {
                $cols[$i] = str_replace('"', '', $cols[$i]);
            }
        }

        // 5) odbuduj kanoniczną linię CSV (ucieczka " w innych kolumnach)
        $out[] = '"' . implode('","', array_map(
                fn($v) => str_replace('"', '""', $v),
                $cols
            )) . '"';
    }

    return $out;
}

$sciezka = __DIR__ . '/downloads';
$wzor = '/Historia_transakcji_(\d{8})_(\d{6})\.csv$/';
$naglowek = '﻿"Numer rachunku/karty","Data transakcji","Data rozliczenia","Rodzaj transakcji","Na konto/Z konta","Odbiorca/Zleceniodawca","Opis","Obciążenia","Uznania","Saldo","Waluta"';

usunStarePliki($sciezka, $wzor);

$pliki = array_filter(glob($sciezka . DIRECTORY_SEPARATOR . "Historia_transakcji_*.csv"), function($plik) use ($wzor) {
    return preg_match($wzor, basename($plik));
});

usort($pliki, function($a, $b) use ($wzor) {
    preg_match($wzor, basename($a), $a_match);
    preg_match($wzor, basename($b), $b_match);
    return strcmp($b_match[1] . $b_match[2], $a_match[1] . $a_match[2]);
});

if (count($pliki) < 2) {
    die("Wymagane co najmniej 2 pliki Historia_transakcji_*.csv\n");
}

$plik_najnowszy = $pliki[0];
$plik_poprzedni = $pliki[1];

$linie_najnowszy = loadFixedLines($plik_najnowszy, $naglowek, 11);
$linie_poprzedni = loadFixedLines($plik_poprzedni, $naglowek, 11);

// różnice po kanonikalizacji
$roznice = array_values(array_diff($linie_najnowszy, $linie_poprzedni));
$roznice = array_map('reformatCsvLineDates', $roznice);

if (empty($roznice)) {
    echo "Brak nowych unikalnych transakcji – nie utworzono pliku.\n";
    exit;
}

// dopisz nagłówek (kanoniczny)
array_unshift($roznice, $naglowek);

$plik_wyjsciowy = "transactions_" . date("Y_m_d") . ".csv";
file_put_contents($plik_wyjsciowy, implode(PHP_EOL, $roznice) . PHP_EOL);

echo "Zapisano wynikowy plik: $plik_wyjsciowy\n";
