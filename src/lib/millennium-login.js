/**
 * Moduł logowania do Banku Millennium
 */

const { SELECTORS, URLS } = require('../config/constants');
const logger = require('../utils/logger');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Loguje się do Banku Millennium
 * @param {Page} page - Strona Puppeteer
 * @param {Object} credentials - Dane logowania
 * @param {string} credentials.millecode - Kod Millennium
 * @param {string} credentials.password - Hasło
 * @param {string} credentials.pesel - Numer PESEL
 */
async function loginToMillennium(page, credentials) {
  const { millecode, password, pesel } = credentials;
  const SEL = SELECTORS.MILLENNIUM;
  
  logger.login('Logowanie do Banku Millennium...');
  await page.goto(URLS.MILLENNIUM_LOGIN, { waitUntil: 'networkidle2' });
  
  // Krok 1: Wpisz kod Millennium
  await page.waitForSelector(SEL.MILLECODE_INPUT, { visible: true });
  await page.type(SEL.TEXT_INPUT, millecode);
  await page.click(SEL.SUBMIT_BUTTON);
  
  // Krok 2: Wpisz hasło
  await page.waitForSelector(SEL.PASSWORD_CONTAINER, { visible: true });
  await page.waitForSelector(SEL.PASSWORD_INPUT, { visible: true });
  await page.type(SEL.PASSWORD_INPUT, password);
  
  // Krok 3: Wpisz cyfry PESEL
  const peselFields = await page.$$(SEL.PESEL_FIELD);
  for (let i = 0; i < peselFields.length; i++) {
    const input = await peselFields[i].$('input');
    if (input && pesel[i] !== undefined) {
      await input.type(pesel[i]);
    }
  }
  
  await page.click(SEL.SUBMIT_BUTTON);
  
  // Krok 4: Wybierz jednorazowy dostęp
  await page.waitForSelector(SEL.ONE_TIME_ACCESS_BUTTON, { visible: true });
  await page.click(SEL.ONE_TIME_ACCESS_BUTTON);
  
  // Krok 5: Poczekaj na zalogowanie
  await page.waitForSelector(SEL.LOGGED_IN_INDICATOR, { visible: true });
  logger.success('Zalogowano do Banku Millennium');
}

/**
 * Pobiera historię transakcji w formacie CSV
 * @param {Page} page - Strona Puppeteer
 * @param {string} checkboxId - ID checkboxa konta/karty
 * @param {string} downloadPath - Ścieżka do zapisu
 * @returns {Promise<string|null>} Ścieżka do pobranego pliku
 */
async function downloadTransactions(page, checkboxId, downloadPath) {
  const fs = require('fs');
  const SEL = SELECTORS.MILLENNIUM;
  
  logger.file('Przechodzę do strony z transakcjami...');
  await page.goto(SEL.ACCOUNT_ACTIVITY_URL, { waitUntil: 'networkidle2' });
  
  // Wybierz konto/kartę
  await page.click(checkboxId);
  
  // Wybierz format CSV (wartość "3" to CSV)
  await page.select(SEL.DOCUMENT_TYPE_SELECT, '3');
  
  logger.wait('Inicjowanie pobierania...');
  
  // Zapamiętaj istniejące pliki
  const filesBeforeDownload = new Set(fs.readdirSync(downloadPath));
  
  // Kliknij przycisk pobierania
  await page.click(SEL.DOWNLOAD_BUTTON);
  
  // Poczekaj na pobranie pliku
  const { waitForDownload } = require('./browser');
  const newFilePath = await waitForDownload(downloadPath, filesBeforeDownload);
  
  if (!newFilePath) {
    throw new Error('Nie udało się pobrać pliku CSV');
  }
  
  logger.success(`Plik został pobrany: ${newFilePath}`);
  return newFilePath;
}

module.exports = {
  loginToMillennium,
  downloadTransactions
};
