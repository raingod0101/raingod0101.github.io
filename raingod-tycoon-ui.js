        function syncUI() {
            document.getElementById('m').innerText = Math.floor(money).toLocaleString();
            document.getElementById('dm').innerText = darkMatter;
            document.getElementById('waveNum').innerText = wave;
            document.getElementById('enemyCount').innerText = enemies.length;

            document.getElementById('cd1').innerText = skillCd[0] > 0 ? `${Math.ceil(skillCd[0]/60)}s` : '就緒';
            document.getElementById('cd2').innerText = skillCd[1] > 0 ? `${Math.ceil(skillCd[1]/60)}s` : '就緒';
            document.getElementById('cd3').innerText = skillCd[2] > 0 ? `${Math.ceil(skillCd[2]/60)}s` : '就緒';

            document.getElementById('questText').innerText = quest.desc;
            document.getElementById('questProg').innerText = `${quest.current}/${quest.target}`;

            document.getElementById('tDmgCost').innerText = `${(talents.dmgLv + 1) * 5} DM`;
            document.getElementById('tSpdCost').innerText = `${(talents.spdLv + 1) * 5} DM`;
            document.getElementById('tArmyCost').innerText = `${(talents.armyLv + 1) * 5} DM`;

            const getTurretCost = (type, base) => Math.floor(base * Math.pow(1.3, turrets.filter(t=>t.type===type).length));
            document.getElementById('costGatling').innerText = `$${getTurretCost('gatling', 1000).toLocaleString()}`;
            document.getElementById('costLaser').innerText = `$${getTurretCost('laser', 5000).toLocaleString()}`;
            document.getElementById('costMortar').innerText = `$${getTurretCost('mortar', 20000).toLocaleString()}`;
            document.getElementById('costFrost').innerText = `$${getTurretCost('frost', 50000).toLocaleString()}`;
            document.getElementById('costBlackhole').innerText = `$${getTurretCost('blackhole', 200000).toLocaleString()}`;

            document.getElementById('minerLv').innerText = minerLevel;
            document.getElementById('capLv').innerText = capacity;
            document.getElementById('bCost').innerText = `$${Math.floor(500 * Math.pow(1.3, bots.length)).toLocaleString()}`;
            document.getElementById('mCost').innerText = `$${Math.floor(1000 * Math.pow(1.5, minerLevel)).toLocaleString()}`;
            document.getElementById('cCost').innerText = `$${Math.floor(1500 * (capacity / 2)).toLocaleString()}`;
            document.getElementById('playerDamageLv').innerText = playerDamageLevel;
            document.getElementById('playerDamageCost').innerText = `$${Math.floor(1000 * Math.pow(1.6, playerDamageLevel)).toLocaleString()}`;
            document.getElementById('turretDamageLv').innerText = turretDamageLevel;
            document.getElementById('turretDamageCost').innerText = `$${Math.floor(1500 * Math.pow(1.6, turretDamageLevel)).toLocaleString()}`;

            document.getElementById('rebirthGain').innerText = `+${Math.floor(money / 100000)} DM`;

            refreshWorldHUD();
        }

        function update() {
            frame++;
            for (let i = 0; i < skillCd.length; i++) { if (skillCd[i] > 0) skillCd[i]--; }
            if (overclockTimer > 0) { overclockTimer--; if (overclockTimer === 0) isOverclocked = false; }

            if (viewMode === 'base') {
                updateBase();
            } else {
                updateWorld();
            }
            syncUI();
            if (frame % 180 === 0) saveGame();
        }

        // ============================================================
        // 基地繪製
        // ============================================================
        function drawBase() {
            ctx.save();
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            if (shakeTime > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
            ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, cvs.width, cvs.height);

            ctx.strokeStyle = 'rgba(30, 41, 59, 0.25)'; ctx.lineWidth = 1;
            for (let x = 0; x < cvs.width; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cvs.height); ctx.stroke(); }
            for (let y = 0; y < cvs.height; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cvs.width, y); ctx.stroke(); }

            const b = getBuildings();
            Object.values(b).forEach(bld => { drawBuilding(bld); });
            turrets.forEach(t => { drawTurret(t); });

            bullets.forEach(bul => {
                ctx.shadowColor = bul.color; ctx.shadowBlur = 10;
                ctx.fillStyle = bul.color;
                ctx.beginPath(); ctx.arc(bul.x, bul.y, bul.splash ? 8 : 4, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            });

            enemies.forEach(e => { drawEnemy(e); });

            items.forEach(it => {
                ctx.shadowColor = ITEMS[it.type].color; ctx.shadowBlur = 8;
                ctx.fillStyle = ITEMS[it.type].color;
                ctx.beginPath(); ctx.roundRect(it.x - 7, it.y - 7, 14, 14, 3); ctx.fill();
                ctx.shadowBlur = 0;
            });

            bots.forEach(bot => { drawWorkerBot(bot); });
            drawPlayer();

            forgeSparks.forEach(sp => {
                ctx.fillStyle = sp.color;
                ctx.globalAlpha = Math.min(1, sp.life / 20);
                ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI*2); ctx.fill();
                ctx.globalAlpha = 1;
            });

            battleEffects.forEach(ef => {
                if (ef.type === 'soldierCharge') {
                    ctx.save();
                    ctx.globalAlpha = ef.life / ef.maxLife;
                    drawSoldierAt(ef.x, ef.y, 0, 0.5);
                    ctx.restore();
                } else if (ef.type === 'marchDust') {
                    ctx.fillStyle = `rgba(148, 163, 184, ${ef.life/90 * 0.5})`;
                    ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.size, 0, Math.PI*2); ctx.fill();
                }
            });

            particles.forEach(pt => { ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.alpha); ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; });
            floatTexts.forEach(ft => { ctx.fillStyle = ft.color; ctx.globalAlpha = Math.max(0, ft.alpha); ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ft.text, ft.x, ft.y); ctx.globalAlpha = 1; });

            ctx.restore();
        }

        function drawBuilding(bld) {
            ctx.save();
            const cx = bld.x + bld.w/2, cy = bld.y + bld.h/2;
            const fa = factoryAnim[bld.type];
            const pulse = fa && fa.active ? 1 + Math.sin(frame * 0.3) * 0.08 : 1;

            ctx.shadowColor = bld.color;
            ctx.shadowBlur = fa && fa.active ? 25 : 12;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
            ctx.strokeStyle = bld.color;
            ctx.lineWidth = 2.5;

            if (bld.type === 'hub') {
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = i * Math.PI/3 - Math.PI/6;
                    const px = cx + Math.cos(angle) * (bld.w/2) * pulse;
                    const py = cy + Math.sin(angle) * (bld.h/2) * pulse;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath(); ctx.fill(); ctx.stroke();
                const radarAngle = frame * 0.05;
                ctx.beginPath(); ctx.arc(cx, cy, 28, radarAngle, radarAngle + Math.PI * 0.5);
                ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.stroke();
                ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2); ctx.fillStyle = '#38bdf8'; ctx.fill();
                ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
            } else if (bld.type === 'extractor') {
                ctx.beginPath(); ctx.ellipse(cx, cy + 10, bld.w/2.5, bld.h/3, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
                const drillAngle = frame * 0.1;
                ctx.save();
                ctx.translate(cx, cy - 10);
                ctx.rotate(drillAngle);
                ctx.fillStyle = bld.color;
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const a = i * Math.PI/2;
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
                }
                ctx.strokeStyle = bld.color; ctx.lineWidth = 4; ctx.stroke();
                ctx.restore();
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(cx - 20, cy + 15, 40, 10);
            } else if (bld.type === 'smelter' || bld.type === 'chipFab' || bld.type === 'nukeFab' || bld.type === 'qFab' || bld.type === 'antiFab') {
                ctx.beginPath(); ctx.roundRect(bld.x, bld.y, bld.w, bld.h, 8); ctx.fill(); ctx.stroke();
                ctx.fillStyle = bld.color + '80';
                ctx.fillRect(bld.x + 10, bld.y - 20, 14, 30);
                ctx.fillRect(bld.x + 34, bld.y - 15, 14, 25);
                if (fa && fa.active) {
                    for (let i = 0; i < 3; i++) {
                        const smokeY = bld.y - 20 - ((frame * 2 + i * 15) % 40);
                        ctx.fillStyle = `rgba(148, 163, 184, ${0.4 - i * 0.1})`;
                        ctx.beginPath(); ctx.arc(bld.x + 17 + Math.sin(frame*0.1 + i)*5, smokeY, 6 + i*2, 0, Math.PI*2); ctx.fill();
                    }
                }
                const gearAngle = frame * 0.03;
                ctx.save();
                ctx.translate(cx, cy + 5);
                ctx.rotate(gearAngle);
                ctx.strokeStyle = bld.color;
                ctx.lineWidth = 2;
                for (let i = 0; i < 8; i++) {
                    const a = i * Math.PI / 4;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
                    ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
                    ctx.stroke();
                }
                ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.stroke();
                ctx.restore();
                if (fa && fa.active) {
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(bld.x + 10, bld.y + bld.h - 8, bld.w - 20, 5);
                    ctx.fillStyle = bld.color;
                    ctx.fillRect(bld.x + 10, bld.y + bld.h - 8, (bld.w - 20) * fa.progress, 5);
                }
            }
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(bld.label, bld.x + bld.w/2, bld.y - 28);
            ctx.restore();
        }

        function drawTurret(t) {
            const colors = { gatling: '#f59e0b', laser: '#3b82f6', mortar: '#a855f7', frost: '#0284c7', blackhole: '#c084fc' };
            const c = colors[t.type];
            ctx.save();
            ctx.shadowColor = c; ctx.shadowBlur = 15;

            ctx.fillStyle = '#1e293b';
            ctx.beginPath(); ctx.arc(t.x, t.y + 8, 20, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();

            ctx.fillStyle = c;
            if (t.type === 'gatling') {
                ctx.beginPath(); ctx.roundRect(t.x - 12, t.y - 22, 24, 30, 4); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.fillRect(t.x - 6, t.y - 30, 12, 10);
                const ang = frame * 0.15;
                ctx.save(); ctx.translate(t.x, t.y - 25); ctx.rotate(ang);
                ctx.fillStyle = '#fff'; ctx.fillRect(-15, -2, 30, 4);
                ctx.restore();
            } else if (t.type === 'laser') {
                ctx.beginPath(); ctx.moveTo(t.x, t.y - 35); ctx.lineTo(t.x + 14, t.y + 5); ctx.lineTo(t.x - 14, t.y + 5); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(t.x, t.y - 22, 5, 0, Math.PI*2); ctx.fill();
            } else if (t.type === 'mortar') {
                ctx.beginPath(); ctx.ellipse(t.x, t.y - 5, 18, 10, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillRect(t.x - 7, t.y - 30, 14, 25);
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(t.x, t.y - 32, 6, 0, Math.PI*2); ctx.fill();
            } else if (t.type === 'frost') {
                for (let i = 0; i < 6; i++) {
                    const a = i * Math.PI/3 + frame * 0.01;
                    ctx.beginPath();
                    ctx.moveTo(t.x, t.y);
                    ctx.lineTo(t.x + Math.cos(a)*22, t.y + Math.sin(a)*22);
                    ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.stroke();
                }
                ctx.beginPath(); ctx.arc(t.x, t.y, 12, 0, Math.PI*2); ctx.fillStyle = c; ctx.fill();
            } else if (t.type === 'blackhole') {
                ctx.beginPath(); ctx.arc(t.x, t.y, 25, 0, Math.PI*2); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.stroke();
                const bhGrad = ctx.createRadialGradient(t.x, t.y, 2, t.x, t.y, 18);
                bhGrad.addColorStop(0, '#000');
                bhGrad.addColorStop(1, c);
                ctx.fillStyle = bhGrad;
                ctx.beginPath(); ctx.arc(t.x, t.y, 18, 0, Math.PI*2); ctx.fill();
                for (let i = 0; i < 4; i++) {
                    const a = frame * 0.05 + i * Math.PI/2;
                    const r = 22 + Math.sin(frame * 0.1 + i) * 4;
                    ctx.fillStyle = '#c084fc';
                    ctx.beginPath(); ctx.arc(t.x + Math.cos(a)*r, t.y + Math.sin(a)*r, 3, 0, Math.PI*2); ctx.fill();
                }
            }
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        function drawEnemy(e) {
            const anim = e.anim || 0;
            const sizes = { normal: 16, runner: 12, tank: 22, bomber: 14, boss: 36 };
            const colors = { normal: '#ef4444', runner: '#f59e0b', tank: '#64748b', bomber: '#22c55e', boss: '#e11d48' };
            const sz = sizes[e.type];
            const c = colors[e.type];
            ctx.save();
            ctx.shadowColor = c; ctx.shadowBlur = e.type === 'boss' ? 25 : 8;
            ctx.fillStyle = c;

            if (e.type === 'normal') {
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const ax = e.x + Math.sin(anim + i * 0.8) * 6;
                    const ay = e.y - sz + i * (sz * 2 / 4);
                    ctx.arc(ax, ay, sz * 0.6 - i * 1.5, 0, Math.PI*2);
                }
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(e.x - 5, e.y - 8, 3, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(e.x + 5, e.y - 8, 3, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(e.x - 5, e.y - 8, 1.5, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(e.x + 5, e.y - 8, 1.5, 0, Math.PI*2); ctx.fill();
            } else if (e.type === 'runner') {
                ctx.beginPath();
                ctx.moveTo(e.x + Math.sin(anim)*3, e.y - sz);
                ctx.lineTo(e.x + sz, e.y + Math.sin(anim)*3);
                ctx.lineTo(e.x, e.y + sz);
                ctx.lineTo(e.x - sz, e.y - Math.sin(anim)*3);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(e.x, e.y, 3, 0, Math.PI*2); ctx.fill();
            } else if (e.type === 'tank') {
                ctx.beginPath(); ctx.ellipse(e.x, e.y, sz, sz * 0.7, 0, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#475569'; ctx.lineWidth = 3;
                ctx.beginPath();
                for (let i = -2; i <= 2; i++) {
                    ctx.moveTo(e.x + i * 7, e.y - sz * 0.5);
                    ctx.lineTo(e.x + i * 7, e.y + sz * 0.5);
                }
                ctx.stroke();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(e.x - 8, e.y - 5, 4, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(e.x + 8, e.y - 5, 4, 0, Math.PI*2); ctx.fill();
            } else if (e.type === 'bomber') {
                ctx.beginPath(); ctx.ellipse(e.x, e.y, sz, sz*0.7, Math.sin(anim)*0.2, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = c; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(e.x, e.y - sz*0.7); ctx.lineTo(e.x + 5, e.y - sz - 5); ctx.stroke();
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath(); ctx.arc(e.x + 5, e.y - sz - 5, 3 + Math.sin(anim*2)*2, 0, Math.PI*2); ctx.fill();
            } else if (e.type === 'boss') {
                ctx.beginPath();
                for (let i = 0; i < 12; i++) {
                    const a = i * Math.PI/6;
                    const r = sz * (i % 2 === 0 ? 1 : 0.7) * (1 + Math.sin(anim + i) * 0.1);
                    const px = e.x + Math.cos(a) * r;
                    const py = e.y + Math.sin(a) * r;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(e.x, e.y, 10 + Math.sin(anim*2)*3, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(e.x - 12, e.y - 10, 5, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(e.x + 12, e.y - 10, 5, 0, Math.PI*2); ctx.fill();
            }
            ctx.shadowBlur = 0;
            const barW = sz * 2.2;
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - barW/2, e.y - sz - 14, barW, 5);
            ctx.fillStyle = '#22c55e'; ctx.fillRect(e.x - barW/2, e.y - sz - 14, (e.hp / e.maxHp) * barW, 5);
            ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(e.x - barW/2, e.y - sz - 14, barW, 5);
            ctx.restore();
        }

        function drawWorkerBot(bot) {
            const walk = Math.sin(bot.walkCycle || 0) * 3;
            ctx.save();
            ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 12;
            ctx.fillStyle = '#0ea5e9';
            ctx.beginPath(); ctx.roundRect(bot.x - 12, bot.y - 14 + walk * 0.3, 24, 24, 5); ctx.fill();
            ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath(); ctx.arc(bot.x, bot.y - 18, 8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#0284c7';
            ctx.beginPath(); ctx.arc(bot.x - 3, bot.y - 19, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(bot.x + 3, bot.y - 19, 2, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#334155';
            ctx.fillRect(bot.x - 14, bot.y + 8, 28, 5);
            ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(bot.x, bot.y - 26); ctx.lineTo(bot.x + 4, bot.y - 32); ctx.stroke();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(bot.x + 4, bot.y - 32, 2 + Math.sin(frame*0.2)*1, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
            drawStack(bot);
        }

        function drawPlayer() {
            const walk = Math.sin(p.walkCycle || 0) * 4;
            ctx.save();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.atkRange, 0, Math.PI * 2); ctx.stroke();

            ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 25;

            ctx.fillStyle = '#0284c7';
            ctx.fillRect(p.x - 12, p.y + 8 + walk, 8, 14);
            ctx.fillRect(p.x + 4, p.y + 8 - walk, 8, 14);
            ctx.fillStyle = '#0ea5e9';
            ctx.beginPath(); ctx.roundRect(p.x - 16, p.y - 14, 32, 28, 6); ctx.fill();
            ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(0, 0, 4 + Math.sin(frame*0.1)*1, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath(); ctx.roundRect(p.x - 10, p.y - 30, 20, 16, 5); ctx.fill();
            ctx.fillStyle = '#0284c7';
            ctx.beginPath(); ctx.roundRect(p.x - 8, p.y - 28, 16, 6, 2); ctx.fill();
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath(); ctx.arc(p.x - 3, p.y - 25, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(p.x + 3, p.y - 25, 2, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(p.x - 22, p.y - 10, 8, 14);
            ctx.fillRect(p.x + 14, p.y - 10, 8, 14);
            ctx.fillStyle = '#0ea5e9';
            ctx.fillRect(p.x - 24, p.y - 2 + walk * 0.5, 8, 18);
            ctx.fillRect(p.x + 16, p.y - 2 - walk * 0.5, 8, 18);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath(); ctx.moveTo(p.x - 8, p.y + 20); ctx.lineTo(p.x, p.y + 30 + Math.sin(frame*0.3)*3); ctx.lineTo(p.x + 8, p.y + 20); ctx.closePath(); ctx.fill();

            ctx.shadowBlur = 0;
            ctx.restore();
            drawStack(p);
        }

        function drawSoldierAt(x, y, facing, scale) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath(); ctx.arc(0, -8, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#b45309';
            ctx.fillRect(-5, -2, 10, 12);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-8, 0, 16, 3);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-4, 10, 3, 6);
            ctx.fillRect(1, 10, 3, 6);
            ctx.restore();
        }

        function drawEnemyAt(x, y) {
            ctx.save();
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#7f1d1d';
            ctx.fillRect(x - 7, y + 5, 14, 5);
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        function drawStack(obj) {
            obj.bag.forEach((it, i) => {
                ctx.fillStyle = ITEMS[it.type].color;
                ctx.beginPath(); ctx.roundRect(obj.x - 10, obj.y - 40 - (i * 8), 20, 6, 2); ctx.fill();
            });
        }

        // ============================================================
        // 世界地圖繪製
        // ============================================================
        function drawWorld() {
            ctx.save();
            ctx.clearRect(0, 0, cvs.width, cvs.height);

            if (shakeTime > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);

            const grad = ctx.createRadialGradient(cvs.width/2, cvs.height/2, 100, cvs.width/2, cvs.height/2, Math.max(cvs.width, cvs.height));
            grad.addColorStop(0, '#0b1020');
            grad.addColorStop(1, '#020617');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, cvs.width, cvs.height);

            for (let i = 0; i < 120; i++) {
                const sx = ((i * 137.5 + frame * 0.02) % 1) * cvs.width;
                const sy = ((i * 91.3 + frame * 0.01) % 1) * cvs.height;
                ctx.fillStyle = `rgba(255,255,255,${0.15 + (i % 5) * 0.08})`;
                ctx.fillRect(sx, sy, 1.5, 1.5);
            }

            const tl = worldToScreen(0, 0);
            const br = worldToScreen(WORLD_W, WORLD_H);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.lineWidth = 2;
            ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

            const gridSize = 200;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
            ctx.lineWidth = 1;
            for (let gx = 0; gx <= WORLD_W; gx += gridSize) {
                const a = worldToScreen(gx, 0), b2 = worldToScreen(gx, WORLD_H);
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
            }
            for (let gy = 0; gy <= WORLD_H; gy += gridSize) {
                const a = worldToScreen(0, gy), b2 = worldToScreen(WORLD_W, gy);
                ctx.beginPath(); ctx.moveTo(0, a.y); ctx.lineTo(0, b2.y); ctx.stroke();
            }

            worldMap.forEach(t => {
                const s = worldToScreen(t.x, t.y);
                const w = t.w * camera.zoom;
                const h = t.h * camera.zoom;
                if (s.x + w < -20 || s.y + h < -20 || s.x > cvs.width + 20 || s.y > cvs.height + 20) return;

                const isSelected = t.id === selectedTerritoryId;
                const ownerColor = t.owner === 'player' ? '#22c55e' :
                                   t.owner === 'enemy' ? '#ef4444' : '#94a3b8';

                ctx.shadowColor = ownerColor;
                ctx.shadowBlur = isSelected ? 30 : 12;

                ctx.save();
                if (t.type === 'capital') {
                    ctx.beginPath();
                    ctx.arc(s.x + w/2, s.y + h/2, Math.min(w, h)/2, 0, Math.PI*2);
                } else if (t.type === 'resource') {
                    ctx.beginPath();
                    ctx.roundRect(s.x, s.y, w, h, 20 * camera.zoom);
                } else {
                    ctx.beginPath();
                    const cx2 = s.x + w/2, cy2 = s.y + h/2;
                    const rw = w/2, rh = h/2;
                    for (let i = 0; i < 6; i++) {
                        const a = i * Math.PI/3 - Math.PI/6;
                        const px = cx2 + Math.cos(a) * rw;
                        const py = cy2 + Math.sin(a) * rh;
                        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                }

                const bgGrad = ctx.createLinearGradient(s.x, s.y, s.x + w, s.y + h);
                if (t.type === 'capital') {
                    bgGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
                    bgGrad.addColorStop(1, 'rgba(14, 165, 233, 0.15)');
                } else if (t.owner === 'player') {
                    bgGrad.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
                    bgGrad.addColorStop(1, 'rgba(22, 163, 74, 0.1)');
                } else if (t.owner === 'enemy') {
                    bgGrad.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
                    bgGrad.addColorStop(1, 'rgba(185, 28, 28, 0.1)');
                } else {
                    bgGrad.addColorStop(0, 'rgba(148, 163, 184, 0.25)');
                    bgGrad.addColorStop(1, 'rgba(71, 85, 105, 0.08)');
                }
                ctx.fillStyle = bgGrad;
                ctx.fill();
                ctx.strokeStyle = ownerColor;
                ctx.lineWidth = isSelected ? 4 : 2.5;
                ctx.stroke();
                ctx.restore();

                ctx.save();
                ctx.shadowColor = ownerColor; ctx.shadowBlur = 8;
                ctx.fillStyle = ownerColor;
                const iconSize = 14 * camera.zoom;
                if (t.type === 'capital') {
                    ctx.fillRect(s.x + w/2 - iconSize/2, s.y + h/2 - 20 * camera.zoom, iconSize, iconSize * 1.5);
                } else if (t.type === 'resource') {
                    ctx.beginPath();
                    ctx.moveTo(s.x + w/2, s.y + h/2 - 15 * camera.zoom);
                    ctx.lineTo(s.x + w/2 + 12 * camera.zoom, s.y + h/2);
                    ctx.lineTo(s.x + w/2, s.y + h/2 + 15 * camera.zoom);
                    ctx.lineTo(s.x + w/2 - 12 * camera.zoom, s.y + h/2);
                    ctx.closePath(); ctx.fill();
                } else {
                    ctx.font = `${Math.max(12, 20 * camera.zoom)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('⚔️', s.x + w/2, s.y + h/2 + 5 * camera.zoom);
                }
                ctx.restore();

                ctx.fillStyle = '#f8fafc';
                ctx.font = `bold ${Math.max(10, 14 * camera.zoom)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(t.name, s.x + w/2, s.y + h/2 - 30 * camera.zoom);

                ctx.font = `${Math.max(8, 10 * camera.zoom)}px sans-serif`;
                let sub = '';
                if (t.owner === 'player') sub = '🟢 已佔領';
                else if (t.owner === 'enemy') sub = `🔴 守軍 ${t.garrisonCurrent}`;
                else sub = `⚪ 守軍 ${t.garrisonCurrent}`;
                ctx.fillStyle = ownerColor;
                ctx.fillText(sub, s.x + w/2, s.y + h/2 + 22 * camera.zoom);

                if (t.owner === 'player' && t.income > 0) {
                    ctx.fillStyle = '#4ade80';
                    ctx.fillText(`+$${t.income.toLocaleString()}`, s.x + w/2, s.y + h/2 + 36 * camera.zoom);
                }

                ctx.shadowBlur = 0;
            });

            // 行軍 + 戰鬥繪製
            if (armyMarch.active) {
                const from = worldToScreen(armyMarch.from.x, armyMarch.from.y);
                const to = worldToScreen(armyMarch.to.x, armyMarch.to.y);
                const px = from.x + (to.x - from.x) * armyMarch.progress;
                const py = from.y + (to.y - from.y) * armyMarch.progress;

                const totalUnits = Math.min(14, armyMarch.soldiers + armyMarch.tanks);
                for (let i = 0; i < totalUnits; i++) {
                    const offX = (i % 5 - 2) * 16;
                    const offY = (Math.floor(i / 5) - 1) * 16;
                    drawSoldierAt(px + offX, py + offY, 0, 0.55);
                }

                if (armyMarch.phase === 'fight' || armyMarch.phase === 'done') {
                    const t = worldMap.find(x => x.id === armyMarch.targetId);
                    if (t) {
                        const en = worldToScreen(t.x + t.w / 2, t.y + t.h / 2);
                        const enemyUnits = Math.min(12, Math.ceil(t.garrisonCurrent / 20));
                        for (let i = 0; i < enemyUnits; i++) {
                            const offX = (i % 4 - 1.5) * 20;
                            const offY = (Math.floor(i / 4) - 1) * 20;
                            drawEnemyAt(en.x + offX, en.y + offY + 30);
                        }
                        if (armyMarch.phase === 'fight') {
                            for (let i = 0; i < 3; i++) {
                                const ax = px + (Math.random() - 0.5) * 40;
                                const ay = py + (Math.random() - 0.5) * 40;
                                const bx = en.x + (Math.random() - 0.5) * 60;
                                const by = en.y + (Math.random() - 0.5) * 60;
                                ctx.strokeStyle = Math.random() > 0.5 ? '#fbbf24' : '#ef4444';
                                ctx.lineWidth = 2;
                                ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
                            }
                        }
                        const eBarW = 120;
                        ctx.fillStyle = 'rgba(0,0,0,0.7)';
                        ctx.fillRect(en.x - eBarW / 2, en.y - 90, eBarW, 10);
                        ctx.fillStyle = '#ef4444';
                        ctx.fillRect(en.x - eBarW / 2, en.y - 90, eBarW * Math.max(0, armyMarch.enemyHp / Math.max(1, armyMarch.enemyHpMax)), 10);
                        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.5;
                        ctx.strokeRect(en.x - eBarW / 2, en.y - 90, eBarW, 10);
                        ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
                        ctx.fillText(`守軍 ${Math.ceil(Math.max(0, armyMarch.enemyHp))}`, en.x, en.y - 95);

                        const pBarW = 120;
                        ctx.fillStyle = 'rgba(0,0,0,0.7)';
                        ctx.fillRect(px - pBarW / 2, py - 70, pBarW, 10);
                        ctx.fillStyle = '#22c55e';
                        ctx.fillRect(px - pBarW / 2, py - 70, pBarW * Math.max(0, armyMarch.playerHp / Math.max(1, armyMarch.playerHpMax)), 10);
                        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.5;
                        ctx.strokeRect(px - pBarW / 2, py - 70, pBarW, 10);
                        ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
                        ctx.fillText(`我軍 ${Math.ceil(Math.max(0, armyMarch.playerHp))}`, px, py - 75);
                    }
                }

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                const label = armyMarch.phase === 'march' ? '⚔️ 軍隊行軍中...' : (armyMarch.phase === 'fight' ? '🔥 戰鬥進行中...' : '✅ 戰鬥結束');
                ctx.fillText(label, cvs.width / 2, 75);
            }

            // 指揮官
            const cs = worldToScreen(commander.x, commander.y);
            const pulse = 1 + Math.sin(frame * 0.12) * 0.15;
            const walk = Math.sin(commander.walkCycle || 0) * 3;

            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 30;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
            ctx.beginPath(); ctx.arc(cs.x, cs.y, 16 * pulse, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            ctx.save();
            ctx.translate(cs.x, cs.y);
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(-8, 6 + walk, 6, 10);
            ctx.fillRect(2, 6 - walk, 6, 10);
            ctx.fillStyle = '#0ea5e9';
            ctx.beginPath(); ctx.roundRect(-12, -10, 24, 20, 5); ctx.fill();
            ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(0, 0, 4 + Math.sin(frame*0.1)*1, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath(); ctx.roundRect(-8, -22, 16, 12, 4); ctx.fill();
            ctx.fillStyle = '#0284c7';
            ctx.beginPath(); ctx.roundRect(-6, -20, 12, 4, 2); ctx.fill();
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-18, -6, 6, 10);
            ctx.fillRect(12, -6, 6, 10);
            ctx.fillStyle = '#0ea5e9';
            ctx.fillRect(-24, -2 + walk * 0.5, 8, 18);
            ctx.fillRect(16, -2 - walk * 0.5, 8, 18);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath(); ctx.moveTo(-8, 20); ctx.lineTo(0, 30 + Math.sin(frame*0.3)*3); ctx.lineTo(8, 20); ctx.closePath(); ctx.fill();

            ctx.shadowBlur = 0;
            ctx.restore();
            drawStack(p);
        }

        function drawSoldierAt(x, y, facing, scale) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath(); ctx.arc(0, -8, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#b45309';
            ctx.fillRect(-5, -2, 10, 12);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-8, 0, 16, 3);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-4, 10, 3, 6);
            ctx.fillRect(1, 10, 3, 6);
            ctx.restore();
        }

        function drawEnemyAt(x, y) {
            ctx.save();
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#7f1d1d';
            ctx.fillRect(x - 7, y + 5, 14, 5);
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        function drawStack(obj) {
            obj.bag.forEach((it, i) => {
                ctx.fillStyle = ITEMS[it.type].color;
                ctx.beginPath(); ctx.roundRect(obj.x - 10, obj.y - 40 - (i * 8), 20, 6, 2); ctx.fill();
            });
        }

        // ============================================================
        // 世界地圖繪製
        // ============================================================
        function drawWorld() {
            ctx.save();
            ctx.clearRect(0, 0, cvs.width, cvs.height);

            if (shakeTime > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);

            const grad = ctx.createRadialGradient(cvs.width/2, cvs.height/2, 100, cvs.width/2, cvs.height/2, Math.max(cvs.width, cvs.height));
            grad.addColorStop(0, '#0b1020');
            grad.addColorStop(1, '#020617');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, cvs.width, cvs.height);

            for (let i = 0; i < 120; i++) {
                const sx = ((i * 137.5 + frame * 0.02) % 1) * cvs.width;
                const sy = ((i * 91.3 + frame * 0.01) % 1) * cvs.height;
                ctx.fillStyle = `rgba(255,255,255,${0.15 + (i % 5) * 0.08})`;
                ctx.fillRect(sx, sy, 1.5, 1.5);
            }

            const tl = worldToScreen(0, 0);
            const br = worldToScreen(WORLD_W, WORLD_H);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.lineWidth = 2;
            ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

            const gridSize = 200;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
            ctx.lineWidth = 1;
            for (let gx = 0; gx <= WORLD_W; gx += gridSize) {
                const a = worldToScreen(gx, 0), b2 = worldToScreen(gx, WORLD_H);
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
            }
            for (let gy = 0; gy <= WORLD_H; gy += gridSize) {
                const a = worldToScreen(0, gy), b2 = worldToScreen(WORLD_W, gy);
                ctx.beginPath(); ctx.moveTo(0, a.y); ctx.lineTo(0, b2.y); ctx.stroke();
            }

            worldMap.forEach(t => {
                const s = worldToScreen(t.x, t.y);
                const w = t.w * camera.zoom;
                const h = t.h * camera.zoom;
                if (s.x + w < -20 || s.y + h < -20 || s.x > cvs.width + 20 || s.y > cvs.height + 20) return;

                const isSelected = t.id === selectedTerritoryId;
                const ownerColor = t.owner === 'player' ? '#22c55e' :
                                   t.owner === 'enemy' ? '#ef4444' : '#94a3b8';

                ctx.shadowColor = ownerColor;
                ctx.shadowBlur = isSelected ? 30 : 12;

                ctx.save();
                if (t.type === 'capital') {
                    ctx.beginPath();
                    ctx.arc(s.x + w/2, s.y + h/2, Math.min(w, h)/2, 0, Math.PI*2);
                } else if (t.type === 'resource') {
                    ctx.beginPath();
                    ctx.roundRect(s.x, s.y, w, h, 20 * camera.zoom);
                } else {
                    ctx.beginPath();
                    const cx2 = s.x + w/2, cy2 = s.y + h/2;
                    const rw = w/2, rh = h/2;
                    for (let i = 0; i < 6; i++) {
                        const a = i * Math.PI/3 - Math.PI/6;
                        const px = cx2 + Math.cos(a) * rw;
                        const py = cy2 + Math.sin(a) * rh;
                        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                }

                const bgGrad = ctx.createLinearGradient(s.x, s.y, s.x + w, s.y + h);
                if (t.type === 'capital') {
                    bgGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
                    bgGrad.addColorStop(1, 'rgba(14, 165, 233, 0.15)');
                } else if (t.owner === 'player') {
                    bgGrad.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
                    bgGrad.addColorStop(1, 'rgba(22, 163, 74, 0.1)');
                } else if (t.owner === 'enemy') {
                    bgGrad.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
                    bgGrad.addColorStop(1, 'rgba(185, 28, 28, 0.1)');
                } else {
                    bgGrad.addColorStop(0, 'rgba(148, 163, 184, 0.25)');
                    bgGrad.addColorStop(1, 'rgba(71, 85, 105, 0.08)');
                }
                ctx.fillStyle = bgGrad;
                ctx.fill();
                ctx.strokeStyle = ownerColor;
                ctx.lineWidth = isSelected ? 4 : 2.5;
                ctx.stroke();
                ctx.restore();

                ctx.save();
                ctx.shadowColor = ownerColor; ctx.shadowBlur = 8;
                ctx.fillStyle = ownerColor;
                const iconSize = 14 * camera.zoom;
                if (t.type === 'capital') {
                    ctx.fillRect(s.x + w/2 - iconSize/2, s.y + h/2 - 20 * camera.zoom, iconSize, iconSize * 1.5);
                } else if (t.type === 'resource') {
                    ctx.beginPath();
                    ctx.moveTo(s.x + w/2, s.y + h/2 - 15 * camera.zoom);
                    ctx.lineTo(s.x + w/2 + 12 * camera.zoom, s.y + h/2);
                    ctx.lineTo(s.x + w/2, s.y + h/2 + 15 * camera.zoom);
                    ctx.lineTo(s.x + w/2 - 12 * camera.zoom, s.y + h/2);
                    ctx.closePath(); ctx.fill();
                } else {
                    ctx.font = `${Math.max(12, 20 * camera.zoom)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('⚔️', s.x + w/2, s.y + h/2 + 5 * camera.zoom);
                }
                ctx.restore();

                ctx.fillStyle = '#f8fafc';
                ctx.font = `bold ${Math.max(10, 14 * camera.zoom)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(t.name, s.x + w/2, s.y + h/2 - 30 * camera.zoom);

                ctx.font = `${Math.max(8, 10 * camera.zoom)}px sans-serif`;
                let sub = '';
                if (t.owner === 'player') sub = '🟢 已佔領';
                else if (t.owner === 'enemy') sub = `🔴 守軍 ${t.garrisonCurrent}`;
                else sub = `⚪ 守軍 ${t.garrisonCurrent}`;
                ctx.fillStyle = ownerColor;
                ctx.fillText(sub, s.x + w/2, s.y + h/2 + 22 * camera.zoom);

                if (t.owner === 'player' && t.income > 0) {
                    ctx.fillStyle = '#4ade80';
                    ctx.fillText(`+$${t.income.toLocaleString()}`, s.x + w/2, s.y + h/2 + 36 * camera.zoom);
                }

                ctx.shadowBlur = 0;
            });

            // 行軍 + 戰鬥繪製
            if (armyMarch.active) {
                const from = worldToScreen(armyMarch.from.x, armyMarch.from.y);
                const to = worldToScreen(armyMarch.to.x, armyMarch.to.y);
                const px = from.x + (to.x - from.x) * armyMarch.progress;
                const py = from.y + (to.y - from.y) * armyMarch.progress;

                const totalUnits = Math.min(14, armyMarch.soldiers + armyMarch.tanks);
                for (let i = 0; i < totalUnits; i++) {
                    const offX = (i % 5 - 2) * 16;
                    const offY = (Math.floor(i / 5) - 1) * 16;
                    drawSoldierAt(px + offX, py + offY, 0, 0.55);
                }

                if (armyMarch.phase === 'fight' || armyMarch.phase === 'done') {
                    const t = worldMap.find(x => x.id === armyMarch.targetId);
                    if (t) {
                        const en = worldToScreen(t.x + t.w / 2, t.y + t.h / 2);
                        const enemyUnits = Math.min(12, Math.ceil(t.garrisonCurrent / 20));
                        for (let i = 0; i < enemyUnits; i++) {
                            const offX = (i % 4 - 1.5) * 20;
                            const offY = (Math.floor(i / 4) - 1) * 20;
                            drawEnemyAt(en.x + offX, en.y + offY + 30);
                        }
                        if (armyMarch.phase === 'fight') {
                            for (let i = 0; i < 3; i++) {
                                const ax = px + (Math.random() - 0.5) * 40;
                                const ay = py + (Math.random() - 0.5) * 40;
                                const bx = en.x + (Math.random() - 0.5) * 60;
                                const by = en.y + (Math.random() - 0.5) * 60;
                                ctx.strokeStyle = Math.random() > 0.5 ? '#fbbf24' : '#ef4444';
                                ctx.lineWidth = 2;
                                ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
                            }
                        }
                        const eBarW = 120;
                        ctx.fillStyle = 'rgba(0,0,0,0.7)';
                        ctx.fillRect(en.x - eBarW / 2, en.y - 90, eBarW, 10);
                        ctx.fillStyle = '#ef4444';
                        ctx.fillRect(en.x - eBarW / 2, en.y - 90, eBarW * Math.max(0, armyMarch.enemyHp / Math.max(1, armyMarch.enemyHpMax)), 10);
                        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.5;
                        ctx.strokeRect(en.x - eBarW / 2, en.y - 90, eBarW, 10);
                        ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
                        ctx.fillText(`守軍 ${Math.ceil(Math.max(0, armyMarch.enemyHp))}`, en.x, en.y - 95);

                        const pBarW = 120;
                        ctx.fillStyle = 'rgba(0,0,0,0.7)';
                        ctx.fillRect(px - pBarW / 2, py - 70, pBarW, 10);
                        ctx.fillStyle = '#22c55e';
                        ctx.fillRect(px - pBarW / 2, py - 70, pBarW * Math.max(0, armyMarch.playerHp / Math.max(1, armyMarch.playerHpMax)), 10);
                        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.5;
                        ctx.strokeRect(px - pBarW / 2, py - 70, pBarW, 10);
                        ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
                        ctx.fillText(`我軍 ${Math.ceil(Math.max(0, armyMarch.playerHp))}`, px, py - 75);
                    }
                }

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                const label = armyMarch.phase === 'march' ? '⚔️ 軍隊行軍中...' : (armyMarch.phase === 'fight' ? '🔥 戰鬥進行中...' : '✅ 戰鬥結束');
                ctx.fillText(label, cvs.width / 2, 75);
            }

            // 指揮官
            const cs = worldToScreen(commander.x, commander.y);
            const pulse = 1 + Math.sin(frame * 0.12) * 0.15;
            const walk = Math.sin(commander.walkCycle || 0) * 3;

            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 30;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
            ctx.beginPath(); ctx.arc(cs.x, cs.y, 16 * pulse, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            ctx.save();
            ctx.translate(cs.x, cs.y);
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(-8, 6 + walk, 6, 10);
            ctx.fillRect(2, 6 - walk, 6, 10);
            ctx.fillStyle = '#0ea5e9';
            ctx.beginPath(); ctx.roundRect(-12, -10, 24, 20, 5); ctx.fill();
            ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(0, 0, 4 + Math.sin(frame*0.1)*1, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath(); ctx.roundRect(-8, -22, 16, 12, 4); ctx.fill();
            ctx.fillStyle = '#0284c7';
            ctx.beginPath(); ctx.roundRect(-6, -20, 12, 4, 2); ctx.fill();
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-18, -6, 6, 10);
            ctx.fillRect(12, -6, 6, 10);
            ctx.fillStyle = '#0ea5e9';
            ctx.fillRect(-24, -2 + walk * 0.5, 8, 18);
            ctx.fillRect(16, -2 - walk * 0.5, 8, 18);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath(); ctx.moveTo(-8, 20); ctx.lineTo(0, 30 + Math.sin(frame*0.3)*3); ctx.lineTo(8, 20); ctx.closePath(); ctx.fill();

            ctx.shadowBlur = 0;
            ctx.restore();
            drawStack(p);
        }

        function drawSoldierAt(x, y, facing, scale) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath(); ctx.arc(0, -8, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#b45309';
            ctx.fillRect(-5, -2, 10, 12);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-8, 0, 16, 3);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-4, 10, 3, 6);
            ctx.fillRect(1, 10, 3, 6);
            ctx.restore();
        }

        function drawEnemyAt(x, y) {
            ctx.save();
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#7f1d1d';
            ctx.fillRect(x - 7, y + 5, 14, 5);
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        function drawStack(obj) {
            obj.bag.forEach((it, i) => {
                ctx.fillStyle = ITEMS[it.type].color;
                ctx.beginPath(); ctx.roundRect(obj.x - 10, obj.y - 40 - (i * 8), 20, 6, 2); ctx.fill();
            });
        }

        // ============================================================
        // 世界地圖繪製
        // ============================================================
        function drawWorld() {
            ctx.save();
            ctx.clearRect(0, 0, cvs.width, cvs.height);

            if (shakeTime > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);

            const grad = ctx.createRadialGradient(cvs.width/2, cvs.height/2, 100, cvs.width/2, cvs.height/2, Math.max(cvs.width, cvs.height));
            grad.addColorStop(0, '#0b1020');
            grad.addColorStop(1, '#020617');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, cvs.width, cvs.height);

            for (let i = 0; i < 120; i++) {
                const sx = ((i * 137.5 + frame * 0.02) % 1) * cvs.width;
                const sy = ((i * 91.3 + frame * 0.01) % 1) * cvs.height;
                ctx.fillStyle = `rgba(255,255,255,${0.15 + (i % 5) * 0.08})`;
                ctx.fillRect(sx, sy, 1.5, 1.5);
            }

            const tl = worldToScreen(0, 0);
            const br = worldToScreen(WORLD_W, WORLD_H);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.lineWidth = 2;
            ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

            const gridSize = 200;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
            ctx.lineWidth = 1;
            for (let gx = 0; gx <= WORLD_W; gx += gridSize) {
                const a = worldToScreen(gx, 0), b2 = worldToScreen(gx, WORLD_H);
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
            }
            for (let gy = 0; gy <= WORLD_H; gy += gridSize) {
                const a = worldToScreen(0, gy), b2 = worldToScreen(WORLD_W, gy);
                ctx.beginPath(); ctx.moveTo(0, a.y); ctx.lineTo(0, b2.y); ctx.stroke();
            }

            worldMap.forEach(t => {
                const s = worldToScreen(t.x, t.y);
                const w = t.w * camera.zoom;
                const h = t.h * camera.zoom;
                if (s.x + w < -20 || s.y + h < -20 || s.x > cvs.width + 20 || s.y > cvs.height + 20) return;

                const isSelected = t.id === selectedTerritoryId;
                const ownerColor = t.owner === 'player' ? '#22c55e' :
                                   t.owner === 'enemy' ? '#ef4444' : '#94a3b8';

                ctx.shadowColor = ownerColor;
                ctx.shadowBlur = isSelected ? 30 : 12;

                ctx.save();
                if (t.type === 'capital') {
                    ctx.beginPath();
                    ctx.arc(s.x + w/2, s.y + h/2, Math.min(w, h)/2, 0, Math.PI*2);
                } else if (t.type === 'resource') {
                    ctx.beginPath();
                    ctx.roundRect(s.x, s.y, w, h, 20 * camera.zoom);
                } else {
                    ctx.beginPath();
                    const cx2 = s.x + w/2, cy2 = s.y + h/2;
                    const rw = w/2, rh = h/2;
                    for (let i = 0; i < 6; i++) {
                        const a = i * Math.PI/3 - Math.PI/6;
                        const px = cx2 + Math.cos(a) * rw;
                        const py = cy2 + Math.sin(a) * rh;
                        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                }

                const bgGrad = ctx.createLinearGradient(s.x, s.y, s.x + w, s.y + h);
                if (t.type === 'capital') {
                    bgGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
                    bgGrad.addColorStop(1, 'rgba(14, 165, 233, 0.15)');
                } else if (t.owner === 'player') {
                    bgGrad.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
                    bgGrad.addColorStop(1, 'rgba(22, 163, 74, 0.1)');
                } else if (t.owner === 'enemy') {
                    bgGrad.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
                    bgGrad.addColorStop(1, 'rgba(185, 28, 28, 0.1)');
                } else {
                    bgGrad.addColorStop(0, 'rgba(148, 163, 184, 0.25)');
                    bgGrad.addColorStop(1, 'rgba(71, 85, 105, 0.08)');
                }
                ctx.fillStyle = bgGrad;
                ctx.fill();
                ctx.strokeStyle = ownerColor;
                ctx.lineWidth = isSelected ? 4 : 2.5;
                ctx.stroke();
                ctx.restore();

                ctx.save();
                ctx.shadowColor = ownerColor; ctx.shadowBlur = 8;
                ctx.fillStyle = ownerColor;
                const iconSize = 14 * camera.zoom;
                if (t.type === 'capital') {
                    ctx.fillRect(s.x + w/2 - iconSize/2, s.y + h/2 - 20 * camera.zoom, iconSize, iconSize * 1.5);
                } else if (t.type === 'resource') {
                    ctx.beginPath();
                    ctx.moveTo(s.x + w/2, s.y + h/2 - 15 * camera.zoom);
                    ctx.lineTo(s.x + w/2 + 12 * camera.zoom, s.y + h/2);
                    ctx.lineTo(s.x + w/2, s.y + h/2 + 15 * camera.zoom);
                    ctx.lineTo(s.x + w/2 - 12 * camera.zoom, s.y + h/2);
                    ctx.closePath(); ctx.fill();
                } else {
                    ctx.font = `${Math.max(12, 20 * camera.zoom)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('⚔️', s.x + w/2, s.y + h/2 + 5 * camera.zoom);
                }
                ctx.restore();

                ctx.fillStyle = '#f8fafc';
                ctx.font = `bold ${Math.max(10, 14 * camera.zoom)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(t.name, s.x + w/2, s.y + h/2 - 30 * camera.zoom);

                ctx.font = `${Math.max(8, 10 * camera.zoom)}px sans-serif`;
                let sub = '';
                if (t.owner === 'player') sub = '🟢 已佔領';
                else if (t.owner === 'enemy') sub = `🔴 守軍 ${t.garrisonCurrent}`;
                else sub = `⚪ 守軍 ${t.garrisonCurrent}`;
                ctx.fillStyle = ownerColor;
                ctx.fillText(sub, s.x + w/2, s.y + h/2 + 22 * camera.zoom);

                if (t.owner === 'player' && t.income > 0) {
                    ctx.fillStyle = '#4ade80';
                    ctx.fillText(`+$${t.income.toLocaleString()}`, s.x + w/2, s.y + h/2 + 36 * camera.zoom);
                }

                ctx.shadowBlur = 0;
            });

            // 行軍 + 戰鬥繪製
            if (armyMarch.active) {
                const from = worldToScreen(armyMarch.from.x, armyMarch.from.y);
                const to = worldToScreen(armyMarch.to.x, armyMarch.to.y);
                const px = from.x + (to.x - from.x) * armyMarch.progress;
                const py = from.y + (to.y - from.y) * armyMarch.progress;

                const totalUnits = Math.min(14, armyMarch.soldiers + armyMarch.tanks);
                for (let i = 0; i < totalUnits; i++) {
                    const offX = (i % 5 - 2) * 16;
                    const offY = (Math.floor(i / 5) - 1) * 16;
                    drawSoldierAt(px + offX, py + offY, 0, 0.55);
                }

                if (armyMarch.phase === 'fight' || armyMarch.phase === 'done') {
                    const t = worldMap.find(x => x.id === armyMarch.targetId);
                    if (t) {
                        const en = worldToScreen(t.x + t.w / 2, t.y + t.h / 2);
                        const enemyUnits = Math.min(12, Math.ceil(t.garrisonCurrent / 20));
                        for (let i = 0; i < enemyUnits; i++) {
                            const offX = (i % 4 - 1.5) * 20;
                            const offY = (Math.floor(i / 4) - 1) * 20;
                            drawEnemyAt(en.x + offX, en.y + offY + 30);
                        }
                        if (armyMarch.phase === 'fight') {
                            for (let i = 0; i < 3; i++) {
                                const ax = px + (Math.random() - 0.5) * 40;
                                const ay = py + (Math.random() - 0.5) * 40;
                                const bx = en.x + (Math.random() - 0.5) * 60;
                                const by = en.y + (Math.random() - 0.5) * 60;
                                ctx.strokeStyle = Math.random() > 0.5 ? '#fbbf24' : '#ef4444';
                                ctx.lineWidth = 2;
                                ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
                            }
                        }
                        const eBarW = 120;
                        ctx.fillStyle = 'rgba(0,0,0,0.7)';
                        ctx.fillRect(en.x - eBarW / 2, en.y - 90, eBarW, 10);
                        ctx.fillStyle = '#ef4444';
                        ctx.fillRect(en.x - eBarW / 2, en.y - 90, eBarW * Math.max(0, armyMarch.enemyHp / Math.max(1, armyMarch.enemyHpMax)), 10);
                        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.5;
                        ctx.strokeRect(en.x - eBarW / 2, en.y - 90, eBarW, 10);
                        ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
                        ctx.fillText(`守軍 ${Math.ceil(Math.max(0, armyMarch.enemyHp))}`, en.x, en.y - 95);

                        const pBarW = 120;
                        ctx.fillStyle = 'rgba(0,0,0,0.7)';
                        ctx.fillRect(px - pBarW / 2, py - 70, pBarW, 10);
                        ctx.fillStyle = '#22c55e';
                        ctx.fillRect(px - pBarW / 2, py - 70, pBarW * Math.max(0, armyMarch.playerHp / Math.max(1, armyMarch.playerHpMax)), 10);
                        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.5;
                        ctx.strokeRect(px - pBarW / 2, py - 70, pBarW, 10);
                        ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
                        ctx.fillText(`我軍 ${Math.ceil(Math.max(0, armyMarch.playerHp))}`, px, py - 75);
                    }
                }

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                const label = armyMarch.phase === 'march' ? '⚔️ 軍隊行軍中...' : (armyMarch.phase === 'fight' ? '🔥 戰鬥進行中...' : '✅ 戰鬥結束');
                ctx.fillText(label, cvs.width / 2, 75);
            }

            // 指揮官
            const cs = worldToScreen(commander.x, commander.y);
            const pulse = 1 + Math.sin(frame * 0.12) * 0.15;
            const walk = Math.sin(commander.walkCycle || 0) * 3;

            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 30;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
            ctx.beginPath(); ctx.arc(cs.x, cs.y, 16 * pulse, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            ctx.save();
            ctx.translate(cs.x, cs.y);
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(-8, 6 + walk, 6, 10);
            ctx.fillRect(2, 6 - walk, 6, 10);
            ctx.fillStyle = '#0ea5e9';
            ctx.beginPath(); ctx.roundRect(-12, -10, 24, 20, 5); ctx.fill();
            ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(0, 0, 4 + Math.sin(frame*0.1)*1, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath(); ctx.roundRect(-8, -22, 16, 12, 4); ctx.fill();
            ctx.fillStyle = '#0284c7';
            ctx.beginPath(); ctx.roundRect(-6, -20, 12, 4, 2); ctx.fill();
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-18, -6, 6, 10);
            ctx.fillRect(12, -6, 6, 10);
            ctx.fillStyle = '#0ea5e9';
            ctx.fillRect(-24, -2 + walk * 0.5, 8, 18);
            ctx.fillRect(16, -2 - walk * 0.5, 8, 18);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath(); ctx.moveTo(-8, 20); ctx.lineTo(0, 30 + Math.sin(frame*0.3)*3); ctx.lineTo(8, 20); ctx.closePath(); ctx.fill();

            ctx.shadowBlur = 0;
            ctx.restore();
            drawStack(p);
        }

        function drawSoldierAt(x, y, facing, scale) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath(); ctx.arc(0, -8, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#b45309';
            ctx.fillRect(-5, -2, 10, 12);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-8, 0, 16, 3);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-4, 10, 3, 6);
            ctx.fillRect(1, 10, 3, 6);
            ctx.restore();
        }

        function drawEnemyAt(x, y) {
            ctx.save();
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#7f1d1d';
            ctx.fillRect(x - 7, y + 5, 14, 5);
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        function drawStack(obj) {
            obj.bag.forEach((it, i) => {
                ctx.fillStyle = ITEMS[it.type].color;
                ctx.beginPath(); ctx.roundRect(obj.x - 10, obj.y - 40 - (i * 8), 20, 6, 2); ctx.fill();
            });
        }

        // ============================================================
        // 世界地圖繪製
        // ============================================================
