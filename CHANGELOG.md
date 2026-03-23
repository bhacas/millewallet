# Changelog

## [Refactoring v2.0.0] - 2026-02-16

### ✨ Nowe funkcje

#### Modułowa architektura
- Utworzono strukturę katalogów `src/` z podziałem na:
  - `config/` - konfiguracja kont i stałe
  - `lib/` - biblioteki logiki biznesowej
  - `utils/` - narzędzia pomocnicze

#### Walidacja środowiska
- Dodano walidację zmiennych środowiskowych przy starcie
- Sprawdzanie poprawności formatu PESEL (11 cyfr)
- Przyjazne komunikaty o brakujących zmiennych

#### Logger
- Ujednolicony system logowania z kolorowymi emoji
- Spójne komunikaty w całej aplikacji

#### Dokumentacja
- Kompletny README.md z instrukcjami
- Plik .env.example z przykładową konfiguracją
- .gitignore zabezpieczający wrażliwe dane

### 🔧 Refaktoryzacje

#### Eliminacja duplikacji kodu
- **Przed**: Kod dla `konto/` i `kk/` był zduplikowany (~300 linii x 2)
- **Po**: Wspólne moduły, różnice tylko w konfiguracji

#### Moduły JavaScript
- `browser.js` - wspólna konfiguracja Puppeteer, obsługa pobierania
- `millennium-login.js` - logika logowania do Millennium
- `budgetbakers-importer.js` - import do BudgetBakers z magic link

#### Moduł PHP
- `csv-processor.php` - klasa OOP do przetwarzania CSV
- Wszystkie funkcje pomocnicze w jednym miejscu
- Łatwiejsze testowanie i utrzymanie

#### Stałe zamiast magic values
- `constants.js` - wszystkie selektory, URL-e, timeouty w jednym miejscu
- Łatwiejsza aktualizacja przy zmianach na stronach bankowych

#### Konfiguracja zamiast hardcoded values
- `accounts.js` - konfiguracja kont z wszystkimi parametrami
- Dodanie nowego konta wymaga tylko dodania wpisu w konfiguracji

### 🐛 Naprawione błędy

1. **Redeclaracja zmiennych**
   - Usunięto duplikaty `const fs` i `const path` w plikach `millenium.js`

2. **Nieużywana funkcja**
   - Usunięto nieużywaną funkcję `sanitizeCsvLine()` z `diff.php`

3. **Lepsza obsługa pierwszego uruchomienia**
   - Zamiast błędu, przyjazny komunikat gdy jest tylko 1 plik
   - Skrypt kończy się sukcesem (exit 0) zamiast błędem

4. **DRY (Don't Repeat Yourself)**
   - Eliminacja powtarzającego się kodu w 6 plikach

### 📊 Statystyki

- **Usunięte linie zduplikowanego kodu**: ~400
- **Utworzonych nowych modułów**: 7
- **Zrefaktoryzowanych plików**: 6
- **Poprawa czytelności kodu**: znacząca

### 🔄 Migracja

Dla istniejących instalacji:

1. Zaktualizuj kod: `git pull`
2. Zainstaluj zależności: `npm install && composer install`
3. Sprawdź `.env` - wszystkie zmienne są w tym samym miejscu
4. Przebuduj Docker: `docker-compose build`
5. Uruchom: `docker-compose up -d`

**Uwaga**: Pliki w katalogach `konto/downloads/` i `kk/downloads/` pozostaną nietknięte.

### 📝 Pozostałe do zrobienia (TODO)

Propozycje dalszych ulepszeń (opcjonalne):

- [ ] Retry logic przy błędach logowania
- [ ] Lepsza obsługa selektorów CSS (więcej stabilnych alternativ)
- [ ] Testy jednostkowe dla modułów
- [ ] Monitoring i alerting przy błędach (np. email/Slack)
- [ ] UI do zarządzania konfiguracją
- [ ] Eksport metryk (ile transakcji, czy sukces/fail)
