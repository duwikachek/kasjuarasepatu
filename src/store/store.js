import { INITIAL_DATA } from '../data/dummy.js';
import { showToast } from '../components/toast.js';

const STORAGE_KEY = 'kas_juara_sepatu_data_v1';
// Salinan darurat bila data tersimpan rusak / gagal diparse
const BACKUP_KEY = 'kas_juara_sepatu_data_v1__backup';

class Store {
  constructor() {
    this.state = this.loadState();
    this.listeners = [];
  }

  loadState() {
    let stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      console.error('Tidak dapat membaca penyimpanan browser', e);
    }

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (!parsed.investors) {
          parsed.investors = JSON.parse(JSON.stringify(INITIAL_DATA.investors || []));
        }
        if (!parsed.opnameRecords) {
          parsed.opnameRecords = [];
        }
        // Migrate: rename 'Kulakan Barang' -> 'Belanja Barang' in existing data
        this._migrateKulakan(parsed);
        // Migrate: default branch name 'Cabang Veteran Bandung' -> 'Cengkareng Jakarta Barat'
        this._migrateShopBranch(parsed);
        // Migrate: hapus data contoh 'inventory' lama (alert stok kini pakai data nyata)
        this._migrateRemoveDummyInventory(parsed);
        return parsed;
      } catch (e) {
        // Data rusak: JANGAN langsung buang. Simpan salinan mentahnya ke key backup.
        console.error('Data tersimpan rusak; salinan mentah disimpan ke key backup', e);
        try { localStorage.setItem(BACKUP_KEY, stored); } catch (e2) { /* ignore */ }
      }
    }

    const fresh = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveState(fresh);
    return fresh;
  }

  _migrateKulakan(data) {
    let changed = false;
    if (data.transactions && Array.isArray(data.transactions)) {
      data.transactions.forEach((t) => {
        if (t.category && t.category.toLowerCase().includes('kulakan')) {
          t.category = t.category.replace(/[Kk]ulakan/g, 'Belanja');
          changed = true;
        }
        if (t.title && t.title.toLowerCase().includes('kulakan')) {
          t.title = t.title.replace(/[Kk]ulakan/g, 'Belanja');
          changed = true;
        }
      });
    }
    if (data.investors && Array.isArray(data.investors)) {
      data.investors.forEach((inv) => {
        if (inv.notes && inv.notes.toLowerCase().includes('kulakan')) {
          inv.notes = inv.notes.replace(/[Kk]ulakan/g, 'Belanja');
          changed = true;
        }
      });
    }
    if (changed) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) { /* ignore */ }
    }
  }

  _migrateShopBranch(data) {
    if (data && data.shop && data.shop.subName === 'Cabang Veteran Bandung') {
      data.shop.subName = 'Cengkareng Jakarta Barat';
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) { /* ignore */ }
    }
  }

  _migrateRemoveDummyInventory(data) {
    // `inventory` adalah data contoh lama yang tidak pernah diubah/diisi aplikasi.
    // Dihapus agar alert "Stok Menipis" memakai perhitungan dari data nyata.
    if (data && Object.prototype.hasOwnProperty.call(data, 'inventory')) {
      delete data.inventory;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) { /* ignore */ }
    }
  }

  /**
   * Simpan state ke localStorage.
   * Mengembalikan true bila berhasil. Bila kuota browser penuh, otomatis
   * mencoba menyimpan versi ringkas (tanpa foto) supaya data transaksi & stok
   * tidak hilang, lalu memberi peringatan kepada pengguna.
   */
  saveState(newState) {
    const data = newState || this.state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this._saveErrorShown = false;
      return true;
    } catch (e) {
      console.error('Gagal menyimpan ke localStorage', e);

      // Fallback: simpan tanpa foto agar data penting tetap tersimpan
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._stripPhotos(data)));
        this._warnSaveOnce('Penyimpanan browser penuh. Foto tidak ikut tersimpan, tetapi data transaksi & stok tetap aman.');
        return false;
      } catch (e2) {
        console.error('Gagal menyimpan versi ringkas', e2);
      }

      this._warnSaveOnce('GAGAL menyimpan data ke browser! Segera lakukan Backup (Ekspor JSON) atau sinkronkan ke Google Sheets.');
      return false;
    }
  }

  _warnSaveOnce(message) {
    if (this._saveErrorShown) return;
    this._saveErrorShown = true;
    try { showToast(message, 'error', 6000); } catch (e) { /* ignore */ }
  }

  /** Salinan state tanpa data foto (fallback saat kuota penyimpanan penuh). */
  _stripPhotos(data) {
    const clone = JSON.parse(JSON.stringify(data || {}));
    const stripItem = (it) => { if (it && typeof it === 'object' && it.photo) delete it.photo; };
    (clone.transactions || []).forEach((t) => {
      stripItem(t);
      if (Array.isArray(t.items)) t.items.forEach(stripItem);
    });
    (clone.supplies || []).forEach((s) => {
      if (Array.isArray(s.items)) s.items.forEach(stripItem);
    });
    (clone.products || []).forEach(stripItem);
    return clone;
  }

  notify() {
    this.saveState();
    this.listeners.forEach((fn) => {
      try { fn(this.state); } catch (err) { console.error(err); }
    });
    this.triggerAutoSync();
  }

  triggerAutoSync() {
    const cfg = this.getGoogleSheetsConfig();
    if (!cfg || !cfg.autoSync || !cfg.spreadsheetId) return;

    if (this._autoSyncTimer) clearTimeout(this._autoSyncTimer);
    this._autoSyncTimer = setTimeout(async () => {
      try {
        const { syncAllToGoogleSheets } = await import('../services/googleSheets.js');
        await syncAllToGoogleSheets(this);
        console.log('[GoogleSheets] Background auto-sync completed');
      } catch (e) {
        console.warn('[GoogleSheets] Auto-sync failed:', e.message);
      }
    }, 2500);
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  // Shop Info
  getShop() {
    return this.state.shop;
  }

  updateShop(shopData) {
    this.state.shop = { ...this.state.shop, ...shopData };
    this.notify();
  }

  // Transactions
  getTransactions() {
    return this.state.transactions || [];
  }

  addTransaction(trx) {
    const isInvestor = trx.category === 'Dana Investor' || trx.category === 'Investasi Modal';
    const newTrx = {
      id: `TRX-${Date.now()}`,
      date: trx.date || new Date().toISOString().split('T')[0],
      time: trx.time || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      nota: trx.nota || `#NOTA-${Math.floor(1000 + Math.random() * 9000)}`,
      shippingStatus: trx.shippingStatus !== undefined ? trx.shippingStatus : (trx.type === 'masuk' && !isInvestor ? 'kemas' : null),
      shippingCourier: trx.shippingCourier || null,
      shippingResi: trx.shippingResi || null,
      shippingNote: trx.shippingNote || null,
      ...trx
    };
    this.state.transactions.unshift(newTrx);
    this.notify();
    return newTrx;
  }

  getTransactionById(id) {
    return this.state.transactions.find((t) => t.id === id) || null;
  }

  updateTransaction(id, updatedData) {
    const idx = this.state.transactions.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.state.transactions[idx] = { ...this.state.transactions[idx], ...updatedData };
      this.notify();
      return this.state.transactions[idx];
    }
    return null;
  }

  deleteTransaction(id) {
    this.state.transactions = this.state.transactions.filter((t) => t.id !== id);
    this.notify();
  }

  // Supplies (Barang Masuk)
  getSupplies() {
    return this.state.supplies || [];
  }

  addSupply(supply) {
    const newSupply = {
      id: `PASOK-${Date.now()}`,
      invoiceNo: supply.invoiceNo || `#BLJ-${Math.floor(100 + Math.random() * 900)}`,
      date: supply.date || new Date().toISOString().split('T')[0],
      status: supply.status || 'lunas',
      ...supply
    };
    this.state.supplies.unshift(newSupply);

    // Auto-upsert each item with barcode into master products catalog
    if (supply.items && Array.isArray(supply.items)) {
      supply.items.forEach((it) => {
        if (it.barcode) {
          this.upsertProduct({
            barcode: it.barcode,
            name: it.name,
            kondisi: it.kondisi || 'Bagus',
            catatanMinus: it.catatanMinus || '',
            photo: it.photo || null,
            buyPrice: it.buyPrice,
            supplier: supply.supplierName,
            date: supply.date,
            qty: it.qty
          });
        }
      });
    }

    // If paid immediately, also record a cash out transaction!
    if (supply.status === 'lunas' && supply.recordTransaction !== false) {
      this.addTransaction({
        type: 'keluar',
        category: 'Belanja Barang',
        amount: supply.totalAmount,
        title: `Belanja ${supply.supplierName} (${supply.itemsCount || 1} pasang)`,
        paymentMethod: supply.paymentMethod || 'Tunai (Laci)',
        nota: newSupply.invoiceNo
      });
    }

    this.notify();
    return newSupply;
  }

  getSupplyById(id) {
    return this.state.supplies.find((s) => s.id === id) || null;
  }

  updateSupply(id, updatedData) {
    const idx = this.state.supplies.findIndex((s) => s.id === id);
    if (idx !== -1) {
      const existing = this.state.supplies[idx];
      let updatedItems = updatedData.items;
      if (!updatedItems && updatedData.itemName && existing.items && existing.items.length > 0) {
        updatedItems = [{
          ...existing.items[0],
          name: updatedData.itemName,
          barcode: updatedData.barcode || existing.items[0].barcode,
          kondisi: updatedData.kondisi || existing.items[0].kondisi,
          catatanMinus: updatedData.catatanMinus !== undefined ? updatedData.catatanMinus : existing.items[0].catatanMinus,
          photo: updatedData.photo !== undefined ? updatedData.photo : existing.items[0].photo,
          buyPrice: updatedData.unitPrice || existing.items[0].buyPrice,
          qty: updatedData.quantity || existing.items[0].qty
        }];
      }

      this.state.supplies[idx] = { 
        ...existing, 
        ...updatedData, 
        ...(updatedItems ? { items: updatedItems } : {}) 
      };
      
      // Update catalog products if items provided
      const catalogItems = updatedItems || existing.items;
      if (catalogItems && Array.isArray(catalogItems)) {
        catalogItems.forEach((it) => {
          if (it.barcode) {
            this.upsertProduct({
              barcode: it.barcode,
              name: it.name,
              kondisi: it.kondisi || 'Bagus',
              catatanMinus: it.catatanMinus || '',
              photo: it.photo || null,
              buyPrice: it.buyPrice,
              supplier: updatedData.supplierName || this.state.supplies[idx].supplierName,
              date: updatedData.date || this.state.supplies[idx].date,
              qty: it.qty
            });
          }
        });
      }

      this.notify();
      return this.state.supplies[idx];
    }
    return null;
  }

  addItemToSupply(id, newItem) {
    const idx = this.state.supplies.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const existing = this.state.supplies[idx];
    const currentItems = Array.isArray(existing.items) ? [...existing.items] : [];
    currentItems.push(newItem);

    const totalAmount = currentItems.reduce((sum, it) => sum + ((Number(it.buyPrice) || 0) * (Number(it.qty) || 1)), 0);
    const itemsCount = currentItems.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);

    const updated = this.updateSupply(id, {
      items: currentItems,
      totalAmount: totalAmount,
      itemsCount: itemsCount
    });

    // Record cash out if lunas
    if (existing.status === 'lunas') {
      const addedAmount = (Number(newItem.buyPrice) || 0) * (Number(newItem.qty) || 1);
      this.addTransaction({
        type: 'keluar',
        category: 'Belanja Barang',
        amount: addedAmount,
        title: `Tambah Belanja: ${newItem.name} (${existing.supplierName})`,
        paymentMethod: existing.paymentMethod || 'Tunai (Laci)',
        nota: existing.invoiceNo
      });
    }

    return updated;
  }

  deleteSupply(id) {
    this.state.supplies = this.state.supplies.filter((s) => s.id !== id);
    this.notify();
  }

  // Master Catalog Products (Indexed by Barcode Code 39)
  getProducts() {
    if (!this.state.products || !Array.isArray(this.state.products)) {
      this.state.products = (INITIAL_DATA.products && [...INITIAL_DATA.products]) || [];
    }
    return this.state.products;
  }

  // Available In-Stock Products (excluding already sold items)
  // Hanya dari entri Barang Masuk (supplies) - bukan dari katalog produk
  getAvailableProducts(excludeTrxId = null) {
    const transactions = this.getTransactions();
    const soldSet = new Set();

    transactions.forEach((t) => {
      if (t.type === 'masuk' && (!excludeTrxId || t.id !== excludeTrxId)) {
        if (t.barcode) soldSet.add(t.barcode.toString().trim().toUpperCase());
        if (t.items && Array.isArray(t.items)) {
          t.items.forEach((it) => {
            if (it.barcode) soldSet.add(it.barcode.toString().trim().toUpperCase());
          });
        }
      }
    });

    const resultMap = new Map();

    // HANYA dari entri Barang Masuk (supplies) yang punya barcode
    const supplies = this.getSupplies();
    supplies.forEach((sup) => {
      if (sup.items && Array.isArray(sup.items)) {
        sup.items.forEach((it) => {
          if (it.barcode && it.barcode.trim()) {
            const clean = it.barcode.toString().trim().toUpperCase();
            if (!soldSet.has(clean) && !resultMap.has(clean)) {
              resultMap.set(clean, {
                barcode: it.barcode,
                name: it.name,
                kondisi: it.kondisi || 'Bagus',
                sellPrice: it.sellPrice || (it.buyPrice ? Math.round(Number(it.buyPrice) * 1.35) : 0),
                buyPrice: it.buyPrice || 0,
                photo: it.photo || null,
                supplier: sup.supplierName || ''
              });
            }
          }
        });
      }
    });

    return Array.from(resultMap.values());
  }

  isBarcodeSold(barcode, excludeTrxId = null) {
    return Boolean(this.findSoldTransactionByBarcode(barcode, excludeTrxId));
  }

  findSoldTransactionByBarcode(barcode, excludeTrxId = null) {
    if (!barcode) return null;
    const clean = barcode.toString().trim().toUpperCase();
    const transactions = this.getTransactions();

    for (const t of transactions) {
      if (t.type !== 'masuk' || (excludeTrxId && t.id === excludeTrxId)) continue;

      // Check primary barcode
      if (t.barcode && t.barcode.toString().trim().toUpperCase() === clean) {
        return t;
      }

      // Check items list in multi-shoe transaction
      if (t.items && Array.isArray(t.items)) {
        const found = t.items.find((it) => it.barcode && it.barcode.toString().trim().toUpperCase() === clean);
        if (found) {
          return t;
        }
      }
    }

    return null;
  }

  getProductByBarcode(barcode) {
    if (!barcode) return null;
    const clean = barcode.toString().trim().toUpperCase();

    // 1. Search in products catalog
    const products = this.getProducts();
    const found = products.find((p) => p.barcode && p.barcode.toString().trim().toUpperCase() === clean);
    if (found) return found;

    // 2. Search in supplies history
    const supplies = this.getSupplies();
    for (const sup of supplies) {
      if (sup.items && Array.isArray(sup.items)) {
        const item = sup.items.find((it) => it.barcode && it.barcode.toString().trim().toUpperCase() === clean);
        if (item) {
          return {
            barcode: item.barcode,
            name: item.name,
            kondisi: item.kondisi || 'Bagus',
            catatanMinus: item.catatanMinus || '',
            photo: item.photo || null,
            buyPrice: item.buyPrice || 0,
            supplier: sup.supplierName,
            date: sup.date
          };
        }
      }
    }

    return null;
  }

  upsertProduct(product) {
    if (!product || !product.barcode) return null;
    const products = this.getProducts();
    const clean = product.barcode.toString().trim().toUpperCase();
    const idx = products.findIndex((p) => p.barcode && p.barcode.toString().trim().toUpperCase() === clean);

    if (idx >= 0) {
      products[idx] = { ...products[idx], ...product };
    } else {
      products.unshift(product);
    }
    this.saveState();
    return product;
  }

  // Inventory / Stok
  /**
   * Daftar produk dengan stok menipis, dihitung dari DATA NYATA:
   * item Barang Masuk yang belum terjual, dikelompokkan per nama produk.
   * @param {number} threshold - sisa stok yang dianggap menipis (default 2)
   */
  getLowStockItems(threshold = 2) {
    const available = this.getAvailableProducts();
    const byName = new Map();

    available.forEach((p) => {
      const key = (p.name || 'Tanpa Nama').toString().trim();
      if (!byName.has(key)) byName.set(key, { name: key, stock: 0 });
      byName.get(key).stock += 1;
    });

    return Array.from(byName.values())
      .filter((p) => p.stock <= threshold)
      .sort((a, b) => a.stock - b.stock);
  }

  // Financial Calculations & Aggregates
  getBalanceSummary() {
    const trxs = this.getTransactions();
    let totalMasuk = 0;
    let totalKeluar = 0;
    let countMasuk = 0;
    let countKeluar = 0;

    trxs.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'masuk') {
        totalMasuk += amt;
        countMasuk++;
      } else {
        totalKeluar += amt;
        countKeluar++;
      }
    });

    const initialTotal = (this.state.shop.initialBalanceLaci || 0) + (this.state.shop.initialBalanceBank || 0);
    const currentBalance = initialTotal + totalMasuk - totalKeluar;

    return {
      currentBalance,
      totalMasuk,
      totalKeluar,
      countMasuk,
      countKeluar,
      netProfit: totalMasuk - totalKeluar
    };
  }

  // Shipments (Pengiriman Sepatu Terjual: Kemas, Kirim, Hold, Selesai)
  getShipments(filterStatus = null) {
    const allMasuk = (this.state.transactions || []).filter((t) => t.type === 'masuk');
    const withStatus = allMasuk.map((t) => ({
      ...t,
      shippingStatus: t.shippingStatus || 'kemas'
    }));

    if (!filterStatus || filterStatus === 'all') {
      return withStatus;
    }
    return withStatus.filter((t) => t.shippingStatus === filterStatus);
  }

  updateShipmentStatus(trxId, { status, courier, resi, note }) {
    const idx = this.state.transactions.findIndex((t) => t.id === trxId);
    if (idx !== -1) {
      const cur = this.state.transactions[idx];
      this.state.transactions[idx] = {
        ...cur,
        shippingStatus: status || cur.shippingStatus || 'kemas',
        shippingCourier: courier !== undefined ? courier : cur.shippingCourier,
        shippingResi: resi !== undefined ? resi : cur.shippingResi,
        shippingNote: note !== undefined ? note : cur.shippingNote,
        shippingUpdatedAt: new Date().toISOString()
      };
      this.notify();
      return this.state.transactions[idx];
    }
    return null;
  }

  getShipmentSummary() {
    const shipments = this.getShipments();
    let countKemas = 0;
    let countKirim = 0;
    let countHold = 0;
    let countSelesai = 0;

    shipments.forEach((s) => {
      const st = s.shippingStatus || 'kemas';
      if (st === 'kemas') countKemas++;
      else if (st === 'kirim') countKirim++;
      else if (st === 'hold') countHold++;
      else if (st === 'selesai') countSelesai++;
    });

    return {
      total: shipments.length,
      countKemas,
      countKirim,
      countHold,
      countSelesai
    };
  }

  // Reset / Bersihkan Data
  /**
   * Hapus HANYA record contoh (dummy) bawaan aplikasi, berdasarkan ID/barcode persis.
   * Data asli pengguna tidak disentuh. Mengembalikan jumlah yang dihapus.
   */
  purgeSampleData() {
    const SAMPLE_TRX_IDS = ['TRX-101', 'TRX-102', 'TRX-103', 'TRX-104', 'TRX-105', 'TRX-106', 'TRX-107', 'TRX-108', 'TRX-109', 'TRX-110'];
    const SAMPLE_SUPPLY_IDS = ['PASOK-01', 'PASOK-02', 'PASOK-03'];
    const SAMPLE_INVESTOR_IDS = ['INV-1711000001', 'INV-1711000002'];
    // Produk contoh hanya dihapus bila barcode DAN namanya sama persis (agar aman)
    const SAMPLE_PRODUCTS = [
      { barcode: 'SP-2024-0089', name: 'Compass Gazelle Low Retro Size 40-43' },
      { barcode: 'VENTELA-41', name: 'Ventela Public Low Black Natural Size 41' },
      { barcode: 'PIERO-JGR', name: 'Piero Jogger Premium Grey Size 42' },
      { barcode: 'SLOP-KLT', name: 'Sandal Slop Kulit Pria Asli Sentosa Size 41' }
    ];

    const counts = {};
    const filterOut = (list, isSample) => {
      const before = (list || []).length;
      const after = (list || []).filter((x) => !isSample(x));
      counts.removed = (counts.removed || 0) + (before - after.length);
      return after;
    };

    this.state.transactions = filterOut(this.state.transactions, (t) => SAMPLE_TRX_IDS.includes(t.id));
    this.state.supplies = filterOut(this.state.supplies, (s) => SAMPLE_SUPPLY_IDS.includes(s.id));
    this.state.investors = filterOut(this.state.investors, (i) => SAMPLE_INVESTOR_IDS.includes(i.id));
    this.state.products = filterOut(this.state.products, (p) => {
      const bc = (p.barcode || '').toString().trim().toUpperCase();
      const nm = (p.name || '').toString().trim();
      return SAMPLE_PRODUCTS.some((s) => s.barcode === bc && s.name === nm);
    });

    const removed = counts.removed || 0;
    this.saveState();
    this.notify();
    return removed;
  }

  /** Kosongkan semua data transaksi & master (mulai baru), pengaturan toko tetap disimpan. */
  resetToEmpty() {
    const keptShop = this.state.shop ? JSON.parse(JSON.stringify(this.state.shop)) : JSON.parse(JSON.stringify(INITIAL_DATA.shop));
    const keptSheets = this.state.googleSheets ? JSON.parse(JSON.stringify(this.state.googleSheets)) : null;

    this.state = {
      shop: keptShop,
      transactions: [],
      supplies: [],
      products: [],
      investors: []
    };
    if (keptSheets) this.state.googleSheets = keptSheets;

    this.saveState();
    this.notify();
  }

  exportData() {
    return JSON.stringify(this.state, null, 2);
  }

  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.shop && parsed.transactions) {
        this.state = parsed;
        this.saveState();
        this.notify();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  // =====================
  // Shipment / Pengiriman
  // =====================

  /** Ambil semua transaksi 'masuk' (penjualan) berdasarkan status pengiriman */
  getShipments(status) {
    const trxs = this.state.transactions || [];
    return trxs.filter((t) => {
      if (t.type !== 'masuk') return false;
      if (t.category === 'Dana Investor' || t.category === 'Investasi Modal' || t.shippingStatus === null) return false;
      const s = t.shippingStatus || 'kemas';
      return status ? s === status : true;
    });
  }

  /** Update status pengiriman + metadata (kurir, resi, catatan) */
  updateShipmentStatus(id, { status, courier, resi, note } = {}) {
    const idx = this.state.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const trx = this.state.transactions[idx];
    this.state.transactions[idx] = {
      ...trx,
      shippingStatus: status !== undefined ? status : (trx.shippingStatus || 'kemas'),
      shippingCourier: courier !== undefined ? courier : trx.shippingCourier,
      shippingResi: resi !== undefined ? resi : trx.shippingResi,
      shippingNote: note !== undefined ? note : trx.shippingNote
    };
    this.notify();
    return this.state.transactions[idx];
  }

  /** Ringkasan jumlah paket per status */
  getShipmentSummary() {
    const trxs = this.getShipments();
    return {
      countKemas:   trxs.filter((t) => (t.shippingStatus || 'kemas') === 'kemas').length,
      countKirim:   trxs.filter((t) => t.shippingStatus === 'kirim').length,
      countHold:    trxs.filter((t) => t.shippingStatus === 'hold').length,
      countSelesai: trxs.filter((t) => t.shippingStatus === 'selesai').length,
      total:        trxs.length
    };
  }

  // =====================
  // Investor Management
  // =====================

  getInvestors() {
    return this.state.investors || [];
  }

  getInvestorById(id) {
    return (this.state.investors || []).find((i) => i.id === id) || null;
  }

  addInvestor(data) {
    if (!this.state.investors) this.state.investors = [];
    const id = `INV-${Date.now()}`;
    const totalAmount = Number(data.totalAmount) || 0;
    const tenor = Number(data.tenor) || 1;
    const cicilan = data.cicilan !== undefined ? Number(data.cicilan) : Math.round(totalAmount / tenor);

    const newInvestor = {
      id,
      investorName: data.investorName,
      date: data.date || new Date().toISOString().split('T')[0],
      dueDate: data.dueDate || null,
      totalAmount,
      tenor,
      cicilan,
      status: data.status || 'aktif',
      notes: data.notes || '',
      paymentMethod: data.paymentMethod || 'Transfer Bank',
      createdAt: new Date().toISOString()
    };

    // User requirement: Dana investor masuk sebagai kas pemasukan
    const trx = this.addTransaction({
      type: 'masuk',
      category: 'Dana Investor',
      amount: totalAmount,
      title: `Dana Investor: ${newInvestor.investorName}`,
      paymentMethod: newInvestor.paymentMethod,
      date: newInvestor.date,
      nota: `#INV-${Math.floor(1000 + Math.random() * 9000)}`,
      shippingStatus: null
    });
    newInvestor.trxId = trx.id;

    this.state.investors.unshift(newInvestor);
    this.notify();
    return newInvestor;
  }

  updateInvestor(id, data) {
    if (!this.state.investors) return null;
    const idx = this.state.investors.findIndex((i) => i.id === id);
    if (idx === -1) return null;

    const old = this.state.investors[idx];
    const totalAmount = data.totalAmount !== undefined ? Number(data.totalAmount) : old.totalAmount;
    const tenor = data.tenor !== undefined ? Number(data.tenor) : old.tenor;
    const cicilan = data.cicilan !== undefined ? Number(data.cicilan) : Math.round(totalAmount / (tenor || 1));

    const updated = {
      ...old,
      ...data,
      totalAmount,
      tenor,
      cicilan
    };

    // Update linked cash transaction if exists
    if (old.trxId) {
      this.updateTransaction(old.trxId, {
        amount: totalAmount,
        title: `Dana Investor: ${updated.investorName}`,
        date: updated.date || old.date,
        paymentMethod: updated.paymentMethod || old.paymentMethod
      });
    }

    this.state.investors[idx] = updated;
    this.notify();
    return updated;
  }

  deleteInvestor(id) {
    if (!this.state.investors) return;
    this.state.investors = this.state.investors.filter((i) => i.id !== id);
    this.notify();
  }

  getInvestorSummary() {
    const list = this.getInvestors();
    const totalInvested = list.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
    const aktifList = list.filter((i) => (i.status || 'aktif') === 'aktif');
    const totalOutstanding = aktifList.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
    const totalCicilan = aktifList.reduce((sum, i) => {
      const c = i.cicilan !== undefined ? i.cicilan : (i.tenor > 0 ? Math.round(i.totalAmount / i.tenor) : 0);
      return sum + (Number(c) || 0);
    }, 0);

    return {
      totalInvested,
      totalOutstanding,
      totalCicilan,
      countAktif: aktifList.length,
      countTotal: list.length
    };
  }

  // Google Sheets integration configuration
  getGoogleSheetsConfig() {
    if (!this.state.googleSheets) {
      this.state.googleSheets = {
        spreadsheetId: '',
        autoSync: false,
        lastSync: null
      };
    }
    return this.state.googleSheets;
  }

  saveGoogleSheetsConfig(config) {
    this.state.googleSheets = {
      ...(this.state.googleSheets || {}),
      ...config
    };
    this.saveState();
    this.notify();
    return this.state.googleSheets;
  }

  setGoogleSheetsLastSync(timeStr) {
    if (!this.state.googleSheets) {
      this.state.googleSheets = { spreadsheetId: '', autoSync: false, lastSync: null };
    }
    this.state.googleSheets.lastSync = timeStr;
    this.saveState();
    // Do NOT call this.notify() here to prevent infinite auto-sync loop
  }

  // =====================
  // Stock Opname Records
  // =====================

  /** Ambil semua riwayat opname, terbaru di atas. */
  getOpnameRecords() {
    if (!this.state.opnameRecords || !Array.isArray(this.state.opnameRecords)) {
      this.state.opnameRecords = [];
    }
    return this.state.opnameRecords;
  }

  /** Simpan sesi opname baru. */
  addOpnameRecord(record) {
    if (!this.state.opnameRecords) this.state.opnameRecords = [];
    const newRecord = {
      id: `OPNAME-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...record
    };
    this.state.opnameRecords.unshift(newRecord);
    this.saveState();
    this.notify();
    return newRecord;
  }

  /** Update riwayat opname (mis. status). */
  updateOpnameRecord(id, data) {
    if (!this.state.opnameRecords) return null;
    const idx = this.state.opnameRecords.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.state.opnameRecords[idx] = { ...this.state.opnameRecords[idx], ...data };
    this.saveState();
    this.notify();
    return this.state.opnameRecords[idx];
  }

  /** Hapus riwayat opname. */
  deleteOpnameRecord(id) {
    if (!this.state.opnameRecords) return;
    this.state.opnameRecords = this.state.opnameRecords.filter((r) => r.id !== id);
    this.saveState();
    this.notify();
  }
}



export const store = new Store();

// Currency formatter utility
export function formatRupiah(number, prefix = 'Rp ') {
  if (isNaN(number) || number === null || number === undefined) return `${prefix}0`;
  const formatted = Math.round(number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${prefix}${formatted}`;
}

export function parseRupiah(str) {
  if (!str) return 0;
  return Number(str.toString().replace(/[^0-9]/g, '')) || 0;
}
