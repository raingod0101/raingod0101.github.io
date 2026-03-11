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

    // 3. 注入選單 (相容多種 ID)
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { container.innerHTML = data; });
    }
});
