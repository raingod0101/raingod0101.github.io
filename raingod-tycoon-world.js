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
