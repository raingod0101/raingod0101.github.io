// stealeggs-save.js
// Steal Eggs 專用存檔模組（單人 + UID 雲端帳號存檔）
// 依賴：Firebase compat SDK、menu.js 提供的 window.raingodSave / window.raingodInitGame /
//        window.raingodFirebaseReady / window.raingodAuthReady /
//        window.raingodAccountDataReady / window.raingodWaitForAccountData
(function (global) {
  'use strict';

  const GAME_ID = 'steal_egg_v17';
  const SAVE_VERSION = 17;
  const SAVE_KEY = 'steal_an_egg_v17';            // 舊版本機 key（保留遷移用）
  const SAVE_KEY_GENERIC = 'raingod_save_' + GAME_ID; // 給 menu.js 帳號同步用的 key

  let __saveEnabled = false;
  let __loadingPromise = null;
  let __saveTimer = null;

  function getFirebase() {
    try { return global.firebase || null; } catch (e) { return null; }
  }

  function isSaveEnabled() { return __saveEnabled; }
  function setSaveEnabled(v) { __saveEnabled = !!v; }

  // ------------------------------------------------------------
  // 雲端參照（舊路徑直讀，作為 raingodInitGame 的 fallback）
  // ------------------------------------------------------------
  function getStealEggCloudRef(uid) {
    try {
      const fb = getFirebase();
      if (!uid || !fb || !fb.database) return null;
      return fb.database().ref(`raingod_accounts/${uid}/games/${GAME_ID}`);
    } catch (e) {
      console.warn('[steal-eggs-save] 建立雲端存檔參照失敗', e);
      return null;
    }
  }

  async function loadStealEggCloud(uid) {
    if (!uid) return null;
    try {
      const ref = getStealEggCloudRef(uid);
      if (!ref) return null;
      const snap = await ref.once('value');
      if (!snap.exists()) return null;
      const val = snap.val();
      const data = val && val.data !== undefined ? val.data : val;
      if (!data || data.version !== SAVE_VERSION) return null;
      return data;
    } catch (e) {
      console.warn('[steal-eggs-save] 雲端存檔讀取失敗', e);
      return null;
    }
  }

  // ------------------------------------------------------------
  // 序列化 / 反序列化
  // ------------------------------------------------------------
  function serializeState(S, IndexData) {
    return {
      version: SAVE_VERSION,
      displaySpeed: S.player.displaySpeed,
      tsLv: S.player.tsLv,
      px: S.player.x,
      py: S.player.y,
      cash: S.cash,
      playerName: S.playerName,
      pets: S.pets.map(p => ({
        name: p.name, inc: p.inc, rar: p.rar,
        biomeIdx: p.biomeIdx, petIdx: p.petIdx, slot: p.slot,
        size: p.size, state: p.state, mutations: p.mutations || {}
      })),
      bag: S.bag.map(p => ({
        name: p.name, inc: p.inc, rar: p.rar,
        biomeIdx: p.biomeIdx, petIdx: p.petIdx, size: p.size,
        mutations: p.mutations || {}
      })),
      hatchery: S.hatchery.map(h => ({
        name: h.name, inc: h.inc, rar: h.rar,
        biomeIdx: h.biomeIdx, petIdx: h.petIdx, size: h.size,
        timer: h.timer, total: h.total, finished: h.finished,
        secret: !!h.secret, favorite: !!h.favorite,
        mutations: h.mutations || {}
      })),
      biomeIdx: S.biomeIdx,
      discovered: Array.from(IndexData.discovered),
      claimed: Array.from(IndexData.claimed),
      petCap: S.petCap,
      myBaseIdx: S.myBaseIdx,
      ad2Step: S.ad2Step, ad4Step: S.ad4Step, ad8Step: S.ad8Step,
      ad16Step: S.ad16Step, ad32Step: S.ad32Step,
      doubleSpeed: !!S.doubleSpeed, quadSpeed: !!S.quadSpeed,
      subscriptionVerified: !!S.subscriptionVerified,
      trails: S.trails, equippedTrail: S.equippedTrail,
      lastOnlineTime: Date.now(), ts: Date.now(),
      lastRefreshTime: S.lastRefreshTime || 0,
      eggState: {
        eggs: S.eggs.filter(e => !e.collected).map(e => ({
          x: e.x, y: e.y, r: e.r, size: e.size, mul: e.mul,
          petIdx: e.petIdx, biomeIdx: e.biomeIdx, secret: !!e.secret,
          origX: e.origX, origY: e.origY, eggId: e.eggId
        })),
        slot: S.lastRefreshTime
      }
    };
  }

  // 檢查本機舊存檔是否有資料（避免本機被清空時覆蓋）
  function hasMeaningfulData(data) {
    if (!data) return false;
    return (
      (data.cash || 0) > 0 ||
      (data.displaySpeed || 0) > 10 ||
      (Array.isArray(data.discovered) && data.discovered.length > 0) ||
      (Array.isArray(data.pets) && data.pets.length > 0) ||
      (Array.isArray(data.bag) && data.bag.length > 0) ||
      (Array.isArray(data.hatchery) && data.hatchery.length > 0) ||
      data.equippedTrail || data.subscriptionVerified ||
      (data.trails && Object.keys(data.trails).length > 0) ||
      (data.eggState && Array.isArray(data.eggState.eggs) && data.eggState.eggs.length > 0)
    );
  }

  // ------------------------------------------------------------
  // 存檔
  // ------------------------------------------------------------
  function saveGame(S, IndexData, hooks, silent) {
    if (!__saveEnabled) {
      try {
        const existing = localStorage.getItem(SAVE_KEY);
        if (!existing) return;
      } catch (e) { return; }
    }

    // 防呆：本機已有進度但 S 為空 → 不覆蓋
    try {
      const existingRaw = localStorage.getItem(SAVE_KEY);
      if (existingRaw) {
        const old = JSON.parse(existingRaw);
        const oldHasData = hasMeaningfulData(old);
        const newHasData = hasMeaningfulData(serializeState(S, IndexData));
        if (oldHasData && !newHasData) {
          console.warn('[steal-eggs-save] 本機已有進度但 S 為空，跳過避免歸零');
          return;
        }
      }
    } catch (e) {}

    try {
      const data = serializeState(S, IndexData);

      // 允許外掛在 onSave hook 注入額外欄位
      if (hooks && Array.isArray(hooks.onSave)) {
        for (let i = 0; i < hooks.onSave.length; i++) {
          try {
            const extra = hooks.onSave[i]();
            if (extra && typeof extra === 'object') Object.assign(data, extra);
          } catch (err) { console.error('[steal-eggs-save] onSave error', err); }
        }
      }

      const raw = JSON.stringify(data);
      localStorage.setItem(SAVE_KEY, raw);
      try { localStorage.setItem(SAVE_KEY_GENERIC, raw); } catch (e) {}

      // 寫入雲端：優先走 menu.js 官方管線
      if (typeof global.raingodSave === 'function') {
        try {
          global.raingodSave(GAME_ID, data).catch(err => {
            console.warn('[steal-eggs-save] raingodSave 失敗', err);
          });
        } catch (err) {
          console.warn('[steal-eggs-save] 呼叫 raingodSave 失敗', err);
        }
      } else {
        // fallback：直接寫入舊雲端路徑
        try {
          const fb = getFirebase();
          const user = fb && fb.auth && fb.auth().currentUser;
          if (user && fb.database) {
            fb.database().ref(`raingod_accounts/${user.uid}/games/${GAME_ID}`).set({
              data,
              updated_at: fb.database.ServerValue.TIMESTAMP,
              ts: Date.now()
            }).catch(() => {});
          }
        } catch (e) {}
      }

      if (!silent && typeof global.__stealEggShowToast === 'function') {
        global.__stealEggShowToast('💾 存檔成功！', '#3a8a3a', '#2a6a2a');
      }
    } catch (e) {
      console.error('[steal-eggs-save] 存檔失敗', e);
      if (!silent && typeof global.__stealEggShowToast === 'function') {
        global.__stealEggShowToast('❌ 存檔失敗', '#8a2a2a', '#aa4444');
      }
    }
  }

  // ------------------------------------------------------------
  // 讀檔
  // ------------------------------------------------------------
  async function loadStealEggsSave(S, IndexData, applyLoadedData, opts) {
    if (__loadingPromise) return __loadingPromise;
    opts = opts || {};

    __loadingPromise = (async () => {
      // 等待 menu.js 的 Firebase / Auth / 帳號資料就緒
      try { await global.raingodFirebaseReady; } catch (e) {}
      try { await global.raingodAuthReady; } catch (e) {}
      try { await global.raingodAccountDataReady; } catch (e) {}

      let user = null;
      try {
        const fb = getFirebase();
        user = fb && fb.auth ? fb.auth().currentUser : null;
      } catch (e) {}

      if (user && typeof global.raingodWaitForAccountData === 'function') {
        try { await global.raingodWaitForAccountData(user.uid); } catch (e) {}
      }

      let data = null;

      // 首選：走 menu.js 官方 raingodInitGame 管線
      if (typeof global.raingodInitGame === 'function') {
        try {
          data = await global.raingodInitGame(GAME_ID, null, (loaded, meta) => {
            console.log('[steal-eggs-save] 存檔來源:', meta);
          });
        } catch (e) {
          console.warn('[steal-eggs-save] raingodInitGame 失敗', e);
        }
      }

      // fallback：直讀舊雲端路徑
      if ((!data || data.version !== SAVE_VERSION) && user) {
        const cloud = await loadStealEggCloud(user.uid);
        if (cloud && cloud.version === SAVE_VERSION) data = cloud;
      }

      // fallback：本機舊 key
      if (!data || data.version !== SAVE_VERSION) {
        try {
          const raw = localStorage.getItem(SAVE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.version === SAVE_VERSION) data = parsed;
          }
        } catch (e) {}
      }

      if (data && data.version === SAVE_VERSION) {
        try { applyLoadedData(data); } catch (e) { console.warn('[steal-eggs-save] 應用存檔失敗', e); }
      }

      // 離線孵化計算（由呼叫端傳入 getHatchMultiplier 等）
      if (opts.computeOfflineHatch) {
        try { opts.computeOfflineHatch(data); } catch (e) { console.warn('[steal-eggs-save] 離線孵化計算失敗', e); }
      }

      // 玩家名稱
      if (user && user.email) {
        S.playerName = user.email.split('@')[0];
      } else if (data && data.playerName) {
        S.playerName = data.playerName;
      } else {
        S.playerName = '訪客';
      }

      // 教學判定
      const isTutorialDone = localStorage.getItem('tutorial_done') === '1';
      if (S.cash > 0 || isTutorialDone) {
        S.tutorialActive = false;
        if (!isTutorialDone) localStorage.setItem('tutorial_done', '1');
      } else if (!isTutorialDone) {
        S.tutorialActive = true;
      }

      S.cps = S.pets.reduce((sum, pt) => sum + pt.inc, 0);
      S.camera.x = S.player.x;
      S.camera.y = S.player.y - 100;

      __saveEnabled = true;
      return data;
    })();

    return __loadingPromise;
  }

  // ------------------------------------------------------------
  // 保底：讀檔超時則改用本機存檔
  // ------------------------------------------------------------
  function installLoadTimeoutFallback(S, IndexData, applyLoadedData, buildIndexUI, updateUI, ms) {
    setTimeout(() => {
      if (__saveEnabled) return;
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.version === SAVE_VERSION) {
            console.warn('[steal-eggs-save] 讀檔超時，使用本機存檔並啟用存檔');
            applyLoadedData(parsed);
            __saveEnabled = true;
            if (buildIndexUI) buildIndexUI();
            if (updateUI) updateUI();
            return;
          }
        }
      } catch (e) {}
      if (!__saveEnabled) {
        __saveEnabled = true;
        if (buildIndexUI) buildIndexUI();
        if (updateUI) updateUI();
      }
    }, typeof ms === 'number' ? ms : 8000);
  }

  // ------------------------------------------------------------
  // 自動存檔排程
  // ------------------------------------------------------------
  function startAutoSave(S, IndexData, hooks, intervalMs) {
    if (__saveTimer) clearInterval(__saveTimer);
    __saveTimer = setInterval(() => {
      if (__saveEnabled) saveGame(S, IndexData, hooks, true);
    }, typeof intervalMs === 'number' ? intervalMs : 3000);
    return __saveTimer;
  }

  function stopAutoSave() {
    if (__saveTimer) { clearInterval(__saveTimer); __saveTimer = null; }
  }

  function installUnloadSave(S, IndexData, hooks) {
    const handler = () => {
      if (__saveEnabled) saveGame(S, IndexData, hooks, true);
    };
    global.addEventListener('beforeunload', handler);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && __saveEnabled) saveGame(S, IndexData, hooks, true);
    });
    return handler;
  }

  // ------------------------------------------------------------
  // 對外匯出
  // ------------------------------------------------------------
  const api = {
    GAME_ID,
    SAVE_VERSION,
    SAVE_KEY,
    SAVE_KEY_GENERIC,
    isSaveEnabled,
    setSaveEnabled,
    getStealEggCloudRef,
    loadStealEggCloud,
    serializeState,
    saveGame,
    loadStealEggsSave,
    installLoadTimeoutFallback,
    startAutoSave,
    stopAutoSave,
    installUnloadSave
  };

  global.StealEggSave = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
