let inited = false;

class SnakeBase {
    constructor(game, x, y, name = "Player") {
        this.game = game;
        this.pos = { x, y };
        this.name = name;

        this.angle = Math.random() * Math.PI * 2;
        this.baseSpeed = 4.5;
        this.speed = this.baseSpeed;
        this.radius = 12;
        this.isDead = false;
        this.isBoosting = false;
        this.color = `hsl(${Math.random() * 360}, 70%, 55%)`;
        this.history = [];
        this.snakeLength = 20;
        this.pathSpacing = 4;
    }

    update() {
        if (this.isDead || !inited) return;
        this.moveLogic();

        this.speed = (this.isBoosting && this.snakeLength > 15) ? this.baseSpeed * 1.8 : this.baseSpeed;
        if (this.isBoosting && this.game.frameCount % 20 === 0) {
            this.snakeLength = Math.max(10, this.snakeLength - 1);
        }

        this.pos.x += Math.cos(this.angle) * this.speed;
        this.pos.y += Math.sin(this.angle) * this.speed;

        this.history.unshift({ x: this.pos.x, y: this.pos.y });

        if (this.history.length > (this.snakeLength + 5) * this.pathSpacing) this.history.pop();

        for (let i = this.game.food.length - 1; i >= 0; i--) {
            const f = this.game.food[i];
            const dist = Math.hypot(f.x - this.pos.x, f.y - this.pos.y);

            if (dist < 40) {
                if (this === this.game.player) {
                    this.game.socket.emit('eatFood', f.id);

                    this.snakeLength += 2;

                    this.game.food.splice(i, 1);
                }
            }
        }

        if (this === this.game.player && !this.isDead) {
            const now = Date.now();
            const isProtected = (now - (this.spawnTime || 0)) < 5000;

            if (!isProtected) {
                let visualHit = false;

                if (this.pos.x < 0 || this.pos.x > 3000 || this.pos.y < 0 || this.pos.y > 3000) visualHit = true;

                [...this.game.remoteNPCs, ...Array.from(this.game.remotePlayers.values())].forEach(other => {
                    if (!other || !other.pos || visualHit || other.id === this.game.socket.id) return;

                    const otherProtected = (now - (other.spawnTime || 0)) < 5000;
                    if (otherProtected) return;

                    if (Math.hypot(this.pos.x - other.pos.x, this.pos.y - other.pos.y) < 600) {
                        for (let i = 0; i < other.history.length; i += 8) {
                            const segment = other.history[i];

                            if (!segment || typeof segment.x === 'undefined') continue;

                            if (Math.hypot(this.pos.x - segment.x, this.pos.y - segment.y) < 20) {
                                visualHit = true;
                                break;
                            }
                        }
                    }
                });

                if (visualHit) {
                    this.visualDeath = true;
                }
            }
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.game.socket.emit('requestDeath', { history: this.history });

        this.history = [];
    }

    draw(ctx) {
        if (!this.history || this.history.length < 2) return;

        const radius = this.radius || 12;
        const spacing = this.pathSpacing || 4;
        const color = this.color || "#ffffff";
        const angle = this.angle || 0;
        const snakeLen = this.snakeLength || Math.floor(this.history.length / spacing);

        ctx.save();

        ctx.shadowBlur = this.isBoosting ? 20 : 10;
        ctx.shadowColor = color;

        const now = Date.now();
        const protectionLeft = Math.max(0, 5000 - (now - (this.spawnTime || 0)));
        if (protectionLeft > 0 || this.visualDeath) {
            ctx.globalAlpha = 0.4;
        }

        const currentHistoryLen = this.history.length;

        const maxSegments = Math.min(snakeLen, Math.floor(currentHistoryLen / spacing));

        for (let i = maxSegments - 1; i >= 0; i--) {
            const historyIndex = i * spacing;
            const pos = this.history[historyIndex];
            if (!pos) continue;

            const sizeRatio = 0.6 + (0.4 * (1 - i / maxSegments));
            const currentRadius = radius * sizeRatio;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        const head = this.history[0];
        ctx.shadowBlur = 15;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(head.x, head.y, radius + 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        const eyeAngles = [0.6, -0.6];
        eyeAngles.forEach(offset => {
            const eyeX = head.x + Math.cos(angle + offset) * 8;
            const eyeY = head.y + Math.sin(angle + offset) * 8;

            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "black";
            ctx.beginPath();
            ctx.arc(eyeX + Math.cos(angle) * 2, eyeY + Math.sin(angle) * 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();

        ctx.fillStyle = "white";
        ctx.font = "bold 20px Poppins";
        ctx.textAlign = "center";
        let displayName = (this.name || "Snake");
        if (protectionLeft > 0) displayName += ` (${(protectionLeft / 1000).toFixed(1)}s)`;
        ctx.fillText(displayName, head.x, head.y - 40);
    }
}

class Player extends SnakeBase {
    moveLogic() {

        const targetX = this.game.input.x;
        const targetY = this.game.input.y;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const targetAngle = Math.atan2(targetY - centerY, targetX - centerX);
        let diff = targetAngle - this.angle;

        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        this.angle += diff * 0.15;

        this.isBoosting = this.game.input.down;
    }
}

class ModernSnake {
    constructor(canvasId, playerName) {
        const chatInput = document.getElementById('chatInput');

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const text = chatInput.value.trim();

                if (text !== "") {
                    this.socket.emit('sendMessage', text);
                }

                chatInput.blur();
            }
        });

        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.food = [];
        this.remoteNPCs = [];
        this.remotePlayers = new Map();
        this.mouse = { x: 0, y: 0, down: false };
        this.frameCount = 0;
        this.playerName = playerName || "Player_" + Math.floor(Math.random() * 1000);
        this.score = 0;

        this.socket = io("https://geometricgame-studio-snake-online.hf.space", {
            transports: ["websocket"],

            upgrade: false,

            path: "/socket.io/",

            reconnection: true
        });

        show_loading("正在連線至伺服器...", "應該很快就會完成!");
        inited = false;

        this.socket.on('initWorld', (s) => {
            this.food = s.food;
            this.remoteNPCs = s.npcs;

            for (let id in s.players) {
                if (id !== this.socket.id) this.remotePlayers.set(id, s.players[id]);
            }

            inited = true;

            close_loading();

            started = true;
        });

        this.socket.on('connect_error', async (err) => {
            close_loading();

            this.socket.disconnect();

            await show_dialog("無法連線至伺服器", err.message);

            location.replace("/");
        });

        this.socket.on('npcUpdateFull', (fullNpcs) => {
            this.remoteNPCs = fullNpcs;
        });

        this.socket.on('npcUpdateLight', (lightNpcs) => {
            lightNpcs.forEach(lightNpc => {
                const localNpc = this.remoteNPCs.find(n => n.id === lightNpc.id);
                if (localNpc) {

                    localNpc.pos = lightNpc.pos;
                    localNpc.angle = lightNpc.angle;
                    localNpc.score = lightNpc.score;
                    localNpc.spawnTime = lightNpc.spawnTime;

                    localNpc.history.unshift({ x: lightNpc.pos.x, y: lightNpc.pos.y });

                    const maxLen = Math.floor(lightNpc.score / 1.5) + 10;
                    if (localNpc.history.length > maxLen) {
                        localNpc.history.pop();
                    }
                }
            });
        });
        this.socket.on('playerUpdate', (m) => { this.remotePlayers.set(m.id, m.data); });

        this.socket.on('killPlayer', (id) => {
            if (id === this.socket.id) {
                this.player.isDead = true;
                this.player.history = [];
                document.getElementById('deathScreen').style.display = 'flex';
                document.getElementById('finalScore').innerText = `最終分數: ${Math.floor(this.player.score)}`;
            }

            this.remotePlayers.delete(id);
            this.remoteNPCs = this.remoteNPCs.filter(npc => npc.id !== id);
        });

        window.respawn = () => {
            const screen = document.getElementById('deathScreen');
            if (screen) screen.style.display = 'none';

            this.init();

            this.socket.emit('respawn');

            this.respawnTimer = null;
        };

        this.socket.on('removeFood', (id) => { this.food = this.food.filter(f => f.id !== id); });
        this.socket.on('addFood', (f) => { this.food.push(f); });

        this.socket.on('scoreUpdate', (newScore) => {
            this.player.score = newScore;

            const scoreDiv = document.getElementById('score');
            if (scoreDiv) scoreDiv.innerText = `分數: ${Math.floor(newScore)}`;
        });

        this.socket.on('message', (msg) => {
            const chatMessages = document.getElementById('chatMessages');

            const msgDiv = document.createElement('div');
            msgDiv.className = 'mc-message';
            msgDiv.innerHTML = `<span style="color:${msg.color}">${msg.sender ? msg.sender + ':' : ''}</span> ${msg.text}`;

            chatMessages.appendChild(msgDiv);

            setTimeout(() => {
                msgDiv.remove();
            }, 8000);
        });

        this.socket.on('gameUpdate', async () => {
            this.socket.disconnect();
            inited = false;

            await show_dialog("遊戲更新", "此次遊戲更新要求所有玩家必須進行更新，頁面將會重新載入至最新的遊戲版本\n*您的狀態不會被保留，造成不便敬請見諒!");

            location.reload();
        });

        this.input = { x: 0, y: 0, down: false };

        this.init();
        this.bindEvents();
        this.resize();
    }

    init() {
        this.player = new Player(this, 1500, 1500, this.playerName);
        this.isDead = false;
        this.visualDeath = false;
        this.spawnTime = Date.now();
        this.initSynced = false;
        this.player.score = 0;
    }

    bindEvents() {

        window.addEventListener('mousemove', e => {
            this.input.x = e.clientX;
            this.input.y = e.clientY;
        });
        window.addEventListener('mousedown', () => this.input.down = true);
        window.addEventListener('mouseup', () => this.input.down = false);

        window.addEventListener('touchstart', e => {
            this.updateTouchPos(e);
            if (e.target === this.canvas) e.preventDefault();
        }, { passive: false });

        window.addEventListener('touchmove', e => {
            this.updateTouchPos(e);
            if (e.target === this.canvas) e.preventDefault();
        }, { passive: false });

        window.addEventListener('touchend', e => {

            if (e.touches.length < 2) {
                this.input.down = false;
            }

            if (e.touches.length > 0) {
                this.input.x = e.touches[0].clientX;
                this.input.y = e.touches[0].clientY;
            }
            if (e.target === this.canvas) e.preventDefault();
        }, { passive: false });

        window.addEventListener('resize', () => this.resize());
    }

    updateTouchPos(e) {

        if (e.touches.length > 0) {
            this.input.x = e.touches[0].clientX;
            this.input.y = e.touches[0].clientY;
            this.input.down = e.touches.length >= 2;
        } else {
            this.input.down = false;
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    update() {
        this.frameCount++;
        this.player.update();

        if (this.frameCount % 10 === 0) {
            this.updateLeaderboard();
        }

        if (this.frameCount % 2 === 0 && !this.player.isDead) {
            this.socket.emit('sync', {
                name: this.playerName,
                pos: this.player.pos,
                history: this.player.history.slice(0, 400),
                score: this.player.score,
                length: this.player.snakeLength,
                color: this.player.color,
                isBoosting: this.player.isBoosting,
                initSync: this.initSynced
            });
        }

        if (!this.initSynced) this.initSynced = true;
    }

    updateLeaderboard() {
        const lbList = document.getElementById('lb-list');
        if (!lbList) return;

        const allEntities = [
            { name: this.playerName, score: this.player.score, isMe: true },
            ...Array.from(this.remotePlayers.values()).map(p => ({
                name: p.name || "玩家",
                score: p.score || 0
            })),
            ...this.remoteNPCs.map(n => ({
                name: n.name || "NPC",
                score: n.score || 0
            }))
        ];

        const sorted = allEntities
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        if (sorted)

        lbList.innerHTML = sorted.map((entry, index) => `
        <div class="lb-item ${entry.isMe ? 'lb-me' : ''}">
            <span>#${index + 1} ${index === 0 ? `<span style="position: relative; bottom: 0.1rem;">👑</span>` : ""}${entry.name}</span>
            <span style="margin-left: 10px;">${Math.floor(entry.score)}</span>
        </div>
    `).join('');
    }

    draw() {
        const { ctx, canvas, player } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const zoom = (Math.min(window.innerWidth, window.innerHeight) / 1000) * 1.5;

        ctx.save();

        ctx.translate(canvas.width / 2, canvas.height / 2);

        ctx.scale(zoom, zoom);

        ctx.translate(-player.pos.x, -player.pos.y);

        ctx.fillStyle = '#0f0f12';
        ctx.fillRect(0, 0, 3000, 3000);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';

        ctx.lineWidth = 1;

        const hexRadius = 40;

        const hexWidth = Math.sqrt(3) * hexRadius;
        const hexHeight = 2 * hexRadius;

        for (let y = 0; y < 3000 + hexHeight; y += hexHeight * 0.75) {
            let offset = (Math.floor(y / (hexHeight * 0.75)) % 2) * (hexWidth / 2);
            for (let x = 0; x < 3000 + hexWidth; x += hexWidth) {
                drawHexagon(ctx, x + offset, y, hexRadius);
            }
        }

        function drawHexagon(ctx, x, y, r) {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {

                const angle = (Math.PI / 3) * i + Math.PI / 6;
                const vx = x + r * Math.cos(angle);
                const vy = y + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }
            ctx.closePath();
            ctx.stroke();
        }

        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 15;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff3333';
        ctx.strokeRect(0, 0, 3000, 3000);
        ctx.shadowBlur = 0;

        const pulse = Math.sin(Date.now() / 200) * 2;
        this.food.forEach(f => {
            ctx.save();
            ctx.shadowBlur = 0.5;
            ctx.shadowColor = f.color;
            ctx.fillStyle = f.color;

            ctx.globalAlpha = 0.1;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.size + pulse + 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        [...this.remoteNPCs, ...Array.from(this.remotePlayers.values())].forEach(s => {
            this.player.draw.call(s, ctx);
        });

        this.player.draw(ctx);
        ctx.restore();
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    start() {
        this.loop();
    }
}
