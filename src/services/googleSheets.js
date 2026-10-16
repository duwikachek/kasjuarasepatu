import defaultCredentials from '@service-account';
import { getLocalDateString, cleanDateString } from '../utils/date.js';

// Cache access token in memory with expiry
let cachedToken = null;
let tokenExpiry = 0;

/**
 * Convert PEM RSA private key string to ArrayBuffer for Web Crypto API
 */
function pemToArrayBuffer(pem) {
  try {
    const b64 = pem.replace(/-----[^\n]+-----/g, '').replace(/\s+/g, '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (err) {
    throw new Error('Kunci Service Account tidak valid atau belum diunggah. Silakan unggah file service-account.json Anda di Pengaturan.');
  }
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
  if (
    !creds ||
    !creds.client_email ||
    !creds.private_key ||
    creds.client_email.includes('your-service-account') ||
    creds.private_key.includes('YOUR_PRIVATE_KEY_HERE')
  ) {
    throw new Error('Kunci Service Account belum dipasang di browser ini. Silakan unggah file service-account.json Anda di menu Pengaturan.');
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
  if (!metaRes.ok) return { locale: 'in_ID' };
  const meta = await metaRes.json();
  const existingSheets = meta.sheets || [];
  const existingNames = existingSheets.map((s) => s.properties?.title);
  const locale = meta.properties?.locale || 'in_ID';

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

  if (requests.length === 0) return { locale };

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });
  return { locale };
}

/**
 * Applies premium Dark Modern Card dashboard styling with merged KPI cards,
 * proper row heights, full dark background, and embeds 4 Google Sheets charts.
 */
