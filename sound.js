/* ===================================================================
 * 🔊 sound.js  — 全遊戲音效（Web Audio 即時合成，無需音檔）
 * BGM 雙軌：平常音樂 / 萬聖節音樂（活動時播 N 次後切回平常）
 * =================================================================== */
(function () {
  'use strict';

  /* ==== 唯一需要你改的地方 ==== */
  let BGM_URL       = 'raingod0101.github.io/Aventure - A Beautiful Garden (freetouse.com).mp3'; // ← 平常背景音樂連結（留空 = 不播）
  let BGM_HALLOWEEN = 'raingod0101.github.io/Chill Pulse - Icicle (freetouse.com).mp3'; // ← 萬聖節活動音樂連結（留空 = 不播）

  /* ==== 音量設定 ==== */
  const VOL_MASTER = 0.7;
  const VOL_SFX    = 0.5;
  const VOL_BGM    = 0.35;

  /* ==== 萬聖節音樂播幾次 ==== */
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

  /* ============ 基礎合成器 ============ */
  function tone({ type='sine', freq=440, slideTo=null, dur=0.2, vol=0.3, delay=0, curve='exp' }) {
    const c = ensureCtx(), t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
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

  /* ============ 音效定義 ============ */
  const SFX = {
    click:      () => tone({ type:'square', freq:800, dur:0.05, vol:0.12 }),
    clickSoft:  () => tone({ type:'sine',   freq:600, dur:0.06, vol:0.10 }),
    openPanel:  () => { tone({ type:'sine', freq:520, slideTo:760, dur:0.12, vol:0.15 }); },
    closePanel: () => { tone({ type:'sine', freq:760, slideTo:520, dur:0.12, vol:0.15 }); },
    error:      () => { tone({ type:'square', freq:180, dur:0.08, vol:0.18 });
                        tone({ type:'square', freq:140, dur:0.12, vol:0.18, delay:0.09 }); },
    toast:      () => tone({ type:'triangle', freq:880, dur:0.08, vol:0.12 }),

    trainTick:  () => tone({ type:'square', freq:1200, dur:0.03, vol:0.06 }),
    buy:        () => { tone({ type:'triangle', freq:660, dur:0.08, vol:0.22 });
                        tone({ type:'triangle', freq:990, dur:0.12, vol:0.22, delay:0.07 }); },
    cash:       () => tone({ type:'sine', freq:1046, dur:0.06, vol:0.08 }),

    eggPick:    () => { tone({ type:'sine', freq:520, slideTo:880, dur:0.12, vol:0.2 });
                        tone({ type:'sine', freq:1040, dur:0.1, vol:0.15, delay:0.08 }); },
    eggDrop:    () => { tone({ type:'sine', freq:700, slideTo:200, dur:0.2, vol:0.25 });
                        noise({ dur:0.15, vol:0.18, type:'lowpass', freq:600 }); },
    eggDeposit: () => { arpeggio([523,659,784], { step:0.06, dur:0.12, vol:0.18 }); },
    hatchReady: () => { arpeggio([784,1047,1319], { step:0.08, dur:0.15, vol:0.2 }); },
    eggOpen:    () => {
                     noise({ dur:0.25, vol:0.25, type:'bandpass', freq:1500, slideTo:4000 });
                     arpeggio([523,659,784,1047,1319], { step:0.06, dur:0.2, vol:0.22, type:'triangle' });
                   },
    discover:   () => { arpeggio([880,1109,1319,1760], { step:0.08, dur:0.18, vol:0.22 }); },
    reward:     () => { arpeggio([660,880,1100], { step:0.06, dur:0.12, vol:0.18 }); },

    attack:     () => { noise({ dur:0.08, vol:0.25, type:'highpass', freq:1200 }); },
    attackBare: () => { noise({ dur:0.05, vol:0.15, type:'bandpass', freq:800 }); },
    hit:        () => { noise({ dur:0.15, vol:0.4, type:'lowpass', freq:1200, slideTo:200 });
                        tone({ type:'sawtooth', freq:180, slideTo:60, dur:0.15, vol:0.22 }); },
    knockback:  () => { tone({ type:'sawtooth', freq:300, slideTo:80, dur:0.3, vol:0.3 });
                        noise({ dur:0.2, vol:0.25, type:'lowpass', freq:800 }); },
    stealEgg:   () => { tone({ type:'square', freq:400, slideTo:900, dur:0.18, vol:0.25 });
                        arpeggio([1047,1319,1568], { step:0.05, dur:0.1, vol:0.18, delay:0.15 }); },

    guardWake:  () => { tone({ type:'sawtooth', freq:200, slideTo:600, dur:0.35, vol:0.28 }); },
    guardAlert: () => { tone({ type:'square', freq:880, dur:0.08, vol:0.22 });
                        tone({ type:'square', freq:1100, dur:0.08, vol:0.22, delay:0.09 }); },
    guardReturn:() => tone({ type:'sine', freq:440, slideTo:220, dur:0.3, vol:0.15 }),

    nightFall:  () => { tone({ type:'sine', freq:400, slideTo:120, dur:0.6, vol:0.22 });
                        tone({ type:'sine', freq:300, slideTo:80, dur:0.7, vol:0.18, delay:0.1 }); },
    dayRise:    () => { tone({ type:'triangle', freq:300, slideTo:900, dur:0.5, vol:0.22 });
                        arpeggio([660,880], { step:0.08, dur:0.15, vol:0.16, delay:0.4 }); },

    adShow:     () => tone({ type:'triangle', freq:660, dur:0.1, vol:0.15 }),
    adSuccess:  () => { arpeggio([523,659,784,1047], { step:0.07, dur:0.15, vol:0.22 }); },
    adFail:     () => SFX.error(),
    notify:     () => { tone({ type:'sine', freq:880, dur:0.08, vol:0.15 });
                        tone({ type:'sine', freq:1175, dur:0.15, vol:0.15, delay:0.08 }); },

    candySpawn: () => tone({ type:'sine', freq:1200, dur:0.06, vol:0.08 }),
    candyPick:  () => { tone({ type:'triangle', freq:880, slideTo:1320, dur:0.12, vol:0.22 });
                        tone({ type:'triangle', freq:1760, dur:0.1, vol:0.15, delay:0.08 }); },
    mutationSuccess: () => { arpeggio([523,659,784,1047,1319], { step:0.07, dur:0.22, vol:0.25, type:'triangle' });
                             noise({ dur:0.3, vol:0.2, type:'highpass', freq:2000, delay:0.35 }); },
    mutationFail:    () => { tone({ type:'sawtooth', freq:300, slideTo:100, dur:0.4, vol:0.25 });
                             noise({ dur:0.25, vol:0.2, type:'lowpass', freq:600 }); },
    hwStart:    () => { tone({ type:'sine', freq:200, slideTo:800, dur:0.4, vol:0.25 });
                        arpeggio([440,554,659,880], { step:0.06, dur:0.15, vol:0.2, delay:0.4 }); },
    hwEnd:      () => { tone({ type:'sine', freq:800, slideTo:200, dur:0.5, vol:0.22 }); },
    buyFragment:() => { SFX.buy(); },

    tutorial:   () => { tone({ type:'triangle', freq:600, dur:0.1, vol:0.15 });
                        tone({ type:'triangle', freq:900, dur:0.15, vol:0.15, delay:0.1 }); },
    tutorialDone:() => { arpeggio([523,659,784,1047,1319,1568], { step:0.07, dur:0.2, vol:0.25, type:'triangle' }); },

    multiplier: () => { arpeggio([880,1109,1319], { step:0.05, dur:0.1, vol:0.18 }); },
  };

  function play(name) {
    if (muted) return;
    const fn = SFX[name];
    if (!fn) { console.warn('[sound] 未定義音效：', name); return; }
    try { ensureCtx(); fn(); } catch (err) { console.warn('播放音效失敗:', name, err); }
  }

  /* ============ BGM（雙軌：平常 / 萬聖節） ============ */
  let bgmNormal    = null;
  let bgmHalloween = null;
  let bgmMode      = 'none';   // 'normal' | 'halloween' | 'none'
  let bgmUnlocked  = false;
  let hwRepeatLeft = 0;

  function createAudio(url, loop) {
    if (!url) return null;
    const a = new Audio(url);
    a.loop = loop;
    a.volume = VOL_BGM * VOL_MASTER;
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
          bgmHalloween.play().catch(() => {});
        } else {
          switchToNormalBgm();
        }
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
      bgmHalloween.play().catch(() => {});
    } else if (bgmMode === 'normal' && bgmNormal) {
      if (bgmHalloween) bgmHalloween.pause();
      bgmNormal.play().catch(() => {});
    }
  }

  function switchToNormalBgm() {
    bgmMode = 'normal';
    if (bgmHalloween) bgmHalloween.pause();
    if (bgmNormal) {
      bgmNormal.currentTime = 0;
      bgmNormal.play().catch(() => {});
    }
  }

  function setBgmMode(mode) {
    if (mode !== 'normal' && mode !== 'halloween') return;
    if (bgmMode === mode) return;
    bgmMode = mode;
    applyBgmMode();
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

  /* ============ 靜音 ============ */
  function setMuted(m) {
    muted = !!m;
    if (masterGain) masterGain.gain.value = muted ? 0 : VOL_MASTER;
    if (bgmNormal)    bgmNormal.muted = muted;
    if (bgmHalloween) bgmHalloween.muted = muted;
  }
  function toggleMute() { setMuted(!muted); return muted; }
  function isMuted() { return muted; }

  /* ============ Toast 音效分類 ============ */
  function playToastSfx(msg) {
    if (msg.includes('已出售') || msg.includes('獲得 $')) return play('buy');
    if (msg.includes('購買') || (msg.includes('已獲得【') && msg.includes('×'))) return play('reward');
    if (msg.includes('新發現') || msg.includes('圖鑑')) return play('discover');
    if (msg.includes('孵好') || msg.includes('孵化')) return play('hatchReady');
    if (msg.includes('成功偷到蛋') || msg.includes('放入孵化器')) return play('eggDeposit');
    if (msg.includes('搶走') || msg.includes('打飛') || msg.includes('打中')) return play('hit');
    if (msg.includes('夜晚') && msg.includes('來臨')) return play('nightFall');
    if (msg.includes('白天')) return play('dayRise');
    if (msg.includes('訂閱') || msg.includes('驗證')) return play('reward');
    if (msg.includes('❌') || msg.includes('失敗') || msg.includes('不足') || msg.includes('無法')) return play('error');
    if (msg.includes('存檔')) return play('notify');
    if (msg.includes('教學') && msg.includes('完成')) return play('tutorialDone');
    if (msg.includes('棒子') && msg.includes('獲得')) return play('reward');
    if (msg.includes('軌跡')) return play('reward');
    if (msg.includes('變異') && msg.includes('失敗')) return play('mutationFail');
    if (msg.includes('變異') && (msg.includes('成功') || msg.includes('獲得'))) return play('mutationSuccess');
    return play('notify');
  }

  /* ============ 按鈕音效 ============ */
  function hookButtons() {
    const map = {
      btnUp: 'buy',
      btnUpgradeCap: 'buy',
      btnBest: 'buy',
      btnIndex: 'openPanel',
      btnCloseIndex: 'closePanel',
      btnBag: 'openPanel',
      btnCloseBag: 'closePanel',
      btnStickPanel: 'openPanel',
      btnCloseStickPanel: 'closePanel',
      btnTrail: 'openPanel',
      btnCloseTrailPanel: 'closePanel',
      btnSellSelected: 'buy',
      btnSellPanel: 'buy',
      btnClosePanel: 'closePanel',
      btnReturn: 'closePanel',
      btnSubscribe: 'notify',
      subVerifyBtn: 'notify',
      subCloseBtn: 'closePanel',
      adClaimBtn: 'adSuccess',
      adCloseBtn: 'adFail',
      testTriggerBtn: 'openPanel',
      btnCloseTest: 'closePanel',
      btnClosePI: 'closePanel',
    };
    Object.entries(map).forEach(([id, sfx]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => play(sfx), true);
    });

    const atk = document.getElementById('btnStick');
    if (atk) {
      atk.addEventListener('click', () => {
        const G = window.raingodGame;
        const st = G && G.getEquippedStick && G.getEquippedStick();
        play(st ? 'attack' : 'attackBare');
      }, true);
    }

    ['btnAd','btnAd4x','btnAd8x','btnAd16x','btnAd32x'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => play('adShow'), true);
    });

    const c = document.getElementById('c');
    if (c) c.addEventListener('click', () => play('clickSoft'), true);
  }

  /* ============ 遊戲事件 hook ============ */
  function installCanvasHooks() {
    const G = window.raingodGame;
    if (!G || !G.HOOKS) { setTimeout(installCanvasHooks, 150); return; }
    if (installCanvasHooks.__done) return;
    installCanvasHooks.__done = true;
    const H = G.HOOKS;

    H.onUpdate.push(function (dt) {
      const list = G.S.guards || [];
      list.forEach(g => {
        if (!g.__soundState) g.__soundState = { sleeping: g.sleeping, chasing: g.chasing, dashPhase: g.dashPhase, alert: g.alert };
        const st = g.__soundState;
        if (g.wakeTimer > 0 && st.sleeping) play('guardWake');
        if (g.chasing && !st.chasing) play('guardAlert');
        if (g.dashPhase && !st.dashPhase) play('guardAlert');
        if (g.returning && !st.returning && (st.chasing || st.dashPhase)) play('guardReturn');
        st.sleeping = g.sleeping; st.chasing = g.chasing; st.dashPhase = g.dashPhase; st.alert = g.alert;
      });
    });

    H.onClick.push(function (wx, wy) {
      const S = G.S;
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
      const S = G.S;
      for (const h of S.hatchery) {
        if (h.finished && Math.hypot(wx - h.x, wy - h.y) < 40 && !h.favorite) { play('eggOpen'); return false; }
        if (Math.hypot(wx - (h.x + 22), wy - (h.y - 34)) < 22) { play('clickSoft'); return false; }
      }
      return false;
    });

    H.onClick.push(function (wx, wy) {
      const S = G.S;
      for (const p of S.pets) {
        if (Math.hypot(wx - p.x, wy - p.y) < 30) { play('clickSoft'); return false; }
      }
      return false;
    });
  }

  /* ============ 萬聖節外掛掛鉤 ============ */
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

    // 萬聖節活動開始 / 結束 → 切換 BGM
    let hwActive = false;
    setInterval(() => {
      const stat = document.getElementById('hwTokensStat');
      const nowActive = !!(stat && stat.style.display !== 'none');
      if (nowActive && !hwActive) {
        hwActive = true;
        play('hwStart');
        setBgmMode('halloween');
      } else if (!nowActive && hwActive) {
        hwActive = false;
        play('hwEnd');
        setBgmMode('normal');
      }
    }, 1000);
  }

  /* ============ showToast 音效 ============ */
  function installToastHook() {
    const G = window.raingodGame;
    if (!G) { setTimeout(installToastHook, 120); return; }
    if (G.showToast.__soundHooked) return;
    const orig = G.showToast;
    const wrapped = function (msg, bg1, bg2) {
      playToastSfx(String(msg || ''));
      return orig.call(G, msg, bg1, bg2);
    };
    wrapped.__soundHooked = true;
    G.showToast = wrapped;
  }

  /* ============ 初始化 ============ */
  function init() {
    ensureCtx();
    setupBGM();
    hookButtons();
    installCanvasHooks();
    hookHalloween();
    installToastHook();

    window.Sound = {
      play,
      setMuted,
      toggleMute,
      isMuted,
      setBgmMode,
      setBgmUrl: (url) => { BGM_URL = url; setupBGM(); },
      setHalloweenBgmUrl: (url) => { BGM_HALLOWEEN = url; setupBGM(); },
      getCtx: () => ctx,
      get SFX() { return SFX; },
    };
    console.log('🔊 音效系統已載入');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
