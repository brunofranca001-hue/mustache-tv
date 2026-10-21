// Monta o app Tizen independente do Mustache TV em ferramentas/MustacheTV.wgt.
// Uso: node dev/empacotar-wgt.mjs
//
// O pacote leva: tizen-app/config.xml, a moldura (app/saimo.html, renomeada para index.html)
// e o ícone, fotografado de dev/icone.html pelo Edge sem janela. Um .wgt é um .zip; o tar do
// Windows grava os caminhos com "/" (o Compress-Archive do PowerShell 5.1 usaria "\", que a TV não lê).
// Sai SEM assinatura: o TizenBrew Installer assina com o seu certificado Samsung ao instalar.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const montagem = path.join(raiz, 'ferramentas', 'wgt-montagem');
const saida = path.join(raiz, 'ferramentas', 'MustacheTV.wgt');

const navegadores = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
const navegador = navegadores.find((n) => fs.existsSync(n));
if (!navegador) throw new Error('Não achei Edge nem Chrome para gerar o ícone.');

fs.rmSync(montagem, { recursive: true, force: true });
fs.mkdirSync(montagem, { recursive: true });
fs.copyFileSync(path.join(raiz, 'tizen-app', 'config.xml'), path.join(montagem, 'config.xml'));
fs.copyFileSync(path.join(raiz, 'app', 'saimo.html'), path.join(montagem, 'index.html'));

const icone = path.join(montagem, 'icon.png');
execFileSync(navegador, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
  '--window-size=512,423', `--screenshot=${icone}`, pathToFileURL(path.join(raiz, 'dev', 'icone.html')).href,
], { stdio: 'ignore' });
if (!fs.existsSync(icone)) throw new Error('O ícone não foi gerado.');

// O tar do Windows (bsdtar), não o do Git Bash: o GNU tar lê "C:" como nome de outro computador.
const tar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
fs.rmSync(saida, { force: true });
execFileSync(tar, ['--format=zip', '-c', '-f', saida, '-C', montagem, 'config.xml', 'index.html', 'icon.png']);

console.log('Pacote:', saida, `(${fs.statSync(saida).size} bytes)`);
console.log(execFileSync(tar, ['-t', '-f', saida]).toString().trim());
