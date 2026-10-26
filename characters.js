/* ===================================================================
 * 🎨 characters.js
 * 全遊戲的「造型繪製」都在這個檔案：
 *   - drawPetShape(g, shape, pal, s, time, rc)     寵物
 *   - drawEggShape(g, e, s, time, rc)              蛋
 *   - drawGuardAnimal(g, biomeIdx, s, time, alert) 守衛
 *   - drawStickFigure(g, cx, cy, r, time, facing, walkPhase, swingPhase) 角色
 *   - drawStickIcon(g, def, s, swingPhase)         棒子（含在 player 手上）
 *   - drawTrailOnPlayer(g, player, trailDef, time) 足跡粒子
 *
 * 主遊戲 index.html 的 drawPetShape / drawEggShape / drawGuardAnimal /
 * drawStickFigure 都是「呼叫 window.__raingodDrawXxx」，這裡註冊對應函式即可。
 * 以後要改造型，只改這個檔案，不會動到主遊戲邏輯與活動。
 * =================================================================== */
(function () {
  'use strict';

  function setup() {
    const G = window.raingodGame;
    if (!G) { setTimeout(setup, 50); return; }

    const { WORLD, BIOME_PALETTES, hexA, shade, clamp, rnd } = G;

    /* =========================================================
     *  1. 守衛動物（12 種 biome）
     * ========================================================= */
    const GUARD_ANIMALS = [
      // 0 森林 - 雞
      {name:'雞',draw:function(g,s,time,alert){ g.fillStyle='#d8b040';g.beginPath();g.moveTo(-s*0.7,s*0.1);g.quadraticCurveTo(-s*0.8,-s*0.5,-s*0.3,-s*0.7);g.quadraticCurveTo(0,-s*0.9,s*0.3,-s*0.7);g.quadraticCurveTo(s*0.8,-s*0.5,s*0.7,s*0.1);g.quadraticCurveTo(s*0.6,s*0.7,0,s*0.75);g.quadraticCurveTo(-s*0.6,s*0.7,-s*0.7,s*0.1);g.closePath();g.fill();g.strokeStyle='#8a6a1a';g.lineWidth=2;g.stroke(); g.fillStyle='#e8d060';g.beginPath();g.arc(0,-s*0.55,s*0.48,0,7);g.fill(); g.fillStyle='#ff3030';for(let i=-1;i<=1;i++){g.beginPath();g.moveTo(i*s*0.1,-s*0.9);g.quadraticCurveTo(i*s*0.2,-s*1.2,i*s*0.3,-s*0.9);g.closePath();g.fill();} g.fillStyle='#ff9010';g.beginPath();g.moveTo(-s*0.15,-s*0.5);g.lineTo(s*0.15,-s*0.5);g.lineTo(0,-s*0.25);g.closePath();g.fill(); g.fillStyle='#fff';g.beginPath();g.arc(-s*0.2,-s*0.65,s*0.1,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.65,s*0.1,0,7);g.fill(); g.fillStyle='#000';g.beginPath();g.arc(-s*0.2,-s*0.65,s*0.05,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.65,s*0.05,0,7);g.fill(); }},
      // 1 火山 - 地獄犬
      {name:'地獄犬',draw:function(g,s,time,alert){ g.fillStyle='#a82a1a';g.beginPath();g.moveTo(-s*0.7,s*0.05);g.quadraticCurveTo(-s*0.75,s*0.6,-s*0.2,s*0.7);g.quadraticCurveTo(0,s*0.75,s*0.2,s*0.7);g.quadraticCurveTo(s*0.75,s*0.6,s*0.7,s*0.05);g.quadraticCurveTo(s*0.6,-s*0.3,0,-s*0.3);g.quadraticCurveTo(-s*0.6,-s*0.3,-s*0.7,s*0.05);g.closePath();g.fill();g.strokeStyle='#5a0a0a';g.lineWidth=2.5;g.stroke(); g.fillStyle='#c83a2a';g.beginPath();g.arc(0,-s*0.55,s*0.55,0,7);g.fill(); g.fillStyle='#ff2020';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.13,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.13,0,7);g.fill(); g.fillStyle='#ffee00';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.06,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.06,0,7);g.fill(); g.fillStyle='#fff';for(let i=0;i<3;i++){g.beginPath();g.moveTo(-s*0.12+i*s*0.08,-s*0.33);g.lineTo(-s*0.08+i*s*0.08,-s*0.2);g.lineTo(-s*0.04+i*s*0.08,-s*0.33);g.closePath();g.fill();} }},
      // 2 深淵 - 白鯨
      {name:'白鯨',draw:function(g,s,time,alert){ g.fillStyle='#c0d8f0';g.beginPath();g.moveTo(-s*0.8,s*0.0);g.quadraticCurveTo(-s*0.6,-s*0.4,0,-s*0.5);g.quadraticCurveTo(s*0.6,-s*0.4,s*0.8,s*0.0);g.quadraticCurveTo(s*0.6,s*0.4,0,s*0.5);g.quadraticCurveTo(-s*0.6,s*0.4,-s*0.8,s*0.0);g.closePath();g.fill();g.strokeStyle='#6a9aba';g.lineWidth=2.5;g.stroke(); g.fillStyle='#fff';g.beginPath();g.arc(-s*0.3,-s*0.15,s*0.12,0,7);g.fill();g.beginPath();g.arc(s*0.3,-s*0.15,s*0.12,0,7);g.fill(); g.fillStyle='#2a4a6a';g.beginPath();g.arc(-s*0.3,-s*0.15,s*0.06,0,7);g.fill();g.beginPath();g.arc(s*0.3,-s*0.15,s*0.06,0,7);g.fill(); }},
      // 3 史前 - 暴龍
      {name:'暴龍',draw:function(g,s,time,alert){ g.fillStyle='#8a7a3a';g.beginPath();g.moveTo(-s*0.7,s*0.05);g.quadraticCurveTo(-s*0.75,s*0.6,-s*0.2,s*0.7);g.quadraticCurveTo(0,s*0.75,s*0.2,s*0.7);g.quadraticCurveTo(s*0.75,s*0.6,s*0.7,s*0.05);g.quadraticCurveTo(s*0.6,-s*0.3,0,-s*0.3);g.quadraticCurveTo(-s*0.6,-s*0.3,-s*0.7,s*0.05);g.closePath();g.fill();g.strokeStyle='#4a3a0a';g.lineWidth=2.5;g.stroke(); g.fillStyle='#a89a4a';g.beginPath();g.ellipse(s*0.4,-s*0.45,s*0.55,s*0.45,0.2,0,7);g.fill(); g.fillStyle='#fff';g.beginPath();g.arc(s*0.55,-s*0.55,s*0.13,0,7);g.fill(); g.fillStyle='#000';g.beginPath();g.arc(s*0.55,-s*0.55,s*0.06,0,7);g.fill(); }},
      // 4 冰河 - 雪怪
      {name:'雪怪',draw:function(g,s,time,alert){ g.fillStyle='#d8e8f8';g.beginPath();g.moveTo(-s*0.75,s*0.05);g.quadraticCurveTo(-s*0.8,s*0.6,-s*0.2,s*0.7);g.quadraticCurveTo(0,s*0.78,s*0.2,s*0.7);g.quadraticCurveTo(s*0.8,s*0.6,s*0.75,s*0.05);g.quadraticCurveTo(s*0.6,-s*0.3,0,-s*0.3);g.quadraticCurveTo(-s*0.6,-s*0.3,-s*0.75,s*0.05);g.closePath();g.fill();g.strokeStyle='#6a8ab0';g.lineWidth=2.5;g.stroke(); g.fillStyle='#e8f4ff';for(let i=0;i<8;i++){const a=i*Math.PI/4;g.beginPath();g.arc(Math.cos(a)*s*0.7,Math.sin(a)*s*0.6,s*0.15,0,7);g.fill();} g.fillStyle='#b0d0f0';g.beginPath();g.arc(0,-s*0.55,s*0.55,0,7);g.fill(); g.fillStyle='#1a4a8a';g.beginPath();g.arc(-s*0.22,-s*0.62,s*0.14,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.62,s*0.14,0,7);g.fill(); g.fillStyle='#fff';g.beginPath();g.arc(-s*0.22,-s*0.62,s*0.05,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.62,s*0.05,0,7);g.fill(); g.fillStyle='#1a4a8a';g.beginPath();g.moveTo(-s*0.25,-s*0.25);g.quadraticCurveTo(0,-s*0.05,s*0.25,-s*0.25);g.quadraticCurveTo(0,-s*0.15,-s*0.25,-s*0.25);g.closePath();g.fill(); }},
      // 5 宇宙 - 骷髏王
      {name:'骷髏王',draw:function(g,s,time,alert){ g.fillStyle='#e8e8f0';g.beginPath();g.moveTo(-s*0.7,s*0.05);g.quadraticCurveTo(-s*0.75,s*0.6,-s*0.2,s*0.7);g.quadraticCurveTo(0,s*0.75,s*0.2,s*0.7);g.quadraticCurveTo(s*0.75,s*0.6,s*0.7,s*0.05);g.quadraticCurveTo(s*0.6,-s*0.3,0,-s*0.3);g.quadraticCurveTo(-s*0.6,-s*0.3,-s*0.7,s*0.05);g.closePath();g.fill();g.strokeStyle='#8a8a9a';g.lineWidth=2.5;g.stroke(); g.fillStyle='#d0d0e0';g.beginPath();g.arc(0,-s*0.55,s*0.6,0,7);g.fill(); g.fillStyle='#1a1a2a';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.16,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.16,0,7);g.fill(); g.fillStyle='#ff3030';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.08,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.08,0,7);g.fill(); g.fillStyle='#ffe040';g.beginPath();g.moveTo(-s*0.4,-s*0.95);g.lineTo(-s*0.2,-s*1.0);g.lineTo(0,-s*1.2);g.lineTo(s*0.2,-s*1.0);g.lineTo(s*0.4,-s*0.95);g.closePath();g.fill(); }},
      // 6 櫻花 - 櫻花精靈
      {name:'櫻花精靈',draw:function(g,s,time,alert){ g.fillStyle='#f0a0d0';g.beginPath();g.moveTo(-s*0.65,s*0.05);g.quadraticCurveTo(-s*0.7,s*0.55,-s*0.2,s*0.65);g.quadraticCurveTo(0,s*0.7,s*0.2,s*0.65);g.quadraticCurveTo(s*0.7,s*0.55,s*0.65,s*0.05);g.quadraticCurveTo(s*0.55,-s*0.3,0,-s*0.3);g.quadraticCurveTo(-s*0.55,-s*0.3,-s*0.65,s*0.05);g.closePath();g.fill();g.strokeStyle='#c86aaa';g.lineWidth=2.5;g.stroke(); g.fillStyle='#ffd0e8';g.beginPath();g.arc(0,-s*0.55,s*0.55,0,7);g.fill(); g.fillStyle='#fff';g.beginPath();g.arc(-s*0.2,-s*0.6,s*0.13,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.6,s*0.13,0,7);g.fill(); g.fillStyle='#6a2a4a';g.beginPath();g.arc(-s*0.2,-s*0.6,s*0.065,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.6,s*0.065,0,7);g.fill(); g.fillStyle='#ff80c0';for(let i=0;i<5;i++){const a=time*2+i*Math.PI*2/5;g.beginPath();g.ellipse(Math.cos(a)*s*0.5,-s*0.55+Math.sin(a)*s*0.5,s*0.12,s*0.2,a,0,7);g.fill();} }},
      // 7 泰坦 - 泰坦巨神
      {name:'泰坦巨神',draw:function(g,s,time,alert){ g.fillStyle='#a0a0b8';g.beginPath();g.moveTo(-s*0.8,s*0.05);g.quadraticCurveTo(-s*0.85,s*0.65,-s*0.2,s*0.75);g.quadraticCurveTo(0,s*0.8,s*0.2,s*0.75);g.quadraticCurveTo(s*0.85,s*0.65,s*0.8,s*0.05);g.quadraticCurveTo(s*0.7,-s*0.35,0,-s*0.35);g.quadraticCurveTo(-s*0.7,-s*0.35,-s*0.8,s*0.05);g.closePath();g.fill();g.strokeStyle='#6a6a8a';g.lineWidth=3;g.stroke(); g.fillStyle='#c0c0d8';g.beginPath();g.arc(0,-s*0.55,s*0.6,0,7);g.fill(); g.fillStyle='#ffe040';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.14,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.14,0,7);g.fill(); g.fillStyle='#2a2a4a';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.07,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.07,0,7);g.fill(); }},
      // 8 神界 - 天使
      {name:'天使',draw:function(g,s,time,alert){ g.strokeStyle='#ffe040';g.lineWidth=3;g.beginPath();g.ellipse(0,-s*1.15,s*0.4,s*0.1,0,0,7);g.stroke(); g.fillStyle='rgba(255,255,200,0.85)'; g.beginPath();g.moveTo(-s*0.2,-s*0.2);g.quadraticCurveTo(-s*1.3,-s*0.9,-s*1.1,s*0.1);g.quadraticCurveTo(-s*0.9,s*0.2,-s*0.2,s*0.2);g.closePath();g.fill(); g.beginPath();g.moveTo(s*0.2,-s*0.2);g.quadraticCurveTo(s*1.3,-s*0.9,s*1.1,s*0.1);g.quadraticCurveTo(s*0.9,s*0.2,s*0.2,s*0.2);g.closePath();g.fill(); g.fillStyle='#fff0c0';g.beginPath();g.ellipse(0,s*0.15,s*0.45,s*0.55,0,0,7);g.fill(); g.fillStyle='#ffe8a0';g.beginPath();g.arc(0,-s*0.55,s*0.5,0,7);g.fill(); g.fillStyle='#4a2a00';g.beginPath();g.arc(-s*0.18,-s*0.6,s*0.08,0,7);g.fill();g.beginPath();g.arc(s*0.18,-s*0.6,s*0.08,0,7);g.fill(); }},
      // 9 暗影 - 暗影領主
      {name:'暗影領主',draw:function(g,s,time,alert){ g.fillStyle='#1a1a3a';g.beginPath();g.moveTo(-s*0.7,s*0.05);g.quadraticCurveTo(-s*0.75,s*0.6,-s*0.2,s*0.7);g.quadraticCurveTo(0,s*0.75,s*0.2,s*0.7);g.quadraticCurveTo(s*0.75,s*0.6,s*0.7,s*0.05);g.quadraticCurveTo(s*0.6,-s*0.3,0,-s*0.3);g.quadraticCurveTo(-s*0.6,-s*0.3,-s*0.7,s*0.05);g.closePath();g.fill();g.strokeStyle='#8040ff';g.lineWidth=2.5;g.stroke(); g.fillStyle='#3a3a5a';g.beginPath();g.arc(0,-s*0.55,s*0.6,0,7);g.fill(); g.fillStyle='#ff2020';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.15,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.15,0,7);g.fill(); g.fillStyle='#000';g.beginPath();g.arc(-s*0.22,-s*0.6,s*0.06,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.6,s*0.06,0,7);g.fill(); g.fillStyle='#8040ff';g.beginPath();g.moveTo(-s*0.4,-s*0.95);g.lineTo(-s*0.2,-s*1.0);g.lineTo(0,-s*1.2);g.lineTo(s*0.2,-s*1.0);g.lineTo(s*0.4,-s*0.95);g.closePath();g.fill(); }},
      // 10 混沌 - 混沌之主
      {name:'混沌之主',draw:function(g,s,time,alert){ g.strokeStyle='#c040ff';g.lineWidth=2.5; for(let k=0;k<3;k++){g.beginPath();let first=true;for(let a=k*2;a<Math.PI*4+k*2;a+=0.3){const r=a*4;const px=Math.cos(a)*r,py=Math.sin(a)*r;if(first){g.moveTo(px,py);first=false;}else g.lineTo(px,py);}g.stroke();} g.fillStyle='#3a0a5a';g.beginPath();g.arc(0,0,s*0.5,0,7);g.fill(); g.fillStyle='#ff00aa';g.beginPath();g.arc(-s*0.2,-s*0.1,s*0.15,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.1,s*0.15,0,7);g.fill(); g.fillStyle='#fff';g.beginPath();g.arc(-s*0.2,-s*0.1,s*0.06,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.1,s*0.06,0,7);g.fill(); g.strokeStyle='#7a3a9a';g.lineWidth=3; for(let i=0;i<6;i++){const a=i*Math.PI/3;g.beginPath();g.moveTo(Math.cos(a)*s*0.4,Math.sin(a)*s*0.4);g.quadraticCurveTo(Math.cos(a)*s*0.8,Math.sin(a)*s*0.8,Math.cos(a)*s*1.0,Math.sin(a)*s*1.0);g.stroke();} }},
      // 11 虛空 - 虛空吞噬者
      {name:'虛空吞噬者',draw:function(g,s,time,alert){ g.fillStyle='#3a1a5a';g.beginPath();g.moveTo(-s*0.8,s*0.05);g.quadraticCurveTo(-s*0.85,s*0.65,-s*0.2,s*0.75);g.quadraticCurveTo(0,s*0.8,s*0.2,s*0.75);g.quadraticCurveTo(s*0.85,s*0.65,s*0.8,s*0.05);g.quadraticCurveTo(s*0.7,-s*0.35,0,-s*0.35);g.quadraticCurveTo(-s*0.7,-s*0.35,-s*0.8,s*0.05);g.closePath();g.fill();g.strokeStyle='#1a0a2a';g.lineWidth=3.5;g.stroke(); g.fillStyle='#5a3a7a';for(let i=0;i<8;i++){const a=time*0.5+i*Math.PI/4;g.beginPath();g.ellipse(Math.cos(a)*s*0.8,Math.sin(a)*s*0.7,s*0.25,s*0.4,a,0,7);g.fill();} g.fillStyle='#ff00aa';g.beginPath();g.arc(0,0,s*0.4,0,7);g.fill(); g.fillStyle='#fff';g.beginPath();g.arc(0,0,s*0.2,0,7);g.fill(); g.fillStyle='#1a0a2a';g.beginPath();g.arc(0,0,s*0.12,0,7);g.fill(); }},
    ];

    /* =========================================================
     *  2. 寵物造型（每種 biome × 8 只）
     * ========================================================= */
    function drawPetShape(g, shape, pal, s, time, rc) {
      if (shape && shape.startsWith('guardian_')) {
        const gIdx = parseInt(shape.split('_')[1]);
        const anim = GUARD_ANIMALS[gIdx] || GUARD_ANIMALS[0];
        anim.draw(g, s, time, false);
        return;
      }
      const body = pal.body, belly = pal.belly, accent = pal.accent, dark = pal.dark, light = pal.light;
      const bob = Math.sin(time * 3) * 2;
      g.save(); g.translate(0, bob);
      function grad(cx, cy, r1, r2, c1, c2) { const gr = g.createRadialGradient(cx - r1 * 0.4, cy - r1 * 0.4, r1 * 0.1, cx, cy, r2); gr.addColorStop(0, c1); gr.addColorStop(1, c2); return gr; }
      switch (shape) {
        case 'chicken': {
          g.fillStyle = grad(0, 0, s * 0.7, s * 0.9, light, body); g.beginPath(); g.moveTo(-s * 0.7, s * 0.1); g.quadraticCurveTo(-s * 0.8, -s * 0.5, -s * 0.3, -s * 0.7); g.quadraticCurveTo(0, -s * 0.9, s * 0.3, -s * 0.7); g.quadraticCurveTo(s * 0.8, -s * 0.5, s * 0.7, s * 0.1); g.quadraticCurveTo(s * 0.6, s * 0.8, 0, s * 0.85); g.quadraticCurveTo(-s * 0.6, s * 0.8, -s * 0.7, s * 0.1); g.closePath(); g.fill(); g.strokeStyle = dark; g.lineWidth = 1.5; g.stroke();
          g.fillStyle = grad(0, s * 0.3, s * 0.3, s * 0.5, belly, shade(belly, -40)); g.beginPath(); g.ellipse(0, s * 0.25, s * 0.42, s * 0.4, 0, 0, 7); g.fill();
          g.fillStyle = grad(0, -s * 0.5, s * 0.3, s * 0.5, light, body); g.beginPath(); g.arc(0, -s * 0.5, s * 0.48, 0, 7); g.fill(); g.stroke();
          g.fillStyle = '#ff4040'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * s * 0.1, -s * 0.85); g.quadraticCurveTo(i * s * 0.2, -s * 1.15, i * s * 0.3, -s * 0.85); g.closePath(); g.fill(); }
          g.fillStyle = '#ffb020'; g.beginPath(); g.moveTo(-s * 0.18, -s * 0.44); g.lineTo(s * 0.18, -s * 0.44); g.lineTo(0, -s * 0.14); g.closePath(); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(-s * 0.22, -s * 0.58, s * 0.14, 0, 7); g.fill(); g.beginPath(); g.arc(s * 0.22, -s * 0.58, s * 0.14, 0, 7); g.fill();
          g.fillStyle = '#000'; g.beginPath(); g.arc(-s * 0.22, -s * 0.58, s * 0.07, 0, 7); g.fill(); g.beginPath(); g.arc(s * 0.22, -s * 0.58, s * 0.07, 0, 7); g.fill(); break;
        }
        case 'dog': {
          g.fillStyle = grad(0, s * 0.1, s * 0.6, s * 0.65, light, body); g.beginPath(); g.moveTo(-s * 0.6, s * 0.0); g.quadraticCurveTo(-s * 0.7, s * 0.5, -s * 0.2, s * 0.65); g.quadraticCurveTo(0, s * 0.7, s * 0.2, s * 0.65); g.quadraticCurveTo(s * 0.7, s * 0.5, s * 0.6, s * 0.0); g.quadraticCurveTo(s * 0.5, -s * 0.3, 0, -s * 0.3); g.quadraticCurveTo(-s * 0.5, -s * 0.3, -s * 0.6, s * 0.0); g.closePath(); g.fill(); g.strokeStyle = dark; g.lineWidth = 1.5; g.stroke();
          g.fillStyle = grad(0, -s * 0.4, s * 0.35, s * 0.48, light, body); g.beginPath(); g.arc(0, -s * 0.35, s * 0.45, 0, 7); g.fill(); g.stroke();
          g.fillStyle = dark; g.beginPath(); g.moveTo(-s * 0.42, -s * 0.7); g.lineTo(-s * 0.55, -s * 1.05); g.lineTo(-s * 0.25, -s * 0.82); g.closePath(); g.fill(); g.beginPath(); g.moveTo(s * 0.42, -s * 0.7); g.lineTo(s * 0.55, -s * 1.05); g.lineTo(s * 0.25, -s * 0.82); g.closePath(); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(-s * 0.2, -s * 0.44, s * 0.12, 0, 7); g.fill(); g.beginPath(); g.arc(s * 0.2, -s * 0.44, s * 0.12, 0, 7); g.fill();
          g.fillStyle = '#000'; g.beginPath(); g.arc(-s * 0.2, -s * 0.44, s * 0.06, 0, 7); g.fill(); g.beginPath(); g.arc(s * 0.2, -s * 0.44, s * 0.06, 0, 7); g.fill();
          g.fillStyle = '#ff6a8a'; g.beginPath(); g.ellipse(0, -s * 0.12, s * 0.08, s * 0.12, 0, 0, 7); g.fill(); break;
        }
        case 'bird': {
          g.fillStyle = grad(0, 0, s * 0.6, s * 0.8, light, body); g.beginPath(); g.moveTo(-s * 0.55, s * 0.0); g.quadraticCurveTo(-s * 0.6, -s * 0.6, -s * 0.2, -s * 0.75); g.quadraticCurveTo(0, -s * 0.85, s * 0.2, -s * 0.75); g.quadraticCurveTo(s * 0.6, -s * 0.6, s * 0.55, s * 0.0); g.quadraticCurveTo(s * 0.5, s * 0.7, 0, s * 0.75); g.quadraticCurveTo(-s * 0.5, s * 0.7, -s * 0.55, s * 0.0); g.closePath(); g.fill(); g.strokeStyle = dark; g.lineWidth = 1.5; g.stroke();
          g.fillStyle = grad(0, -s * 0.45, s * 0.3, s * 0.42, light, body); g.beginPath(); g.arc(0, -s * 0.46, s * 0.42, 0, 7); g.fill(); g.stroke();
          g.fillStyle = '#ffb020'; g.beginPath(); g.moveTo(-s * 0.14, -s * 0.4); g.lineTo(s * 0.14, -s * 0.4); g.lineTo(0, -s * 0.1); g.closePath(); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(-s * 0.18, -s * 0.58, s * 0.12, 0, 7); g.fill(); g.beginPath(); g.arc(s * 0.18, -s * 0.58, s * 0.12, 0, 7); g.fill();
          g.fillStyle = '#000'; g.beginPath(); g.arc(-s * 0.18, -s * 0.58, s * 0.06, 0, 7); g.fill(); g.beginPath(); g.arc(s * 0.18, -s * 0.58, s * 0.06, 0, 7); g.fill(); break;
        }
        case 'fox': {
          g.fillStyle = grad(0, s * 0.15, s * 0.6, s * 0.55, light, body); g.beginPath(); g.moveTo(-s * 0.6, s * 0.05); g.quadraticCurveTo(-s * 0.65, s * 0.55, -s * 0.2, s * 0.65); g.quadraticCurveTo(0, s * 0.7, s * 0.2, s * 0.65); g.quadraticCurveTo(s * 0.65, s * 0.55, s * 0.6, s * 0.05); g.quadraticCurveTo(s * 0.5, -s * 0.25, 0, -s * 0.25); g.quadraticCurveTo(-s * 0.5, -s * 0.25, -s * 0.6, s * 0.05); g.closePath(); g.fill(); g.strokeStyle = dark; g.lineWidth = 1.5; g.stroke();
          g.fillStyle = grad(0, -s * 0.3, s * 0.35, s * 0.45, light, body); g.beginPath(); g.arc(0, -s * 0.3, s * 0.45, 0, 7); g.fill(); g.stroke();
          g.fillStyle = shade(body, -25); g.beginPath(); g.moveTo(-s * 0.38, -s * 0.55); g.lineTo(-s * 0.18, -s * 1.0); g.lineTo(-s * 0.04, -s * 0.55); g.closePath(); g.fill(); g.beginPath(); g.moveTo(s * 0.38, -s * 0.55); g.lineTo(s * 0.18, -s * 1.0); g.lineTo(s * 0.04, -s * 0.55); g.closePath(); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(-s * 0.2, -s * 0.44, s * 0.11, 0, 7); g.fill(); g.beginPath(); g.arc(s * 0.2, -s * 0.44, s * 0.11, 0, 7); g.fill();
          g.fillStyle = '#000'; g.beginPath(); g.arc(-s * 0.2, -s * 0.44, s * 0.055, 0, 7); g.fill(); g.beginPath(); g.arc(s * 0.2, -s * 0.44, s * 0.055, 0, 7); g.fill(); break;
        }
        case 'bear': {
          g.fillStyle = grad(0, s * 0.1, s * 0.65, s * 0.65, light, body); g.beginPath(); g.moveTo(-s * 0.65, s * 0.05); g.quadraticCurveTo(-s * 0.7, s * 0.55, -s * 0.2, s * 0.68); g.quadraticCurveTo(0, s * 0.72, s * 0.2, s * 0.68); g.quadraticCurveTo(s * 0.7, s * 0.55, s * 0.65, s * 0.05); g.quadraticCurveTo(s * 0.55, -s * 0.3, 0, -s * 0.3); g.quadraticCurveTo(-s * 0.55, -s * 0.3, -s * 0.65, s * 0.05); g.closePath(); g.fill(); g.strokeStyle = dark; g.lineWidth = 1.5; g.stroke();
          g.fillStyle = grad(0, -s * 0.35, s * 0.35, s * 0.48, light, body); g.beginPath(); g.arc(0, -s * 0.35, s * 0.46, 0, 7); g.fill(); g.stroke();
          g.fillStyle = shade(body, -25); g.beginPath(); g.arc(-s * 0.36, -s * 0.74, s * 0.18, 0, 7); g.fill(); g.beginPath(); g.arc(s * 0.36, -s * 0.74, s * 0.18, 0, 7); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(-s * 0.2, -s * 0.44, s * 0.11, 0, 7); g.fill(); g.beginPath(); g.arc(s * 0.2, -s * 0.44, s * 0.11, 0, 7); g.fill();
          g.fillStyle = '#000'; g.beginPath(); g.arc(-s * 0.2, -s * 0.44, s * 0.055, 0, 7); g.fill(); g.beginPath(); g.arc(s * 0.2, -s * 0.44, s * 0.055, 0, 7); g.fill(); break;
        }
        case 'hound': {
          g.fillStyle = grad(0, s * 0.1, s * 0.6, s * 0.55, light, body); g.beginPath(); g.moveTo(-s * 0.6, s * 0.05); g.quadraticCurveTo(-s * 0.65, s * 0.55, -s * 0.2, s * 0.65); g.quadraticCurveTo(0, s * 0.7, s * 0.2, s * 0.65); g.quadraticCurveTo(s * 0.65, s * 0.55, s * 0.6, s * 0.05); g.quadraticCurveTo(s * 0.5, -s * 0.25, 0, -s * 0.25); g.quadraticCurveTo(-s * 0.5, -s * 0.25, -s * 0.6, s * 0.05); g.closePath(); g.fill(); g.strokeStyle = dark; g.lineWidth = 1.5; g.stroke();
          g.fillStyle = grad(0, -s * 0.35, s * 0.35, s * 0.45, light, body); g.beginPath(); g.arc(0, -s * 0.35, s * 0.45, 0, 7); g.fill(); g.stroke();
          g.fillStyle = '#ff2020'; g.beginPath(); g.arc(-s * 0.2, -s * 0.44, s * 0.12, 0, 7); g.fill(); g.beginPath(); g.arc(s * 0.2, -s * 0.44, s * 0.12, 0, 7); g.fill();
          g.fillStyle = '#ffee00'; g.beginPath(); g.arc(-s * 0.2, -s * 0.44, s * 0.055, 0, 7); g.fill(); g.beginPath(); g.arc(s * 0.2, -s * 0.44, s * 0.055, 0, 7); g.fill(); break;
        }
        case 'dragon': {
          g.fillStyle = accent; g.beginPath(); g.moveTo(-s * 0.2, s * 0.0); g.lineTo(-s * 0.8, -s * 0.6); g.lineTo(-s * 0.6, -s * 0.3); g.lineTo(-s * 0.9, -s * 0.2); g.lineTo(-s * 0.55, -s * 0.1); g.lineTo(-s * 0.75, s * 0.15); g.lineTo(-s * 0.3, s * 0.15); g.closePath(); g.fill();
          g.fillStyle = grad(0, s * 0.1, s * 0.6, s * 0.55, light, body); g.beginPath(); g.moveTo(-s * 0.6, s * 0.05); g.quadraticCurveTo(-s * 0.65, s * 0.55, -s * 0.2, s * 0.65); g.quadraticCurveTo(0, s * 0.7, s * 0.2, s * 0.65); g.quadraticCurveTo(s * 0.65, s * 0.55, s * 0.6, s * 0.05); g.quadraticCurveTo(s * 0.5, -s * 0.25, 0, -s * 0.25); g.quadraticCurveTo(-s * 0.5, -s * 0.25, -s * 0.6, s * 0.05); g.closePath(); g.fill(); g.strokeStyle = dark; g.lineWidth = 1.5; g.stroke();
          g.fillStyle = grad(s * 0.3, -s * 0.3, s * 0.25, s * 0.35, light, body); g.beginPath(); g.ellipse(s * 0.3, -s * 0.3, s * 0.38, s * 0.34, 0.2, 0, 7); g.fill(); g.stroke();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 0.4, -s * 0.38, s * 0.11, 0, 7); g.fill();
          g.fillStyle = '#000'; g.beginPath(); g.arc(s * 0.4, -s * 0.38, s * 0.055, 0, 7); g.fill();
          g.fillStyle = accent; for (let i = 0; i < 4; i++) { const xx = -s * 0.3 + i * s * 0.16; g.beginPath(); g.moveTo(xx, -s * 0.38); g.lineTo(xx + s * 0.07, -s * 0.6); g.lineTo(xx + s * 0.14, -s * 0.38); g.closePath(); g.fill(); } break;
        }
        case 'shark': {
          g.fillStyle = grad(0, 0, s * 0.7, s * 0.5, light, body); g.beginPath(); g.moveTo(-s * 0.65, s * 0.0); g.quadraticCurveTo(-s * 0.5, -s * 0.35, 0, -s * 0.4); g.quadraticCurveTo(s * 0.5, -s * 0.35, s * 0.65, s * 0.0); g.quadraticCurveTo(s * 0.5, s * 0.35, 0, s * 0.4); g.quadraticCurveTo(-s * 0.5, s * 0.35, -s * 0.65, s * 0.0); g.closePath(); g.fill(); g.strokeStyle = dark; g.lineWidth = 1.5; g.stroke();
          g.fillStyle = shade(body, -25); g.beginPath(); g.moveTo(-s * 0.1, -s * 0.2); g.quadraticCurveTo(s * 0.05, -s * 0.65, s * 0.15, -s * 0.65); g.quadraticCurveTo(s * 0.25, -s * 0.5, s * 0.32, -s * 0.2); g.closePath(); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(-s * 0.27, -s * 0.07, s * 0.1, 0, 7); g.fill();
          g.fillStyle = '#000'; g.beginPath(); g.arc(-s * 0.27, -s * 0.07, s * 0.05, 0, 7); g.fill(); break;
        }
        default: {
          const key = shape.toLowerCase();
          const isEvil   = /evil|skeleton|shadow|abyss|chaos|void|dark|shard|end|chaosgod/.test(key);
          const isWinged = /phoenix|butterfly|mermaid|dragon|goddess|angel|pterodactyl|sakura|cosmic|moon|griffin|unicorn/.test(key);
          const isHorned = /cow|deer|unicorn|triceratops|ankylo|trex|thunder|beast/.test(key);
          const isRound  = /frog|kraken|turtle|eye|chaos|ankylo/.test(key);
          const isLong   = /lizard|gecko|centipede|brontosaurus|mosasaur|worm/.test(key);
          const isBoss   = /king|creator|goddess|voidbeast|colossus|titanbaby|shadow|abyss|chaos|god/.test(key);
          const r = s * (isBoss ? 1.25 : 1);
          const b2 = isEvil ? shade(body, -40) : body; const l2 = isEvil ? shade(light, -30) : light; const d2 = isEvil ? shade(dark, -20) : dark; const be2 = isEvil ? shade(belly, -30) : belly;
          if (isWinged) { g.fillStyle = hexA(accent, 0.75); g.beginPath(); g.moveTo(-r * 0.2, -r * 0.1); g.quadraticCurveTo(-r * 1.3, -r * 0.9, -r * 1.15, -r * 0.05); g.quadraticCurveTo(-r * 1.0, r * 0.1, -r * 0.25, r * 0.2); g.closePath(); g.fill(); g.beginPath(); g.moveTo(r * 0.2, -r * 0.1); g.quadraticCurveTo(r * 1.3, -r * 0.9, r * 1.15, -r * 0.05); g.quadraticCurveTo(r * 1.0, r * 0.1, r * 0.25, r * 0.2); g.closePath(); g.fill(); }
          if (!isRound) { g.fillStyle = b2; g.beginPath(); if (isLong) { g.moveTo(-r * 0.4, r * 0.3); g.quadraticCurveTo(-r * 1.5, r * 0.5, -r * 1.1, r * 0.8); g.quadraticCurveTo(-r * 0.9, r * 0.5, -r * 0.3, r * 0.5); } else { g.moveTo(-r * 0.4, r * 0.2); g.quadraticCurveTo(-r * 0.9, r * 0.4, -r * 0.7, r * 0.6); g.quadraticCurveTo(-r * 0.4, r * 0.4, -r * 0.2, r * 0.4); } g.closePath(); g.fill(); g.strokeStyle = d2; g.lineWidth = 1.5; g.stroke(); }
          g.fillStyle = grad(0, 0, r * 0.55, r * 0.6, l2, b2); if (isRound) { g.beginPath(); g.ellipse(0, r * 0.15, r * 0.9, r * 0.8, 0, 0, 7); g.fill(); } else if (isLong) { g.beginPath(); g.ellipse(0, r * 0.2, r * 0.6, r * 0.9, 0, 0, 7); g.fill(); } else { g.beginPath(); g.ellipse(0, r * 0.1, r * 0.65, r * 0.7, 0, 0, 7); g.fill(); }
          g.strokeStyle = d2; g.lineWidth = 1.5; g.stroke();
          g.fillStyle = be2; g.beginPath(); g.ellipse(0, r * 0.3, r * 0.35, r * 0.35, 0, 0, 7); g.fill();
          if (isEvil && !isRound) { g.fillStyle = d2; for (let i = 0; i < 3; i++) { const xx = -r * 0.3 + i * r * 0.3; g.beginPath(); g.moveTo(xx - r * 0.08, r * 0.05); g.lineTo(xx, -r * 0.2); g.lineTo(xx + r * 0.08, r * 0.05); g.closePath(); g.fill(); } }
          if (isHorned) { g.fillStyle = d2; g.beginPath(); g.moveTo(-r * 0.35, -r * 0.5); g.lineTo(-r * 0.55, -r * 1.15); g.lineTo(-r * 0.15, -r * 0.55); g.closePath(); g.fill(); g.beginPath(); g.moveTo(r * 0.35, -r * 0.5); g.lineTo(r * 0.55, -r * 1.15); g.lineTo(r * 0.15, -r * 0.55); g.closePath(); g.fill(); }
          g.fillStyle = grad(0, -r * 0.6, r * 0.4, r * 0.5, l2, b2); g.beginPath(); if (isRound) g.arc(0, -r * 0.3, r * 0.6, 0, 7); else g.arc(0, -r * 0.45, r * 0.55, 0, 7); g.fill(); g.strokeStyle = d2; g.lineWidth = 1.5; g.stroke();
          const eyeY = isRound ? -r * 0.3 : -r * 0.45;
          if (isEvil) { g.fillStyle = '#ff2020'; g.beginPath(); g.arc(-r * 0.22, eyeY, r * 0.12, 0, 7); g.fill(); g.beginPath(); g.arc(r * 0.22, eyeY, r * 0.12, 0, 7); g.fill(); g.fillStyle = '#ffee00'; g.beginPath(); g.arc(-r * 0.22, eyeY, r * 0.06, 0, 7); g.fill(); g.beginPath(); g.arc(r * 0.22, eyeY, r * 0.06, 0, 7); g.fill(); }
          else { g.fillStyle = '#fff'; g.beginPath(); g.arc(-r * 0.22, eyeY, r * 0.14, 0, 7); g.fill(); g.beginPath(); g.arc(r * 0.22, eyeY, r * 0.14, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(-r * 0.22, eyeY, r * 0.07, 0, 7); g.fill(); g.beginPath(); g.arc(r * 0.22, eyeY, r * 0.07, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-r * 0.24, eyeY - r * 0.03, r * 0.03, 0, 7); g.fill(); g.beginPath(); g.arc(r * 0.2, eyeY - r * 0.03, r * 0.03, 0, 7); g.fill(); }
          g.strokeStyle = isEvil ? '#3a0a0a' : d2; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-r * 0.1, eyeY + r * 0.3); g.quadraticCurveTo(0, eyeY + r * 0.4, r * 0.1, eyeY + r * 0.3); g.stroke();
          if (isBoss) { g.fillStyle = accent; g.beginPath(); g.moveTo(-r * 0.45, -r * 0.75); g.lineTo(-r * 0.45, -r * 1.0); g.lineTo(-r * 0.22, -r * 0.85); g.lineTo(0, -r * 1.1); g.lineTo(r * 0.22, -r * 0.85); g.lineTo(r * 0.45, -r * 1.0); g.lineTo(r * 0.45, -r * 0.75); g.closePath(); g.fill(); g.strokeStyle = d2; g.lineWidth = 1.5; g.stroke(); }
        }
      }
      g.restore();
    }

    /* =========================================================
     *  3. 蛋造型
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
          g.fillStyle = glow; g.beginPath(); g.arc(0, 0, r * (3 + i * 1.5), 0, 7); g.fill();
        }
      } else if (e.rar >= 3 || e.size !== 'normal') {
        const glow = g.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.6);
        glow.addColorStop(0, hexA(rc, 0.6)); glow.addColorStop(1, hexA(rc, 0));
        g.fillStyle = glow; g.beginPath(); g.arc(0, 0, r * 2.6, 0, 7); g.fill();
      }
      g.shadowBlur = 12; g.shadowColor = '#00000066';
      const grad = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.15, 0, 0, r * 1.3);
      if (e.secret) { const hue = (time * 60) % 360; grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, `hsl(${hue},100%,85%)`); grad.addColorStop(1, `hsl(${hue},100%,55%)`); }
      else if (e.size === 'giant') { grad.addColorStop(0, '#e0f0ff'); grad.addColorStop(1, '#4a8ac8'); }
      else if (e.size === 'huge') { grad.addColorStop(0, '#f0f8ff'); grad.addColorStop(1, '#6a9ac8'); }
      else { grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#a0a0a0'); }
      g.beginPath(); g.ellipse(0, 0, r, r * 1.3, 0, 0, 7); g.fillStyle = grad; g.fill();
      g.strokeStyle = hexA(rc, 0.5); g.lineWidth = 1.5; g.stroke();
      g.strokeStyle = hexA(rc, 0.7); g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-r * 0.3, -r * 0.5); g.lineTo(-r * 0.1, 0); g.lineTo(-r * 0.4, r * 0.4); g.stroke();
      if (e.secret) { g.beginPath(); g.moveTo(r * 0.2, -r * 0.4); g.lineTo(r * 0.4, 0); g.lineTo(r * 0.1, r * 0.5); g.stroke(); }
      g.shadowBlur = 0; g.globalAlpha = 0.6; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.45, r * 0.25, r * 0.35, -0.4, 0, 7); g.fill(); g.globalAlpha = 1;
      if (e.secret) { g.font = 'bold 16px "Segoe UI"'; g.fillStyle = '#fff'; g.shadowBlur = 18; g.shadowColor = '#ff88ff'; g.textAlign = 'center'; g.fillText('★', 0, -r * 1.8); g.font = 'bold 9px "Segoe UI"'; g.fillStyle = '#ffddff'; g.fillText('SECRET', 0, -r * 1.2); }
      else if (e.rar >= 4) { g.font = 'bold 14px "Segoe UI"'; g.fillStyle = rc; g.shadowBlur = 14; g.shadowColor = rc; g.textAlign = 'center'; g.fillText('★', 0, -r * 1.6); }
      g.restore();
    }

    /* =========================================================
     *  4. 火柴人角色
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
      g.fillStyle = '#ffe0c0'; g.beginPath(); g.arc(0, -14 * scale, headR, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#1a1a2a'; g.beginPath(); g.arc(-2 * scale, -15 * scale, 1 * scale, 0, 7); g.fill(); g.beginPath(); g.arc(2 * scale, -15 * scale, 1 * scale, 0, 7); g.fill();
      g.beginPath(); g.moveTo(0, -8 * scale); g.lineTo(0, hipY); g.stroke();
      if (swingPhase !== undefined && swingPhase > 0) {
        const swingAngle = Math.PI * 0.5 - Math.sin(swingPhase * Math.PI) * Math.PI * 0.7;
        const ax = Math.cos(swingAngle) * armSpread * 1.5;
        const ay = Math.sin(swingAngle) * armSpread * 1.5;
        g.beginPath(); g.moveTo(0, armY); g.lineTo(ax, armY + ay); g.stroke();
        g.beginPath(); g.moveTo(0, armY); g.lineTo(-armSpread * 0.6 + armSwing, armY + armSpread * 0.5); g.stroke();
      } else {
        g.beginPath(); g.moveTo(0, armY); g.lineTo(-armSpread + armSwing, armY + armSpread * 0.5); g.stroke();
        g.beginPath(); g.moveTo(0, armY); g.lineTo(armSpread + armSwing, armY + armSpread * 0.5); g.stroke();
      }
      g.beginPath(); g.moveTo(0, hipY); g.lineTo(-legSpread + legSwing, hipY + 8 * scale); g.stroke();
      g.beginPath(); g.moveTo(0, hipY); g.lineTo(legSpread - legSwing, hipY + 8 * scale); g.stroke();
      g.restore();
    }

    /* =========================================================
     *  5. 註冊到主遊戲
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
