import { Router, RequestHandler } from 'express';

const FIVESIM_API_BASE_URL = 'https://5sim.net/v1';
const FAKE_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

const telRouter = Router();

const proxyRequestHandler: RequestHandler = async (req, res) => {
  const apiKey = process.env.FIVESIM_API_KEY;

  if (!apiKey) {
    console.error('CRITICAL: 5SIM_API_KEY is not defined in the environment variables.');
    res.status(500).json({ error: 'API key is not configured on the server.' });
    return;
  }

  try {
    const slug = (req.params[0] || '').replace(/^\//, '');
    const queryString = req.url.split('?')[1] || '';
    const targetUrl = `${FIVESIM_API_BASE_URL}/${slug}${queryString ? '?' + queryString : ''}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'User-Agent': FAKE_USER_AGENT,
    };

    let body: string | undefined = undefined;
    if (req.method === 'POST' && req.body && Object.keys(req.body).length > 0) {
      body = JSON.stringify(req.body);
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      const errorBody = await response.text();
      if (contentType.includes('text/html')) {
        console.error(`Error from 5SIM API: Blocked by Cloudflare (403 Forbidden).`);
        res.status(403).json({ error: 'Request blocked by provider security (Cloudflare).' });
      } else {
        console.error(`Error from 5SIM API: ${response.status}`, errorBody);
        try {
          res.status(response.status).json(JSON.parse(errorBody));
        } catch {
          res.status(response.status).json({ error: errorBody });
        }
      }
      return;
    }

    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('Error in 5SIM API proxy route:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown internal error occurred.';
    res.status(500).json({ error: errorMessage });
  }
};

// These routes will catch all GET and POST requests to /api/v1/tel/*
telRouter.get(/(.*)/, proxyRequestHandler);
telRouter.post(/(.*)/, proxyRequestHandler);

export default telRouter;
