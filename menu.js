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
                
                // ... 前面程式碼不變 ...
if (rgb) {
    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
    const navElement = container.querySelector('.glass-nav');
    
    if (navElement) {
        // 將判斷標準從 125 提高到 170
        // 這樣綠色 (149) 就會落入「深色模式」，看起來就不會灰灰的
        if (brightness < 170) { 
            // 深色/鮮豔色模式：黑底白字
            navElement.style.setProperty('background', 'rgba(0, 0, 0, 0.5)', 'important');
            navElement.style.setProperty('border-bottom', '1px solid rgba(255, 255, 255, 0.1)', 'important');
            container.querySelectorAll('.nav-item, .brand, .brand span').forEach(el => {
                el.style.setProperty('color', '#ffffff', 'important');
            });
        } else {
            // 純亮色模式 (如全白)：白底黑字
            navElement.style.setProperty('background', 'rgba(255, 255, 255, 0.8)', 'important');
            container.querySelectorAll('.nav-item, .brand').forEach(el => {
                el.style.setProperty('color', '#3b3b3b', 'important');
            });
        }
    }
}
// ... 後面程式碼不變 ...
            });
    }
});
