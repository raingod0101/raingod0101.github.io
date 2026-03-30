/* 導覽列主體 - 強制純色，不透明 */
.glass-nav {
    position: fixed !important; top: 0 !important; left: 0 !important;
    width: 100% !important; height: 52px !important;
    z-index: 2147483646 !important;
    display: flex !important; align-items: center !important;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
    backdrop-filter: none !important; /* 關閉毛玻璃避免變灰 */
    -webkit-backdrop-filter: none !important;
}

.nav-content {
    width: 100% !important; max-width: 1200px !important;
    margin: 0 auto !important; display: flex !important;
    justify-content: space-between !important; align-items: center !important;
    padding: 0 24px !important; height: 100% !important;
}

.nav-left { display: flex !important; align-items: center !important; gap: 25px !important; }
.nav-right { display: flex !important; align-items: center !important; }

.brand { font-weight: 700 !important; text-decoration: none !important; display: flex !important; align-items: center !important; }
.brand img { height: 28px; width: 28px; margin-right: 10px; border-radius: 4px; }

.nav-links { list-style: none !important; display: flex !important; gap: 5px !important; margin: 0 !important; padding: 0 !important; }
.nav-item { text-decoration: none !important; font-size: 0.85rem !important; padding: 8px 12px !important; border-radius: 6px !important; display: flex !important; align-items: center !important; gap: 6px !important; }

/* 下拉選單分支 - 強制跟隨背景色 */
.dropdown { position: relative !important; }
.dropdown-menu {
    position: absolute !important; top: 100% !important; left: 0 !important;
    border-radius: 8px !important; list-style: none !important;
    padding: 6px !important; margin: 0 !important; min-width: 180px !important;
    opacity: 0 !important; visibility: hidden !important;
    transform: translateY(8px) !important; transition: 0.2s !important;
    border: 1px solid rgba(128,128,128,0.2) !important;
}
.dropdown:hover .dropdown-menu { opacity: 1 !important; visibility: visible !important; transform: translateY(0) !important; }
.dropdown-menu li a { text-decoration: none !important; display: block !important; padding: 10px 15px !important; border-radius: 5px !important; font-size: 0.85rem !important; }

/* 登入按鈕樣式 */
.login-trigger {
    background: #4285F4 !important; color: white !important; border: none !important;
    padding: 7px 18px !important; border-radius: 20px !important;
    cursor: pointer !important; font-size: 0.85rem !important; font-weight: 500 !important;
    display: flex !important; align-items: center !important; gap: 8px !important;
}
.user-avatar { width: 32px; height: 32px; border-radius: 50%; cursor: pointer; border: 1px solid rgba(128,128,128,0.3); }

body { padding-top: 52px !important; }