async function applyDashboardDesignAndCharts(token, spreadsheetId, meta = {}) {
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!metaRes.ok) return;
    const sheetData = await metaRes.json();
    const dashSheet = sheetData.sheets?.find((s) => s.properties?.title === 'Dashboard');
    if (!dashSheet) return;
    const dashSheetId = dashSheet.properties?.sheetId ?? 0;

    const requests = [];

    // 0. Pastikan Timezone Spreadsheet sinkron dengan Waktu Indonesia (Asia/Jakarta)
    requests.push({
      updateSpreadsheetProperties: {
        properties: {
          timeZone: 'Asia/Jakarta'
        },
        fields: 'timeZone'
      }
    });

    // 1. Delete existing charts to prevent accumulation
    if (dashSheet.charts && dashSheet.charts.length > 0) {
      dashSheet.charts.forEach((c) => {
        if (c.chartId !== undefined) {
          requests.push({ deleteEmbeddedObject: { objectId: c.chartId } });
        }
      });
    }

    // 2. Column widths for Dark Modern Card layout
    const colWidths = [
      { col: 0, size: 220 }, { col: 1, size: 155 }, { col: 2, size: 170 },
      { col: 3, size: 155 }, { col: 4, size: 20 },  { col: 5, size: 85 },
      { col: 6, size: 85 },  { col: 7, size: 85 },  { col: 8, size: 85 },
      { col: 9, size: 85 },  { col: 10, size: 18 }, { col: 11, size: 85 },
      { col: 12, size: 85 }, { col: 13, size: 85 }, { col: 14, size: 85 },
      { col: 15, size: 85 }
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

    // 3. Row heights for modern spacing
    const rowHeights = [
      { start: 0, end: 1, size: 36 },
      { start: 1, end: 2, size: 6 },
      { start: 2, end: 3, size: 28 },
      { start: 3, end: 4, size: 48 },
      { start: 4, end: 5, size: 22 },
      { start: 5, end: 6, size: 28 },
      { start: 6, end: 7, size: 6 },
      { start: 7, end: 8, size: 6 }
    ];
    [8, 15, 21, 28, 34, 38].forEach((r) => {
      rowHeights.push({ start: r, end: r + 1, size: 28 });
    });
    [14, 20, 27, 33, 37].forEach((r) => {
      rowHeights.push({ start: r, end: r + 1, size: 6 });
    });
    if (meta.supHeaderRowIndex) {
      rowHeights.push({ start: meta.supHeaderRowIndex, end: meta.supHeaderRowIndex + 1, size: 28 });
    }
    if (meta.filterDetailHeaderRowIndex) {
      rowHeights.push({ start: meta.filterDetailHeaderRowIndex, end: meta.filterDetailHeaderRowIndex + 1, size: 28 });
    }
    if (meta.filterDetailColHeaderRowIndex) {
      rowHeights.push({ start: meta.filterDetailColHeaderRowIndex, end: meta.filterDetailColHeaderRowIndex + 1, size: 26 });
    }
    if (meta.bagusHeaderRowIndex) {
      rowHeights.push({ start: meta.bagusHeaderRowIndex, end: meta.bagusHeaderRowIndex + 1, size: 28 });
      rowHeights.push({ start: meta.bagusHeaderRowIndex + 1, end: meta.bagusHeaderRowIndex + 2, size: 24 });
    }
    if (meta.minusHeaderRowIndex) {
      rowHeights.push({ start: meta.minusHeaderRowIndex, end: meta.minusHeaderRowIndex + 1, size: 28 });
      rowHeights.push({ start: meta.minusHeaderRowIndex + 1, end: meta.minusHeaderRowIndex + 2, size: 24 });
    }
    rowHeights.forEach(({ start, end, size }) => {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId: dashSheetId, dimension: 'ROWS', startIndex: start, endIndex: end },
          properties: { pixelSize: size },
          fields: 'pixelSize'
        }
      });
    });

    // 4. FULL DARK BACKGROUND (A1:P350)
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 0, endRowIndex: 350, startColumnIndex: 0, endColumnIndex: 16 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.067, green: 0.094, blue: 0.153 },
            textFormat: {
              foregroundColor: { red: 0.847, green: 0.878, blue: 0.918 },
              fontSize: 10
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    });

    // 5. Banner row (idx 0)
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 10 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.031, green: 0.043, blue: 0.071 },
            textFormat: {
              foregroundColor: { red: 0.22, green: 0.74, blue: 0.97 },
              fontSize: 11,
              bold: true
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    });

    // 6. MERGE CELLS for 4 KPI Cards (2 cols wide x 3 rows tall each)
    const kpiCardCols = [
      { start: 0, end: 2 }, { start: 2, end: 4 },
      { start: 4, end: 6 }, { start: 6, end: 8 }
    ];
    kpiCardCols.forEach(({ start, end }) => {
      [2, 3, 4].forEach((row) => {
        requests.push({
          mergeCells: {
            range: { sheetId: dashSheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: start, endColumnIndex: end },
            mergeType: 'MERGE_ALL'
          }
        });
      });
    });

    // 7. KPI Card Colors (3 gradient rows per card)
    const cardConfigs = [
      { cols: kpiCardCols[0], colors: [
        { red: 0.063, green: 0.725, blue: 0.506 },
        { red: 0.02, green: 0.588, blue: 0.412 },
        { red: 0.016, green: 0.471, blue: 0.341 }
      ]},
      { cols: kpiCardCols[1], colors: [
        { red: 0.231, green: 0.51, blue: 0.965 },
        { red: 0.145, green: 0.388, blue: 0.922 },
        { red: 0.114, green: 0.306, blue: 0.847 }
      ]},
      { cols: kpiCardCols[2], colors: [
        { red: 0.957, green: 0.247, blue: 0.369 },
        { red: 0.882, green: 0.114, blue: 0.282 },
        { red: 0.745, green: 0.071, blue: 0.235 }
      ]},
      { cols: kpiCardCols[3], colors: [
        { red: 0.961, green: 0.62, blue: 0.043 },
        { red: 0.851, green: 0.467, blue: 0.024 },
        { red: 0.706, green: 0.325, blue: 0.035 }
      ]}
    ];
    cardConfigs.forEach(({ cols, colors }) => {
      colors.forEach((bg, idx) => {
        const row = 2 + idx;
        const isValue = idx === 1;
        const isSubtext = idx === 2;
        requests.push({
          repeatCell: {
            range: { sheetId: dashSheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: cols.start, endColumnIndex: cols.end },
            cell: {
              userEnteredFormat: {
                backgroundColor: bg,
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: isValue ? 16 : (isSubtext ? 9 : 10),
                  bold: !isSubtext
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        });
      });
    });

    // 8. Currency format for KPI value cells (row 3)
    [0, 2, 4, 6].forEach((cIdx) => {
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: cIdx, endColumnIndex: cIdx + 1 },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '"Rp "#,##0' }
            }
          },
          fields: 'userEnteredFormat.numberFormat'
        }
      });
    });

    // 9. Filter Row (idx 5) - Hanya Filter Hari / Periode di A6:B6
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 0, endColumnIndex: 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.118, green: 0.161, blue: 0.231 },
            textFormat: { foregroundColor: { red: 0.56, green: 0.82, blue: 1.0 }, fontSize: 10, bold: true },
            horizontalAlignment: 'LEFT'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });
    // Dropdown input B6
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 1, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.059, green: 0.090, blue: 0.165 },
            textFormat: { foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 }, fontSize: 10, bold: true },
            horizontalAlignment: 'CENTER',
            borders: { bottom: { style: 'SOLID', width: 2, color: { red: 0.22, green: 0.74, blue: 0.97 } } }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,borders)'
      }
    });

    // 10. Section Headers with left accent border
    const sectionRowIndexes = [8, 15, 21, 28, 34, 38];
    sectionRowIndexes.forEach((rIdx) => {
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: rIdx, endRowIndex: rIdx + 1, startColumnIndex: 0, endColumnIndex: 4 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.082, green: 0.133, blue: 0.212 },
              textFormat: { foregroundColor: { red: 0.56, green: 0.82, blue: 1.0 }, fontSize: 10, bold: true },
              borders: { left: { style: 'SOLID', width: 3, color: { red: 0.22, green: 0.74, blue: 0.97 } } }
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,borders)'
        }
      });
    });


    // 11. Highlight key metric rows
    const highlights = [
      { row: 11, bg: { red: 0.051, green: 0.173, blue: 0.196 }, fg: { red: 0.404, green: 0.91, blue: 0.976 }, sz: 10 },
      { row: 12, bg: { red: 0.024, green: 0.224, blue: 0.173 }, fg: { red: 0.655, green: 0.953, blue: 0.816 }, sz: 11 },
      { row: 17, bg: { red: 0.024, green: 0.224, blue: 0.173 }, fg: { red: 0.655, green: 0.953, blue: 0.816 }, sz: 10 },
      { row: 23, bg: { red: 0.055, green: 0.173, blue: 0.259 }, fg: { red: 0.502, green: 0.827, blue: 0.976 }, sz: 10 },
      { row: 25, bg: { red: 0.035, green: 0.165, blue: 0.115 }, fg: { red: 0.500, green: 0.920, blue: 0.700 }, sz: 10 },
      { row: 26, bg: { red: 0.220, green: 0.120, blue: 0.040 }, fg: { red: 0.980, green: 0.760, blue: 0.320 }, sz: 10 },
      { row: 29, bg: { red: 0.045, green: 0.180, blue: 0.220 }, fg: { red: 0.550, green: 0.880, blue: 0.980 }, sz: 10 }
    ];
    highlights.forEach(({ row, bg, fg, sz }) => {
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 4 },
          cell: {
            userEnteredFormat: {
              backgroundColor: bg,
              textFormat: { foregroundColor: fg, fontSize: sz, bold: true }
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)'
        }
      });
    });

    // 12. Currency formatting for data Column B
    const currencyRanges = [
      { start: 9, end: 14 }, { start: 17, end: 19 },
      { start: 23, end: 24 }, { start: 29, end: 30 }
    ];
    if (meta.catStartRowIndex && meta.catRowCount) {
      currencyRanges.push({ start: meta.catStartRowIndex, end: meta.catStartRowIndex + meta.catRowCount + 1 });
    }
    currencyRanges.forEach(({ start, end }) => {
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: start, endRowIndex: end, startColumnIndex: 1, endColumnIndex: 2 },
          cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"Rp "#,##0' } } },
          fields: 'userEnteredFormat.numberFormat'
        }
      });
    });

    // Integer number formatting for non-currency metrics (Row 17: Pasang Laku, Row 20: Trx, Row 23: Sisa Stok, Row 25: Varian, Row 26: Stok Bagus, Row 27: Stok Minus, Row 31: Pasang Masuk, Row 32: Item Belanja)
    [16, 19, 22, 24, 25, 26, 30, 31].forEach((rIdx) => {
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: rIdx, endRowIndex: rIdx + 1, startColumnIndex: 1, endColumnIndex: 2 },
          cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0' } } },
          fields: 'userEnteredFormat.numberFormat'
        }
      });
    });

    // 13. Data Validation: Pop-up Kalender Interaktif (Date Picker) pada Sel B6
    // Hapus/bersihkan aturan dropdown atau validasi lama pada B6 agar card opsi dropdown tidak bertumpuk
    requests.push({
      setDataValidation: {
        range: { sheetId: dashSheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 1, endColumnIndex: 2 }
      }
    });
    // Terapkan validasi tanggal murni (DATE_IS_VALID)
    requests.push({
      setDataValidation: {
        range: { sheetId: dashSheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 1, endColumnIndex: 2 },
        rule: {
          condition: { type: 'DATE_IS_VALID' },
          strict: false
        }
      }
    });
    // Format tampilan tanggal sel B6
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 1, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'DATE', pattern: 'yyyy-mm-dd' }
          }
        },
        fields: 'userEnteredFormat.numberFormat'
      }
    });

    // 14. Chart 1: Arus Kas (Column - Top Left)
    requests.push({
      addChart: { chart: {
        spec: { title: 'Perbandingan Arus Kas', basicChart: {
          chartType: 'COLUMN', legendPosition: 'NO_LEGEND',
          domains: [{ domain: { sourceRange: { sources: [{ sheetId: dashSheetId, startRowIndex: 9, endRowIndex: 11, startColumnIndex: 0, endColumnIndex: 1 }] } } }],
          series: [{ series: { sourceRange: { sources: [{ sheetId: dashSheetId, startRowIndex: 9, endRowIndex: 11, startColumnIndex: 1, endColumnIndex: 2 }] } }, targetAxis: 'LEFT_AXIS' }]
        }},
        position: { overlayPosition: { anchorCell: { sheetId: dashSheetId, rowIndex: 6, columnIndex: 5 }, widthPixels: 420, heightPixels: 250 } }
      }}
    });

    // 15. Chart 2: Komposisi Stok (Donut - Top Right)
    requests.push({
      addChart: { chart: {
        spec: { title: 'Komposisi Stok Sepatu', pieChart: {
          legendPosition: 'RIGHT_LEGEND', pieHole: 0.5,
          domain: { sourceRange: { sources: [{ sheetId: dashSheetId, startRowIndex: 35, endRowIndex: 37, startColumnIndex: 0, endColumnIndex: 1 }] } },
          series: { sourceRange: { sources: [{ sheetId: dashSheetId, startRowIndex: 35, endRowIndex: 37, startColumnIndex: 1, endColumnIndex: 2 }] } }
        }},
        position: { overlayPosition: { anchorCell: { sheetId: dashSheetId, rowIndex: 6, columnIndex: 11 }, widthPixels: 380, heightPixels: 250 } }
      }}
    });

    // 16. Chart 3: Pengeluaran per Kategori (Donut - Bottom Left)
    if (meta.catStartRowIndex && meta.catRowCount > 0) {
      requests.push({
        addChart: { chart: {
          spec: { title: 'Pengeluaran Kas per Kategori', pieChart: {
            legendPosition: 'RIGHT_LEGEND', pieHole: 0.5,
            domain: { sourceRange: { sources: [{ sheetId: dashSheetId, startRowIndex: meta.catStartRowIndex, endRowIndex: meta.catStartRowIndex + meta.catRowCount, startColumnIndex: 0, endColumnIndex: 1 }] } },
            series: { sourceRange: { sources: [{ sheetId: dashSheetId, startRowIndex: meta.catStartRowIndex, endRowIndex: meta.catStartRowIndex + meta.catRowCount, startColumnIndex: 1, endColumnIndex: 2 }] } }
          }},
          position: { overlayPosition: { anchorCell: { sheetId: dashSheetId, rowIndex: 20, columnIndex: 5 }, widthPixels: 420, heightPixels: 260 } }
        }}
      });
    }


    // 17. Styling untuk Section [7] RINCIAN SISA STOK KONDISI BAGUS
    if (meta.bagusHeaderRowIndex) {
      const secRow = meta.bagusHeaderRowIndex;
      const colHeaderRow = secRow + 1;
      const dataStart = meta.bagusDataStartRowIndex;
      const count = meta.bagusRowCount || 1;

      // Section Header (Dark Emerald Accent)
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: secRow, endRowIndex: secRow + 1, startColumnIndex: 0, endColumnIndex: 4 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.04, green: 0.16, blue: 0.12 },
              textFormat: { foregroundColor: { red: 0.55, green: 0.95, blue: 0.80 }, fontSize: 10, bold: true },
              borders: { left: { style: 'SOLID', width: 3, color: { red: 0.06, green: 0.72, blue: 0.50 } } }
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,borders)'
        }
      });

      // Table Columns Header
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: colHeaderRow, endRowIndex: colHeaderRow + 1, startColumnIndex: 0, endColumnIndex: 4 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.08, green: 0.16, blue: 0.18 },
              textFormat: { foregroundColor: { red: 0.65, green: 0.90, blue: 0.85 }, fontSize: 9, bold: true },
              horizontalAlignment: 'LEFT'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
      });

      // Align header Col B & C
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: colHeaderRow, endRowIndex: colHeaderRow + 1, startColumnIndex: 1, endColumnIndex: 3 },
          cell: { userEnteredFormat: { horizontalAlignment: 'RIGHT' } },
          fields: 'userEnteredFormat.horizontalAlignment'
        }
      });

      // Number formatting for Data Rows
      // Col B: Sisa (Psg)
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: dataStart, endRowIndex: dataStart + count + (meta.hasBagus ? 1 : 0), startColumnIndex: 1, endColumnIndex: 2 },
          cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0' }, horizontalAlignment: 'RIGHT' } },
          fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
        }
      });

      // Col C: Modal Aset (Rp)
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: dataStart, endRowIndex: dataStart + count + (meta.hasBagus ? 1 : 0), startColumnIndex: 2, endColumnIndex: 3 },
          cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"Rp "#,##0' }, horizontalAlignment: 'RIGHT' } },
          fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
        }
      });

      // Col D: Text format for notes
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: dataStart, endRowIndex: dataStart + count, startColumnIndex: 3, endColumnIndex: 4 },
          cell: {
            userEnteredFormat: {
              textFormat: { foregroundColor: { red: 0.60, green: 0.88, blue: 0.75 } }
            }
          },
          fields: 'userEnteredFormat.textFormat'
        }
      });

      // Total row highlight (if has bagus)
      if (meta.hasBagus) {
        const totalRowIdx = dataStart + count;
        requests.push({
          repeatCell: {
            range: { sheetId: dashSheetId, startRowIndex: totalRowIdx, endRowIndex: totalRowIdx + 1, startColumnIndex: 0, endColumnIndex: 4 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.05, green: 0.20, blue: 0.15 },
                textFormat: { foregroundColor: { red: 0.65, green: 0.95, blue: 0.82 }, bold: true },
                borders: {
                  top: { style: 'SOLID', width: 1, color: { red: 0.06, green: 0.72, blue: 0.50 } },
                  bottom: { style: 'DOUBLE', width: 3, color: { red: 0.06, green: 0.72, blue: 0.50 } }
                }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,borders)'
          }
        });
      }
    }

    // 18. Styling untuk Section [8] RINCIAN SISA STOK KONDISI MINUS
    if (meta.minusHeaderRowIndex) {
      const secRow = meta.minusHeaderRowIndex;
      const colHeaderRow = secRow + 1;
      const dataStart = meta.minusDataStartRowIndex;
      const count = meta.minusRowCount || 1;

      // Section Header (Dark Amber Accent)
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: secRow, endRowIndex: secRow + 1, startColumnIndex: 0, endColumnIndex: 4 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.16, green: 0.11, blue: 0.04 },
              textFormat: { foregroundColor: { red: 0.98, green: 0.75, blue: 0.30 }, fontSize: 10, bold: true },
              borders: { left: { style: 'SOLID', width: 3, color: { red: 0.96, green: 0.62, blue: 0.04 } } }
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,borders)'
        }
      });

      // Table Columns Header
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: colHeaderRow, endRowIndex: colHeaderRow + 1, startColumnIndex: 0, endColumnIndex: 4 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.10, green: 0.14, blue: 0.22 },
              textFormat: { foregroundColor: { red: 0.70, green: 0.82, blue: 0.96 }, fontSize: 9, bold: true },
              horizontalAlignment: 'LEFT'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
      });

      // Align header Col B & C
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: colHeaderRow, endRowIndex: colHeaderRow + 1, startColumnIndex: 1, endColumnIndex: 3 },
          cell: { userEnteredFormat: { horizontalAlignment: 'RIGHT' } },
          fields: 'userEnteredFormat.horizontalAlignment'
        }
      });

      // Number formatting for Data Rows
      // Col B: Sisa (Psg)
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: dataStart, endRowIndex: dataStart + count + (meta.hasMinus ? 1 : 0), startColumnIndex: 1, endColumnIndex: 2 },
          cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0' }, horizontalAlignment: 'RIGHT' } },
          fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
        }
      });

      // Col C: Modal Aset (Rp)
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: dataStart, endRowIndex: dataStart + count + (meta.hasMinus ? 1 : 0), startColumnIndex: 2, endColumnIndex: 3 },
          cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"Rp "#,##0' }, horizontalAlignment: 'RIGHT' } },
          fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
        }
      });

      // Col D: Warning text format for defect notes
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: dataStart, endRowIndex: dataStart + count, startColumnIndex: 3, endColumnIndex: 4 },
          cell: {
            userEnteredFormat: {
              textFormat: { foregroundColor: meta.hasMinus ? { red: 0.98, green: 0.75, blue: 0.35 } : { red: 0.50, green: 0.85, blue: 0.65 } }
            }
          },
          fields: 'userEnteredFormat.textFormat'
        }
      });

      // Total row highlight (if has minus)
      if (meta.hasMinus) {
        const totalRowIdx = dataStart + count;
        requests.push({
          repeatCell: {
            range: { sheetId: dashSheetId, startRowIndex: totalRowIdx, endRowIndex: totalRowIdx + 1, startColumnIndex: 0, endColumnIndex: 4 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.18, green: 0.12, blue: 0.05 },
                textFormat: { foregroundColor: { red: 1.0, green: 0.82, blue: 0.38 }, bold: true },
                borders: {
                  top: { style: 'SOLID', width: 1, color: { red: 0.96, green: 0.62, blue: 0.04 } },
                  bottom: { style: 'DOUBLE', width: 3, color: { red: 0.96, green: 0.62, blue: 0.04 } }
                }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,borders)'
          }
        });
      }
    }

    // Send batchUpdate
    const formatRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    });
    if (!formatRes.ok) {
      const err = await formatRes.json().catch(() => ({}));
      console.warn('[GoogleSheets] Dashboard styling notice:', err.error?.message || formatRes.status);
    }
  } catch (err) {
    console.warn('[GoogleSheets] Non-fatal dashboard styling error:', err);
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
    const { locale = 'in_ID' } = (await ensureSheetsExist(token, spreadsheetId, sheetNames)) || {};

    // Locale-aware formula separator (';' untuk regional Indonesia in_ID / id_ID, ',' untuk en_US)
    const isEn = locale.toLowerCase().startsWith('en') || locale.toLowerCase().startsWith('ja') || locale.toLowerCase().startsWith('zh');
    const formulaSep = isEn ? ',' : ';';
    const f = (formula) => {
      if (formulaSep === ',' || !formula || typeof formula !== 'string' || !formula.startsWith('=')) return formula;
      let result = '';
      let inQuote = false;
      for (let i = 0; i < formula.length; i++) {
        const ch = formula[i];
        if (ch === '"') {
          inQuote = !inQuote;
          result += ch;
        } else if (ch === ',' && !inQuote) {
          result += formulaSep;
        } else {
          result += ch;
        }
      }
      return result;
    };

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
    const todayStr = getLocalDateString();

    // 0. Data Sheet: Dashboard Interaktif Utama (Real-Time KPI, Filter Controls, & Charts)
    const stockReport = store.getRealtimeStockReport ? store.getRealtimeStockReport() : { summary: {} };
    const stockSummary = stockReport.summary || {};

    // Hitung Sepatu Laku & Omset Aktual
    let totalPasangLaku = 0;
    let totalOmsetSepatu = 0;
    let countTrxSepatu = 0;

    trxMasukList.forEach((t) => {
      const isInvestor = t.category === 'Dana Investor' || t.category === 'Investasi Modal';
      if (isInvestor) return;

      const amt = Number(t.amount) || 0;
      totalOmsetSepatu += amt;
      countTrxSepatu += 1;

      if (t.items && Array.isArray(t.items) && t.items.length > 0) {
        totalPasangLaku += t.items.length;
      } else {
        totalPasangLaku += Number(t.itemCount) || 1;
      }
    });

    const avgHargaJual = totalPasangLaku > 0 ? Math.round(totalOmsetSepatu / totalPasangLaku) : 0;

    // Hitung Pengadaan dari Suplier
    const totalBelanjaBiaya = supplies.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const totalPasangMasuk = supplies.reduce((sum, s) => {
      if (s.items && Array.isArray(s.items) && s.items.length > 0) {
        return sum + s.items.reduce((sub, it) => sub + (Number(it.qty) || 1), 0);
      }
      return sum + (Number(s.itemsCount) || 1);
    }, 0);

    // Hitung Stok Real-Time (Aktual - tanpa asumsi)
    const totalTerjualAktual = Number(stockSummary.totalTerjualSemua) || Number(totalPasangLaku) || 0;
    const totalSisaAktual = Number(stockSummary.totalSisaPasang) || 0;
    const totalMasukSemua = Number(stockSummary.totalMasukSemua) || (totalTerjualAktual + totalSisaAktual) || 1;
    const pctTerjual = `${Math.min(100, Math.round((totalTerjualAktual / totalMasukSemua) * 100))}%`;
    const pctSisa = `${Math.min(100, Math.round((totalSisaAktual / totalMasukSemua) * 100))}%`;

    // Filter Sisa Stok berdasarkan Kondisi (Bagus vs Minus)
    const unsoldItems = stockReport.unsoldItems || [];
    const minusItems = unsoldItems.filter((it) => (it.kondisi || '').toLowerCase() === 'minus');
    const bagusItems = unsoldItems.filter((it) => (it.kondisi || '').toLowerCase() !== 'minus');

    const totalMinusAset = minusItems.reduce((sum, it) => sum + (Number(it.totalNilaiBeli) || (Number(it.sisaStock) || 0) * (Number(it.buyPrice) || 0)), 0);
    const totalBagusAset = bagusItems.reduce((sum, it) => sum + (Number(it.totalNilaiBeli) || (Number(it.sisaStock) || 0) * (Number(it.buyPrice) || 0)), 0);

    const calcMinusPasang = minusItems.reduce((sum, it) => sum + (Number(it.sisaStock) || 0), 0);
    const calcBagusPasang = bagusItems.reduce((sum, it) => sum + (Number(it.sisaStock) || 0), 0);

    const countMinusPasang = (typeof stockSummary.countKondisiMinus === 'number' && !isNaN(stockSummary.countKondisiMinus))
      ? stockSummary.countKondisiMinus
      : calcMinusPasang;
    const countBagusPasang = (typeof stockSummary.countKondisiBagus === 'number' && !isNaN(stockSummary.countKondisiBagus))
      ? stockSummary.countKondisiBagus
      : (calcBagusPasang > 0 ? calcBagusPasang : Math.max(0, totalSisaAktual - countMinusPasang));
    const resolvedBagusAset = totalBagusAset > 0 ? totalBagusAset : Math.max(0, (Number(stockSummary.totalNilaiAsetModal) || 0) - totalMinusAset);

    // Pengeluaran Kas per Kategori
    const categoryMap = {};
    trxKeluarList.forEach((t) => {
      const cat = (t.category || 'Biaya Operasional').trim();
      const amt = Number(t.amount) || 0;
      if (!categoryMap[cat]) {
        categoryMap[cat] = { total: 0, count: 0 };
      }
      categoryMap[cat].total += amt;
      categoryMap[cat].count += 1;
    });

    let sortedCategories = Object.keys(categoryMap).map((cat) => ({
      name: cat,
      total: categoryMap[cat].total,
      count: categoryMap[cat].count,
      pct: totalKeluar > 0 ? `${((categoryMap[cat].total / totalKeluar) * 100).toFixed(1)}%` : '0%'
    })).sort((a, b) => b.total - a.total);

    if (sortedCategories.length === 0) {
      sortedCategories = [{ name: 'Biaya Operasional', total: 0, count: 0, pct: '0%' }];
    }

    // Rekap per Suplier
    const supplierMap = {};
    supplies.forEach((s) => {
      const sup = (s.supplierName || 'Suplier Umum').trim();
      const amt = Number(s.totalAmount) || 0;
      let count = 0;
      if (s.items && Array.isArray(s.items) && s.items.length > 0) {
        count = s.items.reduce((sub, it) => sub + (Number(it.qty) || 1), 0);
      } else {
        count = Number(s.itemsCount) || 1;
      }

      if (!supplierMap[sup]) {
        supplierMap[sup] = { totalBiaya: 0, totalPasang: 0, fakturCount: 0 };
      }
      supplierMap[sup].totalBiaya += amt;
      supplierMap[sup].totalPasang += count;
      supplierMap[sup].fakturCount += 1;
    });

    let sortedSuppliers = Object.keys(supplierMap).map((sup) => ({
      name: sup,
      totalBiaya: supplierMap[sup].totalBiaya,
      totalPasang: supplierMap[sup].totalPasang,
      fakturCount: supplierMap[sup].fakturCount
    })).sort((a, b) => b.totalBiaya - a.totalBiaya);

    if (sortedSuppliers.length === 0) {
      sortedSuppliers = [{ name: 'Suplier Umum', totalBiaya: 0, totalPasang: 0, fakturCount: 0 }];
    }

    // Unique dates for interactive filter dropdowns
    const dateSet = new Set();
    dateSet.add(todayStr); // Pastikan tanggal hari ini selalu ada dalam daftar pilihan
    transactions.forEach((t) => {
      const d = cleanDateString(t.date);
      if (d) dateSet.add(d);
    });
    supplies.forEach((s) => {
      const d = cleanDateString(s.date);
      if (d) dateSet.add(d);
    });
    if (Array.isArray(shipments)) {
      shipments.forEach((s) => {
        const d = cleanDateString(s.date || s.tanggal);
        if (d) dateSet.add(d);
      });
    }
    const uniqueDates = [...dateSet].sort().reverse();

    const dashboardRows = [
      ['KAS JUARA SEPATU — EXECUTIVE DARK DASHBOARD', '', `Toko: ${shop.name || 'Kas Juara'}`, '', `Owner: ${shop.owner || '-'}`, '', `Sinkron Terakhir: ${nowStr}`, ''],
      ['', '', '', '', '', '', '', ''],

      // 4 TOP KPI METRIC CARDS (Sesuai Referensi Gambar Dashboard - Dinamis terhadap Filter Kalender B6)
      [
        f('=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), "TOTAL OMSET PENJUALAN", "TOTAL OMSET (" & TEXT(B6, "yyyy-mm-dd") & ")")'),
        '',
        f('=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), "SALDO KAS TOKO AKTUAL", "ARUS KAS BERSIH (" & TEXT(B6, "yyyy-mm-dd") & ")")'),
        '',
        f('=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), "TOTAL PENGELUARAN KAS", "TOTAL PENGELUARAN (" & TEXT(B6, "yyyy-mm-dd") & ")")'),
        '',
        'SISA STOK (NILAI MODAL HPP)',
        ''
      ],
      [
        f('=B18'),
        '',
        f('=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), B13, B12)'),
        '',
        f('=B11'),
        '',
        Number(stockSummary.totalNilaiAsetModal) || 0,
        ''
      ],
      [
        f('="Penjualan: " & B20 & " Trx (" & B17 & " Psg)"'),
        '',
        f('=IF(B12>=0, "🟢 Kas Sehat / Surplus", "🔴 Defisit Kas")'),
        '',
        f('="Biaya & Belanja: " & C11'),
        '',
        countMinusPasang > 0
          ? `Tersedia: ${totalSisaAktual} Psg • Bagus: ${countBagusPasang} | ⚠️ Minus: ${countMinusPasang}`
          : `Tersedia: ${totalSisaAktual} Psg • Bagus: ${countBagusPasang} Psg (100% Normal)`,
        ''
      ],

      // KARTU FILTER KALENDER INTERAKTIF (DATE PICKER)
      [
        '📅 FILTER TANGGAL:',
        todayStr,
        '', '', '', '', '', ''
      ],
      [
        '*Pilih tanggal pada sel B6 dari pop-up kalender. Kosongkan sel (Delete) untuk menampilkan Semua Tanggal.',
        '', '', '', '', '', '', ''
      ],
      ['', '', '', '', '', '', '', ''],

      ['[1] KEUANGAN & ARUS KAS (CASH FLOW TOKO)', 'NOMINAL (RP)', 'STATUS', 'KETERANGAN'],
      [
        'Total Pemasukan Kas (Penjualan)',
        f('=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), SUMIFS(\'Kas Masuk\'!J:J, \'Kas Masuk\'!A:A, ">1"), SUMIFS(\'Kas Masuk\'!J:J, \'Kas Masuk\'!C:C, B6, \'Kas Masuk\'!A:A, ">1"))'),
        f('=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), COUNTIFS(\'Kas Masuk\'!A:A, ">1") & " Transaksi", COUNTIFS(\'Kas Masuk\'!C:C, B6, \'Kas Masuk\'!A:A, ">1") & " Transaksi")'),
        'Penerimaan uang kas penjualan toko'
      ],
      [
        'Total Pengeluaran Kas (Biaya & Belanja)',
        f('=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), SUMIFS(\'Kas Keluar\'!H:H, \'Kas Keluar\'!A:A, ">0"), SUMIFS(\'Kas Keluar\'!H:H, \'Kas Keluar\'!C:C, B6, \'Kas Keluar\'!A:A, ">0"))'),
        f('=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), COUNTIFS(\'Kas Keluar\'!A:A, ">0") & " Transaksi", COUNTIFS(\'Kas Keluar\'!C:C, B6, \'Kas Keluar\'!A:A, ">0") & " Transaksi")'),
        'Pengeluaran biaya & operasional toko'
      ],
      [
        'Arus Kas Bersih (Net Cash Flow)',
        f('=B10-B11'),
        f('=IF(B12>=0, "🟢 SURPLUS", "🔴 DEFISIT")'),
        'Selisih uang masuk dikurangi uang keluar'
      ],
      [
        'Total Saldo Kas Toko Saat Ini',
        f('=B14 + SUMIFS(\'Kas Masuk\'!J:J, \'Kas Masuk\'!A:A, ">1") - SUMIFS(\'Kas Keluar\'!H:H, \'Kas Keluar\'!A:A, ">0")'),
        f('=IF(B13>=0, "🟢 Kas Sehat", "🔴 Defisit Kas")'),
        'Modal Kas Awal + Total Masuk - Total Keluar'
      ],
      [
        'Modal Kas Awal Toko',
        Number(totalModalAwal) || 0,
        'Tampungan & Bank',
        `Laci: Rp ${initialLaci.toLocaleString('id-ID')}, Bank: Rp ${initialBank.toLocaleString('id-ID')}`
      ],
      ['', '', '', ''],

      ['[2] LAPORAN PENJUALAN SEPATU LAKU (REALISASI AKTUAL)', 'JUMLAH / NOMINAL', 'SATUAN', 'KETERANGAN'],
      [
        'Total Pasang Sepatu Laku (Terjual)',
        f('=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), SUMIFS(\'Kas Masuk\'!I:I, \'Kas Masuk\'!A:A, ">1", \'Kas Masuk\'!L:L, "<>*Investor*"), SUMIFS(\'Kas Masuk\'!I:I, \'Kas Masuk\'!C:C, B6, \'Kas Masuk\'!A:A, ">1", \'Kas Masuk\'!L:L, "<>*Investor*"))'),
        'Pasang',
        'Total pasang fisik sepatu yang telah terjual'
      ],
      [
        'Total Omset Penjualan Sepatu',
        f('=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), SUMIFS(\'Kas Masuk\'!J:J, \'Kas Masuk\'!A:A, ">1", \'Kas Masuk\'!L:L, "<>*Investor*"), SUMIFS(\'Kas Masuk\'!J:J, \'Kas Masuk\'!C:C, B6, \'Kas Masuk\'!A:A, ">1", \'Kas Masuk\'!L:L, "<>*Investor*"))'),
        'Rupiah',
        'Total penerimaan dari penjualan sepatu di kasir'
      ],
      [
        'Rata-rata Harga Jual Sepatu',
        f('=IF(B17>0, ROUND(B18/B17), 0)'),
        'Rp / Pasang',
        'Harga jual rata-rata per pasang sepatu'
      ],
      [
        'Total Transaksi Penjualan',
        f('=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), COUNTIFS(\'Kas Masuk\'!A:A, ">1", \'Kas Masuk\'!L:L, "<>*Investor*"), COUNTIFS(\'Kas Masuk\'!C:C, B6, \'Kas Masuk\'!A:A, ">1", \'Kas Masuk\'!L:L, "<>*Investor*"))'),
        'Nota Penjualan',
        'Jumlah nota transaksi kasir tercatat'
      ],
      ['', '', '', ''],

      ['[3] LAPORAN SISA STOCK (DATA AKTUAL - TANPA ASUMSI)', 'JUMLAH / NILAI', 'SATUAN', 'KETERANGAN'],
      ['Total Sisa Sepatu Belum Terjual', Number(stockSummary.totalSisaPasang) || 0, 'Pasang', 'Kuantitas fisik stok sisa sepatu di toko'],
      ['Nilai Modal Aset Sisa Stok (HPP)', Number(stockSummary.totalNilaiAsetModal) || 0, 'Rupiah', 'Modal uang riil yang masih tertahan di sisa stok'],
      ['Total Varian / Model Sepatu Aktif', Number(stockSummary.totalVarianSisa) || 0, 'Model', 'Jumlah varian sepatu yang masih tersedia'],
      ['Kondisi Sisa Stok: Bagus', countBagusPasang, 'Pasang', resolvedBagusAset > 0 ? `Modal Aset: Rp ${resolvedBagusAset.toLocaleString('id-ID')} (${bagusItems.length > 0 ? bagusItems.length + ' model ' : ''}siap jual normal)` : 'Sepatu kondisi normal prima'],
      ['Kondisi Sisa Stok: Minus', countMinusPasang, 'Pasang', countMinusPasang > 0 ? `⚠️ Modal Tertahan: Rp ${totalMinusAset.toLocaleString('id-ID')} (Lihat rincian tabel [8])` : 'Tidak ada sisa stok berkondisi minus (Semua normal)'],
      ['', '', '', ''],

      ['[4] REKAP PENGADAAN BARANG', 'JUMLAH / NILAI', 'SATUAN', 'KETERANGAN'],
      [
        'Total Modal Belanja Pengadaan',
        f('=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), SUMIFS(\'Barang Masuk (Belanja)\'!J:J, \'Barang Masuk (Belanja)\'!A:A, ">0"), SUMIFS(\'Barang Masuk (Belanja)\'!J:J, \'Barang Masuk (Belanja)\'!C:C, B6, \'Barang Masuk (Belanja)\'!A:A, ">0"))'),
        'Rupiah',
        'Akumulasi seluruh modal belanja kulakan sesuai periode'
      ],
      [
        'Total Pasang Sepatu Masuk',
        f('=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), SUMIFS(\'Barang Masuk (Belanja)\'!H:H, \'Barang Masuk (Belanja)\'!A:A, ">0"), SUMIFS(\'Barang Masuk (Belanja)\'!H:H, \'Barang Masuk (Belanja)\'!C:C, B6, \'Barang Masuk (Belanja)\'!A:A, ">0"))'),
        'Pasang',
        'Akumulasi seluruh pasang sepatu masuk sesuai periode'
      ],
      [
        'Total Faktur / Item Belanja Masuk',
        f('=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), COUNTIFS(\'Barang Masuk (Belanja)\'!A:A, ">0"), COUNTIFS(\'Barang Masuk (Belanja)\'!C:C, B6, \'Barang Masuk (Belanja)\'!A:A, ">0"))'),
        'Item / Baris',
        'Jumlah item pengadaan tercatat di sistem sesuai periode'
      ],
      [
        'Jumlah Suplier Aktif (Rekanan)',
        sortedSuppliers.length,
        'Suplier',
        sortedSuppliers.length > 0
          ? sortedSuppliers.map((s) => s.name).slice(0, 5).join(', ') + (sortedSuppliers.length > 5 ? ` & ${sortedSuppliers.length - 5} lainnya` : '')
          : 'Belum ada data suplier tercatat'
      ],
      ['', '', '', ''],

      ['[5] DATA KOMPOSISI STOK (SUMBER GRAFIK STOK)', 'JUMLAH (PSG)', 'PERSENTASE', 'KETERANGAN'],
      ['Sepatu Terjual (Laku)', f('=B17'), f('=IF((B36+B37)>0, TEXT(B36/(B36+B37), "0.0%"), "0%")'), 'Realisasi pasang terjual'],
      ['Sisa Belum Terjual', f('=B23'), f('=IF((B36+B37)>0, TEXT(B37/(B36+B37), "0.0%"), "0%")'), 'Stok fisik tersisa saat ini'],
      ['', '', '', ''],

      ['[6] LAPORAN PENGELUARAN KAS PER KATEGORI', 'TOTAL BIAYA (RP)', 'TRANSAKSI', 'PERSENTASE']
    ];

    const catStartRowIndex = dashboardRows.length; // 39
    sortedCategories.forEach((c, idx) => {
      const rNum = catStartRowIndex + idx + 1;
      const safeCat = c.name.replace(/"/g, '""');
      dashboardRows.push([
        c.name,
        f(`=IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), SUMIFS('Kas Keluar'!H:H, 'Kas Keluar'!E:E, "${safeCat}", 'Kas Keluar'!A:A, ">0"), SUMIFS('Kas Keluar'!H:H, 'Kas Keluar'!E:E, "${safeCat}", 'Kas Keluar'!C:C, B6, 'Kas Keluar'!A:A, ">0"))`),
        f(`=(IF(OR(ISBLANK(B6), B6="SEMUA TANGGAL", B6=""), COUNTIFS('Kas Keluar'!E:E, "${safeCat}", 'Kas Keluar'!A:A, ">0"), COUNTIFS('Kas Keluar'!E:E, "${safeCat}", 'Kas Keluar'!C:C, B6, 'Kas Keluar'!A:A, ">0"))) & " Trx"`),
        f(`=IF($B$11>0, TEXT(B${rNum}/$B$11, "0.0%"), "0%")`)
      ]);
    });
    dashboardRows.push(['TOTAL PENGELUARAN', f('=B11'), f('=C11'), '100%']);
    dashboardRows.push(['', '', '', '']);

    // 7. Tabel Rincian Sisa Stok Kondisi Bagus (Siap Jual / Normal)
    const bagusHeaderRowIndex = dashboardRows.length;
    dashboardRows.push(['[7] RINCIAN SISA STOK KONDISI BAGUS (SIAP JUAL / NORMAL)', '', '', '']);
    dashboardRows.push(['NAMA SEPATU / MODEL & BARCODE', 'SISA (PSG)', 'MODAL ASET (RP)', 'SUPLIER REKANAN & STATUS']);

    const bagusDataStartRowIndex = dashboardRows.length;
    if (bagusItems.length > 0) {
      bagusItems.forEach((it) => {
        const sisa = Number(it.sisaStock) || 0;
        const buyPrice = Number(it.buyPrice) || 0;
        const totalAset = Number(it.totalNilaiBeli) || (sisa * buyPrice);
        const codeStr = it.barcode && it.barcode !== '-' ? ` [${it.barcode}]` : '';
        const nameWithBarcode = `${it.name || 'Sepatu'}${codeStr}`;
        const supInfo = it.supplier ? `✓ ${it.supplier}` : '✓ Suplier Toko';

        dashboardRows.push([
          nameWithBarcode,
          sisa,
          totalAset,
          supInfo
        ]);
      });

      // Baris Total Bagus
      dashboardRows.push([
        `TOTAL SISA STOK BAGUS (${bagusItems.length} Model)`,
        countBagusPasang,
        resolvedBagusAset,
        '✓ Kondisi normal prima siap dijual'
      ]);
    } else {
      dashboardRows.push([
        'Semua Sisa Stok Normal',
        countBagusPasang,
        resolvedBagusAset,
        '✓ Kondisi prima siap dijual'
      ]);
    }
    dashboardRows.push(['', '', '', '']);

    // 8. Tabel Rincian Sisa Stok Kondisi Minus (Cacat / Defect)
    const minusHeaderRowIndex = dashboardRows.length;
    dashboardRows.push(['[8] RINCIAN SISA STOK KONDISI MINUS (CATATAN CACAT / DEFECT)', '', '', '']);
    dashboardRows.push(['NAMA SEPATU / MODEL & BARCODE', 'SISA (PSG)', 'MODAL ASET (RP)', 'CATATAN CACAT / MINUS & SUPLIER']);

    const minusDataStartRowIndex = dashboardRows.length;
    if (minusItems.length > 0) {
      minusItems.forEach((it) => {
        const sisa = Number(it.sisaStock) || 0;
        const buyPrice = Number(it.buyPrice) || 0;
        const totalAset = Number(it.totalNilaiBeli) || (sisa * buyPrice);
        const codeStr = it.barcode && it.barcode !== '-' ? ` [${it.barcode}]` : '';
        const nameWithBarcode = `${it.name || 'Sepatu'}${codeStr}`;
        const catatanDefect = it.catatanMinus ? `⚠️ ${it.catatanMinus}` : '⚠️ Kondisi Minus';
        const supInfo = it.supplier && it.supplier !== 'Suplier Umum' ? ` • ${it.supplier}` : '';

        dashboardRows.push([
          nameWithBarcode,
          sisa,
          totalAset,
          `${catatanDefect}${supInfo}`
        ]);
      });

      // Baris Total Minus
      dashboardRows.push([
        `TOTAL SISA STOK MINUS (${minusItems.length} Model)`,
        countMinusPasang,
        totalMinusAset,
        'Perlu perhatian khusus / pertimbangan diskon cuci gudang'
      ]);
    } else {
      dashboardRows.push([
        'Tidak Ada Sisa Stok Minus',
        0,
        0,
        '✓ Seluruh sisa stok sepatu dalam kondisi Bagus / Prima (100% Normal)'
      ]);
    }
    dashboardRows.push(['', '', '', '']);

    const dashboardMeta = {
      uniqueDates,
      catStartRowIndex,
      catRowCount: sortedCategories.length,
      bagusHeaderRowIndex,
      bagusDataStartRowIndex,
      bagusRowCount: bagusItems.length > 0 ? bagusItems.length : 1,
      hasBagus: bagusItems.length > 0,
      minusHeaderRowIndex,
      minusDataStartRowIndex,
      minusRowCount: minusItems.length > 0 ? minusItems.length : 1,
      hasMinus: minusItems.length > 0
    };

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

    // 2. Data Sheet: KAS MASUK - Laporan Per-Baris Setiap Sepatu / Barang
    const masukHeader = [
      'No',
      'No. Nota / ID',
      'Tanggal',
      'Jam',
      'Nama Pelanggan',
      'Barcode',
      'Nama Sepatu / Barang',
      'Kondisi',
      'Jumlah (Psg)',
      'Harga / Jumlah Masuk (Rp)',
      'Metode Pembayaran',
      'Kategori',
      'Keterangan / Catatan'
    ];

    const kasMasukRows = [masukHeader];
    let kasMasukRowIndex = 1;
    let grandTotalPasangJual = 0;

    // Baris Pertama: Modal Kas Awal Toko
    kasMasukRows.push([
      kasMasukRowIndex++,
      '#SALDO-AWAL',
      '-',
      '-',
      'Toko (Kas Awal)',
      '-',
      'Modal Kas Awal Toko',
      '-',
      '-',
      totalModalAwal,
      'Tampungan & Bank',
      'Modal Kas Awal',
      `Modal Kas Awal Toko (Tampungan: Rp ${initialLaci.toLocaleString('id-ID')}, Bank: Rp ${initialBank.toLocaleString('id-ID')})`
    ]);

    // Transaksi Kas Masuk diurutkan terlama ke terbaru
    const sortedMasuk = [...trxMasukList].reverse();
    sortedMasuk.forEach((t) => {
      const nota = t.nota || t.id || '-';
      const tgl = cleanDateString(t.date) || '-';
      const jam = t.time || '-';
      const buyer = t.buyer || 'Pelanggan Toko';
      const payMethod = t.paymentMethod || 'Tunai';
      const cat = t.category || 'Penjualan Sepatu';
      const note = t.note || t.keterangan || '-';

      if (t.items && Array.isArray(t.items) && t.items.length > 0) {
        t.items.forEach((it) => {
          const qty = 1; // 1 pasang per baris sepatu
          const price = Number(it.price) || 0;
          grandTotalPasangJual += qty;

          kasMasukRows.push([
            kasMasukRowIndex++,
            nota,
            tgl,
            jam,
            buyer,
            it.barcode || t.barcode || '-',
            it.name || t.productName || 'Sepatu',
            it.kondisi || t.kondisi || 'Bagus',
            qty,
            price,
            payMethod,
            cat,
            note
          ]);
        });
      } else {
        const qty = Number(t.itemCount) || 1;
        const amt = Number(t.amount) || 0;
        grandTotalPasangJual += qty;

        kasMasukRows.push([
          kasMasukRowIndex++,
          nota,
          tgl,
          jam,
          buyer,
          t.barcode || '-',
          t.title || t.productName || 'Penjualan Sepatu',
          t.kondisi || 'Bagus',
          qty,
          amt,
          payMethod,
          cat,
          note
        ]);
      }
    });

    // Baris Total di Kas Masuk
    kasMasukRows.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      'TOTAL KAS MASUK (+ MODAL AWAL)',
      '',
      grandTotalPasangJual,
      totalModalAwal + totalMasuk,
      '',
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
        cleanDateString(t.date) || '-',
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

    // 4. Data Sheet: Barang Masuk (Belanja) - Laporan Per-Baris Setiap Barang/Sepatu
    const supplyHeader = [
      'No',
      'No. Faktur / ID',
      'Tanggal',
      'Supplier / Sumber',
      'Barcode',
      'Nama Sepatu / Barang',
      'Kondisi',
      'Jumlah (Psg)',
      'Harga Modal (Rp)',
      'Total Modal (Rp)',
      'Status Pembayaran',
      'Metode Bayar',
      'Keterangan / Catatan'
    ];

    const supplyRows = [supplyHeader];
    let supplyRowIndex = 1;
    let grandTotalPasang = 0;
    let grandTotalBiaya = 0;

    supplies.forEach((s) => {
      const inv = s.invoiceNo || s.id || '-';
      const tgl = cleanDateString(s.date) || '-';
      const sup = s.supplierName || '-';
      const statusLabel = s.status === 'lunas' ? 'Lunas' : 'Belum Lunas';
      const payMethod = s.paymentMethod || 'Tunai (Laci)';
      const notes = s.notes || '-';

      if (s.items && Array.isArray(s.items) && s.items.length > 0) {
        s.items.forEach((it) => {
          const qty = Number(it.qty) || 1;
          const buyPrice = Number(it.buyPrice) || 0;
          const totalModal = qty * buyPrice;

          grandTotalPasang += qty;
          grandTotalBiaya += totalModal;

          let kondisiStr = it.kondisi || 'Bagus';
          if (it.kondisi === 'Minus' && it.catatanMinus) {
            kondisiStr = `Minus (${it.catatanMinus})`;
          }

          supplyRows.push([
            supplyRowIndex++,
            inv,
            tgl,
            sup,
            it.barcode || '-',
            it.name || 'Sepatu',
            kondisiStr,
            qty,
            buyPrice,
            totalModal,
            statusLabel,
            payMethod,
            notes
          ]);
        });
      } else {
        const qty = Number(s.itemsCount) || 1;
        const totalModal = Number(s.totalAmount) || 0;
        const buyPrice = qty > 0 ? Math.round(totalModal / qty) : totalModal;

        grandTotalPasang += qty;
        grandTotalBiaya += totalModal;

        supplyRows.push([
          supplyRowIndex++,
          inv,
          tgl,
          sup,
          '-',
          s.notes || 'Pengadaan Sepatu',
          'Bagus',
          qty,
          buyPrice,
          totalModal,
          statusLabel,
          payMethod,
          notes
        ]);
      }
    });

    // Baris Total Pengadaan di Sheet Barang Masuk
    supplyRows.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      'TOTAL PENGADAAN BARANG',
      '',
      grandTotalPasang,
      '',
      grandTotalBiaya,
      '',
      '',
      ''
    ]);

    // 5. Data Sheet: Pengiriman (Sepatu Terjual) - Laporan Per-Baris Setiap Sepatu
    const shipmentHeader = [
      'No',
      'No. Nota / ID',
      'Tanggal',
      'Jam',
      'Nama Pelanggan',
      'Barcode',
      'Nama Sepatu / Barang',
      'Kondisi',
      'Jumlah (Psg)',
      'Harga (Rp)',
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
    let shipmentRowIndex = 1;
    let grandTotalPasangShipment = 0;
    let grandTotalNilaiShipment = 0;

    shipments.forEach((s) => {
      const nota = s.nota || s.id || '-';
      const tgl = cleanDateString(s.date || s.tanggal) || '-';
      const jam = s.time || '-';
      const buyer = s.buyer || 'Pelanggan Toko';
      const stKey = s.shippingStatus || 'kemas';
      const stLabel = STATUS_LABEL_MAP[stKey] || stKey;
      const courier = s.shippingCourier || '-';
      const resi = s.shippingResi || '-';
      const note = s.shippingNote || s.note || '-';

      if (s.items && Array.isArray(s.items) && s.items.length > 0) {
        s.items.forEach((it) => {
          const qty = 1; // 1 pasang per baris sepatu
          const price = Number(it.price) || 0;
          grandTotalPasangShipment += qty;
          grandTotalNilaiShipment += price;

          shipmentRows.push([
            shipmentRowIndex++,
            nota,
            tgl,
            jam,
            buyer,
            it.barcode || s.barcode || '-',
            it.name || s.productName || 'Sepatu',
            it.kondisi || s.kondisi || 'Bagus',
            qty,
            price,
            stLabel,
            courier,
            resi,
            note
          ]);
        });
      } else {
        const qty = Number(s.itemCount) || 1;
        const price = Number(s.amount) || 0;
        grandTotalPasangShipment += qty;
        grandTotalNilaiShipment += price;

        shipmentRows.push([
          shipmentRowIndex++,
          nota,
          tgl,
          jam,
          buyer,
          s.barcode || '-',
          s.productName || s.title || 'Sepatu',
          s.kondisi || 'Bagus',
          qty,
          price,
          stLabel,
          courier,
          resi,
          note
        ]);
      }
    });

    // Baris Total di Sheet Pengiriman
    shipmentRows.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      'TOTAL PENGIRIMAN SEPATU',
      '',
      grandTotalPasangShipment,
      grandTotalNilaiShipment,
      '',
      '',
      '',
      ''
    ]);

    // Step 1: Clear old ranges cleanly in ONE atomic call
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ranges: [
          "'Dashboard'!A1:Z500",
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

    // Step 3: Apply Executive Dashboard Theme, Data Validation & Embed Real Google Sheets Charts
    await applyDashboardDesignAndCharts(token, spreadsheetId, dashboardMeta);

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

