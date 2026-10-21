/**
 * pin-crypto.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilitas kriptografi PIN menggunakan Web Crypto API (SHA-256).
 *
 * Alasan menggunakan SHA-256 + salt statis (bukan bcrypt):
 * - Browser tidak mendukung bcrypt secara native; SHA-256 tersedia via SubtleCrypto
 * - PIN 6 digit adalah low-entropy secret; salt mencegah rainbow table attack
 * - Proteksi utama adalah UI (rate-limiting attempt, session storage isolation)
 *
 * Format hash yang disimpan: "sha256:{hex_hash}"
 * Hash lama (plain text, 6 digit) otomatis dideteksi & dimigrasikan.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Salt statis — menambah kompleksitas brute force tanpa perlu backend */
const PIN_SALT = 'kas-juara-sepatu-2026';

/**
 * Hash PIN menggunakan SHA-256.
 * @param {string} pin - PIN 6 digit
 * @returns {Promise<string>} - Format: "sha256:{hex}"
 */
export async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${PIN_SALT}:${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${hex}`;
}

/**
 * Verifikasi PIN yang dimasukkan terhadap hash tersimpan.
 * Mendukung dua format: hash baru ("sha256:...") dan plain text lama (6 digit).
 *
 * @param {string} inputPin  - PIN yang diketikkan user (plain text)
 * @param {string} storedPin - Nilai dari shop.pin / shop.pinAtasan (hash atau plain)
 * @returns {Promise<boolean>}
 */
export async function verifyPin(inputPin, storedPin) {
  if (!inputPin || !storedPin) return false;

  // Format baru: hash SHA-256
  if (storedPin.startsWith('sha256:')) {
    const inputHash = await hashPin(inputPin);
    return inputHash === storedPin;
  }

  // Format lama: plain text 6 digit (backward compatible, sebelum migrasi)
  return inputPin === storedPin;
}

/**
 * Cek apakah nilai PIN sudah di-hash (format baru) atau masih plain text.
 * @param {string} pinValue
 * @returns {boolean}
 */
export function isPinHashed(pinValue) {
  return typeof pinValue === 'string' && pinValue.startsWith('sha256:');
}

/**
 * Migrasikan PIN plain text ke format hash secara async.
 * Dipanggil saat Admin pertama kali login setelah update.
 *
 * @param {Object} shop   - Objek shop dari store
 * @param {Function} updateShop - Fungsi store.updateShop()
 * @returns {Promise<void>}
 */
export async function migratePinsToHash(shop, updateShop) {
  const updates = {};
  let needsMigration = false;

  if (shop.pin && !isPinHashed(shop.pin)) {
    updates.pin = await hashPin(shop.pin);
    needsMigration = true;
  }
  if (shop.pinAtasan && !isPinHashed(shop.pinAtasan)) {
    updates.pinAtasan = await hashPin(shop.pinAtasan);
    needsMigration = true;
  }

  if (needsMigration) {
    updateShop(updates);
    console.log('[PIN] PIN berhasil dimigrasikan ke format hash SHA-256.');
  }
}
