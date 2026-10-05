import { renderPinLoginPage, initPinLoginPage } from './pages/pin-login.js';
import { renderDashboardPage, initDashboardPage } from './pages/dashboard.js';
import { renderTransaksiListPage, initTransaksiListPage } from './pages/transaksi-list.js';
import { renderTambahTransaksiPage, initTambahTransaksiPage } from './pages/tambah-transaksi.js';
import { renderBarangMasukListPage, initBarangMasukListPage } from './pages/barang-masuk-list.js';
import { renderTambahBarangMasukPage, initTambahBarangMasukPage } from './pages/tambah-barang-masuk.js';
import { renderPengirimanPage, initPengirimanPage } from './pages/pengiriman.js';
import { renderInvestorPage, initInvestorPage } from './pages/investor.js';
import { renderLaporanPage, initLaporanPage } from './pages/laporan.js';
import { renderLaporanStockPage, initLaporanStockPage } from './pages/laporan-stock.js';
import { renderPengaturanPage, initPengaturanPage } from './pages/pengaturan.js';
import { renderStockOpnamePage, initStockOpnamePage } from './pages/stock-opname.js';
import { renderTambahOpnamePage, initTambahOpnamePage } from './pages/tambah-opname.js';
import { renderDetailOpnamePage, initDetailOpnamePage } from './pages/detail-opname.js';
import { renderBottomNav, bindBottomNavEvents } from './components/bottom-nav.js';

export class Router {
  constructor(store, appContainerId = 'app') {
    this.store = store;
    this.container = document.getElementById(appContainerId);
    this.currentRoute = 'login';
    this.params = {};

    window.addEventListener('hashchange', () => {
      this.handleHash();
    });
  }

  init() {
    if (!window.location.hash) {
      window.location.hash = '#/login';
    } else {
      this.handleHash();
    }
  }

  handleHash() {
    const rawHash = window.location.hash.replace(/^#\/?/, '') || 'login';
    const [path, queryString] = rawHash.split('?');
    const params = {};
    if (queryString) {
      const searchParams = new URLSearchParams(queryString);
      for (const [k, v] of searchParams.entries()) {
        params[k] = v;
      }
    }

    this.navigate(path, params, false);
  }

  navigate(route, params = {}, updateHash = true) {
    this.currentRoute = route;
    this.params = params;

    if (updateHash) {
      const queryStr = Object.keys(params).length
        ? '?' + new URLSearchParams(params).toString()
        : '';
      window.location.hash = `#/${route}${queryStr}`;
      return;
    }

    this.render();
  }

  updateBottomNav() {
    const navContainer = document.getElementById('global-bottom-nav');
    if (!navContainer) return;

    const navRoutes = {
      'dashboard': 'dashboard',
      'pasok': 'pasok',
      'stock': 'pasok',
      'barang-masuk': 'pasok',
      'transaksi': 'transaksi',
      'pengiriman': 'pengiriman',
      'investor': 'dashboard',
      'laporan': 'laporan',
      'laporan-stock': 'laporan',
      'pengaturan': 'pengaturan',
      'stock-opname': 'pasok',
      'tambah-opname': 'pasok',
      'detail-opname': 'pasok',
    };

    const targetRoute = navRoutes[this.currentRoute];
    if (targetRoute) {
      navContainer.style.display = 'block';
      navContainer.innerHTML = renderBottomNav(targetRoute);
      bindBottomNavEvents(this);
    } else {
      navContainer.style.display = 'none';
      navContainer.innerHTML = '';
    }
  }

  render() {
    if (!this.container) {
      this.container = document.getElementById('app');
    }
    if (!this.container) return;

    // Scroll container to top
    this.container.scrollTop = 0;

    // Update global frozen bottom navigation
    this.updateBottomNav();

    switch (this.currentRoute) {
      case 'login':
        this.container.innerHTML = renderPinLoginPage();
        initPinLoginPage(this, this.store);
        break;

      case 'dashboard':
        this.container.innerHTML = renderDashboardPage(this.store);
        initDashboardPage(this, this.store);
        break;

      case 'transaksi':
        this.container.innerHTML = renderTransaksiListPage(this.store, this.params.filter || 'all');
        initTransaksiListPage(this, this.store, this.params.filter || 'all');
        break;

      case 'tambah-transaksi':
        this.container.innerHTML = renderTambahTransaksiPage(this.store, this.params);
        initTambahTransaksiPage(this, this.store, this.params);
        break;

      case 'pasok':
      case 'stock':
      case 'barang-masuk':
        this.container.innerHTML = renderBarangMasukListPage(this.store, this.params.filter || 'all');
        initBarangMasukListPage(this, this.store, this.params.filter || 'all');
        break;

      case 'tambah-pasok':
      case 'tambah-stock':
      case 'tambah-barang-masuk':
        this.container.innerHTML = renderTambahBarangMasukPage(this.store, this.params);
        initTambahBarangMasukPage(this, this.store, this.params);
        break;

      case 'pengiriman':
        this.container.innerHTML = renderPengirimanPage(this.store, this.params.tab || 'kemas');
        initPengirimanPage(this, this.store, this.params.tab || 'kemas');
        break;

      case 'investor':
        this.container.innerHTML = renderInvestorPage(this.store);
        initInvestorPage(this, this.store);
        break;

      case 'laporan':
        this.container.innerHTML = renderLaporanPage(this.store, this.params.period || 'bulan');
        initLaporanPage(this, this.store, this.params.period || 'bulan');
        break;

      case 'laporan-stock':
        this.container.innerHTML = renderLaporanStockPage(this.store);
        initLaporanStockPage(this, this.store);
        break;

      case 'pengaturan':
        this.container.innerHTML = renderPengaturanPage(this.store);
        initPengaturanPage(this, this.store);
        break;

      case 'stock-opname':
        this.container.innerHTML = renderStockOpnamePage(this.store);
        initStockOpnamePage(this, this.store);
        break;

      case 'tambah-opname':
        this.container.innerHTML = renderTambahOpnamePage(this.store);
        initTambahOpnamePage(this, this.store);
        break;

      case 'detail-opname':
        this.container.innerHTML = renderDetailOpnamePage(this.store, this.params);
        initDetailOpnamePage(this, this.store, this.params);
        break;

      default:
        this.container.innerHTML = renderDashboardPage(this.store);
        initDashboardPage(this, this.store);
        break;
    }

    // Bind any in-page [data-nav] elements (such as links or buttons in headers/cards)
    this.container.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.getAttribute('data-nav');
        if (target) {
          this.navigate(target);
        }
      });
    });
  }
}

