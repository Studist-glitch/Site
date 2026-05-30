// js/pong.js - Исправлен: отображение бота, управление в соло на WASD+стрелки
window.pong = (function() {
    'use strict';

    const W = 800, H = 400;
    let active = false;
    let interval = null;
    let animationId = null;
    let players = 1;
    let singlePlayerMode = true;
    let mode = 'single';

    let paddles = [
        { x: 20, y: 150, width: 10, height: 80, score: 0, upgrades: {}, tempBonus: {}, shield: 0 },
        { x: W - 30, y: 150, width: 10, height: 80, score: 0, upgrades: {}, tempBonus: {}, shield: 0 }
    ];
    let ball = { x: W / 2, y: H / 2, vx: 4, vy: 3, radius: 6, baseSpeed: 5 };
    let trail = [];
    let particles = [];

    let activeEvent = null;
    let eventInterval = null;
    let upgradeTimer = 60;
    let upgradeInterval = null;
    let waitingForUpgrade = false;
    let upgradeDialog = null;

    let bot = { level: 0, reactionDelay: 0.3, speedMultiplier: 1 };
    let enemies = [];
    let boss = null;
    let enemySpawnTimer = 0;
    let enemySpawnInterval = 45;

    let canvas = null;
    let ctx = null;
    let keys = { ArrowUp: false, ArrowDown: false, w: false, s: false };

    const allUpgrades = [
        { id: 'speed', name: 'Скорость ракетки', desc: '+25% скорости', apply: (p) => { p.tempBonus.speed = (p.tempBonus.speed || 1) + 0.25; } },
        { id: 'size', name: 'Размер ракетки', desc: '+15px высоты', apply: (p) => { p.height = Math.min(160, p.height + 15); } },
        { id: 'power', name: 'Сила удара', desc: '+20% скорости мяча', apply: (p, val, ball) => { if (ball) ball.baseSpeed *= 1.2; } },
        { id: 'shield', name: 'Щит', desc: 'Защита от 1 пропущенного гола', apply: (p) => { p.shield = (p.shield || 0) + 1; } },
        { id: 'magnet', name: 'Магнит', desc: 'Мяч притягивается к ракетке', apply: (p) => { p.tempBonus.magnet = true; } },
        { id: 'portal', name: 'Портал', desc: 'При ударе телепорт на половину поля', apply: (p) => { p.tempBonus.portal = true; } },
        { id: 'slowEnemy', name: 'Замедление врага', desc: 'Замедляет соперника на 5с', apply: (p, val, ball, opp) => { if (opp) opp.tempBonus.slow = 5; } },
        { id: 'doubleScore', name: 'Двойные очки', desc: 'Гол приносит 2 очка', apply: (p) => { p.tempBonus.doubleScore = true; } },
        { id: 'ballSize', name: 'Увеличение мяча', desc: '+4px к радиусу', apply: (p, val, ball) => { if (ball) ball.radius = Math.min(14, ball.radius + 4); } },
        { id: 'fastBall', name: 'Быстрый мяч', desc: '+50% скорости мяча', apply: (p, val, ball) => { if (ball) ball.baseSpeed *= 1.5; } },
        { id: 'invertControls', name: 'Инверсия', desc: 'Переворачивает управление врага на 3с', apply: (p, val, ball, opp) => { if (opp) opp.tempBonus.invert = 3; } },
        { id: 'heal', name: 'Восстановление', desc: 'Восстанавливает 1 щит', apply: (p) => { p.shield = (p.shield || 0) + 1; } },
        { id: 'ghost', name: 'Призрак', desc: 'Ракетка становится прозрачной (уклонение)', apply: (p) => { p.tempBonus.ghost = true; } },
        { id: 'ricochet', name: 'Рикошет', desc: 'Мяч отскакивает от стен под острым углом', apply: (p) => { p.tempBonus.ricochet = true; } },
        { id: 'freezeEnemy', name: 'Заморозка врага', desc: 'Останавливает врага на 2с', apply: (p, val, ball, opp) => { if (opp) opp.tempBonus.freeze = 2; } },
        { id: 'extraLife', name: 'Доп. жизнь', desc: '+1 щит', apply: (p) => { p.shield = (p.shield || 0) + 1; } }
    ];

    const allEvents = [
        { name: '🌀 Портал', duration: 8, apply: (game) => {
            if (!game.activeEvent) game.activeEvent = {};
            game.activeEvent.name = 'Портал';
            game.activeEvent.duration = 8;
            game.paddles.forEach(p => p.tempBonus.portal = true);
        }, end: (game) => { game.paddles.forEach(p => delete p.tempBonus.portal); } },
        { name: '⚡ Ускорение мяча', duration: 6, apply: (game) => {
            if (!game.activeEvent) game.activeEvent = {};
            game.activeEvent.name = 'Ускорение';
            game.activeEvent.duration = 6;
            game.ball.vx *= 1.5; game.ball.vy *= 1.5;
        }, end: (game) => { game.ball.vx /= 1.5; game.ball.vy /= 1.5; } },
        { name: '🐢 Замедление всех', duration: 5, apply: (game) => {
            if (!game.activeEvent) game.activeEvent = {};
            game.activeEvent.name = 'Замедление';
            game.activeEvent.duration = 5;
            game.paddles.forEach(p => p.tempBonus.slow = 5);
        }, end: (game) => { game.paddles.forEach(p => delete p.tempBonus.slow); } },
        { name: '🛡️ Щит всем', duration: 10, apply: (game) => {
            if (!game.activeEvent) game.activeEvent = {};
            game.activeEvent.name = 'Щит';
            game.activeEvent.duration = 10;
            game.paddles.forEach(p => p.shield = (p.shield || 0) + 1);
        }, end: () => {} },
        { name: '✨ Хаос', duration: 7, apply: (game) => {
            if (!game.activeEvent) game.activeEvent = {};
            game.activeEvent.name = 'Хаос';
            game.activeEvent.duration = 7;
            game.paddles.forEach(p => p.tempBonus.chaos = true);
        }, end: (game) => { game.paddles.forEach(p => delete p.tempBonus.chaos); } },
        { name: '🌊 Гравитация', duration: 6, apply: (game) => {
            if (!game.activeEvent) game.activeEvent = {};
            game.activeEvent.name = 'Гравитация';
            game.activeEvent.duration = 6;
            game.activeEvent.gravity = true;
        }, end: (game) => { delete game.activeEvent.gravity; } },
        { name: '🌀 Кривые стены', duration: 8, apply: (game) => {
            if (!game.activeEvent) game.activeEvent = {};
            game.activeEvent.name = 'Кривые стены';
            game.activeEvent.duration = 8;
            game.activeEvent.curvedWalls = true;
        }, end: (game) => { delete game.activeEvent.curvedWalls; } },
        { name: '💥 Множитель очков x2', duration: 10, apply: (game) => {
            if (!game.activeEvent) game.activeEvent = {};
            game.activeEvent.name = 'x2 очков';
            game.activeEvent.duration = 10;
            game.activeEvent.scoreMult = 2;
        }, end: (game) => { delete game.activeEvent.scoreMult; } },
        { name: '🕯️ Невидимость', duration: 6, apply: (game) => {
            if (!game.activeEvent) game.activeEvent = {};
            game.activeEvent.name = 'Невидимость';
            game.activeEvent.duration = 6;
            game.paddles.forEach(p => p.tempBonus.invisible = true);
        }, end: (game) => { game.paddles.forEach(p => delete p.tempBonus.invisible); } },
        { name: '💫 Отскок', duration: 5, apply: (game) => {
            if (!game.activeEvent) game.activeEvent = {};
            game.activeEvent.name = 'Отскок';
            game.activeEvent.duration = 5;
            game.activeEvent.doubleBounce = true;
        }, end: () => {} }
    ];

    let gameContext = null;

    function addParticles(x, y) {
        for (let i = 0; i < 5; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 20,
                size: Math.random() * 3 + 1,
                color: `hsl(${Math.random() * 60 + 280}, 80%, 60%)`
            });
        }
    }

    function addGoalParticles(x) {
        for (let i = 0; i < 30; i++) {
            particles.push({
                x, y: H / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 40,
                size: Math.random() * 4 + 2,
                color: `hsl(${Math.random() * 360}, 100%, 60%)`
            });
        }
    }

    function addEvent(msg) {
        const eventDiv = document.getElementById('pongEvent');
        if (eventDiv) {
            eventDiv.textContent = msg;
            setTimeout(() => { if (eventDiv && eventDiv.textContent === msg) eventDiv.textContent = ''; }, 3000);
        }
    }

    function triggerRandomEvent() {
        if (!active || waitingForUpgrade || !singlePlayerMode) return;
        if (!gameContext) gameContext = this;
        const ev = allEvents[Math.floor(Math.random() * allEvents.length)];
        ev.apply(gameContext);
        addEvent(`Событие: ${ev.name}`);
    }

    function endEvent() {
        if (activeEvent && gameContext) {
            const evDef = allEvents.find(e => e.name === activeEvent.name);
            if (evDef && evDef.end) evDef.end(gameContext);
            activeEvent = null;
        }
    }

    function checkPaddleCollision(paddleIdx) {
        const pad = paddles[paddleIdx];
        if (pad.tempBonus.ghost) return;
        const padLeft = pad.x, padRight = pad.x + pad.width;
        const padTop = pad.y, padBottom = pad.y + pad.height;
        if (ball.x + ball.radius >= padLeft && ball.x - ball.radius <= padRight &&
            ball.y + ball.radius >= padTop && ball.y - ball.radius <= padBottom) {

            let collidePoint = ball.y - (pad.y + pad.height / 2);
            collidePoint = Math.max(-1, Math.min(1, collidePoint / (pad.height / 2)));
            let angleRad = collidePoint * Math.PI / 3;
            let direction = (paddleIdx === 0) ? 1 : -1;
            let currentSpeed = Math.hypot(ball.vx, ball.vy);
            let newVx = direction * currentSpeed * Math.cos(angleRad);
            let newVy = currentSpeed * Math.sin(angleRad);
            let power = (pad.tempBonus.power ? 1.2 : 1);
            ball.vx = newVx * power;
            ball.vy = newVy * power;

            if (pad.tempBonus.magnet) {
                let centerY = pad.y + pad.height / 2;
                ball.vy += (centerY - ball.y) * 0.2;
            }
            if (pad.tempBonus.portal) {
                let mid = W / 2;
                if (paddleIdx === 0 && ball.x < mid) ball.x = mid + 50;
                else if (paddleIdx === 1 && ball.x > mid) ball.x = mid - 50;
                ball.x = Math.max(10, Math.min(W - 10, ball.x));
            }
            ball.x += (paddleIdx === 0 ? 1 : -1);
            if (pad.tempBonus.ricochet && (ball.x < 50 || ball.x > W - 50)) ball.vx = -ball.vx;
            addParticles(ball.x, ball.y);
        }
    }

    function resetBall(scoredOn, resetEffects) {
        ball.x = W / 2;
        ball.y = H / 2;
        let dir = (scoredOn === 0) ? -1 : 1;
        ball.vx = dir * (ball.baseSpeed + Math.random() * 2);
        ball.vy = (Math.random() - 0.5) * 6;
        if (resetEffects) {
            for (let i = 0; i < 2; i++) paddles[i].tempBonus = {};
        }
        trail = [];
    }

    function spawnEnemy() {
        if (!singlePlayerMode) return;
        let isBoss = Math.random() < 0.2;
        if (isBoss && !boss) {
            boss = { x: W / 2 - 20, y: 50, width: 40, height: 40, health: 5, maxHealth: 5, name: 'Огненный элементаль' };
            addEvent('🔥 Босс появился! Порази его мячом 5 раз!');
        } else if (!boss) {
            enemies.push({ x: Math.random() * (W - 60) + 30, y: Math.random() * (H - 40) + 20, width: 25, height: 25, health: 1, name: 'Теневой сгусток' });
            addEvent('👾 Враг появился! Ударь мячом!');
        }
    }

    function updateEnemies() {
        if (!singlePlayerMode) return;
        for (let i = 0; i < enemies.length; i++) {
            let e = enemies[i];
            if (ball.x + ball.radius > e.x && ball.x - ball.radius < e.x + e.width &&
                ball.y + ball.radius > e.y && ball.y - ball.radius < e.y + e.height) {
                e.health--;
                if (e.health <= 0) {
                    enemies.splice(i, 1);
                    addEvent('💀 Враг уничтожен! +5 очков');
                    paddles[0].score += 5;
                } else {
                    addEvent('💥 Попадание по врагу!');
                }
                ball.vx = -ball.vx;
                ball.vy = -ball.vy;
                addParticles(ball.x, ball.y);
                break;
            }
        }
        if (boss) {
            let b = boss;
            if (ball.x + ball.radius > b.x && ball.x - ball.radius < b.x + b.width &&
                ball.y + ball.radius > b.y && ball.y - ball.radius < b.y + b.height) {
                b.health--;
                addEvent(`🔥 Попадание по боссу! Осталось ${b.health} хитов`);
                ball.vx = -ball.vx;
                ball.vy = -ball.vy;
                addParticles(ball.x, ball.y);
                if (b.health <= 0) {
                    boss = null;
                    addEvent('🏆 Босс повержен! +50 очков');
                    paddles[0].score += 50;
                }
            }
            b.x += Math.sin(Date.now() * 0.002) * 1.5;
            b.y += Math.cos(Date.now() * 0.0015) * 1;
            b.x = Math.max(10, Math.min(W - b.width - 10, b.x));
            b.y = Math.max(30, Math.min(H - b.height - 30, b.y));
        }
    }

    function update() {
        if (!active || waitingForUpgrade) return;

        // Управление левой ракеткой: в соло режиме и W/S, и стрелки двигают левую
        let speed0 = 6 * (paddles[0].tempBonus.speed || 1);
        if (keys.w || keys.ArrowUp) paddles[0].y -= speed0;
        if (keys.s || keys.ArrowDown) paddles[0].y += speed0;
        paddles[0].y = Math.max(0, Math.min(H - paddles[0].height, paddles[0].y));

        if (players === 2) {
            // Мультиплеер: стрелки управляют правой ракеткой
            let speed1 = 6 * (paddles[1].tempBonus.speed || 1);
            if (keys.ArrowUp) paddles[1].y -= speed1;
            if (keys.ArrowDown) paddles[1].y += speed1;
            paddles[1].y = Math.max(0, Math.min(H - paddles[1].height, paddles[1].y));
        } else if (singlePlayerMode && bot) {
            // Соло: бот управляет правой ракеткой
            let targetY = ball.y - paddles[1].height / 2;
            let diff = targetY - paddles[1].y;
            let botSpeed = 4.5 * (bot.speedMultiplier || 1) * (paddles[1].tempBonus.slow ? 0.5 : 1);
            if (paddles[1].tempBonus.freeze) botSpeed = 0;
            paddles[1].y += Math.min(Math.max(diff * 0.15, -botSpeed), botSpeed);
            paddles[1].y = Math.max(0, Math.min(H - paddles[1].height, paddles[1].y));
        }

        ball.x += ball.vx;
        ball.y += ball.vy;
        trail.unshift({ x: ball.x, y: ball.y });
        if (trail.length > 15) trail.pop();

        if (activeEvent && activeEvent.gravity) ball.vy += 0.2;

        if (activeEvent && activeEvent.curvedWalls) {
            if (ball.y - ball.radius <= 0) { ball.y = ball.radius; ball.vy = -ball.vy * 0.9; ball.vx += (Math.random() - 0.5) * 2; }
            if (ball.y + ball.radius >= H) { ball.y = H - ball.radius; ball.vy = -ball.vy * 0.9; ball.vx += (Math.random() - 0.5) * 2; }
        } else {
            if (ball.y - ball.radius <= 0) { ball.y = ball.radius; ball.vy = -ball.vy; addParticles(ball.x, ball.y); }
            if (ball.y + ball.radius >= H) { ball.y = H - ball.radius; ball.vy = -ball.vy; addParticles(ball.x, ball.y); }
        }

        let scoreMult = (activeEvent && activeEvent.scoreMult) ? activeEvent.scoreMult : 1;
        if (ball.x + ball.radius <= 0) {
            if (paddles[0].shield > 0) { paddles[0].shield--; resetBall(1, false); }
            else { let add = (paddles[1].tempBonus.doubleScore ? 2 : 1) * scoreMult; paddles[1].score += add; resetBall(1, true); addGoalParticles(W / 4); }
        }
        if (ball.x - ball.radius >= W) {
            if (paddles[1].shield > 0) { paddles[1].shield--; resetBall(0, false); }
            else { let add = (paddles[0].tempBonus.doubleScore ? 2 : 1) * scoreMult; paddles[0].score += add; resetBall(0, true); addGoalParticles(3 * W / 4); }
        }

        checkPaddleCollision(0);
        checkPaddleCollision(1);

        if (singlePlayerMode) {
            updateEnemies();
            enemySpawnTimer += 1 / 60;
            if (!boss && enemySpawnTimer >= enemySpawnInterval && Math.random() < 0.02) {
                spawnEnemy();
                enemySpawnTimer = 0;
            }
        }

        for (let i = 0; i < 2; i++) {
            if (paddles[i].tempBonus.slow) { paddles[i].tempBonus.slow -= 1 / 60; if (paddles[i].tempBonus.slow <= 0) delete paddles[i].tempBonus.slow; }
            if (paddles[i].tempBonus.invert) { paddles[i].tempBonus.invert -= 1 / 60; if (paddles[i].tempBonus.invert <= 0) delete paddles[i].tempBonus.invert; }
            if (paddles[i].tempBonus.freeze) { paddles[i].tempBonus.freeze -= 1 / 60; if (paddles[i].tempBonus.freeze <= 0) delete paddles[i].tempBonus.freeze; }
            if (paddles[i].tempBonus.chaos) {
                paddles[i].y += (Math.random() - 0.5) * 8;
                paddles[i].y = Math.max(0, Math.min(H - paddles[i].height, paddles[i].y));
            }
        }

        particles = particles.filter(p => {
            p.life--;
            p.x += p.vx;
            p.y += p.vy;
            return p.life > 0;
        });

        if (activeEvent) {
            activeEvent.duration -= 1 / 60;
            if (activeEvent.duration <= 0) endEvent();
        }

        if (singlePlayerMode && !waitingForUpgrade) {
            upgradeTimer -= 1 / 60;
            if (upgradeTimer <= 0) showUpgradeChoice();
        }
        const timerEl = document.getElementById('pongTimer');
        if (timerEl) timerEl.textContent = `След. улучшение: ${Math.ceil(upgradeTimer)}с`;
    }

    function showUpgradeChoice() {
        if (!singlePlayerMode || waitingForUpgrade) return;
        waitingForUpgrade = true;
        promptUpgradeForPlayer(0);
    }

    function promptUpgradeForPlayer(playerIdx) {
        if (!singlePlayerMode) return;
        if (upgradeDialog && upgradeDialog.parentNode) upgradeDialog.remove();

        const dialog = document.createElement('div');
        dialog.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#12121a;border:2px solid #c44eff;border-radius:10px;padding:15px;z-index:1000;text-align:center;color:#fff;max-width:300px;width:80%';
        dialog.innerHTML = `<h3>Выберите улучшение для ${playerIdx === 0 ? 'Левого игрока' : 'Правого игрока'}</h3>`;

        const shuffled = [...allUpgrades];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const choices = shuffled.slice(0, 3);
        const container = document.createElement('div');
        container.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin-top:10px';

        choices.forEach(up => {
            const btn = document.createElement('button');
            btn.textContent = `${up.name}\n${up.desc}`;
            btn.style.cssText = 'background:#2a2a3a;border:1px solid #c44eff;color:#c44eff;padding:8px;border-radius:6px;cursor:pointer;font-size:12px';
            btn.onclick = () => {
                let val = 1;
                if (up.id === 'size') val = 15;
                if (up.id === 'speed') val = 0.25;
                if (up.id === 'power') val = 1.2;
                if (up.id === 'ballSize') val = 4;
                if (up.id === 'fastBall') val = 1.5;
                up.apply(paddles[playerIdx], val, ball, paddles[1 - playerIdx]);
                paddles[playerIdx].upgrades[up.id] = (paddles[playerIdx].upgrades[up.id] || 0) + 1;
                dialog.remove();
                if (players === 2 && playerIdx === 0) promptUpgradeForPlayer(1);
                else {
                    waitingForUpgrade = false;
                    upgradeTimer = 60;
                    if (players === 1 && singlePlayerMode) upgradeBot();
                }
            };
            container.appendChild(btn);
        });
        dialog.appendChild(container);
        document.body.appendChild(dialog);
        upgradeDialog = dialog;
    }

    function upgradeBot() {
        if (!singlePlayerMode) return;
        const up = allUpgrades[Math.floor(Math.random() * allUpgrades.length)];
        let val = 1;
        if (up.id === 'size') val = 15;
        if (up.id === 'speed') val = 0.25;
        if (up.id === 'power') val = 1.2;
        up.apply(paddles[1], val, ball, paddles[0]);
        bot.speedMultiplier += 0.1;
        addEvent(`Бот получил улучшение: ${up.name}`);
    }

    function draw() {
        if (!ctx) return;
        ctx.clearRect(0, 0, W, H);
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0a0a1a');
        grad.addColorStop(1, '#0f0f2a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = 'rgba(196,78,255,0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < H; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }
        for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }

        ctx.setLineDash([10, 20]);
        ctx.strokeStyle = '#c44eff';
        ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
        ctx.setLineDash([]);

        for (let p of particles) {
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 8;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.shadowBlur = 0;

        for (let i = 0; i < trail.length; i++) {
            const t = trail[i];
            const alpha = 0.3 * (1 - i / trail.length);
            ctx.fillStyle = `rgba(255, 100, 200, ${alpha})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, ball.radius * (1 - i / trail.length), 0, Math.PI * 2);
            ctx.fill();
        }

        // Рисуем обе ракетки всегда (в соло-режиме тоже)
        for (let i = 0; i < 2; i++) {
            const p = paddles[i];
            let color = i === 0 ? '#44ff44' : '#ff4444';
            if (p.shield > 0) color = '#ffcc00';
            if (p.tempBonus.slow) color = '#88aaff';
            if (p.tempBonus.invisible) color = 'rgba(255,255,255,0.2)';
            ctx.fillStyle = color;
            ctx.shadowBlur = 8;
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(p.x + 2, p.y + 2, p.width - 4, p.height - 4);
            if (p.shield > 0) {
                ctx.fillStyle = 'rgba(255,255,0,0.6)';
                ctx.fillRect(p.x - 2, p.y - 2, p.width + 4, 4);
            }
        }

        enemies.forEach(e => {
            ctx.fillStyle = '#aa44ff';
            ctx.fillRect(e.x, e.y, e.width, e.height);
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.fillText(e.name, e.x, e.y - 2);
        });
        if (boss) {
            ctx.fillStyle = '#ff4400';
            ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
            ctx.fillStyle = '#fff';
            ctx.font = '12px monospace';
            ctx.fillText(`${boss.name} ${boss.health}/${boss.maxHealth}`, boss.x, boss.y - 5);
        }

        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff44ff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = '32px "Russo One", monospace';
        ctx.fillStyle = '#c44eff';
        ctx.fillText(paddles[0].score, W / 4 - 20, 50);
        ctx.fillText(paddles[1].score, 3 * W / 4 - 20, 50);

        if (activeEvent) {
            ctx.font = '14px monospace';
            ctx.fillStyle = '#ffaa44';
            ctx.fillText(activeEvent.name, W / 2 - 40, 80);
        }
    }

    function renderLoop() {
        draw();
        animationId = requestAnimationFrame(renderLoop);
    }

    function init(modeVal) {
        mode = modeVal;
        players = (mode === 'multi') ? 2 : 1;
        singlePlayerMode = (mode === 'single');
        active = true;
        gameContext = this;

        paddles[0] = { x: 20, y: 150, width: 10, height: 80, score: 0, upgrades: {}, tempBonus: {}, shield: 0 };
        paddles[1] = { x: W - 30, y: 150, width: 10, height: 80, score: 0, upgrades: {}, tempBonus: {}, shield: 0 };
        ball = { x: W / 2, y: H / 2, vx: (Math.random() > 0.5 ? 4 : -4), vy: (Math.random() - 0.5) * 6, radius: 6, baseSpeed: 5 };
        trail = [];
        particles = [];
        activeEvent = null;
        waitingForUpgrade = false;
        upgradeTimer = 60;
        enemies = [];
        boss = null;
        enemySpawnTimer = 0;

        if (singlePlayerMode) bot = { level: 0, reactionDelay: 0.3, speedMultiplier: 1 };
        else bot = null;

        canvas = document.getElementById('pongCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        canvas.width = W;
        canvas.height = H;

        if (interval) clearInterval(interval);
        if (eventInterval) clearInterval(eventInterval);
        if (upgradeInterval) clearInterval(upgradeInterval);
        if (animationId) cancelAnimationFrame(animationId);

        interval = setInterval(() => update(), 1000 / 60);
        if (singlePlayerMode) {
            const boundTrigger = triggerRandomEvent.bind(gameContext);
            eventInterval = setInterval(boundTrigger, 20000 + Math.random() * 15000);
            upgradeInterval = setInterval(() => showUpgradeChoice(), 60000);
        }
        setupControls();
        renderLoop();
    }

    function setupControls() {
        const handleKeyDown = (e) => {
            if (!active || waitingForUpgrade) return;
            // В соло-режиме стрелки также управляют левой ракеткой
            if (e.key === 'ArrowUp') keys.ArrowUp = true;
            if (e.key === 'ArrowDown') keys.ArrowDown = true;
            if (e.key === 'w' || e.key === 'W' || e.key === 'ц' || e.key === 'Ц') keys.w = true;
            if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') keys.s = true;
            e.preventDefault();
        };
        const handleKeyUp = (e) => {
            if (e.key === 'ArrowUp') keys.ArrowUp = false;
            if (e.key === 'ArrowDown') keys.ArrowDown = false;
            if (e.key === 'w' || e.key === 'W' || e.key === 'ц' || e.key === 'Ц') keys.w = false;
            if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') keys.s = false;
            e.preventDefault();
        };
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    }

    function stop() {
        active = false;
        if (interval) clearInterval(interval);
        if (eventInterval) clearInterval(eventInterval);
        if (upgradeInterval) clearInterval(upgradeInterval);
        if (animationId) cancelAnimationFrame(animationId);
        if (upgradeDialog && upgradeDialog.parentNode) upgradeDialog.remove();
    }

    function exportState() { return {}; }
    function importState(state) {}

    return {
        init,
        stop,
        exportState,
        importState
    };
})();