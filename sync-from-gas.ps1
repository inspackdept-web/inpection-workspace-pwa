# Script untuk menyalin & mengonversi SuccessRate.html, DailyReport.html, dan Code.gs
# dari folder GAS asli (tanpa mengubah folder GAS asli sama sekali) ke folder PWA baru ini.

$ErrorActionPreference = "Stop"
$gasDir = "C:\Users\reyhan\Desktop\Inspection Workspace\Inspection-Workspace-Unified-App-Final"
$pwaDir = "C:\Users\reyhan\Desktop\Inspection Workspace\inspection-workspace-pwa"
$pubDir = Join-Path $pwaDir "public"
$gasBackendDir = Join-Path $pwaDir "gas-backend"

New-Item -ItemType Directory -Force -Path $pubDir | Out-Null
New-Item -ItemType Directory -Force -Path $gasBackendDir | Out-Null

# 1. Buat public/daily-report.html dari DailyReport.html (tanpa mengubah file asli)
$dailyHtml = Get-Content -Raw -Encoding UTF8 (Join-Path $gasDir "DailyReport.html")
$pwaHeadTags = @"
  <base target="_top">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/svg+xml" href="/icon.svg">
  <link rel="apple-touch-icon" href="/icon.svg">
  <meta name="theme-color" content="#092b3a">
  <script src="/pwa-bridge.js"></script>
"@
$dailyPwa = $dailyHtml.Replace('  <base target="_top">', $pwaHeadTags)
Set-Content -Path (Join-Path $pubDir "daily-report.html") -Value $dailyPwa -Encoding UTF8

# 2. Buat public/index.html dari SuccessRate.html (tanpa mengubah file asli)
$srHtml = Get-Content -Raw -Encoding UTF8 (Join-Path $gasDir "SuccessRate.html")
$srHeadTags = @"
  <base target="_top">
  <title>Inspection Workspace</title>
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/svg+xml" href="/icon.svg">
  <link rel="apple-touch-icon" href="/icon.svg">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Inspection Workspace">
  <meta name="theme-color" content="#092b3a">
  <script src="/pwa-bridge.js"></script>
"@
$srPwa = $srHtml.Replace('  <base target="_top">', $srHeadTags)
$srPwa = $srPwa.Replace(
  "const DAILY_SRCDOC_B64 = <?!= JSON.stringify(typeof dailyReportSrcDocB64 !== 'undefined' ? dailyReportSrcDocB64 : '') ?>;",
  "const DAILY_SRCDOC_B64 = ''; const PWA_DAILY_URL = '/daily-report.html';"
)
$srPwa = $srPwa.Replace(
  "const INITIAL_PROJECT_TAB = <?!= JSON.stringify(typeof initialProjectTab !== 'undefined' ? initialProjectTab : 'daily') ?>;",
  "const INITIAL_PROJECT_TAB = (new URLSearchParams(window.location.search).get('page') === 'success') ? 'success' : 'daily';"
)
$srPwa = $srPwa.Replace(
  "const isDaily = tabName === 'daily' && Boolean(DAILY_SRCDOC_HTML);",
  "const isDaily = tabName === 'daily' && (Boolean(DAILY_SRCDOC_HTML) || typeof PWA_DAILY_URL !== 'undefined');"
)
$srPwa = $srPwa.Replace(
  "if (DAILY_SRCDOC_HTML && `$('dailyWorkspaceFrame')) {`n      `$('dailyWorkspaceFrame').srcdoc = DAILY_SRCDOC_HTML;`n    }",
  "if (`$('dailyWorkspaceFrame')) { if (DAILY_SRCDOC_HTML) { `$('dailyWorkspaceFrame').srcdoc = DAILY_SRCDOC_HTML; } else if (typeof PWA_DAILY_URL !== 'undefined') { `$('dailyWorkspaceFrame').src = PWA_DAILY_URL; } }"
)
$srPwa = $srPwa.Replace(
  "if (DAILY_SRCDOC_HTML && `$('dailyWorkspaceFrame')) {`r`n      `$('dailyWorkspaceFrame').srcdoc = DAILY_SRCDOC_HTML;`r`n    }",
  "if (`$('dailyWorkspaceFrame')) { if (DAILY_SRCDOC_HTML) { `$('dailyWorkspaceFrame').srcdoc = DAILY_SRCDOC_HTML; } else if (typeof PWA_DAILY_URL !== 'undefined') { `$('dailyWorkspaceFrame').src = PWA_DAILY_URL; } }"
)
Set-Content -Path (Join-Path $pubDir "index.html") -Value $srPwa -Encoding UTF8

