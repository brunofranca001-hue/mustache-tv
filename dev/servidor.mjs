// Servidor de teste no PC: serve a pasta app/ em http://localhost:5173
// (na TV quem serve é o TizenBrew, em http://127.0.0.1:8081/module/...).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const tipos = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };

http.createServer((req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const arquivo = path.join(raiz, caminho === '/' ? 'index.html' : caminho);
  if (!arquivo.startsWith(raiz) || !fs.existsSync(arquivo)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': (tipos[path.extname(arquivo)] || 'application/octet-stream') + '; charset=utf-8' });
  fs.createReadStream(arquivo).pipe(res);
}).listen(5173, () => console.log('Tela inicial em http://localhost:5173'));
