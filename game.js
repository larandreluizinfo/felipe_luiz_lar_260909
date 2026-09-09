// O LABIRINTO — Ovelha x Lobo x Caçadores
// Objetivo: pegar TODAS as moedas sem ser pego.
// Controles: setas / WASD + botões na tela.

const MAPA_TEXTO = [
  "#################",
  "#P....#.....#..C#",
  "#.###.#.###.#.#.#",
  "#.#...#.#...#.#.#",
  "#.#.###.#.###.#.#",
  "#.#.....#.....#.#",
  "#.#####.#####.#.#",
  "#.....#.....#.#.#",
  "#####.#.###.#.#.#",
  "#C....#.#...#.#.#",
  "#.#####.#.###.#.#",
  "#..L....#.....#.#",
  "#################",
];

const TILE = 30;
const canvas = document.getElementById("jogo");
const ctx = canvas.getContext("2d");
const elMoedas = document.getElementById("moedas");
const elVidas = document.getElementById("vidas");
const elTempo = document.getElementById("tempo");
const elRecorde = document.getElementById("recorde");
const elMensagem = document.getElementById("mensagem");
const btnReiniciar = document.getElementById("btnReiniciar");
const btnPausar = document.getElementById("btnPausar");

const COLS = Math.max(...MAPA_TEXTO.map((l) => l.length));
const ROWS = MAPA_TEXTO.length;
canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;

// Normaliza mapa (completa com parede se linha curta)
const grade = MAPA_TEXTO.map((linha) => (linha + "#".repeat(COLS)).slice(0, COLS).split(""));

function ehParede(x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
  return grade[y][x] === "#";
}

function posicoesDo(tipo) {
  const out = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) if (grade[y][x] === tipo) out.push({ x, y });
  return out;
}

function livresVizinhos(x, y) {
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];
  return dirs
    .map((d) => ({ x: x + d.dx, y: y + d.dy }))
    .filter((p) => !ehParede(p.x, p.y));
}

// BFS: próximo passo do inimigo até o jogador (para o Lobo)
function proximoPassoBFS(deX, deY, paraX, paraY) {
  const chave = (x, y) => x + "," + y;
  const fila = [{ x: deX, y: deY }];
  const veioDe = new Map([[chave(deX, deY), null]]);
  while (fila.length) {
    const atual = fila.shift();
    if (atual.x === paraX && atual.y === paraY) {
      let passo = atual;
      let anterior = veioDe.get(chave(passo.x, passo.y));
      while (anterior && !(anterior.x === deX && anterior.y === deY)) {
        passo = anterior;
        anterior = veioDe.get(chave(passo.x, passo.y));
      }
      return passo;
    }
    for (const viz of livresVizinhos(atual.x, atual.y)) {
      if (!veioDe.has(chave(viz.x, viz.y))) {
        veioDe.set(chave(viz.x, viz.y), atual);
        fila.push(viz);
      }
    }
  }
  return null;
}

function alcancaveisDo(inicio) {
  // Flood-fill para garantir que só colocamos moedas onde a Ovelha chega.
  const vistos = new Set([inicio.x + "," + inicio.y]);
  const fila = [inicio];
  while (fila.length) {
    const a = fila.pop();
    for (const v of livresVizinhos(a.x, a.y)) {
      const k = v.x + "," + v.y;
      if (!vistos.has(k)) {
        vistos.add(k);
        fila.push(v);
      }
    }
  }
  return vistos;
}

const estado = {
  jogador: { x: 1, y: 1, dir: { dx: 1, dy: 0 }, filaDir: null },
  lobo: { x: 3, y: 11 },
  cacadores: [{ x: 15, y: 1 }, { x: 1, y: 9 }],
  moedas: new Set(),
  totalMoedas: 0,
  vidas: 3,
  inicioTempo: Date.now(),
  segundos: 0,
  pausado: false,
  terminado: false,
  venceu: false,
};

function carregarRecorde() {
  try {
    const v = localStorage.getItem("labirinto_recorde_s");
    elRecorde.textContent = v ? v + "s" : "—";
  } catch {
    elRecorde.textContent = "—";
  }
}

function salvarRecorde(s) {
  try {
    const atual = Number(localStorage.getItem("labirinto_recorde_s") || "999999");
    if (s < atual) {
      localStorage.setItem("labirinto_recorde_s", String(s));
      carregarRecorde();
    }
  } catch {}
}

