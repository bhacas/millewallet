const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { validateEnv } = require('../utils/env-validator');
const logger = require('../utils/logger');
const { createBrowser, createPage } = require('../lib/browser');
const { loginToBudgetBakers, importTransactions } = require('../lib/budgetbakers-importer');
const accounts = require('../config/accounts');

const accountName = process.argv[2];
if (!accountName || !accounts[accountName]) {
    logger.error(`Użycie: node import.js <nazwa_konta> (dostępne: ${Object.keys(accounts).join(', ')})`);
    process.exit(1);
}

validateEnv(['budgetbakers']);

const ACCOUNT_CONFIG = accounts[accountName];
const FILE_NAME = `${ACCOUNT_CONFIG.filePrefix}_${new Date().toISOString().slice(0, 10).replace(/-/g, '_')}.csv`;

(async () => {
    const browser = await createBrowser();
    const page = await createPage(browser);

    try {
        await loginToBudgetBakers(page, process.env.EMAIL);

        const filePath = path.resolve(__dirname, `../../${accountName}`, FILE_NAME);
        await importTransactions(page, filePath, ACCOUNT_CONFIG.budgetBakersAccount);

    } catch (error) {
        logger.error(`Wystąpił błąd: ${error.message}`);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
