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
                <a class="subtopbar" href="autoclicker.html">自動連點</a>
                <div class="subtopbar_drop_c">
                    <a class="subtopbar_ta" href="prime-factorization.html">質因數分解</a>
                    <a class="subtopbar_ta" href="birthday-paradox.html">生日悖論</a>
                    <a class="subtopbar_ta" href="prime-search.html">質數查詢</a>
                </div>
            </div>
            <div class="subtopbar_drops">
                <a class="subtopbar" href="games.html">線上遊戲</a>
                <div class="subtopbar_drop_c">
                    <a class="subtopbar_ta" href="fireworks.html">煙火</a>
                    <a class="subtopbar_ta" href="tycoon.html">大亨</a>
                    <a class="subtopbar_ta" href="space-runner.html">宇宙跑酷</a>
                    <a class="subtopbar_ta" href="2048snake.html">2048 貪吃蛇</a>
                </div>
            </div>
            <div class="subtopbar_drops">
                <a class="subtopbar" href="tools.html">常用工具</a>
                <div class="subtopbar_drop_c">
                    <a class="subtopbar_ta" href="exam-answers.html">會考答案</a>
                    <a class="subtopbar_ta" href="html-editor.html">HTML 編輯器</a>
                    <a class="subtopbar_ta" href="typing-practice.html">打字練習</a>
                    <a class="subtopbar_ta" href="air-wheel-workshop.html">空氣家電工作坊</a>
                </div>
            </div>
        </div>
    </div>`;
    
    const navPlaceholder = document.getElementById('nav_bar');
    if (navPlaceholder) {
        navPlaceholder.innerHTML = navHTML;
    }
});
