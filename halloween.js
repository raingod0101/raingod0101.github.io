/* ===================================================================
 * 🎃 halloween.js
 * 需求變更：
 *  - 每 30 分鐘活動，HUD 有倒數計時（跟白天/夜晚一樣）
 *  - 糖果每 5 秒生成一顆、無上限，直到下一次刷新（整點 5 分刷新時清空）
 *  - 商店改成「只能對孵化器中的蛋使用碎片」
 *  - 屏障視覺交給主遊戲（這裡不再處理，避免重疊）
 * =================================================================== */
(function () {
  'use strict';

  function start() {
    const G = window.raingodGame;
    if (!G || !G.HOOKS) { setTimeout(start, 60); return; }

    const { S, WORLD, hexA, showToast, worldToScreen, saveGame, updateUI, HOOKS, rnd, FULL_CYCLE, DAY_MS } = G;

    // ==== 常數 ====
    const CANDY_TYPES = [
      { name: '南瓜糖', icon: '🎃', value: 5,  color: '#ff8a20', weight: 45 },
      { name: '玉米糖', icon: '🌽', value: 10, color: '#ffd040', weight: 30 },
      { name: '棒棒糖', icon: '🍭', value: 15, color: '#e040a0', weight: 17 },
      { name: '蝙蝠糖', icon: '🦇', value: 20, color: '#a060ff', weight: 8 },
    ];
    const MUTATION_ID = 'halloween';
    const MUTATION_DEF = { name: '萬聖節', icon: '🎃', color: '#ff8a20' };
    const FRAGMENT_PRICE = 100;
    const MUTATION_SUCCESS_RATE = 0.10;
    const CANDY_INTERVAL = 5;    // 每 5 秒一顆
    // 無上限（移除 CANDY_MAX）
    // 每 5 分鐘整點刷新，刷新槽以 FULL_CYCLE 為基準（跟主遊戲一致）
    const REFRESH_MS = 5 * 60 * 1000;

    const HW = {
      active: false,
      tokens: 0,
      fragments: 0,
      candies: [],
      spawnTimer: 0,
      panelOpen: false,
      initialized: false,
      noticeTimer: null,
      lastRefreshSlot: -1,
    };

    function hasMutation(obj) {
      return !!(obj && obj.mutations && obj.mutations[MUTATION_ID]);
    }

    // ==== DOM / CSS ====
    function injectStyles() {
      if (document.getElementById('halloween-styles')) return;
      const style = document.createElement('style');
      style.id = 'halloween-styles';
      style.textContent = `
        .stat.halloween{background:linear-gradient(180deg,#a040d0cc,#6a1a8acc);border-color:#ff8a20}
        .stat.halloween b{color:#ffe040}
        .stat.hwTimer{background:linear-gradient(180deg,#ffb040cc,#d07000cc);border-color:#8a4a00}
        .stat.hwTimer b{color:#ffe040}
        .btn-right.halloween{background:linear-gradient(180deg,#c060ff,#8a2ad0);border-color:#ff8a20;color:#fff;animation:hwPulse 1.6s ease-in-out infinite}
        @keyframes hwPulse{0%,100%{box-shadow:0 3px 0 #5a4a2a,0 0 0 rgba(255,138,32,0)}50%{box-shadow:0 3px 0 #5a4a2a,0 0 16px rgba(255,138,32,0.9)}}
        .candy-notice{position:fixed;top:130px;left:50%;transform:translateX(-50%);background:linear-gradient(180deg,#a040d0,#5a1a8a);border:3px solid #ff8a20;border-radius:12px;padding:6px 16px;color:#fff;font-weight:900;font-size:.8rem;z-index:90;pointer-events:none;opacity:0;transition:opacity .25s,transform .25s;text-align:center;white-space:nowrap;box-shadow:0 4px 20px rgba(160,60,220,.6);max-width:92vw;overflow:hidden;text-overflow:ellipsis}
        .candy-notice.show{opacity:1;transform:translateX(-50%) scale(1.03)}
        .halloween-panel{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(40,10,50,.97);backdrop-filter:blur(10px);z-index:100;display:none;flex-direction:column;padding:70px 10px 10px;overflow-y:auto}
        .halloween-panel.open{display:flex}
        .halloween-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px}
        .halloween-header h2{color:#ffb040;font-size:1.1rem;font-weight:900;text-shadow:0 2px 8px rgba(0,0,0,.5)}
        .halloween-header button{background:linear-gradient(180deg,#e8a0a0,#d08080);border:2px solid #aa4a4a;border-radius:7px;padding:4px 12px;color:#fff;font-weight:800;font-size:.7rem;cursor:pointer}
        .halloween-info{display:flex;gap:14px;margin-bottom:10px;color:#ffe040;font-weight:900;font-size:.9rem;flex-wrap:wrap}
        .halloween-info b{color:#fff}
        .halloween-shop-item{background:linear-gradient(180deg,#4a1a6a,#2a0a4a);border:3px solid #ff8a20;border-radius:12px;padding:12px;display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:14px}
        .hs-name{color:#ffb040;font-weight:900;font-size:.95rem}
        .hs-desc{color:#d0b0e0;font-weight:700;font-size:.72rem;text-align:center;line-height:1.5}
        .halloween-shop-item button{background:linear-gradient(180deg,#ffb040,#d07000);border:3px solid #8a4a00;border-radius:9px;padding:8px 20px;color:#2a0a00;font-weight:900;font-size:.85rem;cursor:pointer;box-shadow:0 3px 0 #5a2a00}
        .halloween-shop-item button:active{transform:translateY(2px);box-shadow:0 1px 0 #5a2a00}
        .halloween-shop-item button:disabled{opacity:.45;filter:grayscale(.6);cursor:not-allowed}
        .halloween-eggs-title{color:#ffe040;font-weight:900;font-size:.8rem;margin-bottom:8px}
        .halloween-eggs{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}
        .hw-egg-card{background:linear-gradient(180deg,#3a1a5a,#1a0a2a);border:3px solid #6a3a9a;border-radius:10px;padding:6px;display:flex;flex-direction:column;align-items:center;gap:3px;position:relative}
        .hw-egg-card.mutated{border-color:#ff8a20;box-shadow:0 0 18px rgba(255,138,32,.55)}
        .hw-egg-card.favorited{border-color:#ff80c0;box-shadow:0 0 14px rgba(255,128,192,.5)}
        .hw-egg-card canvas{width:60px;height:60px}
        .hw-egg-card .hwe-name{font-size:.65rem;font-weight:900;color:#fff;text-align:center}
        .hw-egg-card .hwe-status{font-size:.58rem;font-weight:900;text-align:center}
        .hw-egg-card .hwe-heart{position:absolute;top:2px;right:4px;font-size:.9rem}
        .hw-egg-card button{font-size:.6rem;padding:3px 8px;border-radius:6px;border:2px solid #8a4a00;background:linear-gradient(180deg,#ffb040,#d07000);color:#2a0a00;font-weight:900;cursor:pointer;width:100%}
        .hw-egg-card button:disabled{opacity:.45;filter:grayscale(.6);cursor:not-allowed}
      `;
      document.head.appendChild(style);
    }

    function injectDOM() {
      if (document.getElementById('hwTokensStat')) return;

      const stats = document.querySelector('.stats');
      if (stats) {
        const tok = document.createElement('div');
        tok.className = 'stat halloween';
        tok.id = 'hwTokensStat';
        tok.style.display = 'none';
        tok.innerHTML = '🎃 <b id="uiTokens">0</b>';
        stats.appendChild(tok);

        // 活動倒數計時（跟白天/夜晚一樣）
        const timer = document.createElement('div');
        timer.className = 'stat hwTimer';
        timer.id = 'hwTimerStat';
        timer.style.display = 'none';
        timer.innerHTML = '🎃 <b id="uiHwTimer">--:--</b>';
        stats.appendChild(timer);
      }

      const btns = document.querySelector('.btns-right');
      if (btns) {
        const btn = document.createElement('button');
        btn.className = 'btn-right halloween';
        btn.id = 'btnHalloween';
        btn.style.display = 'none';
        btn.textContent = '🎃 萬聖節';
        btns.appendChild(btn);
      }

      const notice = document.createElement('div');
      notice.className = 'candy-notice';
      notice.id = 'candyNotice';
      document.body.appendChild(notice);

      const panel = document.createElement('div');
      panel.className = 'halloween-panel';
      panel.id = 'halloweenPanel';
      panel.innerHTML = `
        <div class="halloween-header">
          <h2>🎃 萬聖節商店</h2>
          <button id="btnCloseHalloween">✕ 關閉</button>
        </div>
        <div class="halloween-info">
          <span>🎃 代幣：<b id="hwTokens">0</b></span>
          <span>🧩 碎片：<b id="hwFragments">0</b></span>
        </div>
        <div class="halloween-shop-item">
          <div class="hs-name">🎃 萬聖節變異碎片</div>
          <div class="hs-desc">使用後有 <b>10%</b> 機率讓「孵化器中的蛋」獲得【萬聖節變異】。<br>蛋孵出時寵物會繼承變異。<br>每顆蛋同種變異只能上一次，不同變異可疊加。</div>
          <button id="btnBuyFrag">購買（100 🎃）</button>
        </div>
        <div class="halloween-eggs-title">孵化器中的蛋（使用碎片）：</div>
        <div class="halloween-eggs" id="hwEggList"></div>
      `;
      document.body.appendChild(panel);

      btn && btn.addEventListener('click', openShop);
      document.getElementById('btnCloseHalloween').addEventListener('click', closeShop);
      document.getElementById('btnBuyFrag').addEventListener('click', buyFragment);
    }

    // ==== 活動開關 ====
    function isInHalloweenWindow(now) {
      // 每 5 分鐘槽：整點、30 分所在的槽 → 活動
      const slotStart = Math.floor(now / REFRESH_MS) * REFRESH_MS;
      const mins = new Date(slotStart).getMinutes();
      return mins === 0 || mins === 30;
    }

    function getHalloweenRemainMs(now) {
      // 活動倒數：到下一個 5 分鐘刷新點為止
      const nextSlot = (Math.floor(now / REFRESH_MS) + 1) * REFRESH_MS;
      return Math.max(0, nextSlot - now);
    }

    function updateHalloweenState() {
      const now = Date.now();
      const should = isInHalloweenWindow(now);
      if (should !== HW.active) {
        HW.active = should;
        if (HW.active) {
          HW.spawnTimer = 0;
          showToast('🎃 萬聖節活動開始！\n5 分鐘內收集糖果，兌換限定變異！', '#8a3a8a', '#5a1a5a');
        } else {
          showToast('🎃 萬聖節活動結束，恢復正常。', '#5a5a5a', '#3a3a3a');
          HW.candies = [];
        }
        updateUI();
      }
    }

    function showCandyNotice(msg) {
      const el = document.getElementById('candyNotice');
      if (!el) return;
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(HW.noticeTimer);
      HW.noticeTimer = setTimeout(() => el.classList.remove('show'), 2200);
    }

    function spawnCandy() {
      if (!HW.active) return;
      const bi = Math.floor(Math.random() * WORLD.biomes.length);
      const b = WORLD.biomes[bi];
      const x = rnd(60, G.WORLD_W - 60);
      const y = b.nestsY + rnd(-70, 70);
      const totalW = CANDY_TYPES.reduce((s, c) => s + c.weight, 0);
      let r = Math.random() * totalW; let type = CANDY_TYPES[0];
      for (const c of CANDY_TYPES) { if (r < c.weight) { type = c; break; } r -= c.weight; }
      HW.candies.push({ id: Math.random().toString(36).slice(2), x, y, biomeIdx: bi, type, bob: Math.random() * Math.PI * 2 });
      showCandyNotice('🍬 ' + type.icon + ' ' + type.name + ' 在 ' + b.icon + ' ' + b.name + ' 出現了！');
    }

    function collectCandy(c, idx) {
      HW.candies.splice(idx, 1);
      HW.tokens += c.type.value;
      const sp = worldToScreen(c.x, c.y);
      const txt = document.createElement('div');
      txt.className = 'hatch-text';
      txt.textContent = c.type.icon + ' +' + c.type.value + ' 🎃';
      txt.style.left = (sp.x - 50) + 'px';
      txt.style.top = (sp.y - 20) + 'px';
      txt.style.color = c.type.color;
      txt.style.textShadow = '0 0 10px ' + c.type.color;
      document.body.appendChild(txt);
      setTimeout(() => txt.remove(), 1000);
      updateUI(); saveGame(true);
    }

    // ==== 商店 ====
    function openShop() {
      HW.panelOpen = true;
      document.getElementById('halloweenPanel').classList.add('open');
      buildShopUI();
    }
    function closeShop() {
      HW.panelOpen = false;
      document.getElementById('halloweenPanel').classList.remove('open');
    }

    function buyFragment() {
      if (HW.tokens < FRAGMENT_PRICE) { showToast('❌ 代幣不足（需要 100 🎃）', '#8a2a2a', '#5a0a0a'); return; }
      HW.tokens -= FRAGMENT_PRICE;
      HW.fragments += 1;
      showToast('🧩 已購買萬聖節變異碎片 ×1', '#8a3a8a', '#5a1a5a');
      buildShopUI(); updateUI(); saveGame(true);
    }

    function buildShopUI() {
      const tokEl = document.getElementById('hwTokens'); if (tokEl) tokEl.textContent = HW.tokens;
      const fragEl = document.getElementById('hwFragments'); if (fragEl) fragEl.textContent = HW.fragments;
      const buyBtn = document.getElementById('btnBuyFrag'); if (buyBtn) buyBtn.disabled = HW.tokens < FRAGMENT_PRICE;

      const grid = document.getElementById('hwEggList'); if (!grid) return;
      grid.innerHTML = '';
      const eggs = S.hatchery;
      if (!eggs || eggs.length === 0) {
        grid.innerHTML = '<div style="color:#d0b0e0;grid-column:1/-1;text-align:center;padding:20px;">孵化器中沒有蛋<br><span style="font-size:.7rem">先去偷蛋放入孵化器吧！</span></div>';
        return;
      }
      eggs.forEach((egg) => {
        const has = hasMutation(egg);
        const card = document.createElement('div');
        card.className = 'hw-egg-card' + (has ? ' mutated' : '') + (egg.favorite ? ' favorited' : '');
        if (egg.favorite) {
          const h = document.createElement('div');
          h.className = 'hwe-heart';
          h.textContent = '❤️';
          card.appendChild(h);
        }
        const cv = document.createElement('canvas'); cv.width = 84; cv.height = 84;
        const cx = cv.getContext('2d'); cx.translate(42, 42);
        const rc = WORLD.rarities[egg.rar].c;
        G.drawEggShape(cx, egg, 18, performance.now() / 1000, rc);
        card.appendChild(cv);
        const nm = document.createElement('div'); nm.className = 'hwe-name'; nm.textContent = egg.name; card.appendChild(nm);
        const st = document.createElement('div'); st.className = 'hwe-status';
        if (has) { st.textContent = '🎃 已變異'; st.style.color = '#ff8a20'; }
        else if (egg.finished) { st.textContent = '✨ 可打開'; st.style.color = '#ffe040'; }
        else { st.textContent = '⏳ 孵蛋中'; st.style.color = '#a0a0d0'; }
        card.appendChild(st);
        const btn = document.createElement('button');
        btn.textContent = has ? '已變異' : '使用碎片';
        btn.disabled = has || HW.fragments <= 0;
        btn.onclick = () => useFragmentOnEgg(egg);
        card.appendChild(btn);
        grid.appendChild(card);
      });
    }

    function useFragmentOnEgg(egg) {
      if (HW.fragments <= 0) { showToast('❌ 沒有萬聖節變異碎片', '#8a2a2a', '#5a0a0a'); return; }
      if (hasMutation(egg)) { showToast('❌ 這顆蛋已經有萬聖節變異了', '#8a2a2a', '#5a0a0a'); return; }
      HW.fragments -= 1;
      const success = Math.random() < MUTATION_SUCCESS_RATE;
      if (success) {
        if (!egg.mutations) egg.mutations = {};
        egg.mutations[MUTATION_ID] = true;
        showToast('🎉 成功！' + egg.name + ' 獲得了【萬聖節變異】！\n孵出時寵物也會帶有變異', '#8a3a8a', '#5a1a5a');
      } else {
        showToast('💨 失敗了… ' + egg.name + ' 沒有獲得變異（碎片已消耗）', '#8a2a2a', '#5a0a0a');
      }
      buildShopUI(); updateUI(); saveGame(true);
    }

    // ==== 繪製 ====
    function drawBackgroundOverlay(ctx, W, H) {
      if (!HW.active) return;
      ctx.save();
      ctx.fillStyle = 'rgba(80, 20, 110, 0.28)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.22;
      ctx.font = '34px "Segoe UI Emoji", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < 10; i++) {
        const baseX = (i * 197) % (W + 200) - 100;
        const drift = Math.sin(S.time * 0.4 + i * 1.7) * 40;
        const x = ((baseX + drift) % (W + 200) + W + 200) % (W + 200) - 100;
        const y = ((i * 131 + S.time * (14 + (i % 3) * 6)) % (H + 160)) - 80;
        ctx.fillText(i % 3 === 0 ? '🎃' : (i % 3 === 1 ? '🦇' : '👻'), x, y);
      }
      ctx.globalAlpha = 1;
      const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(40,0,60,0.4)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    function drawCandies(ctx) {
      if (!HW.active || HW.candies.length === 0) return;
      for (const c of HW.candies) {
        const sp = worldToScreen(c.x, c.y);
        const W = G.getW(), H = G.getH();
        if (sp.y < -60 || sp.y > H + 60) continue;
        const sc = S.zoom;
        const bob = Math.sin(S.time * 4 + c.bob) * 4;
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.scale(sc, sc);
        ctx.translate(0, bob);
        const gl = ctx.createRadialGradient(0, 0, 4, 0, 0, 32);
        gl.addColorStop(0, hexA(c.type.color, 0.85));
        gl.addColorStop(1, hexA(c.type.color, 0));
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(0, 0, 32, 0, 7); ctx.fill();
        ctx.font = '26px "Segoe UI Emoji", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 12;
        ctx.shadowColor = c.type.color;
        ctx.fillText(c.type.icon, 0, 0);
        ctx.shadowBlur = 0;
        ctx.font = '900 10px "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffe040';
        ctx.shadowBlur = 4; ctx.shadowColor = '#000';
        ctx.fillText('+' + c.type.value, 0, 22);
        ctx.restore();
      }
    }

    function drawPetMutationBefore(ctx, pet) {
      if (!hasMutation(pet)) return;
      const pulse = 0.6 + Math.sin(S.time * 3 + (pet.x || 0)) * 0.25;
      const glow = ctx.createRadialGradient(0, -5, 6, 0, -5, 36);
      glow.addColorStop(0, hexA(MUTATION_DEF.color, 0.55 * pulse));
      glow.addColorStop(1, hexA('#a040d0', 0));
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, -5, 36, 0, 7); ctx.fill();
    }
    function drawPetMutationAfter(ctx, pet) {
      if (!hasMutation(pet)) return;
      for (let i = 0; i < 3; i++) {
        const a = S.time * 1.8 + i * Math.PI * 2 / 3 + (pet.x || 0) * 0.01;
        const bx = Math.cos(a) * 24;
        const by = Math.sin(a) * 12 - 8;
        ctx.font = '11px "Segoe UI Emoji", "Segoe UI", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.9;
        ctx.fillText('🦇', bx, by);
      }
      ctx.globalAlpha = 1;
      ctx.font = '16px "Segoe UI Emoji", "Segoe UI", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowBlur = 10; ctx.shadowColor = MUTATION_DEF.color;
      ctx.fillText(MUTATION_DEF.icon, 14, -22);
      ctx.shadowBlur = 0;
    }
    function drawEggMutationBefore(ctx, egg) {
      if (!hasMutation(egg)) return;
      const pulse = 0.6 + Math.sin(S.time * 3 + (egg.x || 0)) * 0.25;
      const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 42);
      glow.addColorStop(0, hexA(MUTATION_DEF.color, 0.55 * pulse));
      glow.addColorStop(1, hexA('#a040d0', 0));
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, 42, 0, 7); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const a = S.time * 2 + i * Math.PI * 2 / 3 + (egg.x || 0) * 0.01;
        const bx = Math.cos(a) * 26;
        const by = Math.sin(a) * 14 - 8;
        ctx.font = '11px "Segoe UI Emoji", "Segoe UI", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🦇', bx, by);
      }
    }
    function drawEggMutationAfter(ctx, egg) {
      if (!hasMutation(egg)) return;
      ctx.font = '14px "Segoe UI Emoji", "Segoe UI", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowBlur = 8; ctx.shadowColor = MUTATION_DEF.color;
      ctx.fillText('🎃', -22, -16);
      ctx.shadowBlur = 0;
    }

    // ==== 點擊 / 存檔 / 讀檔 / UI ====
    function handleClick(wx, wy) {
      if (!HW.active || HW.candies.length === 0) return false;
      for (let i = HW.candies.length - 1; i >= 0; i--) {
        const c = HW.candies[i];
        if (Math.hypot(wx - c.x, wy - c.y) < 40) {
          collectCandy(c, i);
          return true;
        }
      }
      return false;
    }

    function onSave() {
      return {
        halloweenTokens: HW.tokens,
        halloweenFragments: HW.fragments,
      };
    }
    function onLoad(d) {
      HW.tokens = (d && typeof d.halloweenTokens === 'number') ? d.halloweenTokens : 0;
      HW.fragments = (d && typeof d.halloweenFragments === 'number') ? d.halloweenFragments : 0;
    }

    function onUIUpdate() {
      const showHW = HW.active || HW.tokens > 0 || HW.fragments > 0;
      const statEl = document.getElementById('hwTokensStat');
      const btnEl = document.getElementById('btnHalloween');
      const timerEl = document.getElementById('hwTimerStat');
      if (statEl) statEl.style.display = showHW ? 'flex' : 'none';
      if (btnEl) btnEl.style.display = showHW ? 'flex' : 'none';
      const tokEl = document.getElementById('uiTokens');
      if (tokEl) tokEl.textContent = HW.tokens + (HW.fragments > 0 ? ' / 🧩' + HW.fragments : '');

      // 活動倒數計時（跟白天夜晚一樣格式）
      if (timerEl) {
        if (HW.active) {
          timerEl.style.display = 'flex';
          const remainMs = getHalloweenRemainMs(Date.now());
          const totalSec = Math.ceil(remainMs / 1000);
          const mm = Math.floor(totalSec / 60);
          const ss = totalSec % 60;
          const txt = document.getElementById('uiHwTimer');
          if (txt) txt.textContent = mm + ':' + (ss < 10 ? '0' : '') + ss;
        } else {
          timerEl.style.display = 'none';
        }
      }
    }

    function onUpdate(dt) {
      if (!HW.active) return;
      HW.spawnTimer += dt;
      while (HW.spawnTimer >= CANDY_INTERVAL) {
        HW.spawnTimer -= CANDY_INTERVAL;
        spawnCandy();
      }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && HW.panelOpen) {
        e.preventDefault();
        closeShop();
      }
    });

    HOOKS.onUpdate.push(onUpdate);
    HOOKS.onDrawBackground.push(drawBackgroundOverlay);
    HOOKS.onDrawWorld.push(drawCandies);
    HOOKS.onDrawPetBefore.push(drawPetMutationBefore);
    HOOKS.onDrawPetAfter.push(drawPetMutationAfter);
    HOOKS.onDrawHatcheryBefore.push(drawEggMutationBefore);
    HOOKS.onDrawHatcheryAfter.push(drawEggMutationAfter);
    HOOKS.onClick.push(handleClick);
    HOOKS.onSave.push(onSave);
    HOOKS.onLoad.push(onLoad);
    HOOKS.onUIUpdate.push(onUIUpdate);
    HOOKS.onInit.push(function () {
      if (HW.initialized) return;
      HW.initialized = true;
      injectStyles();
      injectDOM();
      updateHalloweenState();
      setInterval(updateHalloweenState, 1000);
      setInterval(() => {
        // 每 5 分鐘刷新時，如果活動剛結束/開始，就清糖果
        const now = Date.now();
        const slot = Math.floor(now / REFRESH_MS);
        if (slot !== HW.lastRefreshSlot) {
          HW.lastRefreshSlot = slot;
          if (!HW.active) HW.candies = [];
        }
        if (HW.active && document.getElementById('hwTimerStat') && document.getElementById('hwTimerStat').style.display !== 'none') {
          onUIUpdate();
        }
      }, 500);
      updateUI();
    });

    if (document.getElementById('btnHalloween')) {
      // 若主遊戲已初始化，立即補上
      if (!HW.initialized) {
        HW.initialized = true;
        injectStyles();
        injectDOM();
        updateHalloweenState();
        setInterval(updateHalloweenState, 1000);
        updateUI();
      }
    }
  }

  start();
})();
