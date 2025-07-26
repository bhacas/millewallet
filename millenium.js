
require('dotenv').config();

const puppeteer = require('puppeteer');
const path = require('path');

const MILLEKOD = process.env.MILLEKOD;
const HASLO1 = process.env.HASLO1;
const PESEL = process.env.PESEL;

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
        defaultViewport: {
            width: 1920,
            height: 1080,
        },
    });

    const page = await browser.newPage();

    const fs = require('fs');
    const path = require('path');

    const downloadPath = path.resolve('/app/downloads');
    fs.mkdirSync(downloadPath, { recursive: true });

    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath,
    });

    try {
        console.log("🔐 Logowanie...");
        await page.goto('https://login.bankmillennium.pl/retail/login/', { waitUntil: 'networkidle2', timeout: 120000 });

        await page.waitForSelector('#millecode_input', { visible: true, timeout: 120000 });

        await page.type('input[type="text"]', MILLEKOD);
        await page.click('button[type="submit"]');

        await page.waitForSelector('.css-mevgbx', { visible: true, timeout: 300000 });
        await page.waitForSelector('input[type="password"]', { visible: true, timeout: 100000 });

        await page.type('input[type="password"]', HASLO1);

        const peselfields = await page.$$('.css-nfgiif');
        for (let i = 0; i < peselfields.length; i++) {
            const input = await peselfields[i].$('input');
            if (input) {
                const digit = PESEL[i];
                if (digit !== undefined) {
                    await input.type(digit);
                }
            }
        }

        await page.click('button[type="submit"]');

        await page.waitForSelector('div[clickstreamid="once-time-access-tile-button"]', { visible: true, timeout: 300000 });
        await page.click('div[clickstreamid="once-time-access-tile-button"]');

        await page.waitForSelector('.uwg5kr.c-qhvb55', { visible: true, timeout: 300000 });

        console.log("✅ Zalogowano.");

        await page.goto('https://online.bankmillennium.pl/osobiste2/AccountActivity', { waitUntil: 'networkidle2', timeout: 120000 });
        await page.click('#Account_checkBox_2');
        await page.select('select#Content_MainPanel_DocumentFieldGroup_MNDocumentType_ddlList', '3');

        console.log("⏳ Inicjowanie pobierania i oczekiwanie na plik...");

        const filesBeforeDownload = new Set(fs.readdirSync(downloadPath));

        await page.click('#BtnDownload');

        const downloadTimeout = 60000;
        const startTime = Date.now();
        let newFilePath = null;

        while (Date.now() - startTime < downloadTimeout) {
            const currentFiles = fs.readdirSync(downloadPath);
            const newFile = currentFiles.find(file => !filesBeforeDownload.has(file) && !file.endsWith('.crdownload'));

            if (newFile) {
                newFilePath = path.join(downloadPath, newFile);
                console.log(`✅ Plik został pomyślnie pobrany: ${newFilePath}`);
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!newFilePath) {
            throw new Error(`❌ BŁĄD: Nie udało się pobrać pliku w ciągu ${downloadTimeout / 1000} sekund.`);
        }
    } catch (error) {
        console.error("❌ Wystąpił błąd:", error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();

