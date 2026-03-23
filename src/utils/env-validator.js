/**
 * Walidator zmiennych środowiskowych
 */

const requiredEnvVars = {
  millennium: ['MILLEKOD', 'HASLO1', 'PESEL'],
  budgetbakers: ['EMAIL'],
  gmail: [] // credentials.json i token.json są opcjonalne do sprawdzenia aplikacyjnie
};

/**
 * Sprawdza czy wszystkie wymagane zmienne środowiskowe są ustawione
 * @param {string[]} modules - Lista modułów do sprawdzenia ('millennium', 'budgetbakers', 'gmail')
 * @throws {Error} Jeśli brakuje wymaganych zmiennych
 */
function validateEnv(modules = []) {
  const missing = [];
  
  modules.forEach(module => {
    const vars = requiredEnvVars[module] || [];
    vars.forEach(varName => {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    });
  });
  
  if (missing.length > 0) {
    throw new Error(
      `Brakujące zmienne środowiskowe: ${missing.join(', ')}\n` +
      `Upewnij się, że plik .env zawiera wszystkie wymagane zmienne.`
    );
  }
}

/**
 * Sprawdza PESEL czy ma 11 cyfr
 */
function validatePesel() {
  const pesel = process.env.PESEL;
  if (pesel && !/^\d{11}$/.test(pesel)) {
    throw new Error('PESEL musi składać się z dokładnie 11 cyfr');
  }
}

module.exports = {
  validateEnv,
  validatePesel
};
