(function() {
    // Фоновый шум
    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Создание частиц
    const PARTICLE_COUNT = 80;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1,
            hue: Math.random() * 60 + 270 // от 270 до 330 (фиолетовый-розовый)
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Рисуем частицы
        for (let p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            // Зацикливание
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            // Меняем цвет со временем
            p.hue = (p.hue + 0.2) % 360;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, 0.15)`;
            ctx.fill();
            // Легкое свечение
            ctx.shadowBlur = 8;
            ctx.shadowColor = `hsla(${p.hue}, 80%, 70%, 0.4)`;
            ctx.fill();
            ctx.shadowBlur = 0; // сброс
        }
        requestAnimationFrame(animate);
    }
    animate();

    // Модальное окно и мини-игры
    const modalOverlay = document.getElementById('modalOverlay');
    const modalInner = document.getElementById('modalInner');
    let activeGame = null;

    function showSelection() {
        modalInner.innerHTML = `
            <h3>🎮 Мини-игры</h3>
            <button class="game-btn" id="playClicker">⚡ Кликер</button>
            <button class="game-btn" id="playTetris">🧱 Тетрис</button>
            <button class="game-btn" id="playSnake">🐍 Змейка</button>
            <button class="back-btn" id="closeModalBtn">Закрыть</button>
        `;
        document.getElementById('playClicker').onclick = showClicker;
        document.getElementById('playTetris').onclick = showTetrisMode;
        document.getElementById('playSnake').onclick = showSnakeMode;
        document.getElementById('closeModalBtn').onclick = closeModal;
    }

    function showClicker() {
        window.clicker.init();
        activeGame = 'clicker';
        modalInner.innerHTML = `
            <h3>⚡ Кликер</h3>
            <div class="clicker-stats">
                <span>💎 <span id="clickerScore">0</span></span>
                <span>⚡/сек: <span id="clickerPerSec">0</span></span>
            </div>
            <div id="bossContainer" class="boss-container" style="display:none;">
                <div style="color:#ff5555; font-weight:bold; font-size:0.8rem;" id="bossName">Босс</div>
                <div class="boss-bar-container"><div class="boss-bar" id="bossHealthBar"></div></div>
                <div style="font-size:0.65rem; color:#ccc;" id="bossHealthText"></div>
            </div>
            <div id="clickerArea" style="position:relative; min-height:70px;">
                <button class="clicker-main-btn" id="clickerBtn">CLICK</button>
            </div>
            <div id="eventsContainer"></div>
            <div id="clickerUpgrades" class="upgrades-list"></div>
            <button class="back-btn" id="backClicker">← Назад</button>
        `;
        document.getElementById('clickerBtn').onclick = function() {
            window.clicker.handleClick();
            this.classList.add('animated');
            setTimeout(() => this.classList.remove('animated'), 500);
        };
        document.getElementById('backClicker').onclick = function() {
            activeGame = null;
            showSelection();
        };
        window.clicker.updateUI();
        window.clicker.renderUpgradesList();
        window.clicker.generateChallenge();
        window.clicker.updateBossUI();
    }

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
        document.getElementById('backTetrisMode').onclick = function() {
            activeGame = null;
            showSelection();
        };
    }

    function showTetrisSingle() {
        modalInner.innerHTML = `
            <h3>🧱 Тетрис</h3>
            <canvas id="tetrisCanvas" width="180" height="360"></canvas>
            <div class="game-score" id="tetrisScore">Счёт: 0</div>
            <div class="game-controls">← → ↓ &nbsp; ↑ вращать &nbsp; пробел уронить</div>
            <button class="back-btn" id="backTetris">← Назад</button>
        `;
        window.tetris.init(1);
        activeGame = 'tetris';
        document.getElementById('backTetris').onclick = function() {
            window.tetris.stop();
            activeGame = null;
            showSelection();
        };
    }

    function showTetrisMulti() {
        modalInner.innerHTML = `
            <h3>🧱 Тетрис (2 игрока)</h3>
            <div class="multi-canvas-wrap">
                <div><canvas id="tetrisCanvasP1" width="150" height="300"></canvas><div class="game-score" id="tetrisScoreP1">Игрок 1: 0</div></div>
                <div><canvas id="tetrisCanvasP2" width="150" height="300"></canvas><div class="game-score" id="tetrisScoreP2">Игрок 2: 0</div></div>
            </div>
            <div class="game-controls">P1: WASD (ЦФЫВ), пробел &nbsp; P2: ←↑↓→, Enter</div>
            <button class="back-btn" id="backTetrisMulti">← Назад</button>
        `;
        window.tetris.init(2);
        activeGame = 'tetris';
        document.getElementById('backTetrisMulti').onclick = function() {
            window.tetris.stop();
            activeGame = null;
            showSelection();
        };
    }

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
        document.getElementById('backSnakeMode').onclick = function() {
            activeGame = null;
            showSelection();
        };
    }

    function showSnakeSingle() {
        modalInner.innerHTML = `
            <h3>🐍 Змейка</h3>
            <canvas id="snakeCanvas" width="200" height="200"></canvas>
            <div class="game-score" id="snakeScore">Счёт: 0</div>
            <div class="game-controls">← → ↑ ↓ (стрелки)</div>
            <button class="back-btn" id="backSnake">← Назад</button>
        `;
        window.snake.init(1);
        activeGame = 'snake';
        document.getElementById('backSnake').onclick = function() {
            window.snake.stop();
            activeGame = null;
            showSelection();
        };
    }

    function showSnakeMulti() {
        modalInner.innerHTML = `
            <h3>🐍 Змейка (2 игрока)</h3>
            <canvas id="snakeCanvas" width="200" height="200"></canvas>
            <div class="game-score" id="snakeScoreP1">Игрок 1: 0</div>
            <div class="game-score" id="snakeScoreP2">Игрок 2: 0</div>
            <div class="game-controls">P1: WASD (ЦФЫВ) &nbsp; P2: ←↑↓→</div>
            <button class="back-btn" id="backSnakeMulti">← Назад</button>
        `;
        window.snake.init(2);
        activeGame = 'snake';
        document.getElementById('backSnakeMulti').onclick = function() {
            window.snake.stop();
            activeGame = null;
            showSelection();
        };
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        activeGame = null;
    }

    document.getElementById('openMiniGames').onclick = function() {
        modalOverlay.classList.add('active');
        showSelection();
    };
    modalOverlay.onclick = function(e) {
        if (e.target === modalOverlay) closeModal();
    };

    // Расширенная обработка клавиатуры с поддержкой русской раскладки
    document.addEventListener('keydown', function(e) {
        const key = e.key;
        const gameKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter',
                          'w','a','s','d','W','A','S','D',
                          'ц','ф','ы','в','Ц','Ф','Ы','В'];
        if (gameKeys.includes(key)) {
            e.preventDefault();
        }

        if (activeGame === 'tetris' && window.tetris.active) {
            const t = window.tetris;
            const bSize = t.players === 1 ? 18 : 15;
            let mappedKey = key;
            if (key === 'ц' || key === 'Ц') mappedKey = 'w';
            else if (key === 'ф' || key === 'Ф') mappedKey = 'a';
            else if (key === 'ы' || key === 'Ы') mappedKey = 's';
            else if (key === 'в' || key === 'В') mappedKey = 'd';

            if (t.players === 1) {
                if (mappedKey === 'ArrowLeft') t.move(0, -1, 0, bSize);
                else if (mappedKey === 'ArrowRight') t.move(0, 1, 0, bSize);
                else if (mappedKey === 'ArrowDown') t.move(0, 0, 1, bSize);
                else if (mappedKey === 'ArrowUp') t.rotate(0, bSize);
                else if (mappedKey === ' ') t.drop(0, bSize);
            } else {
                if (mappedKey === 'a') t.move(0, -1, 0, bSize);
                else if (mappedKey === 'd') t.move(0, 1, 0, bSize);
                else if (mappedKey === 's') t.move(0, 0, 1, bSize);
                else if (mappedKey === 'w') t.rotate(0, bSize);
                else if (mappedKey === ' ') t.drop(0, bSize);
                else if (mappedKey === 'ArrowLeft') t.move(1, -1, 0, bSize);
                else if (mappedKey === 'ArrowRight') t.move(1, 1, 0, bSize);
                else if (mappedKey === 'ArrowDown') t.move(1, 0, 1, bSize);
                else if (mappedKey === 'ArrowUp') t.rotate(1, bSize);
                else if (mappedKey === 'Enter') t.drop(1, bSize);
            }
        } else if (activeGame === 'snake' && window.snake.active) {
            const s = window.snake;
            let mappedKey = key;
            if (key === 'ц' || key === 'Ц') mappedKey = 'w';
            else if (key === 'ф' || key === 'Ф') mappedKey = 'a';
            else if (key === 'ы' || key === 'Ы') mappedKey = 's';
            else if (key === 'в' || key === 'В') mappedKey = 'd';

            if (s.players === 1) {
                if (mappedKey === 'ArrowLeft' && s.dirs[0].x!==1) s.nextDirs[0] = {x:-1,y:0};
                else if (mappedKey === 'ArrowUp' && s.dirs[0].y!==1) s.nextDirs[0] = {x:0,y:-1};
                else if (mappedKey === 'ArrowRight' && s.dirs[0].x!==-1) s.nextDirs[0] = {x:1,y:0};
                else if (mappedKey === 'ArrowDown' && s.dirs[0].y!==-1) s.nextDirs[0] = {x:0,y:1};
            } else {
                if (mappedKey === 'a' && s.dirs[0].x!==1) s.nextDirs[0] = {x:-1,y:0};
                else if (mappedKey === 'w' && s.dirs[0].y!==1) s.nextDirs[0] = {x:0,y:-1};
                else if (mappedKey === 'd' && s.dirs[0].x!==-1) s.nextDirs[0] = {x:1,y:0};
                else if (mappedKey === 's' && s.dirs[0].y!==-1) s.nextDirs[0] = {x:0,y:1};
                if (mappedKey === 'ArrowLeft' && s.dirs[1].x!==1) s.nextDirs[1] = {x:-1,y:0};
                else if (mappedKey === 'ArrowUp' && s.dirs[1].y!==1) s.nextDirs[1] = {x:0,y:-1};
                else if (mappedKey === 'ArrowRight' && s.dirs[1].x!==-1) s.nextDirs[1] = {x:1,y:0};
                else if (mappedKey === 'ArrowDown' && s.dirs[1].y!==-1) s.nextDirs[1] = {x:0,y:1};
            }
        }
    });
})();