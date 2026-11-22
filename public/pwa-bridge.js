// PWA Bridge, Polyfill google.script.run, Responsive Mobile/Tablet-Portrait Fix & Floating Icon Pop-up Nav
(function () {
  // ===========================================================================
  // 1. POLYFILL google.script.run -> Vercel Serverless Function (/api/gas)
  // ===========================================================================
  function createGasRunnerChain(state) {
    const current = state || { onSuccess: null, onFailure: null, userObject: null };
    return new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'withSuccessHandler') {
            return function (fn) {
              return createGasRunnerChain({
                onSuccess: fn,
                onFailure: current.onFailure,
                userObject: current.userObject
              });
            };
          }
          if (prop === 'withFailureHandler') {
            return function (fn) {
              return createGasRunnerChain({
                onSuccess: current.onSuccess,
                onFailure: fn,
                userObject: current.userObject
              });
            };
          }
          if (prop === 'withUserObject') {
            return function (obj) {
              return createGasRunnerChain({
                onSuccess: current.onSuccess,
                onFailure: current.onFailure,
                userObject: obj
              });
            };
          }

          return function (...args) {
            const endpoint = window.INSPECTION_API_URL || '/api/gas';
            fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: String(prop), args: args })
            })
              .then(async (res) => {
                const data = await res.json();
                if (!res.ok || !data || data.ok === false) {
                  throw new Error((data && data.error) || 'Gagal memanggil server (' + res.status + ')');
                }
                if (typeof current.onSuccess === 'function') {
                  current.onSuccess(data.result, current.userObject);
                }
              })
              .catch((err) => {
                if (typeof current.onFailure === 'function') {
                  current.onFailure(err, current.userObject);
                } else {
                  console.error('[PWA GAS Bridge Error]', prop, err);
                }
              });
          };
        }
      }
    );
  }

  if (typeof window.google === 'undefined' || !window.google.script || !window.google.script.run) {
    window.google = window.google || {};
    window.google.script = window.google.script || {};
    window.google.script.run = createGasRunnerChain();
  }

  // Registrasi Service Worker PWA
  if ('serviceWorker' in navigator && window.top === window.self) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  // ===========================================================================
  // 2. CSS RESPONSIVE FIX + FLOATING BOTTOM ICON POP-UPS
  //    Aktif pada:
  //    - HP (Portrait & Landscape)
  //    - Tablet (Mode Portrait / Vertikal)
  //    Normal (Sidebar Kiri + Topbar Switcher) pada:
  //    - Tablet (Mode Landscape) & PC / Desktop
  // ===========================================================================
  const RESPONSIVE_CSS = `
    /* -------- LEGEND KOMPLIT & 3 KARTU RINGKASAN KALENDER (SEMUA LAYAR) -------- */
    .cal-legend-complete {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 10px 18px;
      margin: 14px 0 12px;
      padding: 4px 6px;
      color: #607783;
      font-size: 12px;
      font-weight: 600;
    }
    .cal-leg-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .cal-leg-box {
      display: inline-block;
      width: 15px;
      height: 15px;
      border-radius: 4.5px;
      flex: none;
    }
    .cal-leg-box.leg-green {
      background: #e3f5eb;
      border: 1.5px solid #80c7a5;
    }
    .cal-leg-box.leg-red {
      background: #fde8e8;
      border: 1.5px solid #e99b9b;
    }
    .cal-leg-box.leg-empty {
      background: #f8fbfa;
      border: 1.5px solid #dce7e5;
    }
    .cal-leg-box.leg-selected {
      background: #eaf4f8;
      border: 2px solid #137c9b;
    }
    .cal-leg-box.leg-today {
      background: #ffffff;
      border: 2px solid #239879;
    }

    /* Highlight Hari Ini & Dipilih pada Kalender */
    .calendar-day.is-today,
    .input-calendar-day.is-today {
      box-shadow: inset 0 0 0 2px #239879 !important;
    }
    .calendar-day.is-selected,
    .input-calendar-day.is-selected {
      box-shadow: inset 0 0 0 2.2px #137c9b, 0 4px 12px rgba(19, 124, 155, 0.22) !important;
      border-color: #137c9b !important;
    }

    /* 3 Kartu Ringkasan Kalender (HARI TERISI | BELUM TERISI | TOTAL DATA) */
    .cal-summary-cards {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin: 0 0 12px;
      width: 100%;
    }
    .cal-sum-card {
      background: #f2faf6;
      border: 1px solid #d7ece3;
      border-radius: 13px;
      padding: 13px 10px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
    }
    .cal-sum-card strong {
      font-size: 21px;
      font-weight: 850;
      color: #092b3a;
      line-height: 1.15;
      font-variant-numeric: tabular-nums;
    }
    .cal-sum-card small {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #607783;
      text-transform: uppercase;
    }

    /* HP Mode Vertikal (Portrait): Grafik Success Rate per Shift & Average per Line Muat Penuh Tanpa Geser Kanan */
    @media (max-width: 600px) and (orientation: portrait) {
      .bar-chart-wrap {
        min-height: 0 !important;
        overflow-x: hidden !important;
      }
      .bar-chart-wrap svg {
        min-width: 0 !important;
        width: 100% !important;
        height: auto !important;
      }
      .cal-legend-complete {
        gap: 8px 12px;
        font-size: 11px;
      }
      .cal-sum-card {
        padding: 10px 6px;
      }
      .cal-sum-card strong {
        font-size: 18px;
      }
      .cal-sum-card small {
        font-size: 9px;
      }
    }

    /* Default (Desktop & Tablet Landscape): Sembunyikan Floating Bottom Nav */
    .pwa-floating-dock,
    .pwa-popup-menu,
    .pwa-popup-proj,
    .pwa-blur-backdrop {
      display: none;
    }

    /* Breakpoint: HP (Portrait & Landscape) + Tablet (Portrait) */
    @media (max-width: 767px),
           (max-width: 1024px) and (orientation: portrait),
           (max-width: 932px) and (max-height: 540px) and (orientation: landscape) {

      html, body {
        overflow-x: hidden !important;
        max-width: 100vw !important;
      }

      /* Sembunyikan Sidebar Atas/Kiri & Project Switcher Topbar */
      .sidebar,
      .topbar .project-switcher,
      .top-controls .project-switcher,
      .topbar-actions .project-switcher {
        display: none !important;
      }

      .app-shell, .shell {
        display: block !important;
        grid-template-columns: 1fr !important;
        width: 100% !important;
        max-width: 100vw !important;
        overflow-x: hidden !important;
      }

      .main {
        padding: 16px 14px 96px !important;
        width: 100% !important;
        max-width: 100vw !important;
        overflow-x: hidden !important;
      }

      /* -------- PERBAIKAN RENTANG TANGGAL & PILIHAN BULAN (SUCCESS RATE) -------- */
      .topbar {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 10px !important;
        margin-bottom: 14px !important;
        width: 100% !important;
      }

      #dashboardControls.top-controls,
      .top-controls {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        gap: 8px !important;
        width: 100% !important;
        align-items: end !important;
      }

      #dashCtrlStartWrap,
      #dashCtrlEndWrap,
      .control {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        margin: 0 !important;
      }

      .control input,
      .control select,
      input[type="date"],
      input[type="month"] {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        font-size: 12.5px !important;
        padding: 0 10px !important;
      }

      #presentButton {
        grid-column: 1 / -1 !important;
        width: 100% !important;
        justify-content: center !important;
      }

      /* Kalender Input Data & Histori Data (Pilih Bulan) */
      .calendar-head {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 10px !important;
        width: 100% !important;
      }

      .calendar-head > .control {
        width: 100% !important;
        min-width: 0 !important;
      }

      .calendar-head-actions {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        gap: 8px !important;
        width: 100% !important;
      }

      .calendar-head-actions > .control {
        grid-column: 1 / -1 !important;
        width: 100% !important;
        min-width: 0 !important;
      }

      .calendar-head-actions > .button {
        width: 100% !important;
        min-width: 0 !important;
        padding: 0 10px !important;
        font-size: 12px !important;
        text-align: center !important;
        justify-content: center !important;
      }

      /* Menu Unduh Grafik (Pilihan Range Hari - Sampai) */
      .download-range {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        gap: 8px !important;
        width: 100% !important;
      }

      .download-range > .control {
        width: 100% !important;
        min-width: 0 !important;
      }

      .download-range > .button,
      .download-range > a.button {
        grid-column: 1 / -1 !important;
        width: 100% !important;
        text-align: center !important;
        justify-content: center !important;
      }

      /* -------- PERBAIKAN PILIHAN BULAN (DAILY REPORT) -------- */
      .topbar-actions {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto !important;
        gap: 8px !important;
        width: 100% !important;
        margin-left: 0 !important;
        align-items: end !important;
      }

      .dashboard-period-control {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
      }

      .dashboard-period-control select {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      .input-calendar-head {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 10px !important;
        width: 100% !important;
      }

      .input-month-control {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
      }

      .input-month-control input {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* -------- EFEK BLUR LAYAR UTAMA SAAT POP-UP AKTIF -------- */
      body.pwa-nav-blur #dailyWorkspaceContainer,
      body.pwa-nav-blur #successWorkspaceContainer {
        filter: blur(7px) brightness(0.88);
        transform: scale(0.99);
        transition: filter 0.28s cubic-bezier(0.22, 1, 0.36, 1), transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
      }
      #dailyWorkspaceContainer,
      #successWorkspaceContainer {
        transition: filter 0.25s ease, transform 0.25s ease;
      }

      .pwa-blur-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(6, 26, 36, 0.42);
        backdrop-filter: blur(7px);
        -webkit-backdrop-filter: blur(7px);
        z-index: 99980;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.26s ease;
      }
      .pwa-blur-backdrop.open {
        opacity: 1;
        pointer-events: auto;
      }

      /* -------- FLOATING BOTTOM DOCK: 2 TOMBOL BULAT ICON-ONLY -------- */
      .pwa-floating-dock {
        display: flex;
        position: fixed;
        left: 16px;
        right: 16px;
        bottom: max(16px, env(safe-area-inset-bottom, 16px));
        z-index: 99995;
        align-items: center;
        justify-content: space-between;
        pointer-events: none;
      }

      .pwa-fab-orb {
        pointer-events: auto;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        background: linear-gradient(145deg, rgba(9, 43, 58, 0.96), rgba(16, 72, 92, 0.96));
        border: 1.5px solid rgba(112, 217, 180, 0.45);
        box-shadow: 0 10px 28px rgba(6, 24, 34, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.24);
        color: #ffffff;
        display: grid;
        place-items: center;
        cursor: pointer;
        position: relative;
        outline: none;
        padding: 0;
        -webkit-tap-highlight-color: transparent;
        transition: transform 0.34s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease, border-color 0.25s ease;
      }
      .pwa-fab-orb::after {
        content: "";
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 1.5px solid rgba(110, 231, 183, 0);
        transform: scale(0.85);
        transition: transform 0.35s ease, border-color 0.35s ease;
        pointer-events: none;
      }
      .pwa-fab-orb:active {
        transform: scale(0.86);
      }
      .pwa-fab-orb.active {
        background: linear-gradient(135deg, #137c9b, #239879);
        border-color: #a7f3d0;
        box-shadow: 0 12px 30px rgba(19, 124, 155, 0.58), 0 0 0 4px rgba(35, 152, 121, 0.24);
      }
      .pwa-fab-orb.active::after {
        border-color: rgba(110, 231, 183, 0.58);
        transform: scale(1.08);
      }

      /* Animasi Ikon Menu Kiri Bawah */
      .pwa-menu-svg {
        width: 23px;
        height: 23px;
        transition: transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .pwa-fab-orb.active .pwa-menu-svg {
        transform: rotate(90deg) scale(1.08);
      }

      /* Animasi Ikon Project Kanan Bawah (Muter 360 derajat) */
      .pwa-proj-spin {
        width: 26px;
        height: 26px;
        display: grid;
        place-items: center;
        font-size: 20px;
        line-height: 1;
        transition: transform 0.56s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .pwa-fab-orb.spin-open .pwa-proj-spin {
        transform: rotate(360deg) scale(1.12);
      }

      /* -------- POP-UP MENU KIRI BAWAH (STAGGERED CASCADE) -------- */
      .pwa-popup-menu {
        display: block;
        position: fixed;
        left: 16px;
        bottom: calc(82px + env(safe-area-inset-bottom, 0px));
        width: 230px;
        background: rgba(9, 43, 58, 0.94);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border: 1px solid rgba(112, 217, 180, 0.36);
        border-radius: 22px;
        padding: 10px;
        box-shadow: 0 22px 48px rgba(4, 18, 26, 0.58);
        z-index: 99990;
        transform-origin: bottom left;
        transform: scale(0.75) translateY(20px);
        opacity: 0;
        pointer-events: none;
        transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.22s ease;
      }
      .pwa-popup-menu.open {
        transform: scale(1) translateY(0);
        opacity: 1;
        pointer-events: auto;
      }
      .pwa-popup-header {
        padding: 5px 11px 8px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.14em;
        color: #8ce0c2;
        text-transform: uppercase;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 6px;
      }
      .pwa-popup-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 10px 12px;
        margin: 3px 0;
        border-radius: 13px;
        font-size: 13px;
        font-weight: 700;
        color: #d4ece9;
        background: transparent;
        border: 0;
        text-align: left;
        cursor: pointer;
        opacity: 0;
        transform: translateX(-14px) scale(0.94);
        transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.22s ease, background 0.15s ease;
      }
      .pwa-popup-menu.open .pwa-popup-item {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
      .pwa-popup-item:active {
        transform: scale(0.93) !important;
      }
      .pwa-popup-item.active {
        background: linear-gradient(120deg, #137c9b, #239879);
        color: #ffffff;
        box-shadow: 0 6px 16px rgba(19, 124, 155, 0.42);
      }
      .pwa-item-icon {
        width: 28px;
        height: 28px;
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.1);
        display: grid;
        place-items: center;
        font-size: 14px;
        flex: none;
      }
      .pwa-popup-item.active .pwa-item-icon {
        background: rgba(255, 255, 255, 0.22);
      }
      .pwa-item-dot {
        margin-left: auto;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #8cf2c9;
        box-shadow: 0 0 8px #8cf2c9;
      }

      /* -------- POP-UP PROJECT KANAN BAWAH (ROTATIONAL FAN) -------- */
      .pwa-popup-proj {
        display: block;
        position: fixed;
        right: 16px;
        bottom: calc(82px + env(safe-area-inset-bottom, 0px));
        width: 215px;
        background: rgba(9, 43, 58, 0.94);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border: 1px solid rgba(112, 217, 180, 0.36);
        border-radius: 22px;
        padding: 10px;
        box-shadow: 0 22px 48px rgba(4, 18, 26, 0.58);
        z-index: 99990;
        transform-origin: bottom right;
        transform: scale(0.6) rotate(-18deg) translateY(24px);
        opacity: 0;
        pointer-events: none;
        transition: transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.24s ease;
      }
      .pwa-popup-proj.open {
        transform: scale(1) rotate(0deg) translateY(0);
        opacity: 1;
        pointer-events: auto;
      }
      .pwa-proj-btn {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 11px 12px;
        margin: 3px 0;
        border-radius: 13px;
        font-size: 13px;
        font-weight: 700;
        color: #d4ece9;
        background: transparent;
        border: 0;
        text-align: left;
        cursor: pointer;
        transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease;
      }
      .pwa-proj-btn:active {
        transform: scale(0.92);
      }
      .pwa-proj-btn.active {
        background: linear-gradient(120deg, #137c9b, #239879);
        color: #ffffff;
        box-shadow: 0 6px 16px rgba(19, 124, 155, 0.42);
      }
    }
  `;

  function injectResponsiveStyle() {
    let style = document.getElementById('pwa-responsive-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'pwa-responsive-style';
      style.textContent = RESPONSIVE_CSS;
    }
    // Selalu pindahkan ke posisi paling akhir agar menang atas semua <style> halaman
    const targetParent = document.body || document.head || document.documentElement;
    if (targetParent && style.parentNode !== targetParent || (targetParent && targetParent.lastElementChild !== style)) {
      targetParent.appendChild(style);
    }
  }

  if (document.head) {
    injectResponsiveStyle();
  }
  document.addEventListener('DOMContentLoaded', injectResponsiveStyle);
  window.addEventListener('load', injectResponsiveStyle);

  // ===========================================================================
  // 3. FLOATING ORBS CONTROLLER (Hanya dipasang di Top Window / index.html)
  // ===========================================================================
  if (window.top === window.self) {
    const MENU_CONFIG = {
      daily: [
        { id: 'dashboard', icon: '◫', label: 'Dashboard' },
        { id: 'import',    icon: '⇧', label: 'Input Data' },
        { id: 'annual',    icon: '▥', label: 'Rekap Tahunan' },
        { id: 'history',   icon: '▤', label: 'Histori Report' }
      ],
      success: [
        { id: 'dashboard', icon: '◫', label: 'Dashboard' },
        { id: 'input',     icon: '⇧', label: 'Input Data' },
        { id: 'history',   icon: '▤', label: 'Histori Data' },
        { id: 'download',  icon: '⇩', label: 'Unduh Grafik' },
        { id: 'html-urls', icon: '🔗', label: 'Alamat HTML' }
      ]
    };

    let activePages = { daily: 'dashboard', success: 'dashboard' };

    function getCurrentProject() {
      const dailyWrap = document.getElementById('dailyWorkspaceContainer');
      if (dailyWrap && dailyWrap.classList.contains('active')) {
        return 'daily';
      }
      return 'success';
    }

    function initFloatingBottomNav() {
      if (document.getElementById('pwaFloatingDock')) return;
      injectResponsiveStyle();

      // Backdrop Blur
      const backdrop = document.createElement('div');
      backdrop.id = 'pwaBlurBackdrop';
      backdrop.className = 'pwa-blur-backdrop';

      // Pop-up Menu Kiri Bawah
      const menuPopup = document.createElement('div');
      menuPopup.id = 'pwaPopupMenu';
      menuPopup.className = 'pwa-popup-menu';
      menuPopup.innerHTML = `
        <div class="pwa-popup-header" id="pwaMenuHeader">MENU DAILY REPORT</div>
        <div id="pwaMenuItems"></div>
      `;

      // Pop-up Project Kanan Bawah
      const projPopup = document.createElement('div');
      projPopup.id = 'pwaPopupProj';
      projPopup.className = 'pwa-popup-proj';
      projPopup.innerHTML = `
        <div class="pwa-popup-header">PILIH PROJECT</div>
        <button type="button" data-pwa-proj="daily" class="pwa-proj-btn">
          <span class="pwa-item-icon">📊</span>
          <span>Daily Report</span>
        </button>
        <button type="button" data-pwa-proj="success" class="pwa-proj-btn">
          <span class="pwa-item-icon">📈</span>
          <span>Success Rate</span>
        </button>
      `;

      // Floating Dock (2 Tombol Bulat Icon-Only)
      const dock = document.createElement('div');
      dock.id = 'pwaFloatingDock';
      dock.className = 'pwa-floating-dock';
      dock.innerHTML = `
        <button type="button" id="pwaMenuFab" class="pwa-fab-orb" aria-label="Buka Menu">
          <svg class="pwa-menu-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
            <path id="pwaMenuPath1" d="M4 7h16"/>
            <path id="pwaMenuPath2" d="M4 12h16"/>
            <path id="pwaMenuPath3" d="M4 17h11"/>
          </svg>
        </button>
        <button type="button" id="pwaProjFab" class="pwa-fab-orb" aria-label="Pilih Project">
          <span class="pwa-proj-spin" id="pwaProjFabIcon">📊</span>
        </button>
      `;

      document.body.appendChild(backdrop);
      document.body.appendChild(menuPopup);
      document.body.appendChild(projPopup);
      document.body.appendChild(dock);

      const menuFab = document.getElementById('pwaMenuFab');
      const projFab = document.getElementById('pwaProjFab');

      function setMenuIconCross(isCross) {
        document.getElementById('pwaMenuPath1').setAttribute('d', isCross ? 'M6 6l12 12' : 'M4 7h16');
        document.getElementById('pwaMenuPath2').setAttribute('d', isCross ? 'M12 12h0' : 'M4 12h16');
        document.getElementById('pwaMenuPath3').setAttribute('d', isCross ? 'M6 18L18 6' : 'M4 17h11');
      }

      function closeAllPopups() {
        menuPopup.classList.remove('open');
        projPopup.classList.remove('open');
        backdrop.classList.remove('open');
        menuFab.classList.remove('active');
        projFab.classList.remove('active', 'spin-open');
        document.body.classList.remove('pwa-nav-blur');
        setMenuIconCross(false);
      }

      function renderPopupState() {
        const proj = getCurrentProject();
        const items = MENU_CONFIG[proj];
        const curPage = activePages[proj] || 'dashboard';

        document.getElementById('pwaMenuHeader').textContent =
          proj === 'daily' ? 'MENU DAILY REPORT' : 'MENU SUCCESS RATE';
        document.getElementById('pwaProjFabIcon').textContent =
          proj === 'daily' ? '📊' : '📈';

        document.getElementById('pwaMenuItems').innerHTML = items
          .map(
            (m, idx) => `
          <button type="button" data-pwa-menu="${m.id}" style="transition-delay:${idx * 35}ms" class="pwa-popup-item ${
              m.id === curPage ? 'active' : ''
            }">
            <span class="pwa-item-icon">${m.icon}</span>
            <span>${m.label}</span>
            ${m.id === curPage ? '<span class="pwa-item-dot"></span>' : ''}
          </button>
        `
          )
          .join('');

        projPopup.querySelectorAll('[data-pwa-proj]').forEach((btn) => {
          const isAct = btn.getAttribute('data-pwa-proj') === proj;
          btn.classList.toggle('active', isAct);
          const pName = btn.getAttribute('data-pwa-proj');
          btn.innerHTML = `
            <span class="pwa-item-icon">${pName === 'daily' ? '📊' : '📈'}</span>
            <span>${pName === 'daily' ? 'Daily Report' : 'Success Rate'}</span>
            ${isAct ? '<span class="pwa-item-dot"></span>' : ''}
          `;
        });

        document.querySelectorAll('[data-pwa-menu]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetMenu = btn.getAttribute('data-pwa-menu');
            activePages[proj] = targetMenu;
            closeAllPopups();

            if (proj === 'daily') {
              const frame = document.getElementById('dailyWorkspaceFrame');
              if (frame && frame.contentWindow && typeof frame.contentWindow.page === 'function') {
                frame.contentWindow.page(targetMenu);
              }
            } else {
              if (typeof window.showPage === 'function') {
                window.showPage(targetMenu);
              }
            }
            renderPopupState();
          });
        });
      }

      menuFab.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = !menuPopup.classList.contains('open');
        closeAllPopups();
        if (willOpen) {
          renderPopupState();
          menuPopup.classList.add('open');
          backdrop.classList.add('open');
          menuFab.classList.add('active');
          document.body.classList.add('pwa-nav-blur');
          setMenuIconCross(true);
        }
      });

      projFab.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = !projPopup.classList.contains('open');
        closeAllPopups();
        if (willOpen) {
          renderPopupState();
          projPopup.classList.add('open');
          backdrop.classList.add('open');
          projFab.classList.add('active', 'spin-open');
          document.body.classList.add('pwa-nav-blur');
        }
      });

      projPopup.querySelectorAll('[data-pwa-proj]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetProj = btn.getAttribute('data-pwa-proj');
          closeAllPopups();
          if (typeof window.switchProjectTab === 'function') {
            window.switchProjectTab(targetProj);
          }
          renderPopupState();
        });
      });

      backdrop.addEventListener('click', closeAllPopups);

      // Hook ke window.switchProjectTab & window.showPage supaya ikon selalu sinkron
      const origSwitch = window.switchProjectTab;
      if (typeof origSwitch === 'function') {
        window.switchProjectTab = function (tabName) {
          origSwitch(tabName);
          renderPopupState();
        };
      }
      const origShowPage = window.showPage;
      if (typeof origShowPage === 'function') {
        window.showPage = function (pageName) {
          activePages.success = pageName;
          origShowPage(pageName);
          renderPopupState();
        };
      }

      renderPopupState();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initFloatingBottomNav);
    } else {
      initFloatingBottomNav();
    }
  }
})();
