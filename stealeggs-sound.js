/* ===================================================================
 * 🔊 sound.js v3 — 全遊戲音效 + BGM 雙軌
 * 平常 BGM：Aventure - A Beautiful Garden.mp3
 * 萬聖節 BGM：Chill Pulse - Icicle.mp3（活動時播 2 次後切回）
 * =================================================================== */
(function () {
  'use strict';

  /* ==== BGM（同位置檔名） ==== */
  let BGM_URL       = 'Aventure - A Beautiful Garden (freetouse.com).mp3';
  let BGM_HALLOWEEN = 'Chill Pulse - Icicle (freetouse.com).mp3';

  const VOL_MASTER = 0.7;
  const VOL_SFX    = 0.5;
  const VOL_BGM    = 0.35;
  const HALLOWEEN_BGM_REPEAT = 2;

  let ctx = null;
  let masterGain, sfxGain, bgmGain;
  let muted = false;

  function ensureCtx() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain(); masterGain.gain.value = VOL_MASTER; masterGain.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = VOL_SFX; sfxGain.connect(masterGain);
    bgmGain = ctx.createGain(); bgmGain.gain.value = VOL_BGM; bgmGain.connect(masterGain);
    return ctx;
  }

  /* ============ 合成器 ============ */
  function tone({ type='sine', freq=440, slideTo=null, dur=0.2, vol=0.3, delay=0, curve='exp' }) {
    const c = ensureCtx(), t0 = c.currentTime + delay;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) {
      if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
      else osc.frequency.linearRampToValueAtTime(slideTo, t0 + dur);
    }
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(sfxGain);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function noise({ dur=0.3, vol=0.4, type='lowpass', freq=1000, slideTo=null, delay=0 }) {
    const c = ensureCtx(), t0 = c.currentTime + delay;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const filt = c.createBiquadFilter(); filt.type = type;
    filt.frequency.setValueAtTime(freq, t0);
    if (slideTo) filt.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(g).connect(sfxGain);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }
  function arpeggio(freqs, { step=0.07, dur=0.15, vol=0.22, type='triangle', delay=0 }) {
    freqs.forEach((f, i) => tone({ type, freq: f, dur, vol, delay: delay + i * step }));
  }

  /* ============ 音效表 ============ */
  const SFX = {
    click:      () => tone({ type:'square', freq:800, dur:0.05, vol:0.12 }),
    clickSoft:  () => tone({ type:'sine',   freq:600, dur:0.06, vol:0.10 }),
    openPanel:  () => tone({ type:'sine', freq:520, slideTo:760, dur:0.12, vol:0.15 }),
    closePanel: () => tone({ type:'sine', freq:760, slideTo:520, dur:0.12, vol:0.15 }),
    error:      () => { tone({ type:'square', freq:180, dur:0.08, vol:0.18 });
                        tone({ type:'square', freq:140, dur:0.12, vol:0.18, delay:0.09 }); },
    notify:     () => { tone({ type:'sine', freq:880, dur:0.08, vol:0.15 });
                        tone({ type:'sine', freq:1175, dur:0.15, vol:0.15, delay:0.08 }); },

    buy:        () => { tone({ type:'triangle', freq:660, dur:0.08, vol:0.22 });
                        tone({ type:'triangle', freq:990, dur:0.12, vol:0.22, delay:0.07 }); },
    cash:       () => tone({ type:'sine', freq:1046, dur:0.06, vol:0.08 }),
    trainTick:  () => tone({ type:'square', freq:1200, dur:0.03, vol:0.06 }),

    eggPick:    () => { tone({ type:'sine', freq:520, slideTo:880, dur:0.12, vol:0.2 });
                        tone({ type:'sine', freq:1040, dur:0.1, vol:0.15, delay:0.08 }); },
    eggDrop:    () => { tone({ type:'sine', freq:700, slideTo:200, dur:0.2, vol:0.25 });
                        noise({ dur:0.15, vol:0.18, type:'lowpass', freq:600 }); },
    eggDeposit: () => arpeggio([523,659,784], { step:0.06, dur:0.12, vol:0.18 }),
    hatchReady: () => arpeggio([784,1047,1319], { step:0.08, dur:0.15, vol:0.2 }),
    eggOpen:    () => { noise({ dur:0.25, vol:0.25, type:'bandpass', freq:1500, slideTo:4000 });
                        arpeggio([523,659,784,1047,1319], { step:0.06, dur:0.2, vol:0.22, type:'triangle' }); },
    discover:   () => arpeggio([880,1109,1319,1760], { step:0.08, dur:0.18, vol:0.22 }),
    reward:     () => arpeggio([660,880,1100], { step:0.06, dur:0.12, vol:0.18 }),

    // 攻擊 / 命中
    attack:      () => { noise({ dur:0.09, vol:0.28, type:'highpass', freq:1400 });
                         tone({ type:'square', freq:320, slideTo:120, dur:0.1, vol:0.18 }); },
    attackBare:  () => { noise({ dur:0.06, vol:0.16, type:'bandpass', freq:900 }); },
    attackEmpty: () => { tone({ type:'sine', freq:300, slideTo:180, dur:0.15, vol:0.12 }); },
    cooldownTick:() => tone({ type:'square', freq:520, dur:0.04, vol:0.08 }),
    hit:         () => { noise({ dur:0.15, vol:0.42, type:'lowpass', freq:1400, slideTo:200 });
                         tone({ type:'sawtooth', freq:200, slideTo:60, dur:0.15, vol:0.25 }); },
    knockback:   () => { tone({ type:'sawtooth', freq:300, slideTo:70, dur:0.32, vol:0.32 });
                         noise({ dur:0.22, vol:0.26, type:'lowpass', freq:900 }); },
    hurt:        () => { tone({ type:'square', freq:200, slideTo:80, dur:0.25, vol:0.3 });
                         noise({ dur:0.18, vol:0.28, type:'lowpass', freq:500 }); },
    stealEgg:    () => { tone({ type:'square', freq:400, slideTo:900, dur:0.18, vol:0.28 });
                         arpeggio([1047,1319,1568], { step:0.05, dur:0.1, vol:0.18, delay:0.15 }); },

    guardWake:   () => tone({ type:'sawtooth', freq:200, slideTo:600, dur:0.35, vol:0.28 }),
    guardAlert:  () => { tone({ type:'square', freq:880, dur:0.08, vol:0.24 });
                         tone({ type:'square', freq:1100, dur:0.08, vol:0.24, delay:0.09 }); },
    guardReturn: () => tone({ type:'sine', freq:440, slideTo:220, dur:0.3, vol:0.15 }),
    guardHit:    () => { tone({ type:'square', freq:150, slideTo:70, dur:0.3, vol:0.32 });
                         noise({ dur:0.25, vol:0.3, type:'lowpass', freq:700 }); },

    nightFall:   () => { tone({ type:'sine', freq:400, slideTo:120, dur:0.6, vol:0.22 });
                         tone({ type:'sine', freq:300, slideTo:80, dur:0.7, vol:0.18, delay:0.1 }); },
    dayRise:     () => { tone({ type:'triangle', freq:300, slideTo:900, dur:0.5, vol:0.22 });
                         arpeggio([660,880], { step:0.08, dur:0.15, vol:0.16, delay:0.4 }); },

    adShow:      () => tone({ type:'triangle', freq:660, dur:0.1, vol:0.15 }),
    adSuccess:   () => arpeggio([523,659,784,1047], { step:0.07, dur:0.15, vol:0.22 }),
    adFail:      () => SFX.error(),

    candySpawn:  () => tone({ type:'sine', freq:1200, dur:0.06, vol:0.08 }),
    candyPick:   () => { tone({ type:'triangle', freq:880, slideTo:1320, dur:0.12, vol:0.22 });
                         tone({ type:'triangle', freq:1760, dur:0.1, vol:0.15, delay:0.08 }); },
    mutationSuccess: () => { arpeggio([523,659,784,1047,1319], { step:0.07, dur:0.22, vol:0.25, type:'triangle' });
                             noise({ dur:0.3, vol:0.2, type:'highpass', freq:2000, delay:0.35 }); },
    mutationFail:    () => { tone({ type:'sawtooth', freq:300, slideTo:100, dur:0.4, vol:0.25 });
                             noise({ dur:0.25, vol:0.2, type:'lowpass', freq:600 }); },
    hwStart:     () => { tone({ type:'sine', freq:200, slideTo:800, dur:0.4, vol:0.25 });
                         arpeggio([440,554,659,880], { step:0.06, dur:0.15, vol:0.2, delay:0.4 }); },
    hwEnd:       () => tone({ type:'sine', freq:800, slideTo:200, dur:0.5, vol:0.22 }),
    buyFragment: () => SFX.buy(),

    tutorial:     () => { tone({ type:'triangle', freq:600, dur:0.1, vol:0.15 });
                          tone({ type:'triangle', freq:900, dur:0.15, vol:0.15, delay:0.1 }); },
    tutorialDone: () => arpeggio([523,659,784,1047,1319,1568], { step:0.07, dur:0.2, vol:0.25, type:'triangle' }),
    multiplier:   () => arpeggio([880,1109,1319], { step:0.05, dur:0.1, vol:0.18 }),
  };

  function play(name) {
    if (muted) return;
    const fn = SFX[name];
    if (!fn) return;
    try { ensureCtx(); fn(); } catch (err) { console.warn('播放失敗:', name, err); }
  }

  /* ============ BGM 雙軌 ============ */
  let bgmNormal = null, bgmHalloween = null;
  let bgmMode = 'none', bgmUnlocked = false, hwRepeatLeft = 0;

  function createAudio(url, loop) {
    if (!url) return null;
    const a = new Audio(url);
    a.loop = loop; a.volume = VOL_BGM * VOL_MASTER; a.preload = 'auto';
    return a;
  }
  function setupBGM() {
    if (bgmNormal)    { bgmNormal.pause();    bgmNormal = null; }
    if (bgmHalloween) { bgmHalloween.pause(); bgmHalloween = null; }
    bgmNormal    = createAudio(BGM_URL, true);
    bgmHalloween = createAudio(BGM_HALLOWEEN, false);
    if (bgmHalloween) {
      bgmHalloween.addEventListener('ended', () => {
        if (bgmMode !== 'halloween') return;
        hwRepeatLeft--;
        if (hwRepeatLeft > 0) {
          bgmHalloween.currentTime = 0;
          bgmHalloween.play().catch(()=>{});
        } else switchToNormalBgm();
      });
    }
    if (bgmUnlocked) applyBgmMode();
  }
  function applyBgmMode() {
    if (!bgmUnlocked || muted) return;
    if (bgmMode === 'halloween' && bgmHalloween) {
      if (bgmNormal) bgmNormal.pause();
      hwRepeatLeft = HALLOWEEN_BGM_REPEAT;
      bgmHalloween.currentTime = 0;
      bgmHalloween.play().catch(()=>{});
    } else if (bgmMode === 'normal' && bgmNormal) {
      if (bgmHalloween) bgmHalloween.pause();
      bgmNormal.play().catch(()=>{});
    }
  }
  function switchToNormalBgm() {
    bgmMode = 'normal';
    if (bgmHalloween) bgmHalloween.pause();
    if (bgmNormal) { bgmNormal.currentTime = 0; bgmNormal.play().catch(()=>{}); }
  }
  function setBgmMode(mode) {
    if (mode !== 'normal' && mode !== 'halloween') return;
    if (bgmMode === mode) return;
    bgmMode = mode; applyBgmMode();
  }
  function unlockBgmOnce() {
    if (bgmUnlocked) return;
    bgmUnlocked = true;
    if (bgmMode === 'none') bgmMode = 'normal';
    applyBgmMode();
    window.removeEventListener('pointerdown', unlockBgmOnce);
    window.removeEventListener('keydown', unlockBgmOnce);
  }
  window.addEventListener('pointerdown', unlockBgmOnce);
  window.addEventListener('keydown', unlockBgmOnce);

  function setMuted(m) {
    muted = !!m;
    if (masterGain) masterGain.gain.value = muted ? 0 : VOL_MASTER;
    if (bgmNormal)    bgmNormal.muted = muted;
    if (bgmHalloween) bgmHalloween.muted = muted;
  }
  function toggleMute() { setMuted(!muted); return muted; }
  function isMuted() { return muted; }

  /* ============ 按鈕音效 ============ */
  function hookButtons() {
    const map = {
      btnUp: 'buy', btnUpgradeCap: 'buy', btnBest: 'buy',
      btnIndex: 'openPanel', btnCloseIndex: 'closePanel',
      btnBag: 'openPanel', btnCloseBag: 'closePanel',
      btnStickPanel: 'openPanel', btnCloseStickPanel: 'closePanel',
      btnTrail: 'openPanel', btnCloseTrailPanel: 'closePanel',
      btnSellSelected: 'buy', btnSellPanel: 'buy',
      btnClosePanel: 'closePanel', btnReturn: 'closePanel',
      btnSubscribe: 'notify', subVerifyBtn: 'notify', subCloseBtn: 'closePanel',
      adClaimBtn: 'adSuccess', adCloseBtn: 'adFail',
      testTriggerBtn: 'openPanel', btnCloseTest: 'closePanel', btnClosePI: 'closePanel',
    };
    Object.entries(map).forEach(([id, sfx]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => play(sfx), true);
    });

    // 攻擊：靠 G.S 的狀態判斷（冷卻、夜晚、真的打到）
    const atk = document.getElementById('btnStick');
    if (atk) {
      atk.addEventListener('click', () => {
        const G = window.raingodGame; if (!G) return;
        const S = G.S;
        if (S.night) { play('error'); return; }
        if (S.stickCooldown > 0.05) { play('cooldownTick'); return; }
        const stick = G.getEquippedStick && G.getEquippedStick();
        play(stick ? 'attack' : 'attackBare');
        // 稍後檢查是否命中（onUpdate 會處理玩家、守衛被擊）
      }, true);
    }

    ['btnAd','btnAd4x','btnAd8x','btnAd16x','btnAd32x'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => play('adShow'), true);
    });

    // 畫布點擊統一柔音（蛋、寵物、孵蛋器各自會再播專屬音）
    const c = document.getElementById('c');
    if (c) c.addEventListener('click', () => play('clickSoft'), true);
  }

  /* ============ 事件 hook：從 S 狀態變化偵測 ============ */
  function installGameHooks() {
    const G = window.raingodGame;
    if (!G || !G.HOOKS) { setTimeout(installGameHooks, 150); return; }
    if (installGameHooks.__done) return;
    installGameHooks.__done = true;
    const H = G.HOOKS;
    const S = G.S;

    // 前一次狀態快照
    const prev = {
      night: S.night,
      carry: null,
      hatcheryFinished: new Set(),
      hatcheryIds: new Set(),
      petsCount: S.pets.length,
      bagCount: S.bag.length,
      guards: new WeakMap(),
      stickCooldown: 0,
      playerStun: 0,
      playerKB: 0,
      cash: S.cash,
      hatchSet: new Set(),
      indexSize: 0,
      sticksCount: 0,
      trailsCount: 0,
      mutationsCount: 0,
    };

    H.onUpdate.push(function (dt) {
      // 夜晚 / 白天
      if (S.night !== prev.night) {
        play(S.night ? 'nightFall' : 'dayRise');
        prev.night = S.night;
      }

      // 拿蛋 / 放蛋 / 掉蛋
      const carrying = !!S.player.carry;
      if (carrying && !prev.carry) play('eggPick');
      else if (!carrying && prev.carry) {
        // 判斷是「放入孵化器」還是「被搶 / 掉落」
        // 若孵化器多一顆 → eggDeposit，否則 eggDrop
        if (S.hatchery.length > prev.hatcheryIds.size) play('eggDeposit');
        else play('eggDrop');
      }
      prev.carry = carrying;

      // 孵化完成
      for (const h of S.hatchery) {
        if (h.finished && !prev.hatcheryFinished.has(h.id)) {
          prev.hatcheryFinished.add(h.id);
          play('hatchReady');
        }
        if (!h.finished) prev.hatcheryFinished.delete(h.id);
      }
      // 孵化器移除（蛋被打開）
      const curIds = new Set(S.hatchery.map(h => h.id));
      const removed = [...prev.hatcheryIds].filter(id => !curIds.has(id));
      if (removed.length > 0) play('eggOpen');
      prev.hatcheryIds = curIds;

      // 守衛狀態
      for (const g of S.guards) {
        let st = prev.guards.get(g);
        if (!st) {
          st = { sleeping: g.sleeping, chasing: g.chasing, dashPhase: g.dashPhase, returning: g.returning };
          prev.guards.set(g, st);
          continue;
        }
        if (g.wakeTimer > 0 && st.sleeping) play('guardWake');
        if ((g.chasing && !st.chasing) || (g.dashPhase && !st.dashPhase)) play('guardAlert');
        if (g.returning && !st.returning && (st.chasing || st.dashPhase)) play('guardReturn');
        st.sleeping = g.sleeping; st.chasing = g.chasing; st.dashPhase = g.dashPhase; st.returning = g.returning;
      }

      // 玩家被守衛擊退 / 被打
      const stunIncreased = S.player.stun > prev.playerStun + 0.3;
      const kbIncreased = S.player.knockbackTimer > prev.playerKB + 0.3;
      if (stunIncreased || kbIncreased) {
        // 這裡「被打」時 player.stun 大增，通常是被守衛撞
        play('hurt');
        setTimeout(() => play('knockback'), 60);
      }
      prev.playerStun = S.player.stun;
      prev.playerKB = S.player.knockbackTimer;

      // 棒子揮動（S.stickSwingAnim > 0 瞬間）
      if (S.stickSwingAnim > 0.2 && prev.stickCooldown <= 0.05) {
        // 已在 btnStick click 播過，這裡不重複
      }
      prev.stickCooldown = S.stickCooldown;

      // 金錢跳動（訓練 / 收益）→ 低頻提示音
      // 不用每幀，1 秒內差額超過閾值才播
      // 省略以避免吵雜

      // 寵物新增 / 進背包
      if (S.pets.length > prev.petsCount) play('reward');
      else if (S.bag.length > prev.bagCount) play('reward');
      prev.petsCount = S.pets.length;
      prev.bagCount = S.bag.length;

      // 圖鑑新發現
      // G.IndexData 未對外，改從 UI 讀
      const idxEl = document.getElementById('uiIndex');
      if (idxEl) {
        const txt = idxEl.textContent;
        if (txt !== prev.indexSize) {
          const cur = parseInt(txt.split('/')[0]) || 0;
          if (cur > (prev.indexSize || 0)) play('discover');
          prev.indexSize = cur;
        }
      }

      // 棒子 / 軌跡新增
      const sticksEl = document.getElementById('uiSticks');
      if (sticksEl) {
        const n = parseInt(sticksEl.textContent) || 0;
        if (n > prev.sticksCount) play('reward');
        prev.sticksCount = n;
      }
      const trailEl = document.getElementById('uiTrail');
      if (trailEl) {
        const t = trailEl.textContent;
        if (t !== '無' && t !== prev.trailText && prev.trailText !== undefined) play('reward');
        prev.trailText = t;
      }
    });

    // 點擊：蛋、孵蛋器、寵物（補專屬音，clickSoft 已統一）
    H.onClick.push(function (wx, wy) {
      if (S.night || S.player.carry) return false;
      for (const egg of S.eggs) {
        if (egg.collected) continue;
        if (Math.hypot(wx - egg.x, wy - egg.y) < egg.r + 40) {
          if (Math.hypot(S.player.x - egg.x, S.player.y - egg.y) < 120) play('eggPick');
        }
      }
      return false;
    });
    H.onClick.push(function (wx, wy) {
      for (const h of S.hatchery) {
        if (h.finished && Math.hypot(wx - h.x, wy - h.y) < 40 && !h.favorite) { play('eggOpen'); return false; }
        if (Math.hypot(wx - (h.x + 22), wy - (h.y - 34)) < 22) { play('clickSoft'); return false; }
      }
      return false;
    });
    H.onClick.push(function (wx, wy) {
      for (const p of S.pets) {
        if (Math.hypot(wx - p.x, wy - p.y) < 30) { play('clickSoft'); return false; }
      }
      return false;
    });

    // 抓「被攻擊 / 被搶蛋」：firebase hits 由 G 內部處理，但我們可從 toast 觀察
    // 用 MutationObserver 監聽 toast 文字
    const toastObs = new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1 || !n.classList) continue;
          if (n.classList.contains('toast')) {
            const t = n.textContent || '';
            if (t.includes('搶走了你的蛋') || t.includes('搶到')) play('stealEgg');
            else if (t.includes('打飛') || t.includes('打中')) { play('hit'); setTimeout(() => play('knockback'), 50); }
            else if (t.includes('你被') && t.includes('打')) play('hurt');
            else if (t.includes('守衛把蛋')) play('guardHit');
            else if (t.includes('成功偷到蛋')) play('eggDeposit');
            else if (t.includes('孵好了') || t.includes('孵好')) play('hatchReady');
            else if (t.includes('新發現') || t.includes('圖鑑全解鎖')) play('discover');
            else if (t.includes('已獲得') || t.includes('已購買')) play('reward');
            else if (t.includes('夜晚') && t.includes('來臨')) play('nightFall');
            else if (t.includes('白天')) play('dayRise');
            else if (t.includes('❌') || t.includes('失敗') || t.includes('不足') || t.includes('無法')) play('error');
            else if (t.includes('已出售') || t.includes('獲得 $')) play('buy');
            else if (t.includes('教學完成')) play('tutorialDone');
            else if (t.includes('萬聖節') && t.includes('開始')) { /* hw 自己處理 */ }
            else if (t.includes('萬聖節') && t.includes('結束')) { /* hw 自己處理 */ }
          }
        }
      }
    });
    toastObs.observe(document.body, { childList: true, subtree: true });

    // 直接觀察左側動態按鈕（被守衛打時 stun 閃爍，但偵測不到，改以 toast 為主）
  }

  /* ============ 萬聖節外掛 ============ */
  function hookHalloween() {
    document.addEventListener('click', e => {
      const t = e.target;
      if (!t || !t.id) return;
      if (t.id === 'btnBuyFrag') play('buyFragment');
      if (t.id === 'btnHalloween') play('openPanel');
      if (t.id === 'btnCloseHalloween') play('closePanel');
    }, true);

    const notice = document.getElementById('candyNotice');
    if (notice) {
      new MutationObserver(() => {
        if (notice.classList.contains('show')) play('candySpawn');
      }).observe(notice, { attributes: true, childList: true, characterData: true, subtree: true });
    }

    new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          const t = n.textContent || '';
          if (t.includes('🎉 成功') || t.includes('成功！')) play('mutationSuccess');
          else if (t.includes('💨 失敗') || t.includes('失敗了')) play('mutationFail');
        }
      }
    }).observe(document.body, { childList: true, subtree: true });

    let hwActive = false;
    setInterval(() => {
      const stat = document.getElementById('hwTokensStat');
      const nowActive = !!(stat && stat.style.display !== 'none');
      if (nowActive && !hwActive) {
        hwActive = true; play('hwStart'); setBgmMode('halloween');
      } else if (!nowActive && hwActive) {
        hwActive = false; play('hwEnd'); setBgmMode('normal');
      }
    }, 1000);
  }

  /* ============ Init ============ */
  function init() {
    ensureCtx();
    setupBGM();
    hookButtons();
    installGameHooks();
    hookHalloween();

    window.Sound = {
      play, setMuted, toggleMute, isMuted, setBgmMode,
      setBgmUrl: (url) => { BGM_URL = url; setupBGM(); },
      setHalloweenBgmUrl: (url) => { BGM_HALLOWEEN = url; setupBGM(); },
      getCtx: () => ctx, get SFX() { return SFX; },
    };
    console.log('🔊 音效系統 v3 已載入');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
