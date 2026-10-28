/* ===================================================================
 * 🔊 sound.js  — 全遊戲音效（Web Audio 即時合成，無需音檔）
 * BGM 用 <audio>，連結在 BGM_URL 改
 * =================================================================== */
(function () {
  'use strict';

  /* ==== 唯一需要你改的地方 ==== */
  const BGM_URL = ''; // ← 之後貼 mp3/ogg 連結；留空 = 不播 BGM

  /* ==== 音量設定 ==== */
  const VOL_MASTER = 0.7;
  const VOL_SFX    = 0.5;
  const VOL_BGM    = 0.35;

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
  // 單音：頻率可滑音
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

  // 噪音：爆炸、打擊
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

  // 和弦/音階（升級、解鎖感）
  function arpeggio(freqs, { step=0.07, dur=0.15, vol=0.22, type='triangle', delay=0 }) {
    freqs.forEach((f, i) => tone({ type, freq: f, dur, vol, delay: delay + i * step }));
  }

  /* ============ 音效定義 ============ */
  const SFX = {
    // 基本 UI
    click:      () => tone({ type:'square', freq:800, dur:0.05, vol:0.12 }),
    clickSoft:  () => tone({ type:'sine',   freq:600, dur:0.06, vol:0.10 }),
    openPanel:  () => { tone({ type:'sine', freq:520, slideTo:760, dur:0.12, vol:0.15 }); },
    closePanel: () => { tone({ type:'sine', freq:760, slideTo:520, dur:0.12, vol:0.15 }); },
    error:      () => { tone({ type:'square', freq:180, dur:0.08, vol:0.18 });
                        tone({ type:'square', freq:140, dur:0.12, vol:0.18, delay:0.09 }); },
    toast:      () => tone({ type:'triangle', freq:880, dur:0.08, vol:0.12 }),

    // 跑步機 / 金錢
    trainTick:  () => tone({ type:'square', freq:1200, dur:0.03, vol:0.06 }),
    buy:        () => { tone({ type:'triangle', freq:660, dur:0.08, vol:0.22 });
                        tone({ type:'triangle', freq:990, dur:0.12, vol:0.22, delay:0.07 }); },
    cash:       () => tone({ type:'sine', freq:1046, dur:0.06, vol:0.08 }),

    // 偷蛋 / 孵化
    eggPick:    () => { tone({ type:'sine', freq:520, slideTo:880, dur:0.12, vol:0.2 });
                        tone({ type:'sine', freq:1040, dur:0.1, vol:0.15, delay:0.08 }); },
    eggDrop:    () => { tone({ type:'sine', freq:700, slideTo:200, dur:0.2, vol:0.25 });
                        noise({ dur:0.15, vol:0.18, type:'lowpass', freq:600 }); },
    eggDeposit: () => { arpeggio([523,659,784], { step:0.06, dur:0.12, vol:0.18 }); },
    hatchReady: () => { arpeggio([784,1047,1319], { step:0.08, dur:0.15, vol:0.2 }); },
    eggOpen:    () => { // 誕生
                     noise({ dur:0.25, vol:0.25, type:'bandpass', freq:1500, slideTo:4000 });
                     arpeggio([523,659,784,1047,1319], { step:0.06, dur:0.2, vol:0.22, type:'triangle' });
                   },
    discover:   () => { // 新圖鑑
                     arpeggio([880,1109,1319,1760], { step:0.08, dur:0.18, vol:0.22 });
                   },
    reward:     () => { // 圖鑑獎勵
                     arpeggio([660,880,1100], { step:0.06, dur:0.12, vol:0.18 });
                   },

    // 戰鬥
    attack:     () => { noise({ dur:0.08, vol:0.25, type:'highpass', freq:1200 }); },
    attackBare: () => { noise({ dur:0.05, vol:0.15, type:'bandpass', freq:800 }); },
    hit:        () => { noise({ dur:0.15, vol:0.4, type:'lowpass', freq:1200, slideTo:200 });
                        tone({ type:'sawtooth', freq:180, slideTo:60, dur:0.15, vol:0.22 }); },
    knockback:  () => { tone({ type:'sawtooth', freq:300, slideTo:80, dur:0.3, vol:0.3 });
                        noise({ dur:0.2, vol:0.25, type:'lowpass', freq:800 }); },
    stealEgg:   () => { tone({ type:'square', freq:400, slideTo:900, dur:0.18, vol:0.25 });
                        arpeggio([1047,1319,1568], { step:0.05, dur:0.1, vol:0.18, delay:0.15 }); },

    // 守衛
    guardWake:  () => { tone({ type:'sawtooth', freq:200, slideTo:600, dur:0.35, vol:0.28 }); },
    guardAlert: () => { tone({ type:'square', freq:880, dur:0.08, vol:0.22 });
                        tone({ type:'square', freq:1100, dur:0.08, vol:0.22, delay:0.09 }); },
    guardReturn:() => tone({ type:'sine', freq:440, slideTo:220, dur:0.3, vol:0.15 }),

    // 夜晚 / 白天
    nightFall:  () => { tone({ type:'sine', freq:400, slideTo:120, dur:0.6, vol:0.22 });
                        tone({ type:'sine', freq:300, slideTo:80, dur:0.7, vol:0.18, delay:0.1 }); },
    dayRise:    () => { tone({ type:'triangle', freq:300, slideTo:900, dur:0.5, vol:0.22 });
                        arpeggio([660,880], { step:0.08, dur:0.15, vol:0.16, delay:0.4 }); },

    // 廣告 / 領取
    adShow:     () => tone({ type:'triangle', freq:660, dur:0.1, vol:0.15 }),
    adSuccess:  () => { arpeggio([523,659,784,1047], { step:0.07, dur:0.15, vol:0.22 }); },
    adFail:     () => SFX.error(),
    notify:     () => { tone({ type:'sine', freq:880, dur:0.08, vol:0.15 });
                        tone({ type:'sine', freq:1175, dur:0.15, vol:0.15, delay:0.08 }); },

    // 萬聖節
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

    // 教學
    tutorial:   () => { tone({ type:'triangle', freq:600, dur:0.1, vol:0.15 });
                        tone({ type:'triangle', freq:900, dur:0.15, vol:0.15, delay:0.1 }); },
    tutorialDone:() => { arpeggio([523,659,784,1047,1319,1568], { step:0.07, dur:0.2, vol:0.25, type:'triangle' }); },

    // 變異倍率提示
    multiplier: () => { arpeggio([880,1109,1319], { step:0.05, dur:0.1, vol:0.18 }); },
  };

  /* ============ 播放 API ============ */
  function play(name) {
    if (muted) return;
    const fn = SFX[name];
    if (!fn) { console.warn('[sound] 未定義音效：', name); return; }
    try { ensureCtx(); fn(); } catch (err) { console.warn('播放音效失敗:', name, err); }
  }

  /* ============ BGM ============ */
  let bgmAudio = null;
  function setupBGM() {
    if (!BGM_URL) return;
    bgmAudio = new Audio(BGM_URL);
    bgmAudio.loop = true;
    bgmAudio.volume = VOL_BGM * VOL_MASTER;
    // 必須使用者互動才能播放
    const startBgm = () => {
      if (bgmAudio) bgmAudio.play().catch(() => {});
      window.removeEventListener('pointerdown', startBgm);
      window.removeEventListener('keydown', startBgm);
    };
    window.addEventListener('pointerdown', startBgm, { once: false });
    window.addEventListener('keydown', startBgm, { once: false });
  }

  /* ============ 靜音控制 ============ */
  function setMuted(m) {
    muted = !!m;
    if (masterGain) masterGain.gain.value = muted ? 0 : VOL_MASTER;
    if (bgmAudio) bgmAudio.muted = muted;
  }
  function toggleMute() { setMuted(!muted); return muted; }
  function isMuted() { return muted; }

  /* ============ 對外掛鉤子 ============ */
  // 在 steal_an_egg.html 裡的 showToast 就是「任何提示」都適用
  function installHooks() {
    const G = window.raingodGame;
    if (!G) { setTimeout(installHooks, 100); return; }

    // 攔截 showToast：依訊息內容分類播放音效
    const origToast = G.showToast;
    if (!origToast.__soundHooked) {
      const wrapped = function (msg, bg1, bg2) {
        playToastSfx(String(msg || ''));
        return origToast.call(G, msg, bg1, bg2);
      };
      wrapped.__soundHooked = true;
      // 同時覆蓋 document 內的 showToast（onclick 呼叫的是閉包內的 showToast，
      // 實際上是同一個函式參照，因此覆蓋 G.showToast 不會影響閉包；
      // 這裡改以「包一層 window 全域」的方式，讓後續遊戲程式碼在呼叫前先播放音效）
      window.__soundToast = wrapped;
      G.showToast = wrapped;
    }
  }

  function playToastSfx(msg) {
    if (msg.includes('已出售') || msg.includes('獲得 $')) return play('buy');
    if (msg.includes('購買') || msg.includes('已獲得【') && msg.includes('×')) return play('reward');
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

  // 遊戲事件音效：用 DOM 監聽按鈕
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
      if (el) {
        el.addEventListener('click', () => play(sfx), true);
      }
    });

    // btnStick（攻擊）用專用音效
    const atk = document.getElementById('btnStick');
    if (atk) {
      atk.addEventListener('click', () => {
        // 看是否有裝備棒子
        const G = window.raingodGame;
        const st = G && G.getEquippedStick && G.getEquippedStick();
        play(st ? 'attack' : 'attackBare');
      }, true);
    }
    // 廣告按鈕
    ['btnAd','btnAd4x','btnAd8x','btnAd16x','btnAd32x'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => play('adShow'), true);
    });

    // 畫布點擊：蛋、寵物、糖果（交給各 hook 播放）
    const c = document.getElementById('c');
    if (c) {
      c.addEventListener('click', () => play('clickSoft'), true);
    }
  }

  /* ============ 全域 hook 掛載 ============ */
  function installCanvasHooks() {
    const G = window.raingodGame;
    if (!G || !G.HOOKS) { setTimeout(installCanvasHooks, 150); return; }
    if (installCanvasHooks.__done) return;
    installCanvasHooks.__done = true;
    const H = G.HOOKS;

    // 蛋／守衛的更新：偵測醒來狀態
    H.onUpdate.push(function (dt) {
      // 守衛變化
      const now = G.S.guards || [];
      now.forEach(g => {
        if (!g.__soundState) g.__soundState = { sleeping: g.sleeping, chasing: g.chasing, dashPhase: g.dashPhase, alert: g.alert };
        const st = g.__soundState;
        if (g.wakeTimer > 0 && st.sleeping) play('guardWake');
        if (g.chasing && !st.chasing) play('guardAlert');
        if (g.dashPhase && !st.dashPhase) play('guardAlert');
        if (g.returning && !st.returning && (st.chasing || st.dashPhase)) play('guardReturn');
        st.sleeping = g.sleeping; st.chasing = g.chasing; st.dashPhase = g.dashPhase; st.alert = g.alert;
      });
    });

    // 蛋拾取：onClick 掛在蛋上時，依「是否有東西被拿走」來發音
    H.onClick.push(function (wx, wy) {
      const G2 = window.raingodGame;
      const S = G2.S;
      if (S.night) return false;
      if (S.player.carry) return false;
      for (const egg of S.eggs) {
        if (egg.collected) continue;
        if (Math.hypot(wx - egg.x, wy - egg.y) < egg.r + 40) {
          if (Math.hypot(S.player.x - egg.x, S.player.y - egg.y) < 120) {
            play('eggPick');
            return false; // 不吞掉事件，讓主遊戲照常處理
          }
        }
      }
      return false;
    });

    // 孵蛋器點擊（打開蛋 / 收藏）
    H.onClick.push(function (wx, wy) {
      const G2 = window.raingodGame;
      const S = G2.S;
      for (const h of S.hatchery) {
        if (h.finished && Math.hypot(wx - h.x, wy - h.y) < 40 && !h.favorite) {
          play('eggOpen');
          return false;
        }
        if (Math.hypot(wx - (h.x + 22), wy - (h.y - 34)) < 22) {
          play('clickSoft');
          return false;
        }
      }
      return false;
    });

    // 寵物面板點擊
    H.onClick.push(function (wx, wy) {
      const G2 = window.raingodGame;
      const S = G2.S;
      for (const p of S.pets) {
        if (Math.hypot(wx - p.x, wy - p.y) < 30) { play('clickSoft'); return false; }
      }
      return false;
    });
  }

  /* ============ 萬聖節外掛（halloween.js）掛鉤 ============ */
  function hookHalloween() {
    // 等 halloween.js 把糖果掛進 S 或 window（halloween 是封閉 IIFE，只能靠 UI 事件）
    // 觀察 .halloween-panel 開關、糖果通知
    const obs = new MutationObserver(() => {
      const panel = document.getElementById('halloweenPanel');
      if (panel && panel.classList.contains('open')) play('openPanel');
    });
    // 購買碎片
    document.addEventListener('click', e => {
      const t = e.target;
      if (!t || !t.id) return;
      if (t.id === 'btnBuyFrag') play('buyFragment');
      if (t.id === 'btnHalloween') play('openPanel');
      if (t.id === 'btnCloseHalloween') play('closePanel');
    }, true);

    // 糖果通知（candyNotice 的文字被寫入時就播放）
    const notice = document.getElementById('candyNotice');
    if (notice) {
      const mo = new MutationObserver(() => {
        if (notice.classList.contains('show')) play('candySpawn');
      });
      mo.observe(notice, { attributes: true, childList: true, characterData: true, subtree: true });
    }

    // 變異結果大提示：攔截新增的節點
    const bodyObs = new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          const t = n.textContent || '';
          if (t.includes('🎉 成功') || t.includes('成功！')) play('mutationSuccess');
          else if (t.includes('💨 失敗') || t.includes('失敗了')) play('mutationFail');
        }
      }
    });
    bodyObs.observe(document.body, { childList: true, subtree: true });

    // 蛋變異成功 / 失敗：攔截 showMutationResult（halloween.js 是封閉的，用 DOM 已足夠）
    // 萬聖節活動開始 / 結束：靠 stat 顯示與否
    let hwActive = false;
    setInterval(() => {
      const stat = document.getElementById('hwTokensStat');
      const nowActive = stat && stat.style.display !== 'none';
      if (nowActive && !hwActive) { hwActive = true; play('hwStart'); }
      else if (!nowActive && hwActive) { hwActive = false; play('hwEnd'); }
    }, 1000);
  }

  /* ============ 初始化 ============ */
  function init() {
    ensureCtx();
    setupBGM();
    // 第一次互動解鎖音訊
    const unlock = () => {
      ensureCtx();
      if (bgmAudio && BGM_URL) bgmAudio.play().catch(() => {});
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    hookButtons();
    installCanvasHooks();
    hookHalloween();
    installHooks();

    // 公開 API
    window.Sound = {
      play,
      setMuted,
      toggleMute,
      isMuted,
      setBgmUrl: (url) => {
        BGM_URL = url;
        if (bgmAudio) { bgmAudio.pause(); bgmAudio = null; }
        setupBGM();
      },
      getCtx: () => ctx,
    };
    console.log('🔊 音效系統已載入 (Sound.play("click"))');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
