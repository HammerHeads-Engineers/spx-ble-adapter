const http = require('http');

async function routeRequest(controller, method, url, body) {
  if (method === 'GET' && url === '/health') {
    return { status: 200, body: await controller.getHealth() };
  }

  if (method === 'GET' && url === '/state') {
    return { status: 200, body: await controller.getState() };
  }

  if (method === 'PUT' && url === '/state') {
    await controller.setState(body || {});
    return { status: 204 };
  }

  if (method === 'POST' && url === '/events') {
    await controller.onEvent(body || {});
    return { status: 202 };
  }

  if (method === 'GET' && url === '/config') {
    return { status: 200, body: await controller.getConfig() };
  }

  if (method === 'PUT' && url === '/config') {
    await controller.setConfig(body || {});
    return { status: 204 };
  }

  return { status: 404 };
}

function createHttpServer({ port = 8085, host = '0.0.0.0', controller }) {
  if (!controller) throw new Error('HTTP server requires a controller');

  const server = http.createServer(async (req, res) => {
    const { method, url } = req;

    try {
      const needsBody = method === 'PUT' || method === 'POST';
      const body = needsBody ? await readJsonBody(req) : undefined;

      if (needsBody) {
        console.log('[HTTP] incoming', method, url, 'payload:', typeof body === 'object' ? JSON.stringify(body) : body);
      } else {
        console.log('[HTTP] incoming', method, url);
      }

      const result = await routeRequest(controller, method, url, body);

      if (result.body !== undefined) {
        res.writeHead(result.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result.body));
      } else {
        res.writeHead(result.status).end();
      }
    } catch (err) {
      console.error('[HTTP] error:', err);
      const status = err.statusCode || 500;
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
    }
  });

  const api = {
    listen() {
      return new Promise((resolve) => server.listen(port, host, () => {
        resolve(server.address().port);
      }));
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
    address() {
      return server.address();
    },
  };

  return api;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(parsed);
      } catch (err) {
        err.statusCode = 400;
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

module.exports = {
  createHttpServer,
  routeRequest,
  readJsonBody,
};