function reiniciar() {
  const p = posicoesDo("P")[0] || { x: 1, y: 1 };
  const l = posicoesDo("L")[0] || { x: 3, y: 11 };
  const cs = posicoesDo("C");
  estado.jogador = { x: p.x, y: p.y, dir: { dx: 1, dy: 0 }, filaDir: null };
  estado.lobo = { x: l.x, y: l.y };
  estado.cacadores = cs.length ? cs.map((c) => ({ ...c })) : [{ x: 15, y: 1 }];
  estado.vidas = 3;
  estado.segundos = 0;
  estado.inicioTempo = Date.now();
  estado.pausado = false;
  estado.terminado = false;
  estado.venceu = false;
  btnPausar.textContent = "⏸️ Pausar";

  // Moedas: todo caminho alcançável, exceto spawns.
  const alc = alcancaveisDo(p);
  const spawns = new Set([p.x + "," + p.y, l.x + "," + l.y, ...estado.cacadores.map((c) => c.x + "," + c.y)]);
  estado.moedas = new Set();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!ehParede(x, y) && alc.has(x + "," + y) && !spawns.has(x + "," + y)) {
        estado.moedas.add(x + "," + y);
      }
    }
  }
  estado.totalMoedas = estado.moedas.size;
  esconderMensagem();
  atualizarHUD();
}

function atualizarHUD() {
  const pegas = estado.totalMoedas - estado.moedas.size;
  elMoedas.textContent = pegas + "/" + estado.totalMoedas;
  elVidas.textContent = "❤️".repeat(Math.max(0, estado.vidas)) || "—";
  elVidas.textContent = String(estado.vidas);
  elTempo.textContent = estado.segundos + "s";
}

function mostrarMensagem(html) {
  elMensagem.innerHTML = html;
  elMensagem.classList.remove("escondido");
}

function esconderMensagem() {
  elMensagem.classList.add("escondido");
  elMensagem.innerHTML = "";
}

function tentarMover(ent, dx, dy) {
  const nx = ent.x + dx;
  const ny = ent.y + dy;
  if (!ehParede(nx, ny)) {
    ent.x = nx;
    ent.y = ny;
    return true;
  }
  return false;
}

function moverJogador() {
  const j = estado.jogador;
  if (j.filaDir) {
    // Troca de direção só se for possível (sensação estilo Pac-Man)
    if (!ehParede(j.x + j.filaDir.dx, j.y + j.filaDir.dy)) j.dir = j.filaDir;
  }
  tentarMover(j, j.dir.dx, j.dir.dy);
  const k = j.x + "," + j.y;
  if (estado.moedas.delete(k)) {
    atualizarHUD();
    if (estado.moedas.size === 0) vencer();
  }
}

function moverLobo() {
  const passo = proximoPassoBFS(estado.lobo.x, estado.lobo.y, estado.jogador.x, estado.jogador.y);
  if (passo && !(passo.x === estado.lobo.x && passo.y === estado.lobo.y)) {
    estado.lobo.x = passo.x;
    estado.lobo.y = passo.y;
  } else {
    const ops = livresVizinhos(estado.lobo.x, estado.lobo.y);
    if (ops.length) {
      const e = ops[Math.floor(Math.random() * ops.length)];
      estado.lobo.x = e.x;
      estado.lobo.y = e.y;
    }
  }
}

function moverCacadores() {
  for (const c of estado.cacadores) {
    const ops = livresVizinhos(c.x, c.y);
    if (!ops.length) continue;
    // 35% persegue ganancioso, resto patrulha aleatória
    if (Math.random() < 0.35) {
      let melhor = ops[0];
      let melhorDist = Math.abs(ops[0].x - estado.jogador.x) + Math.abs(ops[0].y - estado.jogador.y);
      for (const o of ops) {
        const d = Math.abs(o.x - estado.jogador.x) + Math.abs(o.y - estado.jogador.y);
        if (d < melhorDist) {
          melhorDist = d;
          melhor = o;
        }
      }
      c.x = melhor.x;
      c.y = melhor.y;
    } else {
      const e = ops[Math.floor(Math.random() * ops.length)];
      c.x = e.x;
      c.y = e.y;
    }
  }
}

function houveCaptura() {
  const j = estado.jogador;
  if (estado.lobo.x === j.x && estado.lobo.y === j.y) return true;
  return estado.cacadores.some((c) => c.x === j.x && c.y === j.y);
}

function sofrerCaptura() {
  estado.vidas -= 1;
  atualizarHUD();
  if (estado.vidas <= 0) {
    perder();
    return;
  }
  // Reposiciona personagens, mantém moedas já coletadas
  const p = posicoesDo("P")[0];
  const l = posicoesDo("L")[0];
  const cs = posicoesDo("C");
  estado.jogador.x = p.x;
  estado.jogador.y = p.y;
  estado.jogador.dir = { dx: 1, dy: 0 };
  estado.jogador.filaDir = null;
  estado.lobo.x = l.x;
  estado.lobo.y = l.y;
  estado.cacadores = cs.map((c) => ({ ...c }));
  mostrarMensagem("<div>😱 <b>Pego!</b><br>Vidas restantes: " + estado.vidas + "<br><small>Continuando em 1,5s...</small></div>");
  estado.pausado = true;
  setTimeout(() => {
    if (!estado.terminado) {
      estado.pausado = false;
      esconderMensagem();
    }
  }, 1500);
}

