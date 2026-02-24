export default async function handler(req, res) {
  const backendOrigin = process.env.BACKEND_API_ORIGIN?.trim();

  if (!backendOrigin) {
    return res.status(500).json({
      error: 'BACKEND_API_ORIGIN is not configured.'
    });
  }

  const normalizedOrigin = backendOrigin.replace(/\/$/, '');
  const requestUrl = new URL(req.url, `https://${req.headers.host}`);
  const upstreamUrl = `${normalizedOrigin}${requestUrl.pathname}${requestUrl.search}`;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers['content-length'];

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value);
    });

    const payload = Buffer.from(await upstream.arrayBuffer());
    return res.send(payload);
  } catch (error) {
    return res.status(502).json({
      error: 'Upstream API request failed.',
      details: error?.message || 'Unknown error'
    });
  }
}
