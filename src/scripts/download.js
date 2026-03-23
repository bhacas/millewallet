const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { validateEnv, validatePesel } = require('../utils/env-validator');
const logger = require('../utils/logger');
const { createBrowser, createPage, setupDownloadPath } = require('../lib/browser');
const { loginToMillennium, downloadTransactions } = require('../lib/millennium-login');
const accounts = require('../config/accounts');

const accountName = process.argv[2];
if (!accountName || !accounts[accountName]) {
    logger.error(`Użycie: node download.js <nazwa_konta> (dostępne: ${Object.keys(accounts).join(', ')})`);
    process.exit(1);
}

validateEnv(['millennium']);
validatePesel();

const ACCOUNT_CONFIG = accounts[accountName];

(async () => {
    const browser = await createBrowser({
        windowSize: { width: 1920, height: 1080 },
        viewport: { width: 1920, height: 1080 }
    });

    const page = await createPage(browser);
    const downloadPath = path.resolve(__dirname, `../../${accountName}/downloads`);
    await setupDownloadPath(page, downloadPath);

    try {
        await loginToMillennium(page, {
            millecode: process.env.MILLEKOD,
            password: process.env.HASLO1,
            pesel: process.env.PESEL
        });

        await downloadTransactions(page, ACCOUNT_CONFIG.checkboxId, downloadPath);

    } catch (error) {
        logger.error(`Wystąpił błąd: ${error.message}`);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
