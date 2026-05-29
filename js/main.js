(function() {
    const bgCanvas = document.getElementById('bgCanvas');
    const bgCtx = bgCanvas.getContext('2d');
    let particles = [];

    function resizeBg() {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeBg);
    resizeBg();

    const PARTICLE_COUNT = 120;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * bgCanvas.width,
            y: Math.random() * bgCanvas.height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            size: Math.random() * 2.5 + 0.5,
            hue: Math.random() * 60 + 270,
            baseAlpha: 0.1 + Math.random() * 0.15
        });
    }

    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;
    document.addEventListener('mousemove', function(e) {
        targetMouseX = e.clientX / bgCanvas.width - 0.5;
        targetMouseY = e.clientY / bgCanvas.height - 0.5;
    });

    function animateBg() {
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        for (let p of particles) {
            p.x += p.vx + mouseX * 0.3;
            p.y += p.vy + mouseY * 0.3;
            if (p.x < -10) p.x = bgCanvas.width + 10;
            if (p.x > bgCanvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = bgCanvas.height + 10;
            if (p.y > bgCanvas.height + 10) p.y = -10;
            p.hue = (p.hue + 0.15) % 360;
            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            const alpha = p.baseAlpha + Math.sin(Date.now() * 0.002 + p.x) * 0.05;
            bgCtx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${alpha})`;
            bgCtx.fill();
            bgCtx.shadowBlur = 12;
            bgCtx.shadowColor = `hsla(${p.hue}, 80%, 70%, 0.5)`;
            bgCtx.fill();
            bgCtx.shadowBlur = 0;
        }
        requestAnimationFrame(animateBg);
    }
    animateBg();

    const modalOverlay = document.getElementById('modalOverlay');
    const modalInner = document.getElementById('modalInner');
    let activeGame = null;

    function showSelection() {
        activeGame = null;
        modalInner.innerHTML = `
            <h3>🎮 Мини-игры</h3>
            <button class="game-btn" id="playClicker">⚡ Кликер</button>
            <button class="game-btn" id="playTetris">🧱 Тетрис</button>
            <button class="game-btn" id="playSnake">🐍 Змейка</button>
            <button class="game-btn" id="playPong">🏓 Пинг-понг</button>
            <button class="back-btn" id="closeModalBtn">Закрыть</button>
        `;
        document.getElementById('playClicker').onclick = showClicker;
        document.getElementById('playTetris').onclick = showTetrisMode;
        document.getElementById('playSnake').onclick = showSnakeMode;
        document.getElementById('playPong').onclick = showPongMode;
        document.getElementById('closeModalBtn').onclick = closeModal;
    }

    // ---------- Кликер ----------
    function showClicker() {
        window.clicker.init();
        window.clicker.load();
        activeGame = 'clicker';

        modalInner.innerHTML = `
            <h3>⚡ Кликер</h3>
            <div class="tab-buttons">
                <button class="tab-btn active" data-tab="click">Клик</button>
                <button class="tab-btn" data-tab="upgrades">Улучшения</button>
                <button class="tab-btn" data-tab="stats">Статистика</button>
            </div>
            <div id="tab-click" class="tab-content">
                <div class="clicker-stats">
                    <span>💎 <span id="clickerScore">0</span></span>
                    <span>⚡/сек: <span id="clickerPerSec">0</span></span>
                </div>
                <div class="combo-display" id="comboDisplay"></div>
                <div id="bossContainer" class="boss-container" style="display:none;">
                    <div style="color:#ff5555; font-weight:bold; font-size:0.8rem;" id="bossName">Босс</div>
                    <div class="boss-bar-container"><div class="boss-bar" id="bossHealthBar"></div></div>
                    <div style="font-size:0.65rem; color:#ccc;" id="bossHealthText"></div>
                </div>
                <div id="clickerArea" style="position:relative; min-height:70px;">
                    <button class="clicker-main-btn" id="clickerBtn">CLICK</button>
                </div>
                <div id="eventsContainer"></div>
            </div>
            <div id="tab-upgrades" class="tab-content" style="display:none;">
                <div id="clickerUpgrades" class="upgrades-list"></div>
            </div>
            <div id="tab-stats" class="tab-content" style="display:none;">
                <table class="stats-table" id="statsTable"></table>
            </div>
            <button class="back-btn" id="backClicker">← Назад</button>
        `;

        window.clicker.attachUI({
            scoreEl: document.getElementById('clickerScore'),
            perSecEl: document.getElementById('clickerPerSec'),
            comboEl: document.getElementById('comboDisplay'),
            renderUpgrades: renderUpgradesList
        });

        document.getElementById('clickerBtn').onclick = function(e) {
            window.clicker.handleClick(e);
        };

        window.clicker.buyUpgrade = function(key) {
            const up = this.upgrades[key];
            const cost = Math.floor(up.baseCost * Math.pow(up.costMult, up.level));
            if (this.score < cost || (up.maxLevel && up.level >= up.maxLevel)) return;
            this.score -= cost;
            up.effect(up.level + 1);
            if (key === 'goldRush') {
                this.goldRushActive = true;
                this.goldRushMult = 2;
                this.goldRushTimer = 5 + (up.level + 1);
            }
            if (key === 'comboMaster') {
                this.maxCombo = (this.maxCombo || 0) + 10;
                this.comboMultiplier = (this.comboMultiplier || 0) + 0.01;
            }
            up.level++;
            this.updateUI();
            this.save();
            renderUpgradesList();
        };

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const tab = this.dataset.tab;
                document.getElementById('tab-click').style.display = tab === 'click' ? 'block' : 'none';
                document.getElementById('tab-upgrades').style.display = tab === 'upgrades' ? 'block' : 'none';
                document.getElementById('tab-stats').style.display = tab === 'stats' ? 'block' : 'none';
                if (tab === 'upgrades') renderUpgradesList();
                if (tab === 'stats') renderStatsTable();
            });
        });

        document.getElementById('backClicker').onclick = function() {
            showSelection();
        };

        window.clicker.updateUI();
        window.clicker.updateBossUI();
        window.clicker.generateChallenge();
        renderUpgradesList();
    }

    function renderUpgradesList() {
        const container = document.getElementById('clickerUpgrades');
        if (!container) return;
        container.innerHTML = '';
        const score = window.clicker.score;
        const tierNames = ['Базовые', 'Продвинутые', 'Экспертные', 'Мастерские', 'Легендарные'];
        const tierUnlocks = [0, 200, 1000, 5000, 20000];

        for (let t = 0; t < tierNames.length; t++) {
            const unlocked = score >= tierUnlocks[t];
            const header = document.createElement('div');
            header.style.cssText = 'color:#c44eff; font-weight:600; margin: 0.5rem 0 0.2rem; font-size:0.75rem;';
            header.textContent = tierNames[t] + (unlocked ? '' : ` (🔒 ${tierUnlocks[t]}💎)`);
            container.appendChild(header);

            for (let key in window.clicker.upgrades) {
                const up = window.clicker.upgrades[key];
                if (up.tier !== t) continue;
                const cost = Math.floor(up.baseCost * Math.pow(up.costMult, up.level));
                const canBuy = score >= cost && unlocked;
                const maxed = up.maxLevel && up.level >= up.maxLevel;
                let desc = up.desc;
                if (key === 'critChance') desc = `+2% шанс крита (тек: ${(window.clicker.critChance*100).toFixed(0)}%)`;
                if (key === 'critPower') desc = `+0.5x крит.множитель (тек: ${window.clicker.critMult.toFixed(1)}x)`;
                if (key === 'goldRush') desc = `Активирует x2 доход на ${5 + up.level} сек`;
                if (key === 'meteor') desc = `Периодический бонус, интервал ${Math.max(5, 15 - up.level)}с`;
                if (key === 'acceleration') desc = `Тик быстрее (тек: ${(window.clicker.tickRate/1000).toFixed(1)}с)`;
                if (key === 'magnetField') desc = `Каждые ${window.clicker.magnetInterval}с +${window.clicker.magnetPercent}% от счёта`;

                const item = document.createElement('div');
                item.className = 'upgrade-item' + (unlocked ? '' : ' locked');
                item.innerHTML = `
                    <div class="info">
                        <span class="icon">${up.icon}</span>
                        <div class="details">
                            <span class="name">${up.name} (ур.${up.level})</span>
                            <span class="effect">${desc}</span>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span class="cost">${maxed ? 'МАКС' : cost + '💎'}</span>
                        <button class="buy-btn" ${(canBuy && !maxed) ? '' : 'disabled'}>${maxed ? '✔️' : 'Купить'}</button>
                    </div>
                `;
                if (canBuy && !maxed) {
                    item.querySelector('.buy-btn').addEventListener('click', () => {
                        window.clicker.buyUpgrade(key);
                    });
                }
                container.appendChild(item);
            }
        }
    }

    function renderStatsTable() {
        const table = document.getElementById('statsTable');
        if (!table) return;
        const stats = window.clicker.getStats();
        table.innerHTML = `
            <tr><td>Всего 💎</td><td>${stats.score}</td></tr>
            <tr><td>Урон клика</td><td>${stats.perClick}</td></tr>
            <tr><td>Пасс./сек</td><td>${stats.perSec}</td></tr>
            <tr><td>Крит.шанс</td><td>${stats.critChance}</td></tr>
            <tr><td>Крит.множитель</td><td>${stats.critMult}</td></tr>
            <tr><td>Всего кликов</td><td>${stats.totalClicks}</td></tr>
            <tr><td>Всего заработано</td><td>${stats.totalEarned}</td></tr>
            <tr><td>Убито боссов</td><td>${stats.bossesDefeated}</td></tr>
            <tr><td>Интервал тика</td><td>${(stats.tickRate/1000).toFixed(1)}с</td></tr>
        `;
    }

    // ---------- Тетрис ----------
    function showTetrisMode() {
        modalInner.innerHTML = `
            <h3>🧱 Тетрис</h3>
            <div class="mode-select">
                <label><input type="radio" name="tetrisMode" value="single" checked> 1 игрок</label>
                <label><input type="radio" name="tetrisMode" value="multi"> 2 игрока</label>
            </div>
            <button class="game-btn" id="startTetrisBtn">Старт</button>
            <button class="back-btn" id="backTetrisMode">← Назад</button>
        `;
        document.getElementById('startTetrisBtn').onclick = function() {
            const mode = document.querySelector('input[name="tetrisMode"]:checked').value;
            if (mode === 'single') showTetrisSingle();
            else showTetrisMulti();
        };
        document.getElementById('backTetrisMode').onclick = showSelection;
    }

    function showTetrisSingle() {
        activeGame = 'tetris';
        modalInner.innerHTML = `
            <h3>🧱 Тетрис</h3>
            <canvas id="tetrisCanvas" width="180" height="360"></canvas>
            <div class="game-score" id="tetrisScore">Счёт: 0</div>
            <div id="abilityStatus" style="font-size:0.65rem; color:#aaa;"></div>
            <div class="game-controls">
                <div>←↓→ / WASD / кнопки (удерживайте для быстрого движения)</div>
                <button id="tetrisLeft" class="ctrl-btn">←</button>
                <button id="tetrisDown" class="ctrl-btn">↓</button>
                <button id="tetrisRight" class="ctrl-btn">→</button>
                <button id="tetrisRotate" class="ctrl-btn">↻</button>
                <button id="tetrisDrop" class="ctrl-btn">Drop</button>
                <button id="tetrisHold" class="ctrl-btn" style="width:auto;padding:0 8px;">📦</button>
                <button id="ability1" class="ctrl-btn" style="width:auto;padding:0 8px;">⚡</button>
                <button id="ability2" class="ctrl-btn" style="width:auto;padding:0 8px;">❄️</button>
                <button id="ability3" class="ctrl-btn" style="width:auto;padding:0 8px;">🧹</button>
            </div>
            <button class="back-btn" id="backTetris">← Назад</button>
        `;
        window.tetris.onGameOver = function() {
            window.tetris.showShop();
        };
        window.tetris.init(1);
        const bSize = 18;
        attachTetrisControls(0, bSize);
        document.getElementById('backTetris').onclick = function() {
            window.tetris.stop();
            showSelection();
        };
        document.getElementById('tetrisHold').onclick = () => window.tetris.hold(0, bSize);
        document.getElementById('ability1').onclick = () => window.tetris.useAbility(0, 'lightning', bSize);
        document.getElementById('ability2').onclick = () => window.tetris.useAbility(0, 'freeze', bSize);
        document.getElementById('ability3').onclick = () => window.tetris.useAbility(0, 'clear', bSize);
    }

    function showTetrisMulti() {
        activeGame = 'tetris';
        modalInner.innerHTML = `
            <h3>🧱 Тетрис (2 игрока)</h3>
            <div class="multi-canvas-wrap">
                <div>
                    <canvas id="tetrisCanvasP1" width="150" height="300"></canvas>
                    <div class="game-score" id="tetrisScoreP1">Игрок 1: 0</div>
                    <div class="game-controls">WASD, пробел</div>
                </div>
                <div>
                    <canvas id="tetrisCanvasP2" width="150" height="300"></canvas>
                    <div class="game-score" id="tetrisScoreP2">Игрок 2: 0</div>
                    <div class="game-controls">←↑↓→, Enter</div>
                </div>
            </div>
            <button class="back-btn" id="backTetrisMulti">← Назад</button>
        `;
        window.tetris.init(2);
        window.tetris.onGameOver = null;
        const bSize = 15;
        attachTetrisControls(0, bSize);
        attachTetrisControls(1, bSize);
        document.getElementById('backTetrisMulti').onclick = function() {
            window.tetris.stop();
            showSelection();
        };
    }

    function attachTetrisControls(playerIdx, blockSize) {
        const actions = {
            left: { btnId: playerIdx === 0 ? 'tetrisLeft' : `tetrisLeftP${playerIdx+1}`, action: () => window.tetris.move(playerIdx, -1, 0, blockSize) },
            right: { btnId: playerIdx === 0 ? 'tetrisRight' : `tetrisRightP${playerIdx+1}`, action: () => window.tetris.move(playerIdx, 1, 0, blockSize) },
            down: { btnId: playerIdx === 0 ? 'tetrisDown' : `tetrisDownP${playerIdx+1}`, action: () => window.tetris.move(playerIdx, 0, 1, blockSize) },
            rotate: { btnId: playerIdx === 0 ? 'tetrisRotate' : `tetrisRotateP${playerIdx+1}`, action: () => window.tetris.rotate(playerIdx, blockSize) },
            drop: { btnId: playerIdx === 0 ? 'tetrisDrop' : `tetrisDropP${playerIdx+1}`, action: () => window.tetris.drop(playerIdx, blockSize) }
        };

        const repeatDelay = 100;
        const repeatInterval = 50;
        const heldTimers = {};

        for (let key in actions) {
            const act = actions[key];
            const btn = document.getElementById(act.btnId);
            if (!btn) continue;

            const startRepeat = () => {
                if (heldTimers[key]) return;
                act.action();
                heldTimers[key] = {
                    initial: setTimeout(() => {
                        heldTimers[key].repeat = setInterval(() => act.action(), repeatInterval);
                    }, repeatDelay)
                };
            };

            const stopRepeat = () => {
                if (heldTimers[key]) {
                    clearTimeout(heldTimers[key].initial);
                    clearInterval(heldTimers[key].repeat);
                    delete heldTimers[key];
                }
            };

            btn.addEventListener('pointerdown', startRepeat);
            btn.addEventListener('pointerup', stopRepeat);
            btn.addEventListener('pointerleave', stopRepeat);
            btn.addEventListener('pointercancel', stopRepeat);
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); startRepeat(); });
            btn.addEventListener('touchend', stopRepeat);
        }
    }

    // ---------- Змейка ----------
    function showSnakeMode() {
        modalInner.innerHTML = `
            <h3>🐍 Змейка</h3>
            <div class="mode-select">
                <label><input type="radio" name="snakeMode" value="single" checked> 1 игрок</label>
                <label><input type="radio" name="snakeMode" value="multi"> 2 игрока</label>
            </div>
            <button class="game-btn" id="startSnakeBtn">Старт</button>
            <button class="back-btn" id="backSnakeMode">← Назад</button>
        `;
        document.getElementById('startSnakeBtn').onclick = function() {
            const mode = document.querySelector('input[name="snakeMode"]:checked').value;
            if (mode === 'single') showSnakeSingle();
            else showSnakeMulti();
        };
        document.getElementById('backSnakeMode').onclick = showSelection;
    }

    function showSnakeSingle() {
        activeGame = 'snake';
        modalInner.innerHTML = `
            <h3>🐍 Змейка</h3>
            <canvas id="snakeCanvas" width="200" height="200"></canvas>
            <div class="snake-hud">
                <span class="combo-indicator" id="comboIndicator"></span>
                <span class="dash-indicator" id="dashIndicator"></span>
            </div>
            <div class="active-powerups" id="powerupsContainer"></div>
            <div class="game-score" id="snakeScore">Счёт: 0</div>
            <div class="game-controls">
                <div>Управление: стрелки / WASD / свайпы по холсту</div>
                <button id="snakeUp" class="ctrl-btn">↑</button>
                <button id="snakeLeft" class="ctrl-btn">←</button>
                <button id="snakeDown" class="ctrl-btn">↓</button>
                <button id="snakeRight" class="ctrl-btn">→</button>
            </div>
            <button class="back-btn" id="backSnake">← Назад</button>
        `;
        window.snake.init(1);
        window.snake.onGameOver = function() {
            window.snake.showShop();
        };
        attachSnakeControls(0);
        setupSnakeSwipe();
        document.getElementById('backSnake').onclick = function() {
            window.snake.stop();
            showSelection();
        };
    }

    function showSnakeMulti() {
        activeGame = 'snake';
        modalInner.innerHTML = `
            <h3>🐍 Змейка (2 игрока)</h3>
            <canvas id="snakeCanvas" width="200" height="200"></canvas>
            <div class="game-score" id="snakeScoreP1">Игрок 1: 0</div>
            <div class="game-score" id="snakeScoreP2">Игрок 2: 0</div>
            <div class="game-controls">P1: WASD | P2: ←↑↓→</div>
            <button class="back-btn" id="backSnakeMulti">← Назад</button>
        `;
        window.snake.init(2);
        window.snake.onGameOver = null;
        document.getElementById('backSnakeMulti').onclick = function() {
            window.snake.stop();
            showSelection();
        };
    }

    function attachSnakeControls(playerIdx) {
        const dirMap = { up: {x:0, y:-1}, down: {x:0, y:1}, left: {x:-1, y:0}, right: {x:1, y:0} };
        for (let dir in dirMap) {
            const btn = document.getElementById(`snake${dir.charAt(0).toUpperCase()+dir.slice(1)}`);
            if (btn) {
                btn.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                    if (!window.snake.active) return;
                    const s = window.snake;
                    const newDir = dirMap[dir];
                    const opposite = (newDir.x === -s.dirs[playerIdx].x && newDir.y === -s.dirs[playerIdx].y);
                    if (!opposite) s.nextDirs[playerIdx] = newDir;
                    s.handleDashInput(playerIdx, dir);
                });
            }
        }
    }

    function setupSnakeSwipe() {
        const canvas = document.getElementById('snakeCanvas');
        if (!canvas) return;
        let touchStart = null;

        const handleStart = (e) => {
            if (!window.snake.active) return;
            const touch = e.touches ? e.touches[0] : e;
            touchStart = { x: touch.clientX, y: touch.clientY };
        };

        const handleEnd = (e) => {
            if (!touchStart || !window.snake.active) return;
            const touch = e.changedTouches ? e.changedTouches[0] : e;
            const dx = touch.clientX - touchStart.x;
            const dy = touch.clientY - touchStart.y;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (Math.max(absDx, absDy) < 20) { touchStart = null; return; }

            let dir;
            if (absDx > absDy) {
                dir = dx > 0 ? 'right' : 'left';
            } else {
                dir = dy > 0 ? 'down' : 'up';
            }

            const s = window.snake;
            const newDir = { up: {x:0,y:-1}, down: {x:0,y:1}, left: {x:-1,y:0}, right: {x:1,y:0} }[dir];
            const opposite = (newDir.x === -s.dirs[0].x && newDir.y === -s.dirs[0].y);
            if (!opposite) s.nextDirs[0] = newDir;
            s.handleDashInput(0, dir);

            touchStart = null;
        };

        canvas.addEventListener('touchstart', handleStart, { passive: false });
        canvas.addEventListener('touchend', handleEnd);
        canvas.addEventListener('mousedown', handleStart);
        canvas.addEventListener('mouseup', handleEnd);
        canvas.addEventListener('mouseleave', () => { touchStart = null; });
    }

    // ---------- Пинг-понг ----------
    function showPongMode() {
        modalInner.innerHTML = `
            <h3>🏓 Пинг-понг</h3>
            <div class="mode-select">
                <label><input type="radio" name="pongMode" value="single" checked> 1 игрок (против бота)</label>
                <label><input type="radio" name="pongMode" value="multi"> 2 игрока</label>
            </div>
            <button class="game-btn" id="startPongBtn">Старт</button>
            <button class="back-btn" id="backPongMode">← Назад</button>
        `;
        document.getElementById('startPongBtn').onclick = function() {
            const mode = document.querySelector('input[name="pongMode"]:checked').value;
            activeGame = 'pong';
            modalInner.innerHTML = `
                <h3>🏓 Пинг-понг</h3>
                <canvas id="pongCanvas" width="800" height="400" style="width:100%; height:auto; max-width:800px; background:#000; border-radius:8px;"></canvas>
                <div style="display:flex; justify-content:space-between; margin-top:5px;">
                    <span id="pongTimer" style="color:#c44eff;">След. улучшение: 60с</span>
                    <span id="pongEvent" style="color:#ffaa44;"></span>
                </div>
                <div class="game-controls" style="font-size:0.7rem;">
                    Игрок 1: W/S | Игрок 2: ↑/↓
                </div>
                <button class="back-btn" id="backPong">← Назад</button>
            `;
            window.pong.init(mode);
            document.getElementById('backPong').onclick = function() {
                window.pong.stop();
                showSelection();
            };
        };
        document.getElementById('backPongMode').onclick = showSelection;
    }

    // ---------- Общие обработчики ----------
    document.addEventListener('startTetrisSingle', () => showTetrisSingle());
    document.addEventListener('startSnakeSingle', () => showSnakeSingle());
    document.addEventListener('openMiniGamesMenu', () => showSelection());

    function closeModal() {
        modalOverlay.classList.remove('active');
        if (activeGame === 'tetris') window.tetris.stop();
        if (activeGame === 'snake') window.snake.stop();
        if (activeGame === 'pong') window.pong.stop();
        activeGame = null;
    }

    document.getElementById('openMiniGames').onclick = function() {
        modalOverlay.classList.add('active');
        showSelection();
    };
    modalOverlay.onclick = function(e) {
        if (e.target === modalOverlay) closeModal();
    };

    // ---------- Глобальная клавиатура ----------
    function isLeft(key) { return key === 'ArrowLeft' || key === 'a' || key === 'A' || key === 'ф' || key === 'Ф'; }
    function isRight(key) { return key === 'ArrowRight' || key === 'd' || key === 'D' || key === 'в' || key === 'В'; }
    function isDown(key) { return key === 'ArrowDown' || key === 's' || key === 'S' || key === 'ы' || key === 'Ы'; }
    function isUp(key) { return key === 'ArrowUp' || key === 'w' || key === 'W' || key === 'ц' || key === 'Ц'; }
    function isSpace(key) { return key === ' '; }
    function isEnter(key) { return key === 'Enter'; }

    const gameKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter',
                      'w','a','s','d','W','A','S','D',
                      'ц','ф','ы','в','Ц','Ф','Ы','В',
                      'z','Z','x','X','c','C','h','H',
                      'я','Я','ч','Ч','с','С','р','Р'];

    document.addEventListener('keydown', function(e) {
        const key = e.key;
        if (gameKeys.includes(key)) e.preventDefault();

        if (activeGame === 'tetris' && window.tetris.active) {
            const t = window.tetris;
            const bSize = t.players === 1 ? 18 : 15;
            if (t.players === 1) {
                if (isLeft(key)) t.move(0, -1, 0, bSize);
                else if (isRight(key)) t.move(0, 1, 0, bSize);
                else if (isDown(key)) t.move(0, 0, 1, bSize);
                else if (isUp(key)) t.rotate(0, bSize);
                else if (isSpace(key)) t.drop(0, bSize);
                else if (key === 'h' || key === 'H' || key === 'р' || key === 'Р') t.hold(0, bSize);
                else if (key === 'z' || key === 'Z' || key === 'я' || key === 'Я') t.useAbility(0, 'lightning', bSize);
                else if (key === 'x' || key === 'X' || key === 'ч' || key === 'Ч') t.useAbility(0, 'freeze', bSize);
                else if (key === 'c' || key === 'C' || key === 'с' || key === 'С') t.useAbility(0, 'clear', bSize);
            } else {
                if (key === 'a' || key === 'A' || key === 'ф' || key === 'Ф') t.move(0, -1, 0, bSize);
                else if (key === 'd' || key === 'D' || key === 'в' || key === 'В') t.move(0, 1, 0, bSize);
                else if (key === 's' || key === 'S' || key === 'ы' || key === 'Ы') t.move(0, 0, 1, bSize);
                else if (key === 'w' || key === 'W' || key === 'ц' || key === 'Ц') t.rotate(0, bSize);
                else if (key === ' ') t.drop(0, bSize);
                else if (key === 'ArrowLeft') t.move(1, -1, 0, bSize);
                else if (key === 'ArrowRight') t.move(1, 1, 0, bSize);
                else if (key === 'ArrowDown') t.move(1, 0, 1, bSize);
                else if (key === 'ArrowUp') t.rotate(1, bSize);
                else if (key === 'Enter') t.drop(1, bSize);
            }
        } else if (activeGame === 'snake' && window.snake.active) {
            const s = window.snake;
            function setDir(pIdx, newDir) {
                const cur = s.dirs[pIdx];
                if (newDir.x === -cur.x && newDir.y === -cur.y) return;
                s.nextDirs[pIdx] = newDir;
            }
            if (s.players === 1) {
                let dir = null;
                if (isLeft(key)) dir = {x:-1, y:0};
                else if (isRight(key)) dir = {x:1, y:0};
                else if (isUp(key)) dir = {x:0, y:-1};
                else if (isDown(key)) dir = {x:0, y:1};
                if (dir) {
                    setDir(0, dir);
                    s.handleDashInput(0, dir);
                }
            } else {
                if (key === 'a' || key === 'A' || key === 'ф' || key === 'Ф') { setDir(0, {x:-1,y:0}); s.handleDashInput(0, 'left'); }
                else if (key === 'd' || key === 'D' || key === 'в' || key === 'В') { setDir(0, {x:1,y:0}); s.handleDashInput(0, 'right'); }
                else if (key === 'w' || key === 'W' || key === 'ц' || key === 'Ц') { setDir(0, {x:0,y:-1}); s.handleDashInput(0, 'up'); }
                else if (key === 's' || key === 'S' || key === 'ы' || key === 'Ы') { setDir(0, {x:0,y:1}); s.handleDashInput(0, 'down'); }
                else if (key === 'ArrowLeft') { setDir(1, {x:-1,y:0}); s.handleDashInput(1, 'left'); }
                else if (key === 'ArrowRight') { setDir(1, {x:1,y:0}); s.handleDashInput(1, 'right'); }
                else if (key === 'ArrowUp') { setDir(1, {x:0,y:-1}); s.handleDashInput(1, 'up'); }
                else if (key === 'ArrowDown') { setDir(1, {x:0,y:1}); s.handleDashInput(1, 'down'); }
            }
        }
    });

    // ---------- GitHub Auth Integration ----------
    const auth = window.GitHubAuth;
    auth.init();

    const authStatusDiv = document.getElementById('authStatus');
    const tokenModal = document.getElementById('tokenModal');
    const githubTokenInput = document.getElementById('githubTokenInput');
    const submitTokenBtn = document.getElementById('submitTokenBtn');
    const cancelTokenBtn = document.getElementById('cancelTokenBtn');
    const logoutGithubBtn = document.getElementById('logoutGithubBtn');
    const githubLoginBtn = document.getElementById('githubLoginBtn');

    function updateAuthUI() {
        if (auth.isAuthenticated && auth.username) {
            authStatusDiv.innerHTML = `✅ GitHub: ${auth.username} | <button id="syncSaveBtn" style="background:none; border:none; color:#c44eff; cursor:pointer;">💾 Синхр.</button>`;
            const syncBtn = document.getElementById('syncSaveBtn');
            if (syncBtn) {
                syncBtn.onclick = () => {
                    auth.syncSave();
                };
            }
        } else {
            authStatusDiv.innerHTML = `🔒 Не авторизован | <button id="manualLoginBtn" style="background:none; border:none; color:#c44eff; cursor:pointer;">Войти через GitHub</button>`;
            const loginBtn = document.getElementById('manualLoginBtn');
            if (loginBtn) {
                loginBtn.onclick = () => { tokenModal.style.display = 'flex'; };
            }
        }
    }

    githubLoginBtn.onclick = () => { tokenModal.style.display = 'flex'; };
    cancelTokenBtn.onclick = () => { tokenModal.style.display = 'none'; githubTokenInput.value = ''; };
    logoutGithubBtn.onclick = () => {
        auth.logout();
        tokenModal.style.display = 'none';
        updateAuthUI();
        window.location.reload();
    };
    submitTokenBtn.onclick = async () => {
        const token = githubTokenInput.value.trim();
        if (!token) { alert('Введите токен'); return; }
        submitTokenBtn.disabled = true;
        submitTokenBtn.textContent = 'Проверка...';
        try {
            await auth.register(token);
            await auth.syncLoad();
            tokenModal.style.display = 'none';
            githubTokenInput.value = '';
            updateAuthUI();
            alert(`Добро пожаловать, ${auth.username}! Прогресс загружен.`);
        } catch(err) {
            alert('Ошибка: ' + err.message);
        } finally {
            submitTokenBtn.disabled = false;
            submitTokenBtn.textContent = '✅ Зарегистрироваться / Войти';
        }
    };

    // Автоматическая синхронизация каждые 30 секунд
    setInterval(() => {
        if (auth.isAuthenticated) {
            auth.syncSave().catch(console.warn);
        }
    }, 30000);

    updateAuthUI();

    // Глобальный toast (для уведомлений)
    window.showToast = function(msg, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    };
})();