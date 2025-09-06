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

/**
 * Napraw typowe babole w liniach CSV:
 * - NBSP -> spacja
 * - """ (trzy cudzysłowy zlepione) -> "," (koniec pola + przecinek + początek pola)
 * - cudzysłów wewnątrz słowa -> podwójny cudzysłów
 * - domknięcie niezbalansowanego cudzysłowu
 */
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

/**
 * Wczytaj plik i zwróć TYLKO poprawne (po naprawie) linie jako stringi,
 * gotowe do porównań. Możesz też zwrócić tablice pól jeśli wolisz działać na kolumnach.
 */
function loadFixedLines(string $path, string $expectedHeader, int $expectedCols = 11): array {
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) return [];

    // pomijamy nagłówek (różne BOM-y itd.)
    array_shift($lines);

    $out = [];
    foreach ($lines as $line) {
        $fixed = sanitizeCsvLine($line);
        // sprawdź liczbę kolumn po naprawie
        $cols = str_getcsv($fixed, ',', '"');
        if (count($cols) === $expectedCols) {
            // ponownie zbuduj „kanoniczną” linię – ujednolica różnice w whitespacach
            $out[] = '"' . implode('","', array_map(
                    fn($v) => str_replace('"', '""', $v), // ucieczka cudzysłowów
                    $cols
                )) . '"';
        } else {
            // opcjonalne logowanie – można pominąć problematyczną pozycję
            // error_log("Pominięto błędną linię w $path: $fixed");
        }
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

if (empty($roznice)) {
    echo "Brak nowych unikalnych transakcji – nie utworzono pliku.\n";
    exit;
}

// dopisz nagłówek (kanoniczny)
array_unshift($roznice, $naglowek);

$plik_wyjsciowy = "transactions_" . date("Y_m_d") . ".csv";
file_put_contents($plik_wyjsciowy, implode(PHP_EOL, $roznice) . PHP_EOL);

echo "Zapisano wynikowy plik: $plik_wyjsciowy\n";
