document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime(); // 防止快取的版本號

    // 1. 強力注入 Favicon (分頁圖示)
    function injectFavicon() {
        // 移除舊的
        const links = document.querySelectorAll("link[rel*='icon']");
        links.forEach(l => l.remove());

        // 加入新的
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
    injectFavicon();

    // 2. 載入 FontAwesome
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // 3. 注入選單
    const container = document.getElementById('nav_bar');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
            })
            .catch(err => console.error("選單載入失敗", err));
    }
});
