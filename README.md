# Mustache TV

Tela inicial limpa para TVs Samsung (Tizen), no estilo dos launchers de Android TV:
fundo de paisagem, banners com o logo de cada app e o **Mustache TV**, um app interno
com os canais abertos brasileiros da lista pública [iptv-org](https://github.com/iptv-org/iptv).

É um módulo do [TizenBrew](https://github.com/reisxd/TizenBrew).

## Instalar na TV

1. **Modo Desenvolvedor:** na TV, abra *Apps*, digite `12345` no controle, ligue o
   *Developer mode*, informe o IP do PC e reinicie a TV.
2. **TizenBrew:** instale pelo [TizenBrew Installer](https://github.com/reisxd/TizenBrewInstaller/releases/latest).
   Em TVs com Tizen 7 ou mais novo, ele pede login na conta Samsung.
3. **Este módulo:** no TizenBrew, abra o gerenciador de módulos e adicione
   `gh/brunofranca001-hue/mustache-tv`.
4. **Abrir sozinho:** nas configurações do TizenBrew, marque o Mustache TV para abrir
   automaticamente. Na TV, ligue *Executar último app automaticamente*.

## Personalizar

| Arquivo | O que muda |
|---|---|
| `app/apps.json` | Quais apps aparecem, a ordem, as cores e o `appId` de cada um |
| `app/fundos.json` | As fotos de fundo (link ou arquivo em `app/fundos/`) e o tempo de troca |

Depois de mudar, envie para o GitHub. O TizenBrew busca a versão nova pelo jsDelivr,
que guarda cópia por até 12 horas: para ver na hora, abra
`https://purge.jsdelivr.net/gh/brunofranca001-hue/mustache-tv@main/<arquivo>`.

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

Canais: [iptv-org](https://github.com/iptv-org/iptv), apenas transmissões públicas e gratuitas.
Logos: [Simple Icons](https://simpleicons.org) e Wikimedia Commons; as marcas pertencem aos donos.
Fotos de fundo: [Unsplash](https://unsplash.com).
