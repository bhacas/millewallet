/**
 * Konfiguracja kont bankowych
 * Każde konto ma swoją konfigurację określającą selektory i prefiksy plików
 */

module.exports = {
  konto: {
    name: 'Konto osobiste',
    type: 'account',
    checkboxId: '#Account_checkBox_2',
    filePrefix: 'transactions',
    budgetBakersAccount: null, // domyślne konto
    downloadPath: './downloads'
  },
  kk: {
    name: 'Karta kredytowa',
    type: 'card',
    checkboxId: '#Card_checkBox_1',
    filePrefix: 'kk_transactions',
    budgetBakersAccount: 'Karta Kredytowa',
    downloadPath: './downloads'
  }
};
