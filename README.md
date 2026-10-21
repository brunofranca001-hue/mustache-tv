# Mustache TV

Desde a **v1.1.0**, o Mustache TV é uma **moldura**: abre com a faixa do Mustache TV no topo
(bigode, nome e relógio) e o site [Saimo TV](https://saimo-tv.pages.dev/) dentro dela, num
`iframe` (`app/saimo.html`). O foco do controle vai para o Saimo ao carregar; Home sai do app.
Na v1.0.0 ele abria o Saimo direto, sem moldura.

**Histórico:** até a v0.2.0 o Mustache TV era um player próprio (pasta `app/`), primeiro com a
lista pública do iptv-org e depois com links de `app/meus-canais.json`. Esse código continua no
repositório, desligado; para voltar a ele, o `package.json` precisa voltar a `"packageType": "app"`
com `"appPath": "app/index.html"` (ver a tag `v0.2.0`).

É um módulo do [TizenBrew](https://github.com/reisxd/TizenBrew).

## Instalar na TV

1. **Modo Desenvolvedor:** na TV, abra *Apps*, digite `12345` no controle, ligue o
   *Developer mode*, informe o IP do PC e reinicie a TV.
2. **TizenBrew:** instale pelo [TizenBrew Installer](https://github.com/reisxd/TizenBrewInstaller/releases/latest).
   Em TVs com Tizen 7 ou mais novo, ele pede login na conta Samsung.
   Depois de instalar, volte ao `12345` e troque o *Host PC IP* para `127.0.0.1`, depois
   reinicie segurando o botão liga/desliga. O TizenBrew usa o modo desenvolvedor de dentro
   da própria TV. Para reinstalar ou renovar o certificado no futuro, volte o IP para o do PC,
   use o instalador e retorne para `127.0.0.1`.
3. **Este módulo:** no TizenBrew, abra o gerenciador de módulos e adicione
   `gh/brunofranca001-hue/mustache-tv`.
4. **Abrir sozinho:** nas configurações do TizenBrew, marque o Mustache TV para abrir
   automaticamente. Na TV, ligue *Executar último app automaticamente*.

## Personalizar

| Arquivo | O que muda |
|---|---|
| `app/meus-canais.json` | Seus links: `canais` (um link direto `.m3u8`/`.mp4` por item, com `nome`, `grupo` e `logo` opcionais) e `listas` (endereços de listas `.m3u`) |
| `app/fundos.json` | As fotos de fundo (link ou arquivo em `app/fundos/`) e o tempo de troca |

O repositório é **público**: tudo em `meus-canais.json` fica visível para qualquer pessoa.
Links que precisam ser privados não devem ir para esse arquivo.

Funcionam melhor na TV: **HLS (`.m3u8`)** e **MP4 (H.264/AAC)**, sempre com o link **direto**
do arquivo, não o de uma página que mostra o vídeo (YouTube, Drive e afins não servem).

Depois de mudar, a TV só vê a mudança quando ela ganha uma **versão nova (tag)**:
o TizenBrew pede o módulo sem dizer a versão, e o jsDelivr responde com a última tag,
não com o último commit.

```bash
git commit -am "Troca as fotos de fundo"
git tag -a v0.1.1 -m "Mustache TV 0.1.1"
git push --follow-tags
```

O jsDelivr guarda cópia por até 12 horas. Para a TV ver na hora, abra no navegador
`https://purge.jsdelivr.net/gh/brunofranca001-hue/mustache-tv/<arquivo>` para cada
arquivo alterado e reabra o módulo.

## Testar no PC

```bash
node dev/servidor.mjs
```

Abra `http://localhost:5173` e use as setas, Enter e Esc como controle remoto.

## Como funciona

- `app/` é a página que o TizenBrew mostra na TV.
- `service/service.js` roda dentro do TizenBrew e abre os outros apps
  (`tizen.application.launch`). Ele só escuta em `127.0.0.1`: outro aparelho da rede
  não consegue usá-lo.
- O código evita recursos modernos de JavaScript e CSS porque o navegador da TV é
  um Chromium mais antigo.

## Créditos

Vídeo de teste: [Mux test streams](https://test-streams.mux.dev).
Logos: [Simple Icons](https://simpleicons.org) e Wikimedia Commons; as marcas pertencem aos donos.
Fotos de fundo: [Unsplash](https://unsplash.com).
