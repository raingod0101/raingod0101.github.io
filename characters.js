/* ===================================================================
 * 🎨 characters.js  (v3 — 真正精緻化重製)
 *
 * 核心改動：
 *   1. drawDragon 徹底重寫：長脖子 S 形、長尾巴、鱗片陣列、背脊骨刺、
 *      翼膜骨架、龍角分節、牙齒、龍鬚、豎瞳。會依名字判斷元素
 *      （霜龍→冰晶、熔岩龍→岩漿裂紋+火星、雷龍→電弧、金龍、黑龍…）
 *   2. 為貓、魚、恐龍、蝴蝶、鳳凰、天使、章魚、龜、兔、牛鹿、蛇、鯨、
 *      傀儡、植物新增獨立物種繪製函式，不再全部 fallback 成圓球。
 *   3. 通用原型（beast/winged/aquatic/reptile/blob/ghost/skeleton）
 *      也精緻化：花紋、層次、爪子、鱗片、羽毛、發光特效。
 * =================================================================== */
(function () {
  'use strict';

  function setup() {
    const G = window.raingodGame;
    if (!G) { setTimeout(setup, 50); return; }

    const { hexA, shade } = G;
    const TAU = Math.PI * 2;

    /* ---------- 共用繪圖工具 ---------- */
    function circ(g, x, y, r) {
      g.beginPath(); g.arc(x, y, Math.max(r, 0.01), 0, TAU);
    }
    function ell(g, x, y, rx, ry, rot) {
      g.beginPath();
      g.ellipse(x, y, Math.max(rx, 0.01), Math.max(ry, 0.01), rot || 0, 0, TAU);
    }
    function rgrad(g, cx, cy, r, c1, c2) {
      const rr = Math.max(r, 0.01);
      const gr = g.createRadialGradient(cx - rr * 0.35, cy - rr * 0.42, rr * 0.06, cx, cy, rr * 1.08);
      gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      return gr;
    }
    function lgrad(g, x, y0, y1, c1, c2) {
      const gr = g.createLinearGradient(x, y0, x, y1);
      gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      return gr;
    }
    function blinkAt(time, seed) {
      const cyc = (time * 0.85 + (seed % 17) * 0.37) % 3.6;
      if (cyc < 3.34) return 0;
      return Math.max(0, 1 - Math.abs(cyc - 3.47) / 0.13);
    }
    function hashStr(str) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      return h >>> 0;
    }
    function normPal(pal) {
      pal = pal || {};
      const body = pal.body || '#9aa4b8';
      return {
        body,
        belly: pal.belly || shade(body, 34),
        accent: pal.accent || '#ffcc55',
        dark: pal.dark || shade(body, -55),
        light: pal.light || shade(body, 30)
      };
    }
    function drawEye(g, x, y, r, o) {
      o = o || {};
      const blink = o.blink || 0;
      g.save(); g.translate(x, y);
      const eh = Math.max(0.05, 1 - blink * 0.93);
      g.fillStyle = o.white || '#ffffff';
      ell(g, 0, 0, r, r * eh); g.fill();
      g.strokeStyle = 'rgba(20,20,35,0.20)';
      g.lineWidth = Math.max(r * 0.16, 0.4); g.stroke();
      if (blink < 0.74) {
        const pr = r * (o.pr || 0.56);
        const px = (o.lx || 0) * r * 0.30, py = r * 0.08;
        if (o.iris) { g.fillStyle = o.iris; circ(g, px, py, pr * 1.06); g.fill(); }
        g.fillStyle = o.pupil || '#141420';
        circ(g, px, py, pr); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.96)';
        circ(g, px - pr * 0.34, py - pr * 0.40, pr * 0.38); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.55)';
        circ(g, px + pr * 0.36, py + pr * 0.34, pr * 0.19); g.fill();
      } else {
        g.strokeStyle = o.pupil || '#242432';
        g.lineWidth = Math.max(r * 0.30, 0.6);
        g.lineCap = 'round';
        g.beginPath(); g.arc(0, 0, r * 0.74, Math.PI * 0.12, Math.PI * 0.88); g.stroke();
      }
      g.restore();
    }
    function blush(g, x, y, r, a) {
      g.save(); g.globalAlpha = (a === undefined ? 0.40 : a);
      g.fillStyle = '#ff7fa8';
      ell(g, x, y, r, r * 0.60); g.fill();
      g.restore();
    }
    function whiskers(g, x, y, r, dir, color) {
      g.save();
      g.strokeStyle = color || 'rgba(40,40,55,0.45)';
      g.lineWidth = Math.max(r * 0.10, 0.4); g.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + dir * r * 0.9, y + i * r * 0.55, x + dir * r * 1.7, y + i * r * 0.9);
        g.stroke();
      }
      g.restore();
    }

    /* =========================================================
     *  1. 守衛動物（保留原本 12 種）
     * ========================================================= */
        /* =========================================================
     *  守衛動物（12 種，獨立精緻重製）
     * ========================================================= */
    const GUARD_ANIMALS = [

      /* ---------- 0. 雞 ---------- */
      { name: '雞', draw: function (g, s, time, alert) {
        const bob = Math.sin(time * 3.2) * s * 0.03;
        g.save(); g.translate(0, bob);

        // 多層尾羽
        for (let i = 0; i < 5; i++) {
          const a = -0.9 + i * 0.18;
          const len = s * (0.55 + i * 0.06);
          g.save();
          g.translate(-s * 0.10, s * 0.10);
          g.rotate(a + Math.sin(time * 2.5 + i) * 0.04);
          g.fillStyle = i % 2 ? '#8a6a1a' : '#a8801a';
          g.beginPath();
          g.moveTo(0, 0);
          g.quadraticCurveTo(-len * 0.6, -s * 0.12, -len, s * 0.05);
          g.quadraticCurveTo(-len * 0.6, s * 0.10, 0, s * 0.14);
          g.closePath(); g.fill();
          g.strokeStyle = '#5a3a0a'; g.lineWidth = s * 0.015; g.stroke();
          g.restore();
        }

        // 腿
        const swing = Math.sin(time * 5) * s * 0.04;
        g.strokeStyle = '#e8a020'; g.lineCap = 'round'; g.lineWidth = s * 0.055;
        g.beginPath(); g.moveTo(-s * 0.16, s * 0.40); g.lineTo(-s * 0.17 + swing, s * 0.62); g.stroke();
        g.beginPath(); g.moveTo( s * 0.16, s * 0.40); g.lineTo( s * 0.17 - swing, s * 0.62); g.stroke();
        g.lineWidth = s * 0.042;
        for (const sx of [-1, 1]) {
          const bx = sx * s * 0.165 + sx * swing * -1;
          g.beginPath();
          g.moveTo(bx, s * 0.62); g.lineTo(bx - s * 0.10, s * 0.70);
          g.moveTo(bx, s * 0.62); g.lineTo(bx + s * 0.10, s * 0.70);
          g.moveTo(bx, s * 0.62); g.lineTo(bx, s * 0.72);
          g.stroke();
        }

        // 身體
        const bodyGrad = g.createRadialGradient(-s * 0.1, s * 0.05, s * 0.1, 0, s * 0.12, s * 0.58);
        bodyGrad.addColorStop(0, '#f4d878'); bodyGrad.addColorStop(1, '#c8a030');
        g.fillStyle = bodyGrad;
        g.beginPath();
        g.moveTo(0, -s * 0.06);
        g.bezierCurveTo(-s * 0.58, -s * 0.06, -s * 0.52, s * 0.54, 0, s * 0.50);
        g.bezierCurveTo( s * 0.52, s * 0.54,  s * 0.58, -s * 0.06, 0, -s * 0.06);
        g.closePath(); g.fill();
        g.strokeStyle = '#8a6a1a'; g.lineWidth = s * 0.030; g.stroke();

        // 腹部
        const bellyGrad = g.createRadialGradient(0, s * 0.18, s * 0.06, 0, s * 0.20, s * 0.32);
        bellyGrad.addColorStop(0, '#f8e8b0'); bellyGrad.addColorStop(1, '#e0c870');
        g.fillStyle = bellyGrad;
        g.beginPath(); g.ellipse(0, s * 0.20, s * 0.30, s * 0.26, 0, 0, Math.PI * 2); g.fill();

        // 羽毛紋理
        g.strokeStyle = 'rgba(120,90,20,0.35)'; g.lineWidth = s * 0.014;
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 3; j++) {
            const x = (j - 1) * s * 0.14 + (i % 2) * s * 0.07;
            const y = s * (-0.02 + i * 0.10);
            g.beginPath(); g.arc(x, y, s * 0.06, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
          }
        }

        // 翅膀
        for (const sx of [-1, 1]) {
          g.save();
          g.translate(sx * s * 0.40, s * 0.04);
          g.rotate(sx * (0.22 + Math.sin(time * 4) * 0.08));
          const wg = g.createRadialGradient(0, 0, s * 0.04, 0, 0, s * 0.26);
          wg.addColorStop(0, '#f0d060'); wg.addColorStop(1, '#b89020');
          g.fillStyle = wg;
          g.beginPath(); g.ellipse(0, 0, s * 0.16, s * 0.24, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#8a6a1a'; g.lineWidth = s * 0.020; g.stroke();
          g.strokeStyle = 'rgba(120,90,20,0.5)'; g.lineWidth = s * 0.012;
          for (let i = -1; i <= 1; i++) {
            g.beginPath(); g.moveTo(0, i * s * 0.07); g.lineTo(sx * s * 0.08, i * s * 0.09); g.stroke();
          }
          g.restore();
        }

        // 頭
        const headGrad = g.createRadialGradient(-s * 0.08, -s * 0.50, s * 0.06, 0, -s * 0.42, s * 0.40);
        headGrad.addColorStop(0, '#f8e090'); headGrad.addColorStop(1, '#d0a838');
        g.fillStyle = headGrad;
        g.beginPath(); g.arc(0, -s * 0.42, s * 0.36, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#8a6a1a'; g.lineWidth = s * 0.030; g.stroke();

        // 雞冠（多瓣）
        g.fillStyle = '#e84545';
        g.beginPath();
        g.moveTo(-s * 0.24, -s * 0.66);
        g.quadraticCurveTo(-s * 0.28, -s * 0.90, -s * 0.12, -s * 0.74);
        g.quadraticCurveTo(-s * 0.07, -s * 0.98,  s * 0.01, -s * 0.78);
        g.quadraticCurveTo( s * 0.08, -s * 0.98,  s * 0.13, -s * 0.74);
        g.quadraticCurveTo( s * 0.28, -s * 0.90,  s * 0.24, -s * 0.66);
        g.closePath(); g.fill();
        g.strokeStyle = '#a82a2a'; g.lineWidth = s * 0.018; g.stroke();

        // 肉垂
        g.fillStyle = '#e84545';
        g.beginPath(); g.ellipse(0, -s * 0.24, s * 0.07, s * 0.10, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#a82a2a'; g.lineWidth = s * 0.012; g.stroke();

        // 喙
        g.fillStyle = '#f4a828';
        g.beginPath();
        g.moveTo(-s * 0.10, -s * 0.38); g.lineTo(s * 0.10, -s * 0.38); g.lineTo(0, -s * 0.20);
        g.closePath(); g.fill();
        g.strokeStyle = '#c07a10'; g.lineWidth = s * 0.016; g.stroke();

        // 眼睛
        const bl = blinkAt(time, 3);
        if (alert) {
          g.save(); g.shadowBlur = s * 0.20; g.shadowColor = '#ff3020';
          g.fillStyle = '#ff3020';
          g.beginPath(); g.arc(-s * 0.16, -s * 0.50, s * 0.10, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc( s * 0.16, -s * 0.50, s * 0.10, 0, Math.PI * 2); g.fill();
          g.restore();
          g.fillStyle = '#fff';
          g.beginPath(); g.arc(-s * 0.16, -s * 0.50, s * 0.04, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc( s * 0.16, -s * 0.50, s * 0.04, 0, Math.PI * 2); g.fill();
        } else {
          drawEye(g, -s * 0.16, -s * 0.50, s * 0.10, { blink: bl });
          drawEye(g,  s * 0.16, -s * 0.50, s * 0.10, { blink: bl });
        }

        blush(g, -s * 0.26, -s * 0.32, s * 0.09, 0.35);
        blush(g,  s * 0.26, -s * 0.32, s * 0.09, 0.35);
        g.restore();
      }},

      /* ---------- 1. 地獄犬（三頭犬） ---------- */
      { name: '地獄犬', draw: function (g, s, time, alert) {
        const bob = Math.sin(time * 2.2) * s * 0.03;
        g.save(); g.translate(0, bob);

        // 火焰鬃毛（多層）
        for (let i = 0; i < 3; i++) {
          const t = i / 3;
          g.fillStyle = 'rgba(255,' + (60 + i * 30) + ',20,' + (0.5 - t * 0.15) + ')';
          g.beginPath();
          for (let a = -0.8; a < Math.PI + 0.8; a += 0.15) {
            const r = s * (0.55 + Math.sin(time * 6 + a * 3 + i) * 0.08);
            const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.6 - s * 0.15;
            if (a === -0.8) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.closePath(); g.fill();
        }

        // 火焰尾
        g.save();
        g.translate(s * 0.42, s * 0.20);
        g.rotate(-0.5 + Math.sin(time * 7) * 0.3);
        const tailGrad = g.createLinearGradient(0, 0, s * 0.5, -s * 0.2);
        tailGrad.addColorStop(0, '#ff6020'); tailGrad.addColorStop(1, 'rgba(255,200,40,0)');
        g.fillStyle = tailGrad;
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(s * 0.30, -s * 0.20, s * 0.45, -s * 0.05);
        g.quadraticCurveTo(s * 0.30, s * 0.05, 0, s * 0.12);
        g.closePath(); g.fill();
        g.restore();

        // 腿
        g.fillStyle = '#7a1a0a';
        for (const sx of [-1, 1]) {
          g.fillRect(sx * s * 0.24 - s * 0.08, s * 0.40, s * 0.16, s * 0.20);
          g.strokeStyle = '#3a0a00'; g.lineWidth = s * 0.02;
          g.strokeRect(sx * s * 0.24 - s * 0.08, s * 0.40, s * 0.16, s * 0.20);
          g.fillStyle = '#1a0a00';
          g.beginPath(); g.ellipse(sx * s * 0.24, s * 0.62, s * 0.10, s * 0.06, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#7a1a0a';
        }

        // 身體
        const bodyGrad = g.createRadialGradient(0, 0, s * 0.1, 0, s * 0.12, s * 0.60);
        bodyGrad.addColorStop(0, '#c83a2a'); bodyGrad.addColorStop(1, '#5a0a00');
        g.fillStyle = bodyGrad;
        g.beginPath(); g.ellipse(0, s * 0.12, s * 0.48, s * 0.40, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#3a0a00'; g.lineWidth = s * 0.030; g.stroke();

        // 肋骨紋
        g.strokeStyle = 'rgba(30,0,0,0.5)'; g.lineWidth = s * 0.018;
        for (let i = 0; i < 3; i++) {
          g.beginPath(); g.arc(0, s * 0.22, s * (0.14 + i * 0.07), Math.PI * 1.15, Math.PI * 1.85); g.stroke();
        }

        // 三個頭
        const heads = [
          { x: -s * 0.24, y: -s * 0.30, r: s * 0.30, hi: 0 },
          { x:  s * 0.24, y: -s * 0.30, r: s * 0.30, hi: 1 },
          { x: 0,         y: -s * 0.42, r: s * 0.38, hi: 2 }
        ];
        heads.forEach(function (h) {
          g.save();
          g.translate(h.x, h.y);
          const hr = h.r;
          const hg = g.createRadialGradient(-hr * 0.3, -hr * 0.3, hr * 0.1, 0, 0, hr);
          hg.addColorStop(0, '#c83a2a'); hg.addColorStop(1, '#4a0a00');
          g.fillStyle = hg;
          g.beginPath(); g.arc(0, 0, hr, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#2a0000'; g.lineWidth = s * 0.024; g.stroke();
          // 耳朵
          for (const sx of [-1, 1]) {
            g.fillStyle = '#3a0a00';
            g.beginPath();
            g.moveTo(sx * hr * 0.4, -hr * 0.6);
            g.lineTo(sx * hr * 0.9, -hr * 1.3);
            g.lineTo(sx * hr * 0.9, -hr * 0.4);
            g.closePath(); g.fill();
            g.strokeStyle = '#1a0000'; g.lineWidth = s * 0.015; g.stroke();
          }
          // 口鼻
          g.fillStyle = '#2a0000';
          g.beginPath(); g.ellipse(0, hr * 0.45, hr * 0.42, hr * 0.28, 0, 0, Math.PI * 2); g.fill();
          // 鼻子
          g.fillStyle = '#000';
          g.beginPath(); g.ellipse(0, hr * 0.22, hr * 0.15, hr * 0.10, 0, 0, Math.PI * 2); g.fill();
          // 獠牙
          g.fillStyle = '#fff';
          for (let t = -1; t <= 1; t++) {
            const tx = t * hr * 0.20;
            g.beginPath();
            g.moveTo(tx - hr * 0.05, hr * 0.35);
            g.lineTo(tx, hr * 0.60);
            g.lineTo(tx + hr * 0.05, hr * 0.35);
            g.closePath(); g.fill();
          }
          // 發光眼
          const glow = 0.6 + Math.sin(time * 5 + h.hi) * 0.4;
          g.save();
          g.shadowBlur = s * 0.25; g.shadowColor = '#ff3020';
          g.fillStyle = 'rgba(255,60,40,' + (0.85 * glow) + ')';
          g.beginPath(); g.ellipse(-hr * 0.40, -hr * 0.10, hr * 0.20, hr * 0.16, 0, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.ellipse( hr * 0.40, -hr * 0.10, hr * 0.20, hr * 0.16, 0, 0, Math.PI * 2); g.fill();
          g.restore();
          g.fillStyle = '#ffe24a';
          g.beginPath(); g.arc(-hr * 0.40, -hr * 0.10, hr * 0.08, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc( hr * 0.40, -hr * 0.10, hr * 0.08, 0, Math.PI * 2); g.fill();
          g.restore();
        });

        // 火焰粒子
        g.save();
        for (let i = 0; i < 6; i++) {
          const t = (time * 0.5 + i * 0.17) % 1;
          const px = Math.sin(i * 1.5 + time) * s * 0.5;
          const py = -s * 0.2 - t * s * 0.8;
          g.globalAlpha = (1 - t) * 0.7;
          g.fillStyle = i % 2 ? '#ffcc40' : '#ff6020';
          g.beginPath(); g.arc(px, py, s * 0.020 * (1 - t * 0.5), 0, Math.PI * 2); g.fill();
        }
        g.restore();

        g.restore();
      }},

      /* ---------- 2. 白鯨 ---------- */
      { name: '白鯨', draw: function (g, s, time, alert) {
        const sway = Math.sin(time * 1.8);
        g.save(); g.translate(0, sway * s * 0.05);

        // 尾鰭
        g.save();
        g.translate(-s * 0.60, s * 0.05);
        g.rotate(sway * 0.25);
        g.fillStyle = '#a0c0e0';
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(-s * 0.25, -s * 0.40, -s * 0.45, -s * 0.15);
        g.quadraticCurveTo(-s * 0.30, 0, -s * 0.45, s * 0.15);
        g.quadraticCurveTo(-s * 0.25, s * 0.40, 0, 0);
        g.closePath(); g.fill();
        g.strokeStyle = '#5a8ab0'; g.lineWidth = s * 0.020; g.stroke();
        g.restore();

        // 背鰭
        g.fillStyle = '#b0d0e8';
        g.beginPath();
        g.moveTo(-s * 0.05, -s * 0.30);
        g.quadraticCurveTo(s * 0.05, -s * 0.60, s * 0.20, -s * 0.30);
        g.closePath(); g.fill();
        g.strokeStyle = '#5a8ab0'; g.lineWidth = s * 0.018; g.stroke();

        // 身體
        const bodyGrad = g.createRadialGradient(-s * 0.1, -s * 0.1, s * 0.1, 0, 0, s * 0.72);
        bodyGrad.addColorStop(0, '#e8f4ff'); bodyGrad.addColorStop(1, '#80a8c8');
        g.fillStyle = bodyGrad;
        g.beginPath();
        g.moveTo(-s * 0.55, s * 0.05);
        g.bezierCurveTo(-s * 0.65, -s * 0.35, -s * 0.20, -s * 0.50, s * 0.20, -s * 0.42);
        g.bezierCurveTo( s * 0.55, -s * 0.35, s * 0.68, -s * 0.05, s * 0.62, s * 0.10);
        g.bezierCurveTo( s * 0.55, s * 0.35, s * 0.10, s * 0.42, -s * 0.55, s * 0.05);
        g.closePath(); g.fill();
        g.strokeStyle = '#5a8ab0'; g.lineWidth = s * 0.026; g.stroke();

        // 腹部亮色
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.beginPath();
        g.moveTo(-s * 0.48, s * 0.10);
        g.bezierCurveTo(-s * 0.35, s * 0.38, s * 0.20, s * 0.40, s * 0.52, s * 0.10);
        g.bezierCurveTo(s * 0.25, s * 0.28, -s * 0.10, s * 0.30, -s * 0.48, s * 0.10);
        g.closePath(); g.fill();

        // 噴水孔 + 噴水
        g.fillStyle = '#5a8ab0';
        g.beginPath(); g.ellipse(-s * 0.10, -s * 0.42, s * 0.05, s * 0.03, 0, 0, Math.PI * 2); g.fill();
        const spout = Math.sin(time * 1.5) * 0.5 + 0.5;
        if (spout > 0.5) {
          g.save();
          g.globalAlpha = (spout - 0.5) * 0.8;
          g.fillStyle = 'rgba(200,230,255,0.7)';
          for (let i = 0; i < 4; i++) {
            const t = i / 4;
            g.beginPath();
            g.arc(-s * 0.10 + Math.sin(time * 3 + i) * s * 0.06, -s * 0.42 - t * s * 0.35, s * 0.05 * (1 - t * 0.4), 0, Math.PI * 2);
            g.fill();
          }
          g.restore();
        }

        // 側鰭
        for (const sx of [-1, 1]) {
          g.fillStyle = '#90b8d8';
          g.beginPath();
          g.moveTo(sx * s * 0.10, s * 0.15);
          g.quadraticCurveTo(sx * s * 0.35, s * 0.30, sx * s * 0.45, s * 0.42);
          g.quadraticCurveTo(sx * s * 0.30, s * 0.35, sx * s * 0.10, s * 0.22);
          g.closePath(); g.fill();
          g.strokeStyle = '#5a8ab0'; g.lineWidth = s * 0.016; g.stroke();
        }

        // 眼睛
        const bl = blinkAt(time, 5);
        drawEye(g, s * 0.30, -s * 0.10, s * 0.09, { blink: bl, iris: '#2a4a6a', pr: 0.50 });
        if (alert) {
          g.save(); g.shadowBlur = s * 0.20; g.shadowColor = '#ff3020';
          g.strokeStyle = '#ff3020'; g.lineWidth = s * 0.025;
          g.beginPath(); g.arc(s * 0.30, -s * 0.10, s * 0.14, 0, Math.PI * 2); g.stroke();
          g.restore();
        }

        // 嘴
        g.strokeStyle = '#5a8ab0'; g.lineWidth = s * 0.022; g.lineCap = 'round';
        g.beginPath(); g.arc(s * 0.42, s * 0.02, s * 0.12, Math.PI * 0.15, Math.PI * 0.85); g.stroke();

        g.restore();
      }},

      /* ---------- 3. 暴龍 ---------- */
      { name: '暴龍', draw: function (g, s, time, alert) {
        const bob = Math.sin(time * 2.0) * s * 0.03;
        g.save(); g.translate(0, bob);

        // 尾巴
        g.save();
        g.translate(-s * 0.35, s * 0.10);
        g.rotate(-0.15 + Math.sin(time * 1.6) * 0.15);
        const tg = g.createRadialGradient(0, s * 0.2, s * 0.1, 0, s * 0.2, s * 0.5);
        tg.addColorStop(0, '#a89a4a'); tg.addColorStop(1, '#5a4a0a');
        g.fillStyle = tg;
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(-s * 0.30, s * 0.10, -s * 0.65, s * 0.15, -s * 0.85, -s * 0.05);
        g.bezierCurveTo(-s * 0.60, s * 0.20, -s * 0.25, s * 0.25, 0, s * 0.18);
        g.closePath(); g.fill();
        g.strokeStyle = '#3a2a00'; g.lineWidth = s * 0.026; g.stroke();
        g.restore();

        // 後腿
        g.fillStyle = '#8a7a3a';
        for (const sx of [-1, 1]) {
          g.fillRect(sx * s * 0.20 - s * 0.10, s * 0.30, s * 0.20, s * 0.30);
          g.strokeStyle = '#3a2a00'; g.lineWidth = s * 0.022;
          g.strokeRect(sx * s * 0.20 - s * 0.10, s * 0.30, s * 0.20, s * 0.30);
          // 爪
          g.fillStyle = '#3a2a00';
          for (let i = -1; i <= 1; i++) {
            g.beginPath();
            g.moveTo(sx * s * 0.20 + i * s * 0.05, s * 0.60);
            g.lineTo(sx * s * 0.20 + i * s * 0.05 + sx * s * 0.03, s * 0.68);
            g.lineTo(sx * s * 0.20 + i * s * 0.05 - sx * s * 0.02, s * 0.60);
            g.closePath(); g.fill();
          }
          g.fillStyle = '#8a7a3a';
        }

        // 身體
        const bodyGrad = g.createRadialGradient(-s * 0.1, 0, s * 0.1, 0, s * 0.10, s * 0.60);
        bodyGrad.addColorStop(0, '#c8b85a'); bodyGrad.addColorStop(1, '#7a6a2a');
        g.fillStyle = bodyGrad;
        g.beginPath(); g.ellipse(0, s * 0.10, s * 0.48, s * 0.42, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#3a2a00'; g.lineWidth = s * 0.028; g.stroke();

        // 腹部
        g.fillStyle = 'rgba(230,220,160,0.7)';
        g.beginPath(); g.ellipse(0, s * 0.20, s * 0.30, s * 0.26, 0, 0, Math.PI * 2); g.fill();

        // 鱗片
        g.strokeStyle = 'rgba(60,40,0,0.3)'; g.lineWidth = s * 0.012;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 4; c++) {
            const x = (c - 1.5) * s * 0.16 + (r % 2) * s * 0.08;
            const y = s * (-0.06 + r * 0.10);
            const ex = x / (s * 0.44);
            const ey = y / (s * 0.36);
            if (ex * ex + ey * ey > 1) continue;
            g.beginPath(); g.arc(x, y, s * 0.07, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
          }
        }

        // 背刺
        g.fillStyle = '#5a4a1a';
        for (let i = 0; i < 6; i++) {
          const bx = -s * 0.25 + i * s * 0.10;
          const sz = s * (0.06 + Math.sin(i * 0.8) * 0.02);
          g.beginPath();
          g.moveTo(bx - sz * 0.5, -s * 0.28);
          g.lineTo(bx, -s * 0.28 - sz * 2.0);
          g.lineTo(bx + sz * 0.5, -s * 0.28);
          g.closePath(); g.fill();
          g.strokeStyle = '#2a1a00'; g.lineWidth = s * 0.012; g.stroke();
        }

        // 短小前肢
        for (const sx of [-1, 1]) {
          g.fillStyle = '#8a7a3a';
          g.fillRect(sx * s * 0.30 - s * 0.05, s * 0.05, s * 0.10, s * 0.14);
          g.strokeStyle = '#3a2a00'; g.lineWidth = s * 0.018;
          g.strokeRect(sx * s * 0.30 - s * 0.05, s * 0.05, s * 0.10, s * 0.14);
          g.fillStyle = '#3a2a00';
          for (let i = 0; i < 2; i++) {
            g.beginPath();
            g.moveTo(sx * s * 0.30 + i * s * 0.04 - s * 0.02, s * 0.19);
            g.lineTo(sx * s * 0.30 + i * s * 0.04 - s * 0.02 + sx * s * 0.03, s * 0.24);
            g.lineTo(sx * s * 0.30 + i * s * 0.04 - s * 0.02 - sx * s * 0.01, s * 0.19);
            g.closePath(); g.fill();
          }
        }

        // 頭
        const hy = -s * 0.38, hr = s * 0.48;
        const hg = g.createRadialGradient(s * 0.1, hy - hr * 0.2, s * 0.1, s * 0.20, hy, hr);
        hg.addColorStop(0, '#c8b85a'); hg.addColorStop(1, '#6a5a1a');
        g.fillStyle = hg;
        g.beginPath(); g.ellipse(s * 0.20, hy, hr, hr * 0.85, -0.1, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#3a2a00'; g.lineWidth = s * 0.030; g.stroke();

        // 下顎
        g.fillStyle = '#9a8a3a';
        g.beginPath(); g.ellipse(s * 0.25, hy + hr * 0.60, hr * 0.70, hr * 0.30, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#3a2a00'; g.lineWidth = s * 0.022; g.stroke();

        // 上排牙齒
        g.fillStyle = '#fafaf0';
        for (let i = 0; i < 6; i++) {
          const tx = s * (0.15 + i * 0.10);
          g.beginPath();
          g.moveTo(tx - s * 0.02, hy + hr * 0.20);
          g.lineTo(tx, hy + hr * 0.38);
          g.lineTo(tx + s * 0.02, hy + hr * 0.20);
          g.closePath(); g.fill();
          g.strokeStyle = '#8a7a3a'; g.lineWidth = s * 0.008; g.stroke();
        }
        // 下排牙齒
        for (let i = 0; i < 5; i++) {
          const tx = s * (0.18 + i * 0.10);
          g.beginPath();
          g.moveTo(tx - s * 0.015, hy + hr * 0.50);
          g.lineTo(tx, hy + hr * 0.35);
          g.lineTo(tx + s * 0.015, hy + hr * 0.50);
          g.closePath(); g.fill();
        }

        // 眼睛
        const bl = blinkAt(time, 7);
        if (alert) {
          g.save(); g.shadowBlur = s * 0.25; g.shadowColor = '#ff3020';
          g.fillStyle = '#ff3020';
          g.beginPath(); g.ellipse(s * 0.35, hy - hr * 0.20, s * 0.10, s * 0.10, 0, 0, Math.PI * 2); g.fill();
          g.restore();
          g.fillStyle = '#fff';
          g.beginPath(); g.arc(s * 0.35, hy - hr * 0.20, s * 0.04, 0, Math.PI * 2); g.fill();
        } else {
          drawEye(g, s * 0.35, hy - hr * 0.20, s * 0.10, { blink: bl, iris: '#ffd23c', pr: 0.42 });
        }

        // 鼻孔
        g.fillStyle = '#3a2a00';
        g.beginPath(); g.ellipse(s * 0.50, hy - hr * 0.05, s * 0.025, s * 0.018, 0, 0, Math.PI * 2); g.fill();

        g.restore();
      }},

      /* ---------- 4. 雪怪 ---------- */
      { name: '雪怪', draw: function (g, s, time, alert) {
        const bob = Math.sin(time * 1.8) * s * 0.03;
        g.save(); g.translate(0, bob);

        // 身軀
        const bodyGrad = g.createRadialGradient(-s * 0.1, 0, s * 0.1, 0, s * 0.10, s * 0.65);
        bodyGrad.addColorStop(0, '#e8f4ff'); bodyGrad.addColorStop(1, '#90b8d8');
        g.fillStyle = bodyGrad;
        g.beginPath(); g.ellipse(0, s * 0.10, s * 0.55, s * 0.50, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#6a8ab0'; g.lineWidth = s * 0.028; g.stroke();

        // 毛髮鋸齒邊緣
        g.strokeStyle = 'rgba(100,140,180,0.45)'; g.lineWidth = s * 0.018;
        for (let a = 0; a < Math.PI * 2; a += 0.3) {
          const r = s * 0.52;
          const px = Math.cos(a) * r, py = Math.sin(a) * r + s * 0.10;
          g.beginPath();
          g.moveTo(px, py);
          g.lineTo(px + Math.cos(a) * s * 0.08, py + Math.sin(a) * s * 0.08);
          g.stroke();
        }

        // 手臂 + 巨掌
        for (const sx of [-1, 1]) {
          const ag = g.createRadialGradient(sx * s * 0.45, s * 0.05, s * 0.05, sx * s * 0.50, s * 0.10, s * 0.22);
          ag.addColorStop(0, '#e0f0ff'); ag.addColorStop(1, '#80a8c8');
          g.fillStyle = ag;
          g.beginPath(); g.ellipse(sx * s * 0.50, s * 0.10, s * 0.18, s * 0.28, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#6a8ab0'; g.lineWidth = s * 0.022; g.stroke();
          g.fillStyle = '#b0d0e8';
          g.beginPath(); g.ellipse(sx * s * 0.52, s * 0.35, s * 0.14, s * 0.10, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#6a8ab0'; g.lineWidth = s * 0.018; g.stroke();
          g.fillStyle = '#5a7a9a';
          for (let i = -1; i <= 1; i++) {
            g.beginPath();
            g.moveTo(sx * s * 0.52 + i * s * 0.05, s * 0.40);
            g.lineTo(sx * s * 0.52 + i * s * 0.05, s * 0.46);
            g.lineTo(sx * s * 0.52 + i * s * 0.05 + sx * s * 0.02, s * 0.42);
            g.closePath(); g.fill();
          }
        }

        // 頭
        const hy = -s * 0.35, hr = s * 0.40;
        const headGrad = g.createRadialGradient(-hr * 0.2, hy - hr * 0.2, hr * 0.1, 0, hy, hr);
        headGrad.addColorStop(0, '#f0f8ff'); headGrad.addColorStop(1, '#a0c0e0');
        g.fillStyle = headGrad;
        g.beginPath(); g.arc(0, hy, hr, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#6a8ab0'; g.lineWidth = s * 0.028; g.stroke();

        // 冰晶角
        for (const sx of [-1, 1]) {
          g.fillStyle = 'rgba(180,220,255,0.9)';
          g.beginPath();
          g.moveTo(sx * hr * 0.50, hy - hr * 0.70);
          g.lineTo(sx * hr * 0.70, hy - hr * 1.35);
          g.lineTo(sx * hr * 0.85, hy - hr * 0.75);
          g.closePath(); g.fill();
          g.strokeStyle = '#80b0e0'; g.lineWidth = s * 0.018; g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.6)';
          g.beginPath();
          g.moveTo(sx * hr * 0.55, hy - hr * 0.80);
          g.lineTo(sx * hr * 0.65, hy - hr * 1.10);
          g.lineTo(sx * hr * 0.60, hy - hr * 0.85);
          g.closePath(); g.fill();
        }

        // 毛茸茸眉毛
        g.strokeStyle = '#90b8d8'; g.lineWidth = s * 0.030; g.lineCap = 'round';
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.moveTo(sx * hr * 0.25, hy - hr * 0.30);
          g.quadraticCurveTo(sx * hr * 0.45, hy - hr * 0.50, sx * hr * 0.60, hy - hr * 0.20);
          g.stroke();
        }

        // 口鼻
        g.fillStyle = '#b0d0e8';
        g.beginPath(); g.ellipse(0, hy + hr * 0.45, hr * 0.50, hr * 0.35, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#6a8ab0'; g.lineWidth = s * 0.018; g.stroke();

        // 鼻子
        g.fillStyle = '#3a5a7a';
        g.beginPath(); g.ellipse(0, hy + hr * 0.22, hr * 0.14, hr * 0.10, 0, 0, Math.PI * 2); g.fill();

        // 獠牙
        g.fillStyle = '#fafaf0';
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.moveTo(sx * hr * 0.35, hy + hr * 0.50);
          g.lineTo(sx * hr * 0.30, hy + hr * 0.75);
          g.lineTo(sx * hr * 0.45, hy + hr * 0.52);
          g.closePath(); g.fill();
          g.strokeStyle = '#8a9ab0'; g.lineWidth = s * 0.010; g.stroke();
        }

        // 眼睛
        const bl = blinkAt(time, 11);
        drawEye(g, -hr * 0.35, hy - hr * 0.10, hr * 0.22, { blink: bl, iris: '#1a4a8a', pr: 0.55 });
        drawEye(g,  hr * 0.35, hy - hr * 0.10, hr * 0.22, { blink: bl, iris: '#1a4a8a', pr: 0.55 });

        // 警覺眉毛
        if (alert) {
          g.strokeStyle = '#3a5a7a'; g.lineWidth = s * 0.030;
          g.beginPath(); g.moveTo(-hr * 0.55, hy - hr * 0.45); g.lineTo(-hr * 0.20, hy - hr * 0.35); g.stroke();
          g.beginPath(); g.moveTo( hr * 0.55, hy - hr * 0.45); g.lineTo( hr * 0.20, hy - hr * 0.35); g.stroke();
        }

        g.restore();
      }},

      /* ---------- 5. 骷髏王 ---------- */
      { name: '骷髏王', draw: function (g, s, time, alert) {
        const bob = Math.sin(time * 2.0) * s * 0.03;
        g.save(); g.translate(0, bob);

        // 披風
        g.fillStyle = 'rgba(40,10,60,0.85)';
        g.beginPath();
        g.moveTo(-s * 0.50, -s * 0.20);
        g.quadraticCurveTo(-s * 0.65, s * 0.30, -s * 0.55, s * 0.60);
        g.lineTo(s * 0.55, s * 0.60);
        g.quadraticCurveTo(s * 0.65, s * 0.30, s * 0.50, -s * 0.20);
        g.closePath(); g.fill();
        g.strokeStyle = '#1a0a2a'; g.lineWidth = s * 0.022; g.stroke();
        g.strokeStyle = '#8040ff'; g.lineWidth = s * 0.020;
        g.beginPath(); g.moveTo(-s * 0.50, -s * 0.18); g.quadraticCurveTo(-s * 0.55, s * 0.20, -s * 0.52, s * 0.55); g.stroke();
        g.beginPath(); g.moveTo( s * 0.50, -s * 0.18); g.quadraticCurveTo( s * 0.55, s * 0.20,  s * 0.52, s * 0.55); g.stroke();

        // 骨骼
        g.strokeStyle = '#d8d8e8'; g.lineWidth = s * 0.075; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, -s * 0.05); g.lineTo(0, s * 0.40); g.stroke();
        g.lineWidth = s * 0.050;
        for (let i = 0; i < 3; i++) {
          const ry = s * (0.05 + i * 0.10);
          g.beginPath(); g.arc(0, ry, s * (0.22 - i * 0.02), Math.PI * 1.08, Math.PI * 1.92); g.stroke();
          g.beginPath(); g.arc(0, ry, s * (0.22 - i * 0.02), Math.PI * 0.08, Math.PI * 0.92); g.stroke();
        }
        g.lineWidth = s * 0.045;
        for (const sx of [-1, 1]) {
          g.beginPath(); g.moveTo(0, s * 0.05); g.lineTo(sx * s * 0.30, s * 0.30); g.stroke();
        }
        for (const sx of [-1, 1]) {
          g.beginPath(); g.moveTo(0, s * 0.40); g.lineTo(sx * s * 0.12, s * 0.58); g.stroke();
          g.lineWidth = s * 0.040;
          g.beginPath(); g.moveTo(sx * s * 0.12, s * 0.58); g.lineTo(sx * s * 0.20, s * 0.62); g.stroke();
          g.lineWidth = s * 0.045;
        }

        // 頭骨
        const hy = -s * 0.35, hr = s * 0.42;
        const hg = g.createRadialGradient(-hr * 0.2, hy - hr * 0.2, hr * 0.1, 0, hy, hr);
        hg.addColorStop(0, '#f8f8ff'); hg.addColorStop(1, '#c8c8d8');
        g.fillStyle = hg;
        g.beginPath(); g.arc(0, hy, hr, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#8a8a9a'; g.lineWidth = s * 0.024; g.stroke();

        // 顴骨
        g.fillStyle = '#dcdce8';
        g.beginPath();
        g.moveTo(-hr * 0.40, hy + hr * 0.52);
        g.quadraticCurveTo(0, hy + hr * 0.86, hr * 0.40, hy + hr * 0.52);
        g.quadraticCurveTo(0, hy + hr * 0.66, -hr * 0.40, hy + hr * 0.52);
        g.closePath(); g.fill();

        // 眼窩
        g.fillStyle = '#0a0a12';
        g.beginPath(); g.ellipse(-hr * 0.40, hy - hr * 0.04, hr * 0.24, hr * 0.26, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse( hr * 0.40, hy - hr * 0.04, hr * 0.24, hr * 0.26, 0, 0, Math.PI * 2); g.fill();

        // 火焰眼
        const glow = alert ? 1.0 : (0.5 + Math.sin(time * 5) * 0.5);
        g.save();
        g.shadowBlur = s * (alert ? 0.35 : 0.22); g.shadowColor = '#ff3020';
        g.fillStyle = 'rgba(255,60,50,' + (0.6 + glow * 0.4) + ')';
        g.beginPath(); g.arc(-hr * 0.40, hy - hr * 0.04, hr * 0.10, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc( hr * 0.40, hy - hr * 0.04, hr * 0.10, 0, Math.PI * 2); g.fill();
        g.restore();

        // 鼻孔
        g.fillStyle = '#2a2636';
        g.beginPath();
        g.moveTo(0, hy + hr * 0.20);
        g.lineTo(-hr * 0.10, hy + hr * 0.42);
        g.lineTo(hr * 0.10, hy + hr * 0.42);
        g.closePath(); g.fill();

        // 牙齒
        g.strokeStyle = '#a8a8bc'; g.lineWidth = s * 0.018;
        for (let i = -1; i <= 1; i++) {
          g.beginPath(); g.moveTo(i * hr * 0.14, hy + hr * 0.56); g.lineTo(i * hr * 0.14, hy + hr * 0.70); g.stroke();
        }

        // 王冠
        g.fillStyle = '#ffe040';
        g.beginPath();
        g.moveTo(-hr * 0.65, hy - hr * 0.80);
        g.lineTo(-hr * 0.50, hy - hr * 1.15);
        g.lineTo(-hr * 0.30, hy - hr * 0.85);
        g.lineTo(-hr * 0.10, hy - hr * 1.20);
        g.lineTo( hr * 0.10, hy - hr * 0.85);
        g.lineTo( hr * 0.30, hy - hr * 1.15);
        g.lineTo( hr * 0.50, hy - hr * 0.80);
        g.closePath(); g.fill();
        g.strokeStyle = '#aa8800'; g.lineWidth = s * 0.020; g.stroke();
        // 寶石
        g.fillStyle = '#ff2020';
        g.beginPath(); g.arc(0, hy - hr * 0.95, hr * 0.08, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#40a0ff';
        g.beginPath(); g.arc(-hr * 0.35, hy - hr * 0.88, hr * 0.05, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc( hr * 0.35, hy - hr * 0.88, hr * 0.05, 0, Math.PI * 2); g.fill();

        g.restore();
      }},

      /* ---------- 6. 櫻花精靈（第 7 隻寵物也套用） ---------- */
      { name: '櫻花精靈', draw: function (g, s, time, alert) {
        const bob = Math.sin(time * 2.2) * s * 0.04;
        g.save(); g.translate(0, bob);

        // 飄落花瓣
        for (let i = 0; i < 8; i++) {
          const t = (time * 0.3 + i * 0.13) % 1;
          const px = Math.sin(i * 2.3 + time * 1.2) * s * 0.65;
          const py = -s * 0.6 + t * s * 1.4;
          g.globalAlpha = Math.sin(t * Math.PI) * 0.5;
          g.fillStyle = i % 2 ? '#ffb0e0' : '#ff80c0';
          g.save(); g.translate(px, py); g.rotate(time + i);
          g.beginPath(); g.ellipse(0, 0, s * 0.04, s * 0.02, 0, 0, Math.PI * 2); g.fill();
          g.restore();
        }
        g.globalAlpha = 1;

        // 花瓣翅膀
        for (const sx of [-1, 1]) {
          g.save();
          g.translate(sx * s * 0.15, -s * 0.10);
          g.rotate(sx * (0.4 + Math.sin(time * 2.5) * 0.12));
          const wg = g.createLinearGradient(0, 0, sx * s * 0.7, -s * 0.4);
          wg.addColorStop(0, 'rgba(255,180,220,0.85)');
          wg.addColorStop(1, 'rgba(255,120,190,0.4)');
          g.fillStyle = wg;
          g.beginPath();
          g.moveTo(0, 0);
          g.quadraticCurveTo(sx * s * 0.30, -s * 0.50, sx * s * 0.75, -s * 0.35);
          g.quadraticCurveTo(sx * s * 0.55, -s * 0.05, sx * s * 0.25, s * 0.10);
          g.quadraticCurveTo(sx * s * 0.12, s * 0.08, 0, 0);
          g.closePath(); g.fill();
          g.strokeStyle = 'rgba(200,120,170,0.5)'; g.lineWidth = s * 0.018; g.stroke();
          g.strokeStyle = 'rgba(200,120,170,0.3)'; g.lineWidth = s * 0.012;
          for (let i = 0; i < 3; i++) {
            g.beginPath();
            g.moveTo(0, 0);
            g.quadraticCurveTo(sx * s * (0.20 + i * 0.10), -s * (0.20 + i * 0.05), sx * s * (0.45 + i * 0.10), -s * (0.25 - i * 0.05));
            g.stroke();
          }
          g.restore();
        }

        // 花瓣裙
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + time * 0.1;
          const px = Math.cos(a) * s * 0.35;
          const py = s * 0.25 + Math.sin(a) * s * 0.12;
          g.fillStyle = i % 2 ? '#ffc0e0' : '#ff90c0';
          g.save(); g.translate(px, py); g.rotate(a);
          g.beginPath(); g.ellipse(0, 0, s * 0.12, s * 0.20, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(200,100,160,0.4)'; g.lineWidth = s * 0.012; g.stroke();
          g.restore();
        }

        // 身體
        const bodyGrad = g.createRadialGradient(-s * 0.05, 0, s * 0.05, 0, s * 0.05, s * 0.40);
        bodyGrad.addColorStop(0, '#ffe0f0'); bodyGrad.addColorStop(1, '#f0a0d0');
        g.fillStyle = bodyGrad;
        g.beginPath(); g.ellipse(0, s * 0.05, s * 0.28, s * 0.32, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#c86aaa'; g.lineWidth = s * 0.024; g.stroke();

        // 頭
        const hy = -s * 0.35, hr = s * 0.35;
        const headGrad = g.createRadialGradient(-hr * 0.2, hy - hr * 0.2, hr * 0.1, 0, hy, hr);
        headGrad.addColorStop(0, '#fff0f8'); headGrad.addColorStop(1, '#f0b0d8');
        g.fillStyle = headGrad;
        g.beginPath(); g.arc(0, hy, hr, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#c86aaa'; g.lineWidth = s * 0.024; g.stroke();

        // 花冠
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.5;
          const fx = Math.cos(a) * hr * 1.05;
          const fy = hy + Math.sin(a) * hr * 1.05;
          g.fillStyle = i % 2 ? '#ff80c0' : '#ffb0e0';
          g.save(); g.translate(fx, fy); g.rotate(a);
          g.beginPath(); g.ellipse(0, 0, hr * 0.14, hr * 0.22, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(200,100,160,0.5)'; g.lineWidth = s * 0.012; g.stroke();
          g.restore();
        }

        // 眼睛
        const bl = blinkAt(time, 13);
        drawEye(g, -hr * 0.38, hy - hr * 0.08, hr * 0.20, { blink: bl, iris: '#6a2a4a', pr: 0.48 });
        drawEye(g,  hr * 0.38, hy - hr * 0.08, hr * 0.20, { blink: bl, iris: '#6a2a4a', pr: 0.48 });

        // 嘴
        g.strokeStyle = '#c06080'; g.lineWidth = s * 0.020; g.lineCap = 'round';
        g.beginPath(); g.arc(0, hy + hr * 0.30, hr * 0.10, Math.PI * 0.2, Math.PI * 0.8); g.stroke();

        blush(g, -hr * 0.60, hy + hr * 0.15, hr * 0.12, 0.45);
        blush(g,  hr * 0.60, hy + hr * 0.15, hr * 0.12, 0.45);

        // 精靈光點
        for (let i = 0; i < 4; i++) {
          const a = time * 1.5 + i * Math.PI / 2;
          const px = Math.cos(a) * s * 0.55;
          const py = -s * 0.20 + Math.sin(a) * s * 0.35;
          g.globalAlpha = 0.6 + Math.sin(time * 3 + i) * 0.4;
          g.fillStyle = '#ffe0f0';
          g.shadowBlur = s * 0.15; g.shadowColor = '#ff80c0';
          g.beginPath(); g.arc(px, py, s * 0.035, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1; g.shadowBlur = 0;

        g.restore();
      }},

      /* ---------- 7. 泰坦巨神 ---------- */
      { name: '泰坦巨神', draw: function (g, s, time, alert) {
        const bob = Math.sin(time * 1.5) * s * 0.02;
        g.save(); g.translate(0, bob);

        // 巨大雙臂
        for (const sx of [-1, 1]) {
          const ag = g.createRadialGradient(sx * s * 0.45, 0, s * 0.05, sx * s * 0.55, s * 0.05, s * 0.22);
          ag.addColorStop(0, '#c8c8d8'); ag.addColorStop(1, '#6a6a8a');
          g.fillStyle = ag;
          g.beginPath(); g.ellipse(sx * s * 0.55, s * 0.05, s * 0.20, s * 0.30, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#4a4a6a'; g.lineWidth = s * 0.028; g.stroke();
          g.strokeStyle = 'rgba(40,40,60,0.5)'; g.lineWidth = s * 0.016;
          g.beginPath();
          g.moveTo(sx * s * 0.55 - s * 0.08, s * 0.00);
          g.lineTo(sx * s * 0.55 + s * 0.02, s * 0.10);
          g.lineTo(sx * s * 0.55 - s * 0.05, s * 0.20);
          g.stroke();
          g.fillStyle = '#a0a0b8';
          g.beginPath(); g.arc(sx * s * 0.58, s * 0.35, s * 0.16, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#4a4a6a'; g.lineWidth = s * 0.022; g.stroke();
        }

        // 岩石身軀
        const bodyGrad = g.createRadialGradient(-s * 0.1, -s * 0.1, s * 0.1, 0, s * 0.05, s * 0.62);
        bodyGrad.addColorStop(0, '#d8d8e8'); bodyGrad.addColorStop(1, '#7a7a9a');
        g.fillStyle = bodyGrad;
        g.beginPath();
        g.moveTo(-s * 0.55, s * 0.30);
        g.lineTo(-s * 0.60, -s * 0.15);
        g.lineTo(-s * 0.35, -s * 0.40);
        g.lineTo( s * 0.35, -s * 0.40);
        g.lineTo( s * 0.60, -s * 0.15);
        g.lineTo( s * 0.55, s * 0.30);
        g.closePath(); g.fill();
        g.strokeStyle = '#3a3a5a'; g.lineWidth = s * 0.030; g.stroke();

        // 岩石塊面
        g.strokeStyle = 'rgba(50,50,70,0.45)'; g.lineWidth = s * 0.018;
        const blocks = [
          [-0.20, -0.15, 0.18, 0.12], [0.20, -0.15, 0.18, 0.12],
          [-0.10, 0.05, 0.15, 0.10], [0.15, 0.05, 0.15, 0.10],
          [-0.25, 0.15, 0.12, 0.10], [0.25, 0.15, 0.12, 0.10]
        ];
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          g.strokeRect(b[0] * s, b[1] * s, b[2] * s, b[3] * s);
        }

        // 發光核心
        const coreGlow = 0.6 + Math.sin(time * 3) * 0.4;
        g.save();
        g.shadowBlur = s * 0.30; g.shadowColor = '#ffcc40';
        g.fillStyle = 'rgba(255,220,80,' + coreGlow + ')';
        g.beginPath(); g.arc(0, s * 0.05, s * 0.10, 0, Math.PI * 2); g.fill();
        g.restore();

        // 頭
        const hy = -s * 0.48, hr = s * 0.32;
        const hg = g.createRadialGradient(-hr * 0.2, hy - hr * 0.2, hr * 0.1, 0, hy, hr);
        hg.addColorStop(0, '#d0d0e0'); hg.addColorStop(1, '#7a7a9a');
        g.fillStyle = hg;
        g.beginPath();
        g.moveTo(-hr, hy + hr * 0.30);
        g.lineTo(-hr * 0.80, hy - hr * 0.80);
        g.lineTo( hr * 0.80, hy - hr * 0.80);
        g.lineTo( hr, hy + hr * 0.30);
        g.closePath(); g.fill();
        g.strokeStyle = '#3a3a5a'; g.lineWidth = s * 0.026; g.stroke();

        // 發光眼縫
        g.save();
        g.shadowBlur = s * 0.25; g.shadowColor = '#ffe040';
        g.fillStyle = '#ffe040';
        g.fillRect(-hr * 0.55, hy - hr * 0.10, hr * 0.30, hr * 0.15);
        g.fillRect( hr * 0.25, hy - hr * 0.10, hr * 0.30, hr * 0.15);
        g.restore();

        // 嘴
        g.strokeStyle = '#3a3a5a'; g.lineWidth = s * 0.020;
        g.beginPath(); g.moveTo(-hr * 0.30, hy + hr * 0.30); g.lineTo(hr * 0.30, hy + hr * 0.30); g.stroke();

        g.restore();
      }},

      /* ---------- 8. 天使 ---------- */
      { name: '天使', draw: function (g, s, time, alert) {
        const bob = Math.sin(time * 2.0) * s * 0.04;
        g.save(); g.translate(0, bob);

        // 光環
        g.save();
        g.strokeStyle = 'rgba(255,230,120,0.9)';
        g.lineWidth = s * 0.05;
        g.shadowBlur = s * 0.30; g.shadowColor = '#ffe680';
        g.beginPath(); g.ellipse(0, -s * 0.80, s * 0.32, s * 0.09, 0, 0, Math.PI * 2); g.stroke();
        g.restore();

        // 多層羽翼
        for (const sx of [-1, 1]) {
          g.save();
          g.translate(sx * s * 0.12, -s * 0.10);
          g.rotate(sx * (0.4 + Math.sin(time * 2.2) * 0.10));
          for (let layer = 0; layer < 4; layer++) {
            const len = s * (0.85 - layer * 0.12);
            const alpha = 0.9 - layer * 0.15;
            g.fillStyle = 'rgba(255,255,245,' + alpha + ')';
            g.beginPath();
            g.moveTo(0, 0);
            g.quadraticCurveTo(sx * len * 0.5, -s * (0.45 + layer * 0.06), sx * len, -s * (0.20 - layer * 0.04));
            g.quadraticCurveTo(sx * len * 0.6, s * 0.02, sx * s * 0.12, s * 0.04);
            g.closePath(); g.fill();
            g.strokeStyle = 'rgba(200,200,180,0.5)'; g.lineWidth = s * 0.014; g.stroke();
          }
          g.strokeStyle = 'rgba(220,220,200,0.7)'; g.lineWidth = s * 0.012;
          for (let f = 0; f < 3; f++) {
            g.beginPath();
            g.moveTo(sx * s * 0.70, -s * (0.18 + f * 0.04));
            g.lineTo(sx * s * (0.85 + f * 0.05), -s * (0.25 + f * 0.03));
            g.stroke();
          }
          g.restore();
        }

        // 長袍
        const robeGrad = g.createRadialGradient(-s * 0.05, s * 0.15, s * 0.1, 0, s * 0.20, s * 0.55);
        robeGrad.addColorStop(0, '#ffffff'); robeGrad.addColorStop(1, '#d8d8e8');
        g.fillStyle = robeGrad;
        g.beginPath();
        g.moveTo(-s * 0.30, s * 0.00);
        g.bezierCurveTo(-s * 0.45, s * 0.30, -s * 0.50, s * 0.55, -s * 0.48, s * 0.62);
        g.lineTo(s * 0.48, s * 0.62);
        g.bezierCurveTo(s * 0.50, s * 0.55, s * 0.45, s * 0.30, s * 0.30, s * 0.00);
        g.closePath(); g.fill();
        g.strokeStyle = '#a0a0b8'; g.lineWidth = s * 0.024; g.stroke();

        // 長袍裝飾
        g.strokeStyle = 'rgba(160,160,180,0.5)'; g.lineWidth = s * 0.014;
        for (let i = -2; i <= 2; i++) {
          g.beginPath();
          g.moveTo(i * s * 0.12, s * 0.10);
          g.quadraticCurveTo(i * s * 0.15, s * 0.40, i * s * 0.18, s * 0.60);
          g.stroke();
        }

        // 腰帶
        g.fillStyle = '#ffe040';
        g.fillRect(-s * 0.28, s * 0.20, s * 0.56, s * 0.06);
        g.strokeStyle = '#aa8800'; g.lineWidth = s * 0.012;
        g.strokeRect(-s * 0.28, s * 0.20, s * 0.56, s * 0.06);

        // 頭
        const hy = -s * 0.42, hr = s * 0.30;
        const headGrad = g.createRadialGradient(-hr * 0.2, hy - hr * 0.2, hr * 0.1, 0, hy, hr);
        headGrad.addColorStop(0, '#fff8f0'); headGrad.addColorStop(1, '#f0d8c8');
        g.fillStyle = headGrad;
        g.beginPath(); g.arc(0, hy, hr, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#b8a898'; g.lineWidth = s * 0.022; g.stroke();

        // 金色長髮
        g.fillStyle = '#ffe080';
        g.beginPath();
        g.moveTo(-hr * 0.9, hy - hr * 0.3);
        g.quadraticCurveTo(-hr * 0.7, hy - hr * 1.2, hr * 0.7, hy - hr * 1.2);
        g.quadraticCurveTo(hr * 0.9, hy - hr * 0.3, hr * 0.8, hy + hr * 0.2);
        g.quadraticCurveTo(hr * 0.4, hy - hr * 0.4, -hr * 0.8, hy + hr * 0.2);
        g.closePath(); g.fill();
        g.strokeStyle = '#ccaa40'; g.lineWidth = s * 0.016; g.stroke();

        // 溫柔閉眼
        g.strokeStyle = '#8a6a5a'; g.lineWidth = s * 0.022; g.lineCap = 'round';
        for (const sx of [-1, 1]) {
          g.beginPath(); g.arc(sx * hr * 0.40, hy, hr * 0.18, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
        }

        // 小嘴
        g.strokeStyle = '#c06060'; g.lineWidth = s * 0.018;
        g.beginPath(); g.arc(0, hy + hr * 0.30, hr * 0.12, Math.PI * 0.2, Math.PI * 0.8); g.stroke();

        blush(g, -hr * 0.62, hy + hr * 0.15, hr * 0.13, 0.4);
        blush(g,  hr * 0.62, hy + hr * 0.15, hr * 0.13, 0.4);

        // 聖光粒子
        for (let i = 0; i < 5; i++) {
          const t = (time * 0.4 + i * 0.2) % 1;
          const px = Math.sin(i * 1.8 + time) * s * 0.6;
          const py = -s * 0.3 - t * s * 0.8;
          g.globalAlpha = (1 - t) * 0.6;
          g.fillStyle = '#fff8c0';
          g.shadowBlur = s * 0.15; g.shadowColor = '#ffe040';
          g.beginPath(); g.arc(px, py, s * 0.020 * (1 - t * 0.5), 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1; g.shadowBlur = 0;

        g.restore();
      }},

      /* ---------- 9. 暗影領主 ---------- */
      { name: '暗影領主', draw: function (g, s, time, alert) {
        const bob = Math.sin(time * 1.6) * s * 0.04;
        g.save(); g.translate(0, bob);

        // 暗影斗篷
        g.fillStyle = 'rgba(20,10,40,0.92)';
        g.beginPath();
        g.moveTo(-s * 0.40, -s * 0.30);
        g.bezierCurveTo(-s * 0.70, s * 0.10, -s * 0.60, s * 0.40, -s * 0.70, s * 0.65);
        g.lineTo(s * 0.70, s * 0.65);
        g.bezierCurveTo(s * 0.60, s * 0.40, s * 0.70, s * 0.10, s * 0.40, -s * 0.30);
        g.closePath(); g.fill();
        g.strokeStyle = '#3a1a6a'; g.lineWidth = s * 0.024; g.stroke();
        g.strokeStyle = 'rgba(100,50,160,0.4)'; g.lineWidth = s * 0.018;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.moveTo(-s * 0.30 + i * s * 0.30, s * 0.40);
          g.lineTo(-s * 0.25 + i * s * 0.30, s * 0.62);
          g.stroke();
        }

        // 暗影身軀
        const bodyGrad = g.createRadialGradient(0, -s * 0.05, s * 0.05, 0, s * 0.05, s * 0.50);
        bodyGrad.addColorStop(0, '#4a2a7a'); bodyGrad.addColorStop(1, '#1a0a2a');
        g.fillStyle = bodyGrad;
        g.beginPath(); g.ellipse(0, s * 0.10, s * 0.35, s * 0.42, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#2a0a4a'; g.lineWidth = s * 0.026; g.stroke();

        // 漂浮碎片
        for (let i = 0; i < 5; i++) {
          const a = time * 0.8 + i * Math.PI * 0.4;
          const r = s * (0.45 + Math.sin(time * 2 + i) * 0.10);
          const px = Math.cos(a) * r;
          const py = -s * 0.10 + Math.sin(a) * r * 0.6;
          g.globalAlpha = 0.5 + Math.sin(time * 3 + i) * 0.3;
          g.fillStyle = '#8040ff';
          g.shadowBlur = s * 0.15; g.shadowColor = '#8040ff';
          g.save(); g.translate(px, py); g.rotate(time + i);
          g.beginPath();
          g.moveTo(0, -s * 0.04); g.lineTo(s * 0.03, 0);
          g.lineTo(0, s * 0.04); g.lineTo(-s * 0.03, 0);
          g.closePath(); g.fill();
          g.restore();
        }
        g.globalAlpha = 1; g.shadowBlur = 0;

        // 頭
        const hy = -s * 0.40, hr = s * 0.38;
        const headGrad = g.createRadialGradient(-hr * 0.2, hy - hr * 0.2, hr * 0.1, 0, hy, hr);
        headGrad.addColorStop(0, '#5a3a8a'); headGrad.addColorStop(1, '#2a1a4a');
        g.fillStyle = headGrad;
        g.beginPath(); g.arc(0, hy, hr, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#1a0a2a'; g.lineWidth = s * 0.028; g.stroke();

        // 尖角
        for (const sx of [-1, 1]) {
          g.save();
          g.translate(sx * hr * 0.50, hy - hr * 0.60);
          g.rotate(sx * 0.4);
          g.fillStyle = '#1a0a2a';
          g.beginPath();
          g.moveTo(-s * 0.08, 0);
          g.quadraticCurveTo(-s * 0.12, -s * 0.50, 0, -s * 0.70);
          g.quadraticCurveTo(s * 0.12, -s * 0.50, s * 0.08, 0);
          g.closePath(); g.fill();
          g.strokeStyle = '#8040ff'; g.lineWidth = s * 0.016; g.stroke();
          g.restore();
        }

        // 三隻虛空眼
        const eyeGlow = 0.6 + Math.sin(time * 4) * 0.4;
        const eyes = [
          { x: -hr * 0.42, y: -hr * 0.10, r: hr * 0.18 },
          { x:  hr * 0.42, y: -hr * 0.10, r: hr * 0.18 },
          { x: 0,          y:  hr * 0.20, r: hr * 0.10 }
        ];
        for (let i = 0; i < eyes.length; i++) {
          const e = eyes[i];
          g.save();
          g.shadowBlur = s * 0.28; g.shadowColor = '#ff00aa';
          g.fillStyle = 'rgba(255,0,170,' + (eyeGlow * 0.8) + ')';
          g.beginPath(); g.arc(e.x, e.y, e.r, 0, Math.PI * 2); g.fill();
          g.restore();
          g.fillStyle = '#1a0a2a';
          g.beginPath(); g.arc(e.x, e.y, e.r * 0.55, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#ff40c0';
          g.beginPath(); g.arc(e.x, e.y, e.r * 0.25, 0, Math.PI * 2); g.fill();
        }

        // 暗影裂紋
        g.strokeStyle = 'rgba(160,80,255,0.5)'; g.lineWidth = s * 0.018;
        g.beginPath(); g.moveTo(-hr * 0.50, hy - hr * 0.50); g.lineTo(-hr * 0.30, hy - hr * 0.30); g.stroke();
        g.beginPath(); g.moveTo( hr * 0.50, hy - hr * 0.50); g.lineTo( hr * 0.30, hy - hr * 0.30); g.stroke();

        // 暗影粒子
        for (let i = 0; i < 8; i++) {
          const t = (time * 0.6 + i * 0.13) % 1;
          const px = Math.sin(i * 1.7 + time) * s * 0.65;
          const py = -s * 0.2 - t * s * 1.0;
          g.globalAlpha = (1 - t) * 0.5;
          g.fillStyle = '#a040ff';
          g.shadowBlur = s * 0.10; g.shadowColor = '#8040ff';
          g.beginPath(); g.arc(px, py, s * 0.025 * (1 - t * 0.6), 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1; g.shadowBlur = 0;

        g.restore();
      }},

      /* ---------- 10. 混沌之主 ---------- */
      { name: '混沌之主', draw: function (g, s, time, alert) {
        const bob = Math.sin(time * 1.4) * s * 0.05;
        g.save(); g.translate(0, bob);

        // 混沌漩渦
        for (let k = 0; k < 3; k++) {
          g.strokeStyle = 'rgba(' + (k === 0 ? '200,60,255' : k === 1 ? '120,40,200' : '80,20,140') + ',' + (0.5 - k * 0.12) + ')';
          g.lineWidth = s * 0.025;
          g.beginPath();
          let first = true;
          for (let a = k * 1.5; a < Math.PI * 4 + k * 1.5; a += 0.2) {
            const r = (a - k * 1.5) * s * 0.075;
            const px = Math.cos(a + time * 0.8) * r;
            const py = Math.sin(a + time * 0.8) * r * 0.6;
            if (first) { g.moveTo(px, py); first = false; } else g.lineTo(px, py);
          }
          g.stroke();
        }

        // 觸手
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + time * 0.2;
          const len = s * (0.55 + Math.sin(time * 2 + i) * 0.10);
          g.save();
          g.translate(0, s * 0.15);
          g.rotate(a);
          g.strokeStyle = '#5a1a8a';
          g.lineWidth = s * 0.10; g.lineCap = 'round';
          g.beginPath();
          g.moveTo(0, 0);
          g.quadraticCurveTo(Math.sin(time * 3 + i) * s * 0.15, len * 0.5, Math.sin(time * 2 + i) * s * 0.25, len);
          g.stroke();
          g.fillStyle = '#c040ff';
          g.shadowBlur = s * 0.15; g.shadowColor = '#c040ff';
          g.beginPath(); g.arc(Math.sin(time * 2 + i) * s * 0.25, len, s * 0.05, 0, Math.PI * 2); g.fill();
          g.shadowBlur = 0;
          g.restore();
        }

        // 混沌核心
        const coreGrad = g.createRadialGradient(0, 0, s * 0.05, 0, 0, s * 0.45);
        coreGrad.addColorStop(0, '#7a3a9a'); coreGrad.addColorStop(1, '#2a0a4a');
        g.fillStyle = coreGrad;
        g.beginPath(); g.arc(0, 0, s * 0.42, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#4a1a6a'; g.lineWidth = s * 0.028; g.stroke();

        // 混沌符文
        g.strokeStyle = '#c040ff'; g.lineWidth = s * 0.020;
        for (let i = 0; i < 4; i++) {
          const a = time * 1.2 + i * Math.PI / 2;
          const px = Math.cos(a) * s * 0.28;
          const py = Math.sin(a) * s * 0.28;
          g.beginPath(); g.arc(px, py, s * 0.06, 0, Math.PI * 2); g.stroke();
          g.beginPath(); g.moveTo(px - s * 0.04, py); g.lineTo(px + s * 0.04, py); g.stroke();
        }

        // 多眼
        const eyeGlow = 0.6 + Math.sin(time * 3) * 0.4;
        const eyes = [
          { x: -s * 0.22, y: -s * 0.08, r: s * 0.12 },
          { x:  s * 0.22, y: -s * 0.08, r: s * 0.12 },
          { x: 0,          y: -s * 0.22, r: s * 0.08 }
        ];
        for (let i = 0; i < eyes.length; i++) {
          const e = eyes[i];
          g.fillStyle = '#1a0a2a';
          g.beginPath(); g.arc(e.x, e.y, e.r, 0, Math.PI * 2); g.fill();
          g.save();
          g.shadowBlur = s * 0.25; g.shadowColor = '#ff00aa';
          g.fillStyle = 'rgba(255,0,170,' + eyeGlow + ')';
          g.beginPath(); g.arc(e.x, e.y, e.r * 0.65, 0, Math.PI * 2); g.fill();
          g.restore();
          g.fillStyle = '#fff';
          g.beginPath(); g.arc(e.x - e.r * 0.2, e.y - e.r * 0.2, e.r * 0.2, 0, Math.PI * 2); g.fill();
        }

        // 混沌裂口
        g.strokeStyle = '#ff00aa'; g.lineWidth = s * 0.020;
        g.beginPath(); g.arc(0, s * 0.28, s * 0.15, Math.PI * 0.2, Math.PI * 0.8); g.stroke();

        // 混沌粒子
        for (let i = 0; i < 8; i++) {
          const t = (time * 0.5 + i * 0.13) % 1;
          const a = i * 1.2 + time;
          const px = Math.cos(a) * s * (0.5 + t * 0.3);
          const py = Math.sin(a) * s * (0.3 + t * 0.2) - s * 0.2;
          g.globalAlpha = (1 - t) * 0.7;
          g.fillStyle = i % 2 ? '#c040ff' : '#ff40c0';
          g.shadowBlur = s * 0.10; g.shadowColor = '#c040ff';
          g.beginPath(); g.arc(px, py, s * 0.022 * (1 - t * 0.5), 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1; g.shadowBlur = 0;

        g.restore();
      }},

      /* ---------- 11. 虛空吞噬者 ---------- */
      { name: '虛空吞噬者', draw: function (g, s, time, alert) {
        const bob = Math.sin(time * 1.2) * s * 0.05;
        g.save(); g.translate(0, bob);

        // 黑洞核心（多層）
        const corePulse = Math.sin(time * 2) * 0.2 + 0.8;
        for (let i = 3; i >= 0; i--) {
          const r = s * (0.35 + i * 0.15);
          const grd = g.createRadialGradient(0, 0, s * 0.1, 0, 0, r);
          grd.addColorStop(0, 'rgba(0,0,0,0.95)');
          grd.addColorStop(0.6, 'rgba(60,20,100,' + (0.5 - i * 0.08) + ')');
          grd.addColorStop(1, 'rgba(120,60,200,0)');
          g.fillStyle = grd;
          g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
        }
        // 事件視界
        g.strokeStyle = 'rgba(200,100,255,' + (0.5 * corePulse) + ')';
        g.lineWidth = s * 0.020;
        g.beginPath(); g.arc(0, 0, s * 0.30, 0, Math.PI * 2); g.stroke();

        // 八條吸盤觸手
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + time * 0.15;
          const len = s * (0.60 + Math.sin(time * 1.8 + i * 0.8) * 0.15);
          g.save();
          g.rotate(a);
          const wave = Math.sin(time * 2.5 + i);
          g.strokeStyle = 'rgba(' + (100 + i * 15) + ',' + (40 + i * 8) + ',' + (180 + i * 5) + ',0.8)';
          g.lineWidth = s * 0.09;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(0, s * 0.10);
          g.quadraticCurveTo(wave * s * 0.15, len * 0.5, wave * s * 0.30, len);
          g.stroke();
          // 吸盤
          g.fillStyle = 'rgba(200,120,255,0.7)';
          for (let j = 1; j <= 3; j++) {
            const t = j / 4;
            const px = wave * s * 0.15 * t * 2;
            const py = len * t;
            g.globalAlpha = 0.8 - t * 0.3;
            g.beginPath(); g.arc(px, py, s * 0.025 * (1 - t * 0.4), 0, Math.PI * 2); g.fill();
          }
          g.globalAlpha = 1;
          g.restore();
        }

        // 虛空之眼
        g.fillStyle = '#0a0010';
        g.beginPath(); g.arc(0, 0, s * 0.22, 0, Math.PI * 2); g.fill();
        const eyeGlow = 0.6 + Math.sin(time * 4) * 0.4;
        g.save();
        g.shadowBlur = s * 0.35; g.shadowColor = '#ff00aa';
        g.fillStyle = 'rgba(255,0,170,' + eyeGlow + ')';
        g.beginPath(); g.arc(0, 0, s * 0.12, 0, Math.PI * 2); g.fill();
        g.restore();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(0, 0, s * 0.04, 0, Math.PI * 2); g.fill();

        // 星光
        for (let i = 0; i < 12; i++) {
          const a = i * 1.7 + time * 0.3;
          const r = s * (0.45 + Math.sin(time * 1.5 + i) * 0.20);
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r * 0.7;
          g.globalAlpha = 0.4 + Math.sin(time * 2 + i * 1.3) * 0.4;
          g.fillStyle = i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? '#c080ff' : '#8040ff');
          g.shadowBlur = s * 0.08; g.shadowColor = '#c080ff';
          g.beginPath(); g.arc(px, py, s * 0.020, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1; g.shadowBlur = 0;

        // 空間裂縫
        g.strokeStyle = 'rgba(160,80,255,' + (0.4 + Math.sin(time * 3) * 0.3) + ')';
        g.lineWidth = s * 0.015;
        for (let i = 0; i < 3; i++) {
          const a = time * 0.8 + i * 2.1;
          g.beginPath();
          g.moveTo(Math.cos(a) * s * 0.30, Math.sin(a) * s * 0.20);
          g.lineTo(Math.cos(a + 0.5) * s * 0.60, Math.sin(a + 0.5) * s * 0.40);
          g.stroke();
        }

        g.restore();
      }},

    ];

    /* =========================================================
     *  2. 龍（徹底重寫）
     * ========================================================= */
    function drawDragon(g, s, time, pal, h, shapeName) {
      const P = pal;
      const { body, belly, accent, dark, light } = P;
      const nm = String(shapeName || '').toLowerCase();

      // 元素判定
      let element = 'default';
      if (/ice|frost|snow|霜|冰|寒/.test(nm)) element = 'ice';
      else if (/lava|magma|fire|flame|熔岩|火|炎|地獄/.test(nm)) element = 'lava';
      else if (/storm|thunder|lightning|雷|電/.test(nm)) element = 'storm';
      else if (/shadow|dark|void|暗|虛|影/.test(nm)) element = 'shadow';
      else if (/gold|sun|金|陽/.test(nm)) element = 'gold';
      else if (/nature|wood|forest|森|木|草/.test(nm)) element = 'nature';

      const fx = {
        default: { glow: accent, spark: '#fff8c0' },
        ice:     { glow: '#88ddff', spark: '#e8fbff' },
        lava:    { glow: '#ff6020', spark: '#ffe060' },
        storm:   { glow: '#80c0ff', spark: '#e0f0ff' },
        shadow:  { glow: '#a040ff', spark: '#e0a0ff' },
        gold:    { glow: '#ffcc40', spark: '#fffbe0' },
        nature:  { glow: '#60d060', spark: '#d0ffd0' }
      }[element];

      const bob = Math.sin(time * 2.2) * s * 0.025;

      g.save();
      g.translate(0, bob);
      g.lineJoin = 'round';
      g.lineCap = 'round';

      // ===== 翅膀（远侧画在后面） =====
      drawDragonWings(g, s, time, P, fx);

      // ===== 尾巴尖特效 =====
      drawDragonTailTip(g, s, time, element, fx, P);

      // ===== 身体轮廓（头+脖子+躯干+尾巴一体） =====
      g.beginPath();
      g.moveTo(-s * 0.88, s * 0.28);
      g.bezierCurveTo(-s * 0.72, s * 0.16, -s * 0.54, s * 0.08, -s * 0.38, s * 0.02);
      g.bezierCurveTo(-s * 0.22, -s * 0.06, -s * 0.04, -s * 0.16, s * 0.08, -s * 0.18);
      g.bezierCurveTo(s * 0.20, -s * 0.20, s * 0.26, -s * 0.34, s * 0.30, -s * 0.46);
      g.bezierCurveTo(s * 0.32, -s * 0.56, s * 0.36, -s * 0.64, s * 0.44, -s * 0.66);
      g.bezierCurveTo(s * 0.54, -s * 0.68, s * 0.64, -s * 0.62, s * 0.68, -s * 0.56);
      g.lineTo(s * 0.68, -s * 0.50);
      g.bezierCurveTo(s * 0.64, -s * 0.46, s * 0.56, -s * 0.44, s * 0.50, -s * 0.44);
      g.bezierCurveTo(s * 0.44, -s * 0.40, s * 0.40, -s * 0.38, s * 0.36, -s * 0.38);
      g.bezierCurveTo(s * 0.30, -s * 0.36, s * 0.22, -s * 0.24, s * 0.16, -s * 0.06);
      g.bezierCurveTo(s * 0.12, s * 0.02, s * 0.10, s * 0.10, s * 0.10, s * 0.18);
      g.bezierCurveTo(s * 0.06, s * 0.30, s * 0.02, s * 0.36, -s * 0.04, s * 0.38);
      g.bezierCurveTo(-s * 0.16, s * 0.40, -s * 0.28, s * 0.38, -s * 0.38, s * 0.34);
      g.bezierCurveTo(-s * 0.54, s * 0.30, -s * 0.72, s * 0.32, -s * 0.88, s * 0.28);
      g.closePath();
      g.fillStyle = rgrad(g, 0, s * 0.02, s * 0.80, light, body);
      g.fill();
      g.strokeStyle = hexA(dark, 0.7);
      g.lineWidth = s * 0.032;
      g.stroke();

      // 腹部色块
      g.save();
      g.beginPath();
      g.moveTo(s * 0.16, -s * 0.06);
      g.bezierCurveTo(s * 0.12, s * 0.02, s * 0.10, s * 0.18, s * 0.04, s * 0.36);
      g.bezierCurveTo(-s * 0.10, s * 0.40, -s * 0.28, s * 0.38, -s * 0.36, s * 0.34);
      g.bezierCurveTo(-s * 0.20, s * 0.28, -s * 0.02, s * 0.16, s * 0.16, -s * 0.06);
      g.closePath();
      g.fillStyle = hexA(belly, 0.85);
      g.fill();
      g.restore();

      // ===== 鳞片纹理 =====
      drawDragonScales(g, s, P);

      // ===== 背脊骨刺 =====
      drawDragonSpines(g, s, P, fx);

      // ===== 四肢 =====
      drawDragonLegs(g, s, P);

      // ===== 头部细节 =====
      drawDragonHead(g, s, time, P, fx, element);

      // ===== 元素特效 =====
      drawDragonElementFX(g, s, time, element, fx);

      g.restore();
    }

    function drawDragonWings(g, s, time, P, fx) {
      const { accent, dark } = P;
      const flap = Math.sin(time * 2.4) * 0.12;

      for (const side of [-1, 1]) {
        g.save();
        g.translate(-s * 0.02, -s * 0.16);
        g.rotate(side * (-0.30 - flap));
        const dim = side < 0;
        g.globalAlpha = dim ? 0.65 : 1;

        const fingers = [
          { tx: side * s * 0.95, ty: -s * 0.55, mx: side * s * 0.48, my: -s * 0.42 },
          { tx: side * s * 0.82, ty: -s * 0.18, mx: side * s * 0.42, my: -s * 0.24 },
          { tx: side * s * 0.55, ty: s * 0.06, mx: side * s * 0.28, my: -s * 0.06 },
          { tx: side * s * 0.30, ty: s * 0.16, mx: side * s * 0.14, my: s * 0.02 }
        ];

        // 翼膜
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(side * s * 0.28, -s * 0.58, fingers[0].tx * 0.92, fingers[0].ty);
        for (const f of fingers) g.quadraticCurveTo(f.mx * 1.12, f.my * 1.20, f.tx, f.ty);
        g.closePath();
        const wg = g.createLinearGradient(0, 0, side * s * 0.8, -s * 0.4);
        wg.addColorStop(0, hexA(accent, 0.92));
        wg.addColorStop(0.6, hexA(shade(accent, -32), 0.82));
        wg.addColorStop(1, hexA(shade(accent, -52), 0.72));
        g.fillStyle = wg; g.fill();
        g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.022; g.stroke();

        // 指骨
        g.strokeStyle = hexA(dark, 0.45);
        g.lineWidth = s * 0.018;
        for (const f of fingers) {
          g.beginPath(); g.moveTo(0, 0);
          g.quadraticCurveTo(f.mx, f.my, f.tx, f.ty); g.stroke();
        }
        // 翼膜纹理
        g.strokeStyle = hexA(dark, 0.18);
        g.lineWidth = s * 0.010;
        for (let i = 1; i < 4; i++) {
          g.beginPath();
          g.moveTo(fingers[i - 1].mx * 0.5, fingers[i - 1].my * 0.5);
          g.lineTo(fingers[i].mx * 0.7, fingers[i].my * 0.7);
          g.stroke();
        }
        // 翼爪
        g.fillStyle = hexA(P.belly, 0.92);
        g.beginPath();
        g.moveTo(fingers[0].tx * 0.96, fingers[0].ty);
        g.lineTo(fingers[0].tx * 1.06, fingers[0].ty - s * 0.08);
        g.lineTo(fingers[0].tx * 0.84, fingers[0].ty - s * 0.02);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.012; g.stroke();

        g.restore();
        g.globalAlpha = 1;
      }
    }

    function drawDragonScales(g, s, P) {
      const { dark } = P;
      g.save();
      g.strokeStyle = hexA(dark, 0.30);
      g.lineWidth = s * 0.012;
      g.lineCap = 'round';
      const rows = 5, cols = 8;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c - cols / 2) * s * 0.13 + (r % 2) * s * 0.065;
          const y = s * (-0.04 + r * 0.10);
          const ex = x / (s * 0.40);
          const ey = (y - s * 0.12) / (s * 0.30);
          if (ex * ex + ey * ey > 1.05) continue;
          g.beginPath();
          g.arc(x, y, s * 0.068, Math.PI * 0.15, Math.PI * 0.85);
          g.stroke();
        }
      }
      g.restore();
    }

    function drawDragonSpines(g, s, P, fx) {
      const { accent, dark } = P;
      const pts = [
        [-0.34, -0.02], [-0.26, -0.08], [-0.18, -0.13], [-0.08, -0.16],
        [0.02, -0.18], [0.10, -0.19], [0.18, -0.20], [0.24, -0.28],
        [0.28, -0.38], [0.31, -0.48]
      ];
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i];
        const sz = s * (0.055 + (i > 3 ? 0.02 : 0) - Math.abs(i - 5) * 0.006);
        g.fillStyle = i % 2 === 0 ? accent : shade(accent, -15);
        g.beginPath();
        g.moveTo(s * x - sz * 0.5, s * y);
        g.lineTo(s * x, s * y - sz * 1.6);
        g.lineTo(s * x + sz * 0.5, s * y);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.4);
        g.lineWidth = s * 0.012; g.stroke();
      }
    }

    function drawDragonLegs(g, s, P) {
      const { body, dark, belly, light } = P;

      // 后腿
      g.save();
      g.translate(-s * 0.24, s * 0.30);
      g.fillStyle = rgrad(g, 0, s * 0.06, s * 0.20, light, body);
      ell(g, 0, s * 0.08, s * 0.16, s * 0.20); g.fill();
      g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.024; g.stroke();
      g.fillStyle = shade(body, -12);
      ell(g, -s * 0.02, s * 0.26, s * 0.10, s * 0.14); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.020; g.stroke();
      drawDragonClaws(g, s, -s * 0.02, s * 0.38, -1, P);
      g.restore();

      // 前腿
      g.save();
      g.translate(s * 0.12, s * 0.34);
      g.fillStyle = rgrad(g, 0, s * 0.04, s * 0.18, light, body);
      ell(g, 0, s * 0.06, s * 0.14, s * 0.18); g.fill();
      g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.024; g.stroke();
      g.fillStyle = shade(body, -12);
      ell(g, s * 0.01, s * 0.22, s * 0.09, s * 0.12); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.020; g.stroke();
      drawDragonClaws(g, s, s * 0.01, s * 0.32, 1, P);
      g.restore();
    }

    function drawDragonClaws(g, s, cx, cy, dir, P) {
      const { belly, dark } = P;
      g.fillStyle = hexA(belly, 0.95);
      for (let i = -1; i <= 1; i++) {
        const bx = cx + i * s * 0.05;
        g.beginPath();
        g.moveTo(bx, cy);
        g.quadraticCurveTo(bx + dir * s * 0.02, cy + s * 0.05, bx + dir * s * 0.06, cy + s * 0.06);
        g.quadraticCurveTo(bx + dir * s * 0.03, cy + s * 0.02, bx, cy);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.010; g.stroke();
      }
    }

    function drawDragonHead(g, s, time, P, fx, element) {
      const { belly, accent, dark } = P;

      // 龙角
      drawDragonHorns(g, s, P);

      // 耳鳍
      drawDragonEarFins(g, s, time, P);

      // 眼睛（竖瞳）
      const eyeX = s * 0.46, eyeY = s * -0.54, eyeR = s * 0.072;
      const bl = blinkAt(time, 42);
      g.save();
      g.fillStyle = hexA(dark, 0.65);
      ell(g, eyeX, eyeY, eyeR * 1.45, eyeR * 1.25); g.fill();
      g.fillStyle = '#fffaf0';
      ell(g, eyeX, eyeY, eyeR, eyeR * (1 - bl * 0.9)); g.fill();
      if (bl < 0.7) {
        g.fillStyle = fx.glow;
        circ(g, eyeX, eyeY, eyeR * 0.86); g.fill();
        g.fillStyle = '#0a0a14';
        ell(g, eyeX, eyeY, eyeR * 0.22, eyeR * 0.74); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.95)';
        circ(g, eyeX - eyeR * 0.30, eyeY - eyeR * 0.32, eyeR * 0.28); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)';
        circ(g, eyeX + eyeR * 0.28, eyeY + eyeR * 0.28, eyeR * 0.12); g.fill();
      }
      g.restore();

      // 鼻孔
      g.fillStyle = hexA(dark, 0.85);
      ell(g, s * 0.62, s * -0.58, s * 0.022, s * 0.015); g.fill();

      // 鼻孔特效
      if (element !== 'default') drawNostrilFX(g, s, time, fx, element);

      // 牙齿
      g.fillStyle = '#fafafa';
      g.strokeStyle = hexA(dark, 0.3);
      g.lineWidth = s * 0.008;
      const teethY = s * -0.46;
      for (let i = 0; i < 4; i++) {
        const tx = s * (0.50 + i * 0.045);
        g.beginPath();
        g.moveTo(tx - s * 0.018, teethY);
        g.lineTo(tx, teethY + s * 0.045);
        g.lineTo(tx + s * 0.018, teethY);
        g.closePath(); g.fill(); g.stroke();
      }
      const lowerY = s * -0.40;
      for (let i = 0; i < 3; i++) {
        const tx = s * (0.52 + i * 0.05);
        g.beginPath();
        g.moveTo(tx - s * 0.014, lowerY);
        g.lineTo(tx, lowerY - s * 0.032);
        g.lineTo(tx + s * 0.014, lowerY);
        g.closePath(); g.fill(); g.stroke();
      }

      // 龙须
      const sway = Math.sin(time * 2.5) * 0.1;
      g.strokeStyle = hexA(accent, 0.9);
      g.lineWidth = s * 0.018; g.lineCap = 'round';
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * (0.62 + side * 0.04), s * -0.54);
        g.quadraticCurveTo(
          s * (0.75 + side * 0.10), s * (-0.50 + sway),
          s * (0.85 + side * 0.15), s * (-0.35 + sway * 2)
        );
        g.stroke();
      }

      // 下颚纹
      g.strokeStyle = hexA(dark, 0.25);
      g.lineWidth = s * 0.010;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(s * (0.46 + i * 0.03), s * -0.42);
        g.lineTo(s * (0.44 + i * 0.03), s * -0.38);
        g.stroke();
      }
    }

    function drawDragonHorns(g, s, P) {
      const { belly, dark } = P;
      for (const side of [-1, 1]) {
        g.save();
        g.translate(s * 0.36, s * -0.64);
        g.rotate(side * 0.5);

        const segs = 6, totalLen = s * 0.46, segLen = totalLen / segs;
        let angle = -Math.PI * 0.5;

        g.fillStyle = hexA(belly, 0.95);
        g.beginPath();
        for (let i = 0; i <= segs; i++) {
          const w = s * 0.046 * (1 - i / segs * 0.85);
          const px = Math.cos(angle) * i * segLen;
          const py = Math.sin(angle) * i * segLen;
          if (i === 0) g.moveTo(px - w, py); else g.lineTo(px - w, py);
          angle -= 0.18;
        }
        const tipX = Math.cos(angle - 0.2) * (segs + 1) * segLen;
        const tipY = Math.sin(angle - 0.2) * (segs + 1) * segLen;
        g.lineTo(tipX, tipY);
        angle = -Math.PI * 0.5;
        for (let i = segs; i >= 0; i--) {
          const w = s * 0.046 * (1 - i / segs * 0.85);
          const px = Math.cos(angle) * i * segLen;
          const py = Math.sin(angle) * i * segLen;
          g.lineTo(px + w, py);
          angle -= 0.18;
        }
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.55); g.lineWidth = s * 0.014; g.stroke();

        // 节纹
        g.strokeStyle = hexA(dark, 0.32);
        g.lineWidth = s * 0.010;
        angle = -Math.PI * 0.5;
        for (let i = 1; i < segs; i++) {
          const px = Math.cos(angle) * i * segLen;
          const py = Math.sin(angle) * i * segLen;
          const w = s * 0.046 * (1 - i / segs * 0.85);
          g.beginPath(); g.moveTo(px - w, py); g.lineTo(px + w, py); g.stroke();
          angle -= 0.18;
        }
        g.restore();
      }
    }

    function drawDragonEarFins(g, s, time, P) {
      const { accent, dark } = P;
      const wig = Math.sin(time * 3) * 0.08;
      g.save();
      g.translate(s * 0.28, s * -0.64);
      g.rotate(-0.5 + wig);
      g.fillStyle = hexA(accent, 0.86);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(-s * 0.16, -s * 0.26, -s * 0.36, -s * 0.16);
      g.quadraticCurveTo(-s * 0.20, -s * 0.05, -s * 0.28, s * 0.05);
      g.quadraticCurveTo(-s * 0.12, 0, 0, s * 0.04);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.014; g.stroke();
      g.strokeStyle = hexA(dark, 0.30);
      g.lineWidth = s * 0.008;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(-s * 0.12, -s * (0.08 + i * 0.06), -s * (0.20 + i * 0.05), -s * (0.10 + i * 0.03));
        g.stroke();
      }
      g.restore();
    }

    function drawNostrilFX(g, s, time, fx, element) {
      g.save();
      for (let i = 0; i < 3; i++) {
        const t = (time * 0.8 + i * 0.33) % 1;
        const px = s * 0.68 + t * s * 0.12;
        const py = s * -0.58 - t * s * 0.15;
        const r = s * (0.015 + t * 0.03);
        g.globalAlpha = (1 - t) * 0.5;
        g.fillStyle = element === 'lava' ? '#ff8030' : element === 'ice' ? '#a0e8ff' : fx.glow;
        circ(g, px, py, r); g.fill();
      }
      g.globalAlpha = 1;
      g.restore();
    }

    function drawDragonTailTip(g, s, time, element, fx, P) {
      const { accent, dark } = P;
      const sway = Math.sin(time * 2.5) * 0.1;
      g.save();
      g.translate(-s * 0.85, s * 0.30 + sway * s * 0.05);
      g.rotate(-0.3 + sway);

      if (element === 'lava') {
        g.fillStyle = '#ff8030';
        g.beginPath();
        g.moveTo(0, 0); g.lineTo(-s * 0.12, -s * 0.10);
        g.lineTo(-s * 0.18, 0); g.lineTo(-s * 0.12, s * 0.10);
        g.closePath(); g.fill();
      } else if (element === 'ice') {
        g.fillStyle = 'rgba(160,232,255,0.85)';
        g.beginPath();
        g.moveTo(0, 0); g.lineTo(-s * 0.10, -s * 0.14);
        g.lineTo(-s * 0.20, -s * 0.04); g.lineTo(-s * 0.16, s * 0.08);
        g.lineTo(-s * 0.08, s * 0.12);
        g.closePath(); g.fill();
      } else {
        g.fillStyle = hexA(accent, 0.9);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(-s * 0.10, -s * 0.15, -s * 0.18, -s * 0.05);
        g.quadraticCurveTo(-s * 0.12, 0, -s * 0.18, s * 0.08);
        g.quadraticCurveTo(-s * 0.10, s * 0.15, 0, 0);
        g.closePath(); g.fill();
      }
      g.strokeStyle = hexA(dark, 0.45); g.lineWidth = s * 0.014; g.stroke();
      g.restore();
    }

    function drawDragonElementFX(g, s, time, element, fx) {
      if (element === 'lava') {
        g.save();
        g.strokeStyle = 'rgba(255,120,40,0.72)';
        g.lineWidth = s * 0.018;
        g.shadowBlur = s * 0.12; g.shadowColor = '#ff6020';
        const cracks = [
          [[-0.20, 0.10], [-0.15, 0.22], [-0.22, 0.32]],
          [[0.05, -0.05], [0.10, 0.08], [0.06, 0.20]],
          [[-0.35, 0.00], [-0.28, 0.12], [-0.34, 0.20]]
        ];
        for (const ck of cracks) {
          g.beginPath();
          g.moveTo(ck[0][0] * s, ck[0][1] * s);
          for (let i = 1; i < ck.length; i++) g.lineTo(ck[i][0] * s, ck[i][1] * s);
          g.stroke();
        }
        g.restore();
        g.save();
        for (let i = 0; i < 6; i++) {
          const t = (time * 0.6 + i * 0.17) % 1;
          const a = i * 1.05 + time * 0.3;
          const px = Math.cos(a) * s * (0.5 + t * 0.3);
          const py = -s * 0.2 - t * s * 0.8 + Math.sin(a) * s * 0.3;
          g.globalAlpha = (1 - t) * 0.85;
          g.fillStyle = i % 2 ? '#ffcc40' : '#ff6020';
          g.shadowBlur = s * 0.10; g.shadowColor = '#ff6020';
          circ(g, px, py, s * 0.020 * (1 - t * 0.5)); g.fill();
        }
        g.restore();
      } else if (element === 'ice') {
        g.save();
        for (let i = 0; i < 5; i++) {
          const a = time * 0.8 + i * 1.26;
          const px = Math.cos(a) * s * 0.65;
          const py = -s * 0.3 + Math.sin(a) * s * 0.45;
          g.save();
          g.translate(px, py);
          g.rotate(time * 1.5 + i);
          g.fillStyle = 'rgba(160,232,255,0.72)';
          g.beginPath();
          g.moveTo(0, -s * 0.04); g.lineTo(s * 0.02, 0);
          g.lineTo(0, s * 0.04); g.lineTo(-s * 0.02, 0);
          g.closePath(); g.fill();
          g.restore();
        }
        g.restore();
      } else if (element === 'shadow') {
        g.save();
        for (let i = 0; i < 5; i++) {
          const a = time * 0.5 + i * 1.26;
          const px = Math.cos(a) * s * 0.55;
          const py = -s * 0.25 + Math.sin(a) * s * 0.35;
          g.globalAlpha = 0.5 + Math.sin(time * 3 + i) * 0.3;
          g.fillStyle = fx.glow;
          g.shadowBlur = s * 0.15; g.shadowColor = fx.glow;
          circ(g, px, py, s * 0.025); g.fill();
        }
        g.restore();
      } else if (element === 'storm') {
        g.save();
        g.strokeStyle = 'rgba(150,200,255,0.75)';
        g.lineWidth = s * 0.014;
        g.shadowBlur = s * 0.10; g.shadowColor = '#80c0ff';
        for (let i = 0; i < 2; i++) {
          const phase = (time * 1.5 + i * 0.5) % 1;
          if (phase > 0.5) continue;
          const ax = -s * 0.30 + i * s * 0.60;
          const ay = -s * 0.35;
          g.beginPath();
          g.moveTo(ax, ay);
          g.lineTo(ax + s * 0.05, ay + s * 0.10);
          g.lineTo(ax - s * 0.02, ay + s * 0.18);
          g.lineTo(ax + s * 0.06, ay + s * 0.28);
          g.stroke();
        }
        g.restore();
      }
    }

    /* =========================================================
     *  3. 小雞
     * ========================================================= */
    function drawChicken(g, s, time, pal) {
      const { body, belly, dark, light } = pal;
      const bob = Math.sin(time * 4.2) * s * 0.03;
      g.save(); g.translate(0, bob);

      // 尾羽
      g.fillStyle = hexA(shade(body, 18), 0.95);
      for (let i = -1; i <= 1; i++) {
        g.save();
        g.translate(-s * 0.05, s * 0.05);
        g.rotate(-0.35 + i * 0.30 + Math.sin(time * 3 + i) * 0.05);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(-s * 0.50, -s * 0.16, -s * 0.72, s * 0.10);
        g.quadraticCurveTo(-s * 0.42, s * 0.06, 0, s * 0.14);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.02; g.stroke();
        g.restore();
      }

      // 腿
      const swing = Math.sin(time * 5) * s * 0.05;
      g.strokeStyle = '#e8a020'; g.lineCap = 'round'; g.lineWidth = s * 0.055;
      g.beginPath(); g.moveTo(-s * 0.15, s * 0.42); g.lineTo(-s * 0.16 + swing, s * 0.66); g.stroke();
      g.beginPath(); g.moveTo( s * 0.15, s * 0.42); g.lineTo( s * 0.16 - swing, s * 0.66); g.stroke();
      g.lineWidth = s * 0.042;
      for (const sx of [-1, 1]) {
        const bx = sx * s * 0.155 + sx * swing * -1;
        g.beginPath();
        g.moveTo(bx, s * 0.66); g.lineTo(bx - s * 0.11, s * 0.74);
        g.moveTo(bx, s * 0.66); g.lineTo(bx + s * 0.11, s * 0.74);
        g.moveTo(bx, s * 0.66); g.lineTo(bx, s * 0.76);
        g.stroke();
      }

      // 身体
      g.fillStyle = rgrad(g, 0, s * 0.15, s * 0.62, light, body);
      g.beginPath();
      g.moveTo(0, -s * 0.06);
      g.bezierCurveTo(-s * 0.60, -s * 0.06, -s * 0.54, s * 0.56, 0, s * 0.52);
      g.bezierCurveTo( s * 0.54, s * 0.56,  s * 0.60, -s * 0.06, 0, -s * 0.06);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.55); g.lineWidth = s * 0.032; g.stroke();

      // 肚子
      g.fillStyle = rgrad(g, 0, s * 0.25, s * 0.34, belly, shade(belly, -16));
      ell(g, 0, s * 0.22, s * 0.32, s * 0.28); g.fill();

      // 翅膀
      for (const sx of [-1, 1]) {
        g.save();
        g.translate(sx * s * 0.42, s * 0.06);
        g.rotate(sx * (0.25 + Math.sin(time * 4) * 0.07));
        g.fillStyle = rgrad(g, 0, 0, s * 0.28, light, shade(body, -12));
        ell(g, 0, 0, s * 0.17, s * 0.25); g.fill();
        g.strokeStyle = hexA(dark, 0.45); g.lineWidth = s * 0.02; g.stroke();
        g.strokeStyle = hexA(dark, 0.22); g.lineWidth = s * 0.014;
        for (let i = -1; i <= 1; i++) {
          g.beginPath();
          g.moveTo(0, i * s * 0.07);
          g.lineTo(sx * s * 0.09, i * s * 0.10);
          g.stroke();
        }
        g.restore();
      }

      // 头
      g.fillStyle = rgrad(g, 0, -s * 0.46, s * 0.42, light, body);
      circ(g, 0, -s * 0.45, s * 0.39); g.fill();
      g.strokeStyle = hexA(dark, 0.55); g.lineWidth = s * 0.032; g.stroke();

      // 鸡冠
      g.fillStyle = '#e84545';
      g.beginPath();
      g.moveTo(-s * 0.26, -s * 0.71);
      g.quadraticCurveTo(-s * 0.30, -s * 0.96, -s * 0.13, -s * 0.79);
      g.quadraticCurveTo(-s * 0.08, -s * 1.03,  s * 0.01, -s * 0.82);
      g.quadraticCurveTo( s * 0.09, -s * 1.03,  s * 0.14, -s * 0.79);
      g.quadraticCurveTo( s * 0.30, -s * 0.96,  s * 0.26, -s * 0.71);
      g.closePath(); g.fill();
      g.strokeStyle = '#a82a2a'; g.lineWidth = s * 0.018; g.stroke();

      // 肉垂
      g.fillStyle = '#e84545';
      ell(g, 0, -s * 0.27, s * 0.07, s * 0.10); g.fill();

      // 喙
      g.fillStyle = '#f4a828';
      g.beginPath();
      g.moveTo(-s * 0.11, -s * 0.40);
      g.lineTo( s * 0.11, -s * 0.40);
      g.lineTo( 0, -s * 0.21);
      g.closePath(); g.fill();
      g.strokeStyle = '#c07a10'; g.lineWidth = s * 0.016; g.stroke();

      // 眼睛
      const bl = blinkAt(time, 3);
      drawEye(g, -s * 0.17, -s * 0.52, s * 0.115, { blink: bl });
      drawEye(g,  s * 0.17, -s * 0.52, s * 0.115, { blink: bl });

      blush(g, -s * 0.29, -s * 0.33, s * 0.095, 0.35);
      blush(g,  s * 0.29, -s * 0.33, s * 0.095, 0.35);

      g.restore();
    }

    /* =========================================================
     *  4. 小狗
     * ========================================================= */
    function drawDog(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 3) * s * 0.03;
      g.save(); g.translate(0, bob);

      // 尾巴
      g.save();
      g.translate(s * 0.40, s * 0.22);
      g.rotate(-0.5 + Math.sin(time * 8) * 0.45);
      g.fillStyle = rgrad(g, 0, s * 0.2, s * 0.22, light, body);
      ell(g, s * 0.10, s * 0.12, s * 0.12, s * 0.26, -0.4); g.fill();
      g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();
      g.restore();

      // 腿
      g.fillStyle = shade(body, -12);
      ell(g, -s * 0.24, s * 0.55, s * 0.15, s * 0.15); g.fill();
      ell(g,  s * 0.24, s * 0.55, s * 0.15, s * 0.15); g.fill();
      g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.02;
      ell(g, -s * 0.24, s * 0.55, s * 0.15, s * 0.15); g.stroke();
      ell(g,  s * 0.24, s * 0.55, s * 0.15, s * 0.15); g.stroke();

      // 身体
      g.fillStyle = rgrad(g, 0, s * 0.20, s * 0.62, light, body);
      ell(g, 0, s * 0.22, s * 0.48, s * 0.42); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();

      g.fillStyle = hexA(belly, 0.92);
      ell(g, 0, s * 0.32, s * 0.27, s * 0.26); g.fill();

      // 项圈
      g.strokeStyle = accent; g.lineWidth = s * 0.07; g.lineCap = 'round';
      g.beginPath(); g.arc(0, s * 0.02, s * 0.34, Math.PI * 0.14, Math.PI * 0.86); g.stroke();
      g.fillStyle = '#ffd94a';
      circ(g, 0, s * 0.31, s * 0.07); g.fill();
      g.strokeStyle = '#b88a10'; g.lineWidth = s * 0.016; g.stroke();

      // 头
      const hy = -s * 0.30, hr = s * 0.44;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();

      // 垂耳
      for (const sx of [-1, 1]) {
        g.save();
        g.translate(sx * hr * 0.82, hy - hr * 0.10);
        g.rotate(sx * (0.35 + Math.sin(time * 3 + sx) * 0.06));
        g.fillStyle = rgrad(g, 0, 0, hr * 0.5, shade(body, -8), shade(body, -35));
        ell(g, 0, hr * 0.32, hr * 0.30, hr * 0.58); g.fill();
        g.strokeStyle = hexA(dark, 0.45); g.lineWidth = s * 0.022; g.stroke();
        g.restore();
      }

      // 口鼻
      g.fillStyle = hexA(belly, 0.95);
      ell(g, 0, hy + hr * 0.44, hr * 0.50, hr * 0.36); g.fill();
      g.strokeStyle = hexA(dark, 0.22); g.lineWidth = s * 0.016; g.stroke();

      // 鼻子 + 嘴
      g.fillStyle = '#2a2a3a';
      ell(g, 0, hy + hr * 0.22, hr * 0.17, hr * 0.13); g.fill();
      g.strokeStyle = '#3a3a4a'; g.lineWidth = s * 0.022; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, hy + hr * 0.34);
      g.lineTo(0, hy + hr * 0.46);
      g.moveTo(0, hy + hr * 0.46);
      g.quadraticCurveTo(-hr * 0.14, hy + hr * 0.58, -hr * 0.22, hy + hr * 0.44);
      g.moveTo(0, hy + hr * 0.46);
      g.quadraticCurveTo( hr * 0.14, hy + hr * 0.58,  hr * 0.22, hy + hr * 0.44);
      g.stroke();

      g.fillStyle = '#ff7f9c';
      ell(g, 0, hy + hr * 0.60, hr * 0.10, hr * 0.11); g.fill();

      const bl = blinkAt(time, 5);
      drawEye(g, -hr * 0.42, hy - hr * 0.10, hr * 0.25, { blink: bl });
      drawEye(g,  hr * 0.42, hy - hr * 0.10, hr * 0.25, { blink: bl });

      blush(g, -hr * 0.66, hy + hr * 0.16, hr * 0.15, 0.35);
      blush(g,  hr * 0.66, hy + hr * 0.16, hr * 0.15, 0.35);

      g.restore();
    }

    /* =========================================================
     *  5. 小鳥
     * ========================================================= */
    function drawBird(g, s, time, pal) {
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 3.4) * s * 0.035;
      g.save(); g.translate(0, bob);

      g.fillStyle = hexA(accent, 0.9);
      for (let i = -1; i <= 1; i++) {
        g.save();
        g.translate(-s * 0.30, s * 0.22);
        g.rotate(0.9 + i * 0.30);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(-s * 0.12, s * 0.28, 0, s * 0.48);
        g.quadraticCurveTo( s * 0.12, s * 0.28, 0, 0);
        g.closePath(); g.fill();
        g.restore();
      }

      g.strokeStyle = '#e8a020'; g.lineWidth = s * 0.05; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-s * 0.13, s * 0.40); g.lineTo(-s * 0.14, s * 0.62); g.stroke();
      g.beginPath(); g.moveTo( s * 0.13, s * 0.40); g.lineTo( s * 0.14, s * 0.62); g.stroke();

      g.fillStyle = rgrad(g, 0, s * 0.10, s * 0.60, light, body);
      ell(g, 0, s * 0.14, s * 0.44, s * 0.46); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();

      g.fillStyle = rgrad(g, 0, s * 0.30, s * 0.30, belly, shade(belly, -14));
      ell(g, 0, s * 0.26, s * 0.28, s * 0.26); g.fill();

      const hy = -s * 0.36, hr = s * 0.38;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();

      g.fillStyle = hexA(accent, 0.95);
      g.beginPath();
      g.moveTo(-hr * 0.30, hy - hr * 0.88);
      g.quadraticCurveTo(-hr * 0.10, hy - hr * 1.55, hr * 0.06, hy - hr * 0.92);
      g.quadraticCurveTo( hr * 0.20, hy - hr * 1.40, hr * 0.34, hy - hr * 0.86);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.018; g.stroke();

      for (const sx of [-1, 1]) {
        g.save();
        g.translate(sx * s * 0.40, s * 0.10);
        g.rotate(sx * (0.30 + Math.sin(time * 6) * 0.10));
        g.fillStyle = rgrad(g, 0, 0, s * 0.26, light, shade(body, -14));
        ell(g, 0, 0, s * 0.15, s * 0.24); g.fill();
        g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.018; g.stroke();
        g.restore();
      }

      g.fillStyle = '#f4a828';
      g.beginPath();
      g.moveTo(-s * 0.10, hy + hr * 0.22);
      g.lineTo( s * 0.10, hy + hr * 0.22);
      g.lineTo( 0, hy + hr * 0.60);
      g.closePath(); g.fill();
      g.strokeStyle = '#c07a10'; g.lineWidth = s * 0.014; g.stroke();

      const bl = blinkAt(time, 7);
      drawEye(g, -hr * 0.40, hy - hr * 0.14, hr * 0.26, { blink: bl });
      drawEye(g,  hr * 0.40, hy - hr * 0.14, hr * 0.26, { blink: bl });

      blush(g, -hr * 0.62, hy + hr * 0.24, hr * 0.16, 0.32);
      blush(g,  hr * 0.62, hy + hr * 0.24, hr * 0.16, 0.32);

      g.restore();
    }

    /* =========================================================
     *  6. 狐狸
     * ========================================================= */
    function drawFox(g, s, time, pal) {
      const { body, belly, dark, light } = pal;
      const bob = Math.sin(time * 3.2) * s * 0.03;
      g.save(); g.translate(0, bob);

      // 大尾巴
      g.save();
      g.translate(-s * 0.42, s * 0.24);
      g.rotate(-0.35 + Math.sin(time * 2.6) * 0.22);
      g.fillStyle = rgrad(g, 0, s * 0.3, s * 0.35, light, body);
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(-s * 0.35, s * 0.12, -s * 0.30, s * 0.62, 0, s * 0.70);
      g.bezierCurveTo( s * 0.30, s * 0.62,  s * 0.35, s * 0.12, 0, 0);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.45); g.lineWidth = s * 0.026; g.stroke();
      g.fillStyle = hexA(belly, 0.95);
      ell(g, 0, s * 0.56, s * 0.17, s * 0.15); g.fill();
      g.restore();

      g.fillStyle = shade(body, -18);
      ell(g, -s * 0.22, s * 0.55, s * 0.14, s * 0.15); g.fill();
      ell(g,  s * 0.22, s * 0.55, s * 0.14, s * 0.15); g.fill();

      g.fillStyle = rgrad(g, 0, s * 0.18, s * 0.60, light, body);
      ell(g, 0, s * 0.20, s * 0.45, s * 0.44); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      g.fillStyle = hexA(belly, 0.95);
      ell(g, 0, s * 0.30, s * 0.24, s * 0.24); g.fill();

      const hy = -s * 0.32, hr = s * 0.42;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      for (const sx of [-1, 1]) {
        g.fillStyle = shade(body, -10);
        g.beginPath();
        g.moveTo(sx * hr * 0.34, hy - hr * 0.60);
        g.lineTo(sx * hr * 1.00, hy - hr * 1.42);
        g.lineTo(sx * hr * 0.86, hy - hr * 0.34);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.024; g.stroke();
        g.fillStyle = hexA('#ff9db8', 0.75);
        g.beginPath();
        g.moveTo(sx * hr * 0.46, hy - hr * 0.62);
        g.lineTo(sx * hr * 0.90, hy - hr * 1.22);
        g.lineTo(sx * hr * 0.80, hy - hr * 0.46);
        g.closePath(); g.fill();
        g.fillStyle = '#2a2230';
        g.beginPath();
        g.moveTo(sx * hr * 0.86, hy - hr * 1.18);
        g.lineTo(sx * hr * 1.00, hy - hr * 1.42);
        g.lineTo(sx * hr * 1.02, hy - hr * 1.20);
        g.closePath(); g.fill();
      }

      g.fillStyle = hexA(belly, 0.97);
      g.beginPath();
      g.moveTo(0, hy + hr * 0.10);
      g.quadraticCurveTo(-hr * 0.42, hy + hr * 0.12, -hr * 0.34, hy + hr * 0.56);
      g.quadraticCurveTo(0, hy + hr * 0.86, hr * 0.34, hy + hr * 0.56);
      g.quadraticCurveTo( hr * 0.42, hy + hr * 0.12, 0, hy + hr * 0.10);
      g.closePath(); g.fill();

      g.fillStyle = '#2a2230';
      ell(g, 0, hy + hr * 0.40, hr * 0.14, hr * 0.11); g.fill();

      const bl = blinkAt(time, 11);
      drawEye(g, -hr * 0.44, hy - hr * 0.06, hr * 0.26, { blink: bl, iris: '#ffb347', pr: 0.42 });
      drawEye(g,  hr * 0.44, hy - hr * 0.06, hr * 0.26, { blink: bl, iris: '#ffb347', pr: 0.42 });

      whiskers(g, -hr * 0.30, hy + hr * 0.40, hr * 0.16, -1);
      whiskers(g,  hr * 0.30, hy + hr * 0.40, hr * 0.16,  1);

      blush(g, -hr * 0.68, hy + hr * 0.24, hr * 0.15, 0.32);
      blush(g,  hr * 0.68, hy + hr * 0.24, hr * 0.15, 0.32);

      g.restore();
    }

    /* =========================================================
     *  7. 熊 / 熊貓
     * ========================================================= */
    function drawBear(g, s, time, pal, h) {
      const { body, belly, dark, light } = pal;
      const bob = Math.sin(time * 2.6) * s * 0.025;
      g.save(); g.translate(0, bob);

      g.fillStyle = rgrad(g, 0, s * 0.3, s * 0.18, light, body);
      circ(g, -s * 0.36, s * 0.30, s * 0.11); g.fill();
      g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.018; g.stroke();

      for (const sx of [-1, 1]) {
        g.fillStyle = shade(body, -16);
        ell(g, sx * s * 0.25, s * 0.56, s * 0.17, s * 0.15); g.fill();
        g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();
        g.fillStyle = hexA(dark, 0.7);
        for (let i = -1; i <= 1; i++) {
          circ(g, sx * s * 0.25 + i * s * 0.07, s * 0.61, s * 0.024); g.fill();
        }
      }

      g.fillStyle = rgrad(g, 0, s * 0.18, s * 0.62, light, body);
      ell(g, 0, s * 0.20, s * 0.52, s * 0.46); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();

      g.fillStyle = hexA(belly, 0.9);
      ell(g, 0, s * 0.28, s * 0.32, s * 0.30); g.fill();

      const hy = -s * 0.30, hr = s * 0.48;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();

      for (const sx of [-1, 1]) {
        g.fillStyle = rgrad(g, sx * hr * 0.74, hy - hr * 0.68, hr * 0.40, light, body);
        circ(g, sx * hr * 0.74, hy - hr * 0.68, hr * 0.38); g.fill();
        g.strokeStyle = hexA(dark, 0.45); g.lineWidth = s * 0.024; g.stroke();
        g.fillStyle = hexA(belly, 0.85);
        circ(g, sx * hr * 0.74, hy - hr * 0.68, hr * 0.18); g.fill();
      }

      g.fillStyle = hexA(belly, 0.97);
      ell(g, 0, hy + hr * 0.40, hr * 0.52, hr * 0.38); g.fill();
      g.strokeStyle = hexA(dark, 0.18); g.lineWidth = s * 0.016; g.stroke();

      g.fillStyle = '#2a2430';
      ell(g, 0, hy + hr * 0.20, hr * 0.19, hr * 0.14); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      circ(g, -hr * 0.06, hy + hr * 0.16, hr * 0.045); g.fill();

      g.strokeStyle = '#3a3444'; g.lineWidth = s * 0.022; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, hy + hr * 0.34);
      g.lineTo(0, hy + hr * 0.44);
      g.moveTo(0, hy + hr * 0.44);
      g.quadraticCurveTo(-hr * 0.14, hy + hr * 0.56, -hr * 0.22, hy + hr * 0.42);
      g.moveTo(0, hy + hr * 0.44);
      g.quadraticCurveTo( hr * 0.14, hy + hr * 0.56,  hr * 0.22, hy + hr * 0.42);
      g.stroke();

      const bl = blinkAt(time, 13);
      drawEye(g, -hr * 0.44, hy - hr * 0.12, hr * 0.24, { blink: bl });
      drawEye(g,  hr * 0.44, hy - hr * 0.12, hr * 0.24, { blink: bl });

      blush(g, -hr * 0.72, hy + hr * 0.18, hr * 0.15, 0.34);
      blush(g,  hr * 0.72, hy + hr * 0.18, hr * 0.15, 0.34);

      g.restore();
    }

    /* =========================================================
     *  8. 地獄犬 / 獵犬
     * ========================================================= */
    function drawHound(g, s, time, pal) {
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 2.2) * s * 0.02;
      g.save(); g.translate(0, bob);

      g.save();
      g.translate(s * 0.40, s * 0.24);
      g.rotate(-0.4 + Math.sin(time * 6) * 0.35);
      g.fillStyle = shade(body, -22);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(s * 0.22, s * 0.28, s * 0.04, s * 0.55);
      g.quadraticCurveTo(-s * 0.10, s * 0.28, 0, 0);
      g.closePath(); g.fill();
      g.restore();

      g.fillStyle = shade(body, -20);
      ell(g, -s * 0.26, s * 0.54, s * 0.14, s * 0.16); g.fill();
      ell(g,  s * 0.26, s * 0.54, s * 0.14, s * 0.16); g.fill();

      g.fillStyle = rgrad(g, 0, s * 0.18, s * 0.60, light, body);
      ell(g, 0, s * 0.20, s * 0.50, s * 0.44); g.fill();
      g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.032; g.stroke();

      g.strokeStyle = hexA(shade(body, -40), 0.55); g.lineWidth = s * 0.022;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(0, s * 0.30, s * (0.16 + i * 0.08), Math.PI * 1.12, Math.PI * 1.88);
        g.stroke();
      }

      // 尖刺项圈
      g.strokeStyle = '#2a2a34'; g.lineWidth = s * 0.08; g.lineCap = 'round';
      g.beginPath(); g.arc(0, s * 0.00, s * 0.36, Math.PI * 0.10, Math.PI * 0.90); g.stroke();
      g.fillStyle = '#b8b8c8';
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (0.16 + i * 0.17);
        const px = Math.cos(a) * s * 0.36, py = Math.sin(a) * s * 0.36;
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + Math.cos(a) * s * 0.11, py + Math.sin(a) * s * 0.11);
        g.lineTo(px + Math.cos(a + 0.3) * s * 0.05, py + Math.sin(a + 0.3) * s * 0.05);
        g.closePath(); g.fill();
      }

      const hy = -s * 0.34, hr = s * 0.46;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.032; g.stroke();

      for (const sx of [-1, 1]) {
        g.fillStyle = shade(body, -26);
        g.beginPath();
        g.moveTo(sx * hr * 0.42, hy - hr * 0.62);
        g.lineTo(sx * hr * 0.90, hy - hr * 1.36);
        g.lineTo(sx * hr * 0.92, hy - hr * 0.40);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.024; g.stroke();
      }

      g.fillStyle = hexA(belly, 0.25);
      ell(g, 0, hy + hr * 0.48, hr * 0.46, hr * 0.34); g.fill();

      // 獠牙
      g.fillStyle = '#1a1420';
      g.beginPath();
      g.moveTo(-hr * 0.36, hy + hr * 0.30);
      g.quadraticCurveTo(0, hy + hr * 0.74, hr * 0.36, hy + hr * 0.30);
      g.quadraticCurveTo(0, hy + hr * 0.50, -hr * 0.36, hy + hr * 0.30);
      g.closePath(); g.fill();
      g.fillStyle = '#fff';
      for (let i = -1; i <= 1; i++) {
        const bx = i * hr * 0.18;
        g.beginPath();
        g.moveTo(bx - hr * 0.06, hy + hr * 0.34);
        g.lineTo(bx, hy + hr * 0.56);
        g.lineTo(bx + hr * 0.06, hy + hr * 0.34);
        g.closePath(); g.fill();
      }

      g.fillStyle = '#141018';
      ell(g, 0, hy + hr * 0.30, hr * 0.15, hr * 0.11); g.fill();

      const bl = blinkAt(time, 17);
      const glow = 0.65 + Math.sin(time * 4) * 0.35;
      g.save();
      g.shadowBlur = s * 0.30; g.shadowColor = '#ff3020';
      g.fillStyle = `rgba(255,60,40,${0.85 * glow})`;
      ell(g, -hr * 0.44, hy - hr * 0.10, hr * 0.24, hr * 0.16 * (1 - bl)); g.fill();
      ell(g,  hr * 0.44, hy - hr * 0.10, hr * 0.24, hr * 0.16 * (1 - bl)); g.fill();
      g.restore();
      g.fillStyle = '#ffe24a';
      if (bl < 0.7) {
        ell(g, -hr * 0.44, hy - hr * 0.10, hr * 0.10, hr * 0.10); g.fill();
        ell(g,  hr * 0.44, hy - hr * 0.10, hr * 0.10, hr * 0.10); g.fill();
      }

      g.restore();
    }

    /* =========================================================
     *  9. 鯊魚
     * ========================================================= */
    function drawShark(g, s, time, pal) {
      const { body, belly, dark, light } = pal;
      const sway = Math.sin(time * 2.2);
      g.save(); g.translate(0, sway * s * 0.05);

      g.save();
      g.translate(-s * 0.60, s * 0.02);
      g.rotate(sway * 0.25);
      g.fillStyle = shade(body, -14);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(-s * 0.28, -s * 0.50, -s * 0.52, -s * 0.22);
      g.quadraticCurveTo(-s * 0.34, s * 0.02, -s * 0.50, s * 0.30);
      g.quadraticCurveTo(-s * 0.24, s * 0.30, 0, 0);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.022; g.stroke();
      g.restore();

      g.fillStyle = shade(body, -6);
      g.beginPath();
      g.moveTo(-s * 0.06, -s * 0.32);
      g.quadraticCurveTo(s * 0.06, -s * 0.80, s * 0.30, -s * 0.28);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.022; g.stroke();

      g.fillStyle = rgrad(g, 0, 0, s * 0.72, light, body);
      ell(g, 0, s * 0.02, s * 0.66, s * 0.42); g.fill();
      g.strokeStyle = hexA(dark, 0.55); g.lineWidth = s * 0.028; g.stroke();

      g.fillStyle = hexA(belly, 0.92);
      g.beginPath();
      g.ellipse(0, s * 0.14, s * 0.52, s * 0.24, 0, 0, Math.PI);
      g.fill();

      for (const sx of [-1, 1]) {
        g.fillStyle = shade(body, -8);
        g.beginPath();
        g.moveTo(sx * s * 0.16, s * 0.20);
        g.lineTo(sx * s * 0.40, s * 0.46);
        g.lineTo(sx * s * 0.12, s * 0.30);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.018; g.stroke();
      }

      g.strokeStyle = hexA(dark, 0.45); g.lineWidth = s * 0.02; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(-s * (0.30 + i * 0.06), -s * 0.12);
        g.quadraticCurveTo(-s * (0.33 + i * 0.06), 0, -s * (0.30 + i * 0.06), s * 0.12);
        g.stroke();
      }

      g.fillStyle = '#2a1a24';
      g.beginPath();
      g.moveTo(s * 0.28, s * 0.16);
      g.quadraticCurveTo(s * 0.46, s * 0.26, s * 0.56, s * 0.10);
      g.quadraticCurveTo(s * 0.44, s * 0.20, s * 0.30, s * 0.12);
      g.closePath(); g.fill();
      g.fillStyle = '#fff';
      for (let i = 0; i < 4; i++) {
        const bx = s * (0.31 + i * 0.06);
        g.beginPath();
        g.moveTo(bx, s * 0.14);
        g.lineTo(bx + s * 0.02, s * 0.05);
        g.lineTo(bx + s * 0.04, s * 0.14);
        g.closePath(); g.fill();
      }

      const bl = blinkAt(time, 23);
      drawEye(g, s * 0.34, -s * 0.12, s * 0.10, { blink: bl, pupil: '#101018' });

      g.restore();
    }

    /* =========================================================
     *  10. 貓
     * ========================================================= */
    function drawCat(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 2.8) * s * 0.03;
      g.save(); g.translate(0, bob);

      // 长尾
      const tw = Math.sin(time * 2.2) * 0.3;
      g.save();
      g.translate(-s * 0.38, s * 0.22);
      g.rotate(-0.3 + tw);
      g.strokeStyle = rgrad(g, 0, s * 0.3, s * 0.1, light, body);
      g.lineWidth = s * 0.11; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(-s * 0.15, s * 0.25, -s * 0.35, s * 0.10, -s * 0.30, -s * 0.15);
      g.stroke();
      g.restore();

      g.fillStyle = rgrad(g, 0, s * 0.15, s * 0.55, light, body);
      ell(g, 0, s * 0.16, s * 0.42, s * 0.42); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      g.fillStyle = hexA(belly, 0.9);
      ell(g, 0, s * 0.24, s * 0.24, s * 0.24); g.fill();

      const hy = -s * 0.30, hr = s * 0.42;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      for (const sx of [-1, 1]) {
        g.fillStyle = rgrad(g, sx * hr * 0.6, hy - hr * 0.6, hr * 0.3, light, body);
        g.beginPath();
        g.moveTo(sx * hr * 0.25, hy - hr * 0.55);
        g.lineTo(sx * hr * 0.75, hy - hr * 1.25);
        g.lineTo(sx * hr * 0.85, hy - hr * 0.40);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.022; g.stroke();
        g.fillStyle = hexA('#ff9db8', 0.7);
        g.beginPath();
        g.moveTo(sx * hr * 0.38, hy - hr * 0.58);
        g.lineTo(sx * hr * 0.70, hy - hr * 1.05);
        g.lineTo(sx * hr * 0.75, hy - hr * 0.50);
        g.closePath(); g.fill();
      }

      g.fillStyle = hexA(belly, 0.95);
      ell(g, 0, hy + hr * 0.42, hr * 0.40, hr * 0.28); g.fill();

      g.fillStyle = '#ff8a9a';
      g.beginPath();
      g.moveTo(-hr * 0.10, hy + hr * 0.30);
      g.lineTo(hr * 0.10, hy + hr * 0.30);
      g.lineTo(0, hy + hr * 0.40);
      g.closePath(); g.fill();

      g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.02; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, hy + hr * 0.40);
      g.lineTo(0, hy + hr * 0.48);
      g.moveTo(-hr * 0.14, hy + hr * 0.50);
      g.quadraticCurveTo(-hr * 0.07, hy + hr * 0.58, 0, hy + hr * 0.48);
      g.quadraticCurveTo( hr * 0.07, hy + hr * 0.58, hr * 0.14, hy + hr * 0.50);
      g.stroke();

      const bl = blinkAt(time, h);
      for (const sx of [-1, 1]) {
        g.save();
        g.fillStyle = '#fffaf0';
        ell(g, sx * hr * 0.42, hy - hr * 0.06, hr * 0.24, hr * 0.26 * (1 - bl * 0.9)); g.fill();
        g.strokeStyle = 'rgba(20,20,30,0.2)'; g.lineWidth = s * 0.016; g.stroke();
        if (bl < 0.7) {
          g.fillStyle = accent;
          circ(g, sx * hr * 0.42, hy - hr * 0.06, hr * 0.19); g.fill();
          g.fillStyle = '#0a0a14';
          ell(g, sx * hr * 0.42, hy - hr * 0.06, hr * 0.055, hr * 0.16); g.fill();
          g.fillStyle = '#fff';
          circ(g, sx * hr * 0.42 - hr * 0.07, hy - hr * 0.15, hr * 0.06); g.fill();
        }
        g.restore();
      }

      whiskers(g, -hr * 0.30, hy + hr * 0.38, hr * 0.16, -1);
      whiskers(g,  hr * 0.30, hy + hr * 0.38, hr * 0.16,  1);

      blush(g, -hr * 0.62, hy + hr * 0.20, hr * 0.13, 0.36);
      blush(g,  hr * 0.62, hy + hr * 0.20, hr * 0.13, 0.36);

      g.strokeStyle = hexA(shade(body, -40), 0.6);
      g.lineWidth = s * 0.025;
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(i * hr * 0.20, hy - hr * 0.85);
        g.lineTo(i * hr * 0.20, hy - hr * 0.55);
        g.stroke();
      }

      g.restore();
    }

    /* =========================================================
     *  11. 魚
     * ========================================================= */
    function drawFish(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const sw = Math.sin(time * 2.0);
      g.save(); g.translate(0, sw * s * 0.04);

      g.save();
      g.translate(-s * 0.58, 0);
      g.rotate(sw * 0.3);
      g.fillStyle = hexA(accent, 0.9);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(-s * 0.30, -s * 0.40, -s * 0.48, -s * 0.12);
      g.quadraticCurveTo(-s * 0.38, 0, -s * 0.48, s * 0.12);
      g.quadraticCurveTo(-s * 0.30, s * 0.40, 0, 0);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();
      g.restore();

      g.fillStyle = hexA(accent, 0.85);
      g.beginPath();
      g.moveTo(-s * 0.10, -s * 0.28);
      g.quadraticCurveTo(s * 0.00, -s * 0.62, s * 0.20, -s * 0.28);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.018; g.stroke();

      g.fillStyle = rgrad(g, 0, 0, s * 0.62, light, body);
      ell(g, 0, 0, s * 0.60, s * 0.36); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.026; g.stroke();

      g.fillStyle = hexA(belly, 0.9);
      g.beginPath();
      g.ellipse(0, s * 0.10, s * 0.46, s * 0.20, 0, 0, Math.PI);
      g.fill();

      g.strokeStyle = hexA(dark, 0.22);
      g.lineWidth = s * 0.012;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          const x = (c - 2) * s * 0.14 + (r % 2) * s * 0.07;
          const y = s * (-0.06 + r * 0.10);
          const ex = x / (s * 0.54);
          const ey = y / (s * 0.30);
          if (ex * ex + ey * ey > 1) continue;
          g.beginPath();
          g.arc(x, y, s * 0.07, Math.PI * 0.15, Math.PI * 0.85);
          g.stroke();
        }
      }

      for (const sx of [-1, 1]) {
        g.fillStyle = hexA(accent, 0.8);
        g.beginPath();
        g.moveTo(sx * s * 0.10, s * 0.14);
        g.lineTo(sx * s * 0.30, s * 0.32);
        g.lineTo(sx * s * 0.12, s * 0.26);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.014; g.stroke();
      }

      g.strokeStyle = hexA(dark, 0.45); g.lineWidth = s * 0.02;
      g.beginPath();
      g.arc(s * 0.22, -s * 0.02, s * 0.16, Math.PI * 0.55, Math.PI * 1.35);
      g.stroke();

      const bl = blinkAt(time, h);
      drawEye(g, s * 0.34, -s * 0.08, s * 0.10, { blink: bl });

      g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.022; g.lineCap = 'round';
      g.beginPath();
      g.arc(s * 0.48, s * 0.04, s * 0.07, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();

      g.restore();
    }

    /* =========================================================
     *  12. 恐龍
     * ========================================================= */
    function drawDino(g, s, time, pal, h, shapeName) {
      const nm = String(shapeName || '').toLowerCase();
      const isBronto = /bronto|長頸|長頸龍/.test(nm);
      const isTrex = /rex|暴龍/.test(nm);
      const isTrike = /triceratops|三角/.test(nm);
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 2.4) * s * 0.03;
      g.save(); g.translate(0, bob);

      // 尾巴
      const sway = Math.sin(time * 1.8) * 0.2;
      g.save();
      g.translate(-s * 0.38, s * 0.15);
      g.rotate(-0.2 + sway);
      g.fillStyle = rgrad(g, 0, s * 0.3, s * 0.4, light, body);
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(-s * 0.30, s * 0.10, -s * 0.55, s * 0.20, -s * 0.70, s * 0.05);
      g.bezierCurveTo(-s * 0.50, s * 0.20, -s * 0.25, s * 0.28, 0, s * 0.18);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.024; g.stroke();
      g.restore();

      // 腿 + 爪
      g.fillStyle = shade(body, -16);
      for (const sx of [-1, 1]) {
        ell(g, sx * s * 0.22, s * 0.48, s * 0.16, s * 0.14); g.fill();
        g.strokeStyle = hexA(dark, 0.45); g.lineWidth = s * 0.022; g.stroke();
        g.fillStyle = hexA(belly, 0.95);
        for (let i = -1; i <= 1; i++) {
          g.beginPath();
          g.moveTo(sx * s * 0.22 + i * s * 0.06, s * 0.58);
          g.lineTo(sx * s * 0.22 + i * s * 0.06 + sx * s * 0.04, s * 0.66);
          g.lineTo(sx * s * 0.22 + i * s * 0.06 - sx * s * 0.02, s * 0.60);
          g.closePath(); g.fill();
        }
      }

      // 身体
      g.fillStyle = rgrad(g, 0, s * 0.12, s * 0.60, light, body);
      ell(g, 0, s * 0.10, s * 0.46, s * 0.38); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      g.fillStyle = hexA(belly, 0.85);
      ell(g, 0, s * 0.20, s * 0.30, s * 0.24); g.fill();

      // 鳞片
      g.strokeStyle = hexA(dark, 0.25); g.lineWidth = s * 0.014;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          const x = (c - 1.5) * s * 0.16 + (r % 2) * s * 0.08;
          const y = s * (-0.08 + r * 0.10);
          const ex = x / (s * 0.42);
          const ey = y / (s * 0.34);
          if (ex * ex + ey * ey > 1) continue;
          g.beginPath();
          g.arc(x, y, s * 0.07, Math.PI * 0.15, Math.PI * 0.85);
          g.stroke();
        }
      }

      // 背刺
      g.fillStyle = accent;
      for (let i = 0; i < 5; i++) {
        const bx = -s * 0.20 + i * s * 0.10;
        g.beginPath();
        g.moveTo(bx - s * 0.03, -s * 0.22);
        g.lineTo(bx, -s * 0.38);
        g.lineTo(bx + s * 0.03, -s * 0.22);
        g.closePath(); g.fill();
      }

      const hy = isBronto ? -s * 0.55 : -s * 0.32;
      const hr = s * 0.40;

      if (isBronto) {
        // 长脖子
        g.fillStyle = rgrad(g, 0, s * 0.1, s * 0.3, light, body);
        g.beginPath();
        g.moveTo(s * 0.20, -s * 0.05);
        g.bezierCurveTo(s * 0.30, -s * 0.35, s * 0.28, -s * 0.55, s * 0.22, -s * 0.65);
        g.bezierCurveTo(s * 0.12, -s * 0.65, s * 0.10, -s * 0.35, s * 0.10, -s * 0.05);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.024; g.stroke();
      }

      // 头
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, s * 0.20, hy, hr * 0.85); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      if (isTrike) {
        g.fillStyle = hexA(accent, 0.85);
        g.beginPath();
        g.moveTo(s * 0.20, hy - hr * 0.8);
        g.quadraticCurveTo(s * 0.50, hy - hr * 1.1, s * 0.45, hy);
        g.quadraticCurveTo(s * 0.50, hy + hr * 0.9, s * 0.20, hy + hr * 0.6);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.022; g.stroke();
        g.fillStyle = '#faf5e0';
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.moveTo(s * 0.20 + sx * s * 0.20, hy - hr * 0.30);
          g.lineTo(s * 0.20 + sx * s * 0.32, hy - hr * 0.80);
          g.lineTo(s * 0.20 + sx * s * 0.12, hy - hr * 0.20);
          g.closePath(); g.fill();
        }
        g.beginPath();
        g.moveTo(s * 0.40, hy - hr * 0.20);
        g.lineTo(s * 0.52, hy - hr * 0.50);
        g.lineTo(s * 0.42, hy - hr * 0.10);
        g.closePath(); g.fill();
      }

      if (isTrex) {
        g.fillStyle = '#3a1424';
        g.beginPath();
        g.moveTo(s * 0.30, hy + hr * 0.10);
        g.quadraticCurveTo(s * 0.70, hy + hr * 0.20, s * 0.75, hy - hr * 0.10);
        g.quadraticCurveTo(s * 0.55, hy + hr * 0.10, s * 0.30, hy + hr * 0.10);
        g.closePath(); g.fill();
        g.fillStyle = '#fff';
        for (let i = 0; i < 5; i++) {
          const tx = s * (0.38 + i * 0.07);
          g.beginPath();
          g.moveTo(tx - s * 0.015, hy + hr * 0.05);
          g.lineTo(tx, hy + hr * 0.15);
          g.lineTo(tx + s * 0.015, hy + hr * 0.05);
          g.closePath(); g.fill();
        }
      } else {
        g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.02; g.lineCap = 'round';
        g.beginPath();
        g.arc(s * 0.30, hy + hr * 0.20, s * 0.08, Math.PI * 0.15, Math.PI * 0.85);
        g.stroke();
      }

      const bl = blinkAt(time, h);
      drawEye(g, s * 0.28, hy - hr * 0.10, hr * 0.20, { blink: bl, iris: '#ffd23c', pr: 0.42 });

      g.restore();
    }

    /* =========================================================
     *  13. 蝴蝶
     * ========================================================= */
    function drawButterfly(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const flap = Math.sin(time * 4) * 0.3 + 0.7;
      const bob = Math.sin(time * 2) * s * 0.04;
      g.save(); g.translate(0, bob);

      for (const side of [-1, 1]) {
        g.save();
        g.scale(side * flap, 1);

        g.fillStyle = rgrad(g, s * 0.4, -s * 0.3, s * 0.5, hexA(accent, 0.9), hexA(shade(accent, -30), 0.85));
        g.beginPath();
        g.moveTo(0, -s * 0.05);
        g.bezierCurveTo(s * 0.20, -s * 0.50, s * 0.70, -s * 0.55, s * 0.75, -s * 0.25);
        g.bezierCurveTo(s * 0.78, 0, s * 0.40, s * 0.05, 0, 0);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.022; g.stroke();

        g.fillStyle = rgrad(g, s * 0.3, s * 0.2, s * 0.4, hexA(shade(accent, 10), 0.9), hexA(shade(accent, -40), 0.85));
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(s * 0.20, s * 0.10, s * 0.55, s * 0.25, s * 0.50, s * 0.55);
        g.bezierCurveTo(s * 0.40, s * 0.65, s * 0.15, s * 0.50, 0, s * 0.20);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.022; g.stroke();

        g.fillStyle = hexA(belly, 0.7);
        circ(g, s * 0.45, -s * 0.30, s * 0.08); g.fill();
        circ(g, s * 0.30, s * 0.35, s * 0.06); g.fill();

        g.restore();
      }

      g.fillStyle = rgrad(g, 0, 0, s * 0.18, light, body);
      ell(g, 0, s * 0.10, s * 0.08, s * 0.42); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.02; g.stroke();

      const hy = -s * 0.28;
      g.fillStyle = rgrad(g, 0, hy, s * 0.14, light, body);
      circ(g, 0, hy, s * 0.14); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.02; g.stroke();

      g.strokeStyle = hexA(dark, 0.7); g.lineWidth = s * 0.018; g.lineCap = 'round';
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(sx * s * 0.05, hy - s * 0.10);
        g.quadraticCurveTo(sx * s * 0.15, hy - s * 0.35, sx * s * 0.22, hy - s * 0.42);
        g.stroke();
        g.fillStyle = hexA(accent, 0.9);
        circ(g, sx * s * 0.22, hy - s * 0.42, s * 0.03); g.fill();
      }

      const bl = blinkAt(time, h);
      drawEye(g, -s * 0.06, hy - s * 0.02, s * 0.05, { blink: bl });
      drawEye(g,  s * 0.06, hy - s * 0.02, s * 0.05, { blink: bl });

      g.restore();
    }

    /* =========================================================
     *  14. 鳳凰
     * ========================================================= */
    function drawPhoenix(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const flap = Math.sin(time * 3) * 0.15;
      const bob = Math.sin(time * 2) * s * 0.04;
      g.save(); g.translate(0, bob);

      // 火焰尾羽
      for (let i = -2; i <= 2; i++) {
        g.save();
        g.translate(0, s * 0.30);
        g.rotate(i * 0.22 + Math.sin(time * 2 + i) * 0.08);
        const len = s * (0.55 + Math.abs(i) * -0.05);
        const grd = g.createLinearGradient(0, 0, 0, len);
        grd.addColorStop(0, hexA(accent, 0.9));
        grd.addColorStop(0.5, 'rgba(255,180,40,0.85)');
        grd.addColorStop(1, 'rgba(255,60,20,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(-s * 0.06, 0);
        g.quadraticCurveTo(-s * 0.14, len * 0.5, 0, len);
        g.quadraticCurveTo(s * 0.14, len * 0.5, s * 0.06, 0);
        g.closePath(); g.fill();
        g.restore();
      }

      // 翅膀
      for (const sx of [-1, 1]) {
        g.save();
        g.translate(sx * s * 0.10, -s * 0.05);
        g.rotate(sx * (0.4 + flap));
        const grd = g.createLinearGradient(0, 0, sx * s * 0.6, -s * 0.4);
        grd.addColorStop(0, hexA(accent, 0.9));
        grd.addColorStop(1, 'rgba(255,80,20,0.6)');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(sx * s * 0.4, -s * 0.45, sx * s * 0.85, -s * 0.30);
        g.quadraticCurveTo(sx * s * 0.60, -s * 0.05, sx * s * 0.30, s * 0.10);
        g.quadraticCurveTo(sx * s * 0.15, s * 0.10, 0, 0);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();
        g.strokeStyle = 'rgba(255,220,120,0.5)'; g.lineWidth = s * 0.014;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.moveTo(sx * s * 0.10, -s * 0.05);
          g.quadraticCurveTo(sx * s * 0.30, -s * (0.15 + i * 0.08), sx * s * (0.50 + i * 0.10), -s * (0.25 - i * 0.05));
          g.stroke();
        }
        g.restore();
      }

      g.fillStyle = rgrad(g, 0, s * 0.10, s * 0.50, light, body);
      ell(g, 0, s * 0.14, s * 0.38, s * 0.40); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.026; g.stroke();

      g.fillStyle = 'rgba(255,180,40,0.35)';
      ell(g, 0, s * 0.20, s * 0.22, s * 0.24); g.fill();

      const hy = -s * 0.32, hr = s * 0.32;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.026; g.stroke();

      // 冠羽
      g.fillStyle = 'rgba(255,140,40,0.9)';
      for (let i = -1; i <= 1; i++) {
        g.save();
        g.translate(i * s * 0.08, hy - hr * 0.85);
        g.rotate(i * 0.3 + Math.sin(time * 3 + i) * 0.1);
        g.beginPath();
        g.moveTo(-s * 0.04, 0);
        g.quadraticCurveTo(-s * 0.06, -s * 0.20, 0, -s * 0.30);
        g.quadraticCurveTo(s * 0.06, -s * 0.20, s * 0.04, 0);
        g.closePath(); g.fill();
        g.restore();
      }

      g.fillStyle = '#ffb020';
      g.beginPath();
      g.moveTo(-hr * 0.30, hy + hr * 0.15);
      g.lineTo(hr * 0.30, hy + hr * 0.15);
      g.lineTo(0, hy + hr * 0.60);
      g.closePath(); g.fill();
      g.strokeStyle = '#a06010'; g.lineWidth = s * 0.016; g.stroke();

      const bl = blinkAt(time, h);
      drawEye(g, -hr * 0.38, hy - hr * 0.10, hr * 0.20, { blink: bl, iris: '#ffd23c', pr: 0.45 });
      drawEye(g,  hr * 0.38, hy - hr * 0.10, hr * 0.20, { blink: bl, iris: '#ffd23c', pr: 0.45 });

      g.restore();
    }

    /* =========================================================
     *  15. 天使
     * ========================================================= */
    function drawAngel(g, s, time, pal, h) {
      const { accent, dark } = pal;
      const flap = Math.sin(time * 1.8) * 0.10;
      const bob = Math.sin(time * 2) * s * 0.03;
      g.save(); g.translate(0, bob);

      // 光环
      g.save();
      g.strokeStyle = 'rgba(255,230,120,0.9)';
      g.lineWidth = s * 0.05;
      g.shadowBlur = s * 0.30; g.shadowColor = '#ffe680';
      ell(g, 0, -s * 0.85, s * 0.30, s * 0.08); g.stroke();
      g.restore();

      // 翅膀
      for (const sx of [-1, 1]) {
        g.save();
        g.translate(sx * s * 0.15, -s * 0.10);
        g.rotate(sx * (0.4 + flap));
        for (let layer = 0; layer < 3; layer++) {
          const len = s * (0.75 - layer * 0.15);
          const alpha = 0.9 - layer * 0.2;
          g.fillStyle = `rgba(255,255,240,${alpha})`;
          g.beginPath();
          g.moveTo(0, 0);
          g.quadraticCurveTo(sx * len * 0.5, -s * (0.4 + layer * 0.08), sx * len, -s * (0.2 - layer * 0.05));
          g.quadraticCurveTo(sx * len * 0.6, s * 0.05, sx * s * 0.15, s * 0.05);
          g.closePath(); g.fill();
          g.strokeStyle = 'rgba(200,200,180,0.5)'; g.lineWidth = s * 0.014; g.stroke();
        }
        g.restore();
      }

      // 长袍
      g.fillStyle = rgrad(g, 0, s * 0.20, s * 0.55, '#ffffff', '#d8d8e8');
      g.beginPath();
      g.moveTo(-s * 0.30, s * 0.00);
      g.bezierCurveTo(-s * 0.45, s * 0.30, -s * 0.50, s * 0.55, -s * 0.48, s * 0.62);
      g.lineTo(s * 0.48, s * 0.62);
      g.bezierCurveTo(s * 0.50, s * 0.55, s * 0.45, s * 0.30, s * 0.30, s * 0.00);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.3); g.lineWidth = s * 0.024; g.stroke();

      g.strokeStyle = 'rgba(160,160,180,0.5)';
      g.lineWidth = s * 0.014;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(i * s * 0.12, s * 0.10);
        g.quadraticCurveTo(i * s * 0.15, s * 0.40, i * s * 0.18, s * 0.60);
        g.stroke();
      }

      g.fillStyle = hexA(accent, 0.9);
      g.fillRect(-s * 0.28, s * 0.20, s * 0.56, s * 0.06);

      const hy = -s * 0.42, hr = s * 0.30;
      g.fillStyle = rgrad(g, 0, hy, hr, '#fff8f0', '#f0d8c8');
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.3); g.lineWidth = s * 0.022; g.stroke();

      g.fillStyle = hexA(accent, 0.9);
      g.beginPath();
      g.moveTo(-hr * 0.9, hy - hr * 0.3);
      g.quadraticCurveTo(-hr * 0.6, hy - hr * 1.2, hr * 0.6, hy - hr * 1.2);
      g.quadraticCurveTo(hr * 0.9, hy - hr * 0.3, hr * 0.8, hy + hr * 0.1);
      g.quadraticCurveTo(hr * 0.4, hy - hr * 0.4, -hr * 0.8, hy + hr * 0.1);
      g.closePath(); g.fill();

      g.strokeStyle = hexA(dark, 0.6);
      g.lineWidth = s * 0.022; g.lineCap = 'round';
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.arc(sx * hr * 0.42, hy, hr * 0.20, Math.PI * 0.15, Math.PI * 0.85);
        g.stroke();
      }

      g.strokeStyle = '#c06060'; g.lineWidth = s * 0.018;
      g.beginPath();
      g.arc(0, hy + hr * 0.30, hr * 0.12, Math.PI * 0.2, Math.PI * 0.8);
      g.stroke();

      blush(g, -hr * 0.65, hy + hr * 0.15, hr * 0.13, 0.4);
      blush(g,  hr * 0.65, hy + hr * 0.15, hr * 0.13, 0.4);

      g.restore();
    }

    /* =========================================================
     *  16. 章魚
     * ========================================================= */
    function drawOctopus(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 1.8) * s * 0.04;
      g.save(); g.translate(0, bob);

      // 触手
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const phase = time * 2 + i * 0.7;
        const len = s * (0.60 + Math.sin(phase) * 0.08);
        const wave = Math.sin(phase) * 0.3;
        g.save();
        g.translate(0, s * 0.20);
        g.rotate(a);
        g.strokeStyle = hexA(shade(body, -10 + i * 2), 0.95);
        g.lineWidth = s * 0.10; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(wave * s * 0.15, len * 0.5, wave * s * 0.30, len);
        g.stroke();
        g.fillStyle = hexA(belly, 0.85);
        for (let j = 1; j <= 4; j++) {
          const t = j / 5;
          circ(g, wave * s * 0.15 * t * 2, len * t, s * 0.025 * (1 - t * 0.5)); g.fill();
        }
        g.restore();
      }

      // 头
      g.fillStyle = rgrad(g, 0, -s * 0.20, s * 0.55, light, body);
      g.beginPath();
      g.moveTo(-s * 0.50, s * 0.15);
      g.bezierCurveTo(-s * 0.55, -s * 0.55, -s * 0.30, -s * 0.70, 0, -s * 0.70);
      g.bezierCurveTo( s * 0.30, -s * 0.70,  s * 0.55, -s * 0.55, s * 0.50, s * 0.15);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      g.fillStyle = hexA(accent, 0.45);
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + 0.5;
        circ(g, Math.cos(a) * s * 0.30, -s * 0.35 + Math.sin(a) * s * 0.20, s * 0.06); g.fill();
      }

      const bl = blinkAt(time, h);
      drawEye(g, -s * 0.22, -s * 0.18, s * 0.16, { blink: bl });
      drawEye(g,  s * 0.22, -s * 0.18, s * 0.16, { blink: bl });

      blush(g, -s * 0.40, s * 0.02, s * 0.10, 0.35);
      blush(g,  s * 0.40, s * 0.02, s * 0.10, 0.35);

      g.restore();
    }

    /* =========================================================
     *  17. 龜
     * ========================================================= */
    function drawTurtle(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 1.8) * s * 0.025;
      g.save(); g.translate(0, bob);

      g.fillStyle = shade(body, -16);
      for (const sx of [-1, 1]) {
        ell(g, sx * s * 0.34, s * 0.32, s * 0.16, s * 0.12, sx * 0.3); g.fill();
        g.strokeStyle = hexA(dark, 0.45); g.lineWidth = s * 0.02; g.stroke();
      }

      g.fillStyle = shade(body, -20);
      g.beginPath();
      g.moveTo(-s * 0.38, s * 0.22);
      g.lineTo(-s * 0.55, s * 0.30);
      g.lineTo(-s * 0.36, s * 0.30);
      g.closePath(); g.fill();

      g.fillStyle = rgrad(g, 0, -s * 0.10, s * 0.62, light, body);
      g.beginPath();
      g.ellipse(0, -s * 0.02, s * 0.58, s * 0.48, 0, Math.PI, Math.PI * 2);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.028; g.stroke();

      // 龟壳纹
      g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.018;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + Math.PI / 6;
        const px = Math.cos(a) * s * 0.22;
        const py = -s * 0.20 + Math.sin(a) * s * 0.22;
        if (i === 0) { g.beginPath(); g.moveTo(px, py); } else g.lineTo(px, py);
      }
      g.closePath(); g.stroke();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + Math.PI / 6;
        g.beginPath();
        g.moveTo(Math.cos(a) * s * 0.22, -s * 0.20 + Math.sin(a) * s * 0.22);
        g.lineTo(Math.cos(a) * s * 0.48, -s * 0.20 + Math.sin(a) * s * 0.38);
        g.stroke();
      }

      g.fillStyle = hexA(belly, 0.85);
      g.beginPath();
      g.ellipse(0, s * 0.10, s * 0.55, s * 0.16, 0, 0, Math.PI);
      g.fill();
      g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();

      const hx = s * 0.50, hy = -s * 0.10, hr = s * 0.20;
      g.fillStyle = rgrad(g, hx, hy, hr, light, body);
      circ(g, hx, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.022; g.stroke();

      const bl = blinkAt(time, h);
      drawEye(g, hx + hr * 0.30, hy - hr * 0.10, hr * 0.25, { blink: bl });

      g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.018;
      g.beginPath();
      g.arc(hx + hr * 0.30, hy + hr * 0.20, hr * 0.14, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();

      g.restore();
    }

    /* =========================================================
     *  18. 兔
     * ========================================================= */
    function drawBunny(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 3) * s * 0.04;
      g.save(); g.translate(0, bob);

      g.fillStyle = rgrad(g, -s * 0.40, s * 0.28, s * 0.15, '#ffffff', '#e0e0e0');
      circ(g, -s * 0.42, s * 0.30, s * 0.14); g.fill();
      g.strokeStyle = hexA(dark, 0.3); g.lineWidth = s * 0.018; g.stroke();

      g.fillStyle = shade(body, -10);
      for (const sx of [-1, 1]) {
        ell(g, sx * s * 0.24, s * 0.52, s * 0.16, s * 0.12); g.fill();
        g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.018; g.stroke();
      }

      g.fillStyle = rgrad(g, 0, s * 0.18, s * 0.55, light, body);
      ell(g, 0, s * 0.20, s * 0.44, s * 0.42); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      g.fillStyle = hexA(belly, 0.9);
      ell(g, 0, s * 0.28, s * 0.26, s * 0.24); g.fill();

      const hy = -s * 0.28, hr = s * 0.40;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      for (const sx of [-1, 1]) {
        g.save();
        g.translate(sx * hr * 0.30, hy - hr * 0.70);
        g.rotate(sx * 0.15 + Math.sin(time * 2 + sx) * 0.05);
        g.fillStyle = rgrad(g, 0, 0, hr * 0.5, light, body);
        ell(g, 0, -hr * 0.50, hr * 0.20, hr * 0.75); g.fill();
        g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.022; g.stroke();
        g.fillStyle = hexA('#ff9db8', 0.6);
        ell(g, 0, -hr * 0.50, hr * 0.10, hr * 0.55); g.fill();
        g.restore();
      }

      g.fillStyle = hexA(belly, 0.95);
      ell(g, 0, hy + hr * 0.42, hr * 0.34, hr * 0.24); g.fill();

      g.fillStyle = '#ff8a9a';
      g.beginPath();
      g.moveTo(-hr * 0.08, hy + hr * 0.32);
      g.lineTo(hr * 0.08, hy + hr * 0.32);
      g.lineTo(0, hy + hr * 0.40);
      g.closePath(); g.fill();

      g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.018;
      g.beginPath();
      g.moveTo(0, hy + hr * 0.40);
      g.lineTo(0, hy + hr * 0.48);
      g.moveTo(-hr * 0.14, hy + hr * 0.50);
      g.quadraticCurveTo(-hr * 0.07, hy + hr * 0.58, 0, hy + hr * 0.48);
      g.quadraticCurveTo( hr * 0.07, hy + hr * 0.58, hr * 0.14, hy + hr * 0.50);
      g.stroke();

      g.fillStyle = '#fff';
      g.fillRect(-hr * 0.06, hy + hr * 0.48, hr * 0.05, hr * 0.10);
      g.fillRect( hr * 0.01, hy + hr * 0.48, hr * 0.05, hr * 0.10);
      g.strokeStyle = hexA(dark, 0.3); g.lineWidth = s * 0.008;
      g.strokeRect(-hr * 0.06, hy + hr * 0.48, hr * 0.05, hr * 0.10);
      g.strokeRect( hr * 0.01, hy + hr * 0.48, hr * 0.05, hr * 0.10);

      const bl = blinkAt(time, h);
      drawEye(g, -hr * 0.40, hy - hr * 0.10, hr * 0.22, { blink: bl });
      drawEye(g,  hr * 0.40, hy - hr * 0.10, hr * 0.22, { blink: bl });

      blush(g, -hr * 0.62, hy + hr * 0.18, hr * 0.13, 0.36);
      blush(g,  hr * 0.62, hy + hr * 0.18, hr * 0.13, 0.36);

      g.restore();
    }

    /* =========================================================
     *  19. 牛 / 鹿
     * ========================================================= */
    function drawBovine(g, s, time, pal, h, shapeName) {
      const nm = String(shapeName || '').toLowerCase();
      const isDeer = /deer|鹿/.test(nm);
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 2.2) * s * 0.025;
      g.save(); g.translate(0, bob);

      g.strokeStyle = hexA(shade(body, -20), 0.9);
      g.lineWidth = s * 0.04; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-s * 0.40, s * 0.20);
      g.quadraticCurveTo(-s * 0.50, s * 0.40, -s * 0.48, s * 0.55);
      g.stroke();
      g.fillStyle = hexA(accent, 0.8);
      ell(g, -s * 0.48, s * 0.58, s * 0.06, s * 0.08); g.fill();

      for (const sx of [-1, 1]) {
        g.fillStyle = shade(body, -20);
        g.fillRect(sx * s * 0.22 - s * 0.07, s * 0.42, s * 0.14, s * 0.22);
        g.fillStyle = hexA(dark, 0.85);
        g.fillRect(sx * s * 0.22 - s * 0.07, s * 0.58, s * 0.14, s * 0.08);
      }

      g.fillStyle = rgrad(g, 0, s * 0.15, s * 0.60, light, body);
      ell(g, 0, s * 0.15, s * 0.50, s * 0.42); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      g.fillStyle = hexA(belly, 0.88);
      ell(g, 0, s * 0.24, s * 0.30, s * 0.26); g.fill();

      g.fillStyle = hexA(shade(body, -35), 0.5);
      for (const p of [[-0.20, 0.05], [0.15, 0.10], [-0.10, 0.25], [0.25, 0.20]]) {
        ell(g, p[0] * s, p[1] * s, s * 0.08, s * 0.06); g.fill();
      }

      const hy = -s * 0.30, hr = s * 0.38;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      ell(g, 0, hy, hr * 0.9, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      for (const sx of [-1, 1]) {
        g.fillStyle = shade(body, -6);
        ell(g, sx * hr * 0.90, hy - hr * 0.30, hr * 0.28, hr * 0.16, sx * 0.4); g.fill();
        g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.018; g.stroke();
      }

      if (isDeer) {
        g.strokeStyle = '#c8a468';
        g.lineWidth = s * 0.045; g.lineCap = 'round';
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.moveTo(sx * hr * 0.50, hy - hr * 0.70);
          g.quadraticCurveTo(sx * hr * 0.80, hy - hr * 1.30, sx * hr * 0.55, hy - hr * 1.60);
          g.stroke();
          g.lineWidth = s * 0.030;
          g.beginPath();
          g.moveTo(sx * hr * 0.65, hy - hr * 1.10);
          g.lineTo(sx * hr * 1.00, hy - hr * 1.25);
          g.stroke();
          g.lineWidth = s * 0.045;
        }
      } else {
        for (const sx of [-1, 1]) {
          g.fillStyle = hexA(belly, 0.95);
          g.beginPath();
          g.moveTo(sx * hr * 0.40, hy - hr * 0.70);
          g.quadraticCurveTo(sx * hr * 0.70, hy - hr * 1.20, sx * hr * 0.40, hy - hr * 1.30);
          g.quadraticCurveTo(sx * hr * 0.55, hy - hr * 1.10, sx * hr * 0.28, hy - hr * 0.70);
          g.closePath(); g.fill();
          g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();
        }
      }

      g.fillStyle = hexA(belly, 0.95);
      ell(g, 0, hy + hr * 0.52, hr * 0.46, hr * 0.30); g.fill();
      g.strokeStyle = hexA(dark, 0.3); g.lineWidth = s * 0.016; g.stroke();

      g.fillStyle = hexA(dark, 0.8);
      circ(g, -hr * 0.16, hy + hr * 0.55, hr * 0.05); g.fill();
      circ(g,  hr * 0.16, hy + hr * 0.55, hr * 0.05); g.fill();

      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.02;
      g.beginPath();
      g.arc(0, hy + hr * 0.62, hr * 0.14, Math.PI * 0.2, Math.PI * 0.8);
      g.stroke();

      const bl = blinkAt(time, h);
      drawEye(g, -hr * 0.42, hy - hr * 0.05, hr * 0.22, { blink: bl });
      drawEye(g,  hr * 0.42, hy - hr * 0.05, hr * 0.22, { blink: bl });

      g.restore();
    }

    /* =========================================================
     *  20. 蛇
     * ========================================================= */
    function drawSnake(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 2) * s * 0.04;
      g.save(); g.translate(0, bob);

      // 盘绕身体
      for (let i = 0; i < 3; i++) {
        const t = i / 3;
        const radius = s * (0.55 - t * 0.30);
        const yBase = s * (0.40 - t * 0.30);
        const wobble = Math.sin(time * 2 + i * 0.8) * s * 0.03;
        g.strokeStyle = rgrad(g, 0, 0, radius, light, body);
        g.lineWidth = s * (0.22 - t * 0.05); g.lineCap = 'round';
        g.beginPath();
        g.ellipse(0, yBase + wobble, radius, radius * 0.35, 0, 0, Math.PI);
        g.stroke();
        g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();
      }

      const headY = -s * 0.45;
      const swayX = Math.sin(time * 1.8) * s * 0.10;

      g.strokeStyle = rgrad(g, 0, s * 0.20, s * 0.50, light, body);
      g.lineWidth = s * 0.18; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, s * 0.40);
      g.bezierCurveTo(0, s * 0.10, swayX * 2, -s * 0.20, swayX, headY + s * 0.10);
      g.stroke();

      g.strokeStyle = hexA(dark, 0.3); g.lineWidth = s * 0.014;
      for (let i = 0; i < 4; i++) {
        const t = i / 4;
        const px = Math.sin(time * 1.8 + t * 2) * s * 0.10 * (1 - t);
        const py = s * 0.30 - t * s * 0.60;
        g.beginPath();
        g.arc(px, py, s * 0.08, Math.PI * 0.15, Math.PI * 0.85);
        g.stroke();
      }

      const hx = swayX, hy = headY, hr = s * 0.22;
      g.fillStyle = rgrad(g, hx, hy, hr, light, body);
      ell(g, hx, hy, hr * 1.1, hr * 0.9); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.024; g.stroke();

      const bl = blinkAt(time, h);
      drawEye(g, hx - hr * 0.35, hy - hr * 0.10, hr * 0.30, { blink: bl, iris: '#ffd23c', pr: 0.45 });
      drawEye(g, hx + hr * 0.35, hy - hr * 0.10, hr * 0.30, { blink: bl, iris: '#ffd23c', pr: 0.45 });

      g.strokeStyle = '#ff4060'; g.lineWidth = s * 0.018; g.lineCap = 'round';
      const tongue = Math.sin(time * 4) * 0.5 + 0.5;
      if (tongue > 0.3) {
        g.beginPath();
        g.moveTo(hx, hy + hr * 0.30);
        g.lineTo(hx, hy + hr * (0.50 + tongue * 0.30));
        g.moveTo(hx, hy + hr * (0.50 + tongue * 0.30));
        g.lineTo(hx - hr * 0.15, hy + hr * (0.60 + tongue * 0.30));
        g.moveTo(hx, hy + hr * (0.50 + tongue * 0.30));
        g.lineTo(hx + hr * 0.15, hy + hr * (0.60 + tongue * 0.30));
        g.stroke();
      }

      g.restore();
    }

    /* =========================================================
     *  21. 鯨
     * ========================================================= */
    function drawWhale(g, s, time, pal, h) {
      const { body, belly, dark, light } = pal;
      const bob = Math.sin(time * 1.6) * s * 0.05;
      g.save(); g.translate(0, bob);

      g.save();
      g.translate(-s * 0.65, s * 0.10);
      g.rotate(Math.sin(time * 1.8) * 0.2);
      g.fillStyle = shade(body, -20);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(-s * 0.25, -s * 0.35, -s * 0.40, -s * 0.10);
      g.quadraticCurveTo(-s * 0.30, 0, -s * 0.40, s * 0.10);
      g.quadraticCurveTo(-s * 0.25, s * 0.35, 0, 0);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();
      g.restore();

      g.fillStyle = rgrad(g, 0, -s * 0.10, s * 0.75, light, body);
      g.beginPath();
      g.moveTo(-s * 0.60, s * 0.10);
      g.bezierCurveTo(-s * 0.70, -s * 0.30, -s * 0.30, -s * 0.55, s * 0.10, -s * 0.50);
      g.bezierCurveTo( s * 0.55, -s * 0.45, s * 0.75, -s * 0.10, s * 0.70, s * 0.10);
      g.bezierCurveTo( s * 0.60, s * 0.40, s * 0.10, s * 0.50, -s * 0.60, s * 0.10);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();

      g.fillStyle = hexA(belly, 0.92);
      g.beginPath();
      g.moveTo(-s * 0.55, s * 0.15);
      g.bezierCurveTo(-s * 0.40, s * 0.42, s * 0.20, s * 0.45, s * 0.60, s * 0.10);
      g.bezierCurveTo(s * 0.30, s * 0.30, -s * 0.10, s * 0.35, -s * 0.55, s * 0.15);
      g.closePath(); g.fill();

      g.strokeStyle = hexA(dark, 0.25); g.lineWidth = s * 0.012;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(s * (-0.40 + i * 0.18), s * 0.10);
        g.quadraticCurveTo(s * (-0.30 + i * 0.18), s * 0.28, s * (-0.10 + i * 0.18), s * 0.30);
        g.stroke();
      }

      for (const sx of [-1, 1]) {
        g.fillStyle = shade(body, -10);
        g.beginPath();
        g.moveTo(sx * s * 0.10, s * 0.16);
        g.quadraticCurveTo(sx * s * 0.30, s * 0.34, sx * s * 0.45, s * 0.38);
        g.quadraticCurveTo(sx * s * 0.32, s * 0.28, sx * s * 0.10, s * 0.20);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.016; g.stroke();
      }

      const bl = blinkAt(time, h);
      drawEye(g, s * 0.40, -s * 0.10, s * 0.09, { blink: bl });

      g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.024; g.lineCap = 'round';
      g.beginPath();
      g.arc(s * 0.42, s * 0.02, s * 0.20, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();

      const spout = Math.sin(time * 1.5) * 0.5 + 0.5;
      if (spout > 0.4) {
        g.save();
        g.globalAlpha = (spout - 0.4) * 0.8;
        g.fillStyle = 'rgba(180,220,255,0.7)';
        const sx = s * 0.10, sy = -s * 0.50;
        for (let i = 0; i < 3; i++) {
          const t = i / 3;
          circ(g, sx + (t - 0.5) * s * 0.15, sy - s * 0.20 - t * s * 0.30, s * 0.06 * (1 - t * 0.4)); g.fill();
        }
        g.restore();
      }

      g.restore();
    }

    /* =========================================================
     *  22. 傀儡 / 石頭
     * ========================================================= */
    function drawGolem(g, s, time, pal, h) {
      const { body, accent, dark, light } = pal;
      const bob = Math.sin(time * 2) * s * 0.02;
      g.save(); g.translate(0, bob);

      g.fillStyle = shade(body, -25);
      for (const sx of [-1, 1]) {
        g.fillRect(sx * s * 0.22 - s * 0.10, s * 0.38, s * 0.20, s * 0.22);
        g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.02;
        g.strokeRect(sx * s * 0.22 - s * 0.10, s * 0.38, s * 0.20, s * 0.22);
      }

      g.fillStyle = rgrad(g, 0, s * 0.10, s * 0.55, light, body);
      g.beginPath();
      g.moveTo(-s * 0.42, -s * 0.20);
      g.lineTo( s * 0.42, -s * 0.20);
      g.lineTo( s * 0.50, s * 0.40);
      g.lineTo(-s * 0.50, s * 0.40);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.7); g.lineWidth = s * 0.032; g.stroke();

      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.02;
      g.beginPath();
      g.moveTo(-s * 0.30, -s * 0.10);
      g.lineTo(-s * 0.20, s * 0.00);
      g.lineTo(-s * 0.28, s * 0.10);
      g.stroke();
      g.beginPath();
      g.moveTo(s * 0.25, -s * 0.05);
      g.lineTo(s * 0.15, s * 0.05);
      g.lineTo(s * 0.22, s * 0.20);
      g.stroke();

      for (const sx of [-1, 1]) {
        g.fillStyle = shade(body, -15);
        g.fillRect(sx * s * 0.55 - s * 0.08, -s * 0.15, s * 0.16, s * 0.40);
        g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.02;
        g.strokeRect(sx * s * 0.55 - s * 0.08, -s * 0.15, s * 0.16, s * 0.40);
      }

      const hy = -s * 0.38, hr = s * 0.32;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      g.beginPath();
      g.moveTo(-hr * 0.9, hy + hr * 0.5);
      g.lineTo(-hr * 0.8, hy - hr * 0.8);
      g.lineTo( hr * 0.8, hy - hr * 0.8);
      g.lineTo( hr * 0.9, hy + hr * 0.5);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.7); g.lineWidth = s * 0.03; g.stroke();

      const glow = 0.6 + Math.sin(time * 3) * 0.4;
      g.save();
      g.shadowBlur = s * 0.30; g.shadowColor = accent;
      g.fillStyle = hexA(accent, 0.9 * glow);
      g.fillRect(-hr * 0.55, hy - hr * 0.15, hr * 0.30, hr * 0.18);
      g.fillRect( hr * 0.25, hy - hr * 0.15, hr * 0.30, hr * 0.18);
      g.restore();

      g.save();
      g.shadowBlur = s * 0.30; g.shadowColor = accent;
      g.fillStyle = hexA(accent, 0.8);
      circ(g, 0, s * 0.10, s * 0.10); g.fill();
      g.restore();

      g.restore();
    }

    /* =========================================================
     *  23. 植物
     * ========================================================= */
    function drawPlant(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 2.2) * s * 0.03;
      g.save(); g.translate(0, bob);

      g.strokeStyle = '#4a8a3a';
      g.lineWidth = s * 0.10; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, s * 0.50);
      g.quadraticCurveTo(s * 0.05, s * 0.20, 0, -s * 0.05);
      g.stroke();

      for (const sx of [-1, 1]) {
        g.save();
        g.translate(sx * s * 0.10, s * 0.20);
        g.rotate(sx * 0.8);
        g.fillStyle = rgrad(g, 0, 0, s * 0.25, '#8ac868', '#4a8a3a');
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(-s * 0.20, -s * 0.15, -s * 0.30, 0);
        g.quadraticCurveTo(-s * 0.20, s * 0.15, 0, 0);
        g.closePath(); g.fill();
        g.strokeStyle = '#2a5a1a'; g.lineWidth = s * 0.016; g.stroke();
        g.restore();
      }

      const hy = -s * 0.28, hr = s * 0.38;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      g.strokeStyle = hexA(dark, 0.3); g.lineWidth = s * 0.016;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.35;
        g.beginPath();
        g.moveTo(Math.cos(a) * hr * 0.5, hy + Math.sin(a) * hr * 0.5);
        g.lineTo(Math.cos(a) * hr * 0.95, hy + Math.sin(a) * hr * 0.95);
        g.stroke();
      }

      g.fillStyle = '#4a8a3a';
      for (let i = -1; i <= 1; i++) {
        g.save();
        g.translate(0, hy - hr * 0.85);
        g.rotate(i * 0.5);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(-s * 0.05, -s * 0.15, 0, -s * 0.25);
        g.quadraticCurveTo(s * 0.05, -s * 0.15, 0, 0);
        g.closePath(); g.fill();
        g.restore();
      }

      const bl = blinkAt(time, h);
      drawEye(g, -hr * 0.35, hy - hr * 0.05, hr * 0.20, { blink: bl });
      drawEye(g,  hr * 0.35, hy - hr * 0.05, hr * 0.20, { blink: bl });

      g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.022; g.lineCap = 'round';
      g.beginPath();
      g.arc(0, hy + hr * 0.25, hr * 0.20, Math.PI * 0.2, Math.PI * 0.8);
      g.stroke();

      blush(g, -hr * 0.60, hy + hr * 0.15, hr * 0.12, 0.4);
      blush(g,  hr * 0.60, hy + hr * 0.15, hr * 0.12, 0.4);

      g.restore();
    }

    /* =========================================================
     *  24. 通用原型：走獸（貓科/犬科/牛科 fallback）
     * ========================================================= */
    function drawBeast(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 2.4 + (h % 7)) * s * 0.035;
      g.save(); g.translate(0, bob);

      const earType = ['round', 'pointed', 'long', 'droop', 'horns', 'antlers'][h % 6];
      const patType = ['none', 'spots', 'stripes', 'patch'][(h >>> 3) % 4];

      const tw = Math.sin(time * 2.8 + (h % 5)) * 0.35;
      g.save();
      g.translate(-s * 0.40, s * 0.24);
      g.rotate(-0.45 + tw);
      g.fillStyle = rgrad(g, 0, s * 0.24, s * 0.24, light, body);
      ell(g, 0, s * 0.22, s * 0.13, s * 0.30); g.fill();
      g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();
      if (patType === 'patch' || earType === 'antlers') {
        g.fillStyle = hexA(belly, 0.9);
        ell(g, 0, s * 0.40, s * 0.12, s * 0.11); g.fill();
      }
      g.restore();

      g.fillStyle = shade(body, -14);
      ell(g, -s * 0.23, s * 0.55, s * 0.15, s * 0.15); g.fill();
      ell(g,  s * 0.23, s * 0.55, s * 0.15, s * 0.15); g.fill();
      g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.02;
      ell(g, -s * 0.23, s * 0.55, s * 0.15, s * 0.15); g.stroke();
      ell(g,  s * 0.23, s * 0.55, s * 0.15, s * 0.15); g.stroke();

      g.fillStyle = rgrad(g, 0, s * 0.20, s * 0.62, light, body);
      ell(g, 0, s * 0.20, s * 0.50, s * 0.46); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();

      g.fillStyle = hexA(belly, 0.92);
      ell(g, 0, s * 0.30, s * 0.29, s * 0.28); g.fill();

      drawBeastPattern(g, s, patType, dark, body, 0.20);

      const hy = -s * 0.30, hr = s * 0.46;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();

      drawBeastEars(g, s, hy, hr, earType, pal);

      if (patType === 'stripes') {
        g.fillStyle = hexA(shade(body, -45), 0.85);
        for (let i = -1; i <= 1; i++) {
          g.beginPath();
          g.moveTo(i * hr * 0.28, hy - hr * 0.90);
          g.lineTo(i * hr * 0.28 - hr * 0.07, hy - hr * 0.42);
          g.lineTo(i * hr * 0.28 + hr * 0.07, hy - hr * 0.42);
          g.closePath(); g.fill();
        }
      }

      g.fillStyle = hexA(belly, 0.95);
      ell(g, 0, hy + hr * 0.46, hr * 0.48, hr * 0.34); g.fill();
      g.strokeStyle = hexA(dark, 0.16); g.lineWidth = s * 0.016; g.stroke();

      g.fillStyle = dark;
      ell(g, 0, hy + hr * 0.26, hr * 0.17, hr * 0.12); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      circ(g, -hr * 0.05, hy + hr * 0.22, hr * 0.04); g.fill();

      g.strokeStyle = hexA(dark, 0.65); g.lineWidth = s * 0.022; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, hy + hr * 0.38);
      g.lineTo(0, hy + hr * 0.48);
      g.moveTo(-hr * 0.16, hy + hr * 0.50);
      g.quadraticCurveTo(-hr * 0.08, hy + hr * 0.60, 0, hy + hr * 0.48);
      g.quadraticCurveTo( hr * 0.08, hy + hr * 0.60, hr * 0.16, hy + hr * 0.50);
      g.stroke();

      const bl = blinkAt(time, h);
      const iris = (h % 3 === 0) ? accent : null;
      drawEye(g, -hr * 0.44, hy - hr * 0.10, hr * 0.25, { blink: bl, iris });
      drawEye(g,  hr * 0.44, hy - hr * 0.10, hr * 0.25, { blink: bl, iris });

      if (earType === 'pointed' || earType === 'round') {
        whiskers(g, -hr * 0.34, hy + hr * 0.40, hr * 0.18, -1);
        whiskers(g,  hr * 0.34, hy + hr * 0.40, hr * 0.18,  1);
      }

      blush(g, -hr * 0.70, hy + hr * 0.22, hr * 0.15, 0.32);
      blush(g,  hr * 0.70, hy + hr * 0.22, hr * 0.15, 0.32);

      g.restore();
    }

    function drawBeastEars(g, s, hy, hr, type, pal) {
      const { body, belly, dark, light } = pal;
      const inner = hexA('#ff9db8', 0.70);

      if (type === 'round') {
        for (const sx of [-1, 1]) {
          g.fillStyle = rgrad(g, sx * hr * 0.74, hy - hr * 0.62, hr * 0.42, light, body);
          circ(g, sx * hr * 0.74, hy - hr * 0.62, hr * 0.40); g.fill();
          g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.024; g.stroke();
          g.fillStyle = inner;
          circ(g, sx * hr * 0.74, hy - hr * 0.62, hr * 0.19); g.fill();
        }
      } else if (type === 'pointed') {
        for (const sx of [-1, 1]) {
          g.fillStyle = shade(body, -6);
          g.beginPath();
          g.moveTo(sx * hr * 0.34, hy - hr * 0.66);
          g.lineTo(sx * hr * 0.96, hy - hr * 1.34);
          g.lineTo(sx * hr * 0.92, hy - hr * 0.36);
          g.closePath(); g.fill();
          g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.024; g.stroke();
          g.fillStyle = inner;
          g.beginPath();
          g.moveTo(sx * hr * 0.48, hy - hr * 0.66);
          g.lineTo(sx * hr * 0.86, hy - hr * 1.16);
          g.lineTo(sx * hr * 0.84, hy - hr * 0.50);
          g.closePath(); g.fill();
        }
      } else if (type === 'long') {
        for (const sx of [-1, 1]) {
          g.save();
          g.translate(sx * hr * 0.52, hy - hr * 0.72);
          g.rotate(sx * 0.28);
          g.fillStyle = rgrad(g, 0, 0, hr * 0.60, light, body);
          ell(g, 0, -hr * 0.34, hr * 0.24, hr * 0.66); g.fill();
          g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.024; g.stroke();
          g.fillStyle = inner;
          ell(g, 0, -hr * 0.34, hr * 0.11, hr * 0.44); g.fill();
          g.restore();
        }
      } else if (type === 'droop') {
        for (const sx of [-1, 1]) {
          g.fillStyle = rgrad(g, sx * hr * 0.80, hy, hr * 0.5, shade(body, -4), shade(body, -32));
          ell(g, sx * hr * 0.86, hy + hr * 0.30, hr * 0.30, hr * 0.58, sx * 0.15); g.fill();
          g.strokeStyle = hexA(dark, 0.45); g.lineWidth = s * 0.022; g.stroke();
        }
      } else if (type === 'horns') {
        for (const sx of [-1, 1]) {
          g.fillStyle = hexA(belly, 0.95);
          g.beginPath();
          g.moveTo(sx * hr * 0.48, hy - hr * 0.72);
          g.quadraticCurveTo(sx * hr * 0.90, hy - hr * 1.14, sx * hr * 0.34, hy - hr * 1.20);
          g.quadraticCurveTo(sx * hr * 0.62, hy - hr * 0.94, sx * hr * 0.28, hy - hr * 0.70);
          g.closePath(); g.fill();
          g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.02; g.stroke();
        }
        for (const sx of [-1, 1]) {
          g.fillStyle = shade(body, -10);
          circ(g, sx * hr * 0.86, hy - hr * 0.40, hr * 0.20); g.fill();
          g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();
        }
      } else if (type === 'antlers') {
        for (const sx of [-1, 1]) {
          g.strokeStyle = '#c8a468';
          g.lineWidth = s * 0.055; g.lineCap = 'round';
          g.beginPath();
          g.moveTo(sx * hr * 0.44, hy - hr * 0.80);
          g.quadraticCurveTo(sx * hr * 0.70, hy - hr * 1.24, sx * hr * 0.44, hy - hr * 1.56);
          g.stroke();
          g.lineWidth = s * 0.036;
          g.beginPath();
          g.moveTo(sx * hr * 0.58, hy - hr * 1.08);
          g.lineTo(sx * hr * 0.92, hy - hr * 1.24);
          g.moveTo(sx * hr * 0.50, hy - hr * 1.30);
          g.lineTo(sx * hr * 0.24, hy - hr * 1.46);
          g.stroke();
        }
        for (const sx of [-1, 1]) {
          g.fillStyle = shade(body, -8);
          ell(g, sx * hr * 0.84, hy - hr * 0.36, hr * 0.24, hr * 0.16, sx * 0.5); g.fill();
          g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.018; g.stroke();
        }
      }
    }

    function drawBeastPattern(g, s, type, dark, body, cy) {
      if (type === 'spots') {
        g.fillStyle = hexA(shade(body, -42), 0.55);
        for (const p of [[-0.26, 0.10], [0.24, 0.16], [-0.10, 0.32], [0.12, -0.02], [0.30, 0.36]]) {
          ell(g, p[0] * s, cy + p[1] * s * 0.9, s * 0.07, s * 0.06); g.fill();
        }
      } else if (type === 'stripes') {
        g.strokeStyle = hexA(shade(body, -45), 0.65);
        g.lineWidth = s * 0.055; g.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          g.beginPath();
          g.moveTo(i * s * 0.20, cy - s * 0.10);
          g.quadraticCurveTo(i * s * 0.24, cy + s * 0.08, i * s * 0.16, cy + s * 0.24);
          g.stroke();
        }
      } else if (type === 'patch') {
        g.fillStyle = hexA(shade(body, -45), 0.45);
        ell(g, s * 0.20, cy + s * 0.06, s * 0.15, s * 0.12, 0.4); g.fill();
      }
    }

    /* =========================================================
     *  25. 通用原型：有翼
     * ========================================================= */
    function drawWinged(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const flap = Math.sin(time * 3.0 + (h % 6)) * 0.16 + 0.10;
      g.save();
      g.translate(0, Math.sin(time * 2.0 + (h % 9)) * s * 0.05);

      for (const sx of [-1, 1]) {
        g.save();
        g.translate(sx * s * 0.10, -s * 0.06);
        g.rotate(sx * (0.48 + flap));
        g.fillStyle = rgrad(g, 0, 0, s * 0.80, hexA(accent, 0.96), hexA(shade(accent, -42), 0.86));
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(sx * s * 0.50, -s * 0.56, sx * s * 1.14, -s * 0.66, sx * s * 1.28, -s * 0.14);
        g.bezierCurveTo(sx * s * 1.08, s * 0.06, sx * s * 0.78, s * 0.12, sx * s * 0.54, s * 0.06);
        g.bezierCurveTo(sx * s * 0.38, s * 0.26, sx * s * 0.14, s * 0.22, 0, 0);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.024; g.stroke();
        g.strokeStyle = hexA(dark, 0.30); g.lineWidth = s * 0.018;
        for (let i = 1; i <= 3; i++) {
          g.beginPath();
          g.moveTo(sx * s * 0.08 * i, s * 0.02);
          g.quadraticCurveTo(sx * s * (0.30 + i * 0.18), -s * 0.28, sx * s * (0.34 + i * 0.26), -s * 0.44);
          g.stroke();
        }
        g.restore();
      }

      g.fillStyle = hexA(accent, 0.88);
      for (let i = -2; i <= 2; i++) {
        g.save();
        g.translate(0, s * 0.42);
        g.rotate(i * 0.30 + Math.sin(time * 2.4 + i) * 0.05);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(-s * 0.10, s * 0.24, 0, s * 0.52);
        g.quadraticCurveTo( s * 0.10, s * 0.24, 0, 0);
        g.closePath(); g.fill();
        g.restore();
      }

      g.fillStyle = rgrad(g, 0, s * 0.14, s * 0.58, light, body);
      ell(g, 0, s * 0.16, s * 0.44, s * 0.46); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      g.fillStyle = hexA(belly, 0.88);
      ell(g, 0, s * 0.24, s * 0.26, s * 0.28); g.fill();

      const hy = -s * 0.36, hr = s * 0.40;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      if ((h >>> 4) % 3 === 0) {
        g.save();
        g.strokeStyle = hexA('#ffe680', 0.9);
        g.lineWidth = s * 0.05;
        g.shadowBlur = s * 0.30; g.shadowColor = '#ffe680';
        ell(g, 0, hy - hr * 1.30, hr * 0.58, hr * 0.16); g.stroke();
        g.restore();
      } else {
        g.fillStyle = hexA(accent, 0.95);
        for (let i = -1; i <= 1; i++) {
          const a = -Math.PI / 2 + i * 0.42;
          const bx = Math.cos(a) * hr * 0.92, by = Math.sin(a) * hr * 0.92;
          g.beginPath();
          g.moveTo(bx - hr * 0.10, by + hr * 0.14);
          g.lineTo(bx, by - hr * 0.30);
          g.lineTo(bx + hr * 0.10, by + hr * 0.14);
          g.closePath(); g.fill();
          g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.014; g.stroke();
        }
      }

      const bl = blinkAt(time, h);
      drawEye(g, -hr * 0.42, hy - hr * 0.08, hr * 0.25, { blink: bl, iris: accent, pr: 0.44 });
      drawEye(g,  hr * 0.42, hy - hr * 0.08, hr * 0.25, { blink: bl, iris: accent, pr: 0.44 });

      g.strokeStyle = hexA(dark, 0.55); g.lineWidth = s * 0.022; g.lineCap = 'round';
      g.beginPath();
      g.arc(0, hy + hr * 0.42, hr * 0.14, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();

      blush(g, -hr * 0.68, hy + hr * 0.20, hr * 0.15, 0.34);
      blush(g,  hr * 0.68, hy + hr * 0.20, hr * 0.15, 0.34);

      g.restore();
    }

    /* =========================================================
     *  26. 通用原型：水生
     * ========================================================= */
    function drawAquatic(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const sw = Math.sin(time * 2.0 + (h % 5));
      g.save();
      g.translate(0, sw * s * 0.05);

      g.save();
      g.translate(-s * 0.58, s * 0.06);
      g.rotate(sw * 0.30);
      g.fillStyle = hexA(accent, 0.92);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(-s * 0.34, -s * 0.46, -s * 0.56, -s * 0.14);
      g.quadraticCurveTo(-s * 0.42, 0, -s * 0.56, s * 0.14);
      g.quadraticCurveTo(-s * 0.34, s * 0.46, 0, 0);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();
      g.strokeStyle = hexA(dark, 0.25); g.lineWidth = s * 0.016;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(-s * 0.05, 0);
        g.lineTo(-s * 0.42, i * s * 0.10);
        g.stroke();
      }
      g.restore();

      g.fillStyle = hexA(accent, 0.88);
      g.beginPath();
      g.moveTo(-s * 0.08, -s * 0.28);
      g.quadraticCurveTo(s * 0.02, -s * 0.70, s * 0.28, -s * 0.26);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();

      g.fillStyle = rgrad(g, 0, s * 0.02, s * 0.72, light, body);
      ell(g, 0, s * 0.02, s * 0.64, s * 0.44); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      g.fillStyle = hexA(belly, 0.92);
      g.beginPath();
      g.ellipse(0, s * 0.14, s * 0.50, s * 0.26, 0, 0, Math.PI);
      g.fill();

      for (const sx of [-1, 1]) {
        g.fillStyle = hexA(accent, 0.82);
        g.beginPath();
        g.moveTo(sx * s * 0.14, s * 0.14);
        g.lineTo(sx * s * 0.44, s * 0.34);
        g.lineTo(sx * s * 0.16, s * 0.28);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.016; g.stroke();
      }

      const bl = blinkAt(time, h);
      drawEye(g, s * 0.34, -s * 0.12, s * 0.11, { blink: bl });

      g.strokeStyle = hexA(dark, 0.55); g.lineWidth = s * 0.022; g.lineCap = 'round';
      g.beginPath();
      g.arc(s * 0.40, s * 0.04, s * 0.08, Math.PI * 0.30, Math.PI * 0.95);
      g.stroke();

      blush(g, s * 0.28, s * 0.04, s * 0.10, 0.30);

      g.restore();
    }

    /* =========================================================
     *  27. 通用原型：爬蟲 / 長條
     * ========================================================= */
    function drawReptile(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const wob = Math.sin(time * 2.4 + (h % 7));
      g.save();
      g.translate(0, wob * s * 0.04);

      for (let i = 5; i >= 1; i--) {
        const t = i / 5;
        const tx = -s * (0.36 + t * 0.60);
        const ty = s * (0.10 + Math.sin(time * 3 - i * 0.8) * 0.10 * t);
        const r = s * (0.10 + t * 0.07);
        g.fillStyle = rgrad(g, tx, ty, r, light, body);
        circ(g, tx, ty, r); g.fill();
        g.strokeStyle = hexA(dark, 0.42); g.lineWidth = s * 0.018; g.stroke();
      }

      g.fillStyle = shade(body, -16);
      for (const sx of [-1, 1]) {
        ell(g, sx * s * 0.30, s * 0.46, s * 0.14, s * 0.10, sx * 0.35); g.fill();
        g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.018; g.stroke();
      }

      g.fillStyle = rgrad(g, 0, s * 0.10, s * 0.60, light, body);
      ell(g, 0, s * 0.10, s * 0.48, s * 0.40); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      g.fillStyle = hexA(belly, 0.82);
      for (let i = 0; i < 3; i++) {
        ell(g, 0, s * (0.02 + i * 0.14), s * (0.30 - i * 0.04), s * 0.07); g.fill();
      }

      const hy = -s * 0.32, hr = s * 0.38;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      g.fillStyle = accent;
      for (let i = -1; i <= 1; i++) {
        const bx = i * hr * 0.36;
        g.beginPath();
        g.moveTo(bx - hr * 0.10, hy - hr * 0.86);
        g.lineTo(bx, hy - hr * 1.16);
        g.lineTo(bx + hr * 0.10, hy - hr * 0.86);
        g.closePath(); g.fill();
      }

      g.fillStyle = hexA(shade(body, 12), 1);
      ell(g, 0, hy + hr * 0.48, hr * 0.52, hr * 0.30); g.fill();
      g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.018; g.stroke();

      g.fillStyle = hexA(dark, 0.8);
      circ(g, -hr * 0.16, hy + hr * 0.36, hr * 0.045); g.fill();
      circ(g,  hr * 0.16, hy + hr * 0.36, hr * 0.045); g.fill();

      const bl = blinkAt(time, h);
      for (const sx of [-1, 1]) {
        g.save();
        g.fillStyle = '#fff';
        ell(g, sx * hr * 0.44, hy - hr * 0.10, hr * 0.24, hr * 0.22 * (1 - bl * 0.9)); g.fill();
        g.strokeStyle = 'rgba(20,20,30,0.22)'; g.lineWidth = s * 0.016; g.stroke();
        if (bl < 0.7) {
          g.fillStyle = '#ffd23c';
          circ(g, sx * hr * 0.44, hy - hr * 0.10, hr * 0.17); g.fill();
          g.fillStyle = '#1a1424';
          ell(g, sx * hr * 0.44, hy - hr * 0.10, hr * 0.055, hr * 0.13); g.fill();
          g.fillStyle = '#fff';
          circ(g, sx * hr * 0.44 - hr * 0.07, hy - hr * 0.18, hr * 0.05); g.fill();
        }
        g.restore();
      }

      g.restore();
    }

    /* =========================================================
     *  28. 通用原型：軟體 / 圓滾
     * ========================================================= */
    function drawBlob(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const squash = Math.sin(time * 2.2 + (h % 8));
      g.save();
      g.translate(0, s * 0.12 + Math.sin(time * 2 + h) * s * 0.03);
      g.scale(1 + squash * 0.045, 1 - squash * 0.045);

      g.fillStyle = rgrad(g, 0, s * 0.05, s * 0.80, light, body);
      g.beginPath();
      g.moveTo(-s * 0.78, s * 0.24);
      g.bezierCurveTo(-s * 0.84, -s * 0.42, -s * 0.44, -s * 0.82, 0, -s * 0.82);
      g.bezierCurveTo( s * 0.44, -s * 0.82,  s * 0.84, -s * 0.42, s * 0.78, s * 0.24);
      g.bezierCurveTo( s * 0.68, s * 0.72, -s * 0.68, s * 0.72, -s * 0.78, s * 0.24);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      g.fillStyle = 'rgba(255,255,255,0.34)';
      ell(g, -s * 0.30, -s * 0.34, s * 0.18, s * 0.12, -0.5); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)';
      ell(g, s * 0.28, -s * 0.20, s * 0.10, s * 0.07, 0.4); g.fill();

      g.fillStyle = hexA(belly, 0.45);
      ell(g, 0, s * 0.30, s * 0.46, s * 0.30); g.fill();

      const bl = blinkAt(time, h);
      drawEye(g, -s * 0.26, -s * 0.12, s * 0.20, { blink: bl });
      drawEye(g,  s * 0.26, -s * 0.12, s * 0.20, { blink: bl });

      g.strokeStyle = hexA(dark, 0.65); g.lineWidth = s * 0.032; g.lineCap = 'round';
      g.beginPath();
      g.arc(0, s * 0.16, s * 0.14, Math.PI * 0.16, Math.PI * 0.84);
      g.stroke();

      blush(g, -s * 0.46, s * 0.10, s * 0.13, 0.36);
      blush(g,  s * 0.46, s * 0.10, s * 0.13, 0.36);

      g.fillStyle = hexA(accent, 0.85);
      for (let i = 0; i < 4; i++) {
        const a = time * 0.8 + i * Math.PI / 2;
        circ(g, Math.cos(a) * s * 0.62, -s * 0.52 + Math.sin(a) * s * 0.22, s * 0.045); g.fill();
      }

      g.restore();
    }

    /* =========================================================
     *  29. 通用原型：幽靈
     * ========================================================= */
    function drawGhost(g, s, time, pal, h) {
      const { body, accent, dark, light } = pal;
      g.save();
      g.translate(0, Math.sin(time * 1.8 + (h % 6)) * s * 0.06);

      const glow = g.createRadialGradient(0, 0, s * 0.3, 0, 0, s * 1.5);
      glow.addColorStop(0, hexA(accent, 0.28));
      glow.addColorStop(1, hexA(accent, 0));
      g.fillStyle = glow;
      circ(g, 0, 0, s * 1.5); g.fill();

      g.fillStyle = rgrad(g, 0, -s * 0.2, s * 0.9, hexA(light, 0.94), hexA(body, 0.86));
      g.beginPath();
      g.moveTo(-s * 0.62, s * 0.10);
      g.bezierCurveTo(-s * 0.72, -s * 0.60, -s * 0.38, -s * 0.92, 0, -s * 0.92);
      g.bezierCurveTo( s * 0.38, -s * 0.92,  s * 0.72, -s * 0.60, s * 0.62, s * 0.10);
      const n = 5;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        g.lineTo(s * (0.62 - t * 1.24), s * (0.36 + Math.sin(time * 3 + t * Math.PI * 3) * 0.10));
      }
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.024; g.stroke();

      const bl = blinkAt(time, h);
      g.save();
      g.globalAlpha = 1 - bl * 0.8;
      g.fillStyle = '#1a1428';
      ell(g, -s * 0.24, -s * 0.26, s * 0.15, s * 0.20); g.fill();
      ell(g,  s * 0.24, -s * 0.26, s * 0.15, s * 0.20); g.fill();
      g.restore();
      if (bl < 0.5) {
        g.fillStyle = 'rgba(255,255,255,0.8)';
        circ(g, -s * 0.28, -s * 0.33, s * 0.045); g.fill();
        circ(g,  s * 0.20, -s * 0.33, s * 0.045); g.fill();
      }

      g.strokeStyle = 'rgba(30,24,44,0.7)'; g.lineWidth = s * 0.028; g.lineCap = 'round';
      g.beginPath();
      g.arc(0, s * 0.04, s * 0.10, Math.PI * 0.18, Math.PI * 0.82);
      g.stroke();

      g.fillStyle = hexA(accent, 0.7);
      for (let i = 0; i < 4; i++) {
        const a = time * 1.2 + i * Math.PI / 2;
        circ(g, Math.cos(a) * s * 0.80, Math.sin(a) * s * 0.66, s * 0.038); g.fill();
      }

      g.restore();
    }

    /* =========================================================
     *  30. 通用原型：骷髏
     * ========================================================= */
    function drawSkeleton(g, s, time, pal, h) {
      const { accent, dark, light } = pal;
      g.save();
      g.translate(0, Math.sin(time * 2.4 + (h % 5)) * s * 0.03);

      g.strokeStyle = hexA(light, 0.95); g.lineWidth = s * 0.075; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, s * 0.02); g.lineTo(0, s * 0.46); g.stroke();
      g.lineWidth = s * 0.05;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(0, s * (0.08 + i * 0.12), s * (0.22 - i * 0.02), Math.PI * 1.08, Math.PI * 1.92); g.stroke();
        g.beginPath();
        g.arc(0, s * (0.08 + i * 0.12), s * (0.22 - i * 0.02), Math.PI * 0.08, Math.PI * 0.92); g.stroke();
      }
      g.lineWidth = s * 0.05;
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(0, s * 0.12); g.lineTo(sx * s * 0.30, s * 0.34); g.stroke();
      }

      const hy = -s * 0.32, hr = s * 0.44;
      g.fillStyle = rgrad(g, 0, hy, hr, '#f8f8ff', '#c8c8d8');
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.022; g.stroke();

      g.fillStyle = '#dcdce8';
      g.beginPath();
      g.moveTo(-hr * 0.40, hy + hr * 0.52);
      g.quadraticCurveTo(0, hy + hr * 0.86, hr * 0.40, hy + hr * 0.52);
      g.quadraticCurveTo(0, hy + hr * 0.66, -hr * 0.40, hy + hr * 0.52);
      g.closePath(); g.fill();

      g.fillStyle = '#14121e';
      ell(g, -hr * 0.40, hy - hr * 0.04, hr * 0.24, hr * 0.26); g.fill();
      ell(g,  hr * 0.40, hy - hr * 0.04, hr * 0.24, hr * 0.26); g.fill();

      const glow = 0.5 + Math.sin(time * 5 + h) * 0.5;
      g.save();
      g.shadowBlur = s * 0.28; g.shadowColor = '#ff3030';
      g.fillStyle = `rgba(255,60,50,${0.6 + glow * 0.4})`;
      circ(g, -hr * 0.40, hy - hr * 0.04, hr * 0.09); g.fill();
      circ(g,  hr * 0.40, hy - hr * 0.04, hr * 0.09); g.fill();
      g.restore();

      g.fillStyle = '#2a2636';
      g.beginPath();
      g.moveTo(0, hy + hr * 0.20);
      g.lineTo(-hr * 0.10, hy + hr * 0.42);
      g.lineTo(hr * 0.10, hy + hr * 0.42);
      g.closePath(); g.fill();

      g.strokeStyle = '#a8a8bc'; g.lineWidth = s * 0.018;
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(i * hr * 0.14, hy + hr * 0.56);
        g.lineTo(i * hr * 0.14, hy + hr * 0.70);
        g.stroke();
      }

      if ((h >>> 4) % 2 === 0) {
        g.fillStyle = hexA(accent, 0.95);
        g.beginPath();
        g.moveTo(-hr * 0.60, hy - hr * 0.80);
        g.lineTo(-hr * 0.36, hy - hr * 1.16);
        g.lineTo(-hr * 0.12, hy - hr * 0.86);
        g.lineTo( hr * 0.12, hy - hr * 1.16);
        g.lineTo( hr * 0.36, hy - hr * 0.86);
        g.lineTo( hr * 0.60, hy - hr * 1.16);
        g.lineTo( hr * 0.60, hy - hr * 0.74);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();
      }

      g.restore();
    }

    /* =========================================================
     *  31. 形狀 → 物種 映射
     * ========================================================= */
    const SPECIES_FN = {
      chicken: drawChicken,
      dog: drawDog,
      bird: drawBird,
      fox: drawFox,
      bear: drawBear,
      hound: drawHound,
      dragon: drawDragon,
      shark: drawShark,
      cat: drawCat,
      fish: drawFish,
      dino: drawDino,
      butterfly: drawButterfly,
      phoenix: drawPhoenix,
      angel: drawAngel,
      octopus: drawOctopus,
      turtle: drawTurtle,
      bunny: drawBunny,
      bovine: drawBovine,
      snake: drawSnake,
      whale: drawWhale,
      golem: drawGolem,
      plant: drawPlant,
      beast: drawBeast,
      winged: drawWinged,
      aquatic: drawAquatic,
      reptile: drawReptile,
      blob: drawBlob,
      ghost: drawGhost,
      skeleton: drawSkeleton
    };

    const KEYWORDS = [
      [/(chicken|chick|hen|rooster|小雞|公雞|母雞)/, 'chicken'],
      [/(hound|wolf|lycan|地獄犬|獵犬)/, 'hound'],
      [/(fox|kitsune|狐)/, 'fox'],
      [/(bear|panda|熊貓|熊)/, 'bear'],
      [/(cat|kitten|feline|貓)/, 'cat'],
      [/(bunny|rabbit|兔)/, 'bunny'],
      [/(phoenix|鳳凰|不死鳥)/, 'phoenix'],
      [/(butterfly|蝴蝶)/, 'butterfly'],
      [/(angel|goddess|天使|女神)/, 'angel'],
      [/(octopus|squid|kraken|章魚|烏賊|海怪)/, 'octopus'],
      [/(turtle|tortoise|龜)/, 'turtle'],
      [/(whale|dolphin|鯨|海豚)/, 'whale'],
      [/(snake|serpent|viper|cobra|蛇|蟒)/, 'snake'],
      [/(golem|titan|stone|rock|傀儡|泰坦|石)/, 'golem'],
      [/(plant|flower|pumpkin|植物|花|南瓜)/, 'plant'],
      [/(shark|鯊)/, 'shark'],
      [/(bronto|長頸龍)/, 'dino'],
      [/(dino|rex|raptor|triceratops|ankylo|ptero|恐龍|暴龍|迅猛龍|三角龍|翼龍)/, 'dino'],
      [/(dragon|wyvern|draco|龍王|霜龍|火龍|金龍|黑龍|毒龍|風龍|冰龍|熔岩龍|雷龍|龍)/, 'dragon'],
      [/(fish|goldfish|koi|魚|金魚|錦鯉)/, 'fish'],
      [/(cow|bull|ox|deer|goat|sheep|unicorn|牛|鹿|羊|獨角獸)/, 'bovine'],
      [/(mermaid|人魚)/, 'aquatic'],
      [/(frog|slime|blob|chaos|eye|jelly|蛙|史萊姆|混沌|眼)/, 'blob'],
      [/(ghost|spirit|wraith|soul|phantom|幽靈|魂)/, 'ghost'],
      [/(skeleton|skull|bone|reaper|lich|骷髏|骨)/, 'skeleton'],
      [/(lizard|gecko|worm|centipede|mosasaur|蜥|蟲)/, 'reptile'],
      [/(beast|thunder|horse|pig|mouse|rat|hamster|squirrel|elephant|rhino|hippo|monkey|ape|tiger|lion|leopard|cheetah|獸|虎|獅|馬|豬|鼠)/, 'beast'],
      [/(winged|griffin|moth|sakura|cosmic|moon|star|獅鷲|櫻|月|星)/, 'winged']
    ];

    const FALLBACK_SPECIES = ['beast', 'winged', 'blob', 'reptile', 'aquatic', 'ghost', 'skeleton'];

    function resolveSpecies(shape, h) {
      const key = String(shape || '').toLowerCase();
      for (let i = 0; i < KEYWORDS.length; i++) {
        if (KEYWORDS[i][0].test(key)) return KEYWORDS[i][1];
      }
      return FALLBACK_SPECIES[(h >>> 5) % FALLBACK_SPECIES.length];
    }

    /* =========================================================
     *  32. 主入口：寵物造型
     * ========================================================= */
    function drawPetShape(g, shape, pal, s, time, rc) {
      if (!s || s <= 0) return;

      if (shape && shape.indexOf('guardian_') === 0) {
        const gIdx = parseInt(shape.split('_')[1], 10);
        const anim = GUARD_ANIMALS[gIdx] || GUARD_ANIMALS[0];
        anim.draw(g, s, time, false);
        return;
      }

      const P = normPal(pal);
      const h = hashStr(String(shape || 'x'));
      const species = resolveSpecies(shape, h);
      const fn = SPECIES_FN[species] || drawBeast;

      g.save();
      g.lineJoin = 'round';
      g.lineCap = 'round';
      fn(g, s, time, P, h, String(shape || ''));
      g.restore();
    }

    /* =========================================================
     *  33. 蛋
     * ========================================================= */
    function drawEggShape(g, e, s, time, rc) {
      const bob = Math.sin(time * 2 + (e.float || 0)) * 3;
      g.save(); g.translate(0, bob); const r = s;

      if (e.secret) {
        const pulse = Math.sin(time * 4) * 0.5 + 0.5;
        const hue = (time * 60) % 360;
        for (let i = 0; i < 4; i++) {
          const glow = g.createRadialGradient(0, 0, r * 0.5, 0, 0, r * (3 + i * 1.5));
          glow.addColorStop(0, `hsla(${hue + i * 50},100%,70%,${0.5 * pulse})`);
          glow.addColorStop(1, `hsla(${hue + i * 50},100%,70%,0)`);
          g.fillStyle = glow; circ(g, 0, 0, r * (3 + i * 1.5)); g.fill();
        }
      } else if (e.rar >= 3 || e.size !== 'normal') {
        const glow = g.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.6);
        glow.addColorStop(0, hexA(rc, 0.6)); glow.addColorStop(1, hexA(rc, 0));
        g.fillStyle = glow; circ(g, 0, 0, r * 2.6); g.fill();
      }

      g.shadowBlur = 12; g.shadowColor = '#00000066';
      const grad = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.15, 0, 0, r * 1.3);
      if (e.secret) {
        const hue = (time * 60) % 360;
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, `hsl(${hue},100%,85%)`);
        grad.addColorStop(1, `hsl(${hue},100%,55%)`);
      } else if (e.size === 'giant') {
        grad.addColorStop(0, '#e0f0ff'); grad.addColorStop(1, '#4a8ac8');
      } else if (e.size === 'huge') {
        grad.addColorStop(0, '#f0f8ff'); grad.addColorStop(1, '#6a9ac8');
      } else {
        grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#a0a0a0');
      }
      ell(g, 0, 0, r, r * 1.3); g.fillStyle = grad; g.fill();
      g.strokeStyle = hexA(rc, 0.5); g.lineWidth = 1.5; g.stroke();

      g.strokeStyle = hexA(rc, 0.7); g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-r * 0.3, -r * 0.5); g.lineTo(-r * 0.1, 0); g.lineTo(-r * 0.4, r * 0.4); g.stroke();
      if (e.secret) {
        g.beginPath(); g.moveTo(r * 0.2, -r * 0.4); g.lineTo(r * 0.4, 0); g.lineTo(r * 0.1, r * 0.5); g.stroke();
      }

      g.shadowBlur = 0;
      g.globalAlpha = 0.6; g.fillStyle = '#fff';
      ell(g, -r * 0.35, -r * 0.45, r * 0.25, r * 0.35, -0.4); g.fill();
      g.globalAlpha = 1;

      if (e.secret) {
        g.font = 'bold 16px "Segoe UI"'; g.fillStyle = '#fff';
        g.shadowBlur = 18; g.shadowColor = '#ff88ff'; g.textAlign = 'center';
        g.fillText('★', 0, -r * 1.8);
        g.font = 'bold 9px "Segoe UI"'; g.fillStyle = '#ffddff';
        g.fillText('SECRET', 0, -r * 1.2);
      } else if (e.rar >= 4) {
        g.font = 'bold 14px "Segoe UI"'; g.fillStyle = rc;
        g.shadowBlur = 14; g.shadowColor = rc; g.textAlign = 'center';
        g.fillText('★', 0, -r * 1.6);
      }
      g.restore();
    }

    /* =========================================================
     *  34. 火柴人
     * ========================================================= */
    function drawStickFigure(g, cx, cy, r, time, facing, walkPhase, swingPhase) {
      const scale = r / 15;
      const bodyColor = '#1a1a2a';
      const headR = 5 * scale;
      const neckY = cy - 8 * scale;
      const hipY = cy + 6 * scale;
      const armY = neckY + 4 * scale;
      const legSpread = 5 * scale, armSpread = 7 * scale;
      const bounce = Math.sin(time * 8) * 1.5 * scale;
      const legPhase = walkPhase || time * 6;
      const legSwing = Math.sin(legPhase) * 4 * scale;
      const armSwing = Math.sin(legPhase + Math.PI) * 3 * scale;
      g.save();
      g.translate(cx, cy + bounce);
      g.scale(facing, 1);
      g.strokeStyle = bodyColor;
      g.lineWidth = 2.5 * scale;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.fillStyle = '#ffe0c0'; circ(g, 0, -14 * scale, headR); g.fill(); g.stroke();
      g.fillStyle = '#1a1a2a';
      circ(g, -2 * scale, -15 * scale, 1 * scale); g.fill();
      circ(g,  2 * scale, -15 * scale, 1 * scale); g.fill();
      g.beginPath(); g.moveTo(0, -8 * scale); g.lineTo(0, hipY); g.stroke();
      if (swingPhase !== undefined && swingPhase > 0) {
        const swingAngle = Math.PI * 0.5 - Math.sin(swingPhase * Math.PI) * Math.PI * 0.7;
        const ax = Math.cos(swingAngle) * armSpread * 1.5;
        const ay = Math.sin(swingAngle) * armSpread * 1.5;
        g.beginPath(); g.moveTo(0, armY); g.lineTo(ax, armY + ay); g.stroke();
        g.beginPath(); g.moveTo(0, armY); g.lineTo(-armSpread * 0.6 + armSwing, armY + armSpread * 0.5); g.stroke();
      } else {
        g.beginPath(); g.moveTo(0, armY); g.lineTo(-armSpread + armSwing, armY + armSpread * 0.5); g.stroke();
        g.beginPath(); g.moveTo(0, armY); g.lineTo( armSpread + armSwing, armY + armSpread * 0.5); g.stroke();
      }
      g.beginPath(); g.moveTo(0, hipY); g.lineTo(-legSpread + legSwing, hipY + 8 * scale); g.stroke();
      g.beginPath(); g.moveTo(0, hipY); g.lineTo( legSpread - legSwing, hipY + 8 * scale); g.stroke();
      g.restore();
    }

    /* =========================================================
     *  35. 註冊
     * ========================================================= */
    window.__raingodDrawPetShape = drawPetShape;
    window.__raingodDrawEggShape = drawEggShape;
    window.__raingodDrawGuardAnimal = (g, biomeIdx, s, time, alert) => {
      const anim = GUARD_ANIMALS[biomeIdx] || GUARD_ANIMALS[0];
      anim.draw(g, s, time, alert);
    };
    window.__raingodDrawStickFigure = drawStickFigure;

    window.raingodCharactersReadyFlag = true;
  }

  setup();
})();
