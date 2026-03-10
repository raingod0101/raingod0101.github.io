// menu.js
document.addEventListener("DOMContentLoaded", function() {
    const navHTML = `
    <div class="topbar">
        <a href="index.html" style="display:flex; align-items:center; text-decoration:none;">
            <img src="p3.png" class="topbar_icon" alt="Logo" />
            <span style="font-weight:700; font-size:1.2rem; color:#1d1d1f; margin-left:10px;">Raingod</span>
        </a>
        <div id="nav-menu-content">
            <div class="subtopbar_drops">
                <a class="subtopbar" href="math.html">數學工具</a>
                <div class="subtopbar_drop_c">
                </div>
            </div>
            <div class="subtopbar_drops">
                <a class="subtopbar" href="game.html">線上遊戲</a>
                <div class="subtopbar_drop_c">
                </div>
            </div>
            <div class="subtopbar_drops">
                <a class="subtopbar" href="tool.html">實用工具</a>
                <div class="subtopbar_drop_c">
                </div>
            </div>
        </div>
    </div>`;

    const navContainer = document.getElementById('nav_bar');
    if (navContainer) {
        navContainer.innerHTML = navHTML;
    }
});
