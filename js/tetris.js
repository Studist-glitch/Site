// js/tetris.js - Полностью рефакторинг с UpgradeManager, экспорт/импорт, анимации
window.tetris = (function() {
    'use strict';

    const COLS = 10;
    const ROWS = 20;
    const UPGRADE_KEY = 'tetrisUpgrades';
    const DEFAULT_UPGRADES = {
        speed: 0,
        lineBonus: 0,
        startRows: 0,
        specialChance: 0,
        abilityPower: 0,
        pieceSet: 0,
        holdPiece: false,
        ghostPiece: false,
        shield: 0,
        autoHold: 0,
        comboMaster: 0,
        particleEffect: 0
    };

    const BASE_PIECES = [
        { shape: [[1,1,1,1]], color: '#c44eff', type: 'I' },
        { shape: [[1,1],[1,1]], color: '#ffcc00', type: 'O' },
        { shape: [[0,1,0],[1,1,1]], color: '#ff44cc', type: 'T' },
        { shape: [[1,0,0],[1,1,1]], color: '#44ccff', type: 'J' },
        { shape: [[0,0,1],[1,1,1]], color: '#ff8844', type: 'L' },
        { shape: [[0,1,1],[1,1,0]], color: '#44ff44', type: 'S' },
        { shape: [[1,1,0],[0,1,1]], color: '#ff4444', type: 'Z' }
    ];
    const EXTRA_SETS = [
        [{ shape: [[0,1,0],[1,1,1],[0,1,0]], color: '#ff66ff', type: '+' }, { shape: [[1,0,1],[1,1,1]], color: '#66ff66', type: 'U' }],
        [{ shape: [[1,1,0],[0,1,1],[0,1,0]], color: '#ffa500', type: 'P' }, { shape: [[0,1,0],[1,1,0],[0,1,0]], color: '#00bfff', type: 'C' }]
    ];
    const SPECIAL_PIECES = [
        { shape: [[1,1,1]], color: '#ff00ff', type: 'bomb' },
        { shape: [[1,0,0],[1,0,0],[1,1,1]], color: '#00ffff', type: 'laser' }
    ];

    let upgradeManager = null;
    let active = false;
    let interval = null;
    let players = 1;
    let singlePlayerMode = true;
    let onGameOver = null;

    let boards = [];
    let pieces = [];
    let holdPieces = [];
    let canHold = [];
    let scores = [];
    let clearingLines = [];
    let freezeTimers = [];
    let abilities = [];
    let abilityCooldowns = [];
    let comboCnt = [];
    let comboMultiplier = [];
    let shieldUsed = [];
    let particles = [];
    let animationFrame = null;

    let currency = 0;
    let _cdTick = 0;

    // ---------- Upgrade Manager ----------
    function initUpgradeManager() {
        if (!upgradeManager) upgradeManager = new UpgradeManager(UPGRADE_KEY, DEFAULT_UPGRADES);
        return upgradeManager;
    }

    function getUpgrade(key) { return upgradeManager ? upgradeManager.get(key) : DEFAULT_UPGRADES[key]; }
    function setUpgrade(key, value) { if (upgradeManager) upgradeManager.set(key, value); }
    function saveUpgrades() { if (upgradeManager) upgradeManager.save(); }

    function loadCurrency() { currency = parseInt(localStorage.getItem('tetrisCurrency')) || 0; }
    function saveCurrency() { localStorage.setItem('tetrisCurrency', currency); }

    function getAllPieces() {
        let pieces = [...BASE_PIECES];
        if (singlePlayerMode) {
            const setLevel = getUpgrade('pieceSet');
            for (let i = 0; i < setLevel && i < EXTRA_SETS.length; i++) pieces = pieces.concat(EXTRA_SETS[i]);
        }
        return pieces;
    }

    function randomPiece() {
        const allPieces = getAllPieces();
        let specialChance = 0;
        if (singlePlayerMode) specialChance = getUpgrade('specialChance') * 0.05;
        if (Math.random() < specialChance && SPECIAL_PIECES.length) {
            const sp = SPECIAL_PIECES[Math.floor(Math.random() * SPECIAL_PIECES.length)];
            return {
                shape: sp.shape.map(r => [...r]),
                color: sp.color,
                type: sp.type,
                x: Math.floor((COLS - sp.shape[0].length) / 2),
                y: 0
            };
        }
        const p = allPieces[Math.floor(Math.random() * allPieces.length)];
        return {
            shape: p.shape.map(r => [...r]),
            color: p.color,
            type: p.type || 'normal',
            x: Math.floor((COLS - p.shape[0].length) / 2),
            y: 0
        };
    }

    function initBoard() {
        const board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        if (singlePlayerMode) {
            const rows = getUpgrade('startRows') * 2;
            for (let r = ROWS - rows; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) board[r][c] = '#555';
            }
        }
        return board;
    }

    function collide(board, shape, x, y) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[0].length; c++) {
                if (shape[r][c]) {
                    const bx = x + c, by = y + r;
                    if (bx < 0 || bx >= COLS || by >= ROWS) return true;
                    if (by >= 0 && board[by][bx]) return true;
                }
            }
        }
        return false;
    }

    function getDropY(board, piece) {
        let y = piece.y;
        while (!collide(board, piece.shape, piece.x, y + 1)) y++;
        return y;
    }

    function addParticleEffect(x, y, color) {
        if (!singlePlayerMode || !getUpgrade('particleEffect')) return;
        for (let i = 0; i < 12; i++) {
            particles.push({
                x: x + (Math.random() - 0.5) * 15,
                y: y + (Math.random() - 0.5) * 15,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3 - 1,
                life: 0.7 + Math.random() * 0.5,
                color: color
            });
        }
    }

    function getFullLines(board) {
        const lines = [];
        for (let r = 0; r < ROWS; r++) {
            if (board[r].every(cell => cell !== 0)) lines.push(r);
        }
        return lines;
    }

    function clearLinesWithAnimation(board, playerIdx) {
        const lines = getFullLines(board);
        if (lines.length === 0) {
            comboCnt[playerIdx] = 0;
            comboMultiplier[playerIdx] = 1;
            return;
        }
        if (clearingLines[playerIdx]) return;
        clearingLines[playerIdx] = true;

        comboCnt[playerIdx]++;
        let comboBonus = 0.2 * comboCnt[playerIdx];
        if (singlePlayerMode) comboBonus += getUpgrade('comboMaster') * 0.1;
        comboMultiplier[playerIdx] = 1 + comboBonus;

        const blockSize = players === 1 ? 18 : 15;
        const canvasId = players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx + 1}`;
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            lines.forEach(row => {
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.fillRect(0, row * blockSize, COLS * blockSize, blockSize);
                ctx.fillStyle = 'white';
                ctx.fillRect(0, row * blockSize, COLS * blockSize, blockSize);
            });
        }

        setTimeout(() => {
            const sorted = [...lines].sort((a, b) => b - a);
            for (let r of sorted) {
                board.splice(r, 1);
                board.unshift(Array(COLS).fill(0));
            }
            let base = lines.length * 100 * comboMultiplier[playerIdx];
            if (singlePlayerMode) base = Math.floor(base * (1 + getUpgrade('lineBonus') * 0.2));
            scores[playerIdx] += base;
            const elId = players === 1 ? 'tetrisScore' : `tetrisScoreP${playerIdx + 1}`;
            const el = document.getElementById(elId);
            if (el) el.textContent = (players === 1 ? 'Счёт: ' : `Игрок ${playerIdx + 1}: `) + scores[playerIdx];

            if (singlePlayerMode && getUpgrade('particleEffect')) {
                for (let i = 0; i < 20; i++) {
                    const x = Math.random() * COLS * blockSize;
                    const y = (lines[0] + Math.random() * lines.length) * blockSize;
                    addParticleEffect(x, y, '#ffffff');
                }
            }
            clearingLines[playerIdx] = false;
            drawBoard(board, pieces[playerIdx], holdPieces[playerIdx], canvasId, blockSize, playerIdx);
        }, 80);
    }

    function lockPiece(board, piece, playerIdx) {
        if (piece.type === 'bomb') {
            const cx = piece.x + Math.floor(piece.shape[0].length / 2);
            const cy = piece.y + Math.floor(piece.shape.length / 2);
            for (let r = cy - 1; r <= cy + 1; r++) {
                for (let c = cx - 1; c <= cx + 1; c++) {
                    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = 0;
                }
            }
            addParticleEffect(cx * 15, cy * 15, '#ff00ff');
        } else if (piece.type === 'laser') {
            const row = piece.y;
            if (row >= 0 && row < ROWS) {
                for (let c = 0; c < COLS; c++) board[row][c] = 0;
            }
            addParticleEffect(0, row * 15, '#00ffff');
        } else {
            piece.shape.forEach((row, dy) => {
                row.forEach((val, dx) => {
                    if (val) {
                        const bx = piece.x + dx, by = piece.y + dy;
                        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) board[by][bx] = piece.color;
                    }
                });
            });
        }

        if (singlePlayerMode && getUpgrade('autoHold') && canHold[playerIdx] && holdPieces[playerIdx] === null) {
            holdPieces[playerIdx] = {
                shape: piece.shape.map(r => [...r]),
                color: piece.color,
                type: piece.type,
                x: Math.floor((COLS - piece.shape[0].length) / 2),
                y: 0
            };
            canHold[playerIdx] = false;
        }

        clearLinesWithAnimation(board, playerIdx);
        const newPiece = randomPiece();
        if (collide(board, newPiece.shape, newPiece.x, newPiece.y)) {
            if (singlePlayerMode && getUpgrade('shield') && !shieldUsed[playerIdx]) {
                shieldUsed[playerIdx] = true;
                for (let c = 0; c < COLS; c++) board[ROWS - 1][c] = 0;
                board.pop();
                board.unshift(Array(COLS).fill(0));
                if (!collide(board, newPiece.shape, newPiece.x, newPiece.y)) {
                    showToast("🛡️ Щит спас вас от поражения!");
                    return newPiece;
                } else {
                    gameOver(playerIdx);
                    return null;
                }
            } else {
                gameOver(playerIdx);
                return null;
            }
        }
        return newPiece;
    }

    function drawBoard(board, piece, holdPiece, canvasId, blockSize, playerIdx) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(196,78,255,0.1)';
        ctx.lineWidth = 0.5;
        for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * blockSize);
            ctx.lineTo(COLS * blockSize, r * blockSize);
            ctx.stroke();
        }
        for (let c = 0; c <= COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * blockSize, 0);
            ctx.lineTo(c * blockSize, ROWS * blockSize);
            ctx.stroke();
        }

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) drawBlock(ctx, c, r, board[r][c], blockSize, 1);
            }
        }

        if (singlePlayerMode && getUpgrade('ghostPiece') && piece && !clearingLines[playerIdx]) {
            const ghostY = getDropY(board, piece);
            if (ghostY !== piece.y) {
                piece.shape.forEach((row, dy) => {
                    row.forEach((val, dx) => {
                        if (val) {
                            const gx = piece.x + dx, gy = ghostY + dy;
                            ctx.fillStyle = 'rgba(255,255,255,0.15)';
                            ctx.fillRect(gx * blockSize, gy * blockSize, blockSize - 1, blockSize - 1);
                            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                            ctx.strokeRect(gx * blockSize, gy * blockSize, blockSize - 1, blockSize - 1);
                        }
                    });
                });
            }
        }

        if (piece) {
            piece.shape.forEach((row, dy) => {
                row.forEach((val, dx) => {
                    if (val) drawBlock(ctx, piece.x + dx, piece.y + dy, piece.color, blockSize, 1);
                });
            });
        }

        if (holdPiece) {
            const holdX = 2, holdY = 2, smallSize = blockSize * 0.8;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(holdX, holdY, 4 * smallSize, 4 * smallSize);
            holdPiece.shape.forEach((row, dy) => {
                row.forEach((val, dx) => {
                    if (val) {
                        ctx.fillStyle = holdPiece.color;
                        ctx.fillRect(holdX + dx * smallSize, holdY + dy * smallSize, smallSize - 1, smallSize - 1);
                    }
                });
            });
        }

        if (playerIdx === 0 && players === 1) {
            const el = document.getElementById('abilityStatus');
            if (el) {
                let status = '';
                abilities.forEach(a => {
                    const cd = abilityCooldowns[0][a.key] || 0;
                    status += `${a.name}: ${cd > 0 ? cd + 'с' : 'OK'} `;
                });
                el.textContent = status;
            }
        }
    }

    function drawBlock(ctx, x, y, color, size, alpha = 1) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x * size, y * size, size - 1, size - 1);
        ctx.shadowBlur = 4;
        ctx.fillRect(x * size, y * size, size - 1, size - 1);
        ctx.shadowBlur = 0;
        const grad = ctx.createLinearGradient(x * size, y * size, (x + 1) * size, (y + 1) * size);
        grad.addColorStop(0, 'rgba(255,255,255,0.3)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = grad;
        ctx.fillRect(x * size, y * size, size - 1, size - 1);
        ctx.globalAlpha = 1;
    }

    function drawAll(blockSize) {
        for (let i = 0; i < players; i++) {
            const canvasId = players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${i + 1}`;
            drawBoard(boards[i], pieces[i], holdPieces[i], canvasId, blockSize, i);
        }
    }

    function move(playerIdx, dx, dy, blockSize) {
        if (!active || clearingLines[playerIdx] || freezeTimers[playerIdx]) return;
        const board = boards[playerIdx];
        const piece = pieces[playerIdx];
        const canvasId = players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx + 1}`;

        if (!collide(board, piece.shape, piece.x + dx, piece.y + dy)) {
            piece.x += dx;
            piece.y += dy;
            drawBoard(board, piece, holdPieces[playerIdx], canvasId, blockSize, playerIdx);
        } else if (dy === 1) {
            const newPiece = lockPiece(board, piece, playerIdx);
            if (newPiece === null) return;
            canHold[playerIdx] = true;
            pieces[playerIdx] = newPiece;
            drawBoard(board, newPiece, holdPieces[playerIdx], canvasId, blockSize, playerIdx);
        }
    }

    function rotate(playerIdx, blockSize) {
        if (!active || clearingLines[playerIdx] || freezeTimers[playerIdx]) return;
        const piece = pieces[playerIdx];
        const rotated = piece.shape[0].map((_, i) => piece.shape.map(r => r[i]).reverse());
        if (!collide(boards[playerIdx], rotated, piece.x, piece.y)) {
            piece.shape = rotated;
            const canvasId = players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx + 1}`;
            drawBoard(boards[playerIdx], piece, holdPieces[playerIdx], canvasId, blockSize, playerIdx);
        }
    }

    function drop(playerIdx, blockSize) {
        if (!active || clearingLines[playerIdx] || freezeTimers[playerIdx]) return;
        const board = boards[playerIdx];
        const piece = pieces[playerIdx];
        while (!collide(board, piece.shape, piece.x, piece.y + 1)) piece.y++;
        const newPiece = lockPiece(board, piece, playerIdx);
        if (newPiece === null) return;
        canHold[playerIdx] = true;
        pieces[playerIdx] = newPiece;
        const canvasId = players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx + 1}`;
        drawBoard(board, newPiece, holdPieces[playerIdx], canvasId, blockSize, playerIdx);
    }

    function hold(playerIdx, blockSize) {
        if (!active || clearingLines[playerIdx]) return;
        if (singlePlayerMode && !getUpgrade('holdPiece')) return;
        if (!canHold[playerIdx]) return;

        const current = pieces[playerIdx];
        const held = holdPieces[playerIdx];

        holdPieces[playerIdx] = {
            shape: current.shape.map(r => [...r]),
            color: current.color,
            type: current.type,
            x: Math.floor((COLS - current.shape[0].length) / 2),
            y: 0
        };

        if (held) {
            pieces[playerIdx] = {
                shape: held.shape.map(r => [...r]),
                color: held.color,
                type: held.type,
                x: Math.floor((COLS - held.shape[0].length) / 2),
                y: 0
            };
        } else {
            pieces[playerIdx] = randomPiece();
        }

        if (collide(boards[playerIdx], pieces[playerIdx].shape, pieces[playerIdx].x, pieces[playerIdx].y)) {
            gameOver(playerIdx);
            return;
        }

        canHold[playerIdx] = false;
        const canvasId = players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx + 1}`;
        drawBoard(boards[playerIdx], pieces[playerIdx], holdPieces[playerIdx], canvasId, blockSize, playerIdx);
    }

    function useAbility(playerIdx, key, blockSize) {
        if (!active || clearingLines[playerIdx] || !singlePlayerMode) return;
        const cd = abilityCooldowns[playerIdx][key];
        if (cd > 0) return;
        const ability = abilities.find(a => a.key === key);
        if (!ability) return;
        abilityCooldowns[playerIdx][key] = ability.cooldown;

        switch (key) {
            case 'lightning':
                drop(playerIdx, blockSize);
                scores[playerIdx] += 20;
                addParticleEffect(100, 100, '#ffff00');
                break;
            case 'freeze':
                if (freezeTimers[playerIdx]) clearTimeout(freezeTimers[playerIdx]);
                freezeTimers[playerIdx] = setTimeout(() => { freezeTimers[playerIdx] = null; }, 5000);
                addParticleEffect(150, 150, '#00ccff');
                break;
            case 'clear':
                const board = boards[playerIdx];
                for (let r = ROWS - 1; r >= 0; r--) {
                    if (board[r].some(cell => cell)) {
                        board.splice(r, 1);
                        board.unshift(Array(COLS).fill(0));
                        scores[playerIdx] += 50;
                        addParticleEffect(0, r * 15, '#ffaa44');
                        break;
                    }
                }
                break;
        }
        const canvasId = players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx + 1}`;
        drawBoard(boards[playerIdx], pieces[playerIdx], holdPieces[playerIdx], canvasId, blockSize, playerIdx);
    }

    function tick(blockSize) {
        if (!active) return;
        for (let i = 0; i < players; i++) {
            if (!clearingLines[i] && !freezeTimers[i]) {
                move(i, 0, 1, blockSize);
            }
        }
        if (players === 1 && singlePlayerMode) {
            _cdTick = (_cdTick || 0) + 1;
            const tickTime = Math.min(800, 500 + getUpgrade('speed') * 50);
            if (_cdTick >= Math.round(1000 / tickTime)) {
                _cdTick = 0;
                for (let key in abilityCooldowns[0]) {
                    if (abilityCooldowns[0][key] > 0) abilityCooldowns[0][key]--;
                }
            }
        }
    }

    function gameOver(playerIdx) {
        if (!active) return;
        active = false;
        clearInterval(interval);
        freezeTimers.forEach(t => clearTimeout(t));
        if (players === 1 && singlePlayerMode) {
            currency += scores[0];
            saveCurrency();
            if (onGameOver) onGameOver();
        } else {
            alert(`Игрок ${playerIdx === 0 ? 2 : 1} победил!`);
            stop();
            if (onGameOver) onGameOver();
        }
    }

    function stop() {
        active = false;
        if (interval) clearInterval(interval);
        if (animationFrame) cancelAnimationFrame(animationFrame);
        freezeTimers.forEach(t => clearTimeout(t));
    }

    function startParticleAnimation() {
        if (!singlePlayerMode || !getUpgrade('particleEffect')) return;
        const animate = () => {
            if (!active) return;
            if (particles.length) {
                for (let i = 0; i < players; i++) {
                    const canvasId = players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${i + 1}`;
                    const canvas = document.getElementById(canvasId);
                    if (!canvas) continue;
                    const ctx = canvas.getContext('2d');
                    drawBoard(boards[i], pieces[i], holdPieces[i], canvasId, players === 1 ? 18 : 15, i);
                    for (let p of particles) {
                        ctx.globalAlpha = p.life;
                        ctx.fillStyle = p.color;
                        ctx.fillRect(p.x, p.y, 3, 3);
                    }
                    ctx.globalAlpha = 1;
                }
                particles = particles.filter(p => {
                    p.life -= 0.03;
                    p.x += p.vx;
                    p.y += p.vy;
                    return p.life > 0;
                });
            }
            animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    function init(playersCount) {
        players = playersCount;
        singlePlayerMode = (players === 1);
        initUpgradeManager();
        loadCurrency();

        boards = [];
        pieces = [];
        holdPieces = [];
        canHold = [];
        scores = [];
        clearingLines = [];
        freezeTimers = [];
        abilities = [];
        abilityCooldowns = [];
        comboCnt = [];
        comboMultiplier = [];
        shieldUsed = [];
        particles = [];

        if (singlePlayerMode) {
            const power = getUpgrade('abilityPower');
            abilities = [];
            if (power >= 1) abilities.push({ name: 'Молния', key: 'lightning', cooldown: Math.max(6, 12 - power * 2) });
            if (power >= 2) abilities.push({ name: 'Заморозка', key: 'freeze', cooldown: 16 - power });
            if (power >= 3) abilities.push({ name: 'Очистка', key: 'clear', cooldown: 22 - power * 3 });
        }

        for (let i = 0; i < players; i++) {
            boards.push(initBoard());
            pieces.push(randomPiece());
            holdPieces.push(null);
            canHold.push(true);
            scores.push(0);
            clearingLines.push(false);
            freezeTimers.push(null);
            abilityCooldowns.push({});
            abilities.forEach(a => { abilityCooldowns[i][a.key] = 0; });
            comboCnt.push(0);
            comboMultiplier.push(1);
            shieldUsed.push(false);
        }

        const blockSize = players === 1 ? 18 : 15;
        drawAll(blockSize);
        const baseInterval = 500;
        let intervalMs = baseInterval;
        if (singlePlayerMode) intervalMs = Math.min(800, baseInterval + getUpgrade('speed') * 50);
        if (interval) clearInterval(interval);
        interval = setInterval(() => tick(blockSize), intervalMs);
        active = true;
        if (singlePlayerMode && getUpgrade('particleEffect')) startParticleAnimation();
    }

    function showShop() {
        if (!singlePlayerMode) return;
        const self = this;
        const render = () => {
            const modalInner = document.getElementById('modalInner');
            if (!modalInner) return;
            modalInner.innerHTML = `
                <h3>🧱 Улучшения Тетриса</h3>
                <p>T-очки: <strong>${currency}</strong></p>
                <div class="snake-shop" id="tetrisShopUpgrades"></div>
                <button class="game-btn" id="playTetrisAgain">Играть снова</button>
                <button class="back-btn" id="backToTetrisMenu">В меню</button>
            `;
            const container = document.getElementById('tetrisShopUpgrades');
            const upgradesList = [
                { key: 'speed', name: 'Скорость', desc: 'Замедляет падение фигур', cost: 100, inc: 60, max: 5, val: getUpgrade('speed') },
                { key: 'lineBonus', name: 'Бонус за линии', desc: '+20% очков за линию', cost: 150, inc: 75, max: 5, val: getUpgrade('lineBonus') },
                { key: 'startRows', name: 'Начальные ряды', desc: '+2 заполненных строки внизу', cost: 50, inc: 25, max: 3, val: getUpgrade('startRows') },
                { key: 'specialChance', name: 'Спец. фигуры', desc: '+5% шанс спец. фигуры', cost: 200, inc: 100, max: 4, val: getUpgrade('specialChance') },
                { key: 'abilityPower', name: 'Сила способностей', desc: 'Ур.1-Молния, ур.2-Заморозка, ур.3-Очистка', cost: 250, inc: 150, max: 3, val: getUpgrade('abilityPower') },
                { key: 'pieceSet', name: 'Новые фигуры', desc: 'Открывает дополнительные формы', cost: 300, inc: 200, max: 2, val: getUpgrade('pieceSet') },
                { key: 'holdPiece', name: 'Удержание фигуры', desc: 'Возможность сохранить фигуру (клавиша H)', cost: 400, inc: 0, max: 1, val: getUpgrade('holdPiece') ? 1 : 0 },
                { key: 'ghostPiece', name: 'Призрачная фигура', desc: 'Показывает, куда упадёт фигура', cost: 350, inc: 0, max: 1, val: getUpgrade('ghostPiece') ? 1 : 0 },
                { key: 'shield', name: 'Щит', desc: 'Один раз спасает от проигрыша', cost: 500, inc: 0, max: 1, val: getUpgrade('shield') ? 1 : 0 },
                { key: 'autoHold', name: 'Авто-удержание', desc: 'Автоматически сохраняет фигуру при падении (если холд пуст)', cost: 600, inc: 0, max: 1, val: getUpgrade('autoHold') ? 1 : 0 },
                { key: 'comboMaster', name: 'Комбо-мастер', desc: 'Увеличивает множитель комбо на 0.1 за уровень', cost: 450, inc: 150, max: 3, val: getUpgrade('comboMaster') },
                { key: 'particleEffect', name: 'Эффект частиц', desc: 'Красочные взрывы при очистке линий', cost: 300, inc: 0, max: 1, val: getUpgrade('particleEffect') ? 1 : 0 }
            ];
            upgradesList.forEach(up => {
                const maxed = up.max && up.val >= up.max;
                const nextCost = up.inc ? Math.floor(up.cost + up.val * up.inc) : up.cost;
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
                        if (up.key === 'holdPiece' || up.key === 'ghostPiece' || up.key === 'shield' || up.key === 'autoHold' || up.key === 'particleEffect')
                            newVal = newVal > 0 ? 1 : 0;
                        setUpgrade(up.key, newVal);
                        saveCurrency();
                        render();
                    };
                }
                container.appendChild(item);
            });
            document.getElementById('playTetrisAgain').onclick = () => document.dispatchEvent(new CustomEvent('startTetrisSingle'));
            document.getElementById('backToTetrisMenu').onclick = () => document.dispatchEvent(new CustomEvent('openMiniGamesMenu'));
        };
        render();
    }

    function showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

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

    return {
        init,
        stop,
        showShop,
        exportState,
        importState,
        move,
        rotate,
        drop,
        hold,
        useAbility,
        get players() { return players; },
        get active() { return active; },
        set onGameOver(cb) { onGameOver = cb; }
    };
})();