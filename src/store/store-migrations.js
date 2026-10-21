/**
 * store-migrations.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Kumpulan fungsi migrasi data satu arah (idempotent).
 * Setiap fungsi menerima objek `data` (state mentah) dan memodifikasinya
 * di tempat (in-place) bila diperlukan, lalu menyimpan ke localStorage.
 *
 * Diekstrak dari store.js untuk menjaga keterbacaan & ukuran file.
 * Dipanggil dari store.js#loadState() saat pertama kali data dimuat.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const STORAGE_KEY = 'kas_juara_sepatu_data_v1';

/** Helper: simpan ke localStorage dengan silent fail */
function _save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rekonsiliasi faktur belanja ↔ transaksi kas keluar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Memastikan setiap faktur pengadaan belanja (supplies) yang berstatus 'lunas'
 * memiliki transaksi kas keluar 'Belanja Barang' yang lengkap sejumlah totalAmount faktur.
 * @returns {boolean} true jika ada perubahan
 */
export function migrateReconcileSupplyTransactions(data) {
  if (!data || !Array.isArray(data.supplies) || !Array.isArray(data.transactions)) return false;
  let changed = false;

  data.supplies.forEach((s) => {
    if (s.status !== 'lunas') return;
    const invNo = (s.invoiceNo || '').trim();
    if (!invNo) return;

    const expectedTotal = Number(s.totalAmount) || 0;
    if (expectedTotal <= 0) return;

    const existingTrxs = data.transactions.filter(
      (t) => t.type === 'keluar' &&
        (t.category === 'Belanja Barang' || t.category === 'Belanja') &&
        ((t.nota || '').trim() === invNo)
    );
    const existingTotal = existingTrxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    if (existingTotal < expectedTotal) {
      if (s.items && Array.isArray(s.items) && s.items.length > 0) {
        data.transactions = data.transactions.filter(
          (t) => !(t.type === 'keluar' && (t.category === 'Belanja Barang' || t.category === 'Belanja') && ((t.nota || '').trim() === invNo))
        );
        s.items.forEach((it, idx) => {
          const itemQty = Number(it.qty) || 1;
          const itemPrice = Number(it.buyPrice) || 0;
          const itemTotal = itemQty * itemPrice;
          const title = idx === 0
            ? `Belanja ${s.supplierName || 'Stok'} (1 pasang)`
            : `Tambah Belanja: ${it.name || 'TB'} (${s.supplierName || 'Stok'})`;
          data.transactions.push({
            id: `TRX-${Date.now()}-${idx}-${Math.floor(100 + Math.random() * 900)}`,
            date: s.date || '2026-10-16',
            nota: invNo, time: '14.00 WIB', type: 'keluar',
            title, amount: itemTotal, category: 'Belanja Barang',
            paymentMethod: s.paymentMethod || 'Tunai (Laci)',
            shippingNote: null, shippingResi: null, shippingStatus: null, shippingCourier: null
          });
        });
        changed = true;
      } else {
        const diff = expectedTotal - existingTotal;
        data.transactions.push({
          id: `TRX-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          date: s.date || '2026-10-16',
          nota: invNo, time: '14.00 WIB', type: 'keluar',
          title: `Belanja ${s.supplierName || 'Stok'}`, amount: diff,
          category: 'Belanja Barang', paymentMethod: s.paymentMethod || 'Tunai (Laci)',
          shippingNote: null, shippingResi: null, shippingStatus: null, shippingCourier: null
        });
        changed = true;
      }
    }
  });

  if (changed) _save(data);
  return changed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Migrasi kata "Kulakan" → "Belanja"
// ─────────────────────────────────────────────────────────────────────────────

export function migrateKulakan(data) {
  let changed = false;
  if (data.transactions && Array.isArray(data.transactions)) {
    data.transactions.forEach((t) => {
      if (t.category && t.category.toLowerCase().includes('kulakan')) {
        t.category = t.category.replace(/[Kk]ulakan/g, 'Belanja'); changed = true;
      }
      if (t.title && t.title.toLowerCase().includes('kulakan')) {
        t.title = t.title.replace(/[Kk]ulakan/g, 'Belanja'); changed = true;
      }
    });
  }
  if (data.investors && Array.isArray(data.investors)) {
    data.investors.forEach((inv) => {
      if (inv.notes && inv.notes.toLowerCase().includes('kulakan')) {
        inv.notes = inv.notes.replace(/[Kk]ulakan/g, 'Belanja'); changed = true;
      }
    });
  }
  if (changed) _save(data);
}

// ─────────────────────────────────────────────────────────────────────────────
// Migrasi nama cabang default
// ─────────────────────────────────────────────────────────────────────────────

export function migrateShopBranch(data) {
  if (data && data.shop && data.shop.subName === 'Cabang Veteran Bandung') {
    data.shop.subName = 'Cengkareng Jakarta Barat';
    _save(data);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hapus field 'inventory' lama (sumber stok kini dari supplies)
// ─────────────────────────────────────────────────────────────────────────────

export function migrateRemoveDummyInventory(data) {
  if (data && Object.prototype.hasOwnProperty.call(data, 'inventory')) {
    delete data.inventory;
    _save(data);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hapus field 'stock' / 'qty' dari katalog produk
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sebelumnya katalog produk punya field 'stock' yang dipakai sebagai sumber stok.
 * Mulai versi ini: sumber stok HANYA dari supplies (faktur belanja).
 */
export function migrateCleanProductStockField(data) {
  if (!data || !Array.isArray(data.products) || data.products.length === 0) return;
  let changed = false;
  data.products = data.products.map((p) => {
    if (Object.prototype.hasOwnProperty.call(p, 'stock') ||
        Object.prototype.hasOwnProperty.call(p, 'qty')) {
      const { stock, qty, ...rest } = p; // eslint-disable-line no-unused-vars
      changed = true;
      return rest;
    }
    return p;
  });
  if (changed) _save(data);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hapus data dummy/contoh bawaan aplikasi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Data yang dihapus:
 *  - Faktur belanja contoh: PASOK-01, PASOK-02, PASOK-03
 *  - Transaksi contoh: TRX-101 s/d TRX-110
 *  - Produk katalog dengan barcode contoh (hanya jika tidak dipakai supply nyata)
 */
export function migratePurgeDummyData(data) {
  if (!data) return;
  const DUMMY_SUPPLY_IDS = ['PASOK-01', 'PASOK-02', 'PASOK-03'];
  const DUMMY_TRX_IDS = ['TRX-101', 'TRX-102', 'TRX-103', 'TRX-104', 'TRX-105',
                         'TRX-106', 'TRX-107', 'TRX-108', 'TRX-109', 'TRX-110'];
  const DUMMY_BARCODES = new Set(['SP-2024-0089', 'VENTELA-41', 'PIERO-JGR', 'SLOP-KLT', 'OXFORD-42']);
  let changed = false;

  if (Array.isArray(data.supplies)) {
    const before = data.supplies.length;
    data.supplies = data.supplies.filter((s) => !DUMMY_SUPPLY_IDS.includes(s.id));
    if (data.supplies.length !== before) changed = true;
  }
  if (Array.isArray(data.transactions)) {
    const before = data.transactions.length;
    data.transactions = data.transactions.filter((t) => !DUMMY_TRX_IDS.includes(t.id));
    if (data.transactions.length !== before) changed = true;
  }
  if (Array.isArray(data.products)) {
    const usedBarcodes = new Set();
    (data.supplies || []).forEach((sup) => {
      if (Array.isArray(sup.items)) {
        sup.items.forEach((it) => {
          if (it.barcode) usedBarcodes.add(it.barcode.toString().trim().toUpperCase());
        });
      }
    });
    const before = data.products.length;
    data.products = data.products.filter((p) => {
      if (!p.barcode) return true;
      const bc = p.barcode.toString().trim().toUpperCase();
      return !(DUMMY_BARCODES.has(bc) && !usedBarcodes.has(bc));
    });
    if (data.products.length !== before) changed = true;
  }
  if (changed) _save(data);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rekonsiliasi data investor ↔ transaksi kas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Hapus transaksi kas masuk 'Dana Investor' yang investornya sudah dihapus.
 * 2. Pastikan investor aktif tertaut dua arah dengan transaksi kas masuknya.
 */
export function migrateReconcileInvestorsAndTransactions(data) {
  if (!data || !Array.isArray(data.transactions)) return;
  const investors = Array.isArray(data.investors) ? data.investors : [];
  let changed = false;

  const validInvestorIds = new Set(investors.map((i) => i.id));
  const validInvestorTrxIds = new Set(investors.map((i) => i.trxId).filter(Boolean));
  const initialTrxCount = data.transactions.length;

  data.transactions = data.transactions.filter((t) => {
    const isInvestorTrx =
      t.category === 'Dana Investor' || t.category === 'Investasi Modal' ||
      t.sourceType === 'investor' || (typeof t.nota === 'string' && t.nota.startsWith('#INV-'));
    if (!isInvestorTrx) return true;
    if (investors.length === 0) { changed = true; return false; }
    if (t.investorId && validInvestorIds.has(t.investorId)) return true;
    if (validInvestorTrxIds.has(t.id)) return true;

    const titleLower = (t.title || '').toLowerCase();
    const matchingInv = investors.find((inv) => {
      const name = (inv.investorName || '').toLowerCase().trim();
      return name && titleLower.includes(name);
    });
    if (matchingInv) {
      if (!matchingInv.trxId) matchingInv.trxId = t.id;
      t.investorId = matchingInv.id; t.sourceType = 'investor'; changed = true; return true;
    }
    changed = true; return false;
  });

  investors.forEach((inv) => {
    let trx = inv.trxId ? data.transactions.find((t) => t.id === inv.trxId) : null;
    if (!trx) trx = data.transactions.find((t) => t.investorId === inv.id);
    if (!trx) {
      const invName = (inv.investorName || '').toLowerCase().trim();
      trx = data.transactions.find((t) =>
        (t.category === 'Dana Investor' || t.category === 'Investasi Modal' ||
         (typeof t.nota === 'string' && t.nota.startsWith('#INV-'))) &&
        invName && t.title && t.title.toLowerCase().includes(invName)
      );
    }
    if (trx) {
      if (inv.trxId !== trx.id) { inv.trxId = trx.id; changed = true; }
      if (trx.investorId !== inv.id) { trx.investorId = inv.id; changed = true; }
      if (trx.sourceType !== 'investor') { trx.sourceType = 'investor'; changed = true; }
    }
  });

  if (changed || data.transactions.length !== initialTrxCount) _save(data);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tambah field paymentVerification ke semua transaksi masuk
// ─────────────────────────────────────────────────────────────────────────────

export function migrateAddPaymentVerification(data) {
  if (!data || !Array.isArray(data.transactions)) return;
  let changed = false;
  data.transactions.forEach((trx) => {
    if (trx.type !== 'masuk') return;
    const isInvestor = trx.category === 'Dana Investor' ||
                      trx.category === 'Investasi Modal' || trx.sourceType === 'investor';
    if (isInvestor) return;
    if (!trx.paymentVerification) {
      trx.paymentVerification = { status: 'pending', verifiedAt: null, verifiedBy: null, notes: '' };
      changed = true;
    }
  });
  if (changed) _save(data);
}
