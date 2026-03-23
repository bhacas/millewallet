/**
 * Moduł importu transakcji do BudgetBakers
 */

const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { SELECTORS, URLS, TIMEOUTS } = require('../config/constants');
const logger = require('../utils/logger');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Pobiera magic link z Gmail za pomocą skryptu PHP
 * @returns {Promise<string>} Magic link
 */
function getMagicLinkViaPhp() {
  return new Promise((resolve, reject) => {
    const phpScript = path.resolve(__dirname, '../../fetch_magic_link.php');
    
    execFile('php', [phpScript], { timeout: TIMEOUTS.PHP_EXEC }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`PHP error: ${stderr || err.message}`));
      }
      
      const match = stdout.match(/MAGIC_LINK=(.+)/);
      if (match) {
        return resolve(match[1].trim());
      }
      
      return reject(
        new Error(`Nie znaleziono MAGIC_LINK w wyjściu PHP. Otrzymano:\n${stdout}`)
      );
    });
  });
}

/**
 * Loguje się do BudgetBakers używając magic link
 * @param {Page} page - Strona Puppeteer
 * @param {string} email - Adres email
 */
async function loginToBudgetBakers(page, email) {
  const SEL = SELECTORS.BUDGETBAKERS;
  
  logger.login('Logowanie do BudgetBakers (krok 1: podanie e-maila)...');
  await page.goto(URLS.BUDGETBAKERS_WEB, { waitUntil: 'networkidle2' });
  
  await page.type(SEL.EMAIL_INPUT, email);
  await page.click(SEL.SUBMIT_BUTTON);
  
  logger.email('Pobieram magic link z Gmaila (Gmail API OAuth)...');
  const magicLink = await getMagicLinkViaPhp();
  logger.link(`Magic link: ${magicLink}`);
  
  await page.goto(magicLink, { waitUntil: 'networkidle2' });
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  
  logger.success('Zalogowano do BudgetBakers');
}

/**
 * Symuluje drop pliku na dropzone Mantine
 * @param {Page} page - Strona Puppeteer
 * @param {string} dropzoneSelector - Selektor dropzone
 * @param {string} filePath - Ścieżka do pliku
 * @param {string} mime - Typ MIME pliku
 */
async function dropFileOnMantine(page, dropzoneSelector, filePath, mime = 'text/csv') {
  const abs = path.resolve(filePath);
  const bytes = fs.readFileSync(abs);
  const fileName = path.basename(abs);
  
  const dz = await page.waitForSelector(dropzoneSelector, { visible: true });
  await dz.evaluate(el => { el.style.pointerEvents = 'all'; });
  
  await page.evaluate(
    async ({ selector, bytesArr, fileName, mime }) => {
      const target = document.querySelector(selector);
      if (!target) throw new Error('Dropzone not found: ' + selector);
      
      const uint8 = new Uint8Array(bytesArr);
      const blob = new Blob([uint8], { type: mime });
      const file = new File([blob], fileName, { type: mime });
      
      const dt = new DataTransfer();
      dt.items.add(file);
      
      const fire = (type) =>
        target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
      
      fire('dragenter');
      fire('dragover');
      fire('drop');
      
      target.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { selector: dropzoneSelector, bytesArr: Array.from(bytes), fileName, mime }
  );
  
  await sleep(TIMEOUTS.DROP_FILE_WAIT);
  logger.download(`Zasymulowano drop pliku: ${fileName}`);
}

/**
 * Wybiera opcję z Mantine Select
 * @param {Page} page - Strona Puppeteer
 * @param {string} label - Etykieta opcji do wyboru
 */
async function selectMantineOption(page, label) {
  const SEL = SELECTORS.BUDGETBAKERS;
  
  logger.info(`Wybieram opcję z Mantine Select: ${label}`);
  await page.click(SEL.SELECT_INPUT);
  
  const listbox = await page.waitForSelector(SEL.LISTBOX, { visible: true });
  
  const clicked = await listbox.$$eval(
    SEL.OPTION,
    (nodes, wanted) => {
      const el = nodes.find(n => n.textContent?.trim().includes(wanted));
      if (!el) return false;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      el.click();
      return true;
    },
    label
  );
  
  if (!clicked) {
    throw new Error(`Nie znalazłem opcji: ${label}`);
  }
  
  logger.success('Wybrano opcję: ' + label);
  
  await page.waitForFunction(
    (wanted) => {
      const input = document.querySelector('input.mantine-Input-input.mantine-Select-input');
      return input && (input.value?.includes(wanted) || !document.querySelector('[role="listbox"], [data-combobox-dropdown]'));
    },
    {},
    label
  );
}

/**
 * Importuje plik CSV do BudgetBakers
 * @param {Page} page - Strona Puppeteer
 * @param {string} filePath - Ścieżka do pliku CSV
 * @param {string|null} accountName - Nazwa konta w BudgetBakers (null = domyślne)
 */
async function importTransactions(page, filePath, accountName = null) {
  const SEL = SELECTORS.BUDGETBAKERS;

  logger.file('Przechodzę do strony importu...');
  await page.goto(URLS.BUDGETBAKERS_IMPORTS, { waitUntil: 'networkidle2' });

  // SPA może potrzebować chwili na wyrenderowanie po przekierowaniu z magic linka
  // - czekamy aż dropzone pojawi się, z retry co 3s przez max 60s
  logger.wait('Czekam na załadowanie dropzone...');
  let dropzoneReady = false;
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      await page.waitForSelector(SEL.DROPZONE, { visible: true, timeout: 3000 });
      dropzoneReady = true;
      break;
    } catch {
      logger.debug(`Dropzone nie gotowy (próba ${attempt}/20), odświeżam stronę...`);
      await page.goto(URLS.BUDGETBAKERS_IMPORTS, { waitUntil: 'networkidle2' });
      await sleep(2000);
    }
  }

  if (!dropzoneReady) {
    throw new Error('Dropzone nie pojawił się po 20 próbach - sprawdź czy jesteś zalogowany');
  }

  // Jeśli określono nazwę konta, wybierz je
  if (accountName) {
    await selectMantineOption(page, accountName);
  }

  // Upuść plik na dropzone
  await dropFileOnMantine(page, SEL.DROPZONE, filePath);
  
  // Opcjonalnie: poczekaj na pojawienie się karty z plikiem
  const fileName = path.basename(filePath);
  logger.wait(`Czekam na pojawienie się karty z plikiem: ${fileName}`);
  
  try {
    await page.waitForFunction(
      (name) => {
        const cards = document.querySelectorAll('.mantine-Card-root.mantine-Paper-root');
        return Array.from(cards).some(card => card.innerText.includes(name));
      },
      { timeout: TIMEOUTS.BROWSER },
      fileName
    );
    logger.success(`Pojawiła się karta z plikiem: ${fileName}`);
  } catch (err) {
    logger.warn('Nie udało się potwierdzić pojawienia karty - import może być w toku');
  }
  
  logger.finished('Import zakończony');
}

module.exports = {
  getMagicLinkViaPhp,
  loginToBudgetBakers,
  dropFileOnMantine,
  selectMantineOption,
  importTransactions
};
