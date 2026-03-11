document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime();

    // 1. 強力 Favicon 注入
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = `${baseUrl}p4.png?v=${v}`;
    document.head.appendChild(link);

    // 2. 載入 FontAwesome
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // 3. 注入選單並判斷背景顏色
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
                
                // --- 新增：自動偵測背景顏色邏輯 ---
                const bgColor = window.getComputedStyle(document.body).backgroundColor;
                const rgb = bgColor.match(/\d+/g);
                
                if (rgb) {
                    // 計算亮度公式 (YIQ)
                    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
                    const navElement = container.querySelector('.glass-nav');
                    
                    if (navElement) {
                        if (brightness < 128) {
                            // 背景是暗色：導覽列設為深色模式
                            navElement.style.background = "rgba(0, 0, 0, 0.6)";
                            navElement.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";
                            container.querySelectorAll('.nav-item, .brand').forEach(el => {
                                el.style.setProperty('color', '#ffffff', 'important');
                            });
                        } else {
                            // 背景是亮色：維持白色半透明
                            navElement.style.background = "rgba(255, 255, 255, 0.8)";
                            container.querySelectorAll('.nav-item, .brand').forEach(el => {
                                el.style.setProperty('color', '#3b3b3b', 'important');
                            });
                        }
                    }
                }
            });
    }
});
