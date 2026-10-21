// Mustache TV: app de canais para Samsung Tizen (módulo do TizenBrew).
// Toca só os links de app/meus-canais.json. A tela "inicio" (atalhos de apps) segue no código, desligada.
// Escrito sem `?.` e `??`: o navegador da TV é um Chromium mais antigo que o do PC.
(function () {
  'use strict';

  // Os canais vêm só de app/meus-canais.json: links avulsos ("canais") e listas .m3u ("listas").
  var MEUS_CANAIS = 'meus-canais.json';
  var GRUPO_PADRAO = 'Meus canais';
  var HLS_JS = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
  var ICONES = 'https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/';
  var SERVICO = 'http://127.0.0.1:8086';
  var ESPERA_CANAL_MS = 15000;
  var MAX_RECENTES = 12;

  var TECLA = {
    esquerda: [37], direita: [39], cima: [38], baixo: [40], ok: [13],
    voltar: [10009, 8, 27], canalMais: [427, 33], canalMenos: [428, 34], info: [457, 73]
  };

  var MUSTACHE = { nome: 'Mustache TV', interno: 'mustache', cor: '#2b1810', frase: 'Canais abertos ao vivo' };

  var $ = function (id) { return document.getElementById(id); };
  var estado = {
    apps: [], canais: null, recentes: lerSalvo('recentes-v2') || [],
    tela: 'inicio',
    telas: { inicio: { trilhas: [], linha: 0, colunas: [] }, mustache: { trilhas: [], linha: 0, colunas: [] } },
    tocando: null
  };
  function T() { return estado.telas[estado.tela]; }

  // ---------------- Utilidades ----------------
  function guardar(chave, valor) { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (err) {} }
  function lerSalvo(chave) { try { return JSON.parse(localStorage.getItem(chave)); } catch (err) { return null; } }
  function el(tag, classe, texto) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto) n.textContent = texto;
    return n;
  }
  function desenho(id) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }

  // ---------------- Papel de parede ----------------
  // Duas <img> se alternando: a nova carrega escondida e só depois aparece por cima (sem piscar).
  function iniciarPapel(cfg) {
    var fotos = (cfg && cfg.fotos) || [];
    if (!fotos.length) return;
    var camadas = [$('papel-a'), $('papel-b')], vez = 0, i = Math.floor(Math.random() * fotos.length);
    function proxima() {
      var foto = fotos[i % fotos.length], nova = camadas[vez], velha = camadas[1 - vez];
      nova.onload = function () {
        nova.classList.add('on'); velha.classList.remove('on');
        $('credito').textContent = foto.credito || '';
      };
      nova.onerror = function () { i++; setTimeout(proxima, 1000); };
      nova.src = foto.src;
      vez = 1 - vez; i++;
    }
    proxima();
    if (fotos.length > 1) setInterval(proxima, (cfg.trocarACadaSegundos || 90) * 1000);
  }
  var timerAviso;
  function avisar(texto) {
    var a = $('aviso');
    a.textContent = texto; a.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(function () { a.hidden = true; }, 3500);
  }
  function tem(lista, codigo) { return lista.indexOf(codigo) >= 0; }

  function relogio() {
    var d = new Date();
    $('relogio').textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  // ---------------- Canais (app/meus-canais.json) ----------------
  // Lista .m3u: cada item vem em duas linhas, "#EXTINF:-1 tvg-logo=".." group-title="..",Nome" e a URL.
  function lerM3u(texto, grupoPadrao) {
    var canais = [], atual = null;
    texto.split(/\r?\n/).forEach(function (linha) {
      linha = linha.trim();
      if (linha.indexOf('#EXTINF') === 0) {
        var attr = function (n) { var m = linha.match(new RegExp(n + '="([^"]*)"')); return m ? m[1] : ''; };
        atual = {
          nome: linha.slice(linha.lastIndexOf(',') + 1).trim(),
          logo: attr('tvg-logo'),
          grupo: attr('group-title').split(';')[0] || grupoPadrao
        };
      } else if (linha && linha[0] !== '#' && atual) {
        atual.url = linha;
        canais.push(atual);
        atual = null;
      }
    });
    return canais;
  }

  // Sem cache: são os seus links, e uma mudança no arquivo deve aparecer ao reabrir o app.
  function buscarCanais() {
    return fetch(MEUS_CANAIS, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (cfg) {
        var avulsos = (cfg.canais || []).filter(function (c) { return c && c.url; }).map(function (c) {
          return { nome: c.nome || c.url, url: c.url, logo: c.logo || '', grupo: c.grupo || GRUPO_PADRAO };
        });
        // Uma lista fora do ar não derruba as outras: ela só fica de fora.
        var listas = (cfg.listas || []).map(function (u) {
          return fetch(u).then(function (r) { return r.ok ? r.text() : ''; })
            .then(function (t) { return lerM3u(t, 'Minha lista'); })
            .catch(function () { return []; });
        });
        return Promise.all(listas).then(function (doListas) {
          return doListas.reduce(function (todos, l) { return todos.concat(l); }, avulsos);
        });
      });
  }

  // ---------------- Montagem das telas ----------------
  function montarInicio() {
    var trilhas = [{ titulo: 'Apps', icone: 'ic-tv', tipo: 'app', itens: [MUSTACHE].concat(estado.apps) }];
    if (estado.recentes.length) trilhas.push({ titulo: 'Assistidos há pouco', icone: 'ic-historico', tipo: 'canal', itens: estado.recentes, recentes: true });
    estado.telas.inicio.trilhas = trilhas;
  }

  function montarMustache() {
    var tela = estado.telas.mustache;
    if (!estado.canais) {
      tela.trilhas = [{ titulo: GRUPO_PADRAO, icone: 'ic-radio', tipo: 'canal', itens: [], vazio: estado.erroCanais || 'Carregando seus canais…' }];
      return;
    }
    // Uma trilha por grupo, na ordem em que aparecem no arquivo.
    var porGrupo = {}, ordem = [];
    estado.canais.forEach(function (c) {
      if (!porGrupo[c.grupo]) { porGrupo[c.grupo] = []; ordem.push(c.grupo); }
      porGrupo[c.grupo].push(c);
    });
    var trilhas = [];
    if (estado.recentes.length) trilhas.push({ titulo: 'Assistidos há pouco', icone: 'ic-historico', tipo: 'canal', itens: estado.recentes, recentes: true });
    ordem.forEach(function (g) { trilhas.push({ titulo: g, icone: 'ic-radio', tipo: 'canal', itens: porGrupo[g] }); });
    if (!ordem.length) trilhas.push({ titulo: GRUPO_PADRAO, icone: 'ic-radio', tipo: 'canal', itens: [], vazio: 'Nenhum canal ainda. Coloque seus links em app/meus-canais.json.' });
    tela.trilhas = trilhas;
  }

  // ---------------- Desenho ----------------
  // Rótulo que aparece embaixo do item em foco: nome + uma linha de contexto.
  function rotulo(nome, sub, aoVivo) {
    var r = el('div', 'rotulo');
    r.appendChild(el('b', '', nome));
    if (sub) {
      var s = el('small');
      if (aoVivo) s.appendChild(el('i', 'ponto-vivo'));
      s.appendChild(document.createTextNode(sub));
      r.appendChild(s);
    }
    return r;
  }

  function bannerDeApp(app) {
    var c = el('div', 'cartao');
    c.style.background = app.fundo;
    c.style.color = app.frente;
    if (app.logoImg) {                       // logo colorido pronto (arquivo da própria marca)
      var img = el('img', 'logo-img' + (app.logoLargo ? ' largo' : ''));
      img.alt = app.nome; img.src = app.logoImg;
      img.onerror = function () { c.removeChild(img); c.appendChild(el('span', 'marca-txt', app.nome)); };
      c.appendChild(img);
      return c;
    }
    if (app.icone) {                         // logo de uma cor só, pintado por máscara
      var g = el('span', 'glifo' + (app.iconeGrande ? ' grande' : '') + (app.iconeLargo ? ' largo' : ''));
      g.style.setProperty('--glifo', 'url("' + ICONES + app.icone + '.svg")');
      c.appendChild(g);
    }
    if (app.texto) {
      var t = el('span', 'marca-txt' + (app.estilo ? ' ' + app.estilo : ''), app.texto);
      if (app.textoCor) t.style.color = app.textoCor;
      c.appendChild(t);
    }
    return c;
  }

  function desenharItem(trilha, item) {
    var n, c;
    if (trilha.tipo === 'app') {
      n = el('div', 'item app');
      if (item.interno === 'mustache') {
        c = el('div', 'cartao app-mustache');
        c.appendChild(desenho('bigode'));
        c.appendChild(el('span', '', 'MUSTACHE TV'));
        n.appendChild(c);
        n.appendChild(rotulo(item.nome, 'Seus canais e vídeos'));
        return n;
      }
      n.appendChild(bannerDeApp(item));
      n.appendChild(rotulo(item.nome));
      return n;
    }
    n = el('div', 'item canal');
    c = el('div', 'cartao');
    if (item.logo) {
      var img = el('img');
      img.alt = item.nome;
      img.setAttribute('data-src', item.logo); // só carrega quando a trilha chega perto (economiza memória da TV)
      img.onerror = function () { if (img.parentNode) img.parentNode.removeChild(img); c.appendChild(el('span', '', item.nome)); };
      c.appendChild(img);
    } else {
      c.appendChild(el('span', '', item.nome));
    }
    n.appendChild(c);
    n.appendChild(rotulo(item.nome, item.grupo));
    return n;
  }

  function desenhar() {
    var tela = T();
    document.body.setAttribute('data-tela', estado.tela);
    var faixa = $('trilhas-faixa');
    while (faixa.firstChild) faixa.removeChild(faixa.firstChild);
    tela.trilhas.forEach(function (t, i) {
      var sec = el('section', 'trilha');
      var h = el('h3');
      if (t.icone) h.appendChild(desenho(t.icone));
      h.appendChild(document.createTextNode(t.titulo));
      sec.appendChild(h);
      var itens = el('div', 'trilha-itens');
      if (!t.itens.length) itens.appendChild(el('p', 'vazio', t.vazio || 'Nada por aqui.'));
      t.itens.forEach(function (item) { itens.appendChild(desenharItem(t, item)); });
      sec.appendChild(itens);
      faixa.appendChild(sec);
      if (tela.colunas[i] == null) tela.colunas[i] = 0;
    });
    if (tela.linha >= tela.trilhas.length) tela.linha = 0;
    focar();
  }

  function carregarLogos(linha) {
    var sec = $('trilhas-faixa').children[linha];
    if (!sec) return;
    var imgs = sec.querySelectorAll('img[data-src]');
    for (var i = 0; i < imgs.length; i++) { imgs[i].src = imgs[i].getAttribute('data-src'); imgs[i].removeAttribute('data-src'); }
  }

  function focar() {
    var tela = T();
    var secs = $('trilhas-faixa').children;
    var t = tela.trilhas[tela.linha];
    if (!t) return;
    var col = Math.min(tela.colunas[tela.linha], Math.max(0, t.itens.length - 1));
    tela.colunas[tela.linha] = col;

    for (var i = 0; i < secs.length; i++) {
      secs[i].classList.toggle('ativa', i === tela.linha);
      var antigo = secs[i].querySelector('.item.foco');
      if (antigo) antigo.classList.remove('foco');
    }
    [tela.linha - 1, tela.linha, tela.linha + 1, tela.linha + 2].forEach(carregarLogos);

    var sec = secs[tela.linha];
    // Só rola o que não cabe: com poucas trilhas, todas ficam à vista.
    var faixa = $('trilhas-faixa');
    var sobra = Math.max(0, faixa.scrollHeight - $('trilhas').clientHeight);
    faixa.style.transform = 'translateY(' + (-Math.min(sec.offsetTop, sobra)) + 'px)';

    var itensEl = sec.querySelector('.trilha-itens');
    var alvo = itensEl.children[col];
    if (!alvo || !alvo.classList.contains('item')) return;
    alvo.classList.add('foco');
    // A trilha só anda quando o foco passa de 4 itens: os primeiros ficam parados, como na referência.
    var ref = itensEl.children[Math.max(0, col - 3)];
    itensEl.style.transform = 'translateX(' + (col > 3 ? -ref.offsetLeft : 0) + 'px)';
  }

  // ---------------- Navegação entre telas ----------------
  function irPara(nome) {
    estado.tela = nome;
    if (nome === 'mustache') montarMustache(); else montarInicio();
    desenhar();
  }

  // ---------------- Abrir apps ----------------
  function abrirApp(app) {
    if (app.interno === 'mustache') { irPara('mustache'); return; }
    if (window.tizen && tizen.application) {
      try {
        tizen.application.launch(app.appId, function () {}, function () { abrirPeloServico(app); });
        return;
      } catch (err) { /* a página não tem a permissão: tenta pelo serviço */ }
    }
    abrirPeloServico(app);
  }

  function abrirPeloServico(app) {
    fetch(SERVICO + '/launch?id=' + encodeURIComponent(app.appId))
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) avisar('Não consegui abrir ' + app.nome + '. Tente pelo menu da TV.'); })
      .catch(function () { avisar('Na TV, isto abriria ' + app.nome); });
  }

  // ---------------- Player ----------------
  var hls = null, timerCanal, timerInfo;

  function carregarHlsJs() {
    if (window.Hls) return Promise.resolve(window.Hls);
    return new Promise(function (ok, falha) {
      var s = document.createElement('script');
      s.src = HLS_JS; s.onload = function () { ok(window.Hls); }; s.onerror = falha;
      document.head.appendChild(s);
    });
  }

  function status(texto, aoVivo) {
    var info = $('player-info');
    if (texto) $('player-texto').textContent = texto;
    if (aoVivo != null) $('player').classList.toggle('vivo', aoVivo);
    info.classList.remove('some');
    clearTimeout(timerInfo);
    timerInfo = setTimeout(function () { info.classList.add('some'); }, 4500);
  }

  function pararVideo() {
    clearTimeout(timerCanal);
    if (hls) { hls.destroy(); hls = null; }
    var v = $('video');
    v.onplaying = v.onerror = null;
    v.pause(); v.removeAttribute('src'); v.load();
  }

  function lembrar(canal) {
    estado.recentes = [canal].concat(estado.recentes.filter(function (c) { return c.url !== canal.url; })).slice(0, MAX_RECENTES);
    guardar('recentes-v2', estado.recentes);
  }

  function tocar(trilha, indice) {
    var canal = trilha.itens[indice];
    estado.tocando = { trilha: trilha, indice: indice, tela: estado.tela };
    pararVideo();
    $('player').hidden = false;
    $('player-nome').textContent = canal.nome;
    if (canal.logo) $('player-logo').src = canal.logo; else $('player-logo').removeAttribute('src');
    status('Sintonizando · ' + (indice + 1) + ' de ' + trilha.itens.length + ' em ' + (trilha.titulo), false);

    var v = $('video');
    // Diagnóstico: cada tentativa registra o que aconteceu; quando o canal falha, isso aparece na tela
    // para dar para fotografar (o navegador da TV não tem console acessível do PC).
    var diag = ['tv=' + (/Tizen/i.test(navigator.userAgent) ? 'sim' : 'não'),
      'hls=' + (v.canPlayType('application/vnd.apple.mpegurl') || 'vazio'),
      (canal.url.indexOf('https:') === 0 ? 'https' : 'http')];
    var erroVideo = function () {
      var e = v.error;
      return e ? 'video.error=' + e.code + (e.message ? ' ' + e.message.slice(0, 60) : '') : 'sem video.error';
    };
    var foraDoAr = function (motivo) {
      clearTimeout(timerCanal);
      if (motivo) diag.push(motivo);
      status('Fora do ar · ' + diag.join(' · '), false);
      clearTimeout(timerInfo); // deixa o diagnóstico na tela
    };
    var aindaEste = function () { return estado.tocando && estado.tocando.trilha.itens[estado.tocando.indice] === canal; };
    timerCanal = setTimeout(function () { foraDoAr('tempo esgotado (' + (ESPERA_CANAL_MS / 1000) + 's) readyState=' + v.readyState); }, ESPERA_CANAL_MS);
    v.onplaying = function () { clearTimeout(timerCanal); lembrar(canal); status(canal.grupo + ' · tocando', true); };

    // Na TV, o player nativo da Samsung toca .m3u8 direto e não depende de CORS; mas o navegador
    // do TizenBrew pode responder "não sei" no canPlayType mesmo sabendo. Então, na TV, nativo sempre
    // primeiro; o hls.js (que exige CORS de cada canal) fica de reserva para o PC ou se o nativo falhar.
    var naTV = /Tizen|SMART-TV/i.test(navigator.userAgent);
    if (naTV || v.canPlayType('application/vnd.apple.mpegurl')) {
      diag.push('nativo');
      v.onerror = function () { diag.push('nativo falhou: ' + erroVideo()); if (aindaEste()) tocarComHlsJs(v, canal, aindaEste, foraDoAr, diag); };
      v.src = canal.url;
      v.play().catch(function (e) { diag.push('play(): ' + (e && e.name)); });
      return;
    }
    tocarComHlsJs(v, canal, aindaEste, foraDoAr, diag);
  }

  function tocarComHlsJs(v, canal, aindaEste, foraDoAr, diag) {
    diag.push('hls.js');
    v.onerror = function () { foraDoAr('erro no vídeo (hls.js)'); };
    carregarHlsJs().then(function (Hls) {
      if (!aindaEste()) return;
      if (!Hls.isSupported()) { foraDoAr('hls.js sem suporte (MSE)'); return; }
      if (hls) { hls.destroy(); hls = null; }
      hls = new Hls();
      hls.on(Hls.Events.ERROR, function (_, d) { if (d.fatal) foraDoAr('hls ' + d.type + '/' + d.details + (d.response ? ' http=' + d.response.code : '')); });
      hls.loadSource(canal.url);
      hls.attachMedia(v);
      v.play().catch(function () {});
    }).catch(function () { foraDoAr('não baixou o hls.js'); });
  }

  function trocarCanal(passo) {
    var t = estado.tocando.trilha, n = t.itens.length;
    tocar(t, (estado.tocando.indice + passo + n) % n);
  }

  function fecharPlayer() {
    var ultimo = estado.tocando;
    pararVideo();
    $('player').hidden = true;
    estado.tocando = null;
    estado.tela = ultimo.tela;
    var tela = T();
    if (estado.tela === 'inicio') {
      // A trilha de recentes mudou de ordem: o canal assistido agora é o primeiro.
      montarInicio();
      var r = tela.trilhas.length - 1;
      if (ultimo.trilha.recentes || tela.trilhas[r].recentes) { tela.linha = r; tela.colunas[r] = 0; }
    } else {
      // Remonta para a trilha "Assistidos há pouco" incluir o canal visto; o foco volta ao canal que tocava.
      var titulo = ultimo.trilha.titulo;
      montarMustache();
      for (var i = 0; i < tela.trilhas.length; i++) {
        if (tela.trilhas[i].titulo !== titulo) continue;
        tela.linha = i;
        tela.colunas[i] = ultimo.trilha.recentes ? 0 : ultimo.indice;
      }
    }
    desenhar();
  }

  // ---------------- Controle remoto ----------------
  function registrarTeclas() {
    if (!(window.tizen && tizen.tvinputdevice)) return;
    ['ChannelUp', 'ChannelDown', 'MediaPlayPause', 'Info'].forEach(function (k) {
      try { tizen.tvinputdevice.registerKey(k); } catch (err) {}
    });
  }

  document.addEventListener('keydown', function (ev) {
    var k = ev.keyCode;
    if (estado.tocando) {
      if (tem(TECLA.voltar, k)) fecharPlayer();
      else if (tem(TECLA.cima, k) || tem(TECLA.canalMais, k)) trocarCanal(1);
      else if (tem(TECLA.baixo, k) || tem(TECLA.canalMenos, k)) trocarCanal(-1);
      else if (tem(TECLA.ok, k) || tem(TECLA.info, k)) status();
      else return;
      ev.preventDefault();
      return;
    }

    var tela = T();
    var t = tela.trilhas[tela.linha];
    if (!t) return;
    if (tem(TECLA.direita, k)) tela.colunas[tela.linha] = Math.min(tela.colunas[tela.linha] + 1, t.itens.length - 1);
    else if (tem(TECLA.esquerda, k)) tela.colunas[tela.linha] = Math.max(tela.colunas[tela.linha] - 1, 0);
    else if (tem(TECLA.baixo, k)) tela.linha = Math.min(tela.linha + 1, tela.trilhas.length - 1);
    else if (tem(TECLA.cima, k)) tela.linha = Math.max(tela.linha - 1, 0);
    else if (tem(TECLA.ok, k)) {
      var item = t.itens[tela.colunas[tela.linha]];
      if (item) { if (t.tipo === 'app') abrirApp(item); else tocar(t, tela.colunas[tela.linha]); }
      ev.preventDefault();
      return;
    } else if (tem(TECLA.voltar, k)) {
      ev.preventDefault();
      // Voltar sobe para a primeira trilha; já nela, tenta fechar o app pela API da TV.
      // Nunca usar history.back(): a página anterior é uma rota interna do TizenBrew
      // (file:///tizenbrew-ui/dist/index.html/module-manager) que, recarregada sozinha, dá ERR_ACCESS_DENIED.
      if (tela.linha > 0) { tela.linha = 0; focar(); return; }
      try { tizen.application.getCurrentApplication().exit(); } catch (err) { avisar('Aperte Home para sair'); }
      return;
    } else return;
    ev.preventDefault();
    focar();
  });

  // ---------------- Início ----------------
  function iniciar() {
    relogio(); setInterval(relogio, 15000);
    registrarTeclas();

    fetch('fundos.json').then(function (r) { return r.json(); }).then(iniciarPapel).catch(function () {});

    fetch('apps.json')
      .then(function (r) { return r.json(); })
      .then(function (j) { estado.apps = j.apps; })
      .catch(function () {});

    // O módulo é só o app de canais: abre direto no Mustache TV.
    irPara('mustache');
    buscarCanais()
      .then(function (c) { estado.canais = c; })
      .catch(function () { estado.erroCanais = 'Não consegui baixar a lista de canais. Confira a internet e abra de novo.'; })
      .then(function () { if (!estado.tocando) irPara('mustache'); });
  }

  iniciar();
})();
