document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime(); 

    // 1. 強力 Favicon 注入
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

    // 2. 載入圖示庫 (FontAwesome)
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // 3. 注入選單並執行顏色判定
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 

                // 偵測目前網頁的背景顏色
                const bgColor = window.getComputedStyle(document.body).backgroundColor;
                const rgb = bgColor.match(/\d+/g);
                
                if (rgb) {
                    // 使用亮度公式
                    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
                    const navElement = container.querySelector('.glass-nav');
                    
                    if (navElement) {
                        // 【關鍵】移除毛玻璃模糊，防止背景顏色滲透進來
                        navElement.style.setProperty('backdrop-filter', 'none', 'important');
                        navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');

                        // 判斷閾值調高到 190：只要不是接近白色，一律進入「黑模式」
                        if (brightness < 190) { 
                            // --- 深色/彩色背景：強制變「純深黑」 ---
                            navElement.style.setProperty('background', 'rgba(15, 15, 15, 0.95)', 'important');
                            navElement.style.setProperty('border-bottom', '1px solid rgba(255, 255, 255, 0.15)', 'important');
                            
                            container.querySelectorAll('.nav-item, .brand, .brand span').forEach(el => {
                                el.style.setProperty('color', '#ffffff', 'important');
                            });
                        } else {
                            // --- 純白背景：強制變「純潔白」 ---
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
