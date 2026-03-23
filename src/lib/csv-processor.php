<?php
/**
 * Moduł przetwarzania plików CSV z Banku Millennium
 */

class CsvProcessor {
    private string $sciezkaDoPobranych;
    private string $wzorPliku = '/Historia_transakcji_(\d{8})_(\d{6})\.csv$/';
    private int $expectedCols = 11;
    private string $naglowek = '﻿"Numer rachunku/karty","Data transakcji","Data rozliczenia","Rodzaj transakcji","Na konto/Z konta","Odbiorca/Zleceniodawca","Opis","Obciążenia","Uznania","Saldo","Waluta"';
    
    public function __construct(string $downloadPath) {
        $this->sciezkaDoPobranych = $downloadPath;
    }
    
    /**
     * Usuwa stare pliki CSV starsze niż określona liczba dni
     */
    public function usunStarePliki(int $dni = 30): void {
        $limitCzasu = strtotime("-$dni days");
        
        foreach (glob($this->sciezkaDoPobranych . DIRECTORY_SEPARATOR . "Historia_transakcji_*.csv") as $plik) {
            if (preg_match($this->wzorPliku, basename($plik))) {
                if (filemtime($plik) < $limitCzasu) {
                    @unlink($plik);
                    echo "Usunięto stary plik: " . basename($plik) . PHP_EOL;
                }
            }
        }
    }
    
    /**
     * Naprawia zniekształconą linię CSV
     */
    private function fixCsvLine(string $line): string {
        // 1) napraw klasyczny błąd z brakującym przecinkiem: """ -> ","
        while (strpos($line, '"""') !== false) {
            $line = str_replace('"""', '","', $line);
        }
        
        // 2) domknij niezbalansowane cudzysłowy
        if ((substr_count($line, '"') % 2) !== 0) {
            $line .= '"';
        }
        
        return $line;
    }
    
    /**
     * Usuwa niepoprawne cudzysłowy z kolumn tekstowych
     */
    private function cleanTextColumns(array $cols): array {
        // USUŃ niepoprawne " tylko z nazw/opisów (kolumny 5 i 6)
        foreach ([5, 6] as $i) {
            if (isset($cols[$i]) && $cols[$i] !== '') {
                $cols[$i] = str_replace('"', '', $cols[$i]);
            }
        }
        
        return $cols;
    }
    
    /**
     * Naprawia brakujące kwoty w transakcjach
     */
    private function fixMissingAmounts(array $cols): array {
        // jeśli brak kwot (Obciążenia i Uznania puste) -> ustaw Obciążenia na "0"
        // indeksy wg nagłówka: 7=Obciążenia, 8=Uznania
        if (($cols[7] ?? '') === '' && ($cols[8] ?? '') === '') {
            $cols[7] = '0';
        }
        
        return $cols;
    }
    
    /**
     * Odbudowuje kanoniczną linię CSV z tablicy kolumn
     */
    private function rebuildCsvLine(array $cols): string {
        return '"' . implode('","', array_map(
            fn($v) => str_replace('"', '""', $v),
            $cols
        )) . '"';
    }
    
    /**
     * Wczytuje i naprawia linie z pliku CSV
     */
    public function loadFixedLines(string $path): array {
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (!$lines) return [];
        
        // pomiń nagłówek
        array_shift($lines);
        
        $out = [];
        foreach ($lines as $line) {
            $line = $this->fixCsvLine($line);
            
            // Sparsuj CSV
            $cols = str_getcsv($line, ',', '"');
            if (count($cols) !== $this->expectedCols) {
                continue; // Pomiń nieprawidłowe linie
            }
            
            $cols = $this->fixMissingAmounts($cols);
            $cols = $this->cleanTextColumns($cols);
            
            $out[] = $this->rebuildCsvLine($cols);
        }
        
        return $out;
    }
    
    /**
     * Reformatuje daty w linii CSV z YYYY-MM-DD na DD-MM-YYYY
     */
    public function reformatCsvLineDates(string $line): string {
        $cols = str_getcsv($line, ',', '"');
        if (count($cols) !== $this->expectedCols) {
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
        
        return $this->rebuildCsvLine($cols);
    }
    
    /**
     * Pobiera listę plików CSV posortowanych malejąco po dacie/czasie
     */
    public function getPlikiByCzasie(): array {
        $pliki = array_filter(
            glob($this->sciezkaDoPobranych . DIRECTORY_SEPARATOR . "Historia_transakcji_*.csv"),
            fn($plik) => preg_match($this->wzorPliku, basename($plik))
        );
        
        usort($pliki, function($a, $b) {
            preg_match($this->wzorPliku, basename($a), $a_match);
            preg_match($this->wzorPliku, basename($b), $b_match);
            return strcmp($b_match[1] . $b_match[2], $a_match[1] . $a_match[2]);
        });
        
        return $pliki;
    }
    
    /**
     * Znajduje różnice między dwoma plikami CSV
     */
    public function znajdzRoznice(string $plikNajnowszy, string $plikPoprzedni): array {
        $linieNajnowszy = $this->loadFixedLines($plikNajnowszy);
        $liniePoprzedni = $this->loadFixedLines($plikPoprzedni);
        
        $roznice = array_values(array_diff($linieNajnowszy, $liniePoprzedni));
        $roznice = array_map([$this, 'reformatCsvLineDates'], $roznice);
        
        return $roznice;
    }
    
    /**
     * Zapisuje różnice do pliku CSV
     */
    public function zapiszRoznice(array $roznice, string $plikWyjsciowy): void {
        if (empty($roznice)) {
            echo "Brak nowych unikalnych transakcji – nie utworzono pliku.\n";
            return;
        }
        
        // Dopisz nagłówek
        array_unshift($roznice, $this->naglowek);
        
        file_put_contents($plikWyjsciowy, implode(PHP_EOL, $roznice) . PHP_EOL);
        echo "Zapisano wynikowy plik: $plikWyjsciowy\n";
    }
    
    public function getNaglowek(): string {
        return $this->naglowek;
    }
}
