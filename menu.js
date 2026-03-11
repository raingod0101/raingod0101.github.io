document.addEventListener("DOMContentLoaded", function() {
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    const container = document.getElementById('nav_bar');
    if (container) {
        fetch('menu.html')
            .then(res => res.text())
            .then(data => { container.innerHTML = data; });
    }
});
