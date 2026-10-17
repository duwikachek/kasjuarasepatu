import { formatRupiah } from '../store/store.js';
import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';

function formatDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return d;
  }
}

export function renderInvestorPage(store, isAdmin = true) {
  const summary = store.getInvestorSummary ? store.getInvestorSummary() : {};
  const reports = store.getInvestmentSessionReport ? store.getInvestmentSessionReport() : [];
  const supplies = store.getSupplies ? store.getSupplies() : [];

  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-28">
      ${renderHeader({
        title: 'Investasi & Modal',
        badge: 'BAGI HASIL 60:40',
        subtitle: 'Sesi Belanja, Target 50% & Laba Bersih',
        showBack: true,
        backRoute: 'dashboard'
      })}

      <div class="flex flex-col w-full px-4 pt-3 gap-3.5">

        <!-- Role Badge Banner (Atasan / Pemodal Mode) -->
        ${!isAdmin ? `
        <div class="glass-sheet rounded-xl p-3 flex items-start gap-2.5 border border-blue-500/30">
          <div class="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <span class="material-symbols-outlined text-[18px]">visibility</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-blue-300">Mode Pemodal (Pantau Saja)</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-bold">READ ONLY</span>
            </div>
            <p class="text-[11px] text-neutral-300 mt-0.5 leading-relaxed">
              Anda dapat memantau seluruh progres penjualan sesi, capaian target 50%, pembagian laba bersih 60:40, dan mutasi kas tanpa dapat mengubah data.
            </p>
          </div>
        </div>
        ` : ''}

        <!-- KPI 4 Cards: Ringkasan Investasi & Bagi Hasil (Investor 60% & Pengelola 40%) -->
        <div class="grid grid-cols-2 gap-2">
          <!-- Total Modal Diterima -->
          <div class="glass-dark glass-sheen rounded-xl p-3 flex flex-col justify-between border-t-2 border-emerald-500">
            <div class="flex items-center justify-between text-neutral-400">
              <span class="font-bold text-[10px] uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px]">account_balance_wallet</span>
                Modal Masuk
              </span>
            </div>
            <div class="mt-1.5">
              <span class="font-bold text-base sm:text-lg text-white font-tabular block truncate">
                ${formatRupiah(summary.totalInvested || 0)}
              </span>
              <span class="text-[10px] text-neutral-400 block mt-0.5">Sisa Pokok: ${formatRupiah(summary.totalPokokSisa || 0, '')}</span>
            </div>
          </div>

          <!-- Sisa Pokok Modal -->
          <div class="glass-dark glass-sheen rounded-xl p-3 flex flex-col justify-between border-t-2 border-blue-500">
            <div class="flex items-center justify-between text-neutral-400">
              <span class="font-bold text-[10px] uppercase tracking-wider text-blue-400 flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px]">savings</span>
                Pokok Dikembalikan
              </span>
            </div>
            <div class="mt-1.5">
              <span class="font-bold text-base sm:text-lg text-blue-300 font-tabular block truncate">
                ${formatRupiah(summary.totalPokokDikembalikan || 0)}
              </span>
              <span class="text-[10px] text-neutral-400 block mt-0.5">${summary.countTotal || 0} Pemodal Terdaftar</span>
            </div>
          </div>

          <!-- Hak Investor 60% -->
          <div class="glass-dark glass-sheen rounded-xl p-3 flex flex-col justify-between border-t-2 border-amber-500">
            <div class="flex items-center justify-between text-neutral-400">
              <span class="font-bold text-[10px] uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px]">pie_chart</span>
                Hak Investor (60%)
              </span>
            </div>
            <div class="mt-1.5">
              <span class="font-bold text-base sm:text-lg text-amber-300 font-tabular block truncate">
                ${formatRupiah(summary.totalHakInvestor60 || 0)}
              </span>
              <span class="text-[10px] text-rose-400 block mt-0.5">
                Sisa Bayar: ${formatRupiah(summary.totalSisaBagiHasil || 0, '')}
              </span>
            </div>
          </div>

          <!-- Hak Pengelola 40% -->
          <div class="glass-dark glass-sheen rounded-xl p-3 flex flex-col justify-between border-t-2 border-cyan-500">
            <div class="flex items-center justify-between text-neutral-400">
              <span class="font-bold text-[10px] uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px]">store</span>
                Hak Pengelola (40%)
              </span>
            </div>
            <div class="mt-1.5">
              <span class="font-bold text-base sm:text-lg text-cyan-300 font-tabular block truncate">
                ${formatRupiah(summary.totalHakPengelola40 || 0)}
              </span>
              <span class="text-[10px] text-cyan-400/90 block mt-0.5">
                Sisa Belum Ditarik: ${formatRupiah(summary.totalSisaHakPengelola || 0, '')}
              </span>
            </div>
          </div>
        </div>

        <!-- Action Buttons (Khusus Admin) -->
        ${isAdmin ? `
        <div class="grid grid-cols-2 gap-2">
          <button type="button" id="btn-tambah-investor"
            class="glass-primary glass-btn glass-sheen h-11 py-2 text-primary-btn rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98]">
            <span class="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Terima Modal Baru</span>
          </button>

          <button type="button" id="btn-bayar-payout"
            class="glass-emerald glass-btn glass-sheen h-11 py-2 text-emerald-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98]">
            <span class="material-symbols-outlined text-[18px]">payments</span>
            <span>Bayar / Cairkan Bagi Hasil</span>
          </button>
        </div>
        ` : ''}

        <!-- Aturan Skema Info Box -->
        <div class="glass-sheet rounded-xl p-3 border border-amber-500/20 flex flex-col gap-1.5">
          <div class="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
            <span class="material-symbols-outlined text-[16px]">info</span>
            <span>Ketentuan Skema Kerjasama Sesi:</span>
          </div>
          <p class="text-[11px] text-neutral-300 leading-relaxed">
            Dalam 1 sesi pembelanjaan, saat total pasang sepatu sudah <strong>laku terjual ≥ 50%</strong>, maka <strong>keuntungan bersih</strong> (setelah dipotong modal HPP & biaya operasional) dibagi: <strong>60% untuk Investor</strong> dan <strong>40% untuk Pengelola</strong>. Hak keduanya langsung dapat dicairkan dan memotong kas toko.
          </p>
        </div>

        <!-- Tab Navigasi: Sesi Bagi Hasil vs Daftar Pemodal -->
        <div class="flex items-center justify-between pt-1">
          <div class="glass-track inline-flex p-0.5 rounded-lg text-xs w-full">
            <button type="button" id="tab-btn-sesi"
              class="flex-1 py-1.5 rounded-md font-bold transition-all glass-seg-active text-primary flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-[15px]">analytics</span>
              <span>Sesi & Bagi Hasil (60:40)</span>
            </button>
            <button type="button" id="tab-btn-pemodal"
              class="flex-1 py-1.5 rounded-md font-semibold transition-all text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-[15px]">people</span>
              <span>Daftar Pemodal (${summary.countTotal || 0})</span>
            </button>
          </div>
        </div>

        <!-- Tab 1: Daftar Sesi & Bagi Hasil 60:40 -->
        <div id="tab-content-sesi" class="flex flex-col gap-3">
          ${reports.length === 0 ? `
            <div class="glass-sheet rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-2">
              <div class="w-14 h-14 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center">
                <span class="material-symbols-outlined text-3xl">handshake</span>
              </div>
              <p class="text-sm font-bold text-white mt-1">Belum Ada Sesi Investasi</p>
              <p class="text-xs text-neutral-400 max-w-[280px]">
                Tambahkan pemodal dan tautkan faktur belanja untuk mulai melacak capaian target 50% & pembagian laba bersih 60:40.
              </p>
              ${isAdmin ? `
              <button type="button" id="btn-empty-add-investor" class="mt-2 px-4 py-2 rounded-xl glass-primary font-bold text-xs text-primary-btn">
                + Tambah Pemodal Baru
              </button>
              ` : ''}
            </div>
          ` : reports.map((r) => {
            const pct = r.persentaseTerjual || 0;
            const isEligible = r.isEligible50;
            const progressColor = isEligible ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500';
            const statusBadgeClass = isEligible
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40';

            return `
              <div class="glass-card glass-sheen rounded-2xl p-3.5 flex flex-col gap-3 border ${isEligible ? 'border-emerald-500/40' : 'border-neutral-800'}">
                
                <!-- Header Sesi -->
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-9 h-9 rounded-xl ${isEligible ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'} flex items-center justify-center shrink-0">
                      <span class="material-symbols-outlined text-[20px]">${isEligible ? 'verified' : 'hourglass_top'}</span>
                    </div>
                    <div class="flex flex-col min-w-0">
                      <h4 class="font-bold text-sm text-white truncate">${r.investorName}</h4>
                      <span class="text-[10px] text-neutral-400 truncate">
                        Modal: <strong class="text-white">${formatRupiah(r.totalModal)}</strong> • Masuk: ${formatDate(r.date)}
                      </span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${statusBadgeClass}">
                    ${isEligible ? 'SIAP BAGI HASIL' : 'PROGRESS SESI'}
                  </span>
                </div>

                <!-- Info Faktur Sesi -->
                <div class="glass-panel rounded-lg p-2 text-[11px] text-neutral-300 flex items-center justify-between">
                  <span class="text-neutral-400 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">receipt_long</span>
                    Faktur Sesi:
                  </span>
                  <span class="font-mono font-bold text-white truncate max-w-[200px]">
                    ${r.sessionInvoices.length > 0 ? r.sessionInvoices.join(', ') : 'Semua Pembelanjaan'}
                  </span>
                </div>

                <!-- Progress Target 50% Penjualan -->
                <div class="flex flex-col gap-1.5 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-neutral-400 flex items-center gap-1 font-semibold text-[11px]">
                      <span class="material-symbols-outlined text-[14px] ${isEligible ? 'text-emerald-400' : 'text-amber-400'}">flag</span>
                      Progres Penjualan (Target ≥ 50%)
                    </span>
                    <span class="font-extrabold ${isEligible ? 'text-emerald-400' : 'text-amber-400'} font-tabular text-[12px]">
                      ${pct}% Terjual
                    </span>
                  </div>

                  <!-- Bar -->
                  <div class="w-full h-3 bg-neutral-800 rounded-full overflow-hidden relative">
                    <!-- Marker 50% -->
                    <div class="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/40 z-10" title="Target 50%"></div>
                    <div class="h-full rounded-full transition-all duration-500 ${progressColor}" style="width: ${Math.min(100, pct)}%"></div>
                  </div>

                  <div class="flex items-center justify-between text-[10px] text-neutral-400 mt-0.5">
                    <span>Terjual: <strong class="text-white">${r.totalTerjualPasang}</strong> psg</span>
                    <span class="text-amber-400 font-bold">Target: 50%</span>
                    <span>Total Beli: <strong class="text-white">${r.totalBeliPasang}</strong> psg</span>
                  </div>
                </div>

                <!-- Rincian Keuangan Sesi & Laba Bersih -->
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div class="bg-neutral-900/40 p-2 rounded-lg flex flex-col justify-between border border-neutral-800">
                    <span class="text-[10px] text-neutral-400">Omzet Penjualan Sesi</span>
                    <span class="font-bold text-emerald-400 font-tabular text-xs mt-0.5">+${formatRupiah(r.omzetPenjualan)}</span>
                  </div>
                  <div class="bg-neutral-900/40 p-2 rounded-lg flex flex-col justify-between border border-neutral-800">
                    <span class="text-[10px] text-neutral-400">HPP Barang Terjual</span>
                    <span class="font-bold text-rose-400 font-tabular text-xs mt-0.5">-${formatRupiah(r.hppTerjual)}</span>
                  </div>
                  <div class="bg-neutral-900/40 p-2 rounded-lg flex flex-col justify-between border border-neutral-800">
                    <span class="text-[10px] text-neutral-400">Biaya Ops & Lain-lain</span>
                    <span class="font-bold text-neutral-300 font-tabular text-xs mt-0.5">-${formatRupiah(r.biayaOpsSesi)}</span>
                  </div>
                  <div class="bg-emerald-950/40 p-2 rounded-lg flex flex-col justify-between border border-emerald-500/30">
                    <span class="text-[10px] text-emerald-400 font-bold">KEUNTUNGAN BERSIH</span>
                    <span class="font-extrabold text-emerald-300 font-tabular text-xs mt-0.5">${formatRupiah(r.labaBersih)}</span>
                  </div>
                </div>

                <!-- Skema Pembagian Laba 60% : 40% -->
                <div class="glass-sheet rounded-xl p-2.5 flex flex-col gap-2.5 border border-white/10">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Pembagian Hasil (60 : 40)</span>
                  
                  <div class="grid grid-cols-2 gap-2">
                    <!-- Kolom Hak Investor 60% -->
                    <div class="bg-amber-950/30 border border-amber-500/30 p-2 rounded-lg flex flex-col justify-between">
                      <div>
                        <span class="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                          <span class="material-symbols-outlined text-[13px]">person</span> Hak Investor (60%)
                        </span>
                        <span class="text-sm font-extrabold text-amber-300 font-tabular mt-0.5 block">
                          ${isEligible ? formatRupiah(r.hakInvestor60) : 'Rp 0'}
                        </span>
                        ${!isEligible ? '<span class="text-[9px] text-amber-400/80 mt-0.5 block">Menunggu 50%</span>' : ''}
                      </div>
                      
                      <div class="pt-1.5 mt-1 border-t border-amber-500/20 text-[10px] flex flex-col gap-0.5">
                        <span class="text-neutral-400">Dibayar: <strong class="text-emerald-400 font-tabular">${formatRupiah(r.bagiHasilDibayar)}</strong></span>
                        <span class="text-neutral-400">Sisa Hak: <strong class="${r.sisaBagiHasil > 0 ? 'text-rose-400' : 'text-neutral-300'} font-tabular">${formatRupiah(r.sisaBagiHasil)}</strong></span>
                      </div>
                    </div>

                    <!-- Kolom Hak Pengelola 40% -->
                    <div class="bg-blue-950/30 border border-blue-500/30 p-2 rounded-lg flex flex-col justify-between">
                      <div>
                        <span class="text-[10px] text-blue-300 font-bold flex items-center gap-1">
                          <span class="material-symbols-outlined text-[13px]">store</span> Hak Pengelola (40%)
                        </span>
                        <span class="text-sm font-extrabold text-blue-300 font-tabular mt-0.5 block">
                          ${isEligible ? formatRupiah(r.hakPengelola40) : 'Rp 0'}
                        </span>
                        ${!isEligible ? '<span class="text-[9px] text-blue-400/80 mt-0.5 block">Menunggu 50%</span>' : ''}
                      </div>

                      <div class="pt-1.5 mt-1 border-t border-blue-500/20 text-[10px] flex flex-col gap-0.5">
                        <span class="text-neutral-400">Ditarik: <strong class="text-cyan-300 font-tabular">${formatRupiah(r.pengelolaDibayar)}</strong></span>
                        <span class="text-neutral-400">Sisa: <strong class="${r.sisaHakPengelola > 0 ? 'text-amber-400' : 'text-neutral-300'} font-tabular">${formatRupiah(r.sisaHakPengelola)}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Tombol Aksi & Salin Laporan -->
                <div class="flex items-center gap-1.5 pt-1">
                  <button type="button" data-copy-wa="${r.investorId}"
                    class="glass-chip-btn flex-1 h-9 rounded-xl text-emerald-400 font-bold text-xs flex items-center justify-center gap-1 active:scale-95" title="Salin laporan format WhatsApp">
                    <span class="material-symbols-outlined text-[16px]">share</span>
                    <span class="truncate">Salin WA</span>
                  </button>

                  ${isAdmin && isEligible && r.sisaBagiHasil > 0 ? `
                  <button type="button" data-quick-pay-investor="${r.investorId}" data-suggest-amount="${r.sisaBagiHasil}"
                    class="glass-amber glass-btn flex-1 h-9 rounded-xl text-amber-950 font-bold text-xs flex items-center justify-center gap-1 active:scale-95" title="Bayar bagi hasil ke investor">
                    <span class="material-symbols-outlined text-[15px]">person</span>
                    <span class="truncate">Bayar 60%</span>
                  </button>
                  ` : ''}

                  ${isAdmin && isEligible && r.sisaHakPengelola > 0 ? `
                  <button type="button" data-quick-pay-pengelola="${r.investorId}" data-suggest-amount="${r.sisaHakPengelola}"
                    class="glass-blue glass-btn flex-1 h-9 rounded-xl text-blue-950 font-bold text-xs flex items-center justify-center gap-1 active:scale-95" title="Cairkan hak bagi hasil pengelola">
                    <span class="material-symbols-outlined text-[15px]">store</span>
                    <span class="truncate">Cairkan 40%</span>
                  </button>
                  ` : ''}

                  <button type="button" data-toggle-payouts="${r.investorId}"
                    class="p-2 rounded-xl glass-chip-btn text-neutral-400 hover:text-white shrink-0" title="Riwayat Pembayaran">
                    <span class="material-symbols-outlined text-[18px]">history</span>
                  </button>
                </div>

                <!-- Riwayat Pembayaran Collapsible -->
                <div id="payouts-container-${r.investorId}" class="hidden flex flex-col gap-2 pt-2 border-t border-neutral-800">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Riwayat Pembayaran Kas Keluar (Investor & Pengelola)</span>
                  ${r.payouts.length === 0 ? `
                    <span class="text-xs text-neutral-500 italic py-1">Belum ada pembayaran dicatat.</span>
                  ` : `
                    <div class="flex flex-col gap-1.5">
                      ${r.payouts.map((p) => {
                        const isPengelola = p.recipient === 'pengelola';
                        const isPokok = p.type === 'pokok';
                        let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                        let label = 'BAGI HASIL INVESTOR (60%)';
                        if (isPengelola) {
                          badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                          label = 'BAGI HASIL PENGELOLA (40%)';
                        } else if (isPokok) {
                          badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                          label = 'PENGEMBALIAN POKOK MODAL';
                        }

                        return `
                          <div class="glass-sheet rounded-lg p-2.5 flex items-center justify-between text-xs border border-white/5">
                            <div class="flex flex-col min-w-0 pr-2">
                              <div class="flex items-center gap-1.5">
                                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold border ${badgeColor}">
                                  ${label}
                                </span>
                              </div>
                              <span class="text-[10px] text-neutral-400 mt-1">${formatDate(p.date)} • ${p.paymentMethod}</span>
                              ${p.notes ? `<span class="text-[10px] text-neutral-400 italic mt-0.5 truncate">"${p.notes}"</span>` : ''}
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                              <span class="font-bold text-sm ${isPengelola ? 'text-blue-300' : 'text-emerald-400'} font-tabular">
                                -${formatRupiah(p.amount)}
                              </span>
                              ${isAdmin ? `
                              <button type="button" data-delete-payout="${p.id}" data-investor-id="${r.investorId}"
                                class="text-neutral-500 hover:text-rose-400 p-1 rounded" title="Hapus Pembayaran">
                                <span class="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                              ` : ''}
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Tab 2: Daftar Pemodal & Mutasi Modal -->
        <div id="tab-content-pemodal" class="hidden flex flex-col gap-3">
          ${reports.length === 0 ? `
            <div class="glass-sheet rounded-2xl p-6 text-center text-xs text-neutral-400">
              Belum ada data pemodal. Klik tombol "+ Terima Modal Baru" untuk menambahkan pemodal.
            </div>
          ` : reports.map((inv) => `
            <div class="glass-sheet rounded-2xl p-3.5 flex flex-col gap-2.5 border border-white/10">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="font-bold text-sm text-white">${inv.investorName}</h4>
                  <span class="text-[10px] text-neutral-400">Terdaftar sejak: ${formatDate(inv.date)}</span>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  ${inv.status.toUpperCase()}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                <div>
                  <span class="text-[10px] text-neutral-400 block">Total Modal Disetor</span>
                  <span class="font-bold text-white font-tabular">${formatRupiah(inv.totalModal)}</span>
                </div>
                <div>
                  <span class="text-[10px] text-neutral-400 block">Sisa Pokok Belum Kembali</span>
                  <span class="font-bold text-blue-300 font-tabular">${formatRupiah(inv.sisaPokok)}</span>
                </div>
              </div>

              ${inv.notes ? `
              <div class="text-[11px] text-neutral-400 bg-black/30 p-2 rounded-lg">
                <strong class="text-neutral-300">Catatan / Rekening:</strong> ${inv.notes}
              </div>
              ` : ''}

              ${isAdmin ? `
              <div class="flex items-center justify-end gap-2 pt-1 border-t border-neutral-800">
                <button type="button" data-edit-investor="${inv.investorId}"
                  class="glass-chip-btn px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1 active:scale-95">
                  <span class="material-symbols-outlined text-[14px]">edit</span> Edit
                </button>
                <button type="button" data-delete-investor="${inv.investorId}"
                  class="glass-rose glass-btn px-3 py-1.5 rounded-lg text-xs font-bold text-rose-300 flex items-center gap-1 active:scale-95">
                  <span class="material-symbols-outlined text-[14px]">delete</span> Hapus
                </button>
              </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

      </div>

      <!-- Modal Tambah / Edit Pemodal -->
      <div id="investor-modal" class="hidden fixed inset-0 z-50 flex items-end justify-center overflow-hidden">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-xs" id="investor-modal-backdrop"></div>
        <div class="relative w-full max-w-[430px] glass-sheet rounded-t-3xl p-4 pb-8 flex flex-col gap-3.5 max-h-[92%] overflow-y-auto z-10 border-t border-white/20">
          
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              </div>
              <div>
                <h3 class="font-bold text-sm text-white" id="investor-modal-title">Terima Modal Pemodal Baru</h3>
                <p class="text-[11px] text-neutral-400">Otomatis menambah saldo Kas Masuk toko</p>
              </div>
            </div>
            <button id="btn-close-investor-modal" class="p-1.5 rounded-full glass-chip-btn text-neutral-400 hover:text-white">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <input type="hidden" id="investor-edit-id" value="" />

          <div class="flex flex-col gap-3 text-xs">
            <!-- Nama Pemodal -->
            <div class="flex flex-col gap-1">
              <label class="font-bold text-white flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">person</span> Nama Pemodal / Investor
              </label>
              <input type="text" id="inv-name" placeholder="Nama investor..."
                class="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            <!-- Tanggal & Jumlah Modal -->
            <div class="grid grid-cols-2 gap-2">
              <div class="flex flex-col gap-1">
                <label class="font-bold text-white flex items-center gap-1">
                  <span class="material-symbols-outlined text-primary text-[14px]">calendar_today</span> Tanggal Setor
                </label>
                <input type="date" id="inv-date"
                  class="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-bold text-white flex items-center gap-1">
                  <span class="material-symbols-outlined text-emerald-400 text-[14px]">payments</span> Jumlah Modal (Rp)
                </label>
                <input type="number" id="inv-amount" placeholder="0" min="0"
                  class="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>

            <!-- Metode Penerimaan -->
            <div class="flex flex-col gap-1">
              <label class="font-bold text-white flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">account_balance</span> Masuk ke Rekening / Laci Toko
              </label>
              <select id="inv-payment"
                class="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="Transfer Bank BCA">Transfer Bank BCA (Kas Bank)</option>
                <option value="Transfer Bank Mandiri">Transfer Bank Mandiri (Kas Bank)</option>
                <option value="Transfer Bank BRI">Transfer Bank BRI (Kas Bank)</option>
                <option value="Tunai (Laci)">Tunai / Cash (Kas Laci Toko)</option>
                <option value="QRIS / E-Wallet">QRIS / E-Wallet</option>
              </select>
            </div>

            <!-- Tautkan Faktur Belanja Sesi -->
            <div class="flex flex-col gap-1">
              <label class="font-bold text-white flex items-center gap-1">
                <span class="material-symbols-outlined text-amber-400 text-[14px]">inventory_2</span> Tautkan Faktur Belanja Sesi Ini
              </label>
              <p class="text-[10px] text-neutral-400">Pilih faktur belanja yang dibiayai oleh modal pemodal ini:</p>
              <div id="inv-supplies-checklist" class="max-h-32 overflow-y-auto glass-panel p-2 rounded-xl flex flex-col gap-1.5 border border-neutral-800">
                ${supplies.length === 0 ? `
                  <span class="text-[11px] text-neutral-500 italic">Belum ada faktur belanja sepatu tercatat.</span>
                ` : supplies.map((s) => `
                  <label class="flex items-center gap-2 cursor-pointer hover:bg-neutral-800/40 p-1 rounded">
                    <input type="checkbox" name="inv-supply-item" value="${s.invoiceNo || s.id}" class="rounded text-primary focus:ring-0" />
                    <span class="text-[11px] text-neutral-200 font-mono">${s.invoiceNo || s.id}</span>
                    <span class="text-[10px] text-neutral-400 truncate">(${s.supplierName || 'Suplier'}, ${formatRupiah(s.totalAmount)})</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Catatan Perjanjian / No Rekening -->
            <div class="flex flex-col gap-1">
              <label class="font-bold text-white flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">description</span> Rekening Pengembalian / Catatan
              </label>
              <textarea id="inv-notes" rows="2" placeholder="Nomor rekening bank investor untuk transfer bagi hasil..."
                class="w-full px-3.5 py-2 rounded-xl glass-input text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"></textarea>
            </div>

            <!-- Notice Box -->
            <div class="glass-blue rounded-xl p-2.5 flex items-start gap-2 border border-blue-500/20">
              <span class="material-symbols-outlined text-blue-400 text-[16px] shrink-0 mt-0.5">info</span>
              <p class="text-[10.5px] text-blue-200">
                Uang yang disetor pemodal akan <strong>otomatis menambah Saldo Kas Toko</strong> (tercatat sebagai Kas Masuk kategori <em>"Dana Investor"</em>).
              </p>
            </div>

            <button type="button" id="btn-save-investor"
              class="w-full h-11 glass-primary glass-btn glass-sheen text-primary-btn rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 mt-1 active:scale-98">
              <span class="material-symbols-outlined text-[18px]">save</span>
              <span id="btn-save-investor-label">Simpan & Tambah ke Kas</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Bayar Bagi Hasil / Pokok (- Kas Keluar) -->
      <div id="payout-modal" class="hidden fixed inset-0 z-50 flex items-end justify-center overflow-hidden">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-xs" id="payout-modal-backdrop"></div>
        <div class="relative w-full max-w-[430px] glass-sheet rounded-t-3xl p-4 pb-8 flex flex-col gap-3.5 max-h-[92%] overflow-y-auto z-10 border-t border-emerald-500/30">
          
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">payments</span>
              </div>
              <div>
                <h3 class="font-bold text-sm text-white" id="payout-modal-title">Bayar / Cairkan Bagi Hasil</h3>
                <p class="text-[11px] text-rose-300">Otomatis memotong Saldo Kas Keluar toko</p>
              </div>
            </div>
            <button id="btn-close-payout-modal" class="p-1.5 rounded-full glass-chip-btn text-neutral-400 hover:text-white">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div class="flex flex-col gap-3 text-xs">
            <!-- Pilih Sesi / Investor -->
            <div class="flex flex-col gap-1">
              <label class="font-bold text-white flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">person</span> Pilih Sesi / Pemodal
              </label>
              <select id="payout-investor-id"
                class="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary">
                ${reports.map((r) => `
                  <option value="${r.investorId}">
                    ${r.investorName} (Sisa Investor: ${formatRupiah(r.sisaBagiHasil)} • Sisa Pengelola: ${formatRupiah(r.sisaHakPengelola)})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Pilih Penerima Bagi Hasil -->
            <div class="flex flex-col gap-1">
              <label class="font-bold text-white flex items-center gap-1">
                <span class="material-symbols-outlined text-amber-400 text-[14px]">group</span> Penerima Pembayaran
              </label>
              <div class="grid grid-cols-3 gap-1.5" id="payout-recipient-group">
                <label class="flex flex-col items-center justify-center p-2 rounded-xl glass-panel border border-neutral-700 cursor-pointer text-center recipient-opt">
                  <input type="radio" name="payout-recipient" value="investor" checked class="text-amber-500 focus:ring-0 mb-1" />
                  <span class="font-bold text-amber-300 text-[11px] leading-tight">Investor (60%)</span>
                </label>
                <label class="flex flex-col items-center justify-center p-2 rounded-xl glass-panel border border-neutral-700 cursor-pointer text-center recipient-opt">
                  <input type="radio" name="payout-recipient" value="pengelola" class="text-blue-500 focus:ring-0 mb-1" />
                  <span class="font-bold text-blue-300 text-[11px] leading-tight">Pengelola (40%)</span>
                </label>
                <label class="flex flex-col items-center justify-center p-2 rounded-xl glass-panel border border-neutral-700 cursor-pointer text-center recipient-opt">
                  <input type="radio" name="payout-recipient" value="serentak" class="text-emerald-500 focus:ring-0 mb-1" />
                  <span class="font-bold text-emerald-300 text-[11px] leading-tight">Serentak (Keduanya)</span>
                </label>
              </div>
            </div>

            <!-- Jenis Pembayaran (Khusus jika pilih Investor) -->
            <div class="flex flex-col gap-1" id="payout-type-container">
              <label class="font-bold text-white flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">category</span> Jenis Dana
              </label>
              <div class="grid grid-cols-2 gap-2">
                <label class="flex items-center gap-2 p-2 rounded-xl glass-panel border border-neutral-700 cursor-pointer">
                  <input type="radio" name="payout-type" value="bagi_hasil" checked class="text-emerald-500 focus:ring-0" />
                  <span class="font-bold text-emerald-300 text-xs">Bagi Hasil Keuntungan</span>
                </label>
                <label class="flex items-center gap-2 p-2 rounded-xl glass-panel border border-neutral-700 cursor-pointer">
                  <input type="radio" name="payout-type" value="pokok" class="text-purple-400 focus:ring-0" />
                  <span class="font-bold text-purple-300 text-xs">Kembali Pokok Modal</span>
                </label>
              </div>
            </div>

            <!-- Tanggal Bayar -->
            <div class="flex flex-col gap-1">
              <label class="font-bold text-white flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">calendar_today</span> Tanggal Pembayaran
              </label>
              <input type="date" id="payout-date"
                class="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            <!-- Input Nominal Biasa (Single Recipient) -->
            <div class="flex flex-col gap-1" id="single-amount-container">
              <div class="flex items-center justify-between">
                <label class="font-bold text-white flex items-center gap-1">
                  <span class="material-symbols-outlined text-emerald-400 text-[14px]">payments</span> Nominal Pembayaran (Rp)
                </label>
                <button type="button" id="btn-fill-suggest-amount" class="text-[10px] text-primary hover:underline font-bold">
                  Isi Sisa Hak
                </button>
              </div>
              <input type="number" id="payout-amount" placeholder="0" min="0"
                class="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            <!-- Input Nominal Serentak (Dual Recipient) -->
            <div class="hidden flex flex-col gap-2 p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800" id="dual-amount-container">
              <div class="grid grid-cols-2 gap-2">
                <div class="flex flex-col gap-1">
                  <label class="font-bold text-amber-300 text-[11px]">Bagi Hasil Investor (60%)</label>
                  <input type="number" id="payout-amount-investor" placeholder="0" min="0"
                    class="w-full px-2.5 py-2 rounded-lg glass-input text-xs text-white font-mono font-bold" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-bold text-blue-300 text-[11px]">Bagi Hasil Pengelola (40%)</label>
                  <input type="number" id="payout-amount-pengelola" placeholder="0" min="0"
                    class="w-full px-2.5 py-2 rounded-lg glass-input text-xs text-white font-mono font-bold" />
                </div>
              </div>
              <div class="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-800 text-neutral-300 font-bold">
                <span>Total Kas Keluar:</span>
                <span id="payout-total-dual-label" class="text-rose-400 font-mono">Rp 0</span>
              </div>
            </div>

            <!-- Sumber Pembayaran Kas Toko -->
            <div class="flex flex-col gap-1">
              <label class="font-bold text-white flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">account_balance</span> Sumber Pembayaran Kas Toko
              </label>
              <select id="payout-payment-method"
                class="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="Transfer Bank BCA">Transfer Bank BCA (Potong Kas Bank)</option>
                <option value="Transfer Bank Mandiri">Transfer Bank Mandiri (Potong Kas Bank)</option>
                <option value="Transfer Bank BRI">Transfer Bank BRI (Potong Kas Bank)</option>
                <option value="Tunai (Laci)">Tunai / Cash (Potong Kas Laci)</option>
              </select>
            </div>

            <!-- Catatan -->
            <div class="flex flex-col gap-1">
              <label class="font-bold text-white flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">description</span> Keterangan Transfer
              </label>
              <input type="text" id="payout-notes" placeholder="No referensi transfer / catatan..."
                class="w-full px-3.5 py-2 rounded-xl glass-input text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            <!-- Warning Saldo Berkurang -->
            <div class="glass-rose rounded-xl p-2.5 flex items-start gap-2 border border-rose-500/30">
              <span class="material-symbols-outlined text-rose-400 text-[16px] shrink-0 mt-0.5">warning</span>
              <p class="text-[10.5px] text-rose-200">
                Peringatan: Transaksi ini <strong>otomatis dicatat sebagai KAS KELUAR</strong> di buku kas utama toko, sehingga saldo kas toko langsung berkurang.
              </p>
            </div>

            <button type="button" id="btn-submit-payout"
              class="w-full h-11 glass-emerald glass-btn glass-sheen text-emerald-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 mt-1 active:scale-98">
              <span class="material-symbols-outlined text-[18px]">check_circle</span>
              <span>Konfirmasi & Potong Saldo Kas</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Konfirmasi Hapus Pemodal -->
      <div id="investor-delete-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-6 overflow-hidden">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-xs" id="investor-delete-backdrop"></div>
        <div class="relative w-full max-w-[360px] glass-sheet rounded-2xl p-5 flex flex-col gap-3 z-10 border border-rose-500/40">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[22px]">delete_forever</span>
            </div>
            <div>
              <h3 class="font-bold text-sm text-white">Hapus Data Pemodal?</h3>
              <p class="text-[11px] text-neutral-400">Seluruh riwayat sesi & mutasi terkait.</p>
            </div>
          </div>
          <p class="text-xs text-neutral-300 glass-panel rounded-xl p-3 border border-neutral-800">
            Transaksi kas masuk & keluar terkait pemodal ini <strong>akan otomatis ikut dibersihkan</strong> agar buku kas toko tetap seimbang.
          </p>
          <div class="flex items-center gap-2.5 mt-1">
            <button id="btn-cancel-delete-investor" class="glass-chip-btn flex-1 h-10 rounded-xl text-white text-xs font-bold">Batal</button>
            <button id="btn-confirm-delete-investor" class="glass-rose glass-btn flex-1 h-10 rounded-xl text-rose-200 text-xs font-bold">Ya, Hapus</button>
          </div>
        </div>
      </div>

    </div>
  `;
}

export function initInvestorPage(router, store, isAdmin = true) {
  bindHeaderEvents(router);
  let deletingId = null;
  let isEditMode = false;

  function g(id) {
    return document.getElementById(id);
  }

  // Set default dates
  const todayStr = new Date().toISOString().split('T')[0];
  if (g('inv-date')) g('inv-date').value = todayStr;
  if (g('payout-date')) g('payout-date').value = todayStr;

  // Tab switching
  const tabBtnSesi = g('tab-btn-sesi');
  const tabBtnPemodal = g('tab-btn-pemodal');
  const tabContentSesi = g('tab-content-sesi');
  const tabContentPemodal = g('tab-content-pemodal');

  if (tabBtnSesi && tabBtnPemodal) {
    tabBtnSesi.addEventListener('click', () => {
      tabBtnSesi.className = 'flex-1 py-1.5 rounded-md font-bold transition-all glass-seg-active text-primary flex items-center justify-center gap-1';
      tabBtnPemodal.className = 'flex-1 py-1.5 rounded-md font-semibold transition-all text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1';
      if (tabContentSesi) tabContentSesi.classList.remove('hidden');
      if (tabContentPemodal) tabContentPemodal.classList.add('hidden');
    });

    tabBtnPemodal.addEventListener('click', () => {
      tabBtnPemodal.className = 'flex-1 py-1.5 rounded-md font-bold transition-all glass-seg-active text-primary flex items-center justify-center gap-1';
      tabBtnSesi.className = 'flex-1 py-1.5 rounded-md font-semibold transition-all text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1';
      if (tabContentPemodal) tabContentPemodal.classList.remove('hidden');
      if (tabContentSesi) tabContentSesi.classList.add('hidden');
    });
  }

  // Open Modal Tambah Pemodal
  function openAddModal() {
    isEditMode = false;
    g('investor-modal-title').textContent = 'Terima Modal Pemodal Baru';
    g('btn-save-investor-label').textContent = 'Simpan & Tambah ke Kas';
    g('investor-edit-id').value = '';
    g('inv-name').value = '';
    g('inv-date').value = todayStr;
    g('inv-amount').value = '';
    g('inv-notes').value = '';
    document.querySelectorAll('input[name="inv-supply-item"]').forEach((cb) => { cb.checked = false; });

    g('investor-modal').classList.remove('hidden');
  }

  // Open Modal Edit Pemodal
  function openEditModal(id) {
    const inv = store.getInvestorById(id);
    if (!inv) return;

    isEditMode = true;
    g('investor-modal-title').textContent = 'Edit Data Pemodal';
    g('btn-save-investor-label').textContent = 'Simpan Perubahan';
    g('investor-edit-id').value = id;
    g('inv-name').value = inv.investorName || '';
    g('inv-date').value = inv.date || todayStr;
    g('inv-amount').value = inv.totalAmount || 0;
    g('inv-payment').value = inv.paymentMethod || 'Transfer Bank BCA';
    g('inv-notes').value = inv.notes || '';

    const selectedInvoices = Array.isArray(inv.sessionInvoices) ? inv.sessionInvoices : [];
    document.querySelectorAll('input[name="inv-supply-item"]').forEach((cb) => {
      cb.checked = selectedInvoices.includes(cb.value);
    });

    g('investor-modal').classList.remove('hidden');
  }

  // Payout Modal Dynamic Mode (Investor / Pengelola / Serentak)
  function updatePayoutFormUI() {
    const rec = document.querySelector('input[name="payout-recipient"]:checked')?.value || 'investor';
    const singleContainer = g('single-amount-container');
    const dualContainer = g('dual-amount-container');
    const typeContainer = g('payout-type-container');

    if (rec === 'serentak') {
      if (singleContainer) singleContainer.classList.add('hidden');
      if (dualContainer) dualContainer.classList.remove('hidden');
      if (typeContainer) typeContainer.classList.add('hidden');
    } else {
      if (singleContainer) singleContainer.classList.remove('hidden');
      if (dualContainer) dualContainer.classList.add('hidden');
      if (typeContainer) {
        if (rec === 'investor') typeContainer.classList.remove('hidden');
        else typeContainer.classList.add('hidden');
      }
    }
  }

  document.querySelectorAll('input[name="payout-recipient"]').forEach((r) => {
    r.addEventListener('change', updatePayoutFormUI);
  });

  // Calculate Dual Payout Total
  function updateDualTotal() {
    const invAmt = Number(g('payout-amount-investor')?.value) || 0;
    const mgrAmt = Number(g('payout-amount-pengelola')?.value) || 0;
    const totalEl = g('payout-total-dual-label');
    if (totalEl) totalEl.textContent = formatRupiah(invAmt + mgrAmt);
  }
  g('payout-amount-investor')?.addEventListener('input', updateDualTotal);
  g('payout-amount-pengelola')?.addEventListener('input', updateDualTotal);

  // Fill Suggest Amount Button
  g('btn-fill-suggest-amount')?.addEventListener('click', () => {
    const invId = g('payout-investor-id')?.value;
    const rec = document.querySelector('input[name="payout-recipient"]:checked')?.value || 'investor';
    if (!invId) return;

    const reports = store.getInvestmentSessionReport(invId);
    if (reports && reports.length > 0) {
      const r = reports[0];
      if (rec === 'investor') {
        const type = document.querySelector('input[name="payout-type"]:checked')?.value || 'bagi_hasil';
        g('payout-amount').value = type === 'pokok' ? r.sisaPokok : r.sisaBagiHasil;
      } else if (rec === 'pengelola') {
        g('payout-amount').value = r.sisaHakPengelola;
      }
    }
  });

  // Open Modal Payout
  function openPayoutModal(targetInvestorId = null, targetRecipient = 'investor', suggestAmount = null) {
    const select = g('payout-investor-id');
    if (targetInvestorId && select) {
      select.value = targetInvestorId;
    }

    const recRadio = document.querySelector(`input[name="payout-recipient"][value="${targetRecipient}"]`);
    if (recRadio) recRadio.checked = true;

    if (suggestAmount && g('payout-amount')) {
      g('payout-amount').value = suggestAmount;
    }

    // Auto-fill dual if serentak
    if (targetInvestorId) {
      const reports = store.getInvestmentSessionReport(targetInvestorId);
      if (reports && reports.length > 0) {
        const r = reports[0];
        if (g('payout-amount-investor')) g('payout-amount-investor').value = r.sisaBagiHasil;
        if (g('payout-amount-pengelola')) g('payout-amount-pengelola').value = r.sisaHakPengelola;
        updateDualTotal();
      }
    }

    updatePayoutFormUI();
    g('payout-date').value = todayStr;
    g('payout-notes').value = '';
    g('payout-modal').classList.remove('hidden');
  }

  // Bind Buttons
  if (g('btn-tambah-investor')) {
    g('btn-tambah-investor').addEventListener('click', openAddModal);
  }
  if (g('btn-empty-add-investor')) {
    g('btn-empty-add-investor').addEventListener('click', openAddModal);
  }
  if (g('btn-bayar-payout')) {
    g('btn-bayar-payout').addEventListener('click', () => openPayoutModal());
  }

  // Modal Closers
  if (g('btn-close-investor-modal')) {
    g('btn-close-investor-modal').addEventListener('click', () => g('investor-modal').classList.add('hidden'));
  }
  if (g('investor-modal-backdrop')) {
    g('investor-modal-backdrop').addEventListener('click', () => g('investor-modal').classList.add('hidden'));
  }
  if (g('btn-close-payout-modal')) {
    g('btn-close-payout-modal').addEventListener('click', () => g('payout-modal').classList.add('hidden'));
  }
  if (g('payout-modal-backdrop')) {
    g('payout-modal-backdrop').addEventListener('click', () => g('payout-modal').classList.add('hidden'));
  }
  if (g('btn-cancel-delete-investor')) {
    g('btn-cancel-delete-investor').addEventListener('click', () => g('investor-delete-modal').classList.add('hidden'));
  }
  if (g('investor-delete-backdrop')) {
    g('investor-delete-backdrop').addEventListener('click', () => g('investor-delete-modal').classList.add('hidden'));
  }

  // Simpan Modal Pemodal (Tambah / Edit)
  if (g('btn-save-investor')) {
    g('btn-save-investor').addEventListener('click', () => {
      const name = (g('inv-name').value || '').trim();
      const amount = Number(g('inv-amount').value) || 0;
      const date = g('inv-date').value || todayStr;
      const paymentMethod = g('inv-payment').value || 'Transfer Bank BCA';
      const notes = (g('inv-notes').value || '').trim();

      if (!name) {
        showToast('Nama pemodal wajib diisi!', 'error');
        g('inv-name').focus();
        return;
      }
      if (amount <= 0) {
        showToast('Jumlah modal harus lebih dari Rp 0!', 'error');
        g('inv-amount').focus();
        return;
      }

      // Kumpulkan faktur yang dipilih
      const sessionInvoices = [];
      document.querySelectorAll('input[name="inv-supply-item"]:checked').forEach((cb) => {
        sessionInvoices.push(cb.value);
      });

      const editId = g('investor-edit-id').value;
      if (isEditMode && editId) {
        store.updateInvestor(editId, {
          investorName: name,
          totalAmount: amount,
          date,
          paymentMethod,
          notes,
          sessionInvoices
        });
        showToast('Data pemodal berhasil diperbarui!', 'success');
      } else {
        store.addInvestor({
          investorName: name,
          totalAmount: amount,
          date,
          paymentMethod,
          notes,
          sessionInvoices
        });
        showToast('Modal pemodal berhasil ditambahkan & saldo kas bertambah!', 'success');
      }

      g('investor-modal').classList.add('hidden');
      router.render();
    });
  }

  // Submit Payout (Bagi Hasil Investor / Pengelola / Serentak)
  if (g('btn-submit-payout')) {
    g('btn-submit-payout').addEventListener('click', () => {
      const investorId = g('payout-investor-id').value;
      const date = g('payout-date').value || todayStr;
      const paymentMethod = g('payout-payment-method').value || 'Transfer Bank BCA';
      const notes = (g('payout-notes').value || '').trim();

      const rec = document.querySelector('input[name="payout-recipient"]:checked')?.value || 'investor';

      if (!investorId) {
        showToast('Pilih investor terlebih dahulu!', 'error');
        return;
      }

      if (rec === 'serentak') {
        const invAmt = Number(g('payout-amount-investor')?.value) || 0;
        const mgrAmt = Number(g('payout-amount-pengelola')?.value) || 0;

        if (invAmt <= 0 && mgrAmt <= 0) {
          showToast('Isi minimal salah satu nominal bagi hasil!', 'error');
          return;
        }

        if (invAmt > 0) {
          store.addInvestorPayout(investorId, {
            amount: invAmt,
            type: 'bagi_hasil',
            recipient: 'investor',
            date,
            paymentMethod,
            notes: notes ? `${notes} (Bagian Investor)` : 'Bagi Hasil 60%'
          });
        }
        if (mgrAmt > 0) {
          store.addInvestorPayout(investorId, {
            amount: mgrAmt,
            type: 'bagi_hasil',
            recipient: 'pengelola',
            date,
            paymentMethod,
            notes: notes ? `${notes} (Bagian Pengelola)` : 'Bagi Hasil 40%'
          });
        }

        showToast(`Bagi hasil serentak berhasil dicatat! Saldo kas toko telah dipotong.`, 'success', 3500);
      } else {
        const amount = Number(g('payout-amount').value) || 0;
        const typeRadio = document.querySelector('input[name="payout-type"]:checked');
        const type = rec === 'pengelola' ? 'bagi_hasil' : (typeRadio ? typeRadio.value : 'bagi_hasil');

        if (amount <= 0) {
          showToast('Nominal pembayaran harus lebih dari Rp 0!', 'error');
          g('payout-amount').focus();
          return;
        }

        store.addInvestorPayout(investorId, {
          amount,
          type,
          recipient: rec,
          date,
          paymentMethod,
          notes
        });

        const labelRecipient = rec === 'pengelola' ? 'Hak Pengelola' : (type === 'pokok' ? 'Pokok Investor' : 'Bagi Hasil Investor');
        showToast(`Pembayaran ${labelRecipient} berhasil! Saldo kas toko telah dipotong.`, 'success', 3500);
      }

      g('payout-modal').classList.add('hidden');
      router.render();
    });
  }

  // Delegasi Event untuk Tombol di List: Edit, Delete, Toggle Payouts, Salin WA
  document.addEventListener('click', (e) => {
    // Quick Pay Investor
    const quickPayInvBtn = e.target.closest('[data-quick-pay-investor]');
    if (quickPayInvBtn) {
      const invId = quickPayInvBtn.getAttribute('data-quick-pay-investor');
      const suggest = quickPayInvBtn.getAttribute('data-suggest-amount');
      openPayoutModal(invId, 'investor', suggest);
      return;
    }

    // Quick Pay Pengelola
    const quickPayMgrBtn = e.target.closest('[data-quick-pay-pengelola]');
    if (quickPayMgrBtn) {
      const invId = quickPayMgrBtn.getAttribute('data-quick-pay-pengelola');
      const suggest = quickPayMgrBtn.getAttribute('data-suggest-amount');
      openPayoutModal(invId, 'pengelola', suggest);
      return;
    }

    // Toggle Payouts History
    const togglePayoutBtn = e.target.closest('[data-toggle-payouts]');
    if (togglePayoutBtn) {
      const invId = togglePayoutBtn.getAttribute('data-toggle-payouts');
      const el = g(`payouts-container-${invId}`);
      if (el) el.classList.toggle('hidden');
      return;
    }

    // Salin Format WA
    const copyWaBtn = e.target.closest('[data-copy-wa]');
    if (copyWaBtn) {
      const invId = copyWaBtn.getAttribute('data-copy-wa');
      const reports = store.getInvestmentSessionReport(invId);
      if (reports && reports.length > 0) {
        const r = reports[0];
        const text = `*LAPORAN INVESTASI & BAGI HASIL*\n*Kas Juara Sepatu*\n-----------------------------------\n👤 *Pemodal:* ${r.investorName}\n📅 *Tanggal Modal:* ${formatDate(r.date)}\n💰 *Modal Disetor:* ${formatRupiah(r.totalModal)}\n\n📦 *PROGRES SESI PEMBELANJAAN:*\n• Faktur Sesi: ${r.sessionInvoices.length > 0 ? r.sessionInvoices.join(', ') : 'Semua Belanja'}\n• Total Pasang Beli: ${r.totalBeliPasang} psg\n• Sepatu Laku: ${r.totalTerjualPasang} psg (${r.persentaseTerjual}%)\n• Status Syarat: ${r.isEligible50 ? '✅ SUDAH TERJUAL ≥ 50% (SIAP BAGI HASIL)' : '⏳ Belum 50% (Masih Berjalan)'}\n\n📊 *PERHITUNGAN KEUNTUNGAN BERSIH:*\n• Omzet Penjualan Sesi: ${formatRupiah(r.omzetPenjualan)}\n• HPP Barang Terjual: -${formatRupiah(r.hppTerjual)}\n• Biaya Operasional Sesi: -${formatRupiah(r.biayaOpsSesi)}\n• *Laba Bersih Sesi:* *${formatRupiah(r.labaBersih)}*\n\n🤝 *PEMBAGIAN HASIL (60% Investor : 40% Pengelola):*\n• *Hak Investor (60%):* *${r.isEligible50 ? formatRupiah(r.hakInvestor60) : 'Rp 0'}*\n  - Dibayarkan: ${formatRupiah(r.bagiHasilDibayar)}\n  - Sisa Hak: ${formatRupiah(r.sisaBagiHasil)}\n• *Hak Pengelola (40%):* *${r.isEligible50 ? formatRupiah(r.hakPengelola40) : 'Rp 0'}*\n  - Sudah Ditarik: ${formatRupiah(r.pengelolaDibayar)}\n  - Sisa Hak: ${formatRupiah(r.sisaHakPengelola)}\n-----------------------------------\n_Terima kasih atas transparansi dan kerjasamanya._`;
        
        navigator.clipboard.writeText(text).then(() => {
          showToast('Laporan WA berhasil disalin ke clipboard ✓', 'success');
        }).catch(() => {
          showToast('Gagal menyalin, browser tidak mengizinkan.', 'error');
        });
      }
      return;
    }

    // Edit Investor
    const editBtn = e.target.closest('[data-edit-investor]');
    if (editBtn) {
      const invId = editBtn.getAttribute('data-edit-investor');
      openEditModal(invId);
      return;
    }

    // Delete Investor
    const delBtn = e.target.closest('[data-delete-investor]');
    if (delBtn) {
      deletingId = delBtn.getAttribute('data-delete-investor');
      g('investor-delete-modal').classList.remove('hidden');
      return;
    }

    // Delete Single Payout
    const delPayoutBtn = e.target.closest('[data-delete-payout]');
    if (delPayoutBtn) {
      const pId = delPayoutBtn.getAttribute('data-delete-payout');
      const invId = delPayoutBtn.getAttribute('data-investor-id');
      if (confirm('Hapus catatan pembayaran ini? Saldo kas toko yang sebelumnya terpotong akan dikembalikan.')) {
        store.deleteInvestorPayout(invId, pId);
        showToast('Pembayaran dihapus & saldo kas dikembalikan.', 'info');
        router.render();
      }
      return;
    }
  });

  // Konfirmasi Hapus Pemodal
  if (g('btn-confirm-delete-investor')) {
    g('btn-confirm-delete-investor').addEventListener('click', () => {
      if (deletingId) {
        store.deleteInvestor(deletingId);
        showToast('Data pemodal & seluruh mutasi terkait berhasil dihapus.', 'info');
        deletingId = null;
        g('investor-delete-modal').classList.add('hidden');
        router.render();
      }
    });
  }
}
