const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8000);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = path.resolve(root, relative);
    const allowed = ['index.html', 'app.js', 'styles.css', 'mobile.css', 'README.md'].includes(relative)
      || relative.startsWith('assets/') || relative.startsWith('docs/screenshots/');
    if (!allowed || !file.startsWith(root + path.sep)) {
      res.writeHead(404).end('Arquivo não encontrado');
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404).end('Arquivo não encontrado'); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  } catch {
    res.writeHead(400).end('Endereço inválido');
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `A porta ${port} está em uso. Feche o outro servidor ou defina PORT.` : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Mimo disponível em http://127.0.0.1:${port}`));
