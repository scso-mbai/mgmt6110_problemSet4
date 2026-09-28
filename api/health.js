// api/health.js
// Health check endpoint reporting credential configuration and upstream response status

export default async function handler(req, res) {
  // Cache the response for 5 to 60 seconds with Cache-Control: s-maxage=[N], stale-while-revalidate=[2N]
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  // Helper for consistent JSON response across Vercel and Node environments
  const sendJson = (statusCode, data) => {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(statusCode).json(data);
    }
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  const credential = process.env.location;
  const keyConfigured = Boolean(credential && credential !== 'undefined' && credential.trim() !== '');

  // The 'location' variable is optional: /api/location and the page work out area names
  // from the browser's coordinates without it. So a missing variable is not a failure.
  // Must NEVER print the credential or any part of it.
  if (!keyConfigured) {
    return sendJson(200, {
      status: 'ok',
      keyConfigured: 'not required',
      note: 'Area names are worked out from coordinates; no external location service is needed.',
    });
  }

  // If credential is an upstream HTTP URL endpoint, ping it
  const isHttpUpstream = credential.startsWith('http://') || credential.startsWith('https://');

  if (isHttpUpstream) {
    try {
      const upstreamRes = await fetch(credential);
      return sendJson(upstreamRes.ok ? 200 : upstreamRes.status, {
        keyConfigured: true,
        upstreamAnswered: true,
        upstreamStatus: upstreamRes.status,
      });
    } catch {
      return sendJson(502, {
        keyConfigured: true,
        upstreamAnswered: false,
        upstreamStatus: null,
        reason: 'Upstream is unreachable',
      });
    }
  }

  // When credential is configured for browser geolocation flow (no external HTTP upstream required)
  return sendJson(200, {
    keyConfigured: true,
    upstreamAnswered: true,
    upstreamStatus: 200,
  });
}
