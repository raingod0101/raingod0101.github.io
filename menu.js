document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime(); 

    // 1. 強力注入 Favicon
    function updateIcon() {
        const oldIcons = document.querySelectorAll("link[rel*='icon']");
        oldIcons.forEach(el => el.remove());

        const link = document.createElement('link');
        link.type = 'image/png';
        link.rel = 'shortcut icon';
        link.href = `${baseUrl}p4.png?v=${v}`;
        document.head.appendChild(link);

        const link2 = document.createElement('link');
        link2.type = 'image/png';
        link2.rel = 'icon';
        link2.href = `${baseUrl}p4.png?v=${v}`;
        document.head.appendChild(link2);
    }
    updateIcon();

    // 2. 載入圖示庫
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // 3. 注入選單內容並自動調整顏色
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 

                // --- 自動偵測背景色邏輯 ---
                const bgColor = window.getComputedStyle(document.body).backgroundColor;
                const rgb = bgColor.match(/\d+/g);
                
                if (rgb) {
                    // 計算亮度 (YIQ 公式: 亮度 = (R*299 + G*587 + B*114) / 1000)
                    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
                    const navElement = container.querySelector('.glass-nav');
                    
                    if (navElement) {
                        if (brightness < 125) { 
                            // 背景很暗時 (如你的黑色 Index)
                            navElement.style.setProperty('background', 'rgba(0, 0, 0, 0.6)', 'important');
                            navElement.style.setProperty('border-bottom', '1px solid rgba(255, 255, 255, 0.1)', 'important');
                            
                            // 強制將導覽列文字變白，防止黑底黑字
                            container.querySelectorAll('.nav-item, .brand, .brand span').forEach(el => {
                                el.style.setProperty('color', '#ffffff', 'important');
                            });
                        } else {
                            // 背景很亮時 (如白色背景網站)
                            navElement.style.setProperty('background', 'rgba(255, 255, 255, 0.8)', 'important');
                            container.querySelectorAll('.nav-item, .brand').forEach(el => {
                                el.style.setProperty('color', '#3b3b3b', 'important');
                            });
                        }
                    }
                }
            });
    }
});
