require('dotenv').config();

const puppeteer = require('puppeteer');
const path = require('path');

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const FILE_NAME = `transactions_${new Date().toISOString().slice(0, 10).replace(/-/g, '_')}.csv`;

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    console.log("🔐 Logowanie...");
    await page.goto('https://web.budgetbakers.com', { waitUntil: 'networkidle2', timeout: 120000 });

    const popupbuttonselector = '.ui.blue.circular.inverted.button';

    const popupbutton = await page.waitForSelector(popupbuttonselector, { visible: true, timeout: 30000 }).catch(() => null);
    if (popupbutton) {
      await popupbutton.click();
    }

    await page.type('input[type="email"]', EMAIL);
    await page.type('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000  });
    console.log("✅ Zalogowano.");

    console.log("📁 Przechodzę do strony importu...");
    await page.goto('https://web.budgetbakers.com/imports', { waitUntil: 'networkidle2', timeout: 120000 });

    await page.waitForSelector('button[type="button"]', { visible: true, timeout: 300000 });

    const filePath = path.resolve(__dirname, FILE_NAME);
    console.log(`📄 Wczytywanie pliku: ${filePath}`);

    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.click('.ui.circular.fluid.primary.button')
    ]);
    await fileChooser.accept([filePath]);

    console.log("📤 Plik załadowany.");

    await page.waitForSelector('.ui.fullscreen.modal.transition.visible.active.mapping-preview', {
      visible: true,
      timeout: 300000
    });

    await page.click('.ui.fullscreen.modal.transition.visible.active.mapping-preview .ui.circular.primary.button');

    await page.waitForSelector('.ui.small.modal.transition.visible.active.modal-animation.visible.transition', {
      visible: true,
      timeout: 300000
    });

    console.log("🏁 Import zakończony.");
  } catch (error) {
    console.error("❌ Wystąpił błąd:", error);
    process.exit(1)
  } finally {
    await browser.close();
  }
})();

