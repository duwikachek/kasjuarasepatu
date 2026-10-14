/**
 * Helper fungsi penanganan tanggal lokal toko (WIB / zona waktu lokal perangkat)
 * Mencegah pergeseran tanggal ke kemarin akibat penggunaan new Date().toISOString() pada dini hari.
 */

export function getLocalDateString(d = new Date()) {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}-${String(fallback.getDate()).padStart(2, '0')}`;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function cleanDateString(val) {
  if (!val) return null;
  const str = String(val).trim();
  if (!str || str === '-') return null;
  const match = str.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  if (str.includes('T')) return str.split('T')[0];
  return str;
}
