// Util kompresi gambar.
// Foto dari kamera HP biasanya 2-8 MB. Bila disimpan mentah sebagai base64,
// kuota localStorage (±5 MB per origin) akan terlampaui dan penyimpanan GAGAL.
// Fungsi ini mengecilkan dimensi + mengompres ke JPEG agar aman disimpan.

/**
 * Kompres file gambar (dari <input type="file">) menjadi data URL JPEG kecil.
 * @param {File} file - file gambar dari kamera/galeri
 * @param {{maxDim?: number, quality?: number}} [opts]
 * @returns {Promise<string>} data URL (image/jpeg)
 */
export function compressImageFile(file, opts = {}) {
  const maxDim = opts.maxDim || 800;
  const quality = opts.quality || 0.6;

  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('File gambar tidak ditemukan'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar yang valid'));
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          const scale = Math.min(1, maxDim / Math.max(width, height));
          width = Math.max(1, Math.round(width * scale));
          height = Math.max(1, Math.round(height * scale));

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          // Latar putih agar area transparan tidak jadi hitam saat dikonversi ke JPEG
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
