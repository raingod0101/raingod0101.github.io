document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime(); 

    // 1. 強力注入 Favicon
    function updateIcon() {
        const oldIcons = document.querySelectorAll("link[rel*='icon']");
        oldIcons.forEach(el => el.remove());
        const link = document.createElement('link');
        link.type = 'image/png';
        link.rel = 'icon';
        link.href = `${baseUrl}p4.png?v=${v}`;
        document.head.appendChild(link);
    }
    updateIcon();

    // 2. 載入圖示庫
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // 3. 注入選單內容並執行「去色」邏輯
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 

                // 偵測背景色
                const bgColor = window.getComputedStyle(document.body).backgroundColor;
                const rgb = bgColor.match(/\d+/g);
                
                if (rgb) {
                    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
                    const navElement = container.querySelector('.glass-nav');
                    
                    if (navElement) {
                        // 移除模糊效果，防止背景顏色滲透（染色）
                        navElement.style.setProperty('backdrop-filter', 'none', 'important');
                        navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');

                        if (brightness < 170) { 
                            // --- 深色模式：絕對深黑 ---
                            // 使用更高濃度的黑色 (0.9)，確保不被綠色、藍色等背景影響
                            navElement.style.setProperty('background', 'rgba(10, 10, 10, 0.95)', 'important');
                            navElement.style.setProperty('border-bottom', '1px solid rgba(255, 255, 255, 0.15)', 'important');
                            
                            container.querySelectorAll('.nav-item, .brand, .brand span').forEach(el => {
                                el.style.setProperty('color', '#ffffff', 'important');
                            });
                        } else {
                            // --- 亮色模式：純潔白 ---
                            navElement.style.setProperty('background', 'rgba(255, 255, 255, 0.98)', 'important');
                            navElement.style.setProperty('border-bottom', '1px solid rgba(0, 0, 0, 0.1)', 'important');
                            
                            container.querySelectorAll('.nav-item, .brand').forEach(el => {
                                el.style.setProperty('color', '#1d1d1f', 'important');
                            });
                            container.querySelectorAll('.brand span').forEach(el => {
                                el.style.setProperty('color', '#86868b', 'important');
                            });
                        }
                    }
                }
            });
    }
});
