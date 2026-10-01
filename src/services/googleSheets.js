import defaultCredentials from '@service-account';

// Cache access token in memory with expiry
let cachedToken = null;
let tokenExpiry = 0;

/**
 * Convert PEM RSA private key string to ArrayBuffer for Web Crypto API
 */
function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/-----[^\n]+-----/g, '').replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Base64 URL encode
 */
function base64url(bufferOrString) {
  let base64;
  if (typeof bufferOrString === 'string') {
    base64 = btoa(unescape(encodeURIComponent(bufferOrString)));
  } else {
    let binary = '';
    const bytes = new Uint8Array(bufferOrString);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Get Service Account credentials (from store custom setting or default JSON)
 */
export function getCredentials(store) {
  if (store && typeof store.getGoogleSheetsConfig === 'function') {
    const custom = store.getGoogleSheetsConfig();
    if (custom && custom.serviceAccountJson) {
      try {
        const parsed = JSON.parse(custom.serviceAccountJson);
        if (parsed.client_email && parsed.private_key) return parsed;
      } catch (e) {
        // fallback to default
      }
    }
  }
  return defaultCredentials;
}

/**
 * Get OAuth2 Access Token for Google Sheets API using Web Crypto RSA signing
 */
export async function getAccessToken(store) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiry > now + 60) {
    return cachedToken;
  }

  const creds = getCredentials(store);
  if (!creds || !creds.client_email || !creds.private_key) {
    throw new Error('Kredensial Service Account Google tidak valid atau belum diisi.');
  }

  const keyBuffer = pemToArrayBuffer(creds.private_key);
  const cryptoKey = await window.crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const signInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signature = await window.crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signInput)
  );

  const jwt = `${signInput}.${base64url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Gagal mendapatkan akses token dari Google');
  }

  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 3600);
  return cachedToken;
}

/**
 * Extract clean Spreadsheet ID from raw input (supports full URL or raw ID)
 */
export function extractSpreadsheetId(input) {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return trimmed;
}

/**
 * Test access to the Spreadsheet
 */
export async function testSpreadsheetConnection(store, spreadsheetId) {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('Spreadsheet ID belum diisi.');
  }

  const token = await getAccessToken(store);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 404) {
      throw new Error('Spreadsheet tidak ditemukan. Pastikan ID atau link spreadsheet benar.');
    }
    if (res.status === 403) {
      const creds = getCredentials(store);
      throw new Error(
        `Akses ditolak (403). Pastikan spreadsheet sudah dibagikan (Share) ke email Service Account:\n${creds.client_email}\ndengan peran 'Editor'.`
      );
    }
    throw new Error(err.error?.message || `Gagal mengakses spreadsheet (${res.status})`);
  }

  const data = await res.json();
  return {
    title: data.properties?.title || 'Google Sheet',
    sheets: (data.sheets || []).map((s) => s.properties?.title)
  };
}

/**
 * Ensure required sheets exist in spreadsheet
 */
async function ensureSheetsExist(token, spreadsheetId, requiredSheetNames) {
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!metaRes.ok) return;
  const meta = await metaRes.json();
  const existingSheets = meta.sheets || [];
  const existingNames = existingSheets.map((s) => s.properties?.title);

  const requests = [];

  // Add missing sheets
  const missing = requiredSheetNames.filter((name) => !existingNames.includes(name));
  missing.forEach((title) => {
    const props = { title };
    if (title === 'Dashboard') {
      props.index = 0;
    }
    requests.push({ addSheet: { properties: props } });
  });

  // If Dashboard already exists but is not first, move it to index 0
  const dashSheet = existingSheets.find((s) => s.properties?.title === 'Dashboard');
  if (dashSheet && dashSheet.properties?.index !== 0) {
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: dashSheet.properties.sheetId, index: 0 },
        fields: 'index'
      }
    });
  }

  // Automatically delete obsolete sheets ("Transaksi Kas" and "Hutang & Piutang") if still present
  const obsoleteSheets = existingSheets.filter((s) => {
    const title = (s.properties?.title || '').toLowerCase();
    return title === 'transaksi kas' || title.includes('hutang') || title.includes('piutang');
  });

  obsoleteSheets.forEach((s) => {
    if (s.properties?.sheetId !== undefined) {
      requests.push({ deleteSheet: { sheetId: s.properties.sheetId } });
    }
  });

  if (requests.length === 0) return;

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });
}

/**
 * Applies executive dashboard styling, column widths, currency formats,
 * and embeds interactive charts (Donut & Column) on the Dashboard sheet.
 */
async function applyDashboardDesignAndCharts(token, spreadsheetId) {
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!metaRes.ok) return;
    const meta = await metaRes.json();
    const dashSheet = meta.sheets?.find((s) => s.properties?.title === 'Dashboard');
    if (!dashSheet) return;
    const dashSheetId = dashSheet.properties?.sheetId ?? 0;

    const requests = [];

    // 1. Delete existing charts on Dashboard to prevent accumulation
    if (dashSheet.charts && dashSheet.charts.length > 0) {
      dashSheet.charts.forEach((c) => {
        if (c.chartId !== undefined) {
          requests.push({
            deleteEmbeddedObject: { objectId: c.chartId }
          });
        }
      });
    }

    // 2. Set optimal column widths
    const colWidths = [
      { col: 0, size: 310 }, // Col A (Titles & labels)
      { col: 1, size: 160 }, // Col B (Values / Rp)
      { col: 2, size: 170 }, // Col C (Formulas / Percent)
      { col: 3, size: 280 }, // Col D (Notes / Status)
      { col: 4, size: 30 },  // Col E (Spacer)
      { col: 5, size: 80 },  // Col F
      { col: 6, size: 80 },  // Col G
      { col: 7, size: 80 },  // Col H
      { col: 8, size: 80 },  // Col I
      { col: 9, size: 80 },  // Col J
      { col: 10, size: 80 }  // Col K
    ];

    colWidths.forEach(({ col, size }) => {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId: dashSheetId, dimension: 'COLUMNS', startIndex: col, endIndex: col + 1 },
          properties: { pixelSize: size },
          fields: 'pixelSize'
        }
      });
    });

    // 3. Styling: Executive Banner Header (Row 1)
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.0588, green: 0.0902, blue: 0.1647 }, // Deep Dark Navy #0F172A
            textFormat: {
              foregroundColor: { red: 0.2196, green: 0.7412, blue: 0.9725 }, // Bright Sky Blue #38BDF8
              fontSize: 12,
              bold: true
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    });

    // 4. Styling: Store Info Subheader (Rows 2-3)
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.1176, green: 0.1608, blue: 0.2314 }, // Slate #1E293B
            textFormat: {
              foregroundColor: { red: 0.8863, green: 0.9176, blue: 0.9529 }, // #E2E8F0
              fontSize: 10,
              bold: false
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    });

    // 5. Styling: Section Headers (Rows 5, 12, 16, 23, 28, 33 -> 0-indexed: 4, 11, 15, 22, 27, 32)
    const sectionRowIndexes = [4, 11, 15, 22, 27, 32];
    sectionRowIndexes.forEach((rIdx) => {
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: rIdx, endRowIndex: rIdx + 1, startColumnIndex: 0, endColumnIndex: 4 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.0588, green: 0.2314, blue: 0.3804 }, // Executive Navy #0F3B61
              textFormat: {
                foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                fontSize: 10,
                bold: true
              }
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)'
        }
      });
    });

    // 6. Styling: Highlight Card Total Saldo Kas (Row 6 -> index 5)
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.0235, green: 0.3059, blue: 0.2314 }, // Emerald #064E3B
            textFormat: {
              foregroundColor: { red: 0.6549, green: 0.9529, blue: 0.8157 }, // Mint Glow
              fontSize: 11,
              bold: true
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    });

    // 7. Currency Number Formatting for Column B (Rp #,##0)
    const currencyRanges = [
      { start: 5, end: 10 },  // Rows 6-10 (KPI nominals)
      { start: 12, end: 14 }, // Rows 13-14 (Chart Arus Kas data)
      { start: 23, end: 26 }, // Rows 24-26 (Laci & Bank)
      { start: 30, end: 31 }, // Row 31 (Total Biaya Belanja)
      { start: 33, end: 39 }  // Rows 34-39 (Recent sales amounts)
    ];

    currencyRanges.forEach(({ start, end }) => {
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: start, endRowIndex: end, startColumnIndex: 1, endColumnIndex: 2 },
          cell: {
            userEnteredFormat: {
              numberFormat: {
                type: 'CURRENCY',
                pattern: '"Rp "#,##0'
              }
            }
          },
          fields: 'userEnteredFormat.numberFormat'
        }
      });
    });

    // 8. Add Chart 1: Donut Chart for Cash Allocation (Laci vs Bank)
    requests.push({
      addChart: {
        chart: {
          spec: {
            title: 'Alokasi Kas Toko (Laci vs Bank)',
            pieChart: {
              legendPosition: 'RIGHT_LEGEND',
              pieHole: 0.45,
              domain: {
                sourceRange: {
                  sources: [
                    {
                      sheetId: dashSheetId,
                      startRowIndex: 23,
                      endRowIndex: 25,
                      startColumnIndex: 0,
                      endColumnIndex: 1
                    }
                  ]
                }
              },
              series: {
                sourceRange: {
                  sources: [
                    {
                      sheetId: dashSheetId,
                      startRowIndex: 23,
                      endRowIndex: 25,
                      startColumnIndex: 1,
                      endColumnIndex: 2
                    }
                  ]
                }
              }
            }
          },
          position: {
            overlayPosition: {
              anchorCell: {
                sheetId: dashSheetId,
                rowIndex: 4,
                columnIndex: 5
              },
              widthPixels: 460,
              heightPixels: 260
            }
          }
        }
      }
    });

    // 9. Add Chart 2: Column Chart for Cash In vs Cash Out
    requests.push({
      addChart: {
        chart: {
          spec: {
            title: 'Perbandingan Arus Kas (Masuk vs Keluar)',
            basicChart: {
              chartType: 'COLUMN',
              legendPosition: 'NO_LEGEND',
              domains: [
                {
                  domain: {
                    sourceRange: {
                      sources: [
                        {
                          sheetId: dashSheetId,
                          startRowIndex: 12,
                          endRowIndex: 14,
                          startColumnIndex: 0,
                          endColumnIndex: 1
                        }
                      ]
                    }
                  }
                }
              ],
              series: [
                {
                  series: {
                    sourceRange: {
                      sources: [
                        {
                          sheetId: dashSheetId,
                          startRowIndex: 12,
                          endRowIndex: 14,
                          startColumnIndex: 1,
                          endColumnIndex: 2
                        }
                      ]
                    }
                  },
                  targetAxis: 'LEFT_AXIS'
                }
              ]
            }
          },
          position: {
            overlayPosition: {
              anchorCell: {
                sheetId: dashSheetId,
                rowIndex: 16,
                columnIndex: 5
              },
              widthPixels: 460,
              heightPixels: 260
            }
          }
        }
      }
    });

    // Send batchUpdate for Dashboard design & charts
    const formatRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    if (!formatRes.ok) {
      const err = await formatRes.json().catch(() => ({}));
      console.warn('[GoogleSheets] Dashboard chart/formatting notice:', err.error?.message || formatRes.status);
    }
  } catch (err) {
    console.warn('[GoogleSheets] Non-fatal error during dashboard styling/charts:', err);
  }
}

// Mutex lock to prevent overlapping sync requests
let isSyncing = false;

/**
 * Sync ALL store data to Google Spreadsheet atomically
 */
export async function syncAllToGoogleSheets(store, explicitSpreadsheetId = null) {
  if (isSyncing) {
    console.warn('[GoogleSheets] Sync is already in progress, skipping concurrent trigger');
    return {
      success: true,
      inProgress: true,
      syncTime: store.getGoogleSheetsConfig().lastSync || 'Sedang proses',
      counts: { masuk: 0, keluar: 0, supplies: 0, shipments: 0 }
    };
  }

  isSyncing = true;
  try {
    const config = store.getGoogleSheetsConfig ? store.getGoogleSheetsConfig() : {};
    const rawId = explicitSpreadsheetId || config.spreadsheetId;
    const spreadsheetId = extractSpreadsheetId(rawId);

    if (!spreadsheetId) {
      throw new Error('ID Spreadsheet belum dikonfigurasi. Atur di menu Pengaturan.');
    }

    const token = await getAccessToken(store);

    const sheetNames = ['Dashboard', 'Ringkasan Usaha', 'Kas Masuk', 'Kas Keluar', 'Barang Masuk (Belanja)', 'Pengiriman'];
    await ensureSheetsExist(token, spreadsheetId, sheetNames);

    const transactions = store.getTransactions ? store.getTransactions() : [];
    const supplies = store.getSupplies ? store.getSupplies() : [];
    const shipments = store.getShipments ? store.getShipments() : [];
    const shipSummary = store.getShipmentSummary ? store.getShipmentSummary() : {};
    const shop = store.getShop ? store.getShop() : { name: 'Kas Juara' };
    const balanceSummary = store.getBalanceSummary ? store.getBalanceSummary() : {};

    // Modal / Saldo Kas Awal dari Pengaturan Toko
    const initialLaci = Number(shop.initialBalanceLaci || 0);
    const initialBank = Number(shop.initialBalanceBank || 0);
    const totalModalAwal = initialLaci + initialBank;

    // Pisahkan transaksi kas masuk dan kas keluar
    const trxMasukList = transactions.filter((t) => t.type === 'masuk');
    const trxKeluarList = transactions.filter((t) => t.type === 'keluar');

    let totalMasuk = 0;
    let totalKeluar = 0;
    let laciMasuk = 0;
    let laciKeluar = 0;
    let bankMasuk = 0;
    let bankKeluar = 0;

    transactions.forEach((t) => {
      const a = Number(t.amount) || 0;
      const pm = (t.paymentMethod || '').toLowerCase();
      const isBank =
        pm.includes('bank') ||
        pm.includes('transfer') ||
        pm.includes('bca') ||
        pm.includes('mandiri') ||
        pm.includes('bri') ||
        pm.includes('qris');

      if (t.type === 'masuk') {
        totalMasuk += a;
        if (isBank) bankMasuk += a;
        else laciMasuk += a;
      } else {
        totalKeluar += a;
        if (isBank) bankKeluar += a;
        else laciKeluar += a;
      }
    });

    const currentBalance = totalModalAwal + totalMasuk - totalKeluar;
    const currentLaci = initialLaci + laciMasuk - laciKeluar;
    const currentBank = initialBank + bankMasuk - bankKeluar;

    const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' });

    // 0. Data Sheet: Dashboard Interaktif Utama (Pure Numeric Data in Column B & Executive Visuals)
    const recentSales = trxMasukList.slice(-5).reverse();
    const totalBelanjaBiaya = supplies.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const totalPasangMasuk = supplies.reduce((sum, s) => sum + (Number(s.itemsCount) || 1), 0);
    const pctLaci = currentBalance > 0 ? `${Math.round((currentLaci / currentBalance) * 100)}%` : '0%';
    const pctBank = currentBalance > 0 ? `${Math.round((currentBank / currentBalance) * 100)}%` : '0%';

    const dashboardRows = [
      ['KAS JUARA SEPATU — EXECUTIVE MANAGEMENT DASHBOARD', '', '', ''],
      ['Nama Toko:', shop.name || 'Kas Juara Sepatu', 'Status Sistem:', 'ONLINE & REAL-TIME'],
      ['Pemilik:', shop.owner || 'Pak Hendra', 'Sinkron Terakhir:', nowStr],
      ['', '', '', ''],

      ['[1] KARTU INDIKATOR KEUANGAN UTAMA (EXECUTIVE KPI)', 'NOMINAL (RP)', 'STATUS ARUS KAS', 'KETERANGAN'],
      ['TOTAL SALDO KAS TOKO SAAT INI', Number(currentBalance) || 0, currentBalance >= 0 ? '🟢 Kas Toko Sehat' : '🔴 Defisit Kas', 'Saldo Kas Real-Time (Awal + Masuk - Keluar)'],
      ['Modal Kas Awal Toko', Number(totalModalAwal) || 0, 'Modal Awal Toko', 'Modal kas saat pembukuan pertama dimulai'],
      ['Total Pemasukan Kas (Penjualan)', Number(totalMasuk) || 0, `${trxMasukList.length} Transaksi Penjualan`, 'Akumulasi seluruh kas masuk penjualan'],
      ['Total Pengeluaran Kas (Belanja & Biaya)', Number(totalKeluar) || 0, `${trxKeluarList.length} Transaksi Biaya`, 'Akumulasi belanja stok dan biaya operasional'],
      ['Arus Kas Bersih (Net Cash Flow)', Number(totalMasuk - totalKeluar) || 0, totalMasuk >= totalKeluar ? '🟢 SURPLUS' : '🔴 DEFISIT', 'Pemasukan dikurangi Pengeluaran'],
      ['', '', '', ''],

      ['[2] DATA SUMBER GRAFIK ARUS KAS TOKO', 'NOMINAL (RP)', 'KETERANGAN', ''],
      ['Kas Masuk (Penjualan)', Number(totalMasuk) || 0, 'Total penerimaan uang penjualan', ''],
      ['Kas Keluar (Belanja & Biaya)', Number(totalKeluar) || 0, 'Total pengeluaran biaya & operasional', ''],
      ['', '', '', ''],

      ['[3] DATA KONTROL STATUS PENGIRIMAN SEPATU', 'JUMLAH ORDER', 'STATUS SISTEM', 'AKSI OPERASIONAL'],
      ['Perlu Dikemas', Number(shipSummary.countKemas) || 0, 'Siap Dipacking', 'Segera siapkan sepatu & kardus'],
      ['Sedang Dikirim', Number(shipSummary.countKirim) || 0, 'Dalam Perjalanan', 'Pantau resi & nomor ekspedisi'],
      ['Ditahan (Hold)', Number(shipSummary.countHold) || 0, 'Tertunda Sementara', 'Konfirmasi ke pelanggan'],
      ['Selesai Diterima', Number(shipSummary.countSelesai) || 0, 'Tuntas Diterima', 'Pesanan sukses diterima'],
      ['Total Seluruh Order Pengiriman', Number(shipments.length) || 0, 'Semua Transaksi', 'Total rekap pesanan penjualan'],
      ['', '', '', ''],

      ['[4] POSISI PENYIMPANAN UANG KAS FISIK', 'NOMINAL (RP)', 'PERSENTASE', 'KETERANGAN'],
      ['Kas di Rek Tampungan / Laci Toko', Number(currentLaci) || 0, pctLaci, 'Uang kas fisik siap pakai di toko'],
      ['Kas di Rekening Bank Toko', Number(currentBank) || 0, pctBank, 'Uang di rekening bank operasional toko'],
      ['Total Kedua Tempat Kas', Number(currentLaci + currentBank) || 0, '100%', 'Total akumulasi uang laci dan rekening bank'],
      ['', '', '', ''],

      ['[5] KONTROL PENGADAAN & STOK SEPATU', 'JUMLAH', 'KETERANGAN', ''],
      ['Total Faktur Belanja Barang', Number(supplies.length) || 0, 'Faktur belanja stok sepatu dari supplier', ''],
      ['Total Pasang Sepatu Masuk', Number(totalPasangMasuk) || 0, 'Jumlah pasang stok sepatu masuk', ''],
      ['Total Biaya Belanja Stok (Rp)', Number(totalBelanjaBiaya) || 0, 'Total modal belanja pengadaan sepatu', ''],
      ['', '', '', ''],

      ['[6] REKAP TRANSAKSI PENJUALAN TERAKHIR', 'NOMINAL (RP)', 'METODE BAYAR', 'WAKTU TRANSAKSI']
    ];

    if (recentSales.length > 0) {
      recentSales.forEach((t) => {
        dashboardRows.push([
          t.title || t.keterangan || 'Penjualan Sepatu',
          Number(t.amount) || 0,
          t.paymentMethod || 'Tunai',
          `${t.date || '-'} ${t.time || ''}`
        ]);
      });
    } else {
      dashboardRows.push(['Belum ada transaksi penjualan', 0, '-', '-']);
    }

    // 1. Data Sheet: Ringkasan Usaha
    const summaryRows = [
      ['RINGKASAN BUKU KAS & USAHA', shop.name || 'Kas Juara'],
      ['Pemilik Toko', shop.owner || '-'],
      ['Alamat Toko', shop.address || '-'],
      ['Terakhir Disinkronkan', nowStr],
      ['', '', ''],

      ['[1] MODAL / SALDO KAS AWAL TOKO', 'NOMINAL (RP)', 'KETERANGAN'],
      ['Kas Awal di Rek Tampungan / Laci', initialLaci, 'Modal kas awal di tampungan / laci toko'],
      ['Kas Awal di Rekening Bank Toko', initialBank, 'Modal kas awal di rekening bank toko'],
      ['TOTAL SALDO KAS AWAL (MODAL AWAL)', totalModalAwal, 'Total modal kas awal saat pertama kali pembukuan'],
      ['', '', ''],

      ['[2] ARUS KAS & PERPUTARAN BUKU KAS', 'NOMINAL (RP)', 'KETERANGAN'],
      ['Total Pemasukan Kas (Kas Masuk)', totalMasuk, `Akumulasi kas masuk dari ${trxMasukList.length} transaksi`],
      ['Total Pengeluaran Kas (Kas Keluar)', totalKeluar, `Akumulasi biaya & belanja dari ${trxKeluarList.length} transaksi`],
      ['Arus Kas Bersih (Net Cash Flow)', totalMasuk - totalKeluar, totalMasuk >= totalKeluar ? 'Surplus (Pemasukan > Pengeluaran)' : 'Defisit (Pengeluaran > Pemasukan)'],
      ['', '', ''],

      ['[3] POSISI SALDO KAS AKHIR SAAT INI', 'NOMINAL (RP)', 'RUMUS / STATUS'],
      ['TOTAL SALDO KAS TOKO SAAT INI', currentBalance, 'Rumus: Modal Awal + Total Masuk - Total Keluar'],
      ['Saldo Kas di Rek Tampungan / Laci', currentLaci, 'Posisi uang di laci / rek tampungan saat ini'],
      ['Saldo Kas di Rekening Bank Toko', currentBank, 'Posisi uang di rekening bank toko saat ini'],
      ['', '', ''],

      ['[4] STATISTIK OPERASIONAL TOKO', 'JUMLAH', 'KETERANGAN'],
      ['Total Transaksi Kas Masuk', trxMasukList.length, 'Penerimaan uang kas penjualan dll.'],
      ['Total Transaksi Kas Keluar', trxKeluarList.length, 'Pengeluaran biaya & operasional toko'],
      ['Total Faktur Belanja Barang (Stok)', supplies.length, 'Pengadaan stok sepatu dari suplier'],
      ['Total Pengiriman Sepatu', shipments.length, `Kemas: ${shipSummary.countKemas || 0}, Kirim: ${shipSummary.countKirim || 0}, Selesai: ${shipSummary.countSelesai || 0}`]
    ];

    // 2. Data Sheet: KAS MASUK (Saldo Modal Awal masuk di baris pertama)
    const masukHeader = [
      'No',
      'ID Transaksi',
      'Tanggal',
      'Jam',
      'Kategori',
      'Keterangan / Produk',
      'Metode Pembayaran',
      'Jumlah Masuk (Rp)',
      'No. Nota / Ref',
      'Detail Sepatu'
    ];

    const kasMasukRows = [masukHeader];

    // Baris Pertama: Modal Kas Awal Toko
    kasMasukRows.push([
      1,
      'MODAL-AWAL',
      '-',
      '-',
      'Modal Kas Awal Toko',
      `Modal Kas Awal Toko (Tampungan: Rp ${initialLaci.toLocaleString('id-ID')}, Bank: Rp ${initialBank.toLocaleString('id-ID')})`,
      'Tampungan & Bank',
      totalModalAwal,
      '#SALDO-AWAL',
      '-'
    ]);

    // Transaksi Kas Masuk diurutkan terlama ke terbaru
    const sortedMasuk = [...trxMasukList].reverse();
    sortedMasuk.forEach((t, i) => {
      const amt = Number(t.amount) || 0;
      let detailItems = '';
      if (t.items && Array.isArray(t.items)) {
        detailItems = t.items.map((it) => `${it.name || 'Sepatu'} (Rp ${it.price || 0})`).join(', ');
      }
      kasMasukRows.push([
        i + 2,
        t.id || '-',
        t.date || '-',
        t.time || '-',
        t.category || 'Penjualan',
        t.title || t.keterangan || '-',
        t.paymentMethod || 'Tunai',
        amt,
        t.nota || '-',
        detailItems
      ]);
    });

    // Baris Total di Kas Masuk
    kasMasukRows.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      'TOTAL KAS MASUK (+ MODAL AWAL)',
      '',
      totalModalAwal + totalMasuk,
      '',
      ''
    ]);

    // 3. Data Sheet: KAS KELUAR
    const keluarHeader = [
      'No',
      'ID Transaksi',
      'Tanggal',
      'Jam',
      'Kategori',
      'Keterangan / Keperluan',
      'Metode Pembayaran',
      'Jumlah Keluar (Rp)',
      'No. Nota / Ref',
      'Catatan Tambahan'
    ];

    const kasKeluarRows = [keluarHeader];
    const sortedKeluar = [...trxKeluarList].reverse();
    sortedKeluar.forEach((t, i) => {
      const amt = Number(t.amount) || 0;
      let detailItems = '';
      if (t.items && Array.isArray(t.items)) {
        detailItems = t.items.map((it) => `${it.name || 'Sepatu'} (Rp ${it.price || 0})`).join(', ');
      }
      kasKeluarRows.push([
        i + 1,
        t.id || '-',
        t.date || '-',
        t.time || '-',
        t.category || 'Operasional',
        t.title || t.keterangan || '-',
        t.paymentMethod || 'Tunai',
        amt,
        t.nota || '-',
        detailItems || '-'
      ]);
    });

    // Baris Total di Kas Keluar
    kasKeluarRows.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      'TOTAL KAS KELUAR',
      '',
      totalKeluar,
      '',
      ''
    ]);

    // 4. Data Sheet: Barang Masuk (Belanja)
    const supplyHeader = [
      'No',
      'ID Faktur',
      'Tanggal',
      'Supplier / Sumber',
      'Status Pembayaran',
      'Metode Bayar',
      'Total Biaya (Rp)',
      'Jumlah Pasang',
      'Rincian Barang',
      'Keterangan / Catatan'
    ];

    const supplyRows = [supplyHeader];
    supplies.forEach((s, i) => {
      let rincian = '';
      if (s.items && Array.isArray(s.items)) {
        rincian = s.items.map((it) => `${it.name} (${it.qty || 1} psg @ Rp ${it.buyPrice || 0})`).join('; ');
      }
      supplyRows.push([
        i + 1,
        s.id || '-',
        s.date || '-',
        s.supplierName || '-',
        s.status === 'lunas' ? 'Lunas' : 'Belum Lunas',
        s.paymentMethod || 'Tunai (Laci)',
        Number(s.totalAmount) || 0,
        Number(s.itemsCount) || 1,
        rincian,
        s.notes || '-'
      ]);
    });

    // 5. Data Sheet: Pengiriman (Sepatu Terjual)
    const shipmentHeader = [
      'No',
      'ID Transaksi',
      'Tanggal',
      'Jam',
      'Nama Pelanggan',
      'No. Nota',
      'Detail Sepatu',
      'Total Pembayaran (Rp)',
      'Status Pengiriman',
      'Kurir / Ekspedisi',
      'Nomor Resi',
      'Catatan Pengiriman'
    ];

    const STATUS_LABEL_MAP = {
      kemas: 'Perlu Dikemas',
      kirim: 'Sedang Dikirim',
      hold: 'Ditahan (Hold)',
      selesai: 'Selesai Diterima'
    };

    const shipmentRows = [shipmentHeader];
    shipments.forEach((s, i) => {
      let detailItems = '';
      if (s.items && Array.isArray(s.items)) {
        detailItems = s.items.map((it) => `${it.name || 'Sepatu'} (Rp ${it.price || 0})`).join(', ');
      } else {
        detailItems = s.productName || s.title || '-';
      }

      const stKey = s.shippingStatus || 'kemas';
      const stLabel = STATUS_LABEL_MAP[stKey] || stKey;

      shipmentRows.push([
        i + 1,
        s.id || '-',
        s.date || '-',
        s.time || '-',
        s.buyer || 'Pelanggan Toko',
        s.nota || '-',
        detailItems,
        Number(s.amount) || 0,
        stLabel,
        s.shippingCourier || '-',
        s.shippingResi || '-',
        s.shippingNote || '-'
      ]);
    });

    // Step 1: Clear old ranges cleanly in ONE atomic call
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ranges: [
          "'Dashboard'!A1:Z100",
          "'Ringkasan Usaha'!A1:Z100",
          "'Kas Masuk'!A1:Z2000",
          "'Kas Keluar'!A1:Z2000",
          "'Barang Masuk (Belanja)'!A1:Z2000",
          "'Pengiriman'!A1:Z2000"
        ]
      })
    });

    // Step 2: Write all 6 sheets in ONE single atomic request
    const batchUpdateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: [
            {
              range: "'Dashboard'!A1",
              majorDimension: 'ROWS',
              values: dashboardRows
            },
            {
              range: "'Ringkasan Usaha'!A1",
              majorDimension: 'ROWS',
              values: summaryRows
            },
            {
              range: "'Kas Masuk'!A1",
              majorDimension: 'ROWS',
              values: kasMasukRows
            },
            {
              range: "'Kas Keluar'!A1",
              majorDimension: 'ROWS',
              values: kasKeluarRows
            },
            {
              range: "'Barang Masuk (Belanja)'!A1",
              majorDimension: 'ROWS',
              values: supplyRows
            },
            {
              range: "'Pengiriman'!A1",
              majorDimension: 'ROWS',
              values: shipmentRows
            }
          ]
        })
      }
    );

    if (!batchUpdateRes.ok) {
      const err = await batchUpdateRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gagal menulis data ke Google Sheets (${batchUpdateRes.status})`);
    }

    // Step 3: Apply Executive Dashboard Theme & Embed Real Google Sheets Charts
    await applyDashboardDesignAndCharts(token, spreadsheetId);

    // Update status sinkronisasi di store
    if (store.setGoogleSheetsLastSync) {
      store.setGoogleSheetsLastSync(nowStr);
    }

    return {
      success: true,
      syncTime: nowStr,
      counts: {
        masuk: trxMasukList.length,
        keluar: trxKeluarList.length,
        supplies: supplies.length,
        shipments: shipments.length
      }
    };
  } finally {
    isSyncing = false;
  }
}

