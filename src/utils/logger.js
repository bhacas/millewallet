/**
 * Prosty logger z kolorowymi komunikatami
 */

const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  debug: (msg) => console.log(`🔍 ${msg}`),
  
  // Specjalne ikony dla różnych akcji
  login: (msg) => console.log(`🔐 ${msg}`),
  download: (msg) => console.log(`📥 ${msg}`),
  upload: (msg) => console.log(`📤 ${msg}`),
  wait: (msg) => console.log(`⏳ ${msg}`),
  file: (msg) => console.log(`📁 ${msg}`),
  email: (msg) => console.log(`📧 ${msg}`),
  link: (msg) => console.log(`🔗 ${msg}`),
  finished: (msg) => console.log(`🏁 ${msg}`)
};

module.exports = logger;
