import defaultCredentials from '@service-account';

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
 * Applies executive dark modern card dashboard styling, column widths, currency formats,
 * filter dropdowns (Data Validation), and embeds 4 real interactive Google Sheets charts.
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

    // 2. Set optimal column widths for Dark Modern Dashboard
    const colWidths = [
      { col: 0, size: 240 }, // Col A (Titles & labels)
      { col: 1, size: 160 }, // Col B (Values / Rp / Filter)
      { col: 2, size: 180 }, // Col C (Labels / Psg / Status)
      { col: 3, size: 160 }, // Col D (Filter / Notes)
      { col: 4, size: 30 },  // Col E (Spacer)
      { col: 5, size: 88 },  // Col F (Chart 1 & 3 Left area)
      { col: 6, size: 88 },  // Col G
      { col: 7, size: 88 },  // Col H
      { col: 8, size: 88 },  // Col I
      { col: 9, size: 88 },  // Col J
      { col: 10, size: 25 }, // Col K (Spacer between chart 1 & 2)
      { col: 11, size: 95 }, // Col L (Chart 2 & 4 Right area)
      { col: 12, size: 95 }, // Col M
      { col: 13, size: 95 }, // Col N
      { col: 14, size: 95 }  // Col O
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

    // 3. Base Dark Theme for Table Data Area (Rows 0-120, Cols A-D)
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 0, endRowIndex: 120, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.0588, green: 0.0902, blue: 0.1647 }, // #0F172A
            textFormat: {
              foregroundColor: { red: 0.8863, green: 0.9176, blue: 0.9529 }, // #E2E8F0
              fontSize: 10
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    });

    // 4. Top Executive Banner (Row 1 / Index 0)
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.0353, green: 0.051, blue: 0.0863 }, // #090D16 Dark
            textFormat: {
              foregroundColor: { red: 0.2196, green: 0.7412, blue: 0.9725 }, // #38BDF8 Cyan
              fontSize: 11,
              bold: true
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    });

    // 5. 4 TOP KPI CARDS (Row 3: Title, Row 4: Values - Sesuai Gambar)
    // Card 1: TOTAL OMSET (Hijau Zamrud #10B981 & #059669)
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.0627, green: 0.7255, blue: 0.5059 }, // #10B981 Emerald
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10, bold: true },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.0196, green: 0.5882, blue: 0.4118 }, // #059669 Emerald Dark
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 13, bold: true },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });

    // Card 2: SALDO KAS TOKO (Royal Blue #2563EB & #1D4ED8)
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 2, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.1451, green: 0.3882, blue: 0.9216 }, // #2563EB Royal Blue
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10, bold: true },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 2, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.1137, green: 0.3059, blue: 0.8471 }, // #1D4ED8
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 13, bold: true },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });

    // Card 3: PENGELUARAN KAS (Crimson Pink / Red #E11D48 & #BE123C)
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 4, endColumnIndex: 6 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.8824, green: 0.1137, blue: 0.2824 }, // #E11D48 Crimson
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10, bold: true },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 4, endColumnIndex: 6 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.7451, green: 0.0706, blue: 0.2353 }, // #BE123C
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 13, bold: true },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });

    // Card 4: SISA STOK (NILAI MODAL) (Amber Yellow #F59E0B & #D97706)
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 6, endColumnIndex: 8 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.9608, green: 0.6196, blue: 0.0431 }, // #F59E0B Amber
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10, bold: true },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 6, endColumnIndex: 8 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.851, green: 0.4667, blue: 0.0235 }, // #D97706
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 13, bold: true },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });

    // 6. Filter Controls Card (Rows 6 & 7 / Indexes 5 & 6)
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 5, endRowIndex: 7, startColumnIndex: 0, endColumnIndex: 8 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.1176, green: 0.1608, blue: 0.2314 }, // #1E293B Dark Slate Card
            textFormat: {
              foregroundColor: { red: 0.56, green: 0.82, blue: 1.0 }, // Soft Cyan
              fontSize: 10
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    });

    // Highlight dropdown input cells in filter card (B6, D6, F6)
    [1, 3, 5].forEach((colIdx) => {
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: colIdx, endColumnIndex: colIdx + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.0588, green: 0.0902, blue: 0.1647 }, // #0F172A
              textFormat: { foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 }, bold: true }
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)'
        }
      });
    });

    // 7. Section Headers Styling
    const sectionRowIndexes = [
      8,  // [1] Keuangan & Arus Kas
      15, // [2] Sepatu Laku
      21, // [3] Sisa Stock
      28, // [4] Rekap Pengadaan
      34, // [5] Komposisi Stok
      38  // [6] Pengeluaran per Kategori
    ];
    if (meta.supHeaderRowIndex) {
      sectionRowIndexes.push(meta.supHeaderRowIndex);
    }

    sectionRowIndexes.forEach((rIdx) => {
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheetId, startRowIndex: rIdx, endRowIndex: rIdx + 1, startColumnIndex: 0, endColumnIndex: 4 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.0588, green: 0.1843, blue: 0.2902 }, // #0F2F4A Executive Navy
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

    // 8. Highlight Special Metric Rows:
    // Saldo Kas Toko (index 12 / Row 13) -> Emerald Glow
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 12, endRowIndex: 13, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.0235, green: 0.3059, blue: 0.2314 }, // Emerald #064E3B
            textFormat: {
              foregroundColor: { red: 0.6549, green: 0.9529, blue: 0.8157 },
              fontSize: 11,
              bold: true
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    });

    // Arus Kas Bersih (index 11 / Row 12) -> Dark Teal Glow
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 11, endRowIndex: 12, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.051, green: 0.24, blue: 0.26 },
            textFormat: {
              foregroundColor: { red: 0.404, green: 0.91, blue: 0.976 },
              fontSize: 10,
              bold: true
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    });

    // Total Omset Sepatu (index 17 / Row 18) -> Emerald Glow
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 17, endRowIndex: 18, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.0235, green: 0.3059, blue: 0.2314 },
            textFormat: {
              foregroundColor: { red: 0.6549, green: 0.9529, blue: 0.8157 },
              fontSize: 10,
              bold: true
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    });

    // Nilai Modal Aset Sisa (index 23 / Row 24) -> Soft Sky Glow
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheetId, startRowIndex: 23, endRowIndex: 24, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.0549, green: 0.2275, blue: 0.3216 },
            textFormat: {
              foregroundColor: { red: 0.73, green: 0.90, blue: 0.99 },
              fontSize: 10,
              bold: true
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    });

    // 9. Currency Number Formatting (Rp #,##0)
    // KPI Cards value row (Row index 3)
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

    // Column B (Currency ranges in data tables)
    const currencyRanges = [
      { start: 9, end: 14 },  // Arus kas & modal awal
      { start: 17, end: 19 }, // Omset & avg harga
      { start: 23, end: 24 }, // Nilai Modal aset sisa
      { start: 29, end: 30 }  // Total belanja pengadaan
    ];

    if (meta.catStartRowIndex && meta.catRowCount) {
      currencyRanges.push({ start: meta.catStartRowIndex, end: meta.catStartRowIndex + meta.catRowCount + 1 });
    }
    if (meta.supStartRowIndex && meta.supRowCount) {
      currencyRanges.push({ start: meta.supStartRowIndex, end: meta.supStartRowIndex + meta.supRowCount + 1 });
    }

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

    // 10. Data Validation Dropdowns for Interactive Filter Cells
    if (meta.uniqueDates && meta.uniqueDates.length > 0) {
      const dateList = ['SEMUA TANGGAL', 'HARI INI', ...meta.uniqueDates.slice(0, 20)];
      requests.push({
        setDataValidation: {
          range: { sheetId: dashSheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 1, endColumnIndex: 2 },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: dateList.map((v) => ({ userEnteredValue: v }))
            },
            showCustomUi: true,
            strict: false
          }
        }
      });
    }

    if (meta.supplierNames && meta.supplierNames.length > 0) {
      const supList = ['SEMUA SUPLIER', ...meta.supplierNames.slice(0, 25)];
      requests.push({
        setDataValidation: {
          range: { sheetId: dashSheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 3, endColumnIndex: 4 },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: supList.map((v) => ({ userEnteredValue: v }))
            },
            showCustomUi: true,
            strict: false
          }
        }
      });
    }

    if (meta.invoiceNos && meta.invoiceNos.length > 0) {
      const invList = ['SEMUA FAKTUR', ...meta.invoiceNos.slice(0, 25)];
      requests.push({
        setDataValidation: {
          range: { sheetId: dashSheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 5, endColumnIndex: 6 },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: invList.map((v) => ({ userEnteredValue: v }))
            },
            showCustomUi: true,
            strict: false
          }
        }
      });
    }

    // 11. Add Chart 1: Perbandingan Arus Kas (Column Chart - Top Left Widget)
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
                          startRowIndex: 9,
                          endRowIndex: 11,
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
                          startRowIndex: 9,
                          endRowIndex: 11,
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
                rowIndex: 8,
                columnIndex: 5
              },
              widthPixels: 430,
              heightPixels: 260
            }
          }
        }
      }
    });

    // 12. Add Chart 2: Komposisi Stok Sepatu (Donut Chart - Top Right Widget)
    requests.push({
      addChart: {
        chart: {
          spec: {
            title: 'Komposisi Stok Sepatu (Terjual vs Sisa)',
            pieChart: {
              legendPosition: 'RIGHT_LEGEND',
              pieHole: 0.5,
              domain: {
                sourceRange: {
                  sources: [
                    {
                      sheetId: dashSheetId,
                      startRowIndex: 35,
                      endRowIndex: 37,
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
                      startRowIndex: 35,
                      endRowIndex: 37,
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
                rowIndex: 8,
                columnIndex: 11
              },
              widthPixels: 380,
              heightPixels: 260
            }
          }
        }
      }
    });

    // 13. Add Chart 3: Proporsi Pengeluaran per Kategori (Donut Chart - Bottom Left Widget)
    if (meta.catStartRowIndex && meta.catRowCount > 0) {
      requests.push({
        addChart: {
          chart: {
            spec: {
              title: 'Proporsi Pengeluaran Kas per Kategori',
              pieChart: {
                legendPosition: 'RIGHT_LEGEND',
                pieHole: 0.5,
                domain: {
                  sourceRange: {
                    sources: [
                      {
                        sheetId: dashSheetId,
                        startRowIndex: meta.catStartRowIndex,
                        endRowIndex: meta.catStartRowIndex + meta.catRowCount,
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
                        startRowIndex: meta.catStartRowIndex,
                        endRowIndex: meta.catStartRowIndex + meta.catRowCount,
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
                  rowIndex: 21,
                  columnIndex: 5
                },
                widthPixels: 430,
                heightPixels: 270
              }
            }
          }
        }
      });
    }

    // 14. Add Chart 4: Top Belanja per Suplier (Column Chart - Bottom Right Widget)
    if (meta.supStartRowIndex && meta.supRowCount > 0) {
      const topSupCount = Math.min(meta.supRowCount, 5);
      requests.push({
        addChart: {
          chart: {
            spec: {
              title: 'Top Belanja Pengadaan per Suplier',
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
                            startRowIndex: meta.supStartRowIndex,
                            endRowIndex: meta.supStartRowIndex + topSupCount,
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
                            startRowIndex: meta.supStartRowIndex,
                            endRowIndex: meta.supStartRowIndex + topSupCount,
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
                  rowIndex: 21,
                  columnIndex: 11
                },
                widthPixels: 380,
                heightPixels: 270
              }
            }
          }
        }
      });
    }

    // Send batchUpdate for Dashboard design, data validations & 4 charts
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

    // Unique dates & invoices for interactive filter dropdowns
    const dateSet = new Set();
    transactions.forEach((t) => { if (t.date) dateSet.add(t.date); });
    supplies.forEach((s) => { if (s.date) dateSet.add(s.date); });
    const uniqueDates = [...dateSet].sort().reverse();
    const invoiceNos = supplies.map((s) => s.invoiceNo || s.id).filter(Boolean);

    const dashboardRows = [
      ['KAS JUARA SEPATU — EXECUTIVE DARK DASHBOARD', '', `Toko: ${shop.name || 'Kas Juara'}`, '', `Owner: ${shop.owner || '-'}`, '', `Sinkron Terakhir: ${nowStr}`, ''],
      ['', '', '', '', '', '', '', ''],

      // 4 TOP KPI METRIC CARDS (Sesuai Referensi Gambar Dashboard)
      ['TOTAL OMSET PENJUALAN', '', 'SALDO KAS TOKO AKTUAL', '', 'TOTAL PENGELUARAN KAS', '', 'SISA STOK (NILAI MODAL HPP)', ''],
      [
        Number(totalOmsetSepatu) || 0,
        `${countTrxSepatu} Trx`,
        Number(currentBalance) || 0,
        currentBalance >= 0 ? '🟢 Kas Sehat' : '🔴 Defisit',
        Number(totalKeluar) || 0,
        `${trxKeluarList.length} Trx`,
        Number(stockSummary.totalNilaiAsetModal) || 0,
        `${totalSisaAktual} Psg`
      ],
      ['', '', '', '', '', '', '', ''],

      // KARTU FILTER INTERAKTIF (DROPDOWN CONTROLS)
      ['🎛️ FILTER HARI / PERIODE:', 'SEMUA TANGGAL', '🏢 FILTER SUPLIER:', 'SEMUA SUPLIER', '📄 FILTER FAKTUR:', 'SEMUA FAKTUR', '⚡ STATUS FILTER:', 'AKTIF (REAL-TIME)'],
      ['*Gunakan menu dropdown di sel B6, D6, dan F6 untuk menyaring data laporan pada spreadsheet secara interaktif', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],

      ['[1] KEUANGAN & ARUS KAS (CASH FLOW TOKO)', 'NOMINAL (RP)', 'STATUS', 'KETERANGAN'],
      ['Total Pemasukan Kas (Penjualan)', Number(totalMasuk) || 0, `${trxMasukList.length} Transaksi`, 'Penerimaan uang kas penjualan toko'],
      ['Total Pengeluaran Kas (Biaya & Belanja)', Number(totalKeluar) || 0, `${trxKeluarList.length} Transaksi`, 'Pengeluaran biaya & operasional toko'],
      ['Arus Kas Bersih (Net Cash Flow)', Number(totalMasuk - totalKeluar) || 0, totalMasuk >= totalKeluar ? '🟢 SURPLUS' : '🔴 DEFISIT', 'Selisih uang masuk dikurangi uang keluar'],
      ['Total Saldo Kas Toko Saat Ini', Number(currentBalance) || 0, currentBalance >= 0 ? '🟢 Kas Sehat' : '🔴 Defisit Kas', 'Modal Kas Awal + Total Masuk - Total Keluar'],
      ['Modal Kas Awal Toko', Number(totalModalAwal) || 0, 'Tampungan & Bank', `Laci: Rp ${initialLaci.toLocaleString('id-ID')}, Bank: Rp ${initialBank.toLocaleString('id-ID')}`],
      ['', '', '', ''],

      ['[2] LAPORAN PENJUALAN SEPATU LAKU (REALISASI AKTUAL)', 'JUMLAH / NOMINAL', 'SATUAN', 'KETERANGAN'],
      ['Total Pasang Sepatu Laku (Terjual)', Number(totalPasangLaku) || 0, 'Pasang', 'Total pasang fisik sepatu yang telah terjual'],
      ['Total Omset Penjualan Sepatu', Number(totalOmsetSepatu) || 0, 'Rupiah', 'Total penerimaan dari penjualan sepatu di kasir'],
      ['Rata-rata Harga Jual Sepatu', Number(avgHargaJual) || 0, 'Rp / Pasang', 'Harga jual rata-rata per pasang sepatu'],
      ['Total Transaksi Penjualan', Number(countTrxSepatu) || 0, 'Nota Penjualan', 'Jumlah nota transaksi kasir tercatat'],
      ['', '', '', ''],

      ['[3] LAPORAN SISA STOCK (DATA AKTUAL - TANPA ASUMSI)', 'JUMLAH / NILAI', 'SATUAN', 'KETERANGAN'],
      ['Total Sisa Sepatu Belum Terjual', Number(stockSummary.totalSisaPasang) || 0, 'Pasang', 'Kuantitas fisik stok sisa sepatu di toko'],
      ['Nilai Modal Aset Sisa Stok (HPP)', Number(stockSummary.totalNilaiAsetModal) || 0, 'Rupiah', 'Modal uang riil yang masih tertahan di sisa stok'],
      ['Total Varian / Model Sepatu Aktif', Number(stockSummary.totalVarianSisa) || 0, 'Model', 'Jumlah varian sepatu yang masih tersedia'],
      ['Kondisi Sisa Stok: Bagus', Number(stockSummary.countKondisiBagus) || 0, 'Pasang', 'Sepatu kondisi normal prima'],
      ['Kondisi Sisa Stok: Minus', Number(stockSummary.countKondisiMinus) || 0, 'Pasang', 'Sepatu dengan catatan cacat ringan/minus'],
      ['', '', '', ''],

      ['[4] REKAP PENGADAAN BARANG (KULAKAN SUPLIER)', 'JUMLAH / NILAI', 'SATUAN', 'KETERANGAN'],
      ['Total Modal Belanja Pengadaan', Number(totalBelanjaBiaya) || 0, 'Rupiah', 'Akumulasi seluruh modal belanja kulakan'],
      ['Total Pasang Sepatu Masuk', Number(totalPasangMasuk) || 0, 'Pasang', 'Akumulasi seluruh pasang sepatu yang masuk'],
      ['Total Faktur Belanja Masuk', Number(supplies.length) || 0, 'Faktur', 'Jumlah faktur belanja tercatat di sistem'],
      ['Jumlah Mitra Suplier Rekanan', Number(sortedSuppliers.length) || 0, 'Suplier', 'Total suplier yang menyuplai barang'],
      ['', '', '', ''],

      ['[5] DATA KOMPOSISI STOK (SUMBER GRAFIK STOK)', 'JUMLAH (PSG)', 'PERSENTASE', 'KETERANGAN'],
      ['Sepatu Terjual (Laku)', Number(totalTerjualAktual) || 0, pctTerjual, 'Realisasi pasang terjual'],
      ['Sisa Belum Terjual', Number(totalSisaAktual) || 0, pctSisa, 'Stok fisik tersisa saat ini'],
      ['', '', '', ''],

      ['[6] LAPORAN PENGELUARAN KAS PER KATEGORI', 'TOTAL BIAYA (RP)', 'TRANSAKSI', 'PERSENTASE']
    ];

    const catStartRowIndex = dashboardRows.length; // 39
    sortedCategories.forEach((c) => {
      dashboardRows.push([c.name, Number(c.total) || 0, `${c.count} Trx`, c.pct]);
    });
    dashboardRows.push(['TOTAL PENGELUARAN', Number(totalKeluar) || 0, `${trxKeluarList.length} Trx`, '100%']);
    dashboardRows.push(['', '', '', '']);

    const supHeaderRowIndex = dashboardRows.length;
    dashboardRows.push(['[7] REKAP PENGADAAN PER SUPLIER REKANAN', 'TOTAL BELANJA (RP)', 'TOTAL PASANG', 'JUMLAH FAKTUR']);
    const supStartRowIndex = dashboardRows.length;
    sortedSuppliers.forEach((s) => {
      dashboardRows.push([s.name, Number(s.totalBiaya) || 0, `${s.totalPasang} Psg`, `${s.fakturCount} Faktur`]);
    });
    dashboardRows.push(['TOTAL PENGADAAN', Number(totalBelanjaBiaya) || 0, `${totalPasangMasuk} Psg`, `${supplies.length} Faktur`]);

    const dashboardMeta = {
      uniqueDates,
      supplierNames: sortedSuppliers.map((s) => s.name),
      invoiceNos,
      catStartRowIndex,
      catRowCount: sortedCategories.length,
      supHeaderRowIndex,
      supStartRowIndex,
      supRowCount: sortedSuppliers.length
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
      const tgl = t.date || '-';
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
      const tgl = s.date || '-';
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
      const tgl = s.date || '-';
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
          "'Dashboard'!A1:Z300",
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

