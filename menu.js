document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime(); 

    // 1. 強力 Favicon 注入 (p4.png)
    function updateIcon() {
        const oldIcons = document.querySelectorAll("link[rel*='icon']");
        oldIcons.forEach(el => el.remove());
        const link = document.createElement('link');
        link.type = 'image/png'; link.rel = 'shortcut icon';
        link.href = `${baseUrl}p4.png?v=${v}`;
        document.head.appendChild(link);
        const link2 = document.createElement('link');
        link2.type = 'image/png'; link2.rel = 'icon';
        link2.href = `${baseUrl}p4.png?v=${v}`;
        document.head.appendChild(link2);
    }
    updateIcon();

    // 2. 載入 FontAwesome
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // 3. 注入選單並執行「隨遇而安」顏色邏輯
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 

                // 顏色偵測邏輯
                const bgColor = window.getComputedStyle(document.body).backgroundColor;
                const rgb = bgColor.match(/\d+/g);
                
                if (rgb) {
                    // YIQ 亮度感知公式
                    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
                    const navElement = container.querySelector('.glass-nav');
                    
                    if (navElement) {
                        // 閾值設為 170：確保鮮豔色（綠、藍）也能進入深色模式，避免變灰
                        if (brightness < 170) { 
                            // 【深色/鮮豔色環境】導覽列變黑底白字，質感深邃
                            navElement.style.setProperty('background', 'rgba(0, 0, 0, 0.55)', 'important');
                            navElement.style.setProperty('border-bottom', '1px solid rgba(255, 255, 255, 0.1)', 'important');
                            container.querySelectorAll('.nav-item, .brand, .brand span').forEach(el => {
                                el.style.setProperty('color', '#ffffff', 'important');
                            });
                        } else {
                            // 【純亮色環境】導覽列維持白底黑字，乾淨俐落
                            navElement.style.setProperty('background', 'rgba(255, 255, 255, 0.8)', 'important');
                            navElement.style.setProperty('border-bottom', '1px solid rgba(0, 0, 0, 0.1)', 'important');
                            container.querySelectorAll('.nav-item, .brand').forEach(el => {
                                el.style.setProperty('color', '#1d1d1f', 'important');
                            });
                        }
                    }
                }
            });
    }
});
