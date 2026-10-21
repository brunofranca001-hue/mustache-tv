// Controle da TV Samsung pela rede (WebSocket do "controle remoto", porta 8002).
// Na primeira vez a TV mostra "Permitir"; o token aceito fica em dev/.tv-token (fora do git).
//
//   node dev/tv.mjs <ip> apps            lista os apps instalados (nome e appId)
//   node dev/tv.mjs <ip> texto "<txt>"   digita o texto no campo que estiver selecionado na TV
//
// A TV usa certificado próprio (autoassinado), por isso a verificação TLS é desligada só aqui.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const [ip, comando, arg] = process.argv.slice(2);
if (!ip || !comando) { console.log('uso: node dev/tv.mjs <ip> apps | texto "<txt>"'); process.exit(1); }

const arqToken = path.join(path.dirname(fileURLToPath(import.meta.url)), '.tv-token');
const token = fs.existsSync(arqToken) ? fs.readFileSync(arqToken, 'utf8').trim() : '';
const nome = Buffer.from('Mustache TV (PC)').toString('base64');
const ws = new WebSocket(`wss://${ip}:8002/api/v2/channels/samsung.remote.control?name=${nome}` + (token ? `&token=${token}` : ''));
const prazo = setTimeout(() => { console.log('TEMPO ESGOTADO: ninguém apertou "Permitir" na TV.'); process.exit(1); }, 45000);
const sair = (cod) => { clearTimeout(prazo); ws.close(); process.exit(cod); };

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.event === 'ms.channel.unauthorized') { console.log('RECUSADO na TV.'); sair(1); }
  if (msg.event === 'ms.channel.connect') {
    if (msg.data && msg.data.token) fs.writeFileSync(arqToken, msg.data.token);
    if (comando === 'apps') {
      ws.send(JSON.stringify({ method: 'ms.channel.emit', params: { event: 'ed.installedApp.get', to: 'host' } }));
    } else if (comando === 'texto') {
      ws.send(JSON.stringify({ method: 'ms.remote.control', params: {
        Cmd: Buffer.from(arg || '').toString('base64'), DataOfCmd: 'base64', TypeOfRemote: 'SendInputString' } }));
      ws.send(JSON.stringify({ method: 'ms.remote.control', params: { Cmd: 'Click', DataOfCmd: 'KEY_ENTER', Option: 'false', TypeOfRemote: 'SendRemoteKey' } }));
      console.log('Texto enviado.');
      setTimeout(() => sair(0), 1500);
    }
  }
  if (msg.event === 'ed.installedApp.get') {
    const apps = (msg.data && msg.data.data) || [];
    console.log(`${apps.length} apps:`);
    apps.sort((a, b) => a.name.localeCompare(b.name)).forEach((a) => console.log(`${a.appId}\t${a.name}`));
    sair(0);
  }
};
ws.onerror = (e) => console.log('erro:', e.message || e.type);
