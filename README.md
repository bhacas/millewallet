# MilleWallet

Automatyzacja importu transakcji bankowych z Banku Millennium do BudgetBakers.

## 📋 Opis

System automatycznie:
1. Pobiera transakcje z Banku Millennium (konto osobiste + karta kredytowa)
2. Przetwarza pliki CSV, znajduje nowe transakcje
3. Importuje je do aplikacji BudgetBakers

## 🏗️ Architektura

```
millewallet/
├── src/                          # Wspólne moduły
│   ├── config/
│   │   ├── accounts.js          # Konfiguracja kont bankowych
│   │   └── constants.js         # Stałe aplikacji
│   ├── lib/
│   │   ├── browser.js           # Wspólna konfiguracja Puppeteer
│   │   ├── millennium-login.js  # Logika logowania do Millennium
│   │   ├── budgetbakers-importer.js  # Import do BudgetBakers
│   │   └── csv-processor.php    # Przetwarzanie CSV
│   └── utils/
│       ├── logger.js            # Logger z kolorowymi emoji
│       └── env-validator.js     # Walidacja zmiennych środowiskowych
├── konto/                        # Skrypty dla konta osobistego
│   ├── millenium.js             # Pobieranie z Millennium
│   ├── diff.php                 # Porównywanie CSV
│   ├── importer.js              # Import do BudgetBakers
│   └── run.sh                   # Skrypt orkiestracyjny
├── kk/                           # Skrypty dla karty kredytowej
│   ├── millenium.js             # Pobieranie z Millennium
│   ├── diff.php                 # Porównywanie CSV
│   ├── importer.js              # Import do BudgetBakers
│   └── run.sh                   # Skrypt orkiestracyjny
└── fetch_magic_link.php          # Pobieranie magic link z Gmail API

```

## 🚀 Instalacja

### Wymagania
- Docker & Docker Compose
- Konto w Banku Millennium
- Konto w BudgetBakers
- Konto Gmail z włączonym API

### 1. Klonuj repozytorium
```bash
git clone <repo-url>
cd millewallet
```

### 2. Zainstaluj zależności

```bash
npm install
composer install
```

### 3. Konfiguracja Gmail API

1. Przejdź do [Google Cloud Console](https://console.cloud.google.com/)
2. Utwórz nowy projekt
3. Włącz Gmail API
4. Utwórz credentials OAuth 2.0
5. Pobierz plik `credentials.json` i umieść go w katalogu głównym projektu
6. Przy pierwszym uruchomieniu zostaniesz poproszony o autoryzację

### 4. Zmienne środowiskowe

Skopiuj `.env.example` do `.env` i wypełnij:

```bash
cp .env.example .env
```

```env
# Dane logowania do Millennium
MILLEKOD=twoj_millekod
HASLO1=twoje_haslo
PESEL=12345678901

# BudgetBakers
EMAIL=twoj@email.com

# Opcjonalnie: filtr Gmail (domyślnie: szuka od BudgetBakers z ostatniego miesiąca)
BB_GMAIL_QUERY=from:(budgetbakers.com OR budgetbakers.info) newer_than:1m
```

## 🎯 Użycie

### Docker (zalecane)

```bash
# Zbuduj image
docker-compose build

# Uruchom kontener
docker-compose up -d

# Sprawdź logi
docker-compose logs -f
```

### Ręcznie

```bash
# Konto osobiste
cd konto
bash run.sh

# Karta kredytowa
cd kk
bash run.sh
```

## 📅 Harmonogram (cron)

Domyślnie:
- **Konto osobiste**: codziennie o 15:00
- **Karta kredytowa**: we wtorki i piątki o 16:00

Edytuj harmonogram w pliku [Dockerfile](Dockerfile), linijka z `cron.d`.

## 🔧 Dodawanie nowego konta

1. **Dodaj konfigurację do** [src/config/accounts.js](src/config/accounts.js):
```javascript
noweKonto: {
  name: 'Moje nowe konto',
  type: 'account',
  checkboxId: '#Account_checkBox_3',
  filePrefix: 'nowe_transactions',
  budgetBakersAccount: 'Nazwa w BudgetBakers',
  downloadPath: './downloads'
}
```

2. **Utwórz katalog**:
```bash
mkdir nowe_konto
```

3. **Skopiuj pliki z `konto/`** i zmień tylko nazwę konfiguracji:
```javascript
const ACCOUNT_CONFIG = accounts.noweKonto;
```

4. **Dodaj do crona** w `Dockerfile`.

## 🛠️ Troubleshooting

### "Missing required env variable"
- Sprawdź czy plik `.env` istnieje i zawiera wszystkie wymagane zmienne

### "PHP error" przy pobieraniu magic link
- Sprawdź czy `credentials.json` jest w katalogu głównym
- Usuń `token.json` i autoryzuj ponownie

### "Nie znalazłem opcji: Karta Kredytowa"
- Sprawdź nazwę konta w BudgetBakers
- Zaktualizuj `budgetBakersAccount` w `accounts.js`

### Selektory CSS przestały działać
- Bank Millennium zmienił stronę
- Zaktualizuj selektory w [src/config/constants.js](src/config/constants.js)

## 📝 Logowanie

Wszystkie logi są zapisywane w `/app/logs/cron.log` (w kontenerze Docker).

```bash
# Zobacz logi w kontenerze
docker-compose exec puppeteer tail -f /app/logs/cron.log
```

## 🔐 Bezpieczeństwo

- **NIE commituj** pliku `.env`
- **NIE commituj** plików `credentials.json` i `token.json`
- Używaj silnych haseł
- Regularnie aktualizuj zależności

## 📦 Struktura plików CSV

Bank Millennium eksportuje CSV z następującymi kolumnami:
1. Numer rachunku/karty
2. Data transakcji
3. Data rozliczenia
4. Rodzaj transakcji
5. Na konto/Z konta
6. Odbiorca/Zleceniodawca
7. Opis
8. Obciążenia
9. Uznania
10. Saldo
11. Waluta

## 🤝 Wkład

Pull requesty są mile widziane!

## 📄 Licencja

MIT
