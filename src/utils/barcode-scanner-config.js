/**
 * Konfigurasi scanner barcode yang dioptimalkan untuk HP.
 *
 * MASALAH YANG SERING MUNCUL pada barcode label kardus / tag produk:
 * 1. Barcode 1D (Code 128 / Code 39) butuh area pindai PANJANG dan TEBAL,
 *    bukan kotak kecil seperti QR Code.
 * 2. Tag kardus gelap + stiker putih kecil menghasilkan kontras tidak
 *    merata sehingga barcode sering gagal terkunci.
 * 3. Kamera HP default sering fokus otomatis ke subjek terdekat (jari).
 * 4. Resolusi preview bawaan html5-qrcode terlalu kecil untuk barcode
 *    compact seperti pada foto tag sepatu.
 *
 * Solusi di bawah ini menangani keempat poin tersebut.
 */
import { Html5QrcodeSupportedFormats } from 'html5-qrcode';

/** Format yang didukung, diurutkan dari prioritas. */
export const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128, // Label retail pada tag sepatu
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.QR_CODE
];

/**
 * Kotak pindai untuk barcode 1D.
 *
 * PENTING: qrbox TIDAK boleh lebih besar dari elemen container (#qr-reader),
 * jika tidak html5-qrcode akan men-crop video dan area pindai berada di luar
 * layar sehingga kamera tampak hitam.
 *
 * Area pindai dibuat lebar dan tipis (rasio sekitar 3:1) yang ideal untuk
 * bar/bar pada stiker label kardus.
 */
export function getQrbox1D() {
  // Ukur container bila sudah ter-render,fallback ke window
  const readerEl = document.getElementById('qr-reader');
  const containerW = readerEl && readerEl.clientWidth
    ? readerEl.clientWidth
    : window.innerWidth;
  const containerH = readerEl && readerEl.clientHeight
    ? readerEl.clientHeight
    : window.innerHeight;

  return {
    // Sisakan margin kecil agar tidak menyentuh tepi container
    width: Math.max(120, Math.min(460, Math.round(containerW * 0.92))),
    height: Math.max(60, Math.min(150, Math.round(containerH * 0.42)))
  };
}

/** Area pindai untuk QR Code / matrix (lebih tinggi,Opsional). */
export function getQrbox2D() {
  const readerEl = document.getElementById('qr-reader');
  const containerW = readerEl && readerEl.clientWidth ? readerEl.clientWidth : window.innerWidth;
  const containerH = readerEl && readerEl.clientHeight ? readerEl.clientHeight : window.innerHeight;

  return {
    width: Math.max(140, Math.min(320, Math.round(containerW * 0.8))),
    height: Math.max(140, Math.min(280, Math.round(containerH * 0.82)))
  };
}

/**
 * Constraint kamera: memaksa browser memakai resolusi setinggi mungkin
 * agar barcode kecil tetap terbaca.
 */
export function buildCameraConstraints() {
  return {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1920, min: 1280 },
    height: { ideal: 1080, min: 720 },
    frameRate: { ideal: 30, min: 1 }
  };
}

/** Konfigurasi utama scanner 1D. fps 30 supaya jauh lebih responsif. */
export function buildScannerConfig1D() {
  return {
    fps: 30,
    qrbox: getQrbox1D(),
    disableFlip: false,
    rememberLastUsedCamera: true,
    formatsToSupport: SUPPORTED_FORMATS,
    verbose: false
  };
}

/** Konfigurasi alternatif saat user ingin memindai barcode 2D. */
export function buildScannerConfig2D() {
  return {
    fps: 30,
    qrbox: getQrbox2D(),
    disableFlip: false,
    rememberLastUsedCamera: true,
    formatsToSupport: SUPPORTED_FORMATS,
    verbose: false
  };
}

/**
 * Peningkatan kontras pada layer preview kamera.
 * ZXing (mesin di balik html5-qrcode) jauh lebih akurat saat kontras
 * tipis pada label diperkuat dan noise dikurangi.
 * Diterapkan lewat CSS filter pada elemen video.
 */
export const VIDEO_ENHANCE_STYLE = {
  contrast: '1.4',
  brightness: '1.08',
  saturate: '0.85'
};

/**
 * Debounce hasil scan: mencegah callback berulang dari frame yang sama
 * (html5-qrcode dapat memanggil callback beberapa kali per detik).
 */
export function createScanDebouncer(delayMs = 1500) {
  let lastText = '';
  let lastTime = 0;
  return function shouldAccept(text) {
    const now = Date.now();
    if (text === lastText && now - lastTime < delayMs) return false;
    lastText = text;
    lastTime = now;
    return true;
  };
}

/**
 * Memperjelas tampilan video kamera agar barcode lebih mudah dibaca.
 *
 * CATATAN: html5-qrcode v2.3.8 menyisipkan <video> LANGSUNG sebagai anak
 * dari #qr-reader (tidak dibungkus video_wrapper), dan pada beberapa
 * perangkat elemen itu baru muncul setelah start() selesai.
 *
 * Dipanggil setelah scanner start.
 */
export function enhanceVideoElement(readerId) {
  const reader = document.getElementById(readerId);
  if (!reader) return;

  // Cari <video> di dalam reader, atau cari langsung bila/library beda struktur
  let video = reader.querySelector('video');
  if (!video) video = document.querySelector(`#${readerId} video`);
  if (!video) return;

  const { contrast, brightness, saturate } = VIDEO_ENHANCE_STYLE;
  video.style.filter = `contrast(${contrast}) brightness(${brightness}) saturate(${saturate})`;
  video.style.objectFit = 'cover';
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.display = 'block';

  // Pastikan video benar-benar mulai displaying frame
  if (video.paused) {
    const p = video.play();
    if (p && typeof p.catch === 'function') p.catch(() => { /* abaikan autoplay ditolak */ });
  }
}