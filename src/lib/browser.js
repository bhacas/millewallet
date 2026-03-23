/**
 * Wspólna konfiguracja przeglądarki Puppeteer
 */

const puppeteer = require('puppeteer');
const { TIMEOUTS } = require('../config/constants');

/**
 * Tworzy i konfiguruje instancję przeglądarki Puppeteer
 * @param {Object} options - Dodatkowe opcje konfiguracji
 * @returns {Promise<Browser>} Instancja przeglądarki
 */
async function createBrowser(options = {}) {
  const defaultArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-features=site-per-process',
    '--renderer-process-limit=1'
  ];
  
  const browser = await puppeteer.launch({
    headless: options.headless !== undefined ? options.headless : false,
    args: options.windowSize 
      ? [...defaultArgs, `--window-size=${options.windowSize.width},${options.windowSize.height}`]
      : defaultArgs,
    defaultViewport: options.viewport || null,
    protocolTimeout: TIMEOUTS.BROWSER,
    ...options
  });
  
  return browser;
}

/**
 * Tworzy nową stronę z domyślnymi timeoutami
 * @param {Browser} browser - Instancja przeglądarki
 * @returns {Promise<Page>} Nowa strona
 */
async function createPage(browser) {
  const page = await browser.newPage();
  page.setDefaultTimeout(TIMEOUTS.BROWSER);
  page.setDefaultNavigationTimeout(TIMEOUTS.NAVIGATION);
  return page;
}

/**
 * Konfiguruje ścieżkę pobierania dla strony
 * @param {Page} page - Strona Puppeteer
 * @param {string} downloadPath - Ścieżka do katalogu pobierania
 */
async function setupDownloadPath(page, downloadPath) {
  const fs = require('fs');
  fs.mkdirSync(downloadPath, { recursive: true });
  
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath
  });
}

/**
 * Czeka na pojawienie się nowego pliku w katalogu
 * @param {string} downloadPath - Ścieżka do katalogu
 * @param {Set<string>} existingFiles - Zbiór istniejących plików
 * @param {number} timeout - Timeout w ms
 * @returns {Promise<string|null>} Ścieżka do nowego pliku lub null
 */
async function waitForDownload(downloadPath, existingFiles, timeout = TIMEOUTS.DOWNLOAD) {
  const fs = require('fs');
  const path = require('path');
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const currentFiles = fs.readdirSync(downloadPath);
    const newFile = currentFiles.find(
      file => !existingFiles.has(file) && !file.endsWith('.crdownload')
    );
    
    if (newFile) {
      return path.join(downloadPath, newFile);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return null;
}

module.exports = {
  createBrowser,
  createPage,
  setupDownloadPath,
  waitForDownload
};
