// Serviço do módulo: roda dentro do TizenBrew (Node, com o objeto `tizen` disponível).
// A página não tem garantia de acesso à API `tizen`, então ela pede aqui:
//   GET http://127.0.0.1:8086/launch?id=<appId>
// Escrito em JavaScript antigo (var, function) porque o Node da TV pode ser bem velho.
var http = require('http');
var url = require('url');

var PORTA = 8086;
// A página do módulo é servida pelo TizenBrew neste endereço. Só ela pode pedir para abrir apps:
// qualquer outra página aberta na TV (um site no TizenBrew, por exemplo) é recusada.
var ORIGEM_DO_MODULO = 'http://127.0.0.1:8081';

function responder(res, status, corpo) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ORIGEM_DO_MODULO,
    'Vary': 'Origin'
  });
  res.end(JSON.stringify(corpo));
}

var servidor = http.createServer(function (req, res) {
  var pedido = url.parse(req.url, true);

  // O navegador sempre manda "Origin" num fetch entre portas diferentes (8081 -> 8086).
  // Sem Origin, ou com outra, o pedido não veio da nossa página (pode ser um <img> ou outro site).
  if (req.headers.origin !== ORIGEM_DO_MODULO) return responder(res, 403, { ok: false, erro: 'origem não permitida' });

  if (pedido.pathname === '/ping') return responder(res, 200, { ok: true });

  if (pedido.pathname === '/launch') {
    var appId = String(pedido.query.id || '');
    // appIds da Samsung são números ou "pacote.Nome"; recusa qualquer outra coisa.
    if (!/^[A-Za-z0-9._]{3,64}$/.test(appId)) return responder(res, 400, { ok: false, erro: 'appId inválido' });
    try {
      tizen.application.launch(appId,
        function () { responder(res, 200, { ok: true }); },
        function (e) { responder(res, 500, { ok: false, erro: e.message }); });
    } catch (e) {
      responder(res, 500, { ok: false, erro: e.message });
    }
    return;
  }

  responder(res, 404, { ok: false });
});

// Se o serviço já estiver no ar (módulo aberto duas vezes), não derruba nada.
servidor.on('error', function () {});
// Só escuta dentro da própria TV: outro aparelho da rede não consegue abrir apps por aqui.
servidor.listen(PORTA, '127.0.0.1');
