// PWA Bridge & Polyfill untuk google.script.run
// Memungkinkan seluruh fitur DailyReport.html dan SuccessRate.html berjalan 100% identik di Vercel PWA & Desktop .EXE
(function () {
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

          // Pemanggilan method backend Code.gs, misal: .getSuccessRateBootstrapData(...)
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

  // Pasang polyfill google.script.run jika berjalan di luar iframe Google Apps Script
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
})();
