<?php

require_once __DIR__ . '/../lib/csv-processor.php';

$accountName = $argv[1] ?? null;

$accountConfig = [
    'konto' => ['filePrefix' => 'transactions'],
    'kk'    => ['filePrefix' => 'kk_transactions'],
];

if (!$accountName || !isset($accountConfig[$accountName])) {
    fwrite(STDERR, "Użycie: php diff.php <nazwa_konta> (dostępne: " . implode(', ', array_keys($accountConfig)) . ")\n");
    exit(1);
}

$downloadPath = __DIR__ . "/../../{$accountName}/downloads";
$filePrefix   = $accountConfig[$accountName]['filePrefix'];

$processor = new CsvProcessor($downloadPath);

$processor->usunStarePliki(30);

$pliki = $processor->getPlikiByCzasie();

if (count($pliki) < 2) {
    echo "UWAGA: Znaleziono tylko " . count($pliki) . " plik(i).\n";
    if (count($pliki) === 1) {
        echo "Pierwsze uruchomienie - poczekaj na następne pobieranie.\n";
        exit(0);
    }
    die("Wymagany co najmniej 1 plik Historia_transakcji_*.csv w katalogu downloads\n");
}

$plikNajnowszy = $pliki[0];
$plikPoprzedni = $pliki[1];

echo "Porównuję:\n";
echo "  Najnowszy: " . basename($plikNajnowszy) . "\n";
echo "  Poprzedni: " . basename($plikPoprzedni) . "\n";

$roznice = $processor->znajdzRoznice($plikNajnowszy, $plikPoprzedni);

$plikWyjsciowy = __DIR__ . "/../../{$accountName}/{$filePrefix}_" . date("Y_m_d") . ".csv";
$processor->zapiszRoznice($roznice, $plikWyjsciowy);
