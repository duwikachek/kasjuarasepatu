import { INITIAL_DATA } from '../data/dummy.js';

const STORAGE_KEY = 'kas_juara_sepatu_data_v1';

class Store {
  constructor() {
    this.state = this.loadState();
    this.listeners = [];
  }

  loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.investors) {
          parsed.investors = JSON.parse(JSON.stringify(INITIAL_DATA.investors || []));
        }
        // Migrate: rename 'Kulakan Barang' -> 'Belanja Barang' in existing data
        this._migrateKulakan(parsed);
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse state from localStorage, initializing fresh', e);
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
    if (data.debts && Array.isArray(data.debts)) {
      data.debts.forEach((d) => {
        if (d.notes && d.notes.toLowerCase().includes('kulakan')) {
          d.notes = d.notes.replace(/[Kk]ulakan/g, 'Belanja');
          changed = true;
        }
        if (d.personName && d.personName.toLowerCase().includes('kulakan')) {
          d.personName = d.personName.replace(/[Kk]ulakan/g, 'Belanja');
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

  saveState(newState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState || this.state));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
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
    } else if (existing.status === 'tempo') {
      const debt = this.state.debts.find((d) => d.personName && d.personName.includes(existing.invoiceNo));
      if (debt) {
        debt.totalAmount = totalAmount;
        debt.notes = `Belanja ${itemsCount} pasang (${existing.supplierName})`;
      }
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

    // 1. From catalog products
    const products = this.getProducts();
    products.forEach((p) => {
      if (p.barcode) {
        const clean = p.barcode.toString().trim().toUpperCase();
        if (!soldSet.has(clean)) {
          resultMap.set(clean, {
            barcode: p.barcode,
            name: p.name,
            kondisi: p.kondisi || 'Bagus',
            sellPrice: p.sellPrice || (p.buyPrice ? Math.round(Number(p.buyPrice) * 1.3) : 0),
            buyPrice: p.buyPrice || 0,
            photo: p.photo || null,
            supplier: p.supplier || ''
          });
        }
      }
    });

    // 2. From supply entries (Barang Masuk)
    const supplies = this.getSupplies();
    supplies.forEach((sup) => {
      if (sup.items && Array.isArray(sup.items)) {
        sup.items.forEach((it) => {
          if (it.barcode) {
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

    // 3. Search in inventory
    const inv = this.getInventory();
    const invItem = inv.find((i) => i.barcode && i.barcode.toString().trim().toUpperCase() === clean);
    if (invItem) return invItem;

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

  // Debts & Piutang
  getDebts() {
    return this.state.debts || [];
  }

  addDebt(debt) {
    const newDebt = {
      id: `DEBT-${Date.now()}`,
      date: debt.date || new Date().toISOString().split('T')[0],
      remainingAmount: debt.remainingAmount !== undefined ? debt.remainingAmount : debt.totalAmount,
      paidAmount: debt.paidAmount || 0,
      status: 'belum_lunas',
      ...debt
    };
    this.state.debts.unshift(newDebt);
    this.notify();
    return newDebt;
  }

  payDebt(debtId, paymentAmount, paymentMethod = 'Tunai (Laci)') {
    const debt = this.state.debts.find((d) => d.id === debtId);
    if (!debt) return false;

    const pay = Math.min(debt.remainingAmount, Number(paymentAmount));
    debt.paidAmount = (debt.paidAmount || 0) + pay;
    debt.remainingAmount = Math.max(0, debt.totalAmount - debt.paidAmount);
    
    if (debt.remainingAmount === 0) {
      debt.status = 'lunas';
    }

    // Auto record cash flow
    if (debt.type === 'piutang') {
      // Customer paid us: Kas Masuk
      this.addTransaction({
        type: 'masuk',
        category: 'Pelunasan Piutang',
        amount: pay,
        title: `Pelunasan Bon: ${debt.personName}`,
        paymentMethod: paymentMethod,
        nota: `#BON-LUNAS-${Math.floor(100 + Math.random() * 900)}`
      });
    } else {
      // We paid supplier: Kas Keluar
      this.addTransaction({
        type: 'keluar',
        category: 'Pelunasan Hutang Toko',
        amount: pay,
        title: `Bayar Hutang: ${debt.personName}`,
        paymentMethod: paymentMethod,
        nota: `#HTG-BAYAR-${Math.floor(100 + Math.random() * 900)}`
      });
    }

    this.notify();
    return debt;
  }

  getDebtById(id) {
    return this.state.debts.find((d) => d.id === id) || null;
  }

  updateDebt(id, updatedData) {
    const idx = this.state.debts.findIndex((d) => d.id === id);
    if (idx !== -1) {
      this.state.debts[idx] = { ...this.state.debts[idx], ...updatedData };
      this.notify();
      return this.state.debts[idx];
    }
    return null;
  }

  deleteDebt(id) {
    this.state.debts = this.state.debts.filter((d) => d.id !== id);
    this.notify();
  }

  // Inventory
  getInventory() {
    return this.state.inventory || [];
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

    // Piutang (receivables: others owe us)
    const debts = this.getDebts();
    const totalPiutang = debts
      .filter((d) => d.type === 'piutang' && d.status !== 'lunas')
      .reduce((sum, d) => sum + (Number(d.remainingAmount) || 0), 0);

    // Hutang (payables: we owe suppliers)
    const totalHutang = debts
      .filter((d) => d.type === 'hutang' && d.status !== 'lunas')
      .reduce((sum, d) => sum + (Number(d.remainingAmount) || 0), 0);

    return {
      currentBalance,
      totalMasuk,
      totalKeluar,
      countMasuk,
      countKeluar,
      totalPiutang,
      totalHutang,
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

  // Reset / Backup
  resetToDefault() {
    this.state = JSON.parse(JSON.stringify(INITIAL_DATA));
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