function vencer() {
  estado.terminado = true;
  estado.venceu = true;
  salvarRecorde(estado.segundos);
  mostrarMensagem(
    "<div>🎉 <b>VOCÊ VENCEU!</b><br>A Ovelha pegou todas as " + estado.totalMoedas + " moedas em " + estado.segundos + "s!<br><br><button id='btnJogar' type='button'>▶️ Jogar de novo</button></div>"
  );
  ligarBotaoJogar();
}

function perder() {
  estado.terminado = true;
  const pegas = estado.totalMoedas - estado.moedas.size;
  mostrarMensagem(
    "<div>🐺 <b>FIM DE JOGO!</b><br>O Lobo e os Caçadores pegaram a Ovelha.<br>Moedas: " + pegas + "/" + estado.totalMoedas + "<br><br><button id='btnJogar' type='button'>🔄 Tentar de novo</button></div>"
  );
  ligarBotaoJogar();
}

function ligarBotaoJogar() {
  const b = document.getElementById("btnJogar");
  if (b) b.addEventListener("click", reiniciar);
}

function desenhar(tempoMs) {
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * TILE;
      const py = y * TILE;
      if (grade[y][x] === "#") {
        ctx.fillStyle = "#334155";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = "#475569";
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
      } else {
        ctx.fillStyle = (x + y) % 2 ? "#0f172a" : "#111c33";
        ctx.fillRect(px, py, TILE, TILE);
      }
    }
  }

  // Moedas com pulsação
  const pulso = 1 + Math.sin(tempoMs / 300) * 0.12;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const k of estado.moedas) {
    const [x, y] = k.split(",").map(Number);
    ctx.font = Math.floor(16 * pulso) + "px serif";
    ctx.fillText("🪙", x * TILE + TILE / 2, y * TILE + TILE / 2 + 1);
  }

  ctx.font = "20px serif";
  for (const c of estado.cacadores) ctx.fillText("🏹", c.x * TILE + TILE / 2, c.y * TILE + TILE / 2 + 1);
  ctx.fillText("🐺", estado.lobo.x * TILE + TILE / 2, estado.lobo.y * TILE + TILE / 2 + 1);
  ctx.fillText("🐑", estado.jogador.x * TILE + TILE / 2, estado.jogador.y * TILE + TILE / 2 + 1);
}

// Loop com ticks diferentes por personagem
let ultJogador = 0;
let ultLobo = 0;
let ultCac = 0;
let ultSeg = 0;

function loop(t) {
  requestAnimationFrame(loop);
  if (estado.pausado || estado.terminado) {
    desenhar(t || 0);
    return;
  }
  if (!ultJogador) {
    ultJogador = ultLobo = ultCac = ultSeg = t;
  }
  if (t - ultSeg > 1000) {
    estado.segundos = Math.floor((Date.now() - estado.inicioTempo) / 1000);
    ultSeg = t;
    atualizarHUD();
  }
  if (t - ultJogador > 150) {
    moverJogador();
    ultJogador = t;
    if (houveCaptura()) sofrerCaptura();
  }
  if (!estado.terminado && !estado.pausado && t - ultLobo > 210) {
    moverLobo();
    ultLobo = t;
    if (houveCaptura()) sofrerCaptura();
  }
  if (!estado.terminado && !estado.pausado && t - ultCac > 280) {
    moverCacadores();
    ultCac = t;
    if (houveCaptura()) sofrerCaptura();
  }
  desenhar(t);
}

const DIRS = {
  cima: { dx: 0, dy: -1 },
  baixo: { dx: 0, dy: 1 },
  esquerda: { dx: -1, dy: 0 },
  direita: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  w: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
  W: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 },
  A: { dx: -1, dy: 0 },
  D: { dx: 1, dy: 0 },
};

document.addEventListener("keydown", (e) => {
  const d = DIRS[e.key];
  if (d) {
    e.preventDefault();
    estado.jogador.filaDir = d;
    if (estado.pausado && !estado.terminado) {
      estado.pausado = false;
      esconderMensagem();
    }
  }
  if (e.key === " " || e.key === "Enter") {
    if (estado.terminado) reiniciar();
  }
});

document.querySelectorAll(".dpad button").forEach((b) => {
  b.addEventListener("click", () => {
    estado.jogador.filaDir = DIRS[b.dataset.dir];
  });
});

btnReiniciar.addEventListener("click", reiniciar);
btnPausar.addEventListener("click", () => {
  if (estado.terminado) return;
  estado.pausado = !estado.pausado;
  btnPausar.textContent = estado.pausado ? "▶️ Continuar" : "⏸️ Pausar";
  if (estado.pausado) mostrarMensagem("<div>⏸️ <b>Pausado</b><br><small>Pressione Continuar ou uma seta para voltar</small></div>");
  else esconderMensagem();
});

carregarRecorde();
reiniciar();
requestAnimationFrame(loop);
