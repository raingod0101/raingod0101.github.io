/* sprites.js — 所有角色/寵物/蛋/守衛/軌跡繪製
 * 對外：window.raingodSprites = { ...所有繪製函式與資料 }
 */
(function () {
  const BIOME_PALETTES = [
    {body:'#7ac85a',belly:'#c8f0a0',eye:'#2a4a1a',accent:'#e8b820',dark:'#4a8a2a',light:'#b0f080'},
    {body:'#e87a4a',belly:'#ffb080',eye:'#5a1a0a',accent:'#ff3a20',dark:'#a83a1a',light:'#ffa070'},
    {body:'#5a9ad8',belly:'#a0d0ff',eye:'#0a2a5a',accent:'#20c0ff',dark:'#2a5a9a',light:'#80c0ff'},
    {body:'#c8b86a',belly:'#e8dca0',eye:'#4a3a0a',accent:'#ff9a20',dark:'#8a7a2a',light:'#e8d880'},
    {body:'#a0d8f0',belly:'#e0f4ff',eye:'#1a4a6a',accent:'#80e0ff',dark:'#5a8ab0',light:'#e0f8ff'},
    {body:'#a07ae8',belly:'#d0b0ff',eye:'#3a1a6a',accent:'#c040ff',dark:'#6a3aaa',light:'#c0a0ff'},
    {body:'#f0a0d0',belly:'#ffd0e8',eye:'#6a2a4a',accent:'#ff60b0',dark:'#c86a9a',light:'#ffc0e0'},
    {body:'#c0c0d0',belly:'#e8e8f0',eye:'#3a3a4a',accent:'#ffe040',dark:'#8a8a9a',light:'#e0e0f0'},
    {body:'#f0d080',belly:'#fff0c0',eye:'#6a4a00',accent:'#ffe040',dark:'#aa8820',light:'#ffe8b0'},
    {body:'#3a3a5a',belly:'#6a6a8a',eye:'#1a1a3a',accent:'#8040ff',dark:'#1a1a3a',light:'#5a5a7a'},
    {body:'#7a3a9a',belly:'#b070d0',eye:'#3a0a4a',accent:'#c040ff',dark:'#4a1a6a',light:'#a060c0'},
    {body:'#7a5aa0',belly:'#b090d0',eye:'#2a0a4a',accent:'#d040ff',dark:'#4a2a70',light:'#a080d0'},
  ];
  const PET_SHAPES = [
    ['chicken','dog','bird','owl','raccoon','fox','guardian_0','crystal'],
    ['lizard','frog','cow','iguana','chili','hound','guardian_1','dragon'],
    ['parrotfish','swordfish','shark','orca','whaleshark','beluga','guardian_2','mermaid'],
    ['dodo','pterodactyl','ankylo','triceratops','brontosaurus','trex','guardian_3','mosasaur'],
    ['rabbit','penguin','owl','fox','deer','dragon','guardian_4','bear'],
    ['centipede','gecko','gorilla','crystal','skeleton','cosmicdragon','guardian_5','unicorn'],
    ['petal','mouse','butterfly','flower','deer','sakuradragon','guardian_6','goddess'],
    ['titanbaby','colossus','statue','thunder','earth','sky','guardian_7','king'],
    ['angel','unicorn','griffin','phoenix','thunder','king','guardian_8','creator'],
    ['shard','shadow','eye','chaos','abyss','voidbeast','guardian_9','chaosgod'],
    ['shard','shadow','eye','chaos','abyss','voidbeast','guardian_10','creator'],
    ['shard','shadow','eye','chaos','abyss','voidbeast','guardian_11','creator'],
  ];

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const clamp = (v) => Math.max(0, Math.min(255, v));
    let r = clamp((n>>16)+amt), g = clamp(((n>>8)&0xff)+amt), b = clamp((n&0xff)+amt);
    return '#' + ((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`;
  }

  /* ===== 寵物 ===== */
  function drawPetShape(g, shape, pal, s, time, rc) {
    if (shape.startsWith('guardian_')) {
      const gIdx = parseInt(shape.split('_')[1]);
      const anim = GUARD_ANIMALS[gIdx] || GUARD_ANIMALS[0];
      anim.draw(g, s, time, false);
      return;
    }
    const body=pal.body,belly=pal.belly,accent=pal.accent,dark=pal.dark,light=pal.light;
    const bob=Math.sin(time*3)*2;
    g.save(); g.translate(0,bob);
    function grad(cx,cy,r1,r2,c1,c2){ const gr=g.createRadialGradient(cx-r1*0.4,cy-r1*0.4,r1*0.1,cx,cy,r2); gr.addColorStop(0,c1);gr.addColorStop(1,c2);return gr; }
    switch(shape){
      case 'chicken':{
        g.fillStyle=grad(0,0,s*0.7,s*0.9,light,body);g.beginPath();g.moveTo(-s*0.7,s*0.1);g.quadraticCurveTo(-s*0.8,-s*0.5,-s*0.3,-s*0.7);g.quadraticCurveTo(0,-s*0.9,s*0.3,-s*0.7);g.quadraticCurveTo(s*0.8,-s*0.5,s*0.7,s*0.1);g.quadraticCurveTo(s*0.6,s*0.8,0,s*0.85);g.quadraticCurveTo(-s*0.6,s*0.8,-s*0.7,s*0.1);g.closePath();g.fill();g.strokeStyle=dark;g.lineWidth=1.5;g.stroke();
        g.fillStyle=grad(0,s*0.3,s*0.3,s*0.5,belly,shade(belly,-40));g.beginPath();g.ellipse(0,s*0.25,s*0.42,s*0.4,0,0,7);g.fill();
        g.fillStyle=grad(0,-s*0.5,s*0.3,s*0.5,light,body);g.beginPath();g.arc(0,-s*0.5,s*0.48,0,7);g.fill();g.stroke();
        g.fillStyle='#ff4040';for(let i=-1;i<=1;i++){g.beginPath();g.moveTo(i*s*0.1,-s*0.85);g.quadraticCurveTo(i*s*0.2,-s*1.15,i*s*0.3,-s*0.85);g.closePath();g.fill();}
        g.fillStyle='#ffb020';g.beginPath();g.moveTo(-s*0.18,-s*0.44);g.lineTo(s*0.18,-s*0.44);g.lineTo(0,-s*0.14);g.closePath();g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(-s*0.22,-s*0.58,s*0.14,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.58,s*0.14,0,7);g.fill();
        g.fillStyle='#000';g.beginPath();g.arc(-s*0.22,-s*0.58,s*0.07,0,7);g.fill();g.beginPath();g.arc(s*0.22,-s*0.58,s*0.07,0,7);g.fill(); break;
      }
      case 'dog':{
        g.fillStyle=grad(0,s*0.1,s*0.6,s*0.65,light,body);g.beginPath();g.moveTo(-s*0.6,s*0.0);g.quadraticCurveTo(-s*0.7,s*0.5,-s*0.2,s*0.65);g.quadraticCurveTo(0,s*0.7,s*0.2,s*0.65);g.quadraticCurveTo(s*0.7,s*0.5,s*0.6,s*0.0);g.quadraticCurveTo(s*0.5,-s*0.3,0,-s*0.3);g.quadraticCurveTo(-s*0.5,-s*0.3,-s*0.6,s*0.0);g.closePath();g.fill();g.strokeStyle=dark;g.lineWidth=1.5;g.stroke();
        g.fillStyle=grad(0,-s*0.4,s*0.35,s*0.48,light,body);g.beginPath();g.arc(0,-s*0.35,s*0.45,0,7);g.fill();g.stroke();
        g.fillStyle=dark;g.beginPath();g.moveTo(-s*0.42,-s*0.7);g.lineTo(-s*0.55,-s*1.05);g.lineTo(-s*0.25,-s*0.82);g.closePath();g.fill();g.beginPath();g.moveTo(s*0.42,-s*0.7);g.lineTo(s*0.55,-s*1.05);g.lineTo(s*0.25,-s*0.82);g.closePath();g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(-s*0.2,-s*0.44,s*0.12,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.44,s*0.12,0,7);g.fill();
        g.fillStyle='#000';g.beginPath();g.arc(-s*0.2,-s*0.44,s*0.06,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.44,s*0.06,0,7);g.fill();
        g.fillStyle='#ff6a8a';g.beginPath();g.ellipse(0,-s*0.12,s*0.08,s*0.12,0,0,7);g.fill(); break;
      }
      case 'bird':{
        g.fillStyle=grad(0,0,s*0.6,s*0.8,light,body);g.beginPath();g.moveTo(-s*0.55,s*0.0);g.quadraticCurveTo(-s*0.6,-s*0.6,-s*0.2,-s*0.75);g.quadraticCurveTo(0,-s*0.85,s*0.2,-s*0.75);g.quadraticCurveTo(s*0.6,-s*0.6,s*0.55,s*0.0);g.quadraticCurveTo(s*0.5,s*0.7,0,s*0.75);g.quadraticCurveTo(-s*0.5,s*0.7,-s*0.55,s*0.0);g.closePath();g.fill();g.strokeStyle=dark;g.lineWidth=1.5;g.stroke();
        g.fillStyle=grad(0,-s*0.45,s*0.3,s*0.42,light,body);g.beginPath();g.arc(0,-s*0.46,s*0.42,0,7);g.fill();g.stroke();
        g.fillStyle='#ffb020';g.beginPath();g.moveTo(-s*0.14,-s*0.4);g.lineTo(s*0.14,-s*0.4);g.lineTo(0,-s*0.1);g.closePath();g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(-s*0.18,-s*0.58,s*0.12,0,7);g.fill();g.beginPath();g.arc(s*0.18,-s*0.58,s*0.12,0,7);g.fill();
        g.fillStyle='#000';g.beginPath();g.arc(-s*0.18,-s*0.58,s*0.06,0,7);g.fill();g.beginPath();g.arc(s*0.18,-s*0.58,s*0.06,0,7);g.fill(); break;
      }
      case 'fox':{
        g.fillStyle=grad(0,s*0.15,s*0.6,s*0.55,light,body);g.beginPath();g.moveTo(-s*0.6,s*0.05);g.quadraticCurveTo(-s*0.65,s*0.55,-s*0.2,s*0.65);g.quadraticCurveTo(0,s*0.7,s*0.2,s*0.65);g.quadraticCurveTo(s*0.65,s*0.55,s*0.6,s*0.05);g.quadraticCurveTo(s*0.5,-s*0.25,0,-s*0.25);g.quadraticCurveTo(-s*0.5,-s*0.25,-s*0.6,s*0.05);g.closePath();g.fill();g.strokeStyle=dark;g.lineWidth=1.5;g.stroke();
        g.fillStyle=grad(0,-s*0.3,s*0.35,s*0.45,light,body);g.beginPath();g.arc(0,-s*0.3,s*0.45,0,7);g.fill();g.stroke();
        g.fillStyle=shade(body,-25);g.beginPath();g.moveTo(-s*0.38,-s*0.55);g.lineTo(-s*0.18,-s*1.0);g.lineTo(-s*0.04,-s*0.55);g.closePath();g.fill();g.beginPath();g.moveTo(s*0.38,-s*0.55);g.lineTo(s*0.18,-s*1.0);g.lineTo(s*0.04,-s*0.55);g.closePath();g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(-s*0.2,-s*0.44,s*0.11,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.44,s*0.11,0,7);g.fill();
        g.fillStyle='#000';g.beginPath();g.arc(-s*0.2,-s*0.44,s*0.055,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.44,s*0.055,0,7);g.fill(); break;
      }
      case 'bear':{
        g.fillStyle=grad(0,s*0.1,s*0.65,s*0.65,light,body);g.beginPath();g.moveTo(-s*0.65,s*0.05);g.quadraticCurveTo(-s*0.7,s*0.55,-s*0.2,s*0.68);g.quadraticCurveTo(0,s*0.72,s*0.2,s*0.68);g.quadraticCurveTo(s*0.7,s*0.55,s*0.65,s*0.05);g.quadraticCurveTo(s*0.55,-s*0.3,0,-s*0.3);g.quadraticCurveTo(-s*0.55,-s*0.3,-s*0.65,s*0.05);g.closePath();g.fill();g.strokeStyle=dark;g.lineWidth=1.5;g.stroke();
        g.fillStyle=grad(0,-s*0.35,s*0.35,s*0.48,light,body);g.beginPath();g.arc(0,-s*0.35,s*0.46,0,7);g.fill();g.stroke();
        g.fillStyle=shade(body,-25);g.beginPath();g.arc(-s*0.36,-s*0.74,s*0.18,0,7);g.fill();g.beginPath();g.arc(s*0.36,-s*0.74,s*0.18,0,7);g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(-s*0.2,-s*0.44,s*0.11,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.44,s*0.11,0,7);g.fill();
        g.fillStyle='#000';g.beginPath();g.arc(-s*0.2,-s*0.44,s*0.055,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.44,s*0.055,0,7);g.fill(); break;
      }
      case 'hound':{
        g.fillStyle=grad(0,s*0.1,s*0.6,s*0.55,light,body);g.beginPath();g.moveTo(-s*0.6,s*0.05);g.quadraticCurveTo(-s*0.65,s*0.55,-s*0.2,s*0.65);g.quadraticCurveTo(0,s*0.7,s*0.2,s*0.65);g.quadraticCurveTo(s*0.65,s*0.55,s*0.6,s*0.05);g.quadraticCurveTo(s*0.5,-s*0.25,0,-s*0.25);g.quadraticCurveTo(-s*0.5,-s*0.25,-s*0.6,s*0.05);g.closePath();g.fill();g.strokeStyle=dark;g.lineWidth=1.5;g.stroke();
        g.fillStyle=grad(0,-s*0.35,s*0.35,s*0.45,light,body);g.beginPath();g.arc(0,-s*0.35,s*0.45,0,7);g.fill();g.stroke();
        g.fillStyle='#ff2020';g.beginPath();g.arc(-s*0.2,-s*0.44,s*0.12,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.44,s*0.12,0,7);g.fill();
        g.fillStyle='#ffee00';g.beginPath();g.arc(-s*0.2,-s*0.44,s*0.055,0,7);g.fill();g.beginPath();g.arc(s*0.2,-s*0.44,s*0.055,0,7);g.fill(); break;
      }
      case 'dragon':{
        g.fillStyle=accent;g.beginPath();g.moveTo(-s*0.2,s*0.0);g.lineTo(-s*0.8,-s*0.6);g.lineTo(-s*0.6,-s*0.3);g.lineTo(-s*0.9,-s*0.2);g.lineTo(-s*0.55,-s*0.1);g.lineTo(-s*0.75,s*0.15);g.lineTo(-s*0.3,s*0.15);g.closePath();g.fill();
        g.fillStyle=grad(0,s*0.1,s*0.6,s*0.55,light,body);g.beginPath();g.moveTo(-s*0.6,s*0.05);g.quadraticCurveTo(-s*0.65,s*0.55,-s*0.2,s*0.65);g.quadraticCurveTo(0,s*0.7,s*0.2,s*0.65);g.quadraticCurveTo(s*0.65,s*0.55,s*0.6,s*0.05);g.quadraticCurveTo(s*0.5,-s*0.25,0,-s*0.25);g.quadraticCurveTo(-s*0.5,-s*0.25,-s*0.6,s*0.05);g.closePath();g.fill();g.strokeStyle=dark;g.lineWidth=1.5;g.stroke();
        g.fillStyle=grad(s*0.3,-s*0.3,s*0.25,s*0.35,light,body);g.beginPath();g.ellipse(s*0.3,-s*0.3,s*0.38,s*0.34,0.2,0,7);g.fill();g.stroke();
        g.fillStyle='#fff';g.beginPath();g.arc(s*0.4,-s*0.38,s*0.11,0,7);g.fill();
        g.fillStyle='#000';g.beginPath();g.arc(s*0.4,-s*0.38,s*0.055,0,7);g.fill();
        g.fillStyle=accent;for(let i=0;i<4;i++){const xx=-s*0.3+i*s*0.16;g.beginPath();g.moveTo(xx,-s*0.38);g.lineTo(xx+s*0.07,-s*0.6);g.lineTo(xx+s*0.14,-s*0.38);g.closePath();g.fill();} break;
      }
      case 'shark':{
        g.fillStyle=grad(0,0,s*0.7,s*0.5,light,body);g.beginPath();g.moveTo(-s*0.65,s*0.0);g.quadraticCurveTo(-s*0.5,-s*0.35,0,-s*0.4);g.quadraticCurveTo(s*0.5,-s*0.35,s*0.65,s*0.0);g.quadraticCurveTo(s*0.5,s*0.35,0,s*0.4);g.quadraticCurveTo(-s*0.5,s*0.35,-s*0.65,s*0.0);g.closePath();g.fill();g.strokeStyle=dark;g.lineWidth=1.5;g.stroke();
        g.fillStyle=shade(body,-25);g.beginPath();g.moveTo(-s*0.1,-s*0.2);g.quadraticCurveTo(s*0.05,-s*0.65,s*0.15,-s*0.65);g.quadraticCurveTo(s*0.25,-s*0.5,s*0.32,-s*0.2);g.closePath();g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(-s*0.27,-s*0.07,s*0.1,0,7);g.fill();
        g.fillStyle='#000';g.beginPath();g.arc(-s*0.27,-s*0.07,s*0.05,0,7);g.fill(); break;
      }
      default:{
        const key = shape.toLowerCase();
        const isEvil   = /evil|skeleton|shadow|abyss|chaos|void|dark|shard|end|chaosgod/.test(key);
        const isWinged = /phoenix|butterfly|mermaid|dragon|goddess|angel|pterodactyl|sakura|cosmic|moon|griffin|unicorn/.test(key);
        const isHorned = /cow|deer|unicorn|triceratops|ankylo|trex|thunder|beast/.test(key);
        const isRound  = /frog|kraken|turtle|eye|chaos|ankylo/.test(key);
        const isLong   = /lizard|gecko|centipede|brontosaurus|mosasaur|worm/.test(key);
        const isBoss   = /king|creator|goddess|voidbeast|colossus|titanbaby|shadow|abyss|chaos|god/.test(key);
        const r = s * (isBoss ? 1.25 : 1);
        const b2 = isEvil ? shade(body,-40) : body; const l2 = isEvil ? shade(light,-30) : light; const d2 = isEvil ? shade(dark,-20) : dark; const be2 = isEvil ? shade(belly,-30) : belly;
        if(isWinged){ g.fillStyle = hexA(accent, 0.75); g.beginPath(); g.moveTo(-r*0.2, -r*0.1); g.quadraticCurveTo(-r*1.3, -r*0.9, -r*1.15, -r*0.05); g.quadraticCurveTo(-r*1.0, r*0.1, -r*0.25, r*0.2); g.closePath(); g.fill(); g.beginPath(); g.moveTo(r*0.2, -r*0.1); g.quadraticCurveTo(r*1.3, -r*0.9, r*1.15, -r*0.05); g.quadraticCurveTo(r*1.0, r*0.1, r*0.25, r*0.2); g.closePath(); g.fill(); }
        if(!isRound){ g.fillStyle = b2; g.beginPath(); if(isLong){ g.moveTo(-r*0.4, r*0.3); g.quadraticCurveTo(-r*1.5, r*0.5, -r*1.1, r*0.8); g.quadraticCurveTo(-r*0.9, r*0.5, -r*0.3, r*0.5); } else { g.moveTo(-r*0.4, r*0.2); g.quadraticCurveTo(-r*0.9, r*0.4, -r*0.7, r*0.6); g.quadraticCurveTo(-r*0.4, r*0.4, -r*0.2, r*0.4); } g.closePath(); g.fill(); g.strokeStyle = d2; g.lineWidth = 1.5; g.stroke(); }
        g.fillStyle = grad(0, 0, r*0.55, r*0.6, l2, b2); if(isRound){ g.beginPath(); g.ellipse(0, r*0.15, r*0.9, r*0.8, 0, 0, 7); g.fill(); } else if(isLong){ g.beginPath(); g.ellipse(0, r*0.2, r*0.6, r*0.9, 0, 0, 7); g.fill(); } else { g.beginPath(); g.ellipse(0, r*0.1, r*0.65, r*0.7, 0, 0, 7); g.fill(); }
        g.strokeStyle = d2; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = be2; g.beginPath(); g.ellipse(0, r*0.3, r*0.35, r*0.35, 0, 0, 7); g.fill();
        if(isEvil && !isRound){ g.fillStyle = d2; for(let i=0;i<3;i++){ const xx = -r*0.3 + i*r*0.3; g.beginPath(); g.moveTo(xx - r*0.08, r*0.05); g.lineTo(xx, -r*0.2); g.lineTo(xx + r*0.08, r*0.05); g.closePath(); g.fill(); } }
        if(isHorned){ g.fillStyle = d2; g.beginPath(); g.moveTo(-r*0.35, -r*0.5); g.lineTo(-r*0.55, -r*1.15); g.lineTo(-r*0.15, -r*0.55); g.closePath(); g.fill(); g.beginPath(); g.moveTo(r*0.35, -r*0.5); g.lineTo(r*0.55, -r*1.15); g.lineTo(r*0.15, -r*0.55); g.closePath(); g.fill(); }
        g.fillStyle = grad(0, -r*0.6, r*0.4, r*0.5, l2, b2); g.beginPath(); if(isRound) g.arc(0, -r*0.3, r*0.6, 0, 7); else g.arc(0, -r*0.45, r*0.55, 0, 7); g.fill(); g.strokeStyle = d2; g.lineWidth = 1.5; g.stroke();
        const eyeY = isRound ? -r*0.3 : -r*0.45;
        if(isEvil){ g.fillStyle = '#ff2020'; g.beginPath(); g.arc(-r*0.22, eyeY, r*0.12, 0, 7); g.fill(); g.beginPath(); g.arc(r*0.22, eyeY, r*0.12, 0, 7); g.fill(); g.fillStyle = '#ffee00'; g.beginPath(); g.arc(-r*0.22, eyeY, r*0.06, 0, 7); g.fill(); g.beginPath(); g.arc(r*0.22, eyeY, r*0.06, 0, 7); g.fill(); }
        else { g.fillStyle = '#fff'; g.beginPath(); g.arc(-r*0.22, eyeY, r*0.14, 0, 7); g.fill(); g.beginPath(); g.arc(r*0.22, eyeY, r*0.14, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(-r*0.22, eyeY, r*0.07, 0, 7); g.fill(); g.beginPath(); g.arc(r*0.22, eyeY, r*0.07, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-r*0.24, eyeY - r*0.03, r*0.03, 0, 7); g.fill(); g.beginPath(); g.arc(r*0.2, eyeY - r*0.03, r*0.03, 0, 7); g.fill(); }
        g.strokeStyle = isEvil ? '#3a0a0a' : d2; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-r*0.1, eyeY + r*0.3); g.quadraticCurveTo(0, eyeY + r*0.4, r*0.1, eyeY + r*0.3); g.stroke();
        if(isBoss){ g.fillStyle = accent; g.beginPath(); g.moveTo(-r*0.45, -r*0.75); g.lineTo(-r*0.45, -r*1.0); g.lineTo(-r*0.22, -r*0.85); g.lineTo(0, -r*1.1); g.lineTo(r*0.22, -r*0.85); g.lineTo(r*0.45, -r*1.0); g.lineTo(r*0.45, -r*0.75); g.closePath(); g.fill(); g.strokeStyle = d2; g.lineWidth = 1.5; g.stroke(); }
      }
    }
    g.restore();
  }

  /* ===== 守衛（含 12 種） ===== */
  const GUARD_ANIMALS=[
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

  /* ===== 蛋 ===== */
  function drawEggShape(g, e, s, time, rc) {
    const bob = Math.sin(time * 2 + (e.float || 0)) * 3;
    g.save(); g.translate(0, bob); const r = s;
    if (e.secret) {
      const pulse = Math.sin(time*4)*0.5+0.5; const hue = (time*60)%360;
      for (let i=0;i<4;i++){ const glow = g.createRadialGradient(0,0,r*0.5,0,0,r*(3+i*1.5)); glow.addColorStop(0,`hsla(${hue+i*50},100%,70%,${0.5*pulse})`); glow.addColorStop(1,`hsla(${hue+i*50},100%,70%,0)`); g.fillStyle=glow; g.beginPath(); g.arc(0,0,r*(3+i*1.5),0,7); g.fill(); }
    } else if (e.rar >= 3 || e.size !== 'normal') {
      const glow = g.createRadialGradient(0,0,r*0.5,0,0,r*2.6); glow.addColorStop(0, hexA(rc,0.6)); glow.addColorStop(1, hexA(rc,0)); g.fillStyle=glow; g.beginPath(); g.arc(0,0,r*2.6,0,7); g.fill();
    }
    g.shadowBlur = 12; g.shadowColor = '#00000066';
    const grad = g.createRadialGradient(-r*0.3,-r*0.4,r*0.15,0,0,r*1.3);
    if (e.secret) { const hue=(time*60)%360; grad.addColorStop(0,'#ffffff'); grad.addColorStop(0.5,`hsl(${hue},100%,85%)`); grad.addColorStop(1,`hsl(${hue},100%,55%)`); }
    else if (e.size==='giant') { grad.addColorStop(0,'#e0f0ff'); grad.addColorStop(1,'#4a8ac8'); }
    else if (e.size==='huge') { grad.addColorStop(0,'#f0f8ff'); grad.addColorStop(1,'#6a9ac8'); }
    else { grad.addColorStop(0,'#ffffff'); grad.addColorStop(1,'#a0a0a0'); }
    g.beginPath(); g.ellipse(0,0,r,r*1.3,0,0,7); g.fillStyle=grad; g.fill();
    g.strokeStyle=hexA(rc,0.5); g.lineWidth=1.5; g.stroke();
    g.strokeStyle=hexA(rc,0.7); g.lineWidth=1.5;
    g.beginPath(); g.moveTo(-r*0.3,-r*0.5); g.lineTo(-r*0.1,0); g.lineTo(-r*0.4,r*0.4); g.stroke();
    if (e.secret) { g.beginPath(); g.moveTo(r*0.2,-r*0.4); g.lineTo(r*0.4,0); g.lineTo(r*0.1,r*0.5); g.stroke(); }
    g.shadowBlur=0; g.globalAlpha=0.6; g.fillStyle='#fff'; g.beginPath(); g.ellipse(-r*0.35,-r*0.45,r*0.25,r*0.35,-0.4,0,7); g.fill(); g.globalAlpha=1;
    if (e.secret) { g.font='bold 16px "Segoe UI"'; g.fillStyle='#fff'; g.shadowBlur=18; g.shadowColor='#ff88ff'; g.textAlign='center'; g.fillText('★',0,-r*1.8); g.font='bold 9px "Segoe UI"'; g.fillStyle='#ffddff'; g.fillText('SECRET',0,-r*1.2); }
    else if (e.rar >= 4) { g.font='bold 14px "Segoe UI"'; g.fillStyle=rc; g.shadowBlur=14; g.shadowColor=rc; g.textAlign='center'; g.fillText('★',0,-r*1.6); }
    g.restore();
  }

  /* ===== 棒子 ===== */
  function drawStickIcon(g, def, s, swingPhase) {
    g.save(); g.rotate(-Math.PI/4 + swingPhase*Math.PI*1.6);
    const bi = def.biomeIdx; const isGod = def.id === 'god_stick';
    const isLate = bi >= 6, isMid = bi >= 3 && bi < 6, isEarly = bi >= 0 && bi < 3;
    if (isEarly) {
      g.strokeStyle='#8a5a2a'; g.lineWidth=s*0.22; g.lineCap='round'; g.beginPath(); g.moveTo(0,s*0.9); g.lineTo(0,-s*0.9); g.stroke();
      g.strokeStyle='#6a3a1a'; g.lineWidth=s*0.05; g.beginPath(); g.moveTo(-s*0.05,s*0.6); g.lineTo(-s*0.05,-s*0.4); g.stroke();
    } else if (isMid) {
      g.strokeStyle=def.accent; g.lineWidth=s*0.24; g.lineCap='round'; g.beginPath(); g.moveTo(0,s*0.9); g.lineTo(0,-s*0.9); g.stroke();
      g.strokeStyle='#4a2a0a'; g.lineWidth=s*0.3; g.beginPath(); g.moveTo(0,s*0.6); g.lineTo(0,s*0.95); g.stroke();
      g.strokeStyle=def.color; g.lineWidth=s*0.08; for(let i=0;i<3;i++){g.beginPath();g.moveTo(-s*0.12,-s*0.3+i*s*0.3);g.lineTo(s*0.12,-s*0.3+i*s*0.3);g.stroke();}
    } else if (isLate && !isGod) {
      g.strokeStyle=def.accent; g.lineWidth=s*0.22; g.lineCap='round'; g.beginPath(); g.moveTo(0,s*0.9); g.lineTo(0,-s*0.9); g.stroke();
      g.fillStyle=def.color;
      for(let i=0;i<5;i++){ const y=-s*0.6+i*s*0.3; g.beginPath(); g.moveTo(-s*0.15,y); g.lineTo(-s*0.35,y-s*0.1); g.lineTo(-s*0.15,y-s*0.2); g.closePath(); g.fill(); g.beginPath(); g.moveTo(s*0.15,y); g.lineTo(s*0.35,y-s*0.1); g.lineTo(s*0.15,y-s*0.2); g.closePath(); g.fill(); }
      g.fillStyle=def.color; g.shadowBlur=12; g.shadowColor=def.color; g.beginPath(); g.arc(0,-s*0.9,s*0.2,0,7); g.fill(); g.shadowBlur=0;
    } else {
      const hue = (performance.now()/8)%360;
      g.strokeStyle=`hsl(${hue},100%,65%)`; g.lineWidth=s*0.24; g.lineCap='round';
      g.shadowBlur=16; g.shadowColor=`hsl(${(hue+120)%360},100%,60%)`;
      g.beginPath(); g.moveTo(0,s*0.9); g.lineTo(0,-s*0.9); g.stroke();
      g.fillStyle='#fff';
      for(let i=0;i<4;i++){ const a=performance.now()/400+i*Math.PI/2; g.beginPath(); g.arc(Math.cos(a)*s*0.5,Math.sin(a)*s*0.5-s*0.1,s*0.08,0,7); g.fill(); }
      g.shadowBlur=0;
    }
    g.restore();
  }

  /* ===== 火柴人 ===== */
  function drawStickFigure(g, cx, cy, r, time, facing, walkPhase, swingPhase) {
    const scale = r/15;
    const bodyColor = '#1a1a2a';
    const headR = 5*scale, neckY = cy-8*scale, hipY = cy+6*scale, armY = neckY+4*scale;
    const legSpread = 5*scale, armSpread = 7*scale;
    const bounce = Math.sin(time*8)*1.5*scale;
    const legPhase = walkPhase || time*6;
    const legSwing = Math.sin(legPhase)*4*scale;
    const armSwing = Math.sin(legPhase+Math.PI)*3*scale;
    g.save();
    g.translate(cx, cy+bounce);
    g.scale(facing, 1);
    g.strokeStyle=bodyColor; g.lineWidth=2.5*scale; g.lineCap='round'; g.lineJoin='round';
    g.fillStyle='#ffe0c0'; g.beginPath(); g.arc(0,-14*scale,headR,0,7); g.fill(); g.stroke();
    g.fillStyle='#1a1a2a';
    g.beginPath(); g.arc(-2*scale,-15*scale,1*scale,0,7); g.fill();
    g.beginPath(); g.arc(2*scale,-15*scale,1*scale,0,7); g.fill();
    g.beginPath(); g.moveTo(0,-8*scale); g.lineTo(0,hipY); g.stroke();
    if (swingPhase !== undefined && swingPhase > 0) {
      const swingAngle = Math.PI*0.5 - Math.sin(swingPhase*Math.PI)*Math.PI*0.7;
      const ax = Math.cos(swingAngle)*armSpread*1.5;
      const ay = Math.sin(swingAngle)*armSpread*1.5;
      g.beginPath(); g.moveTo(0,armY); g.lineTo(ax,armY+ay); g.stroke();
      g.beginPath(); g.moveTo(0,armY); g.lineTo(-armSpread*0.6+armSwing,armY+armSpread*0.5); g.stroke();
    } else {
      g.beginPath(); g.moveTo(0,armY); g.lineTo(-armSpread+armSwing,armY+armSpread*0.5); g.stroke();
      g.beginPath(); g.moveTo(0,armY); g.lineTo(armSpread+armSwing,armY+armSpread*0.5); g.stroke();
    }
    g.beginPath(); g.moveTo(0,hipY); g.lineTo(-legSpread+legSwing,hipY+8*scale); g.stroke();
    g.beginPath(); g.moveTo(0,hipY); g.lineTo(legSpread-legSwing,hipY+8*scale); g.stroke();
    g.restore();
  }

  /* ===== 軌跡 ===== */
  function drawTrailOnPlayer(g, player, trailDef, time) {
    if (!trailDef) return;
    const type=trailDef.type, cols=trailDef.colors, t=time;
    const isSimple = trailDef.id==='trail_basic' || trailDef.id==='trail_fire';
    g.save();
    if (!isSimple) {
      const ringR = 24 + Math.sin(t*3)*4;
      const ringGrad = g.createRadialGradient(0,10,ringR*0.2,0,10,ringR*1.8);
      ringGrad.addColorStop(0, hexA(cols[0],0.65));
      ringGrad.addColorStop(0.5, hexA(cols[Math.min(1,cols.length-1)],0.4));
      ringGrad.addColorStop(1, hexA(cols[0],0));
      g.fillStyle=ringGrad; g.beginPath(); g.ellipse(0,10,ringR*1.8,ringR*0.7,0,0,7); g.fill();
      g.strokeStyle=hexA(cols[0],0.8); g.lineWidth=2.5; g.shadowBlur=12; g.shadowColor=cols[0];
      g.beginPath(); g.ellipse(0,10,ringR*1.4,ringR*0.55,0,0,7); g.stroke(); g.shadowBlur=0;
    }
    const N = isSimple ? 8 : 20;
    for (let i=0;i<N;i++){
      const phase=i/N;
      const angle = t*2.2 + i*(Math.PI*2/N);
      const radius = 20 + Math.sin(t*3+i*0.7)*8 + phase*6;
      const x = Math.cos(angle)*radius;
      const y = Math.sin(angle)*radius*0.65 - 10 + Math.sin(t*4+i*1.3)*6;
      const alpha = 0.55 + 0.45*Math.sin(t*5+i*1.7);
      const sz = 5 + Math.sin(t*4+i*1.5)*2.5 + phase*2;
      const col = cols[i%cols.length];
      g.globalAlpha = alpha;
      g.shadowBlur = isSimple ? 0 : 10;
      g.shadowColor = col;
      if (type==='glow') { g.fillStyle=col; g.beginPath(); g.arc(x,y,sz*0.6,0,7); g.fill(); }
      else if (type==='fire') { g.fillStyle=col; g.beginPath(); g.arc(x,y-phase*8,sz*0.8,0,7); g.fill(); }
      else if (type==='star' || type==='galaxy') {
        g.fillStyle=col; g.save(); g.translate(x,y); g.rotate(t*2+i);
        g.beginPath();
        for (let k=0;k<5;k++){ const ang=k*Math.PI*2/5-Math.PI/2; const sx=Math.cos(ang)*sz, sy=Math.sin(ang)*sz; if(k===0)g.moveTo(sx,sy); else g.lineTo(sx,sy); g.lineTo(Math.cos(ang+Math.PI/5)*sz*0.4,Math.sin(ang+Math.PI/5)*sz*0.4); }
        g.closePath(); g.fill(); g.restore();
      }
      else if (type==='rainbow') { g.strokeStyle=col; g.lineWidth=sz*0.7; g.beginPath(); g.arc(0,0,radius,angle-0.35,angle+0.35); g.stroke(); }
      else if (type==='petal') { g.fillStyle=col; g.save(); g.translate(x,y); g.rotate(angle+t); g.beginPath(); g.ellipse(0,0,sz*1.2,sz*0.6,0,0,7); g.fill(); g.restore(); }
      else if (type==='ice') { g.strokeStyle=col; g.lineWidth=sz*0.4; g.save(); g.translate(x,y); g.rotate(angle+t*0.5); g.beginPath(); g.moveTo(-sz,0); g.lineTo(sz,0); g.moveTo(0,-sz); g.lineTo(0,sz); g.stroke(); g.restore(); }
      else if (type==='void') { g.fillStyle=col; g.beginPath(); g.arc(x,y,sz*1.1,0,7); g.fill(); g.strokeStyle='#ff00aa'; g.lineWidth=1.5; g.globalAlpha=alpha*0.6; g.beginPath(); g.arc(x,y,sz*1.6,0,7); g.stroke(); }
      else if (type==='gold') { g.fillStyle=col; g.save(); g.translate(x,y); g.rotate(angle); g.fillRect(-sz,-sz,sz*2,sz*2); g.restore(); }
      else if (type==='origin') { g.fillStyle=col; g.save(); g.translate(x,y); g.rotate(t*3+i); g.beginPath(); g.arc(0,0,sz*0.75,0,7); g.fill(); g.strokeStyle='#fff'; g.lineWidth=1.5; g.globalAlpha=alpha*0.9; g.beginPath(); g.arc(0,0,sz*1.3,0,7); g.stroke(); g.restore(); }
    }
    if (!isSimple) {
      for (let i=0;i<6;i++){
        const lifeT = ((t*1.2 + i*0.35)%1);
        const yy = -20 - lifeT*30;
        const xx = Math.sin(t*4+i*2)*8;
        const alpha = (1-lifeT)*0.7;
        const sz = 4*(1-lifeT*0.5);
        g.globalAlpha=alpha; g.fillStyle=cols[i%cols.length];
        g.shadowBlur=8; g.shadowColor=cols[i%cols.length];
        g.beginPath(); g.arc(xx,yy,sz,0,7); g.fill();
      }
    }
    g.globalAlpha=1; g.shadowBlur=0; g.restore();
  }

  function drawTrailPath(ctx, path, trailDef, time) {
    if (!trailDef || !path || path.length===0) return;
    const type=trailDef.type, cols=trailDef.colors;
    const isSimple = trailDef.id==='trail_basic' || trailDef.id==='trail_fire';
    for (let i=0;i<path.length;i++){
      const pt=path[i]; const progress=i/path.length;
      const sp = WORLD_TO_SCREEN(pt.x, pt.y);
      const alpha = Math.pow(progress,1.5)*0.85;
      const sz = progress*14 + 4;
      ctx.save(); ctx.translate(sp.x, sp.y); ctx.scale(ZOOM(), ZOOM()); ctx.globalAlpha=alpha;
      const col = cols[Math.floor(progress*(cols.length-0.01))];
      ctx.fillStyle = col; ctx.shadowBlur = isSimple ? 0 : 15; ctx.shadowColor = col;
      if (type==='glow') { ctx.beginPath(); ctx.arc(0,0,sz*0.5,0,7); ctx.fill(); }
      else if (type==='fire') { ctx.beginPath(); ctx.arc(0,0,sz*0.7,0,7); ctx.fill(); }
      else if (type==='ice') { ctx.strokeStyle=col; ctx.lineWidth=sz*0.4; ctx.save(); ctx.rotate(time*2+i*0.5); ctx.beginPath(); ctx.moveTo(-sz,0); ctx.lineTo(sz,0); ctx.moveTo(0,-sz); ctx.lineTo(0,sz); ctx.moveTo(-sz*0.6,-sz*0.6); ctx.lineTo(sz*0.6,sz*0.6); ctx.stroke(); ctx.restore(); }
      else if (type==='star' || type==='galaxy') {
        ctx.save(); ctx.rotate(time*3+i);
        ctx.beginPath();
        for (let k=0;k<5;k++){ const ang=k*Math.PI*2/5-Math.PI/2; const sx=Math.cos(ang)*sz, sy=Math.sin(ang)*sz; if(k===0)ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy); ctx.lineTo(Math.cos(ang+Math.PI/5)*sz*0.4,Math.sin(ang+Math.PI/5)*sz*0.4); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      else if (type==='petal') { ctx.save(); ctx.rotate(time+i); ctx.beginPath(); ctx.ellipse(0,0,sz*1.2,sz*0.6,0,0,7); ctx.fill(); ctx.restore(); }
      else if (type==='rainbow') { ctx.beginPath(); ctx.arc(0,0,sz*0.8,0,7); ctx.fill(); }
      else if (type==='void') { ctx.fillStyle=cols[i%cols.length]; ctx.beginPath(); ctx.arc(0,0,sz,0,7); ctx.fill(); ctx.strokeStyle='#ff00aa'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,sz*1.6,0,7); ctx.stroke(); }
      else if (type==='gold') { ctx.save(); ctx.rotate(time+i); ctx.fillRect(-sz*0.7,-sz*0.7,sz*1.4,sz*1.4); ctx.restore(); }
      else if (type==='origin') { ctx.save(); ctx.rotate(time*4+i); ctx.beginPath(); ctx.arc(0,0,sz*0.75,0,7); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,sz*1.3,0,7); ctx.stroke(); ctx.restore(); }
      ctx.restore();
    }
  }

  function drawTrailPreview(g, def, s, time) {
    const type=def.type, cols=def.colors;
    const isSimple = def.id==='trail_basic' || def.id==='trail_fire';
    g.save();
    for (let i=0;i<(isSimple?8:12);i++){
      const t = i/(isSimple?8:12);
      const a = t*Math.PI*2 + time*2;
      const r = s*(0.3 + t*0.7);
      const x = Math.cos(a)*r;
      const y = Math.sin(a)*r;
      const alpha = 1-t*0.7;
      if (type==='glow') { g.fillStyle=cols[0]; g.globalAlpha=alpha*0.7; g.beginPath(); g.arc(x,y,s*0.15*(1-t*0.5),0,7); g.fill(); }
      else if (type==='fire') { g.fillStyle=cols[i%2]; g.globalAlpha=alpha; g.beginPath(); g.arc(x,y-t*s*0.3,s*0.18*(1-t*0.4),0,7); g.fill(); }
      else if (type==='rainbow') { g.strokeStyle=cols[i%5]; g.lineWidth=s*0.12; g.globalAlpha=alpha; g.beginPath(); g.arc(0,0,r,a-0.3,a+0.3); g.stroke(); }
      else if (type==='star') { g.fillStyle=cols[i%3]; g.globalAlpha=alpha; const starR=s*0.18*(1-t*0.5); g.save(); g.translate(x,y); g.rotate(time+i); g.beginPath(); for(let k=0;k<5;k++){const ang=k*Math.PI*2/5-Math.PI/2; const sx=Math.cos(ang)*starR, sy=Math.sin(ang)*starR; if(k===0)g.moveTo(sx,sy); else g.lineTo(sx,sy); const ang2=ang+Math.PI/5; g.lineTo(Math.cos(ang2)*starR*0.4,Math.sin(ang2)*starR*0.4);} g.closePath(); g.fill(); g.restore(); }
      else if (type==='petal') { g.fillStyle=cols[i%3]; g.globalAlpha=alpha*0.8; g.save(); g.translate(x,y); g.rotate(a+time); g.beginPath(); g.ellipse(0,0,s*0.15*(1-t*0.4),s*0.08*(1-t*0.4),0,0,7); g.fill(); g.restore(); }
      else if (type==='ice') { g.strokeStyle=cols[i%3]; g.lineWidth=s*0.08; g.globalAlpha=alpha; g.save(); g.translate(x,y); g.rotate(a); g.beginPath(); g.moveTo(-s*0.15,0); g.lineTo(s*0.15,0); g.moveTo(0,-s*0.15); g.lineTo(0,s*0.15); g.stroke(); g.restore(); }
      else if (type==='void') { g.fillStyle=cols[i%4]; g.globalAlpha=alpha*0.9; g.beginPath(); g.arc(x,y,s*0.2*(1-t*0.6),0,7); g.fill(); g.strokeStyle='#ff00aa'; g.lineWidth=1; g.globalAlpha=alpha*0.5; g.beginPath(); g.arc(x,y,s*0.25*(1-t*0.5),0,7); g.stroke(); }
      else if (type==='gold') { g.fillStyle=cols[i%4]; g.globalAlpha=alpha; g.save(); g.translate(x,y); g.rotate(-a); g.fillRect(-s*0.1*(1-t*0.5),-s*0.1*(1-t*0.5),s*0.2*(1-t*0.5),s*0.2*(1-t*0.5)); g.restore(); }
      else if (type==='galaxy') { g.fillStyle=cols[i%4]; g.globalAlpha=alpha*0.8; g.beginPath(); g.arc(x,y,s*(0.05+0.12*(1-t*0.6)),0,7); g.fill(); if(i%3===0){g.fillStyle='#fff';g.globalAlpha=alpha;g.beginPath();g.arc(x,y,s*0.04,0,7);g.fill();} }
      else if (type==='origin') { g.save(); g.translate(x,y); g.rotate(time*3+i); g.fillStyle=cols[i%cols.length]; g.globalAlpha=alpha; g.beginPath(); g.arc(0,0,s*0.14*(1-t*0.4),0,7); g.fill(); g.strokeStyle='#fff'; g.lineWidth=1.5; g.globalAlpha=alpha*0.9; g.beginPath(); g.arc(0,0,s*0.22*(1-t*0.4),0,7); g.stroke(); g.restore(); }
    }
    g.globalAlpha=1; g.restore();
  }

  /* 由主程式注入 */
  let WORLD_TO_SCREEN = (x,y) => ({x,y});
  let ZOOM = () => 1;
  function bindHelpers(worldToScreen, zoomFn) {
    WORLD_TO_SCREEN = worldToScreen;
    ZOOM = zoomFn;
  }

  window.raingodSprites = {
    BIOME_PALETTES, PET_SHAPES, GUARD_ANIMALS,
    drawPetShape, drawEggShape, drawStickIcon,
    drawStickFigure, drawTrailOnPlayer, drawTrailPath, drawTrailPreview,
    shade, hexA, bindHelpers,
  };
})();