# 3. Buat gas-backend/Code-PWA-Addon.gs berisi tambahan fungsi doPost() untuk API PWA
$addonGs = @"
// ============================================================================
// TAMBAHAN KHUSUS PWA VERCEL (Tempelkan di bagian paling bawah Code.gs jika ingin mengaktifkan PWA)
// ============================================================================
function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(raw);
    return handlePwaApiRequest_(payload);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err && err.message ? err.message : String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handlePwaApiRequest_(payload) {
  try {
    const props = PropertiesService.getScriptProperties();
    const expectedSecret = props.getProperty('PWA_API_SECRET');
    if (expectedSecret && String(payload.secret || '') !== String(expectedSecret)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Unauthorized: Invalid PWA_API_SECRET' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const action = String((payload && payload.action) || '');
    const args = Array.isArray(payload && payload.args) ? payload.args : [];

    const RPC_METHODS = {
      getAppConfig: getAppConfig,
      saveAppConfig: saveAppConfig,
      getDailyBootstrapData: getDailyBootstrapData,
      getSuccessRateBootstrapData: getSuccessRateBootstrapData,
      getInitialData: getInitialData,
      getDailyInputOptions: getDailyInputOptions,
      getDailyInputCalendar: getDailyInputCalendar,
      getDailyInputRecords: getDailyInputRecords,
      deleteDailyReportDate: deleteDailyReportDate,
      saveDailyInput: saveDailyInput,
      previewExcel: previewExcel,
      saveImport: saveImport,
      deletePeriod: deletePeriod,
      getPeriodDeleteCount: getPeriodDeleteCount,
      deletePeriodBatch: deletePeriodBatch,
      getYearSummary: getYearSummary,
      getPeriodSummary: getPeriodSummary,
      getPeriodRecords: getPeriodRecords,
      getAppInfo: getAppInfo,
      getCalendarData: getCalendarData,
      getDashboardData: getDashboardData,
      createSuccessRateDocx: createSuccessRateDocx,
      getDashboardComments: getDashboardComments,
      saveDashboardComment: saveDashboardComment,
      deleteDashboardComment: deleteDashboardComment,
      getHistoryDayData: getHistoryDayData,
      getMonthHistoryData: getMonthHistoryData,
      getManualEntryTemplate: getManualEntryTemplate,
      saveManualDayData: saveManualDayData,
      saveAutoSamplingDayData: saveAutoSamplingDayData,
      updateDayData: updateDayData,
      deleteDayData: deleteDayData,
      saveDayUpload: saveDayUpload
    };

    const fn = RPC_METHODS[action];
    if (typeof fn !== 'function') {
      throw new Error('Fungsi API tidak ditemukan: ' + action);
    }

    const result = fn.apply(null, args);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, result: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err && err.message ? err.message : String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
"@
$origCodeGs = Get-Content -Raw -Encoding UTF8 (Join-Path $gasDir "Code.gs")
Set-Content -Path (Join-Path $gasBackendDir "Code.gs") -Value ($origCodeGs + "`r`n`r`n" + $addonGs) -Encoding UTF8

Write-Output "Sync selesai! Folder GAS asli tetap utuh 100%, dan folder inspection-workspace-pwa sudah siap."
