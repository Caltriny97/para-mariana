/* O céu do Rio de Janeiro na noite de 3 de outubro de 2026.
   Estrelas: catálogo HYG (via d3-celestial). Planetas e Lua: calculados com astronomy-engine. */
(() => {
  'use strict';
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const LAT = -22.9068, LON = -43.1729;
  const SL = Math.sin(LAT * D2R), CL = Math.cos(LAT * D2R);
  const DADOS = window.SKY_DATA, CORPOS = window.SKY_BODIES;
  const BASE = CORPOS.start; // 18h00 de 3/out (BRT)
  const FOTO = 91; // 19h31, minutos depois das 18h
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const rnd = (a, b) => a + Math.random() * (b - a);

  const NOME_CORPO = { Moon: 'Lua', Mercury: 'Mercúrio', Venus: 'Vênus', Mars: 'Marte', Jupiter: 'Júpiter', Saturn: 'Saturno' };
  const DESC_CORPO = { Venus: 'o planeta do amor', Saturn: 'a um dia da oposição', Jupiter: 'o maior dos planetas', Mars: 'o planeta vermelho', Mercury: 'o mais próximo do Sol' };
  const DESC_ESTRELA = {
    'Vega': 'a tecelã da lenda dos amantes', 'Altair': 'o pastor da lenda dos amantes',
    'Alfa Centauri': 'a estrela mais próxima que dá pra ver', 'Acrux': 'o pé do Cruzeiro do Sul',
    'Antares': 'o coração do Escorpião', 'Fomalhaut': 'a boca do Peixe Austral', 'Achernar': 'o fim do rio Erídano',
    'Sírius': 'a estrela mais brilhante do céu', 'Canopus': 'a segunda mais brilhante', 'Deneb': 'a cauda do Cisne',
    'Aldebaran': 'o olho do Touro', 'Rigel': 'o pé de Órion', 'Betelgeuse': 'o ombro de Órion'
  };
  const ROTULADAS = new Set(['Vega', 'Altair', 'Deneb', 'Fomalhaut', 'Antares', 'Achernar', 'Alfa Centauri', 'Acrux', 'Sírius', 'Canopus', 'Rigel', 'Betelgeuse', 'Aldebaran', 'Capella', 'Procyon', 'Pólux', 'Arcturus', 'Spica', 'Régulus', 'Hadar', 'Peacock']);
  const COR_CORPO = { Venus: '#FFF6E8', Saturn: '#F2DDAE', Jupiter: '#FBF3E4', Mars: '#F2A983', Mercury: '#EADFD2' };

  /* -------------------------------------------------- astronomia */
  const lst = (ms) => {
    const d = ms / 864e5 + 2440587.5 - 2451545.0;
    return (((280.46061837 + 360.98564736629 * d + LON) % 360) + 360) % 360;
  };
  function altAz(ra, dec, L) {
    const H = (L - ra) * D2R, d = dec * D2R;
    const sd = Math.sin(d), cd = Math.cos(d), cH = Math.cos(H);
    const alt = Math.asin(clamp(sd * SL + cd * CL * cH, -1, 1));
    const A = Math.atan2(Math.sin(H) * cd, cH * SL * cd - sd * CL);
    return [alt * R2D, (A * R2D + 540) % 360];
  }
  const lerpAng = (a, b, t) => { let d = b - a; if (d > 180) d -= 360; if (d < -180) d += 360; return a + d * t; };
  function corposEm(ms) {
    const rows = CORPOS.rows, f = (ms - BASE) / (CORPOS.step * 60000);
    const i = clamp(Math.floor(f), 0, rows.length - 2), t = clamp(f - i, 0, 1);
    const a = rows[i], b = rows[i + 1], out = {};
    CORPOS.keys.forEach((k, j) => {
      out[k] = { alt: a[2 * j] + (b[2 * j] - a[2 * j]) * t, az: (lerpAng(a[2 * j + 1], b[2 * j + 1], t) + 360) % 360 };
    });
    const n = CORPOS.keys.length * 2;
    out.Moon.frac = a[n] + (b[n] - a[n]) * t;
    out.Moon.limbo = lerpAng(a[n + 1], b[n + 1], t);
    return out;
  }
  const proj = (G, alt, az) => {
    const r = G.R * Math.tan((90 - alt) * D2R / 2), a = az * D2R;
    return [G.cx - r * Math.sin(a), G.cy - r * Math.cos(a)];
  };

  /* -------------------------------------------------- cores e sprites */
  const TONS = [[-0.4, [165, 188, 255]], [0, [208, 218, 255]], [0.35, [246, 242, 255]], [0.65, [255, 241, 226]], [1.0, [255, 216, 176]], [1.6, [255, 186, 138]]];
  function corBV(bv) {
    let k = 0;
    while (k < TONS.length - 2 && bv > TONS[k + 1][0]) k++;
    const [b0, c0] = TONS[k], [b1, c1] = TONS[k + 1];
    const t = clamp((bv - b0) / (b1 - b0), 0, 1);
    return c0.map((v, i) => Math.round((v + (c1[i] - v) * t) * 0.8 + [241, 231, 249][i] * 0.2));
  }
  const BUCKETS = [-0.2, 0.15, 0.5, 0.85, 1.3, 1.8];
  const sprites = BUCKETS.map((bv) => {
    const [r, g, b] = corBV(bv), s = document.createElement('canvas');
    s.width = s.height = 64;
    const x = s.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(0.18, `rgba(${r},${g},${b},.95)`);
    gr.addColorStop(0.32, `rgba(${r},${g},${b},.28)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return s;
  });
  const spriteDe = (bv) => { let k = 0; while (k < BUCKETS.length - 1 && bv > (BUCKETS[k] + BUCKETS[k + 1]) / 2) k++; return sprites[k]; };
  const ESTRELAS = DADOS.stars.map(([ra, dec, mag, bv], i) => ({ ra, dec, mag, spr: spriteDe(bv), nome: DADOS.named[i] || null, fase: Math.random() * 6.28, vel: rnd(0.6, 1.6) }));

  /* -------------------------------------------------- desenho estático (cache) */
  function desenharFundo(ctx, S, ms, op) {
    const G = { cx: S / 2, cy: S / 2, R: S * 0.43 }, L = lst(ms), c = corposEm(ms);
    const escuro = clamp((-c.Sun.alt - 6) / 12, 0, 1); // 0 = crepúsculo, 1 = noite fechada
    const limite = 1.2 + 4.4 * escuro; // magnitude limite visível
    const u = S / 560; // unidade de escala
    const dpr = op.dpr || 1;
    const fs = (base, min) => Math.round(Math.max(min * dpr, base * u));
    const alvos = [], brilhantes = [];

    ctx.save();
    ctx.beginPath(); ctx.arc(G.cx, G.cy, G.R, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(G.cx, G.cy, 0, G.cx, G.cy, G.R);
    g.addColorStop(0, '#120A24'); g.addColorStop(0.75, '#1B1031'); g.addColorStop(1, '#27143E');
    ctx.fillStyle = g; ctx.fill();
    ctx.clip();

    // brilho do crepúsculo
    if (c.Sun.alt > -19) {
      const k = clamp((c.Sun.alt + 19) / 13, 0, 1), [hx, hy] = proj(G, 0, c.Sun.az);
      const gg = ctx.createRadialGradient(hx, hy, 0, hx, hy, G.R * 1.35);
      gg.addColorStop(0, `rgba(244,168,176,${0.62 * k})`); gg.addColorStop(0.28, `rgba(178,112,190,${0.42 * k})`);
      gg.addColorStop(0.65, `rgba(80,46,120,${0.22 * k})`); gg.addColorStop(1, 'rgba(40,20,70,0)');
      ctx.fillStyle = gg; ctx.fillRect(0, 0, S, S);
    }

    // Via Láctea (desenhada pequena e ampliada: fica naturalmente difusa)
    const w = Math.max(80, Math.round(S * 0.2)), off = document.createElement('canvas');
    off.width = off.height = w;
    const o = off.getContext('2d');
    o.scale(w / S, w / S);
    for (const [nivel, polys] of DADOS.mw) {
      o.fillStyle = `rgba(218,200,255,${0.045 + nivel * 0.013})`;
      for (const aneis of polys) {
        let algumAcima = false;
        o.beginPath();
        for (const anel of aneis) {
          for (let i = 0; i < anel.length; i += 2) {
            let [alt, az] = altAz(anel[i], anel[i + 1], L);
            if (alt > 0) algumAcima = true;
            if (alt < -35) alt = -35;
            const [x, y] = proj(G, alt, az);
            if (i) o.lineTo(x, y); else o.moveTo(x, y);
          }
          o.closePath();
        }
        if (algumAcima) o.fill('evenodd');
      }
    }
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.75 * escuro;
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 0, 0, S, S);
    ctx.restore();

    // linhas das constelações
    if (op.linhas) {
      ctx.strokeStyle = `rgba(200,168,230,${0.22 + 0.16 * escuro})`;
      ctx.lineWidth = Math.max(0.8, 1.05 * u);
      ctx.lineJoin = 'round';
      for (const l of DADOS.lines) {
        ctx.beginPath();
        let caneta = false;
        for (let i = 0; i < l.length; i += 2) {
          const [alt, az] = altAz(l[i], l[i + 1], L);
          if (alt < -12) { caneta = false; continue; }
          const [x, y] = proj(G, alt, az);
          if (caneta) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          caneta = true;
        }
        ctx.stroke();
      }
      // nomes das constelações principais
      ctx.font = `italic 500 ${fs(11.5, 10.5)}px "Cormorant Garamond", serif`;
      ctx.fillStyle = `rgba(212,188,238,${0.3 + 0.25 * escuro})`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const [nome, ra, dec, rank] of DADOS.labels) {
        if (rank > 1) continue;
        const [alt, az] = altAz(ra, dec, L);
        if (alt < 14) continue;
        const [x, y] = proj(G, alt, az);
        ctx.fillText(nome, x, y);
      }
    }

    // estrelas
    for (const s of ESTRELAS) {
      if (s.mag > limite) continue;
      const [alt, az] = altAz(s.ra, s.dec, L);
      if (alt < 0) continue;
      const [x, y] = proj(G, alt, az);
      const ext = clamp(0.5 + alt / 30, 0.5, 1); // atmosfera apaga as estrelas perto do horizonte
      const a = clamp(1.15 - s.mag * 0.16, 0.22, 1) * ext * clamp((limite - s.mag) / 1.2, 0.25, 1);
      const d = Math.max(2.2, (7.4 - s.mag * 1.05)) * u * 2.1;
      if (s.mag < 3.2) brilhantes.push({ x, y, d, a, spr: s.spr, fase: s.fase, vel: s.vel });
      else { ctx.globalAlpha = a; ctx.drawImage(s.spr, x - d / 2, y - d / 2, d, d); }
      if (s.nome) alvos.push({ x, y, nome: s.nome, desc: DESC_ESTRELA[s.nome] || '', mag: s.mag, rotular: ROTULADAS.has(s.nome) && alt > 4 });
    }
    ctx.globalAlpha = 1;

    // planetas (não cintilam)
    for (const k of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
      const b = c[k];
      if (b.alt < 1.5 || (k === 'Mercury' && escuro < 0.9 && b.alt < 6)) continue;
      const [x, y] = proj(G, b.alt, b.az), mag = CORPOS.mags[k];
      const d = Math.max(7, 10 - mag * 1.5) * u * 1.6;
      const gl = ctx.createRadialGradient(x, y, 0, x, y, d);
      gl.addColorStop(0, COR_CORPO[k]); gl.addColorStop(0.16, COR_CORPO[k]); gl.addColorStop(0.3, 'rgba(255,240,220,.3)'); gl.addColorStop(1, 'rgba(255,240,220,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, d, 0, Math.PI * 2); ctx.fill();
      alvos.push({ x, y, nome: NOME_CORPO[k], desc: DESC_CORPO[k], mag, rotular: true, planeta: true });
    }

    // Lua
    const lua = c.Moon;
    if (lua.alt > -0.5) {
      const [x, y] = proj(G, lua.alt, lua.az), r = 9.5 * u;
      const dx = G.cx - x, dy = G.cy - y, n = Math.hypot(dx, dy) || 1, a = lua.az * D2R;
      const th = lua.limbo * D2R;
      const vx = Math.cos(th) * dx / n + Math.sin(th) * -Math.cos(a), vy = Math.cos(th) * dy / n + Math.sin(th) * Math.sin(a);
      desenharLua(ctx, x, y, r, lua.frac, Math.atan2(vy, vx));
      alvos.push({ x, y, nome: 'Lua', desc: `minguante, ${Math.round(lua.frac * 100)}% iluminada`, mag: -10, rotular: true, planeta: true });
    }

    ctx.restore();

    // rótulos (fora do recorte, para não cortar perto da borda)
    ctx.textBaseline = 'middle';
    for (const t of alvos) {
      if (!t.rotular) continue;
      ctx.font = t.planeta ? `italic 600 ${fs(13, 12.5)}px "Cormorant Garamond", serif` : `italic 500 ${fs(11.5, 11)}px "Cormorant Garamond", serif`;
      ctx.fillStyle = t.planeta ? 'rgba(236,214,176,.95)' : 'rgba(232,218,246,.78)';
      const largura = ctx.measureText(t.nome).width, dx = (t.planeta ? 10 : 7) * u, dy = (t.planeta ? 7 : 5) * u;
      const esquerda = t.x + dx + largura > G.cx + G.R * 0.98;
      ctx.textAlign = esquerda ? 'right' : 'left';
      ctx.fillText(t.nome, esquerda ? t.x - dx : t.x + dx, t.y - dy);
    }

    // horizonte, marcas e pontos cardeais
    ctx.strokeStyle = 'rgba(200,168,230,.6)'; ctx.lineWidth = Math.max(1, 1.2 * u);
    ctx.beginPath(); ctx.arc(G.cx, G.cy, G.R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,168,230,.22)';
    ctx.beginPath(); ctx.arc(G.cx, G.cy, G.R + 9 * u, 0, Math.PI * 2); ctx.stroke();
    for (let az = 0; az < 360; az += 10) {
      const a = az * D2R, l = az % 90 === 0 ? 9 : az % 30 === 0 ? 6 : 3.5;
      ctx.beginPath();
      ctx.moveTo(G.cx - (G.R + 1 * u) * Math.sin(a), G.cy - (G.R + 1 * u) * Math.cos(a));
      ctx.lineTo(G.cx - (G.R + l * u) * Math.sin(a), G.cy - (G.R + l * u) * Math.cos(a));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(226,204,244,.9)';
    ctx.font = `600 ${fs(15, 13)}px "Cormorant Garamond", serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [['N', 0], ['L', 90], ['S', 180], ['O', 270]].forEach(([t, az]) => {
      const a = az * D2R, rr = G.R + 22 * u;
      ctx.fillText(t, G.cx - rr * Math.sin(a), G.cy - rr * Math.cos(a));
    });
    return { G, alvos, brilhantes, escuro };
  }

  function desenharLua(ctx, x, y, r, k, ang) {
    ctx.save();
    const gl = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4);
    gl.addColorStop(0, 'rgba(250,240,225,.32)'); gl.addColorStop(1, 'rgba(250,240,225,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
    ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(70,58,92,.75)'; ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    ctx.ellipse(0, 0, Math.max(0.01, Math.abs(r * (2 * k - 1))), r, 0, Math.PI / 2, -Math.PI / 2, k < 0.5);
    ctx.closePath();
    ctx.fillStyle = '#F6EEDD'; ctx.fill();
    ctx.restore();
  }

  /* -------------------------------------------------- controlador */
  const Ceu = {
    iniciar(op) {
      this.op = op;
      this.quadro = document.getElementById('ceu-quadro');
      this.canvas = document.getElementById('ceu-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.rotulo = document.getElementById('ceu-rotulo');
      this.tempo = document.getElementById('ceu-tempo');
      this.hora = document.getElementById('ceu-hora');
      this.legenda = document.getElementById('ceu-legenda');
      this.btnLinhas = document.getElementById('ceu-linhas');
      this.btnVoltar = document.getElementById('ceu-voltar');
      this.minutos = FOTO;
      this.linhas = true;
      this.cache = document.createElement('canvas');
      this.cadente = null;
      this.proxCadente = performance.now() + rnd(2500, 5000);
      this.visivel = false;

      const pronto = () => {
        this.tamanho();
        const c = document.getElementById('ceu-carregando');
        if (c) c.remove();
      };
      (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('italic 500 12px "Cormorant Garamond"'), document.fonts.load('600 12px "Cormorant Garamond"')]) : Promise.resolve()).then(pronto, pronto);

      let t = null;
      addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => this.tamanho(), 150); });
      this.tempo.addEventListener('input', () => {
        this.minutos = Number(this.tempo.value);
        this.rotulo.classList.remove('ver');
        this.atualizarHora();
        if (!this.pendente) { this.pendente = true; requestAnimationFrame(() => { this.pendente = false; this.reconstruir(); }); }
      });
      this.btnLinhas.addEventListener('click', () => {
        this.linhas = !this.linhas;
        this.btnLinhas.setAttribute('aria-pressed', String(this.linhas));
        this.reconstruir();
      });
      this.btnVoltar.addEventListener('click', () => { this.tempo.value = FOTO; this.tempo.dispatchEvent(new Event('input')); });
      document.getElementById('ceu-poster').addEventListener('click', () => this.poster());
      this.canvas.addEventListener('click', (e) => this.toque(e));

      new IntersectionObserver((es) => {
        this.visivel = es[0].isIntersecting;
        if (this.visivel && !this.raf) this.raf = requestAnimationFrame((tt) => this.laco(tt));
      }).observe(this.quadro);
      this.atualizarHora();
    },
    ms() { return BASE + this.minutos * 60000; },
    tamanho() {
      const r = this.quadro.getBoundingClientRect();
      if (!r.width) return;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.S = Math.round(r.width * this.dpr);
      this.canvas.width = this.canvas.height = this.S;
      this.cache.width = this.cache.height = this.S;
      this.reconstruir();
    },
    reconstruir() {
      if (!this.S) return;
      const x = this.cache.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, this.S, this.S);
      this.cena = desenharFundo(x, this.S, this.ms(), { linhas: this.linhas, dpr: this.dpr });
      this.pintar(performance.now());
    },
    atualizarHora() {
      const total = 18 * 60 + this.minutos, h = Math.floor(total / 60) % 24, m = total % 60;
      this.hora.textContent = `${h}h${String(m).padStart(2, '0')}`;
      const v = this.minutos;
      const leg = v <= 55 ? 'o céu ainda guardava um resto de pôr do sol'
        : v >= 86 && v <= 96 ? 'a hora da nossa foto'
        : v >= 108 && v <= 118 ? 'Vênus se despedindo no oeste'
        : v >= 357 && v <= 363 ? 'meia-noite'
        : v >= 433 && v <= 465 ? 'a Lua minguante nascendo no leste'
        : v >= 479 && v <= 505 ? 'Marte aparecendo no leste'
        : v >= 536 && v <= 565 ? 'Júpiter nascendo no leste'
        : v >= 640 ? 'o céu começando a clarear' : '';
      this.legenda.textContent = leg;
      this.btnVoltar.hidden = v === FOTO;
    },
    pintar(t) {
      if (!this.cena) return;
      const ctx = this.ctx, S = this.S, { G, brilhantes } = this.cena;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, S, S);
      ctx.drawImage(this.cache, 0, 0);
      ctx.save();
      ctx.beginPath(); ctx.arc(G.cx, G.cy, G.R, 0, Math.PI * 2); ctx.clip();
      for (const s of brilhantes) {
        const tw = 0.8 + 0.2 * Math.sin(t * 0.0022 * s.vel + s.fase);
        const d = s.d * (0.94 + 0.12 * tw);
        ctx.globalAlpha = s.a * tw;
        ctx.drawImage(s.spr, s.x - d / 2, s.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
      // estrela cadente
      const c = this.cadente;
      if (c) {
        const p = (t - c.t0) / c.dur;
        if (p >= 1.25) this.cadente = null;
        else {
          const pp = Math.min(1, p), hx = c.x + c.dx * pp, hy = c.y + c.dy * pp;
          const cauda = 0.45 * Math.min(1, pp * 2.5);
          const tx = hx - c.dx * cauda, ty = hy - c.dy * cauda;
          const fade = p > 1 ? 1 - (p - 1) / 0.25 : 1;
          const gr = ctx.createLinearGradient(tx, ty, hx, hy);
          gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(255,248,255,${0.95 * fade})`);
          ctx.strokeStyle = gr; ctx.lineWidth = 2.2 * S / 560; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
          ctx.globalAlpha = fade;
          ctx.drawImage(brilhantes.length ? brilhantes[0].spr : this.cache, hx - 7 * S / 560, hy - 7 * S / 560, 14 * S / 560, 14 * S / 560);
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    },
    laco(t) {
      if (!this.visivel) { this.raf = null; return; }
      this.raf = requestAnimationFrame((tt) => this.laco(tt));
      if (this.ultimo && t - this.ultimo < 40) return;
      this.ultimo = t;
      if (!this.cadente && t > this.proxCadente && this.cena && this.cena.escuro > 0.6) {
        const G = this.cena.G, a = rnd(0, Math.PI * 2), rr = rnd(0, G.R * 0.6), dir = rnd(0, Math.PI * 2), len = G.R * rnd(0.28, 0.42);
        this.cadente = { x: G.cx + Math.cos(a) * rr, y: G.cy + Math.sin(a) * rr, dx: Math.cos(dir) * len, dy: Math.sin(dir) * len, t0: t, dur: rnd(750, 1100) };
        this.proxCadente = t + rnd(6000, 11000);
      }
      this.pintar(t);
    },
    toque(e) {
      const r = this.canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) * this.dpr, y = (e.clientY - r.top) * this.dpr;
      if (this.cadente && performance.now() - this.cadente.t0 < this.cadente.dur * 1.6) {
        this.op.avisar(this.op.textos.pedido, 4200);
        this.op.Festa.explosao(e.clientX, e.clientY, 18, 0.7);
        this.cadente = null;
        return;
      }
      if (!this.cena) return;
      let melhor = null, dist = 30 * this.dpr;
      for (const a of this.cena.alvos) {
        const d = Math.hypot(a.x - x, a.y - y) - (a.planeta ? 6 * this.dpr : 0);
        if (d < dist) { dist = d; melhor = a; }
      }
      clearTimeout(this.tRotulo);
      if (!melhor) { this.rotulo.classList.remove('ver'); return; }
      this.rotulo.innerHTML = `${this.op.esc(melhor.nome)}${melhor.desc ? `<small>${this.op.esc(melhor.desc)}</small>` : ''}`;
      this.rotulo.style.left = `${melhor.x / this.dpr}px`;
      this.rotulo.style.top = `${melhor.y / this.dpr}px`;
      this.rotulo.classList.add('ver');
      this.tRotulo = setTimeout(() => this.rotulo.classList.remove('ver'), 3600);
    },
    async poster() {
      const W = 1500, H = 2100, c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      try { await Promise.all([document.fonts.load('400 120px "Great Vibes"'), document.fonts.load('italic 500 40px "Cormorant Garamond"'), document.fonts.load('600 30px "Cormorant Garamond"')]); } catch (e) { /* segue */ }
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#2A1438'); g.addColorStop(0.55, '#1C0D27'); g.addColorStop(1, '#16091F');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(244,236,251,.5)';
      for (let i = 0; i < 260; i++) { const r = Math.random() * 1.6 + 0.3; x.globalAlpha = Math.random() * 0.5; x.beginPath(); x.arc(Math.random() * W, Math.random() * H, r, 0, 6.28); x.fill(); }
      x.globalAlpha = 1;
      x.strokeStyle = 'rgba(200,168,230,.35)'; x.lineWidth = 2;
      x.strokeRect(46, 46, W - 92, H - 92);
      x.strokeStyle = 'rgba(200,168,230,.18)';
      x.strokeRect(62, 62, W - 124, H - 124);
      x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      x.fillStyle = '#F1E7F9';
      x.font = '400 128px "Great Vibes", cursive';
      x.fillText(this.op.textos.poster, W / 2, 270);
      const S = 1240, ch = document.createElement('canvas');
      ch.width = ch.height = S;
      desenharFundo(ch.getContext('2d'), S, this.ms(), { linhas: this.linhas });
      x.drawImage(ch, (W - S) / 2, 330);
      const total = 18 * 60 + this.minutos, hh = Math.floor(total / 60) % 24, mm = String(total % 60).padStart(2, '0');
      const dia = this.minutos >= 360 ? '4 de outubro de 2026' : '3 de outubro de 2026';
      x.fillStyle = '#E2CCF4';
      x.font = 'italic 500 58px "Cormorant Garamond", serif';
      x.fillText('Rio de Janeiro', W / 2, 1690);
      x.font = 'italic 500 46px "Cormorant Garamond", serif';
      x.fillText(`${dia}, ${hh}h${mm}`, W / 2, 1760);
      x.fillStyle = '#C8A8E6';
      x.font = '600 32px "Cormorant Garamond", serif';
      x.fillText('22°54′ S   43°10′ O', W / 2, 1820);
      x.fillStyle = '#F1E7F9';
      x.font = '400 96px "Great Vibes", cursive';
      x.fillText(this.op.nomes, W / 2, 1965);
      c.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob), nome = 'nosso-ceu-03-10-2026.png';
        this.op.Sobre.abrir(`<img class="poster-img" src="${url}" alt="Pôster do nosso céu"><p>Toque e segure na imagem para salvar nas fotos, ou baixe o arquivo.</p><div class="acoes"><a class="botao" href="${url}" download="${nome}">Baixar</a><button class="botao leve" type="button" data-fechar>Fechar</button></div>`, 'Pôster do nosso céu');
      }, 'image/png');
    }
  };
  window.Ceu = Ceu;
})();
