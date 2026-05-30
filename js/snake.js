// js/snake.js - Полностью рефакторинг с UpgradeManager, экспорт/импорт, минимизация дублирования
window.snake = (function() {
    'use strict';

    // ---------- Константы ----------
    const SIZE = 10;
    const W = 20;
    const H = 20;
    const UPGRADE_KEY = 'snakeUpgrades';
    const DEFAULT_UPGRADES = {
        length: 0,
        speed: 1.0,
        scoreMult: 1.0,
        magnet: false,
        shieldStart: false,
        dashCooldown: 0,
        extraPowerups: 0,
        skinLevel: 0
    };

    // ---------- Менеджер улучшений ----------
    let upgradeManager = null;

    function initUpgradeManager() {
        if (!upgradeManager) upgradeManager = new UpgradeManager(UPGRADE_KEY, DEFAULT_UPGRADES);
        return upgradeManager;
    }

    function getUpgrade(key) { return upgradeManager ? upgradeManager.get(key) : DEFAULT_UPGRADES[key]; }
    function setUpgrade(key, value) { if (upgradeManager) upgradeManager.set(key, value); }
    function saveUpgrades() { if (upgradeManager) upgradeManager.save(); }

    // ---------- Игровые переменные ----------
    let active = false;
    let interval = null;
    let animFrame = null;
    let players = 1;
    let singlePlayerMode = true;
    let onGameOver = null;

    // Игроки (массивы)
    let snakes = [];        // массив массивов сегментов {x, y}
    let dirs = [];          // текущее направление
    let nextDirs = [];      // следующее направление
    let scores = [];
    let combos = [];
    let comboTimers = [];
    let dashCharges = [];
    let dashCooldowns = [];
    let dashTimers = [];
    let lastDirTap = [];
    let activePowerups = [];   // массив объектов {type, name, color, duration}
    let powerupTimers = [];

    let foods = [];          // массив {x, y, type}
    let foodPhase = 0;

    // Боты и боссы
    let bot = null;          // { segments, dir, color, alive }
    let botMoveTimer = null;
    let botSpawnTimer = null;
    let botMinDistance = 15;

    let bossSnake = null;    // { segments, dir, color, alive, health }
    let bossTimer = null;
    const bossInterval = 120000;

    // События
    let eventActive = null;
    let eventTimer = 0;
    let meteorBlocks = [];
    let tempWalls = false;

    // Достижения
    let achievements = [];
    const allAchievements = [
        { id: 'firstBlood', name: 'Первая кровь', desc: 'Убейте бота-змею', reward: 100 },
        { id: 'combo10', name: 'Комбо-мастер', desc: 'Достигните комбо x10', reward: 200 },
        { id: 'longSnake', name: 'Длинная змея', desc: 'Достигните длины 30', reward: 300 }
    ];

    let currency = 0;

    // ---------- Вспомогательные функции ----------
    function saveCurrency() { localStorage.setItem('snakeCurrency', currency); }
    function loadCurrency() { currency = parseInt(localStorage.getItem('snakeCurrency')) || 0; }

    function addEvent(text) {
        const container = document.getElementById('eventsContainer');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'event-message';
        div.textContent = text;
        container.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }

    function isOccupied(x, y) {
        if (snakes.some(s => s.some(seg => seg.x === x && seg.y === y))) return true;
        if (bot && bot.alive && bot.segments.some(seg => seg.x === x && seg.y === y)) return true;
        if (bossSnake && bossSnake.alive && bossSnake.segments.some(seg => seg.x === x && seg.y === y)) return true;
        if (meteorBlocks.some(b => b.x === x && b.y === y)) return true;
        return false;
    }

    function addPowerup(playerIdx, type) {
        if (!singlePlayerMode) return;
        const config = {
            speed: { name: 'Скорость', color: '#44ccff', dur: 8 },
            shield: { name: 'Щит', color: '#44ff44', dur: 15 },
            freeze: { name: 'Замедл.', color: '#88ffff', dur: 5 },
            double: { name: 'x2 Очки', color: '#ff44cc', dur: 10 },
            shrink: { name: 'Уменьшение', color: '#ff8800', dur: 20 },
            invincible: { name: 'Неуязвимость', color: '#ff00ff', dur: 6 },
            bonus: { name: 'Бонус очков', color: '#ffffff', dur: 1 }
        };
        const conf = config[type];
        if (!conf) return;
        const existing = activePowerups[playerIdx].find(p => p.type === type);
        if (existing) { existing.duration = conf.dur; return; }
        activePowerups[playerIdx].push({ type, name: conf.name, color: conf.color, duration: conf.dur });
        if (type === 'shrink') {
            const snake = snakes[playerIdx];
            const newLen = Math.max(2, Math.floor(snake.length / 2));
            snake.splice(newLen);
        }
        if (type === 'bonus') scores[playerIdx] += 30;
        const timer = setInterval(() => {
            const idx = activePowerups[playerIdx].findIndex(p => p.type === type);
            if (idx !== -1) {
                activePowerups[playerIdx][idx].duration--;
                if (activePowerups[playerIdx][idx].duration <= 0) activePowerups[playerIdx].splice(idx, 1);
            }
        }, 1000);
        powerupTimers[playerIdx].push(timer);
    }

    function checkAchievements() {
        if (!singlePlayerMode) return;
        allAchievements.forEach(a => {
            if (achievements.includes(a.id)) return;
            let earned = false;
            if (a.id === 'firstBlood' && bot && !bot.alive) earned = true;
            if (a.id === 'combo10' && combos[0] >= 10) earned = true;
            if (a.id === 'longSnake' && snakes[0].length >= 30) earned = true;
            if (earned) {
                achievements.push(a.id);
                currency += a.reward;
                addEvent(`🏆 Достижение: ${a.name}! +${a.reward}💎`);
                saveCurrency();
            }
        });
    }

    function getSkinColor(idx) {
        const skins = ['#c44eff', '#44ff44', '#ffcc00', '#ff44cc', '#44ccff'];
        if (!singlePlayerMode) return skins[0];
        return skins[Math.min(getUpgrade('skinLevel'), skins.length - 1)];
    }

    // ---------- Еда ----------
    function placeFood() {
        let pos, type;
        const rand = Math.random();
        const hasExtra = singlePlayerMode ? getUpgrade('extraPowerups') : 0;
        if (rand < 0.55) type = 'normal';
        else if (rand < 0.7) type = 'gold';
        else if (rand < 0.8) type = 'speed';
        else if (rand < 0.88) type = 'shield';
        else if (rand < 0.94) type = 'freeze';
        else if (rand < 0.97) type = 'double';
        else type = (hasExtra >= 1 ? 'shrink' : 'double');
        if (hasExtra >= 2 && Math.random() < 0.3) type = 'invincible';
        if (hasExtra >= 3 && Math.random() < 0.2) type = 'bonus';

        do {
            pos = { x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H) };
        } while (isOccupied(pos.x, pos.y));
        foods.push({ x: pos.x, y: pos.y, type: type });
        if (foods.length > 6) foods.shift();
    }

    function eatFood(foodIndex, playerIdx) {
        const food = foods[foodIndex];
        let points = 1;
        if (food.type === 'gold') points = 5;
        if (activePowerups[playerIdx]?.some(p => p.type === 'double')) points *= 2;
        if (singlePlayerMode) points = Math.floor(points * getUpgrade('scoreMult'));
        scores[playerIdx] += points;

        if (comboTimers[playerIdx]) clearTimeout(comboTimers[playerIdx]);
        combos[playerIdx]++;
        comboTimers[playerIdx] = setTimeout(() => { combos[playerIdx] = 0; }, 2000);
        const comboBonus = combos[playerIdx] > 1 ? Math.floor(points * (combos[playerIdx] - 1) * 0.1) : 0;
        scores[playerIdx] += comboBonus;

        addPowerup(playerIdx, food.type);
        foods.splice(foodIndex, 1);
        placeFood();
    }

    // ---------- Движение ----------
    function move() {
        if (!active) return;
        updateEvents();

        // Обновление направлений
        for (let i = 0; i < players; i++) dirs[i] = nextDirs[i];

        // Магнит (если куплен)
        if (singlePlayerMode && getUpgrade('magnet')) {
            const head = snakes[0][0];
            for (let f of foods) {
                const dx = head.x - f.x, dy = head.y - f.y;
                if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) {
                    let nx = f.x, ny = f.y;
                    if (dx !== 0) nx += (dx > 0 ? 1 : -1);
                    if (dy !== 0) ny += (dy > 0 ? 1 : -1);
                    nx = Math.max(0, Math.min(W - 1, nx));
                    ny = Math.max(0, Math.min(H - 1, ny));
                    if (!isOccupied(nx, ny)) { f.x = nx; f.y = ny; }
                }
            }
            for (let i = 0; i < foods.length; i++) {
                if (foods[i].x === head.x && foods[i].y === head.y) { eatFood(i, 0); i--; }
            }
        }

        // Бот ИИ
        if (bot && bot.alive) {
            const head = { x: bot.segments[0].x + bot.dir.x, y: bot.segments[0].y + bot.dir.y };
            let died = false;
            if (head.x < 0 || head.x >= W || head.y < 0 || head.y >= H) died = true;
            else if (bot.segments.some(s => s.x === head.x && s.y === head.y)) died = true;
            else if (meteorBlocks.some(b => b.x === head.x && b.y === head.y)) died = true;
            else if (tempWalls && (head.x === 0 || head.x === W - 1 || head.y === 0 || head.y === H - 1)) died = true;
            if (!died) {
                bot.segments.unshift(head);
                let ate = false;
                for (let f = 0; f < foods.length; f++) {
                    if (head.x === foods[f].x && head.y === foods[f].y) {
                        foods.splice(f, 1);
                        placeFood();
                        ate = true;
                        break;
                    }
                }
                if (!ate) bot.segments.pop();
            } else {
                bot.alive = false;
                clearInterval(botMoveTimer);
                let reward = 50;
                if (singlePlayerMode) reward = Math.floor(reward * getUpgrade('scoreMult'));
                scores[0] += reward;
                addEvent(`🦎 Враждебная змея уничтожена! +${reward} очков`);
                checkAchievements();
                bot = null;
                scheduleBotSpawn();
            }
        }

        // Босс
        if (bossSnake && bossSnake.alive) {
            const head = { x: bossSnake.segments[0].x + bossSnake.dir.x, y: bossSnake.segments[0].y + bossSnake.dir.y };
            let bDied = false;
            if (head.x < 0 || head.x >= W || head.y < 0 || head.y >= H) bDied = true;
            if (!bDied) {
                bossSnake.segments.unshift(head);
                bossSnake.segments.pop();
                const playerHead = snakes[0][0];
                const tail = bossSnake.segments[bossSnake.segments.length - 1];
                if (playerHead.x === tail.x && playerHead.y === tail.y) {
                    bossSnake.health--;
                    if (bossSnake.health <= 0) {
                        bossSnake.alive = false;
                        scores[0] += 200;
                        addEvent(`🐲 Босс-змея повержена! +200 очков`);
                        bossSnake = null;
                        scheduleBossSpawn();
                        checkAchievements();
                    }
                }
            }
        }

        // Движение игроков
        for (let i = 0; i < players; i++) {
            let newX = snakes[i][0].x + dirs[i].x;
            let newY = snakes[i][0].y + dirs[i].y;
            const hasShield = activePowerups[i]?.some(p => p.type === 'shield');
            const invincible = activePowerups[i]?.some(p => p.type === 'invincible');
            let teleported = false;

            if (hasShield && !invincible) {
                if (newX < 0) { newX = W - 1; teleported = true; }
                else if (newX >= W) { newX = 0; teleported = true; }
                if (newY < 0) { newY = H - 1; teleported = true; }
                else if (newY >= H) { newY = 0; teleported = true; }
            }

            let dead = false;
            if (!teleported && (newX < 0 || newX >= W || newY < 0 || newY >= H)) dead = !hasShield && !invincible;
            else if (snakes.some((s, idx) => idx !== i && s.some(seg => seg.x === newX && seg.y === newY))) dead = !hasShield && !invincible;
            else if (snakes[i].some(seg => seg.x === newX && seg.y === newY) && !(newX === snakes[i][0].x && newY === snakes[i][0].y)) dead = !hasShield && !invincible;
            else if (meteorBlocks.some(b => b.x === newX && b.y === newY)) dead = !hasShield && !invincible;
            else if (bot && bot.alive && bot.segments.some(seg => seg.x === newX && seg.y === newY)) dead = !hasShield && !invincible;
            else if (bossSnake && bossSnake.alive && bossSnake.segments.some(seg => seg.x === newX && seg.y === newY)) dead = !hasShield && !invincible;

            if (dead) {
                if (hasShield) {
                    const idx = activePowerups[i].findIndex(p => p.type === 'shield');
                    if (idx !== -1) activePowerups[i].splice(idx, 1);
                } else {
                    kill(i);
                    return;
                }
            }

            const head = { x: newX, y: newY };
            snakes[i].unshift(head);
            let ate = false;
            for (let f = 0; f < foods.length; f++) {
                if (head.x === foods[f].x && head.y === foods[f].y) {
                    eatFood(f, i);
                    ate = true;
                    break;
                }
            }
            if (!ate) snakes[i].pop();
        }
        checkAchievements();
        draw();
    }

    function kill(idx) {
        if (!active) return;
        active = false;
        clearInterval(interval);
        if (animFrame) cancelAnimationFrame(animFrame);
        comboTimers.forEach(t => clearTimeout(t));
        dashTimers.forEach(t => clearTimeout(t));
        powerupTimers.forEach(arr => arr.forEach(t => clearInterval(t)));
        if (bot) { clearInterval(botMoveTimer); bot = null; }
        if (botSpawnTimer) clearTimeout(botSpawnTimer);
        if (bossTimer) clearTimeout(bossTimer);
        if (singlePlayerMode) {
            currency += scores[idx];
            saveCurrency();
        }
        if (onGameOver) onGameOver();
    }

    // ---------- Боты и боссы ----------
    function scheduleBotSpawn() {
        if (!singlePlayerMode) return;
        if (botSpawnTimer) clearTimeout(botSpawnTimer);
        botSpawnTimer = setTimeout(() => {
            if (active && !bot && !bossSnake) spawnBot();
        }, 35000);
    }

    function spawnBot() {
        const head = snakes[0][0];
        let startX, startY;
        const edgePositions = [];
        for (let x = 0; x < W; x++) edgePositions.push({ x, y: 0 }, { x, y: H - 1 });
        for (let y = 1; y < H - 1; y++) edgePositions.push({ x: 0, y }, { x: W - 1, y });
        const farEdges = edgePositions.filter(p => Math.abs(p.x - head.x) + Math.abs(p.y - head.y) >= botMinDistance);
        if (farEdges.length > 0) {
            const pos = farEdges[Math.floor(Math.random() * farEdges.length)];
            startX = pos.x; startY = pos.y;
        } else {
            do {
                startX = Math.floor(Math.random() * W);
                startY = Math.floor(Math.random() * H);
            } while (Math.abs(startX - head.x) + Math.abs(startY - head.y) < 10 || isOccupied(startX, startY));
        }
        const length = 4 + Math.floor(scores[0] / 30);
        const segments = [];
        for (let i = 0; i < length; i++) segments.push({ x: startX - i, y: startY });
        bot = { segments, dir: { x: 1, y: 0 }, color: '#ff6644', alive: true };
        if (botMoveTimer) clearInterval(botMoveTimer);
        botMoveTimer = setInterval(botAI, 400);
        addEvent('🦎 Враждебная змея появилась!');
    }

    function botAI() {
        if (!bot || !bot.alive) return;
        const head = bot.segments[0];
        const possibleDirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        const safeDirs = possibleDirs.filter(d => {
            if (d.x === -bot.dir.x && d.y === -bot.dir.y) return false;
            for (let step = 1; step <= 3; step++) {
                const nx = head.x + d.x * step, ny = head.y + d.y * step;
                if (nx < 0 || nx >= W || ny < 0 || ny >= H) return false;
                if (bot.segments.some(s => s.x === nx && s.y === ny)) return false;
                if (meteorBlocks.some(b => b.x === nx && b.y === ny)) return false;
                if (snakes[0].some(s => s.x === nx && s.y === ny)) return false;
            }
            return true;
        });
        if (safeDirs.length > 0) bot.dir = safeDirs[Math.floor(Math.random() * safeDirs.length)];
    }

    function scheduleBossSpawn() {
        if (!singlePlayerMode) return;
        if (bossTimer) clearTimeout(bossTimer);
        bossTimer = setTimeout(() => {
            if (active && !bossSnake) spawnBoss();
        }, bossInterval);
    }

    function spawnBoss() {
        const head = snakes[0][0];
        let startX, startY;
        do {
            startX = Math.floor(Math.random() * (W - 10)) + 5;
            startY = Math.floor(Math.random() * (H - 10)) + 5;
        } while (Math.abs(startX - head.x) + Math.abs(startY - head.y) < 15 || isOccupied(startX, startY));
        const segments = [];
        for (let i = 0; i < 20; i++) segments.push({ x: startX - i, y: startY });
        bossSnake = { segments, dir: { x: 0, y: 1 }, color: '#ff0000', alive: true, health: 5 };
        addEvent('🐲 Босс-змея появилась! Атакуйте её хвост!');
    }

    // ---------- События ----------
    function updateEvents() {
        if (!singlePlayerMode) return;
        if (!eventActive) {
            eventTimer++;
            if (eventTimer > 600) {
                eventTimer = 0;
                if (Math.random() < 0.3) {
                    const types = ['meteor', 'speedUp', 'walls'];
                    const type = types[Math.floor(Math.random() * types.length)];
                    startEvent(type);
                }
            }
        } else {
            eventActive.timer--;
            if (eventActive.timer <= 0) endEvent();
        }
    }

    function startEvent(type) {
        eventActive = { type, timer: 300 };
        if (type === 'meteor') {
            meteorBlocks = [];
            for (let i = 0; i < 5; i++) {
                let x, y;
                do { x = Math.floor(Math.random() * W); y = Math.floor(Math.random() * H); }
                while (isOccupied(x, y));
                meteorBlocks.push({ x, y });
            }
            addEvent('☄️ Метеоритный дождь! Препятствия на поле.');
        } else if (type === 'speedUp') {
            clearInterval(interval);
            const base = 150;
            const intervalMs = Math.min(400, base + (getUpgrade('speed') - 1) * 30);
            interval = setInterval(move, intervalMs);
            addEvent('⚡ Ускорение времени!');
        } else if (type === 'walls') {
            tempWalls = true;
            addEvent('🧱 Временные стены! Края смертельны.');
        }
    }

    function endEvent() {
        if (eventActive.type === 'speedUp') {
            clearInterval(interval);
            const base = 150;
            const intervalMs = Math.min(400, base + (getUpgrade('speed') - 1) * 30);
            interval = setInterval(move, intervalMs);
        }
        meteorBlocks = [];
        tempWalls = false;
        eventActive = null;
        addEvent('✨ Событие закончилось.');
    }

    // ---------- Рывок ----------
    function handleDashInput(playerIdx, direction) {
        if (!active) return;
        const now = Date.now();
        const last = lastDirTap[playerIdx];
        const dirStr = typeof direction === 'string' ? direction : (direction.x + ',' + direction.y);
        if (last.dir === dirStr && (now - last.time) < 300 && dashCharges[playerIdx] > 0 && !dashTimers[playerIdx]) {
            performDash(playerIdx);
            last.time = 0;
        } else {
            last.dir = dirStr;
            last.time = now;
        }
    }

    function performDash(playerIdx) {
        const snake = snakes[playerIdx];
        const dir = dirs[playerIdx];
        const head = snake[0];
        const newHead = { x: head.x + dir.x * 2, y: head.y + dir.y * 2 };
        if (newHead.x < 0 || newHead.x >= W || newHead.y < 0 || newHead.y >= H) return;
        if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) return;
        if (bot && bot.segments.some(s => s.x === newHead.x && s.y === newHead.y)) return;
        if (bossSnake && bossSnake.segments.some(s => s.x === newHead.x && s.y === newHead.y)) return;
        if (meteorBlocks.some(b => b.x === newHead.x && b.y === newHead.y)) return;
        snake.unshift(newHead);
        snake.pop();
        dashCharges[playerIdx]--;
        if (!dashTimers[playerIdx]) {
            dashTimers[playerIdx] = setTimeout(() => {
                dashCharges[playerIdx] = Math.min(3, dashCharges[playerIdx] + 1);
                dashTimers[playerIdx] = null;
            }, (dashCooldowns[playerIdx] || 3) * 1000);
        }
    }

    // ---------- Отрисовка ----------
    function draw() {
        const canvas = document.getElementById('snakeCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 200, 200);

        const pulse = 1 + 0.2 * Math.sin(foodPhase * 5);
        const colorMap = {
            normal: '#ff4444', gold: '#ffcc00', speed: '#44ccff', shield: '#44ff44',
            freeze: '#88ffff', double: '#ff44cc', shrink: '#ff8800', invincible: '#ff00ff', bonus: '#ffffff'
        };
        foods.forEach(f => {
            const cx = f.x * SIZE + SIZE / 2, cy = f.y * SIZE + SIZE / 2;
            const radius = (SIZE / 2 - 1) * pulse;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = colorMap[f.type];
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        const playerColors = [getSkinColor(0), '#44ff44'];
        snakes.forEach((snake, idx) => {
            snake.forEach((seg, i) => {
                const x = seg.x * SIZE, y = seg.y * SIZE;
                ctx.fillStyle = i === 0 ? '#fff' : playerColors[idx];
                ctx.shadowBlur = i === 0 ? 10 : 4;
                ctx.fillRect(x, y, SIZE - 1, SIZE - 1);
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fillRect(x, y, SIZE - 1, 3);
                ctx.shadowBlur = 0;
            });
        });

        if (bot && bot.alive) {
            bot.segments.forEach((seg, i) => {
                const x = seg.x * SIZE, y = seg.y * SIZE;
                ctx.fillStyle = i === 0 ? '#ffaa00' : bot.color;
                ctx.fillRect(x, y, SIZE - 1, SIZE - 1);
            });
        }
        if (bossSnake && bossSnake.alive) {
            bossSnake.segments.forEach((seg, i) => {
                const x = seg.x * SIZE, y = seg.y * SIZE;
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(x, y, SIZE - 1, SIZE - 1);
                if (i === bossSnake.segments.length - 1) {
                    ctx.fillStyle = '#fff';
                    ctx.font = '8px sans-serif';
                    ctx.fillText(bossSnake.health, x + 2, y + 8);
                }
            });
        }
        meteorBlocks.forEach(b => {
            ctx.fillStyle = '#888';
            ctx.fillRect(b.x * SIZE, b.y * SIZE, SIZE - 1, SIZE - 1);
        });

        if (players === 1) {
            document.getElementById('snakeScore').textContent = 'Счёт: ' + scores[0];
            document.getElementById('comboIndicator').textContent = combos[0] > 1 ? `Комбо x${combos[0]}` : '';
            document.getElementById('dashIndicator').textContent = `Рывки: ${dashCharges[0]}`;
            document.getElementById('powerupsContainer').innerHTML = activePowerups[0].map(p => `<span class="powerup-badge" style="color:${p.color}">${p.name}</span>`).join('');
        }
    }

    function startAnimationLoop() {
        const loop = () => {
            foodPhase = (foodPhase + 0.05) % (Math.PI * 2);
            draw();
            animFrame = requestAnimationFrame(loop);
        };
        loop();
    }

    // ---------- Публичные методы ----------
    function init(playersCount) {
        players = playersCount;
        singlePlayerMode = (players === 1);
        initUpgradeManager();
        loadCurrency();

        // Сброс всех массивов
        snakes = [];
        dirs = [];
        nextDirs = [];
        scores = [];
        combos = [];
        comboTimers = [];
        dashCharges = [];
        dashCooldowns = [];
        dashTimers = [];
        lastDirTap = [];
        activePowerups = [];
        powerupTimers = [];
        foods = [];
        bot = null;
        bossSnake = null;
        meteorBlocks = [];
        eventActive = null;
        eventTimer = 0;
        tempWalls = false;
        achievements = [];

        const startLen = 3 + (singlePlayerMode ? getUpgrade('length') : 0);
        for (let i = 0; i < players; i++) {
            const snake = [];
            const startX = i === 0 ? 10 : 5;
            const dirX = i === 0 ? 1 : -1;
            for (let j = 0; j < startLen; j++) snake.push({ x: startX - j * dirX, y: 10 });
            snakes.push(snake);
            dirs.push({ x: dirX, y: 0 });
            nextDirs.push({ x: dirX, y: 0 });
            scores.push(0);
            combos.push(0);
            comboTimers.push(null);
            const dashBase = singlePlayerMode ? getUpgrade('dashCooldown') : 0;
            dashCharges.push(dashBase ? 3 : 3);
            dashCooldowns.push(dashBase);
            dashTimers.push(null);
            lastDirTap.push({ dir: '', time: 0 });
            activePowerups.push([]);
            powerupTimers.push([]);
            if (singlePlayerMode && getUpgrade('shieldStart')) addPowerup(i, 'shield');
        }

        for (let i = 0; i < 4; i++) placeFood();
        active = true;
        if (players === 1 && singlePlayerMode) {
            scheduleBotSpawn();
            scheduleBossSpawn();
        }

        startAnimationLoop();
        const baseInterval = 150;
        let intervalMs = baseInterval;
        if (singlePlayerMode) intervalMs = Math.min(400, baseInterval + (getUpgrade('speed') - 1) * 30);
        if (interval) clearInterval(interval);
        interval = setInterval(move, intervalMs);
    }

    function stop() {
        active = false;
        if (interval) clearInterval(interval);
        if (animFrame) cancelAnimationFrame(animFrame);
        if (bot) { clearInterval(botMoveTimer); bot = null; }
        if (botSpawnTimer) clearTimeout(botSpawnTimer);
        if (bossTimer) clearTimeout(bossTimer);
        comboTimers.forEach(t => clearTimeout(t));
        dashTimers.forEach(t => clearTimeout(t));
        powerupTimers.forEach(arr => arr.forEach(t => clearInterval(t)));
    }

    // Экспорт / импорт для GitHub
    function exportState() {
        if (!singlePlayerMode) return { currency: 0, upgrades: DEFAULT_UPGRADES };
        const upgrades = {};
        for (let k in DEFAULT_UPGRADES) upgrades[k] = getUpgrade(k);
        return { currency, upgrades };
    }

    function importState(state) {
        if (!state || !singlePlayerMode) return;
        currency = state.currency || 0;
        if (state.upgrades) {
            for (let k in state.upgrades) setUpgrade(k, state.upgrades[k]);
        }
        saveCurrency();
    }

    // Магазин
    function showShop() {
        if (!singlePlayerMode) return;
        const self = this;
        const render = () => {
            const modalInner = document.getElementById('modalInner');
            if (!modalInner) return;
            modalInner.innerHTML = `
                <h3>🐍 Магазин улучшений</h3>
                <p>Очки: <strong>${currency}</strong></p>
                <div class="snake-shop" id="snakeShopUpgrades"></div>
                <button class="game-btn" id="playSnakeAgain">Играть снова</button>
                <button class="back-btn" id="backToSnakeMenu">В меню</button>
            `;
            const container = document.getElementById('snakeShopUpgrades');
            const upgradesList = [
                { key: 'length', name: 'Длина +1', desc: 'Начальная длина', cost: 50, inc: 50, max: 5, val: getUpgrade('length') },
                { key: 'speed', name: 'Скорость', desc: 'Замедляет движение (легче)', cost: 80, inc: 40, max: 5, val: Math.round((getUpgrade('speed') - 1) * 10) },
                { key: 'scoreMult', name: 'Множитель очков +10%', desc: '', cost: 100, inc: 50, max: 5, val: Math.round((getUpgrade('scoreMult') - 1) * 10) },
                { key: 'magnet', name: 'Магнит', desc: 'Еда притягивается', cost: 200, max: 1, val: getUpgrade('magnet') ? 1 : 0 },
                { key: 'shieldStart', name: 'Щит в начале', desc: '', cost: 150, max: 1, val: getUpgrade('shieldStart') ? 1 : 0 },
                { key: 'dashCooldown', name: 'Рывок быстрее', desc: 'Перезарядка рывка', cost: 120, inc: 60, max: 3, val: getUpgrade('dashCooldown') },
                { key: 'extraPowerups', name: 'Новые бонусы', desc: 'Добавляет новые типы еды', cost: 250, inc: 150, max: 3, val: getUpgrade('extraPowerups') },
                { key: 'skinLevel', name: 'Цвет змеи', desc: 'Меняет окраску', cost: 100, inc: 0, max: 4, val: getUpgrade('skinLevel') }
            ];
            upgradesList.forEach(up => {
                const nextCost = up.inc ? Math.floor(up.cost + up.val * up.inc) : up.cost;
                const maxed = up.max && up.val >= up.max;
                const item = document.createElement('div');
                item.className = 'shop-upgrade';
                item.innerHTML = `
                    <div class="desc"><strong>${up.name}</strong><br>${up.desc}</div>
                    <span class="cost">${maxed ? 'МАКС' : nextCost + '💎'}</span>
                    <button class="buy-btn" ${(currency >= nextCost && !maxed) ? '' : 'disabled'}>Купить</button>
                `;
                if (!maxed && currency >= nextCost) {
                    item.querySelector('.buy-btn').onclick = () => {
                        currency -= nextCost;
                        let newVal = up.val + 1;
                        if (up.key === 'speed') newVal = 1 + newVal * 0.1;
                        else if (up.key === 'scoreMult') newVal = 1 + newVal * 0.1;
                        setUpgrade(up.key, newVal);
                        saveCurrency();
                        render();
                    };
                }
                container.appendChild(item);
            });
            document.getElementById('playSnakeAgain').onclick = () => document.dispatchEvent(new CustomEvent('startSnakeSingle'));
            document.getElementById('backToSnakeMenu').onclick = () => document.dispatchEvent(new CustomEvent('openMiniGamesMenu'));
        };
        render();
    }

    // Публичный API
    return {
        init,
        stop,
        showShop,
        exportState,
        importState,
        get active() { return active; },
        get players() { return players; },
        get dirs() { return dirs; },
        get nextDirs() { return nextDirs; },
        handleDashInput,
        // Для внутреннего использования в main (клавиатура)
        set onGameOver(cb) { onGameOver = cb; }
    };
})();