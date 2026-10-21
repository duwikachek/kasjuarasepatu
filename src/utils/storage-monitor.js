/**
 * storage-monitor.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Monitor penggunaan localStorage untuk mencegah data penuh.
 *
 * Masalah yang diatasi:
 * - Semua data (transaksi + foto produk) disimpan dalam 1 JSON blob
 * - Foto base64 bisa sangat besar → localStorage penuh → data hilang
 *
 * Solusi:
 * 1. `getStorageUsage()` — laporan penggunaan storage saat ini
 * 2. `checkStorageHealth()` — cek kondisi dan warning jika mendekati limit
 * 3. `PHOTO_STORAGE_KEY` — foto disimpan di key terpisah (bukan di state blob)
 * 4. `getPhoto() / savePhoto() / deletePhoto()` — API foto terpisah dari state
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Key utama state aplikasi */
const MAIN_KEY = 'kas_juara_sepatu_data_v1';

/**
 * Key terpisah untuk menyimpan foto produk.
 * Dipisahkan agar state utama (yang disync ke Supabase) tetap kecil.
 */
export const PHOTO_STORAGE_KEY = 'kas_juara_photos_v1';

/** Perkiraan batas localStorage browser (bytes) */
const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024; // 5 MB konservatif

// ─────────────────────────────────────────────────────────────────────────────
// Usage monitoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hitung estimasi ukuran total localStorage yang terpakai (dalam bytes).
 * @returns {{ totalBytes: number, mainStateBytes: number, photoBytes: number, otherBytes: number, usagePercent: number }}
 */
export function getStorageUsage() {
  let totalBytes = 0;
  let mainStateBytes = 0;
  let photoBytes = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key) || '';
      // 2 bytes per karakter UTF-16 (worst case, tapi lebih akurat untuk base64)
      const size = (key.length + value.length) * 2;
      totalBytes += size;

      if (key === MAIN_KEY) mainStateBytes = size;
      else if (key === PHOTO_STORAGE_KEY) photoBytes = size;
    }
  } catch (e) {
    console.warn('[Storage] Gagal membaca localStorage:', e);
  }

  const otherBytes = totalBytes - mainStateBytes - photoBytes;
  const usagePercent = Math.round((totalBytes / STORAGE_LIMIT_BYTES) * 100);

  return { totalBytes, mainStateBytes, photoBytes, otherBytes, usagePercent };
}

/**
 * Format bytes menjadi string yang mudah dibaca (KB / MB).
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Periksa kondisi storage dan kembalikan status serta pesan peringatan.
 * @returns {{ status: 'ok'|'warning'|'critical', percent: number, message: string, detail: Object }}
 */
export function checkStorageHealth() {
  const usage = getStorageUsage();
  const { usagePercent, totalBytes, mainStateBytes, photoBytes } = usage;

  let status, message;

  if (usagePercent >= 90) {
    status = 'critical';
    message = `⚠️ Penyimpanan browser HAMPIR PENUH (${usagePercent}%). Segera lakukan ekspor backup JSON atau hapus foto produk yang tidak perlu.`;
  } else if (usagePercent >= 70) {
    status = 'warning';
    message = `⚠️ Penyimpanan browser ${usagePercent}% terisi. Disarankan melakukan backup data.`;
  } else {
    status = 'ok';
    message = `Penyimpanan browser ${usagePercent}% terisi — kondisi aman.`;
  }

  return {
    status,
    percent: usagePercent,
    message,
    detail: {
      total: formatBytes(totalBytes),
      mainState: formatBytes(mainStateBytes),
      photos: formatBytes(photoBytes),
      limit: formatBytes(STORAGE_LIMIT_BYTES)
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Foto storage terpisah
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil semua foto dari key foto terpisah.
 * @returns {Object} Map: { [barcode]: base64DataUrl }
 */
export function getAllPhotos() {
  try {
    const raw = localStorage.getItem(PHOTO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('[Storage] Gagal membaca foto:', e);
    return {};
  }
}

/**
 * Ambil foto satu produk berdasarkan barcode.
 * @param {string} barcode
 * @returns {string|null}
 */
export function getPhoto(barcode) {
  const photos = getAllPhotos();
  return photos[barcode] || null;
}

/**
 * Simpan foto produk ke key terpisah (bukan di state blob utama).
 * @param {string} barcode
 * @param {string} base64DataUrl
 * @returns {boolean} true jika berhasil
 */
export function savePhoto(barcode, base64DataUrl) {
  try {
    const photos = getAllPhotos();
    photos[barcode] = base64DataUrl;
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(photos));
    return true;
  } catch (e) {
    console.warn('[Storage] Gagal menyimpan foto:', e);
    return false;
  }
}

/**
 * Hapus foto satu produk dari storage.
 * @param {string} barcode
 */
export function deletePhoto(barcode) {
  try {
    const photos = getAllPhotos();
    delete photos[barcode];
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(photos));
  } catch (e) {
    console.warn('[Storage] Gagal menghapus foto:', e);
  }
}

/**
 * Hapus foto-foto yang tidak lagi dipakai oleh produk manapun.
 * Menjaga ukuran storage tetap bersih.
 * @param {string[]} activeBarcodes - Daftar barcode produk yang masih aktif
 * @returns {number} Jumlah foto yang dihapus
 */
export function pruneOrphanPhotos(activeBarcodes) {
  const activeSet = new Set(activeBarcodes.map((b) => String(b).trim().toUpperCase()));
  const photos = getAllPhotos();
  let removed = 0;

  for (const barcode of Object.keys(photos)) {
    if (!activeSet.has(barcode.trim().toUpperCase())) {
      delete photos[barcode];
      removed++;
    }
  }

  if (removed > 0) {
    try {
      localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(photos));
      console.log(`[Storage] ${removed} foto yatim piatu (orphan) dibersihkan.`);
    } catch (e) {
      console.warn('[Storage] Gagal menyimpan setelah prune:', e);
    }
  }

  return removed;
}
