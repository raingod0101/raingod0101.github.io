document.addEventListener("DOMContentLoaded", function() {
    // 1. 自動載入 FontAwesome 圖示庫
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        document.head.appendChild(fa);
    }

    // 2. 尋找注入點 (相容 nav_bar 或 nav_placeholder)
    const target = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');

    if (target) {
        fetch('menu.html')
            .then(res => {
                if (!res.ok) throw new Error();
                return res.text();
            })
            .then(html => {
                target.innerHTML = html;
            })
            .catch(() => {
                // 本地開發 (Local File) 備案：直接用內建字串注入
                console.warn("使用備用導覽列 (本地模式)");
                target.innerHTML = `
                    <div style="background:#000; color:#fff; padding:15px; display:flex; gap:20px; font-family:sans-serif; font-size:14px; border-bottom:1px solid #333;">
                        <b style="color:#00ff66">Raingod.io</b>
                        <a href="index.html" style="color:#fff;text-decoration:none">首頁</a>
                        <a href="stock.html" style="color:#fff;text-decoration:none">股票</a>
                        <a href="dragon.html" style="color:#fff;text-decoration:none">貓龍</a>
                        <a href="google.html" style="color:#fff;text-decoration:none">Google</a>
                        <a href="seat.html" style="color:#fff;text-decoration:none">座位</a>
                    </div>
                `;
            });
    }
});
