require('dotenv').config();

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EMAIL = process.env.EMAIL;
const FILE_NAME = `transactions_${new Date().toISOString().slice(0, 10).replace(/-/g, '_')}.csv`;

// Helper: pobiera magic link przez skrypt PHP (Gmail API OAuth)
function getMagicLinkViaPhp() {
    return new Promise((resolve, reject) => {
        execFile('php', ['fetch_magic_link.php'], { timeout: 120000 }, (err, stdout, stderr) => {
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

    // upewnij się, że dropzone jest widoczny
    const dz = await page.waitForSelector(dropzoneSelector, { visible: true, timeout: 30000 });

    // wyrzuć ewentualny overlay, żeby eventy nie były blokowane (opcjonalne)
    await dz.evaluate(el => { el.style.pointerEvents = 'all'; });

    // Zasymuluj dragenter/dragover/drop z DataTransfer i File
    await page.evaluate(
        async ({ selector, bytesArr, fileName, mime }) => {
            const target = document.querySelector(selector);
            if (!target) throw new Error('Dropzone not found: ' + selector);

            const uint8 = new Uint8Array(bytesArr);
            const blob = new Blob([uint8], { type: mime });
            const file = new File([blob], fileName, { type: mime });

            // DataTransfer z plikiem
            const dt = new DataTransfer();
            dt.items.add(file);

            const fire = (type) =>
                target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));

            // niektóre biblioteki wymagają kolejności: enter -> over -> drop
            fire('dragenter');
            fire('dragover');
            fire('drop');

            // dodatkowo — Mantine Dropzone czasem słucha też eventu 'change' na Shadow/hidden handlerach,
            // więc dla pewności próbujemy jeszcze event inputowy na target (no-op jeśli nieużywany)
            target.dispatchEvent(new Event('change', { bubbles: true }));
        },
        { selector: dropzoneSelector, bytesArr: Array.from(bytes), fileName, mime }
    );

    await sleep(700);
    console.log(`📥 Zasymulowano drop pliku: ${fileName}`);
}

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    try {
        console.log("🔐 Logowanie (krok 1: podanie e-maila)...");
        await page.goto('https://web.budgetbakers.com', { waitUntil: 'networkidle2', timeout: 120000 });

        await page.type('input[data-path="email"]', EMAIL);
        await page.click('button[type="submit"]');

        // --- NOWE: pobranie magic linka z Gmaila przez Gmail API (PHP) ---
        console.log("📧 Pobieram magic link z Gmaila (Gmail API OAuth)...");
        const magicLink = await getMagicLinkViaPhp();
        console.log("🔗 Magic link:", magicLink);

        // Przejście na magic link celem domknięcia logowania
        await page.goto(magicLink, { waitUntil: 'networkidle2', timeout: 120000 });

        // Oczekiwanie aż dashboard się załaduje (dopasuj selektor jeśli trzeba)
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 220000 }).catch(() => {});
        console.log("✅ Zalogowano.");

        const dropzoneSel = '.mantine-Dropzone-inner';

        console.log("📁 Przechodzę do strony importu...");
        await page.goto('https://web.budgetbakers.com/imports', { waitUntil: 'networkidle2', timeout: 120000 });

        await page.waitForSelector(dropzoneSel, { visible: true, timeout: 30000 });
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
            { timeout: 60000 },
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
