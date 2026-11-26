// Vercel Serverless Function Proxy -> Cloudflare Worker (D1) atau Google Apps Script (Fallback/Rollback)
// Atur Environment Variable DB_TARGET = "cloudflare" di Vercel untuk memakai Cloudflare D1,
// atau ubah ke "gas" kapan saja untuk rollback instan ke Google Sheets.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed. Gunakan POST.' });
  }

  const dbTarget = String(process.env.DB_TARGET || 'gas').toLowerCase().trim();
  const useCloudflare = dbTarget === 'cloudflare' && Boolean(process.env.CF_WORKER_URL);

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = String(body.action || '');
    const args = Array.isArray(body.args) ? body.args : [];

    if (!action) {
      return res.status(400).json({ ok: false, error: 'Parameter action wajib diisi.' });
    }

    if (useCloudflare) {
      const cfUrl = process.env.CF_WORKER_URL;
      const cfSecret = process.env.CF_API_SECRET || '';
      const upstreamRes = await fetch(cfUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-API-Secret': cfSecret
        },
        body: JSON.stringify({ action, args })
      });

      const text = await upstreamRes.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (_parseErr) {
        return res.status(502).json({
          ok: false,
          error: 'Respon dari Cloudflare Worker bukan JSON valid.'
        });
      }
      return res.status(upstreamRes.ok ? 200 : upstreamRes.status).json(data);
    }

    // Mode GAS (default / rollback)
    const gasUrl = process.env.GAS_WEBAPP_URL;
    const gasSecret = process.env.PWA_API_SECRET || '';

    if (!gasUrl) {
      return res.status(500).json({
        ok: false,
        error: 'Environment Variable GAS_WEBAPP_URL belum diatur di Vercel Project Settings.'
      });
    }

    const upstreamRes = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: action,
        args: args,
        secret: gasSecret
      }),
      redirect: 'follow'
    });

    const text = await upstreamRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_parseErr) {
      return res.status(502).json({
        ok: false,
        error: 'Respon dari Google Apps Script bukan JSON valid. Pastikan Deployment GAS sudah versi terbaru (Anyone).'
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}
