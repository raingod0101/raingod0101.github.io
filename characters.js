/* ===================================================================
 * 🎨 characters.js  (v3 — 精致化重制)
 * 龙类按关键词拆分为独立变体：霜龙 / 熔岩龙 / 暗影龙 / 通用龙
 * 其他物种提升纹理层次与轮廓复杂度
 * =================================================================== */
(function () {
  'use strict';

  function setup() {
    const G = window.raingodGame;
    if (!G) { setTimeout(setup, 50); return; }

    const { hexA, shade } = G;
    const TAU = Math.PI * 2;

    /* =========================================================
     *  工具函数
     * ========================================================= */
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
      gr.addColorStop(0, c1); gr.addColorStop(1, c2); return gr;
    }
    function lgrad(g, x, y0, y1, c1, c2) {
      const gr = g.createLinearGradient(x, y0, x, y1);
      gr.addColorStop(0, c1); gr.addColorStop(1, c2); return gr;
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
    function drawGlow(g, x, y, r, color, alpha) {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, hexA(color, alpha));
      gr.addColorStop(1, hexA(color, 0));
      g.fillStyle = gr; circ(g, x, y, r); g.fill();
    }
    function drawParticles(g, s, time, color, count, baseR, speed, spread, upward) {
      g.save();
      for (let i = 0; i < count; i++) {
        const phase = i * 2.399;
        const a = time * speed + phase;
        let px, py;
        if (upward) {
          const t = (a * 0.4 + phase * 0.1) % 1;
          px = Math.cos(phase) * s * spread * (0.4 + t * 0.6);
          py = s * 0.4 - t * s * 1.4;
        } else {
          const rr = s * spread * (0.6 + Math.sin(a * 0.7) * 0.4);
          px = Math.cos(a) * rr;
          py = Math.sin(a) * rr * 0.8 - s * 0.2;
        }
        const alpha = Math.max(0, 0.35 + Math.sin(time * 2.2 + i * 1.3) * 0.35);
        g.globalAlpha = alpha;
        g.fillStyle = color;
        circ(g, px, py, baseR * (0.7 + Math.sin(time * 3 + i) * 0.3));
        g.fill();
      }
      g.restore();
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
        const px = (o.lx || 0) * r * 0.30;
        const py = r * 0.08;
        if (o.iris) { g.fillStyle = o.iris; circ(g, px, py, pr * 1.06); g.fill(); }
        g.fillStyle = o.pupil || '#141420';
        circ(g, px, py, pr); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.96)';
        circ(g, px - pr * 0.34, py - pr * 0.40, pr * 0.38); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.55)';
        circ(g, px + pr * 0.36, py + pr * 0.34, pr * 0.19); g.fill();
      } else {
        g.strokeStyle = o.pupil || '#242432';
        g.lineWidth = Math.max(r * 0.30, 0.6); g.lineCap = 'round';
        g.beginPath(); g.arc(0, 0, r * 0.74, Math.PI * 0.12, Math.PI * 0.88); g.stroke();
      }
      g.restore();
    }
    function blush(g, x, y, r, a) {
      g.save(); g.globalAlpha = (a === undefined ? 0.40 : a);
      g.fillStyle = '#ff7fa8'; ell(g, x, y, r, r * 0.60); g.fill(); g.restore();
    }
    function whiskers(g, x, y, r, dir, color) {
      g.save();
      g.strokeStyle = color || 'rgba(40,40,55,0.45)';
      g.lineWidth = Math.max(r * 0.10, 0.4); g.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(x, y);
        g.quadraticCurveTo(x + dir * r * 0.9, y + i * r * 0.55, x + dir * r * 1.7, y + i * r * 0.9);
        g.stroke();
      }
      g.restore();
    }

    /* =========================================================
     *  守衛動物（不變）
     * ========================================================= */
    const GUARD_ANIMALS = [
      {name:'雞',draw:function(g,s,time,alert){ g.fillStyle='#d8b040';g.beginPath();g.moveTo(-s*0.7,s*0.1);g.quadraticCurveTo(-s*0.8,-s*0.5,-s*0.3,-s*0.7);g.quadraticCurveTo(0,-s*0.9,s*0.3,-s*0.7);g.quadraticCurveTo(s*0.8,-s*0.5,s*0.7,s*0.1);g.quadraticCurveTo(s*0.6,s*0.7,0,s*0.75);g.quadraticCurveTo(-s*0.6,s*0.7,-s*0.7,s*0.1);g.closePath();g.fill();g.strokeStyle='#8a6a1a';g.lineWidth=2;g.stroke(); g.fillStyle='#e8d060';g.beginPath();g.arc(0,-s*0.55,s*0.48,0,7);g.fill(); g.fillStyle='#ff3030';for(let i=-1;i<=1;i++){g.beginPath();g.moveTo(i*s*0.1,-s*0.9);g.quadraticCurveTo(i*s*0.2,-s*1.2,i*s*0.3,-s*0.9);g.closePath();g.fill();} g.fillStyle='#ff9010';g.beginPath();g.moveTo(-s*0.15,-s*0.5);g.lineTo(s*0.15,-s*0.5);g.lineTo(0,-s*0.25);g.closePath();g.fill(); g.fillStyle='#fff';g.beginPath();g.arc(-s*0.2,-s*0.65,s*0.1,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.65,s*0.1,0,7);g.fill(); g.fillStyle='#000';g.beginPath();g.arc(-s*0.2,-s*0.65,s*0.05,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.65,s*0.05,0,7);g.fill(); }},
      {name:'地獄犬',draw:function(g,s,time,alert){ g.fillStyle='#a82a1a';g.beginPath();g.moveTo(-s*0.7,s*0.05);g.quadraticCurveTo(-s*0.75,s*0.6,-s*0.2,s*0.7);g.quadraticCurveTo(0,s*0.75,s*0.2,s*0.7);g.quadraticCurveTo(s*0.75,s*0.6,s*0.7,s*0.05);g.quadraticCurveTo(s*0.6,-s*0.3,0,-s*0.3);g.quadraticCurveTo(-s*0.6,-s*0.3,-s*0.7,s*0.05);g.closePath();g.fill();g.strokeStyle='#5a0a0a';g.lineWidth=2.5;g.stroke(); g.fillStyle='#c83a2a';g.beginPath();g.arc(0,-s*0.55,s*0.55,0,7);g.fill(); g.fillStyle='#ff2020';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.13,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.13,0,7);g.fill(); g.fillStyle='#ffee00';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.06,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.06,0,7);g.fill(); g.fillStyle='#fff';for(let i=0;i<3;i++){g.beginPath();g.moveTo(-s*0.12+i*s*0.08,-s*0.33);g.lineTo(-s*0.08+i*s*0.08,-s*0.2);g.lineTo(-s*0.04+i*s*0.08,-s*0.33);g.closePath();g.fill();} }},
      {name:'白鯨',draw:function(g,s,time,alert){ g.fillStyle='#c0d8f0';g.beginPath();g.moveTo(-s*0.8,s*0.0);g.quadraticCurveTo(-s*0.6,-s*0.4,0,-s*0.5);g.quadraticCurveTo(s*0.6,-s*0.4,s*0.8,s*0.0);g.quadraticCurveTo(s*0.6,s*0.4,0,s*0.5);g.quadraticCurveTo(-s*0.6,s*0.4,-s*0.8,s*0.0);g.closePath();g.fill();g.strokeStyle='#6a9aba';g.lineWidth=2.5;g.stroke(); g.fillStyle='#fff';g.beginPath();g.arc(-s*0.3,-s*0.15,s*0.12,0,7);g.fill();g.beginPath();g.arc(s*0.3,-s*0.15,s*0.12,0,7);g.fill(); g.fillStyle='#2a4a6a';g.beginPath();g.arc(-s*0.3,-s*0.15,s*0.06,0,7);g.fill();g.beginPath();g.arc(s*0.3,-s*0.15,s*0.06,0,7);g.fill(); }},
      {name:'暴龍',draw:function(g,s,time,alert){ g.fillStyle='#8a7a3a';g.beginPath();g.moveTo(-s*0.7,s*0.05);g.quadraticCurveTo(-s*0.75,s*0.6,-s*0.2,s*0.7);g.quadraticCurveTo(0,s*0.75,s*0.2,s*0.7);g.quadraticCurveTo(s*0.75,s*0.6,s*0.7,s*0.05);g.quadraticCurveTo(s*0.6,-s*0.3,0,-s*0.3);g.quadraticCurveTo(-s*0.6,-s*0.3,-s*0.7,s*0.05);g.closePath();g.fill();g.strokeStyle='#4a3a0a';g.lineWidth=2.5;g.stroke(); g.fillStyle='#a89a4a';g.beginPath();g.ellipse(s*0.4,-s*0.45,s*0.55,s*0.45,0.2,0,7);g.fill(); g.fillStyle='#fff';g.beginPath();g.arc(s*0.55,-s*0.55,s*0.13,0,7);g.fill(); g.fillStyle='#000';g.beginPath();g.arc(s*0.55,-s*0.55,s*0.06,0,7);g.fill(); }},
      {name:'雪怪',draw:function(g,s,time,alert){ g.fillStyle='#d8e8f8';g.beginPath();g.moveTo(-s*0.75,s*0.05);g.quadraticCurveTo(-s*0.8,s*0.6,-s*0.2,s*0.7);g.quadraticCurveTo(0,s*0.78,s*0.2,s*0.7);g.quadraticCurveTo(s*0.8,s*0.6,s*0.75,s*0.05);g.quadraticCurveTo(s*0.6,-s*0.3,0,-s*0.3);g.quadraticCurveTo(-s*0.6,-s*0.3,-s*0.75,s*0.05);g.closePath();g.fill();g.strokeStyle='#6a8ab0';g.lineWidth=2.5;g.stroke(); g.fillStyle='#e8f4ff';for(let i=0;i<8;i++){const a=i*Math.PI/4;g.beginPath();g.arc(Math.cos(a)*s*0.7,Math.sin(a)*s*0.6,s*0.15,0,7);g.fill();} g.fillStyle='#b0d0f0';g.beginPath();g.arc(0,-s*0.55,s*0.55,0,7);g.fill(); g.fillStyle='#1a4a8a';g.beginPath();g.arc(-s*0.22,-s*0.62,s*0.14,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.62,s*0.14,0,7);g.fill(); g.fillStyle='#fff';g.beginPath();g.arc(-s*0.22,-s*0.62,s*0.05,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.62,s*0.05,0,7);g.fill(); g.fillStyle='#1a4a8a';g.beginPath();g.moveTo(-s*0.25,-s*0.25);g.quadraticCurveTo(0,-s*0.05,s*0.25,-s*0.25);g.quadraticCurveTo(0,-s*0.15,-s*0.25,-s*0.25);g.closePath();g.fill(); }},
      {name:'骷髏王',draw:function(g,s,time,alert){ g.fillStyle='#e8e8f0';g.beginPath();g.moveTo(-s*0.7,s*0.05);g.quadraticCurveTo(-s*0.75,s*0.6,-s*0.2,s*0.7);g.quadraticCurveTo(0,s*0.75,s*0.2,s*0.7);g.quadraticCurveTo(s*0.75,s*0.6,s*0.7,s*0.05);g.quadraticCurveTo(s*0.6,-s*0.3,0,-s*0.3);g.quadraticCurveTo(-s*0.6,-s*0.3,-s*0.7,s*0.05);g.closePath();g.fill();g.strokeStyle='#8a8a9a';g.lineWidth=2.5;g.stroke(); g.fillStyle='#d0d0e0';g.beginPath();g.arc(0,-s*0.55,s*0.6,0,7);g.fill(); g.fillStyle='#1a1a2a';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.16,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.16,0,7);g.fill(); g.fillStyle='#ff3030';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.08,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.08,0,7);g.fill(); g.fillStyle='#ffe040';g.beginPath();g.moveTo(-s*0.4,-s*0.95);g.lineTo(-s*0.2,-s*1.0);g.lineTo(0,-s*1.2);g.lineTo(s*0.2,-s*1.0);g.lineTo(s*0.4,-s*0.95);g.closePath();g.fill(); }},
      {name:'櫻花精靈',draw:function(g,s,time,alert){ g.fillStyle='#f0a0d0';g.beginPath();g.moveTo(-s*0.65,s*0.05);g.quadraticCurveTo(-s*0.7,s*0.55,-s*0.2,s*0.65);g.quadraticCurveTo(0,s*0.7,s*0.2,s*0.65);g.quadraticCurveTo(s*0.7,s*0.55,s*0.65,s*0.05);g.quadraticCurveTo(s*0.55,-s*0.3,0,-s*0.3);g.quadraticCurveTo(-s*0.55,-s*0.3,-s*0.65,s*0.05);g.closePath();g.fill();g.strokeStyle='#c86aaa';g.lineWidth=2.5;g.stroke(); g.fillStyle='#ffd0e8';g.beginPath();g.arc(0,-s*0.55,s*0.55,0,7);g.fill(); g.fillStyle='#fff';g.beginPath();g.arc(-s*0.2,-s*0.6,s*0.13,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.6,s*0.13,0,7);g.fill(); g.fillStyle='#6a2a4a';g.beginPath();g.arc(-s*0.2,-s*0.6,s*0.065,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.6,s*0.065,0,7);g.fill(); g.fillStyle='#ff80c0';for(let i=0;i<5;i++){const a=time*2+i*Math.PI*2/5;g.beginPath();g.ellipse(Math.cos(a)*s*0.5,-s*0.55+Math.sin(a)*s*0.5,s*0.12,s*0.2,a,0,7);g.fill();} }},
      {name:'泰坦巨神',draw:function(g,s,time,alert){ g.fillStyle='#a0a0b8';g.beginPath();g.moveTo(-s*0.8,s*0.05);g.quadraticCurveTo(-s*0.85,s*0.65,-s*0.2,s*0.75);g.quadraticCurveTo(0,s*0.8,s*0.2,s*0.75);g.quadraticCurveTo(s*0.85,s*0.65,s*0.8,s*0.05);g.quadraticCurveTo(s*0.7,-s*0.35,0,-s*0.35);g.quadraticCurveTo(-s*0.7,-s*0.35,-s*0.8,s*0.05);g.closePath();g.fill();g.strokeStyle='#6a6a8a';g.lineWidth=3;g.stroke(); g.fillStyle='#c0c0d8';g.beginPath();g.arc(0,-s*0.55,s*0.6,0,7);g.fill(); g.fillStyle='#ffe040';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.14,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.14,0,7);g.fill(); g.fillStyle='#2a2a4a';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.07,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.07,0,7);g.fill(); }},
      {name:'天使',draw:function(g,s,time,alert){ g.strokeStyle='#ffe040';g.lineWidth=3;g.beginPath();g.ellipse(0,-s*1.15,s*0.4,s*0.1,0,0,7);g.stroke(); g.fillStyle='rgba(255,255,200,0.85)'; g.beginPath();g.moveTo(-s*0.2,-s*0.2);g.quadraticCurveTo(-s*1.3,-s*0.9,-s*1.1,s*0.1);g.quadraticCurveTo(-s*0.9,s*0.2,-s*0.2,s*0.2);g.closePath();g.fill(); g.beginPath();g.moveTo(s*0.2,-s*0.2);g.quadraticCurveTo(s*1.3,-s*0.9,s*1.1,s*0.1);g.quadraticCurveTo(s*0.9,s*0.2,s*0.2,s*0.2);g.closePath();g.fill(); g.fillStyle='#fff0c0';g.beginPath();g.ellipse(0,s*0.15,s*0.45,s*0.55,0,0,7);g.fill(); g.fillStyle='#ffe8a0';g.beginPath();g.arc(0,-s*0.55,s*0.5,0,7);g.fill(); g.fillStyle='#4a2a00';g.beginPath();g.arc(-s*0.18,-s*0.6,s*0.08,0,7);g.fill();g.beginPath();g.arc(s*0.18,-s*0.6,s*0.08,0,7);g.fill(); }},
      {name:'暗影領主',draw:function(g,s,time,alert){ g.fillStyle='#1a1a3a';g.beginPath();g.moveTo(-s*0.7,s*0.05);g.quadraticCurveTo(-s*0.75,s*0.6,-s*0.2,s*0.7);g.quadraticCurveTo(0,s*0.75,s*0.2,s*0.7);g.quadraticCurveTo(s*0.75,s*0.6,s*0.7,s*0.05);g.quadraticCurveTo(s*0.6,-s*0.3,0,-s*0.3);g.quadraticCurveTo(-s*0.6,-s*0.3,-s*0.7,s*0.05);g.closePath();g.fill();g.strokeStyle='#8040ff';g.lineWidth=2.5;g.stroke(); g.fillStyle='#3a3a5a';g.beginPath();g.arc(0,-s*0.55,s*0.6,0,7);g.fill(); g.fillStyle='#ff2020';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.15,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.15,0,7);g.fill(); g.fillStyle='#000';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.06,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.06,0,7);g.fill(); g.fillStyle='#8040ff';g.beginPath();g.moveTo(-s*0.4,-s*0.95);g.lineTo(-s*0.2,-s*1.0);g.lineTo(0,-s*1.2);g.lineTo(s*0.2,-s*1.0);g.lineTo(s*0.4,-s*0.95);g.closePath();g.fill(); }},
      {name:'混沌之主',draw:function(g,s,time,alert){ g.strokeStyle='#c040ff';g.lineWidth=2.5; for(let k=0;k<3;k++){g.beginPath();let first=true;for(let a=k*2;a<Math.PI*4+k*2;a+=0.3){const r=a*4;const px=Math.cos(a)*r,py=Math.sin(a)*r;if(first){g.moveTo(px,py);first=false;}else g.lineTo(px,py);}g.stroke();} g.fillStyle='#3a0a5a';g.beginPath();g.arc(0,0,s*0.5,0,7);g.fill(); g.fillStyle='#ff00aa';g.beginPath();g.arc(-s*0.2,-s*0.1,s*0.15,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.1,s*0.15,0,7);g.fill(); g.fillStyle='#fff';g.beginPath();g.arc(-s*0.2,-s*0.1,s*0.06,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.1,s*0.06,0,7);g.fill(); g.strokeStyle='#7a3a9a';g.lineWidth=3; for(let i=0;i<6;i++){const a=i*Math.PI/3;g.beginPath();g.moveTo(Math.cos(a)*s*0.4,Math.sin(a)*s*0.4);g.quadraticCurveTo(Math.cos(a)*s*0.8,Math.sin(a)*s*0.8,Math.cos(a)*s*1.0,Math.sin(a)*s*1.0);g.stroke();} }},
      {name:'虛空吞噬者',draw:function(g,s,time,alert){ g.fillStyle='#3a1a5a';g.beginPath();g.moveTo(-s*0.8,s*0.05);g.quadraticCurveTo(-s*0.85,s*0.65,-s*0.2,s*0.75);g.quadraticCurveTo(0,s*0.8,s*0.2,s*0.75);g.quadraticCurveTo(s*0.85,s*0.65,s*0.8,s*0.05);g.quadraticCurveTo(s*0.7,-s*0.35,0,-s*0.35);g.quadraticCurveTo(-s*0.7,-s*0.35,-s*0.8,s*0.05);g.closePath();g.fill();g.strokeStyle='#1a0a2a';g.lineWidth=3.5;g.stroke(); g.fillStyle='#5a3a7a';for(let i=0;i<8;i++){const a=time*0.5+i*Math.PI/4;g.beginPath();g.ellipse(Math.cos(a)*s*0.8,Math.sin(a)*s*0.7,s*0.25,s*0.4,a,0,7);g.fill();} g.fillStyle='#ff00aa';g.beginPath();g.arc(0,0,s*0.4,0,7);g.fill(); g.fillStyle='#fff';g.beginPath();g.arc(0,0,s*0.2,0,7);g.fill(); g.fillStyle='#1a0a2a';g.beginPath();g.arc(0,0,s*0.12,0,7);g.fill(); }},
    ];

    /* =========================================================
     *  🐉 龙族 —— 按变体独立绘制（重点）
     * ========================================================= */
    function drawDragonVariant(g, s, time, pal, h, shape) {
      const key = String(shape || '').toLowerCase();
      const isFrost = /frost|ice|snow|glacier|crystal|frosty|霜|冰|雪|寒/.test(key);
      const isLava  = /lava|magma|fire|flame|ember|volcano|inferno|熔岩|火|炎|岩浆|烈/.test(key);
      const isShadow = /shadow|dark|void|abyss|night|暗|影|虚/.test(key);
      const isGold  = /gold|sun|light|divine|holy|光|金|神|圣/.test(key);

      if (isFrost) return drawFrostDragon(g, s, time, pal, h);
      if (isLava)  return drawLavaDragon(g, s, time, pal, h);
      if (isShadow) return drawShadowDragon(g, s, time, pal, h);
      if (isGold)  return drawGoldDragon(g, s, time, pal, h);
      return drawGenericDragon(g, s, time, pal, h);
    }

    /* ---------- 通用龙骨架 ---------- */
    function dragonSkeleton(g, s, time, pal, opts) {
      // opts: {bodyColor, bellyColor, spikeColor, eyeColor, wingColor, wingAlpha, wingVein, glowColor}
      const bob = Math.sin(time * 2.1) * s * 0.03;
      const flap = Math.sin(time * 2.6) * 0.16;
      g.save(); g.translate(0, bob);

      // ---- 翅膀（身后） ----
      for (const sx of [-1, 1]) {
        g.save();
        g.translate(sx * s * 0.08, -s * 0.18);
        g.rotate(sx * (0.55 + flap));
        // 翼膜
        g.fillStyle = lgrad(g, 0, -s * 0.9, s * 0.3, hexA(opts.wingColor, opts.wingAlpha), hexA(shade(opts.wingColor, -35), opts.wingAlpha * 0.9));
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(sx * s * 0.42, -s * 0.70, sx * s * 1.18, -s * 0.78, sx * s * 1.32, -s * 0.20);
        g.bezierCurveTo(sx * s * 1.10, s * 0.04, sx * s * 0.82, s * 0.14, sx * s * 0.58, s * 0.08);
        g.bezierCurveTo(sx * s * 0.38, s * 0.28, sx * s * 0.14, s * 0.22, 0, 0);
        g.closePath(); g.fill();
        // 翼脉
        g.strokeStyle = hexA(opts.wingVein, 0.7);
        g.lineWidth = s * 0.022;
        g.lineCap = 'round';
        for (let i = 1; i <= 3; i++) {
          g.beginPath();
          g.moveTo(0, 0);
          g.quadraticCurveTo(sx * s * (0.30 + i * 0.20), -s * (0.40 + i * 0.10), sx * s * (0.50 + i * 0.20), -s * (0.55 + i * 0.04));
          g.stroke();
        }
        // 翼骨
        g.strokeStyle = hexA(shade(opts.wingColor, -60), 0.85);
        g.lineWidth = s * 0.035;
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(sx * s * 0.55, -s * 0.55, sx * s * 1.22, -s * 0.30);
        g.stroke();
        // 翼缘描边
        g.strokeStyle = hexA(shade(opts.wingColor, -55), 0.5);
        g.lineWidth = s * 0.02;
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(sx * s * 0.42, -s * 0.70, sx * s * 1.18, -s * 0.78, sx * s * 1.32, -s * 0.20);
        g.stroke();
        g.restore();
      }

      // ---- 尾巴（分节 + 尾锤） ----
      const tailSway = Math.sin(time * 2.0) * 0.22;
      g.save();
      g.translate(-s * 0.30, s * 0.18);
      g.rotate(-0.30 + tailSway);
      // 尾身
      g.fillStyle = rgrad(g, 0, s * 0.3, s * 0.22, opts.bodyColor, shade(opts.bodyColor, -28));
      g.beginPath();
      g.moveTo(0, -s * 0.10);
      g.bezierCurveTo(-s * 0.28, s * 0.10, -s * 0.22, s * 0.50, -s * 0.05, s * 0.66);
      g.bezierCurveTo( s * 0.08, s * 0.50,  s * 0.10, s * 0.18, 0, -s * 0.10);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(shade(opts.bodyColor, -55), 0.55);
      g.lineWidth = s * 0.022; g.stroke();
      // 尾节纹
      g.strokeStyle = hexA(shade(opts.bodyColor, -40), 0.55);
      g.lineWidth = s * 0.018;
      for (let i = 1; i <= 3; i++) {
        g.beginPath();
        g.arc(0, s * (0.10 + i * 0.14), s * (0.15 - i * 0.02), Math.PI * 0.15, Math.PI * 0.85);
        g.stroke();
      }
      // 尾刺
      g.fillStyle = opts.spikeColor;
      for (let i = 0; i < 3; i++) {
        const ty = s * (0.20 + i * 0.14);
        g.beginPath();
        g.moveTo(s * 0.10, ty);
        g.lineTo(s * 0.22, ty - s * 0.06);
        g.lineTo(s * 0.10, ty + s * 0.02);
        g.closePath(); g.fill();
      }
      g.restore();

      // ---- 腿（后腿 + 前腿） ----
      // 后腿
      g.fillStyle = shade(opts.bodyColor, -22);
      g.beginPath();
      g.moveTo(-s * 0.20, s * 0.32);
      g.quadraticCurveTo(-s * 0.34, s * 0.58, -s * 0.26, s * 0.72);
      g.quadraticCurveTo(-s * 0.16, s * 0.74, -s * 0.12, s * 0.60);
      g.quadraticCurveTo(-s * 0.10, s * 0.44, -s * 0.10, s * 0.32);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(shade(opts.bodyColor, -55), 0.5); g.lineWidth = s * 0.02; g.stroke();
      // 爪
      g.fillStyle = opts.spikeColor;
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(-s * 0.26 + i * s * 0.05, s * 0.72);
        g.lineTo(-s * 0.26 + i * s * 0.05 + s * 0.03, s * 0.78);
        g.lineTo(-s * 0.26 + i * s * 0.05 - s * 0.01, s * 0.74);
        g.closePath(); g.fill();
      }

      // 前腿
      g.fillStyle = shade(opts.bodyColor, -12);
      g.beginPath();
      g.moveTo(s * 0.20, s * 0.30);
      g.quadraticCurveTo(s * 0.30, s * 0.55, s * 0.26, s * 0.70);
      g.quadraticCurveTo(s * 0.18, s * 0.72, s * 0.14, s * 0.58);
      g.quadraticCurveTo(s * 0.12, s * 0.42, s * 0.10, s * 0.30);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(shade(opts.bodyColor, -55), 0.5); g.lineWidth = s * 0.02; g.stroke();

      // ---- 身体（椭圆但带曲线） ----
      g.fillStyle = rgrad(g, 0, s * 0.10, s * 0.62, opts.bodyColor, shade(opts.bodyColor, -35));
      g.beginPath();
      g.moveTo(-s * 0.42, s * 0.14);
      g.bezierCurveTo(-s * 0.42, -s * 0.18, -s * 0.16, -s * 0.26, s * 0.14, -s * 0.22);
      g.bezierCurveTo(s * 0.40, -s * 0.18, s * 0.48, s * 0.04, s * 0.42, s * 0.26);
      g.bezierCurveTo(s * 0.32, s * 0.50, -s * 0.12, s * 0.52, -s * 0.32, s * 0.40);
      g.bezierCurveTo(-s * 0.44, s * 0.32, -s * 0.44, s * 0.22, -s * 0.42, s * 0.14);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(shade(opts.bodyColor, -55), 0.6); g.lineWidth = s * 0.028; g.stroke();

      // 腹部
      g.fillStyle = rgrad(g, 0, s * 0.24, s * 0.40, opts.bellyColor, shade(opts.bellyColor, -18));
      ell(g, 0, s * 0.18, s * 0.32, s * 0.26); g.fill();
      // 腹甲纹
      g.strokeStyle = hexA(shade(opts.bellyColor, -40), 0.4);
      g.lineWidth = s * 0.016;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(0, s * (0.10 + i * 0.10), s * (0.30 - i * 0.04), Math.PI * 0.10, Math.PI * 0.90);
        g.stroke();
      }

      // ---- 脖子（S 形粗曲线） ----
      const neckSway = Math.sin(time * 1.8) * 0.05;
      g.save();
      g.translate(s * 0.26, s * 0.02);
      g.rotate(-0.15 + neckSway);
      g.strokeStyle = opts.bodyColor;
      g.lineWidth = s * 0.30;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(s * 0.10, -s * 0.20, s * 0.02, -s * 0.42);
      g.stroke();
      // 脖子背刺
      g.fillStyle = opts.spikeColor;
      for (let i = 0; i < 3; i++) {
        const t = 0.20 + i * 0.28;
        g.beginPath();
        g.moveTo(s * (0.06 - t * 0.06), -s * (t * 0.50));
        g.lineTo(s * (0.02 - t * 0.06), -s * (t * 0.50) - s * 0.12);
        g.lineTo(s * (0.12 - t * 0.06), -s * (t * 0.50) - s * 0.02);
        g.closePath(); g.fill();
      }
      g.restore();

      // ---- 头（楔形吻） ----
      const headX = s * 0.30;
      const headY = -s * 0.58;
      const headSway = Math.sin(time * 1.8) * s * 0.02;
      g.save();
      g.translate(headX, headY + headSway);

      // 头轮廓
      g.fillStyle = rgrad(g, 0, 0, s * 0.42, opts.bodyColor, shade(opts.bodyColor, -30));
      g.beginPath();
      g.moveTo(-s * 0.22, s * 0.10);
      g.bezierCurveTo(-s * 0.30, -s * 0.18, -s * 0.10, -s * 0.38, s * 0.06, -s * 0.36);
      g.bezierCurveTo(s * 0.22, -s * 0.34, s * 0.34, -s * 0.20, s * 0.44, -s * 0.02);
      g.bezierCurveTo(s * 0.52, s * 0.08, s * 0.46, s * 0.20, s * 0.30, s * 0.22);
      g.bezierCurveTo(s * 0.10, s * 0.26, -s * 0.10, s * 0.24, -s * 0.22, s * 0.10);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(shade(opts.bodyColor, -55), 0.65); g.lineWidth = s * 0.024; g.stroke();

      // 吻部（下颚）
      g.fillStyle = shade(opts.bodyColor, -8);
      g.beginPath();
      g.moveTo(-s * 0.04, s * 0.16);
      g.quadraticCurveTo(s * 0.26, s * 0.24, s * 0.46, s * 0.06);
      g.quadraticCurveTo(s * 0.30, s * 0.32, -s * 0.04, s * 0.26);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(shade(opts.bodyColor, -55), 0.4); g.lineWidth = s * 0.016; g.stroke();

      // 鼻孔
      g.fillStyle = shade(opts.bodyColor, -65);
      circ(g, s * 0.38, s * 0.02, s * 0.024); g.fill();

      // 牙齿（露出的獠牙）
      g.fillStyle = '#f8f4ea';
      for (let i = 0; i < 3; i++) {
        const bx = s * (0.30 - i * 0.10);
        g.beginPath();
        g.moveTo(bx - s * 0.022, s * 0.20);
        g.lineTo(bx, s * 0.30);
        g.lineTo(bx + s * 0.022, s * 0.20);
        g.closePath(); g.fill();
      }

      // 眼睛（竖瞳 + 发光）
      const bl = blinkAt(time, h);
      const ex = -s * 0.02, ey = -s * 0.10, er = s * 0.10;
      g.save();
      g.fillStyle = '#fff';
      ell(g, ex, ey, er, er * (1 - bl * 0.9)); g.fill();
      g.strokeStyle = 'rgba(20,20,30,0.30)'; g.lineWidth = s * 0.016; g.stroke();
      if (bl < 0.7) {
        g.fillStyle = opts.eyeColor;
        ell(g, ex, ey, er * 0.78, er * 0.78); g.fill();
        g.fillStyle = shade(opts.eyeColor, -70);
        ell(g, ex, ey, er * 0.28, er * 0.68); g.fill();
        g.fillStyle = '#fff';
        circ(g, ex - er * 0.34, ey - er * 0.34, er * 0.28); g.fill();
      }
      g.restore();

      // 头顶角（由各变体额外画）
      if (opts.drawHorns) opts.drawHorns(g, s, time);

      g.restore(); // 头

      // 身体背刺
      g.fillStyle = opts.spikeColor;
      for (let i = 0; i < 4; i++) {
        const bx = -s * 0.28 + i * s * 0.14;
        const by = -s * 0.22 - Math.sin(i * 0.6) * s * 0.04;
        g.beginPath();
        g.moveTo(bx - s * 0.05, by);
        g.lineTo(bx, by - s * 0.16 - (i === 1 || i === 2 ? s * 0.04 : 0));
        g.lineTo(bx + s * 0.05, by);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(shade(opts.spikeColor, -50), 0.45); g.lineWidth = s * 0.014; g.stroke();
      }

      // 装饰钩子
      if (opts.postDraw) opts.postDraw(g, s, time, opts);

      g.restore();
    }

    /* ---------- 🧊 霜龙 ---------- */
    function drawFrostDragon(g, s, time, pal, h) {
      // 冰雾光晕
      drawGlow(g, 0, -s * 0.1, s * 1.6, '#bfe9ff', 0.22);

      const P = {
        bodyColor: '#a8d4ec',
        bellyColor: '#eaf6ff',
        spikeColor: '#d8f0ff',
        eyeColor: '#4ad4ff',
        wingColor: '#9ad8f4',
        wingAlpha: 0.78,
        wingVein: '#4a9ac0',
        drawHorns: function(g, s, time) {
          // 水晶角（半透明，带高光）
          for (let side = -1; side <= 1; side += 2) {
            const bx = side * s * 0.04;
            const by = -s * 0.30;
            // 主水晶
            g.save();
            g.fillStyle = lgrad(g, bx, by - s * 0.5, by, 'rgba(220,245,255,0.92)', 'rgba(120,190,230,0.85)');
            g.beginPath();
            g.moveTo(bx - s * 0.06, by);
            g.lineTo(bx + side * s * 0.06, by - s * 0.55);
            g.lineTo(bx + s * 0.08, by);
            g.closePath(); g.fill();
            g.strokeStyle = 'rgba(255,255,255,0.9)';
            g.lineWidth = s * 0.018;
            g.beginPath();
            g.moveTo(bx + side * s * 0.06, by - s * 0.55);
            g.lineTo(bx + s * 0.07, by + s * 0.02);
            g.stroke();
            // 内部裂纹
            g.strokeStyle = 'rgba(255,255,255,0.5)';
            g.lineWidth = s * 0.012;
            g.beginPath();
            g.moveTo(bx, by - s * 0.10);
            g.lineTo(bx + side * s * 0.03, by - s * 0.32);
            g.stroke();
            // 小水晶
            g.fillStyle = 'rgba(200,235,255,0.85)';
            g.beginPath();
            g.moveTo(bx + side * s * 0.10, by + s * 0.02);
            g.lineTo(bx + side * s * 0.16, by - s * 0.20);
            g.lineTo(bx + side * s * 0.20, by + s * 0.02);
            g.closePath(); g.fill();
            g.restore();
          }
        },
        postDraw: function(g, s, time, opts) {
          // 雪花粒子
          drawParticles(g, s, time, '#dff2ff', 5, s * 0.028, 1.0, 0.9, false);
          // 口中冰雾
          g.save();
          g.globalAlpha = 0.35 + Math.sin(time * 2.2) * 0.15;
          g.fillStyle = '#ffffff';
          circ(g, s * 0.55, -s * 0.44, s * 0.10 + Math.sin(time * 2) * s * 0.02); g.fill();
          g.globalAlpha = 0.22;
          circ(g, s * 0.68, -s * 0.40, s * 0.06); g.fill();
          g.restore();
          // 身体冰晶反光
          g.save();
          g.globalAlpha = 0.55 + Math.sin(time * 1.4) * 0.15;
          g.fillStyle = 'rgba(255,255,255,0.85)';
          ell(g, -s * 0.18, -s * 0.10, s * 0.08, s * 0.04, -0.5); g.fill();
          g.restore();
        }
      };
      dragonSkeleton(g, s, time, pal, P);
    }

    /* ---------- 🔥 熔岩龙 ---------- */
    function drawLavaDragon(g, s, time, pal, h) {
      // 暖光光晕
      drawGlow(g, 0, -s * 0.1, s * 1.5, '#ff8a2a', 0.24);

      const P = {
        bodyColor: '#4a2018',
        bellyColor: '#8a3018',
        spikeColor: '#ff6a1a',
        eyeColor: '#ffb020',
        wingColor: '#7a2418',
        wingAlpha: 0.85,
        wingVein: '#ff5a1a',
        drawHorns: function(g, s, time) {
          // 黑色岩石角（3 根，长短不一）
          const horns = [
            { bx: -s * 0.06, by: -s * 0.30, tx: -s * 0.20, ty: -s * 0.72, w: s * 0.07 },
            { bx:  s * 0.04, by: -s * 0.30, tx:  s * 0.06, ty: -s * 0.86, w: s * 0.08 },
            { bx:  s * 0.14, by: -s * 0.28, tx:  s * 0.26, ty: -s * 0.62, w: s * 0.06 }
          ];
          for (const hd of horns) {
            g.fillStyle = lgrad(g, hd.bx, hd.ty, hd.by, '#3a2018', '#1a0a08');
            g.beginPath();
            g.moveTo(hd.bx - hd.w, hd.by);
            g.quadraticCurveTo(hd.bx - hd.w * 0.4, (hd.by + hd.ty) * 0.5, hd.tx, hd.ty);
            g.quadraticCurveTo(hd.bx + hd.w * 0.4, (hd.by + hd.ty) * 0.5, hd.bx + hd.w, hd.by);
            g.closePath(); g.fill();
            // 角上的熔岩裂纹
            g.strokeStyle = `rgba(255,${120 + Math.sin(time * 4) * 40 | 0},40,0.85)`;
            g.lineWidth = s * 0.018;
            g.beginPath();
            g.moveTo(hd.bx - hd.w * 0.3, hd.by - (hd.by - hd.ty) * 0.25);
            g.quadraticCurveTo(hd.tx * 0.7 + hd.bx * 0.3, (hd.by + hd.ty) * 0.5, hd.tx * 0.4 + hd.bx * 0.6, hd.ty * 0.4 + hd.by * 0.6);
            g.stroke();
          }
        },
        postDraw: function(g, s, time, opts) {
          // 身体熔岩裂纹
          const crack = (x0, y0, x1, y1, seed) => {
            g.beginPath();
            g.moveTo(x0, y0);
            const segs = 4;
            for (let i = 1; i <= segs; i++) {
              const t = i / segs;
              const px = x0 + (x1 - x0) * t + Math.sin(seed + i * 1.7) * s * 0.03;
              const py = y0 + (y1 - y0) * t + Math.cos(seed + i * 1.3) * s * 0.03;
              g.lineTo(px, py);
            }
            g.stroke();
          };
          g.save();
          const pulse = 0.5 + Math.sin(time * 3) * 0.5;
          g.strokeStyle = `rgba(255,${100 + pulse * 100 | 0},30,${0.55 + pulse * 0.35})`;
          g.lineWidth = s * 0.022;
          g.lineCap = 'round';
          g.shadowBlur = s * 0.18;
          g.shadowColor = '#ff5010';
          crack(-s * 0.10, s * 0.02, s * 0.18, s * 0.10, 1.3);
          crack(-s * 0.06, -s * 0.02, -s * 0.20, s * 0.08, 2.1);
          crack(s * 0.04, -s * 0.10, s * 0.18, s * 0.04, 3.7);
          crack(-s * 0.20, s * 0.02, -s * 0.30, s * 0.16, 4.2);
          g.restore();
          // 背部火焰
          g.save();
          for (let i = 0; i < 4; i++) {
            const bx = -s * 0.26 + i * s * 0.14;
            const fh = s * (0.18 + Math.sin(time * 4 + i) * 0.05);
            const grd = g.createLinearGradient(bx, -s * 0.28, bx, -s * 0.28 - fh);
            grd.addColorStop(0, 'rgba(255,120,40,0.9)');
            grd.addColorStop(0.6, 'rgba(255,180,60,0.8)');
            grd.addColorStop(1, 'rgba(255,240,150,0)');
            g.fillStyle = grd;
            g.beginPath();
            g.moveTo(bx - s * 0.05, -s * 0.28);
            g.quadraticCurveTo(bx - s * 0.02, -s * 0.28 - fh * 0.6, bx, -s * 0.28 - fh);
            g.quadraticCurveTo(bx + s * 0.02, -s * 0.28 - fh * 0.6, bx + s * 0.05, -s * 0.28);
            g.closePath(); g.fill();
          }
          g.restore();
          // 上升余烬
          drawParticles(g, s, time, '#ff9a4a', 6, s * 0.022, 0.8, 0.9, true);
          // 地面余烬光
          drawGlow(g, 0, s * 0.7, s * 0.8, '#ff6a20', 0.22 + Math.sin(time * 2) * 0.08);
        }
      };
      dragonSkeleton(g, s, time, pal, P);
    }

    /* ---------- 🌑 暗影龙 ---------- */
    function drawShadowDragon(g, s, time, pal, h) {
      drawGlow(g, 0, -s * 0.1, s * 1.5, '#7a3aff', 0.22);
      const P = {
        bodyColor: '#2a1a4a',
        bellyColor: '#4a2a6a',
        spikeColor: '#a05aff',
        eyeColor: '#ff3080',
        wingColor: '#3a1a5a',
        wingAlpha: 0.85,
        wingVein: '#a05aff',
        drawHorns: function(g, s, time) {
          for (let side = -1; side <= 1; side += 2) {
            g.fillStyle = lgrad(g, side * s * 0.06, -s * 0.7, -s * 0.28, '#a05aff', '#3a1a5a');
            g.beginPath();
            g.moveTo(side * s * 0.02, -s * 0.30);
            g.quadraticCurveTo(side * s * 0.12, -s * 0.62, side * s * 0.18, -s * 0.74);
            g.quadraticCurveTo(side * s * 0.06, -s * 0.52, side * s * 0.10, -s * 0.28);
            g.closePath(); g.fill();
          }
        },
        postDraw: function(g, s, time, opts) {
          drawParticles(g, s, time, '#c080ff', 5, s * 0.024, 0.9, 0.9, false);
          g.save();
          g.shadowBlur = s * 0.20;
          g.shadowColor = '#a05aff';
          g.strokeStyle = 'rgba(180,120,255,0.55)';
          g.lineWidth = s * 0.02;
          g.beginPath();
          g.moveTo(-s * 0.20, s * 0.04);
          g.quadraticCurveTo(0, s * 0.10, s * 0.20, s * 0.02);
          g.stroke();
          g.restore();
        }
      };
      dragonSkeleton(g, s, time, pal, P);
    }

    /* ---------- ✨ 金龙 / 圣龙 ---------- */
    function drawGoldDragon(g, s, time, pal, h) {
      drawGlow(g, 0, -s * 0.1, s * 1.6, '#ffe680', 0.25);
      const P = {
        bodyColor: '#f0c860',
        bellyColor: '#fff4c8',
        spikeColor: '#fff0a0',
        eyeColor: '#30a0ff',
        wingColor: '#ffdc80',
        wingAlpha: 0.82,
        wingVein: '#c08820',
        drawHorns: function(g, s, time) {
          for (let side = -1; side <= 1; side += 2) {
            g.fillStyle = lgrad(g, side * s * 0.06, -s * 0.8, -s * 0.28, '#fff4c8', '#c08820');
            g.beginPath();
            g.moveTo(side * s * 0.02, -s * 0.30);
            g.quadraticCurveTo(side * s * 0.10, -s * 0.72, side * s * 0.22, -s * 0.80);
            g.quadraticCurveTo(side * s * 0.10, -s * 0.56, side * s * 0.10, -s * 0.28);
            g.closePath(); g.fill();
          }
          // 光環
          g.save();
          g.strokeStyle = 'rgba(255,240,160,0.9)';
          g.lineWidth = s * 0.03;
          g.shadowBlur = s * 0.2; g.shadowColor = '#ffe680';
          ell(g, 0, -s * 0.95, s * 0.22, s * 0.06); g.stroke();
          g.restore();
        },
        postDraw: function(g, s, time, opts) {
          drawParticles(g, s, time, '#fff0a0', 5, s * 0.026, 0.9, 0.9, false);
        }
      };
      dragonSkeleton(g, s, time, pal, P);
    }

    /* ---------- 🐲 通用龙（保留但用新骨架） ---------- */
    function drawGenericDragon(g, s, time, pal, h) {
      const body = pal.body || '#7aa86a';
      const P = {
        bodyColor: body,
        bellyColor: pal.belly || shade(body, 40),
        spikeColor: pal.accent || '#e8c860',
        eyeColor: '#ffcc30',
        wingColor: pal.accent || '#a8c878',
        wingAlpha: 0.78,
        wingVein: shade(body, -45),
        drawHorns: function(g, s, time) {
          for (let side = -1; side <= 1; side += 2) {
            g.fillStyle = pal.accent || '#e8c860';
            g.beginPath();
            g.moveTo(side * s * 0.02, -s * 0.30);
            g.quadraticCurveTo(side * s * 0.10, -s * 0.60, side * s * 0.18, -s * 0.70);
            g.quadraticCurveTo(side * s * 0.08, -s * 0.50, side * s * 0.10, -s * 0.28);
            g.closePath(); g.fill();
            g.strokeStyle = hexA(pal.dark || '#3a5a2a', 0.5); g.lineWidth = s * 0.014; g.stroke();
          }
        },
        postDraw: function(g, s, time, opts) {
          drawParticles(g, s, time, hexA(opts.spikeColor, 0.8), 4, s * 0.022, 0.8, 0.9, false);
        }
      };
      dragonSkeleton(g, s, time, pal, P);
    }

    /* =========================================================
     *  其他物种绘制函数（提升细节）
     * ========================================================= */

    /* ---------- 小雞 ---------- */
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
      g.strokeStyle = '#e8a020'; g.lineCap = 'round';
      g.lineWidth = s * 0.055;
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
      // 绒毛
      g.strokeStyle = hexA(shade(belly, -30), 0.35);
      g.lineWidth = s * 0.012;
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.arc(-s * 0.20 + i * s * 0.10, s * 0.30, s * 0.05, 0, Math.PI);
        g.stroke();
      }

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

      // 雞冠
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

    /* ---------- 小狗 ---------- */
    function drawDog(g, s, time, pal) {
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

      // 肚子
      g.fillStyle = hexA(belly, 0.92);
      ell(g, 0, s * 0.32, s * 0.27, s * 0.26); g.fill();

      // 項圈
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

      // 鼻子
      g.fillStyle = '#2a2a3a';
      ell(g, 0, hy + hr * 0.22, hr * 0.17, hr * 0.13); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      circ(g, -hr * 0.06, hy + hr * 0.18, hr * 0.04); g.fill();

      // 嘴
      g.strokeStyle = '#3a3a4a'; g.lineWidth = s * 0.022; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, hy + hr * 0.34);
      g.lineTo(0, hy + hr * 0.46);
      g.moveTo(0, hy + hr * 0.46);
      g.quadraticCurveTo(-hr * 0.14, hy + hr * 0.58, -hr * 0.22, hy + hr * 0.44);
      g.moveTo(0, hy + hr * 0.46);
      g.quadraticCurveTo( hr * 0.14, hy + hr * 0.58,  hr * 0.22, hy + hr * 0.44);
      g.stroke();

      // 舌頭
      g.fillStyle = '#ff7f9c';
      ell(g, 0, hy + hr * 0.60, hr * 0.10, hr * 0.11); g.fill();

      // 眼睛
      const bl = blinkAt(time, 5);
      drawEye(g, -hr * 0.42, hy - hr * 0.10, hr * 0.25, { blink: bl });
      drawEye(g,  hr * 0.42, hy - hr * 0.10, hr * 0.25, { blink: bl });

      blush(g, -hr * 0.66, hy + hr * 0.16, hr * 0.15, 0.35);
      blush(g,  hr * 0.66, hy + hr * 0.16, hr * 0.15, 0.35);

      g.restore();
    }

    /* ---------- 小鳥 ---------- */
    function drawBird(g, s, time, pal) {
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 3.4) * s * 0.035;
      g.save(); g.translate(0, bob);

      // 尾羽
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

      // 腿
      g.strokeStyle = '#e8a020'; g.lineWidth = s * 0.05; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-s * 0.13, s * 0.40); g.lineTo(-s * 0.14, s * 0.62); g.stroke();
      g.beginPath(); g.moveTo( s * 0.13, s * 0.40); g.lineTo( s * 0.14, s * 0.62); g.stroke();

      // 身体
      g.fillStyle = rgrad(g, 0, s * 0.10, s * 0.60, light, body);
      ell(g, 0, s * 0.14, s * 0.44, s * 0.46); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();

      // 肚
      g.fillStyle = rgrad(g, 0, s * 0.30, s * 0.30, belly, shade(belly, -14));
      ell(g, 0, s * 0.26, s * 0.28, s * 0.26); g.fill();
      // 羽毛纹理
      g.strokeStyle = hexA(shade(belly, -30), 0.35);
      g.lineWidth = s * 0.014;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.arc(-s * 0.16 + i * s * 0.10, s * 0.30, s * 0.05, 0, Math.PI);
        g.stroke();
      }

      // 头
      const hy = -s * 0.36, hr = s * 0.38;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();

      // 冠羽
      g.fillStyle = hexA(accent, 0.95);
      g.beginPath();
      g.moveTo(-hr * 0.30, hy - hr * 0.88);
      g.quadraticCurveTo(-hr * 0.10, hy - hr * 1.55, hr * 0.06, hy - hr * 0.92);
      g.quadraticCurveTo( hr * 0.20, hy - hr * 1.40, hr * 0.34, hy - hr * 0.86);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.018; g.stroke();

      // 翅膀
      for (const sx of [-1, 1]) {
        g.save();
        g.translate(sx * s * 0.40, s * 0.10);
        g.rotate(sx * (0.30 + Math.sin(time * 6) * 0.10));
        g.fillStyle = rgrad(g, 0, 0, s * 0.26, light, shade(body, -14));
        ell(g, 0, 0, s * 0.15, s * 0.24); g.fill();
        g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.018; g.stroke();
        // 羽毛分层
        g.strokeStyle = hexA(dark, 0.3); g.lineWidth = s * 0.012;
        for (let i = -1; i <= 1; i++) {
          g.beginPath();
          g.arc(0, i * s * 0.06, s * 0.10, Math.PI * 1.1, Math.PI * 1.9);
          g.stroke();
        }
        g.restore();
      }

      // 喙
      g.fillStyle = '#f4a828';
      g.beginPath();
      g.moveTo(-s * 0.10, hy + hr * 0.22);
      g.lineTo( s * 0.10, hy + hr * 0.22);
      g.lineTo( 0, hy + hr * 0.60);
      g.closePath(); g.fill();
      g.strokeStyle = '#c07a10'; g.lineWidth = s * 0.014; g.stroke();

      // 眼睛
      const bl = blinkAt(time, 7);
      drawEye(g, -hr * 0.40, hy - hr * 0.14, hr * 0.26, { blink: bl });
      drawEye(g,  hr * 0.40, hy - hr * 0.14, hr * 0.26, { blink: bl });

      blush(g, -hr * 0.62, hy + hr * 0.24, hr * 0.16, 0.32);
      blush(g,  hr * 0.62, hy + hr * 0.24, hr * 0.16, 0.32);

      g.restore();
    }

    /* ---------- 狐狸 ---------- */
    function drawFox(g, s, time, pal) {
      const { body, belly, dark, light } = pal;
      const bob = Math.sin(time * 3.2) * s * 0.03;
      g.save(); g.translate(0, bob);

      // 大尾巴（蓬松）
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
      // 绒毛分线
      g.strokeStyle = hexA(shade(body, 20), 0.35);
      g.lineWidth = s * 0.014;
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(i * s * 0.10, s * 0.10);
        g.quadraticCurveTo(i * s * 0.18, s * 0.42, i * s * 0.10, s * 0.60);
        g.stroke();
      }
      // 白尖
      g.fillStyle = hexA(belly, 0.95);
      ell(g, 0, s * 0.56, s * 0.17, s * 0.15); g.fill();
      g.restore();

      // 腿
      g.fillStyle = shade(body, -18);
      ell(g, -s * 0.22, s * 0.55, s * 0.14, s * 0.15); g.fill();
      ell(g,  s * 0.22, s * 0.55, s * 0.14, s * 0.15); g.fill();

      // 身体
      g.fillStyle = rgrad(g, 0, s * 0.18, s * 0.60, light, body);
      ell(g, 0, s * 0.20, s * 0.45, s * 0.44); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      // 胸前白毛
      g.fillStyle = hexA(belly, 0.95);
      ell(g, 0, s * 0.30, s * 0.24, s * 0.24); g.fill();
      g.strokeStyle = hexA(shade(belly, -25), 0.35);
      g.lineWidth = s * 0.012;
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.arc(i * s * 0.10, s * 0.30, s * 0.06, 0, Math.PI);
        g.stroke();
      }

      // 头
      const hy = -s * 0.32, hr = s * 0.42;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      // 三角耳
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

      // 口鼻
      g.fillStyle = hexA(belly, 0.97);
      g.beginPath();
      g.moveTo(0, hy + hr * 0.10);
      g.quadraticCurveTo(-hr * 0.42, hy + hr * 0.12, -hr * 0.34, hy + hr * 0.56);
      g.quadraticCurveTo(0, hy + hr * 0.86, hr * 0.34, hy + hr * 0.56);
      g.quadraticCurveTo( hr * 0.42, hy + hr * 0.12, 0, hy + hr * 0.10);
      g.closePath(); g.fill();

      // 鼻子
      g.fillStyle = '#2a2230';
      ell(g, 0, hy + hr * 0.40, hr * 0.14, hr * 0.11); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      circ(g, -hr * 0.04, hy + hr * 0.37, hr * 0.035); g.fill();

      // 眼睛
      const bl = blinkAt(time, 11);
      drawEye(g, -hr * 0.44, hy - hr * 0.06, hr * 0.26, { blink: bl, iris: '#ffb347', pr: 0.42 });
      drawEye(g,  hr * 0.44, hy - hr * 0.06, hr * 0.26, { blink: bl, iris: '#ffb347', pr: 0.42 });

      whiskers(g, -hr * 0.30, hy + hr * 0.40, hr * 0.16, -1);
      whiskers(g,  hr * 0.30, hy + hr * 0.40, hr * 0.16,  1);

      blush(g, -hr * 0.68, hy + hr * 0.24, hr * 0.15, 0.32);
      blush(g,  hr * 0.68, hy + hr * 0.24, hr * 0.15, 0.32);

      g.restore();
    }

    /* ---------- 熊 ---------- */
    function drawBear(g, s, time, pal) {
      const { body, belly, dark, light } = pal;
      const bob = Math.sin(time * 2.6) * s * 0.025;
      g.save(); g.translate(0, bob);

      // 尾巴
      g.fillStyle = rgrad(g, 0, s * 0.3, s * 0.18, light, body);
      circ(g, -s * 0.36, s * 0.30, s * 0.11); g.fill();
      g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.018; g.stroke();

      // 腿
      for (const sx of [-1, 1]) {
        g.fillStyle = shade(body, -16);
        ell(g, sx * s * 0.25, s * 0.56, s * 0.17, s * 0.15); g.fill();
        g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();
        g.fillStyle = hexA(dark, 0.7);
        for (let i = -1; i <= 1; i++) {
          circ(g, sx * s * 0.25 + i * s * 0.07, s * 0.61, s * 0.024); g.fill();
        }
      }

      // 身体
      g.fillStyle = rgrad(g, 0, s * 0.18, s * 0.62, light, body);
      ell(g, 0, s * 0.20, s * 0.52, s * 0.46); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();
      // 毛绒纹理
      g.strokeStyle = hexA(shade(body, -22), 0.35);
      g.lineWidth = s * 0.014;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + 0.2;
        g.beginPath();
        g.arc(Math.cos(a) * s * 0.32, s * 0.20 + Math.sin(a) * s * 0.28, s * 0.06, 0, Math.PI);
        g.stroke();
      }

      // 肚子
      g.fillStyle = hexA(belly, 0.9);
      ell(g, 0, s * 0.28, s * 0.32, s * 0.30); g.fill();

      // 头
      const hy = -s * 0.30, hr = s * 0.48;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();

      // 圆耳
      for (const sx of [-1, 1]) {
        g.fillStyle = rgrad(g, sx * hr * 0.74, hy - hr * 0.68, hr * 0.40, light, body);
        circ(g, sx * hr * 0.74, hy - hr * 0.68, hr * 0.38); g.fill();
        g.strokeStyle = hexA(dark, 0.45); g.lineWidth = s * 0.024; g.stroke();
        g.fillStyle = hexA(belly, 0.85);
        circ(g, sx * hr * 0.74, hy - hr * 0.68, hr * 0.18); g.fill();
      }

      // 口鼻
      g.fillStyle = hexA(belly, 0.97);
      ell(g, 0, hy + hr * 0.40, hr * 0.52, hr * 0.38); g.fill();
      g.strokeStyle = hexA(dark, 0.18); g.lineWidth = s * 0.016; g.stroke();

      // 鼻子
      g.fillStyle = '#2a2430';
      ell(g, 0, hy + hr * 0.20, hr * 0.19, hr * 0.14); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      circ(g, -hr * 0.06, hy + hr * 0.16, hr * 0.045); g.fill();

      // 嘴
      g.strokeStyle = '#3a3444'; g.lineWidth = s * 0.022; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, hy + hr * 0.34);
      g.lineTo(0, hy + hr * 0.44);
      g.moveTo(0, hy + hr * 0.44);
      g.quadraticCurveTo(-hr * 0.14, hy + hr * 0.56, -hr * 0.22, hy + hr * 0.42);
      g.moveTo(0, hy + hr * 0.44);
      g.quadraticCurveTo( hr * 0.14, hy + hr * 0.56,  hr * 0.22, hy + hr * 0.42);
      g.stroke();

      // 眼睛
      const bl = blinkAt(time, 13);
      drawEye(g, -hr * 0.44, hy - hr * 0.12, hr * 0.24, { blink: bl });
      drawEye(g,  hr * 0.44, hy - hr * 0.12, hr * 0.24, { blink: bl });

      blush(g, -hr * 0.72, hy + hr * 0.18, hr * 0.15, 0.34);
      blush(g,  hr * 0.72, hy + hr * 0.18, hr * 0.15, 0.34);

      g.restore();
    }

    /* ---------- 猎犬 ---------- */
    function drawHound(g, s, time, pal) {
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 2.2) * s * 0.02;
      g.save(); g.translate(0, bob);

      // 尾巴
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

      // 腿
      g.fillStyle = shade(body, -20);
      ell(g, -s * 0.26, s * 0.54, s * 0.14, s * 0.16); g.fill();
      ell(g,  s * 0.26, s * 0.54, s * 0.14, s * 0.16); g.fill();

      // 身体
      g.fillStyle = rgrad(g, 0, s * 0.18, s * 0.60, light, body);
      ell(g, 0, s * 0.20, s * 0.50, s * 0.44); g.fill();
      g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.032; g.stroke();

      // 肋骨纹
      g.strokeStyle = hexA(shade(body, -40), 0.55); g.lineWidth = s * 0.022;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(0, s * 0.30, s * (0.16 + i * 0.08), Math.PI * 1.12, Math.PI * 1.88);
        g.stroke();
      }

      // 颈刺项圈
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

      // 头
      const hy = -s * 0.34, hr = s * 0.46;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.032; g.stroke();

      // 尖耳
      for (const sx of [-1, 1]) {
        g.fillStyle = shade(body, -26);
        g.beginPath();
        g.moveTo(sx * hr * 0.42, hy - hr * 0.62);
        g.lineTo(sx * hr * 0.90, hy - hr * 1.36);
        g.lineTo(sx * hr * 0.92, hy - hr * 0.40);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.6); g.lineWidth = s * 0.024; g.stroke();
      }

      // 口鼻
      g.fillStyle = hexA(belly, 0.25);
      ell(g, 0, hy + hr * 0.48, hr * 0.46, hr * 0.34); g.fill();

      // 咧嘴
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

      // 鼻子
      g.fillStyle = '#141018';
      ell(g, 0, hy + hr * 0.30, hr * 0.15, hr * 0.11); g.fill();

      // 发光眼
      const bl = blinkAt(time, 17);
      const glow = 0.65 + Math.sin(time * 4) * 0.35;
      g.save();
      g.shadowBlur = s * 0.30;
      g.shadowColor = '#ff3020';
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

    /* ---------- 鲨鱼 ---------- */
    function drawShark(g, s, time, pal) {
      const { body, belly, dark, light } = pal;
      const sway = Math.sin(time * 2.2);
      g.save();
      g.translate(0, sway * s * 0.05);

      // 尾鳍
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
      // 尾鳍纹
      g.strokeStyle = hexA(dark, 0.25); g.lineWidth = s * 0.014;
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(-s * 0.42, i * s * 0.14);
        g.stroke();
      }
      g.restore();

      // 背鳍
      g.fillStyle = shade(body, -6);
      g.beginPath();
      g.moveTo(-s * 0.06, -s * 0.32);
      g.quadraticCurveTo(s * 0.06, -s * 0.80, s * 0.30, -s * 0.28);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.022; g.stroke();

      // 身体
      g.fillStyle = rgrad(g, 0, 0, s * 0.72, light, body);
      ell(g, 0, s * 0.02, s * 0.66, s * 0.42); g.fill();
      g.strokeStyle = hexA(dark, 0.55); g.lineWidth = s * 0.028; g.stroke();

      // 白肚
      g.fillStyle = hexA(belly, 0.92);
      g.beginPath();
      g.ellipse(0, s * 0.14, s * 0.52, s * 0.24, 0, 0, Math.PI);
      g.fill();
      // 肚纹
      g.strokeStyle = hexA(shade(belly, -25), 0.3);
      g.lineWidth = s * 0.014;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.arc(i * s * 0.14, s * 0.12, s * 0.10, 0.2, Math.PI - 0.2);
        g.stroke();
      }

      // 胸鳍
      for (const sx of [-1, 1]) {
        g.fillStyle = shade(body, -8);
        g.beginPath();
        g.moveTo(sx * s * 0.16, s * 0.20);
        g.lineTo(sx * s * 0.40, s * 0.46);
        g.lineTo(sx * s * 0.12, s * 0.30);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.018; g.stroke();
      }

      // 鳃
      g.strokeStyle = hexA(dark, 0.45); g.lineWidth = s * 0.02; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(-s * (0.30 + i * 0.06), -s * 0.12);
        g.quadraticCurveTo(-s * (0.33 + i * 0.06), 0, -s * (0.30 + i * 0.06), s * 0.12);
        g.stroke();
      }

      // 嘴 + 牙
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

      // 眼睛
      const bl = blinkAt(time, 23);
      drawEye(g, s * 0.34, -s * 0.12, s * 0.10, { blink: bl, pupil: '#101018' });

      g.restore();
    }

    /* =========================================================
     *  通用物种（提升细节层级，增加轮廓变体）
     * ========================================================= */

    /* ---------- 走兽（含 3 种体型变体） ---------- */
    function drawBeast(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const bob = Math.sin(time * 2.4 + (h % 7)) * s * 0.035;
      g.save(); g.translate(0, bob);

      const earType = ['round', 'pointed', 'long', 'droop', 'horns', 'antlers', 'none'][h % 7];
      const patType = ['none', 'spots', 'stripes', 'patch'][(h >>> 3) % 4];
      const bodyType = (h >>> 6) % 3; // 0 圆胖 1 瘦长 2 标准

      // 身体轮廓参数
      let bodyRX = s * 0.50, bodyRY = s * 0.46, bodyY = s * 0.20;
      if (bodyType === 0) { bodyRX = s * 0.54; bodyRY = s * 0.42; bodyY = s * 0.22; }
      if (bodyType === 1) { bodyRX = s * 0.42; bodyRY = s * 0.50; bodyY = s * 0.16; }

      // 尾巴
      const tw = Math.sin(time * 2.8 + (h % 5)) * 0.35;
      g.save();
      g.translate(-s * 0.40, s * 0.24);
      g.rotate(-0.45 + tw);
      g.fillStyle = rgrad(g, 0, s * 0.24, s * 0.24, light, body);
      ell(g, 0, s * 0.22, s * 0.13, s * 0.30); g.fill();
      g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();
      // 绒毛分线
      g.strokeStyle = hexA(shade(body, 15), 0.3);
      g.lineWidth = s * 0.012;
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(i * s * 0.05, s * 0.05);
        g.quadraticCurveTo(i * s * 0.09, s * 0.30, i * s * 0.05, s * 0.44);
        g.stroke();
      }
      if (patType === 'patch' || earType === 'antlers') {
        g.fillStyle = hexA(belly, 0.9);
        ell(g, 0, s * 0.40, s * 0.12, s * 0.11); g.fill();
      }
      g.restore();

      // 腿
      g.fillStyle = shade(body, -14);
      ell(g, -s * 0.23, s * 0.55, s * 0.15, s * 0.15); g.fill();
      ell(g,  s * 0.23, s * 0.55, s * 0.15, s * 0.15); g.fill();
      g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.02;
      ell(g, -s * 0.23, s * 0.55, s * 0.15, s * 0.15); g.stroke();
      ell(g,  s * 0.23, s * 0.55, s * 0.15, s * 0.15); g.stroke();

      // 身体
      g.fillStyle = rgrad(g, 0, bodyY, s * 0.62, light, body);
      ell(g, 0, bodyY, bodyRX, bodyRY); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();

      // 毛皮质感（沿轮廓画短毛）
      g.strokeStyle = hexA(shade(body, -20), 0.35);
      g.lineWidth = s * 0.014;
      g.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + 0.3;
        const rx = Math.cos(a) * bodyRX * 0.85;
        const ry = bodyY + Math.sin(a) * bodyRY * 0.85;
        g.beginPath();
        g.moveTo(rx, ry);
        g.lineTo(rx + Math.cos(a) * s * 0.04, ry + Math.sin(a) * s * 0.04);
        g.stroke();
      }

      // 肚子
      g.fillStyle = hexA(belly, 0.92);
      ell(g, 0, bodyY + s * 0.10, bodyRX * 0.58, bodyRY * 0.60); g.fill();

      // 花纹
      drawBeastPattern(g, s, patType, dark, body, bodyY, bodyRX);

      // 头
      const hy = -s * 0.30, hr = s * 0.46;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.03; g.stroke();

      // 耳朵 / 角
      drawBeastEars(g, s, hy, hr, earType, pal);

      // 额头花纹
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

      // 口鼻
      g.fillStyle = hexA(belly, 0.95);
      ell(g, 0, hy + hr * 0.46, hr * 0.48, hr * 0.34); g.fill();
      g.strokeStyle = hexA(dark, 0.16); g.lineWidth = s * 0.016; g.stroke();

      // 鼻子
      g.fillStyle = dark;
      ell(g, 0, hy + hr * 0.26, hr * 0.17, hr * 0.12); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      circ(g, -hr * 0.05, hy + hr * 0.22, hr * 0.04); g.fill();

      // 嘴
      g.strokeStyle = hexA(dark, 0.65); g.lineWidth = s * 0.022; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, hy + hr * 0.38);
      g.lineTo(0, hy + hr * 0.48);
      g.moveTo(-hr * 0.16, hy + hr * 0.50);
      g.quadraticCurveTo(-hr * 0.08, hy + hr * 0.60, 0, hy + hr * 0.48);
      g.quadraticCurveTo( hr * 0.08, hy + hr * 0.60, hr * 0.16, hy + hr * 0.50);
      g.stroke();

      // 眼睛
      const bl = blinkAt(time, h);
      const iris = (h % 3 === 0) ? accent : null;
      drawEye(g, -hr * 0.44, hy - hr * 0.10, hr * 0.25, { blink: bl, iris });
      drawEye(g,  hr * 0.44, hy - hr * 0.10, hr * 0.25, { blink: bl, iris });

      // 鬍鬚
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

    function drawBeastPattern(g, s, type, dark, body, cy, r) {
      if (type === 'spots') {
        g.fillStyle = hexA(shade(body, -42), 0.55);
        const pts = [[-0.26, 0.10], [0.24, 0.16], [-0.10, 0.32], [0.12, -0.02], [0.30, 0.36]];
        for (const p of pts) {
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

    /* ---------- 有翼 ---------- */
    function drawWinged(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const flap = Math.sin(time * 3.0 + (h % 6)) * 0.16 + 0.10;
      g.save();
      g.translate(0, Math.sin(time * 2.0 + (h % 9)) * s * 0.05);

      // 翅膀（多层羽毛）
      for (const sx of [-1, 1]) {
        g.save();
        g.translate(sx * s * 0.10, -s * 0.06);
        g.rotate(sx * (0.48 + flap));
        // 底层大羽
        g.fillStyle = rgrad(g, 0, 0, s * 0.80, hexA(accent, 0.96), hexA(shade(accent, -42), 0.86));
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(sx * s * 0.50, -s * 0.56, sx * s * 1.14, -s * 0.66, sx * s * 1.28, -s * 0.14);
        g.bezierCurveTo(sx * s * 1.08, s * 0.06, sx * s * 0.78, s * 0.12, sx * s * 0.54, s * 0.06);
        g.bezierCurveTo(sx * s * 0.38, s * 0.26, sx * s * 0.14, s * 0.22, 0, 0);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.024; g.stroke();
        // 羽毛分线
        g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.018;
        for (let i = 1; i <= 4; i++) {
          g.beginPath();
          g.moveTo(sx * s * 0.06 * i, s * 0.02);
          g.quadraticCurveTo(sx * s * (0.30 + i * 0.18), -s * 0.28, sx * s * (0.34 + i * 0.26), -s * 0.44);
          g.stroke();
        }
        // 高光
        g.fillStyle = 'rgba(255,255,255,0.30)';
        g.beginPath();
        g.ellipse(sx * s * 0.55, -s * 0.30, s * 0.30, s * 0.08, sx * 0.5, 0, TAU);
        g.fill();
        g.restore();
      }

      // 尾羽
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

      // 身体
      g.fillStyle = rgrad(g, 0, s * 0.14, s * 0.58, light, body);
      ell(g, 0, s * 0.16, s * 0.44, s * 0.46); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      // 胸前
      g.fillStyle = hexA(belly, 0.88);
      ell(g, 0, s * 0.24, s * 0.26, s * 0.28); g.fill();

      // 头
      const hy = -s * 0.36, hr = s * 0.40;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      // 光環 / 星冠
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

      // 眼睛
      const bl = blinkAt(time, h);
      drawEye(g, -hr * 0.42, hy - hr * 0.08, hr * 0.25, { blink: bl, iris: accent, pr: 0.44 });
      drawEye(g,  hr * 0.42, hy - hr * 0.08, hr * 0.25, { blink: bl, iris: accent, pr: 0.44 });

      // 嘴
      g.strokeStyle = hexA(dark, 0.55); g.lineWidth = s * 0.022; g.lineCap = 'round';
      g.beginPath();
      g.arc(0, hy + hr * 0.42, hr * 0.14, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();

      blush(g, -hr * 0.68, hy + hr * 0.20, hr * 0.15, 0.34);
      blush(g,  hr * 0.68, hy + hr * 0.20, hr * 0.15, 0.34);

      g.restore();
    }

    /* ---------- 水生 ---------- */
    function drawAquatic(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const sw = Math.sin(time * 2.0 + (h % 5));
      g.save();
      g.translate(0, sw * s * 0.05);

      // 尾鳍
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

      // 背鳍
      g.fillStyle = hexA(accent, 0.88);
      g.beginPath();
      g.moveTo(-s * 0.08, -s * 0.28);
      g.quadraticCurveTo(s * 0.02, -s * 0.70, s * 0.28, -s * 0.26);
      g.closePath(); g.fill();
      g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.02; g.stroke();

      // 身体
      g.fillStyle = rgrad(g, 0, s * 0.02, s * 0.72, light, body);
      ell(g, 0, s * 0.02, s * 0.64, s * 0.44); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      // 鳞片纹理
      g.strokeStyle = hexA(shade(body, -22), 0.35);
      g.lineWidth = s * 0.014;
      for (let row = 0; row < 2; row++) {
        for (let col = -2; col <= 2; col++) {
          g.beginPath();
          g.arc(col * s * 0.14 + (row % 2) * s * 0.07, -s * 0.10 + row * s * 0.14, s * 0.07, Math.PI * 0.1, Math.PI * 0.9);
          g.stroke();
        }
      }

      // 白肚
      g.fillStyle = hexA(belly, 0.92);
      g.beginPath();
      g.ellipse(0, s * 0.14, s * 0.50, s * 0.26, 0, 0, Math.PI);
      g.fill();

      // 胸鳍
      for (const sx of [-1, 1]) {
        g.fillStyle = hexA(accent, 0.82);
        g.beginPath();
        g.moveTo(sx * s * 0.14, s * 0.14);
        g.lineTo(sx * s * 0.44, s * 0.34);
        g.lineTo(sx * s * 0.16, s * 0.28);
        g.closePath(); g.fill();
        g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.016; g.stroke();
      }

      // 眼睛
      const bl = blinkAt(time, h);
      drawEye(g, s * 0.34, -s * 0.12, s * 0.11, { blink: bl });

      // 嘴
      g.strokeStyle = hexA(dark, 0.55); g.lineWidth = s * 0.022; g.lineCap = 'round';
      g.beginPath();
      g.arc(s * 0.40, s * 0.04, s * 0.08, Math.PI * 0.30, Math.PI * 0.95);
      g.stroke();

      blush(g, s * 0.28, s * 0.04, s * 0.10, 0.30);

      g.restore();
    }

    /* ---------- 爬虫 ---------- */
    function drawReptile(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      const wob = Math.sin(time * 2.4 + (h % 7));
      g.save();
      g.translate(0, wob * s * 0.04);

      // 尾巴分节
      for (let i = 5; i >= 1; i--) {
        const t = i / 5;
        const tx = -s * (0.36 + t * 0.60);
        const ty = s * (0.10 + Math.sin(time * 3 - i * 0.8) * 0.10 * t);
        const r = s * (0.10 + t * 0.07);
        g.fillStyle = rgrad(g, tx, ty, r, light, body);
        circ(g, tx, ty, r); g.fill();
        g.strokeStyle = hexA(dark, 0.42); g.lineWidth = s * 0.018; g.stroke();
      }

      // 腿
      g.fillStyle = shade(body, -16);
      for (const sx of [-1, 1]) {
        ell(g, sx * s * 0.30, s * 0.46, s * 0.14, s * 0.10, sx * 0.35); g.fill();
        g.strokeStyle = hexA(dark, 0.4); g.lineWidth = s * 0.018; g.stroke();
      }

      // 身体
      g.fillStyle = rgrad(g, 0, s * 0.10, s * 0.60, light, body);
      ell(g, 0, s * 0.10, s * 0.48, s * 0.40); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      // 鳞片
      g.strokeStyle = hexA(shade(body, -25), 0.4);
      g.lineWidth = s * 0.014;
      for (let row = 0; row < 2; row++) {
        for (let col = -2; col <= 2; col++) {
          g.beginPath();
          g.arc(col * s * 0.13 + (row % 2) * s * 0.06, -s * 0.02 + row * s * 0.12, s * 0.06, Math.PI * 0.2, Math.PI * 0.8);
          g.stroke();
        }
      }

      // 腹部横纹
      g.fillStyle = hexA(belly, 0.82);
      for (let i = 0; i < 3; i++) {
        ell(g, 0, s * (0.02 + i * 0.14), s * (0.30 - i * 0.04), s * 0.07); g.fill();
      }

      // 头
      const hy = -s * 0.32, hr = s * 0.38;
      g.fillStyle = rgrad(g, 0, hy, hr, light, body);
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.5); g.lineWidth = s * 0.028; g.stroke();

      // 头冠
      g.fillStyle = accent;
      for (let i = -1; i <= 1; i++) {
        const bx = i * hr * 0.36;
        g.beginPath();
        g.moveTo(bx - hr * 0.10, hy - hr * 0.86);
        g.lineTo(bx, hy - hr * 1.16);
        g.lineTo(bx + hr * 0.10, hy - hr * 0.86);
        g.closePath(); g.fill();
      }

      // 口鼻
      g.fillStyle = hexA(shade(body, 12), 1);
      ell(g, 0, hy + hr * 0.48, hr * 0.52, hr * 0.30); g.fill();
      g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.018; g.stroke();
      g.fillStyle = hexA(dark, 0.8);
      circ(g, -hr * 0.16, hy + hr * 0.36, hr * 0.045); g.fill();
      circ(g,  hr * 0.16, hy + hr * 0.36, hr * 0.045); g.fill();

      // 眼睛
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

    /* ---------- 软体 ---------- */
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

    /* ---------- 幽灵 ---------- */
    function drawGhost(g, s, time, pal, h) {
      const { body, belly, accent, dark, light } = pal;
      g.save();
      g.translate(0, Math.sin(time * 1.8 + (h % 6)) * s * 0.06);

      drawGlow(g, 0, 0, s * 1.4, accent, 0.22);

      g.fillStyle = rgrad(g, 0, -s * 0.2, s * 0.9, hexA(light, 0.94), hexA(body, 0.86));
      g.beginPath();
      g.moveTo(-s * 0.62, s * 0.10);
      g.bezierCurveTo(-s * 0.72, -s * 0.60, -s * 0.38, -s * 0.92, 0, -s * 0.92);
      g.bezierCurveTo( s * 0.38, -s * 0.92,  s * 0.72, -s * 0.60, s * 0.62, s * 0.10);
      const n = 5;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = s * (0.62 - t * 1.24);
        const y = s * (0.36 + Math.sin(time * 3 + t * Math.PI * 3) * 0.10);
        g.lineTo(x, y);
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

    /* ---------- 骷髅 ---------- */
    function drawSkeleton(g, s, time, pal, h) {
      const { belly, accent, dark, light } = pal;
      g.save();
      g.translate(0, Math.sin(time * 2.4 + (h % 5)) * s * 0.03);

      // 身体骨
      g.strokeStyle = hexA(light, 0.95); g.lineWidth = s * 0.075; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, s * 0.02); g.lineTo(0, s * 0.46);
      g.stroke();
      g.lineWidth = s * 0.05;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(0, s * (0.08 + i * 0.12), s * (0.22 - i * 0.02), Math.PI * 1.08, Math.PI * 1.92);
        g.stroke();
        g.beginPath();
        g.arc(0, s * (0.08 + i * 0.12), s * (0.22 - i * 0.02), Math.PI * 0.08, Math.PI * 0.92);
        g.stroke();
      }
      g.lineWidth = s * 0.05;
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(0, s * 0.12); g.lineTo(sx * s * 0.30, s * 0.34);
        g.stroke();
      }

      const hy = -s * 0.32, hr = s * 0.44;
      g.fillStyle = rgrad(g, 0, hy, hr, '#f8f8ff', '#c8c8d8');
      circ(g, 0, hy, hr); g.fill();
      g.strokeStyle = hexA(dark, 0.35); g.lineWidth = s * 0.022; g.stroke();
      // 下颚
      g.fillStyle = '#dcdce8';
      g.beginPath();
      g.moveTo(-hr * 0.40, hy + hr * 0.52);
      g.quadraticCurveTo(0, hy + hr * 0.86, hr * 0.40, hy + hr * 0.52);
      g.quadraticCurveTo(0, hy + hr * 0.66, -hr * 0.40, hy + hr * 0.52);
      g.closePath(); g.fill();
      // 眼窝
      g.fillStyle = '#14121e';
      ell(g, -hr * 0.40, hy - hr * 0.04, hr * 0.24, hr * 0.26); g.fill();
      ell(g,  hr * 0.40, hy - hr * 0.04, hr * 0.24, hr * 0.26); g.fill();
      // 红光
      const glow = 0.5 + Math.sin(time * 5 + h) * 0.5;
      g.save();
      g.shadowBlur = s * 0.28; g.shadowColor = '#ff3030';
      g.fillStyle = `rgba(255,60,50,${0.6 + glow * 0.4})`;
      circ(g, -hr * 0.40, hy - hr * 0.04, hr * 0.09); g.fill();
      circ(g,  hr * 0.40, hy - hr * 0.04, hr * 0.09); g.fill();
      g.restore();
      // 鼻孔
      g.fillStyle = '#2a2636';
      g.beginPath();
      g.moveTo(0, hy + hr * 0.20);
      g.lineTo(-hr * 0.10, hy + hr * 0.42);
      g.lineTo(hr * 0.10, hy + hr * 0.42);
      g.closePath(); g.fill();
      // 牙
      g.strokeStyle = '#a8a8bc'; g.lineWidth = s * 0.018;
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(i * hr * 0.14, hy + hr * 0.56);
        g.lineTo(i * hr * 0.14, hy + hr * 0.70);
        g.stroke();
      }
      // 王冠
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
     *  物种分发
     * ========================================================= */
    const SPECIES_FN = {
      chicken: drawChicken,
      dog: drawDog,
      bird: drawBird,
      fox: drawFox,
      bear: drawBear,
      hound: drawHound,
      dragon: drawDragonVariant,  // 龙走多变体
      shark: drawShark,
      beast: drawBeast,
      winged: drawWinged,
      aquatic: drawAquatic,
      reptile: drawReptile,
      blob: drawBlob,
      ghost: drawGhost,
      skeleton: drawSkeleton
    };

    const KEYWORDS = [
      [/(chicken|chick|hen|rooster|小雞)/, 'chicken'],
      [/(hound|wolf|lycan|地獄犬|獵犬)/, 'hound'],
      [/(dog|puppy|犬|狗)/, 'dog'],
      [/(fox|kitsune|狐)/, 'fox'],
      [/(bear|panda|熊|貓熊)/, 'bear'],
      [/(dragon|wyvern|draco|龍)/, 'dragon'],
      [/(shark|鯊)/, 'shark'],
      [/(phoenix|butterfly|fairy|angel|goddess|griffin|wing|moth|sakura|cosmic|moon|star|鳳凰|天使|蝴蝶|女神|獅鷲|櫻)/, 'winged'],
      [/(mermaid|kraken|fish|whale|dolphin|turtle|octopus|squid|mosasaur|人魚|海|鯨|龜|章魚)/, 'aquatic'],
      [/(lizard|gecko|worm|centipede|serpent|snake|bronto|dino|trex|rex|ankylo|triceratops|raptor|蜥|蛇|蟲|暴龍|恐龍)/, 'reptile'],
      [/(cow|deer|unicorn|beast|thunder|goat|horse|bull|ox|pig|sheep|rabbit|bunny|cat|kitten|mouse|rat|hamster|squirrel|elephant|rhino|hippo|monkey|ape|tiger|lion|leopard|cheetah|牛|鹿|獨角獸|獸|兔|貓|鼠|虎|獅)/, 'beast'],
      [/(ghost|spirit|wraith|soul|phantom|幽靈|魂)/, 'ghost'],
      [/(skeleton|skull|bone|reaper|lich|骷髏|骨)/, 'skeleton'],
      [/(frog|slime|blob|chaos|eye|jelly|蛙|史萊姆|混沌|眼)/, 'blob']
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
     *  主入口
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
      fn(g, s, time, P, h, shape);
      g.restore();
    }

    /* =========================================================
     *  蛋
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
     *  火柴人
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
     *  注册
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