// loadMenu.js
document.addEventListener("DOMContentLoaded", function() {
    const navHTML = `
    <div class="topbar">
        <a href="index.html" style="display:flex; align-items:center; text-decoration:none;">
            <img src="p3.png" class="topbar_icon" />
            <span style="font-weight:700; font-size:1.2rem; color:#1d1d1f; margin-left:10px;">Raingod</span>
        </a>
        <div id="nav-menu-content">
            <div class="subtopbar_drops">
                <a class="subtopbar" href="math.html">數學工具</a>
                <div class="subtopbar_drop_c">
                    <a class="subtopbar_ta" href="math1.html">質因數分解</a>
                    <a class="subtopbar_ta" href="math6.html">質數查詢</a>
                </div>
            </div>
            <div class="subtopbar_drops">
                <a class="subtopbar" href="game.html">線上遊戲</a>
                <div class="subtopbar_drop_c">
                    <a class="subtopbar_ta" href="game1.html">經典貪吃蛇</a>
                    <a class="subtopbar_ta" href="game2.html">Avoid GO!</a>
                </div>
            </div>
            <div class="subtopbar_drops">
                <a class="subtopbar" href="tool.html">常用工具</a>
                <div class="subtopbar_drop_c">
                    <a class="subtopbar_ta" href="tool1.html">翻譯工具</a>
                </div>
            </div>
        </div>
    </div>`;
    
    const navPlaceholder = document.getElementById('nav_bar');
    if (navPlaceholder) {
        navPlaceholder.innerHTML = navHTML;
    }
});
