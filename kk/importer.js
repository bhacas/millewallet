const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const puppeteer = require('puppeteer');
const fs = require('fs');
const { execFile } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EMAIL = process.env.EMAIL;
const FILE_NAME = `kk_transactions_${new Date().toISOString().slice(0, 10).replace(/-/g, '_')}.csv`;

function getMagicLinkViaPhp() {
    return new Promise((resolve, reject) => {
        execFile('php', ['../fetch_magic_link.php'], { timeout: 120000 }, (err, stdout, stderr) => {
            if (err) return reject(new Error(`PHP error: ${stderr || err.message}`));
            const m = stdout.match(/MAGIC_LINK=(.+)/);
            if (m) return resolve(m[1].trim());
            return reject(new Error(`Nie znaleziono MAGIC_LINK w wyjściu PHP. Otrzymano:\n${stdout}`));
        });
    });
}

async function dropFileOnMantine(page, dropzoneSelector, filePath, mime = 'text/csv') {
    const abs = path.resolve(filePath);
    const bytes = fs.readFileSync(abs);
    const fileName = path.basename(abs);

    const dz = await page.waitForSelector(dropzoneSelector, { visible: true});

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

    await sleep(6000);
    console.log(`📥 Zasymulowano drop pliku: ${fileName}`);
}

async function selectMantineOption(page, label) {
    // 1) Otwórz dropdown
    await page.click('input.mantine-Input-input.mantine-Select-input', { delay: 30 });

    // 2) Poczekaj na portal/listę opcji
    const listbox = await page.waitForSelector('[role="listbox"], [data-combobox-dropdown]', { visible: true });

    // 3) Znajdź właściwą opcję PO TEKŚCIE i kliknij w DOM-ie (omija „hit testing”)
    const clicked = await listbox.$$eval('.mantine-Group-root, [role="option"]', (nodes, wanted) => {
        const el = nodes.find(n => n.textContent?.trim().includes(wanted));
        if (!el) return false;
        // przewiń i kliknij programowo (bez precyzji myszy)
        el.scrollIntoView({ block: 'center', inline: 'center' });
        el.click();
        return true;
    }, label);

    if (!clicked) throw new Error(`Nie znalazłem opcji: ${label}`);

    // 4) Opcjonalnie: poczekaj aż dropdown się zamknie / input zmieni wartość
    await page.waitForFunction((wanted) => {
        const input = document.querySelector('input.mantine-Input-input.mantine-Select-input');
        return input && (input.value?.includes(wanted) || !document.querySelector('[role="listbox"], [data-combobox-dropdown]'));
    }, {}, label);
}

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-features=site-per-process',
            '--renderer-process-limit=1',
        ],
        protocolTimeout: 500000,
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(500000);
    page.setDefaultNavigationTimeout(500000);

    try {
        console.log("🔐 Logowanie (krok 1: podanie e-maila)...");
        await page.goto('https://web.budgetbakers.com', { waitUntil: 'networkidle2'});

        await page.type('input[data-path="email"]', EMAIL);
        await page.click('button[type="submit"]');

        console.log("📧 Pobieram magic link z Gmaila (Gmail API OAuth)...");
        const magicLink = await getMagicLinkViaPhp();
        console.log("🔗 Magic link:", magicLink);

        await page.goto(magicLink, { waitUntil: 'networkidle2'});

        await page.waitForNavigation({ waitUntil: 'networkidle2'}).catch(() => {});
        console.log("✅ Zalogowano.");

        const dropzoneSel = '.mantine-Dropzone-inner';

        console.log("📁 Przechodzę do strony importu...");
        await page.goto('https://web.budgetbakers.com/imports', { waitUntil: 'networkidle2'});

        await page.click('input.mantine-Input-input.mantine-Select-input');

        await selectMantineOption(page, 'Karta Kredytowa');

        await page.waitForSelector(dropzoneSel, { visible: true});
        await dropFileOnMantine(page, dropzoneSel, path.resolve(__dirname, FILE_NAME));

        const fileName = path.basename(FILE_NAME);

        console.log("⏳ Czekam na pojawienie się karty z plikiem:", fileName);

        await page.waitForFunction(
            (name) => {
                const cards = document.querySelectorAll('.mantine-Card-root.mantine-Paper-root');
                return Array.from(cards).some(card =>
                    card.innerText.includes(name)
                );
            },
            { timeout: 500000 },
            fileName
        );

        console.log("✅ Pojawiła się karta z plikiem:", fileName);
        console.log("🏁 Import zakończony.");
    } catch (error) {
        console.error("❌ Wystąpił błąd:", error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
