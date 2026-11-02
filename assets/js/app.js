/* Para Mariana — feito com amor pelo Ângelo, para o nosso 1 mês. */
(() => {
  'use strict';

  /* ------------------------------------------------------------ utilidades */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const reduz = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* navegador sem armazenamento */ } }
  };
  const CHAVE = 'mariana.chave';
  const num = (n) => n.toLocaleString('pt-BR');
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

  const ajustaVh = () => document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
  ajustaVh();
  addEventListener('resize', ajustaVh);

  function carregarScript(src) {
    return new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = falha;
      document.head.appendChild(s);
    });
  }

  // coração paramétrico (o mesmo desenho em todo o site)
  function pontosCoracao(n = 64) {
    const p = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      p.push([16 * Math.pow(Math.sin(t), 3), -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
    }
    return p;
  }
  const PONTOS_CORACAO = pontosCoracao();
  function caminhoCoracao(ctx, s) {
    ctx.beginPath();
    PONTOS_CORACAO.forEach(([x, y], i) => (i ? ctx.lineTo(x * s / 17, y * s / 17) : ctx.moveTo(x * s / 17, y * s / 17)));
    ctx.closePath();
  }
  function svgCoracao(cx, cy, s) {
    return 'M' + PONTOS_CORACAO.map(([x, y]) => (cx + x * s / 17).toFixed(1) + ' ' + (cy + y * s / 17).toFixed(1)).join('L') + 'Z';
  }

  /* ------------------------------------------------------------ cofre (conteúdo criptografado) */
  const Cofre = {
    chave: null, dados: null, esperando: {}, cache: {},
    bytes(b64) {
      const bin = atob(b64), n = bin.length, u = new Uint8Array(n);
      for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
      return u;
    },
    async derivar(senha) {
      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: this.bytes(window.__V.s), iterations: window.__V.i, hash: 'SHA-256' },
        base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    },
    async abrir(b64, chave = this.chave) {
      const u = this.bytes(b64);
      const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, chave, u.slice(12));
      return new Uint8Array(claro);
    },
    async destrancar(senha) {
      try {
        const chave = await this.derivar(senha);
        const bruto = await this.abrir(window.__V.m, chave);
        this.chave = chave;
        this.dados = JSON.parse(new TextDecoder().decode(bruto));
        return true;
      } catch (e) { return false; }
    },
    carregar(nome) {
      if (!this.cache[nome]) {
        this.cache[nome] = new Promise((ok, falha) => {
          this.esperando[nome] = ok;
          const s = document.createElement('script');
          s.src = 'vault/' + nome + '.js';
          s.onload = () => s.remove();
          s.onerror = () => { s.remove(); delete this.cache[nome]; falha(new Error('falhou ' + nome)); };
          document.head.appendChild(s);
        }).then(async (b64) => URL.createObjectURL(new Blob([await this.abrir(b64)], { type: 'image/jpeg' })));
      }
      return this.cache[nome];
    }
  };
  window.__VL = (nome, b64) => {
    const ok = Cofre.esperando[nome];
    if (ok) { delete Cofre.esperando[nome]; ok(b64); }
  };

  /* ------------------------------------------------------------ fotos */
  const Fotos = {
    thumbs: {},
    url(id, tipo) { return Cofre.carregar(Cofre.dados.fotos[id][tipo || 't']); },
    preencher(id, url) {
      $$('img[data-foto="' + id + '"]').forEach((img) => { if (!img.dataset.cheia) img.src = url; });
    },
    async carregarTodas(ordem) {
      let i = 0;
      const fila = async () => {
        while (i < ordem.length) {
          const id = ordem[i++];
          try {
            const u = await this.url(id, 't');
            this.thumbs[id] = u;
            this.preencher(id, u);
          } catch (e) { /* tenta de novo quando a foto for aberta */ }
        }
      };
      await Promise.all([fila(), fila(), fila()]);
    }
  };

  /* ------------------------------------------------------------ música */
  const Musica = {
    el: null, btn: $('#musica'), voltar: false,
    preparar(src) {
      if (this.el) return;
      this.el = new Audio(src);
      this.el.loop = true;
      this.el.preload = 'auto';
      this.el.addEventListener('play', () => this.marcar(true));
      this.el.addEventListener('pause', () => this.marcar(false));
      this.btn.addEventListener('click', () => this.alternar());
      document.addEventListener('visibilitychange', () => {
        if (!this.el) return;
        if (document.hidden) {
          if (!this.el.paused) { this.voltar = true; this.el.pause(); }
        } else if (this.voltar) {
          this.voltar = false; this.tocar();
        }
      });
    },
    tocar() {
      if (!this.el) return;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* opcional */ }
      const p = this.el.play();
      if (p && p.catch) p.catch(() => this.marcar(false));
    },
    alternar() {
      this.voltar = false;
      if (this.el.paused) this.tocar(); else this.el.pause();
    },
    marcar(on) {
      this.btn.classList.toggle('tocando', on);
      this.btn.setAttribute('aria-pressed', String(on));
      this.btn.setAttribute('aria-label', on ? 'Pausar a música' : 'Tocar a música');
    }
  };

  /* ------------------------------------------------------------ céu de fundo */
  const Fundo = (() => {
    const c = $('#ceu-fundo'), ctx = c.getContext('2d');
    let w = 0, h = 0, estrelas = [], brilhos = [], ultimo = 0;
    const brilho = document.createElement('canvas');
    brilho.width = brilho.height = 48;
    (() => {
      const x = brilho.getContext('2d'), g = x.createRadialGradient(24, 24, 0, 24, 24, 24);
      g.addColorStop(0, 'rgba(236,214,250,.9)'); g.addColorStop(.35, 'rgba(200,168,230,.35)'); g.addColorStop(1, 'rgba(200,168,230,0)');
      x.fillStyle = g; x.fillRect(0, 0, 48, 48);
    })();
    const novoBrilho = (inicio) => ({ x: rnd(0, w), y: inicio ? rnd(0, h) : h + 30, r: rnd(1.2, 3.4), vy: -rnd(0.08, 0.26), fase: rnd(0, 6.3), a: rnd(0.12, 0.42) });
    function tamanho() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = innerWidth; h = innerHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      estrelas = Array.from({ length: Math.round(w * h / 5600) }, () => ({ x: rnd(0, w), y: rnd(0, h), r: Math.pow(Math.random(), 2.2) * 1.5 + 0.35, a: rnd(0.25, 0.85), v: rnd(0.4, 1.8), f: rnd(0, 6.3) }));
      brilhos = Array.from({ length: Math.max(6, Math.round(w / 50)) }, () => novoBrilho(true));
      if (reduz) desenhar(0);
    }
    function desenhar(t) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#F4ECFB';
      for (const s of estrelas) {
        ctx.globalAlpha = s.a * (reduz ? 1 : 0.55 + 0.45 * Math.sin(t * 0.001 * s.v + s.f));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
      }
      for (const b of brilhos) {
        if (!reduz) {
          b.y += b.vy * 1.6; b.x += Math.sin(t * 0.0005 + b.fase) * 0.15;
          if (b.y < -30) Object.assign(b, novoBrilho(false));
        }
        ctx.globalAlpha = b.a;
        const d = b.r * 9;
        ctx.drawImage(brilho, b.x - d / 2, b.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
    }
    function laco(t) {
      requestAnimationFrame(laco);
      if (document.hidden || t - ultimo < 33) return;
      ultimo = t;
      desenhar(t);
    }
    tamanho();
    addEventListener('resize', tamanho);
    if (!reduz) requestAnimationFrame(laco);
    return {};
  })();

  /* ------------------------------------------------------------ festa de corações */
  const Festa = (() => {
    const c = $('#festa'), ctx = c.getContext('2d');
    const cores = ['#C8A8E6', '#E2CCF4', '#E7A9C6', '#872B52', '#A86BC4', '#F3D7E6', '#EAD5B0', '#6B1E3D'];
    let w = 0, h = 0, parts = [], rodando = false;
    const sprites = cores.map((cor) => {
      const s = document.createElement('canvas');
      s.width = s.height = 64;
      const x = s.getContext('2d');
      x.translate(32, 30); caminhoCoracao(x, 26); x.fillStyle = cor; x.fill();
      return s;
    });
    function tamanho() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = innerWidth; h = innerHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    tamanho();
    addEventListener('resize', tamanho);
    const spr = () => sprites[(Math.random() * sprites.length) | 0];
    function laco() {
      ctx.clearRect(0, 0, w, h);
      parts = parts.filter((p) => p.vida < p.max);
      for (const p of parts) {
        p.vida++;
        p.vy += p.g; p.vx *= p.ar; p.vy *= p.ar;
        p.x += p.vx + Math.sin((p.vida + p.fase) * 0.05) * p.balanco; p.y += p.vy; p.rot += p.vr;
        const t = p.vida / p.max;
        ctx.globalAlpha = Math.max(0, t < 0.08 ? t / 0.08 : 1 - Math.max(0, (t - 0.65) / 0.35));
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.drawImage(p.spr, -p.tam / 2, -p.tam / 2, p.tam, p.tam);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (parts.length) requestAnimationFrame(laco);
      else { rodando = false; ctx.clearRect(0, 0, w, h); }
    }
    const iniciar = () => { if (!rodando) { rodando = true; requestAnimationFrame(laco); } };
    return {
      explosao(x, y, n = 36, forca = 1) {
        if (reduz) n = Math.min(n, 8);
        for (let i = 0; i < n; i++) {
          const ang = Math.random() * Math.PI * 2, v = rnd(2, 7.5) * forca;
          parts.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 2.4 * forca, g: 0.15, ar: 0.984, balanco: 0, fase: 0, rot: rnd(-0.6, 0.6), vr: rnd(-0.08, 0.08), vida: 0, max: rnd(55, 95), tam: rnd(11, 25), spr: spr() });
        }
        iniciar();
      },
      chuva(n = 100) {
        if (reduz) n = 20;
        for (let i = 0; i < n; i++) {
          parts.push({ x: rnd(0, w), y: rnd(-h, -20), vx: rnd(-0.4, 0.4), vy: rnd(1.1, 2.6), g: 0.012, ar: 0.998, balanco: rnd(0.2, 0.7), fase: rnd(0, 100), rot: rnd(-0.5, 0.5), vr: rnd(-0.025, 0.025), vida: 0, max: rnd(260, 380), tam: rnd(13, 30), spr: spr() });
        }
        iniciar();
      }
    };
  })();

  /* ------------------------------------------------------------ aviso curto */
  const avisar = (() => {
    const el = $('#aviso');
    let t = null;
    return (txt, ms = 3200) => {
      el.textContent = txt;
      el.classList.add('ver');
      clearTimeout(t);
      t = setTimeout(() => el.classList.remove('ver'), ms);
    };
  })();

  /* ------------------------------------------------------------ sobreposição (bilhete / pôster) */
  const Sobre = {
    el: $('#sobreposicao'), foco: null,
    abrir(html, rotulo) {
      this.foco = document.activeElement;
      this.el.innerHTML = html;
      this.el.setAttribute('aria-label', rotulo);
      this.el.hidden = false;
      document.body.classList.add('travado');
      const b = $('[data-fechar]', this.el);
      if (b) b.focus({ preventScroll: true });
    },
    fechar() {
      if (this.el.hidden) return;
      this.el.hidden = true;
      this.el.innerHTML = '';
      document.body.classList.remove('travado');
      if (this.foco && this.foco.focus) this.foco.focus({ preventScroll: true });
    }
  };
  Sobre.el.addEventListener('click', (e) => { if (e.target === Sobre.el || e.target.closest('[data-fechar]')) Sobre.fechar(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') Sobre.fechar(); });

  /* ------------------------------------------------------------ ícones */
  const IC = {
    escola: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5.6c3-1.3 6-1.1 9 1 3-2.1 6-2.3 9-1V19c-3-1.3-6-1.1-9 1-3-2.1-6-2.3-9-1z"/><path d="M12 6.6V20"/></svg>',
    anel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="15" r="5.8"/><path d="M9.6 6.2 12 9.2l2.4-3-1.3-2.2h-2.2z"/></svg>',
    coracao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="' + svgCoracao(12, 11.2, 8.4) + '"/></svg>',
    venus: '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16 3c.9 6.7 2.3 8.1 9 9-6.7.9-8.1 2.3-9 9-.9-6.7-2.3-8.1-9-9 6.7-.9 8.1-2.3 9-9z"/><circle cx="26" cy="24" r="1.4"/><circle cx="7" cy="25" r="1"/></svg>',
    amantes: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M5 25c6-4 8-12 10-18M27 7c-6 4-8 12-10 18" opacity=".45" stroke-dasharray="1.5 2.5"/><circle cx="7" cy="9" r="2.4" fill="currentColor" stroke="none"/><circle cx="25" cy="23" r="2.4" fill="currentColor" stroke="none"/></svg>',
    saturno: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="16" cy="16" r="6.5" fill="currentColor" stroke="none" opacity=".9"/><ellipse cx="16" cy="16" rx="13" ry="4.2" transform="rotate(-18 16 16)"/></svg>',
    lua: '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M20.5 4.5a12 12 0 1 0 7 21.7A13 13 0 0 1 20.5 4.5z"/></svg>'
  };
  const ORNAMENTO = '<svg class="cap-ornamento" viewBox="0 0 132 14" aria-hidden="true"><path d="M2 7h48M82 7h48" stroke="currentColor" stroke-width="1"/><circle cx="55" cy="7" r="1.3" fill="currentColor"/><circle cx="77" cy="7" r="1.3" fill="currentColor"/><path d="' + svgCoracao(66, 6.6, 5.2) + '" fill="currentColor"/></svg>';
  const SINAL_MAIS = '<svg class="amo-sinal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  /* ------------------------------------------------------------ datas */
  function partesData(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(a, m - 1, d, 12));
    return { dia: d, mes: MESES[m - 1], semana: SEMANA[dt.getUTCDay()] };
  }
  function quandoFoto(dt) { // "2026:10:03 19:31:59" -> "sábado, 3 de outubro, 19h31"
    const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/.exec(dt || '');
    if (!m) return '';
    const p = partesData(`${m[1]}-${m[2]}-${m[3]}`);
    return `${p.semana}, ${p.dia} de ${p.mes}, ${Number(m[4])}h${m[5]}`;
  }
  function somaMeses(d, n) {
    const r = new Date(d.getTime()), dia = r.getDate();
    r.setDate(1); r.setMonth(r.getMonth() + n);
    r.setDate(Math.min(dia, new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()));
    return r;
  }
  function diferenca(a, b) {
    let meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    let ancora = somaMeses(a, meses);
    if (ancora > b) { meses--; ancora = somaMeses(a, meses); }
    let resto = Math.max(0, b - ancora);
    const dias = Math.floor(resto / 864e5); resto -= dias * 864e5;
    const horas = Math.floor(resto / 36e5); resto -= horas * 36e5;
    const minutos = Math.floor(resto / 6e4); resto -= minutos * 6e4;
    return { meses: Math.max(0, meses), dias, horas, minutos, segundos: Math.floor(resto / 1000) };
  }

  /* ------------------------------------------------------------ montagem do conteúdo */
  const cabeca = (numero, titulo, intro) =>
    `<header class="cap-cabeca"><p class="cap-numero">Capítulo ${esc(numero)}</p><h2 class="cap-titulo">${esc(titulo)}</h2>${ORNAMENTO}${intro ? `<p class="cap-intro">${esc(intro)}</p>` : ''}</header>`;

  function htmlNome() {
    const n = window.NOME_SVG;
    const [x0, , w] = n.viewBox.split(' ').map(Number);
    return `<svg class="nome-svg" viewBox="${n.viewBox}" aria-hidden="true"><defs><linearGradient id="tinta-nome" gradientUnits="userSpaceOnUse" x1="${x0}" y1="0" x2="${x0 + w}" y2="0"><stop offset="0" stop-color="#F8EEFF"/><stop offset=".5" stop-color="#E4CFF6"/><stop offset="1" stop-color="#F2C4DC"/></linearGradient></defs>${n.paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
  }

  function htmlPote(total) {
    const cores = ['#C8A8E6', '#E2CCF4', '#E7A9C6', '#872B52', '#A86BC4', '#6B1E3D', '#D9B8EC'];
    const fileiras = [6, 5, 6, 5, 6, 5, 6];
    let coracoes = '', k = 0;
    for (let f = 0; f < fileiras.length && k < total; f++) {
      const n = fileiras[f], y = 223 - f * 14.5;
      for (let i = 0; i < n && k < total; i++, k++) {
        const x = (n === 6 ? 48 : 57) + i * 21 + rnd(-2.5, 2.5);
        const rot = rnd(-28, 28).toFixed(0), cor = cores[k % cores.length];
        coracoes += `<g class="coracao-pote"><path d="${svgCoracao(0, 0, 8.6)}" transform="translate(${x.toFixed(1)} ${(y + rnd(-2, 2)).toFixed(1)}) rotate(${rot})" fill="${cor}" stroke="rgba(30,10,40,.25)" stroke-width=".6"/></g>`;
      }
    }
    return `<svg viewBox="0 0 200 256" aria-hidden="true">
      <defs>
        <linearGradient id="vidro" x1="0" x2="1"><stop offset="0" stop-color="rgba(226,204,244,.16)"/><stop offset=".5" stop-color="rgba(226,204,244,.05)"/><stop offset="1" stop-color="rgba(226,204,244,.14)"/></linearGradient>
        <linearGradient id="tampa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E2D55"/><stop offset="1" stop-color="#5A1531"/></linearGradient>
        <clipPath id="dentro-pote"><path d="M54 64 C40 68 32 80 32 98 L32 214 C32 231 45 238 62 238 L138 238 C155 238 168 231 168 214 L168 98 C168 80 160 68 146 64 Z"/></clipPath>
      </defs>
      <ellipse cx="100" cy="246" rx="74" ry="6" fill="rgba(8,0,18,.45)"/>
      <g clip-path="url(#dentro-pote)">${coracoes}</g>
      <path d="M54 64 C40 68 32 80 32 98 L32 214 C32 231 45 238 62 238 L138 238 C155 238 168 231 168 214 L168 98 C168 80 160 68 146 64 Z" fill="url(#vidro)" stroke="rgba(226,204,244,.62)" stroke-width="2.2"/>
      <path d="M44 104 C44 90 49 82 58 77" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="4" stroke-linecap="round"/>
      <path d="M44 120 L44 200" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="4" stroke-linecap="round"/>
      <rect x="56" y="46" width="88" height="20" rx="5" fill="rgba(226,204,244,.1)" stroke="rgba(226,204,244,.62)" stroke-width="2"/>
      <rect x="50" y="22" width="100" height="27" rx="7" fill="url(#tampa)"/>
      <path d="M50 35 h100" stroke="#C8A8E6" stroke-width="5"/>
      <path d="M100 35 c-14 -14 -30 -8 -22 2 c5 6 15 2 22 -2 z M100 35 c14 -14 30 -8 22 2 c-5 6 -15 2 -22 -2 z" fill="#C8A8E6"/>
      <path d="M100 36 l-9 18 M100 36 l8 19" stroke="#C8A8E6" stroke-width="3" stroke-linecap="round"/>
      <g transform="translate(124 70) rotate(9)"><path d="M0 0 h56 l9 13 l-9 13 h-56 z" fill="#F7EFF5"/><circle cx="7" cy="13" r="2.4" fill="#6B1E3D"/><text x="34" y="18.5" text-anchor="middle" font-family="Caveat, cursive" font-size="16" font-weight="600" fill="#6B1E3D">pra você</text></g>
      <path d="M100 52 C 110 58 120 66 131 83" fill="none" stroke="#C8A8E6" stroke-width="1.2"/>
    </svg>`;
  }

  function montar(d) {
    const lista = []; // fotos na ordem em que aparecem (para a lightbox)
    const memorias = d.memorias.grupos.map((g, gi) => {
      const p = partesData(g.data);
      const fotos = g.fotos.map(([id, legenda], k) => {
        const f = d.fotos[id];
        const i = lista.push({ id, legenda, quando: quandoFoto(f.dt) }) - 1;
        const r = [-2.4, 1.9, -1.3, 2.4, -1.9, 1.2, -2.8][(gi * 3 + k) % 7];
        return `<figure class="polaroid" style="--arn:${(f.w / f.h).toFixed(4)};--r:${r}deg" data-i="${i}" tabindex="0" role="button" aria-label="Ampliar a foto: ${esc(legenda)}"><div class="moldura"><img data-foto="${id}" alt="${esc(legenda)}" decoding="async"></div><figcaption>${esc(legenda)}</figcaption></figure>`;
      }).join('');
      return `<article class="dia">
        <p class="dia-data"><span class="dia-num">${p.dia}</span><span class="dia-mes">de ${p.mes},<br>${p.semana}</span></p>
        <h3 class="dia-titulo">${esc(g.titulo)}</h3>
        <p class="dia-texto">${esc(g.texto)}</p>
        <div class="fotos${g.fotos.length === 1 ? ' so-uma' : ''}">${fotos}</div>
        ${g.fotos.length > 1 ? '<p class="fotos-dica">arraste para o lado</p>' : ''}
      </article>`;
    }).join('');

    const c = d.ceu;
    const html = `
    <section class="abertura" id="abertura">
      <p class="abertura-datas">${esc(d.hero.datas)}</p>
      <h1 class="sr-only">${esc(d.nome)}</h1>
      ${htmlNome()}
      <p class="abertura-linha">${esc(d.hero.linha)}</p>
      <p class="abertura-sub">${esc(d.hero.sub)}</p>
      <div class="rolar" aria-hidden="true">role devagar</div>
    </section>

    <section class="cena contador" id="contador" aria-live="off">
      <div class="coluna">
        <p class="contador-frase" id="contador-frase"></p>
        <p class="contador-mais" id="contador-mais"></p>
      </div>
    </section>

    <section class="cena" id="como-comecou">
      <div class="coluna">
        ${cabeca(d.historia.numero, d.historia.titulo)}
        <ol class="linha-tempo">
          ${d.historia.passos.map((p) => `<li class="passo"><span class="passo-icone" aria-hidden="true">${IC[p.icone] || IC.coracao}</span><p class="passo-quando">${esc(p.quando)}</p><p class="passo-texto">${esc(p.texto)}</p></li>`).join('')}
        </ol>
      </div>
    </section>

    <section class="cena" id="memorias">
      <div class="coluna">
        ${cabeca(d.memorias.numero, d.memorias.titulo, d.memorias.intro)}
        ${memorias}
      </div>
    </section>

    <section class="cena" id="ceu">
      <div class="coluna">
        ${cabeca(c.numero, c.titulo)}
        <p class="ceu-lead">${esc(c.lead)}</p>
      </div>
      <div class="ceu-quadro" id="ceu-quadro">
        <canvas id="ceu-canvas" role="img" aria-label="Mapa do céu do Rio de Janeiro na noite de 3 de outubro de 2026"></canvas>
        <div class="ceu-carregando" id="ceu-carregando">acendendo as estrelas…</div>
        <div class="ceu-rotulo" id="ceu-rotulo"></div>
      </div>
      <div class="coluna">
        <div class="ceu-controles">
          <p class="ceu-hora" id="ceu-hora">19h31</p>
          <p class="ceu-hora-legenda" id="ceu-legenda">a hora da nossa foto</p>
          <input class="tempo" id="ceu-tempo" type="range" min="30" max="690" step="1" value="91" aria-label="Hora da noite de 3 de outubro">
          <div class="tempo-extremos" aria-hidden="true"><span>18h30</span><span>meia-noite</span><span>5h30</span></div>
          <div class="ceu-botoes">
            <button class="botao leve" id="ceu-linhas" type="button" aria-pressed="true">Constelações</button>
            <button class="botao leve" id="ceu-voltar" type="button" hidden>Voltar para 19h31</button>
            <button class="botao" id="ceu-poster" type="button">Guardar este céu</button>
          </div>
        </div>
        <p class="ceu-dica">${esc(c.dica)}</p>
        <ul class="ceu-fatos">${c.fatos.map(([ic, t]) => `<li>${IC[ic] || IC.venus}<p>${esc(t)}</p></li>`).join('')}</ul>
        <p class="ceu-fecho">${esc(c.fecho)}</p>
      </div>
    </section>

    <section class="cena" id="amo">
      <div class="coluna">
        ${cabeca(d.amo.numero, d.amo.titulo, d.amo.intro)}
        <ul class="amo-lista">
          ${d.amo.cartoes.map(([id, t, txt]) => `<li class="amo-item"><button class="amo-botao" type="button" aria-expanded="false" aria-controls="amo-${id}">${esc(t)}${SINAL_MAIS}</button><div class="amo-texto" id="amo-${id}"><div><p>${esc(txt)}</p></div></div></li>`).join('')}
        </ul>
      </div>
    </section>

    <section class="cena" id="bilhetes">
      <div class="coluna">
        ${cabeca(d.bilhetes.numero, d.bilhetes.titulo, d.bilhetes.intro)}
        <div class="pote-area">
          <button class="pote" id="pote" type="button" aria-label="Tirar um bilhete do pote">${htmlPote(d.bilhetes.lista.length)}</button>
          <p class="pote-contagem" id="pote-contagem"></p>
          <button class="botao leve" id="ver-todos" type="button" aria-expanded="false">Ver todos</button>
          <ol class="todos-bilhetes" id="todos-bilhetes" hidden></ol>
        </div>
      </div>
    </section>

    <section class="cena" id="jogo">
      <div class="coluna">
        ${cabeca(d.jogo.numero, d.jogo.titulo, d.jogo.intro)}
        <p class="jogo-info"><span>Jogadas: <b id="jogo-jogadas">0</b></span><span>Pares: <b id="jogo-pares">0</b> de ${d.jogo.fotos.length}</span></p>
        <div class="jogo-grade" id="jogo-grade"></div>
        <div class="jogo-fim" id="jogo-fim" hidden>
          <p>${esc(d.jogo.vitoria)}</p>
          <button class="botao leve" id="jogo-de-novo" type="button">Jogar de novo</button>
        </div>
      </div>
    </section>

    <section class="cena" id="vales">
      <div class="coluna">
        ${cabeca(d.vales.numero, d.vales.titulo, d.vales.intro)}
        <div class="vales">
          ${d.vales.lista.map((t, i) => `<div class="vale"><div class="vale-dentro"><span class="vale-canhoto">vale</span><p class="vale-texto">${esc(t)}</p></div><canvas aria-label="Raspadinha ${i + 1}: raspe para revelar"></canvas></div>`).join('')}
        </div>
      </div>
    </section>

    <section class="cena" id="carta">
      <div class="coluna">
        ${cabeca(d.carta.numero, d.carta.titulo)}
      </div>
      <article class="papel-carta">
        <span class="selo-mini" aria-hidden="true">M</span>
        <p class="carta-saudacao">${esc(d.carta.saudacao)}</p>
        ${d.carta.paragrafos.map((p) => `<p class="carta-p">${esc(p)}</p>`).join('')}
        <p class="carta-despedida">${esc(d.carta.despedida)}</p>
        <p class="carta-assinatura">${esc(d.assinatura)}</p>
      </article>
    </section>

    <section class="cena final" id="final">
      <div class="coluna">
        <div id="final-pergunta">
          <p class="cap-numero">${esc(d.final.kicker)}</p>
          <p class="final-antes">${esc(d.final.antes)}</p>
          <p class="final-pergunta">${esc(d.final.pergunta)}</p>
          <div class="final-botoes" id="final-botoes">${d.final.botoes.map((b) => `<button class="botao" type="button">${esc(b)}</button>`).join('')}</div>
        </div>
        <div class="final-resposta" id="final-resposta" hidden>
          <p class="final-titulo">${d.final.titulo.split(/,\s*/).map((t, i, arr) => `<span>${esc(t)}${i < arr.length - 1 ? ',' : ''}</span>`).join('')}</p>
          <p class="final-texto">${esc(d.final.texto)}</p>
          <p class="final-assinatura">${esc(d.assinatura)}</p>
          <button class="coracao-btn" id="coracao" type="button" aria-label="${esc(d.final.coracao)}">
            <svg viewBox="-20 -16 40 36" aria-hidden="true"><defs><linearGradient id="cor-coracao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C77FB0"/><stop offset="1" stop-color="#6B1E3D"/></linearGradient></defs><path d="${svgCoracao(0, 0, 17)}" fill="url(#cor-coracao)" stroke="#E2CCF4" stroke-width=".6"/></svg>
          </button>
          <p class="lingua" id="lingua"><span class="lingua-dica">${esc(d.final.coracao)}</span></p>
          <button class="botao leve final-rever" id="rever" type="button">${esc(d.final.rever)}</button>
          <p class="final-rodape">${esc(d.final.rodape)}</p>
        </div>
      </div>
    </section>`;

    const main = $('#conteudo');
    main.innerHTML = html;
    ligar(d, lista);
    Fotos.carregarTodas(lista.map((f) => f.id));
  }

  /* ------------------------------------------------------------ comportamentos */
  function ligar(d, lista) {
    // revelação das polaroids (como uma foto instantânea)
    const revelar = (fig) => {
      const img = $('img', fig);
      if (img.classList.contains('carregou') && fig.dataset.visivel) setTimeout(() => fig.classList.add('revelada'), 120);
    };
    const obsFoto = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.dataset.visivel = '1'; revelar(e.target); obsFoto.unobserve(e.target); }
    }), { threshold: 0.45 });
    $$('.polaroid').forEach((fig) => {
      const img = $('img', fig);
      img.addEventListener('load', () => { img.classList.add('carregou'); revelar(fig); });
      obsFoto.observe(fig);
      const abrir = () => Lightbox.abrir(lista, Number(fig.dataset.i));
      fig.addEventListener('click', abrir);
      fig.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
    });

    // céu: carrega só quando estiver chegando perto
    const obsCeu = new IntersectionObserver(async (es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      obsCeu.disconnect();
      try {
        await carregarScript('assets/data/stars.js');
        await carregarScript('assets/data/bodies.js');
        await carregarScript('assets/js/sky.js');
        window.Ceu.iniciar({ textos: d.ceu, nomes: `${d.nome} & ${d.assinatura}`, avisar, Festa, Sobre, esc });
      } catch (e) {
        $('#ceu-carregando').textContent = 'Não consegui carregar as estrelas. Recarregue a página.';
      }
    }, { rootMargin: '900px 0px' });
    obsCeu.observe($('#ceu'));

    // o que eu amo
    $$('.amo-botao').forEach((b) => b.addEventListener('click', () => {
      const li = b.closest('.amo-item'), on = !li.classList.contains('aberto');
      li.classList.toggle('aberto', on);
      b.setAttribute('aria-expanded', String(on));
    }));

    Pote.iniciar(d);
    Jogo.iniciar(d);

    // final
    $('#final-botoes').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const r = b.getBoundingClientRect();
      Festa.explosao(r.left + r.width / 2, r.top + r.height / 2, 70, 1.4);
      Festa.chuva(110);
      $('#final-pergunta').hidden = true;
      $('#final-resposta').hidden = false;
      store.set('mariana.sim', '1');
    });
    let li = -1;
    $('#coracao').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      li = (li + 1) % d.final.linguas.length;
      const [nome, frase] = d.final.linguas[li];
      $('#lingua').innerHTML = `<span class="lingua-texto" dir="auto">${esc(frase)}</span><span class="lingua-nome">${esc(nome)}</span>`;
      btn.classList.remove('bate'); void btn.offsetWidth; btn.classList.add('bate');
      const r = btn.getBoundingClientRect();
      Festa.explosao(r.left + r.width / 2, r.top + r.height / 2, 16, 0.7);
    });
    $('#rever').addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduz ? 'auto' : 'smooth' }));
  }

  /* ------------------------------------------------------------ lightbox */
  const Lightbox = (() => {
    const el = $('#lightbox');
    let lista = [], i = 0, aberto = false, foco = null, x0 = null, y0 = null;
    el.innerHTML = `
      <button class="lb-btn lb-fechar" type="button" aria-label="Fechar">×</button>
      <figure class="lb-fig"><img class="lb-img" alt=""><figcaption class="lb-legenda"><span class="lb-texto"></span><span class="lb-quando"></span></figcaption></figure>
      <p class="lb-cont"></p>
      <button class="lb-btn lb-ant" type="button" aria-label="Foto anterior">‹</button>
      <button class="lb-btn lb-prox" type="button" aria-label="Próxima foto">›</button>`;
    const img = $('.lb-img', el);
    function mostrar() {
      const f = lista[i], alvo = i;
      img.alt = f.legenda;
      if (Fotos.thumbs[f.id]) img.src = Fotos.thumbs[f.id]; else img.removeAttribute('src');
      $('.lb-texto', el).textContent = f.legenda;
      $('.lb-quando', el).textContent = f.quando;
      $('.lb-cont', el).textContent = `${i + 1} de ${lista.length}`;
      Fotos.url(f.id, 'f').then((u) => { if (aberto && alvo === i) img.src = u; }).catch(() => {});
      [1, -1].forEach((dlt) => Fotos.url(lista[(i + dlt + lista.length) % lista.length].id, 'f').catch(() => {}));
    }
    const passo = (dlt) => { i = (i + dlt + lista.length) % lista.length; mostrar(); };
    function fechar() {
      if (!aberto) return;
      aberto = false; el.hidden = true;
      document.body.classList.remove('travado');
      if (foco && foco.focus) foco.focus({ preventScroll: true });
    }
    $('.lb-fechar', el).addEventListener('click', fechar);
    $('.lb-ant', el).addEventListener('click', () => passo(-1));
    $('.lb-prox', el).addEventListener('click', () => passo(1));
    el.addEventListener('click', (e) => { if (e.target === el) fechar(); });
    el.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
    el.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) passo(dx < 0 ? 1 : -1);
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) fechar();
    });
    addEventListener('keydown', (e) => {
      if (!aberto) return;
      if (e.key === 'Escape') fechar();
      if (e.key === 'ArrowRight') passo(1);
      if (e.key === 'ArrowLeft') passo(-1);
    });
    return {
      abrir(l, idx) {
        lista = l; i = idx; aberto = true; foco = document.activeElement;
        el.hidden = false;
        document.body.classList.add('travado');
        mostrar();
        $('.lb-fechar', el).focus({ preventScroll: true });
      }
    };
  })();

  /* ------------------------------------------------------------ pote de bilhetes */
  const Pote = {
    iniciar(d) {
      this.d = d;
      this.lista = d.bilhetes.lista;
      this.coracoes = $$('#pote .coracao-pote');
      this.lidos = Math.min(this.lista.length, parseInt(store.get('mariana.bilhetes') || '0', 10) || 0);
      for (let k = 0; k < this.lidos; k++) this.coracoes[this.coracoes.length - 1 - k].style.display = 'none';
      this.atualizar();
      $('#pote').addEventListener('click', () => this.tirar());
      $('#ver-todos').addEventListener('click', (e) => this.todos(e.currentTarget));
    },
    tirar() {
      if (this.lidos >= this.lista.length) {
        Sobre.abrir(`<div class="bilhete"><span class="bilhete-num">♡</span><p class="bilhete-texto">${esc(this.d.bilhetes.acabou)}</p></div><button class="botao leve" type="button" data-fechar>Fechar</button>`, 'Bilhete');
        return;
      }
      const n = this.lidos;
      const cor = this.coracoes[this.coracoes.length - 1 - n];
      if (cor) { cor.classList.add('saindo'); setTimeout(() => { cor.style.display = 'none'; }, 900); }
      this.lidos++;
      store.set('mariana.bilhetes', String(this.lidos));
      this.atualizar();
      setTimeout(() => {
        Sobre.abrir(`<div class="bilhete"><span class="bilhete-num">Bilhete nº ${n + 1}</span><p class="bilhete-texto">${esc(this.lista[n])}</p></div><button class="botao leve" type="button" data-fechar>Guardar no coração</button>`, `Bilhete número ${n + 1}`);
      }, reduz ? 0 : 420);
    },
    atualizar() {
      $('#pote-contagem').textContent = this.lidos >= this.lista.length
        ? `Você já leu os ${this.lista.length}.`
        : this.lidos === 0 ? 'Toque no pote para tirar o primeiro.' : `${this.lidos} de ${this.lista.length} lidos`;
    },
    todos(btn) {
      const ol = $('#todos-bilhetes');
      if (!ol.childElementCount) {
        ol.innerHTML = this.lista.map((t, i) => `<li style="--r:${[-0.8, 0.7, -0.4, 0.9][i % 4]}deg"><b>${i + 1}</b>${esc(t)}</li>`).join('');
      }
      ol.hidden = !ol.hidden;
      btn.setAttribute('aria-expanded', String(!ol.hidden));
      btn.textContent = ol.hidden ? 'Ver todos' : 'Esconder';
    }
  };

  /* ------------------------------------------------------------ jogo da memória */
  const VERSO = '<svg viewBox="-18 -14 36 34" aria-hidden="true"><path d="' + svgCoracao(0, 0, 15) + '" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  const Jogo = {
    iniciar(d) {
      this.d = d;
      this.grade = $('#jogo-grade');
      $('#jogo-de-novo').addEventListener('click', () => this.montar());
      this.grade.addEventListener('click', (e) => { const b = e.target.closest('.carta-jogo'); if (b) this.virar(b); });
      this.montar();
    },
    montar() {
      const cartas = [];
      this.d.jogo.fotos.forEach(([id, pos]) => cartas.push({ id, pos }, { id, pos }));
      for (let k = cartas.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0; [cartas[k], cartas[j]] = [cartas[j], cartas[k]]; }
      this.grade.innerHTML = cartas.map((c, k) => `<button class="carta-jogo" type="button" data-id="${c.id}" aria-label="Carta ${k + 1}"><span class="gira"><span class="face face-verso">${VERSO}</span><span class="face face-frente"><img data-foto="${c.id}" alt="" style="object-position:${c.pos}"></span></span></button>`).join('');
      $$('img[data-foto]', this.grade).forEach((img) => { const u = Fotos.thumbs[img.dataset.foto]; if (u) img.src = u; });
      this.abertas = []; this.pares = 0; this.jogadas = 0; this.espera = false;
      $('#jogo-fim').hidden = true;
      this.atualizar();
    },
    virar(b) {
      if (this.espera || b.classList.contains('virada') || b.classList.contains('par')) return;
      b.classList.add('virada');
      this.abertas.push(b);
      if (this.abertas.length < 2) return;
      this.jogadas++;
      const [a, c] = this.abertas;
      this.abertas = [];
      if (a.dataset.id === c.dataset.id) {
        this.pares++;
        setTimeout(() => { a.classList.add('par'); c.classList.add('par'); }, 380);
        if (this.pares === this.d.jogo.fotos.length) this.vitoria();
      } else {
        this.espera = true;
        setTimeout(() => { a.classList.remove('virada'); c.classList.remove('virada'); this.espera = false; }, 1000);
      }
      this.atualizar();
    },
    atualizar() {
      $('#jogo-jogadas').textContent = this.jogadas;
      $('#jogo-pares').textContent = this.pares;
    },
    vitoria() {
      setTimeout(() => {
        $('#jogo-fim').hidden = false;
        const r = this.grade.getBoundingClientRect();
        Festa.explosao(r.left + r.width / 2, r.top + r.height / 2, 60, 1.2);
      }, 750);
    }
  };

  /* ------------------------------------------------------------ raspadinhas */
  const Raspa = {
    iniciar() {
      $$('.vale').forEach((v) => this.preparar(v));
      let t = null;
      addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => $$('.vale:not(.raspado)').forEach((v) => this.pintar(v)), 200); });
    },
    async pintar(v) {
      const cv = $('canvas', v), r = v.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      const x = cv.getContext('2d', { willReadFrequently: true });
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.globalCompositeOperation = 'source-over';
      const g = x.createLinearGradient(0, 0, r.width, r.height);
      g.addColorStop(0, '#A788C8'); g.addColorStop(0.42, '#E6D6F3'); g.addColorStop(0.58, '#D3BDEA'); g.addColorStop(1, '#9676BA');
      x.fillStyle = g; x.fillRect(0, 0, r.width, r.height);
      for (let k = 0; k < 170; k++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.55})`; x.fillRect(Math.random() * r.width, Math.random() * r.height, 1.4, 1.4); }
      try { await document.fonts.load('600 28px Caveat'); } catch (e) { /* segue com a fonte reserva */ }
      x.fillStyle = 'rgba(58,21,48,.7)';
      x.font = '600 28px Caveat, cursive';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('raspe aqui ♡', r.width / 2, r.height / 2);
    },
    preparar(v) {
      const cv = $('canvas', v);
      let ativo = false, ult = null, cont = 0;
      this.pintar(v);
      const ponto = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      const risca = (p) => {
        const x = cv.getContext('2d');
        x.globalCompositeOperation = 'destination-out';
        x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = 38;
        x.beginPath(); x.moveTo((ult || p)[0], (ult || p)[1]); x.lineTo(p[0], p[1]); x.stroke();
        ult = p;
      };
      cv.addEventListener('pointerdown', (e) => { ativo = true; ult = null; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ok */ } risca(ponto(e)); e.preventDefault(); });
      cv.addEventListener('pointermove', (e) => { if (!ativo) return; risca(ponto(e)); if (++cont % 10 === 0) this.checar(v); });
      const fim = () => { if (!ativo) return; ativo = false; ult = null; this.checar(v); };
      cv.addEventListener('pointerup', fim);
      cv.addEventListener('pointercancel', fim);
    },
    checar(v) {
      if (v.classList.contains('raspado')) return;
      const cv = $('canvas', v), x = cv.getContext('2d');
      let dados;
      try { dados = x.getImageData(0, 0, cv.width, cv.height).data; } catch (e) { return; }
      let limpo = 0, total = 0;
      for (let k = 3; k < dados.length; k += 4 * 11) { total++; if (dados[k] < 40) limpo++; }
      if (total && limpo / total > 0.5) {
        v.classList.add('raspado');
        const r = v.getBoundingClientRect();
        Festa.explosao(r.left + r.width / 2, r.top + r.height / 2, 26, 0.8);
      }
    }
  };

  /* ------------------------------------------------------------ contador */
  const Contador = {
    iniciar(d) {
      this.d = d;
      this.inicio = new Date(d.inicio);
      this.luas = (d.luasCheias || []).map((s) => new Date(s).getTime());
      this.frase = $('#contador-frase');
      this.mais = $('#contador-mais');
      this.tick();
      setInterval(() => this.tick(), 1000);
    },
    tick() {
      const agora = new Date(), c = this.d.contador;
      const t = diferenca(this.inicio, agora);
      const p = (n, s, pl) => `<span class="n">${n}</span> ${n === 1 ? s : pl}`;
      const partes = [];
      if (t.meses) partes.push(p(t.meses, 'mês', 'meses'));
      if (t.dias) partes.push(p(t.dias, 'dia', 'dias'));
      if (t.horas) partes.push(p(t.horas, 'hora', 'horas'));
      if (t.minutos) partes.push(p(t.minutos, 'minuto', 'minutos'));
      partes.push(p(t.segundos, 'segundo', 'segundos'));
      const frase = partes.length > 1 ? partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1] : partes[0];
      this.frase.innerHTML = `${esc(c.kicker)} ${frase} ${esc(c.depois)}`;
      const min = Math.max(0, Math.floor((agora - this.inicio) / 6e4));
      const luas = this.luas.filter((x) => x > this.inicio.getTime() && x <= agora.getTime()).length;
      let mais = `São <span class="n">${num(min)}</span> ${esc(c.minutos)}, umas <span class="n">${num(min * 72)}</span> ${esc(c.batidas)}`;
      mais += luas ? ` e <span class="n">${luas}</span> ${esc(luas === 1 ? c.luas[0] : c.luas[1])}.` : '.';
      this.mais.innerHTML = mais;
    }
  };

  /* ------------------------------------------------------------ escrita do nome */
  function escreverNome() {
    const sec = $('#abertura');
    const paths = $$('.nome-svg path', sec);
    const lens = paths.map((p) => { try { return p.getTotalLength(); } catch (e) { return 1000; } });
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    const T = 3.0;
    let acc = 0;
    paths.forEach((p, k) => {
      const L = lens[k], dur = Math.max(0.3, T * L / total);
      p.style.strokeDasharray = `${L} ${L}`;
      p.style.strokeDashoffset = String(L);
      p.style.transition = `stroke-dashoffset ${dur.toFixed(2)}s cubic-bezier(.5,0,.35,1) ${acc.toFixed(2)}s, fill-opacity 1.5s ease ${(T - 0.3).toFixed(2)}s`;
      acc += dur * 0.88;
    });
    void sec.offsetWidth;
    requestAnimationFrame(() => sec.classList.add('escrevendo'));
  }

  /* ------------------------------------------------------------ progresso de leitura */
  (() => {
    const bar = $('#progresso');
    let pend = false;
    addEventListener('scroll', () => {
      if (pend) return;
      pend = true;
      requestAnimationFrame(() => {
        pend = false;
        const max = document.documentElement.scrollHeight - innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      });
    }, { passive: true });
  })();

  /* ------------------------------------------------------------ entrada */
  function entrar(d) {
    const main = $('#conteudo');
    main.hidden = false;
    document.body.classList.remove('travado');
    document.body.classList.add('aberta');
    window.scrollTo(0, 0);
    $('#musica').hidden = false;
    escreverNome();
    Contador.iniciar(d);
    Raspa.iniciar();
    // esconde a dica "arraste" quando todas as fotos cabem na tela
    $$('.fotos').forEach((f) => {
      const dica = f.nextElementSibling;
      if (dica && dica.classList.contains('fotos-dica') && f.scrollWidth <= f.clientWidth + 4) dica.hidden = true;
    });
  }

  /* ------------------------------------------------------------ portão */
  (() => {
    const form = $('#fechadura'), dia = $('#dia'), mes = $('#mes'), dica = $('#dica'), btn = $('#abrir');
    const selo = $('#selo'), env = $('#envelope'), portao = $('#portao');
    const DICAS = ['Hmm, não foi esse dia. Tente de novo.', 'Dica: o dia do pedido.', 'Dica: foi num sábado de outubro.'];
    let tentativas = 0, ocupado = false;

    if (!window.crypto || !window.crypto.subtle || !window.__V) {
      dica.textContent = 'Abra este link no Chrome ou no Safari para destrancar a carta.';
    }

    const soDigitos = (el) => { el.value = el.value.replace(/\D/g, '').slice(0, 2); };
    dia.addEventListener('input', () => { soDigitos(dia); if (dia.value.length === 2) mes.focus(); });
    mes.addEventListener('input', () => { soDigitos(mes); if (mes.value.length === 2 && dia.value) enviar(); });
    mes.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !mes.value) dia.focus(); });
    form.addEventListener('submit', (e) => { e.preventDefault(); enviar(); });

    async function enviar() {
      if (ocupado) return;
      const d = parseInt(dia.value, 10), m = parseInt(mes.value, 10);
      if (!d) { dia.focus(); return; }
      if (!m) { mes.focus(); return; }
      ocupado = true; btn.disabled = true; btn.textContent = 'Abrindo…';
      const senha = String(d).padStart(2, '0') + String(m).padStart(2, '0');
      const ok = d <= 31 && m <= 12 && !!window.crypto && !!crypto.subtle && await Cofre.destrancar(senha);
      ocupado = false; btn.disabled = false; btn.textContent = 'Abrir';
      if (!ok) { errou(); return; }
      store.set(CHAVE, senha);
      destrancou();
    }
    function errou() {
      tentativas++;
      form.classList.remove('errou'); void form.offsetWidth; form.classList.add('errou');
      dica.textContent = DICAS[Math.min(tentativas - 1, DICAS.length - 1)];
      mes.value = '';
      dia.focus(); dia.select();
    }
    function destrancou() {
      const d = Cofre.dados;
      if (document.activeElement) document.activeElement.blur();
      montar(d);
      Musica.preparar(d.musica || 'assets/audio/valsa-para-mariana.mp3');
      form.classList.add('sumindo');
      setTimeout(() => { form.hidden = true; }, 500);
      const bv = $('#boasvindas');
      $('.boasvindas-frase', bv).textContent = d.boasVindas;
      $('.boasvindas-toque', bv).textContent = d.toqueSelo;
      setTimeout(() => { bv.hidden = false; }, 450);
      selo.disabled = false;
      selo.classList.add('pronto');
    }
    selo.addEventListener('click', () => {
      if (selo.classList.contains('usado') || !Cofre.dados) return;
      selo.classList.add('usado'); selo.classList.remove('pronto');
      Musica.tocar();
      env.classList.add('quebrado');
      portao.classList.add('abrindo');
      const r = selo.getBoundingClientRect();
      Festa.explosao(r.left + r.width / 2, r.top + r.height / 2, 28, 0.8);
      $('#boasvindas').hidden = true;
      setTimeout(() => env.classList.add('aberto'), reduz ? 0 : 450);
      setTimeout(() => { portao.classList.add('sumindo'); entrar(Cofre.dados); }, reduz ? 100 : 2500);
      setTimeout(() => { portao.hidden = true; }, reduz ? 200 : 3600);
    });

    const salvo = store.get(CHAVE);
    if (salvo && /^\d{4}$/.test(salvo)) {
      dia.value = salvo.slice(0, 2);
      mes.value = salvo.slice(2);
      dica.textContent = 'Que bom te ver de novo.';
    }
  })();
})();
