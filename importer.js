require('dotenv').config(); // ← Ładowanie zmiennych środowiskowych

const puppeteer = require('puppeteer');
const path = require('path');

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const FILE_NAME = 'transactions.csv';

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    console.log("🔐 Logowanie...");
    await page.goto('https://web.budgetbakers.com', { waitUntil: 'networkidle2' });

    const popupbuttonselector = '.ui.blue.circular.inverted.button';

    const popupbutton = await page.waitForSelector(popupbuttonselector, { visible: true, timeout: 2000 }).catch(() => null);
    if (popupbutton) {
      await popupbutton.click();
    }

    await page.type('input[type="email"]', EMAIL);
    await page.type('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log("✅ Zalogowano.");

    console.log("📁 Przechodzę do strony importu...");
    await page.goto('https://web.budgetbakers.com/imports', { waitUntil: 'networkidle2' });

    await page.waitForSelector('button[type="button"]', { visible: true });

    const filePath = path.resolve(__dirname, FILE_NAME);
    console.log(`📄 Wczytywanie pliku: ${filePath}`);

    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.click('.ui.circular.fluid.primary.button') // "Upload"
    ]);
    await fileChooser.accept([filePath]);

    console.log("📤 Plik załadowany.");

    await page.waitForSelector('.ui.fullscreen.modal.transition.visible.active.mapping-preview', {
      visible: true,
      timeout: 30000
    });

    await page.click('.ui.fullscreen.modal.transition.visible.active.mapping-preview .ui.circular.primary.button');

    await page.waitForSelector('.ui.small.modal.transition.visible.active.modal-animation.visible.transition', {
      visible: true,
      timeout: 30000
    });

    console.log("🏁 Import zakończony.");
  } catch (error) {
    console.error("❌ Wystąpił błąd:", error);
  } finally {
    await browser.close();
  }
})();

