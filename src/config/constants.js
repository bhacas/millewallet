/**
 * Stałe konfiguracyjne aplikacji
 */

module.exports = {
  TIMEOUTS: {
    PHP_EXEC: 120000,
    BROWSER: 500000,
    DOWNLOAD: 60000,
    DROP_FILE_WAIT: 6000,
    NAVIGATION: 500000
  },
  
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 2000
  },
  
  SELECTORS: {
    MILLENNIUM: {
      MILLECODE_INPUT: '#millecode_input',
      TEXT_INPUT: 'input[type="text"]',
      PASSWORD_INPUT: 'input[type="password"]',
      SUBMIT_BUTTON: 'button[type="submit"]',
      PASSWORD_CONTAINER: '.css-mevgbx',
      PESEL_FIELD: '.css-nfgiif',
      ONE_TIME_ACCESS_BUTTON: 'div[clickstreamid="once-time-access-tile-button"]',
      LOGGED_IN_INDICATOR: '.uwg5kr.c-qhvb55',
      ACCOUNT_ACTIVITY_URL: 'https://online.bankmillennium.pl/osobiste2/AccountActivity',
      DOWNLOAD_BUTTON: '#BtnDownload',
      DOCUMENT_TYPE_SELECT: 'select#Content_MainPanel_DocumentFieldGroup_MNDocumentType_ddlList'
    },
    BUDGETBAKERS: {
      EMAIL_INPUT: 'input[data-path="email"]',
      SUBMIT_BUTTON: 'button[type="submit"]',
      DROPZONE: '.mantine-Dropzone-inner',
      SELECT_INPUT: 'input.mantine-Input-input.mantine-Select-input',
      LISTBOX: '[role="listbox"], [data-combobox-dropdown]',
      OPTION: '.mantine-Group-root, [role="option"]',
      CARD_ROOT: '.mantine-Card-root.mantine-Paper-root'
    }
  },
  
  URLS: {
    MILLENNIUM_LOGIN: 'https://login.bankmillennium.pl/retail/login/',
    MILLENNIUM_ACCOUNT_ACTIVITY: 'https://online.bankmillennium.pl/osobiste2/AccountActivity',
    BUDGETBAKERS_WEB: 'https://web.budgetbakers.com',
    BUDGETBAKERS_IMPORTS: 'https://web.budgetbakers.com/imports'
  },
  
  CSV: {
    EXPECTED_COLUMNS: 11,
    FILE_PATTERN: /Historia_transakcji_(\d{8})_(\d{6})\.csv$/,
    CLEANUP_DAYS: 30,
    HEADER: '﻿"Numer rachunku/karty","Data transakcji","Data rozliczenia","Rodzaj transakcji","Na konto/Z konta","Odbiorca/Zleceniodawca","Opis","Obciążenia","Uznania","Saldo","Waluta"'
  }
};
