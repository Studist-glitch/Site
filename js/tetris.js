window.tetris = {
    COLS: 10,
    ROWS: 20,
    PIECES: [
        { shape: [[1,1,1,1]], color: '#c44eff', type: 'I' },
        { shape: [[1,1],[1,1]], color: '#ffcc00', type: 'O' },
        { shape: [[0,1,0],[1,1,1]], color: '#ff44cc', type: 'T' },
        { shape: [[1,0,0],[1,1,1]], color: '#44ccff', type: 'J' },
        { shape: [[0,0,1],[1,1,1]], color: '#ff8844', type: 'L' },
        { shape: [[0,1,1],[1,1,0]], color: '#44ff44', type: 'S' },
        { shape: [[1,1,0],[0,1,1]], color: '#ff4444', type: 'Z' }
    ],
    SPECIAL_PIECES: [
        { shape: [[1,1,1]], color: '#ff00ff', type: 'bomb', desc: 'Бомба: уничтожает 3x3 при установке' },
        { shape: [[1,0,0],[1,0,0],[1,1,1]], color: '#00ffff', type: 'laser', desc: 'Лазер: очищает горизонтальную линию' }
    ],
    active: false,
    interval: null,
    boards: [],
    pieces: [],
    scores: [],
    players: 1,
    clearingLines: [],
    clearTimers: [],
    // Способности
    abilities: {},
    abilityCooldowns: {},
    // Внутренние таймеры
    freezeTimers: [],
    // Прогрессия
    currency: 0,
    upgrades: null,

    loadUpgrades: function() {
        try {
            const saved = localStorage.getItem('tetrisUpgrades');
            this.upgrades = saved ? JSON.parse(saved) : this.defaultUpgrades();
        } catch(e) { this.upgrades = this.defaultUpgrades(); }
        try {
            this.currency = parseInt(localStorage.getItem('tetrisCurrency')) || 0;
        } catch(e) { this.currency = 0; }
    },

    defaultUpgrades: function() {
        return {
            speed: 0,          // уровень ускорения (интервал уменьшается)
            lineBonus: 0,      // множитель очков за линии
            startRows: 0,      // начальные заполненные строки (минус)
            specialChance: 0,  // шанс выпадения спец.фигуры
            abilityPower: 0    // улучшение способностей
        };
    },

    saveUpgrades: function() {
        try {
            localStorage.setItem('tetrisUpgrades', JSON.stringify(this.upgrades));
            localStorage.setItem('tetrisCurrency', this.currency);
        } catch(e) {}
    },

    init: function(players) {
        this.loadUpgrades();
        this.players = players;
        this.boards = [];
        this.pieces = [];
        this.scores = [];
        this.clearingLines = [];
        this.clearTimers = [];
        this.freezeTimers = [];
        this.abilities = [];
        this.abilityCooldowns = [];

        // Устанавливаем способности
        if (this.upgrades.abilityPower > 0) {
            // Даём способность "Молния" (мгновенное падение) с улучшенным кулдауном
            this.abilities[0] = { name: 'Молния', key: 'lightning', cooldown: Math.max(5, 10 - this.upgrades.abilityPower) };
        }
        if (this.upgrades.abilityPower >= 2) {
            this.abilities[1] = { name: 'Заморозка', key: 'freeze', cooldown: 15 - this.upgrades.abilityPower };
        }
        if (this.upgrades.abilityPower >= 3) {
            this.abilities[2] = { name: 'Очистка', key: 'clear', cooldown: 25 - this.upgrades.abilityPower * 2 };
        }

        for (let i = 0; i < players; i++) {
            this.boards.push(this.initBoard());
            this.pieces.push(this.randomPiece());
            this.scores.push(0);
            this.clearingLines.push(false);
            this.clearTimers.push(null);
            this.freezeTimers.push(null);
            this.abilityCooldowns.push({});
            this.abilities.forEach(a => {
                this.abilityCooldowns[i][a.key] = 0;
            });
        }

        const blockSize = players === 1 ? 18 : 15;
        this.drawAll(blockSize);
        const baseInterval = 500;
        const interval = Math.max(150, baseInterval - this.upgrades.speed * 50);
        this.interval = setInterval(() => this.tick(blockSize), interval);
        this.active = true;
    },

    initBoard: function() {
        const board = Array(this.ROWS).fill().map(() => Array(this.COLS).fill(0));
        // Добавляем начальные строки (препятствие)
        if (this.upgrades.startRows > 0) {
            for (let r = this.ROWS - this.upgrades.startRows; r < this.ROWS; r++) {
                for (let c = 0; c < this.COLS; c++) {
                    board[r][c] = '#444'; // серый блок
                }
            }
        }
        return board;
    },

    randomPiece: function() {
        // Шанс специальной фигуры
        const specialChance = this.upgrades.specialChance * 0.05;
        if (Math.random() < specialChance && this.SPECIAL_PIECES.length > 0) {
            const sp = this.SPECIAL_PIECES[Math.floor(Math.random() * this.SPECIAL_PIECES.length)];
            return {
                shape: sp.shape.map(r => [...r]),
                color: sp.color,
                type: sp.type,
                x: Math.floor((this.COLS - sp.shape[0].length) / 2),
                y: 0
            };
        }
        const p = this.PIECES[Math.floor(Math.random() * this.PIECES.length)];
        return {
            shape: p.shape.map(r => [...r]),
            color: p.color,
            type: p.type || 'normal',
            x: Math.floor((this.COLS - p.shape[0].length) / 2),
            y: 0
        };
    },

    drawAll: function(blockSize) {
        for (let i = 0; i < this.players; i++) {
            const canvasId = this.players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${i+1}`;
            this.drawBoard(this.boards[i], this.pieces[i], canvasId, blockSize, i);
        }
    },

    drawBoard: function(board, piece, canvasId, blockSize, playerIdx) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Сетка
        ctx.strokeStyle = 'rgba(196,78,255,0.1)';
        ctx.lineWidth = 0.5;
        for (let r = 0; r <= this.ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * blockSize);
            ctx.lineTo(this.COLS * blockSize, r * blockSize);
            ctx.stroke();
        }
        for (let c = 0; c <= this.COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * blockSize, 0);
            ctx.lineTo(c * blockSize, this.ROWS * blockSize);
            ctx.stroke();
        }

        // Блоки на доске
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (board[r][c]) {
                    this.drawBlock(ctx, c, r, board[r][c], blockSize);
                }
            }
        }

        // Текущая фигура
        if (piece) {
            piece.shape.forEach((row, dy) => {
                row.forEach((val, dx) => {
                    if (val) {
                        this.drawBlock(ctx, piece.x + dx, piece.y + dy, piece.color, blockSize);
                    }
                });
            });
        }

        // Отображение кулдаунов способностей (только для одного игрока)
        if (playerIdx !== undefined && this.players === 1) {
            const el = document.getElementById('abilityStatus');
            if (el) {
                let status = '';
                for (let a of this.abilities) {
                    const cd = this.abilityCooldowns[0][a.key] || 0;
                    status += `${a.name}: ${cd > 0 ? cd + 'с' : 'Готов'} `;
                }
                el.textContent = status;
            }
        }
    },

    drawBlock: function(ctx, x, y, color, size) {
        const px = x * size, py = y * size;
        ctx.fillStyle = color;
        ctx.fillRect(px, py, size - 1, size - 1);
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.fillRect(px, py, size - 1, size - 1);
        ctx.shadowBlur = 0;
        const gradient = ctx.createLinearGradient(px, py, px + size, py + size);
        gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = gradient;
        ctx.fillRect(px, py, size - 1, size - 1);
    },

    collide: function(board, shape, x, y) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[0].length; c++) {
                if (shape[r][c]) {
                    const bx = x + c, by = y + r;
                    if (bx < 0 || bx >= this.COLS || by >= this.ROWS) return true;
                    if (by >= 0 && board[by][bx]) return true;
                }
            }
        }
        return false;
    },

    lockPiece: function(board, piece, playerIdx) {
        // Обработка специальных фигур
        if (piece.type === 'bomb') {
            // Уничтожаем область 3x3 вокруг центра
            const cx = piece.x + Math.floor(piece.shape[0].length/2);
            const cy = piece.y + Math.floor(piece.shape.length/2);
            for (let r = cy-1; r <= cy+1; r++) {
                for (let c = cx-1; c <= cx+1; c++) {
                    if (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS) {
                        board[r][c] = 0;
                    }
                }
            }
        } else if (piece.type === 'laser') {
            // Очищаем горизонталь, где находится фигура
            const row = piece.y;
            if (row >= 0 && row < this.ROWS) {
                for (let c = 0; c < this.COLS; c++) board[row][c] = 0;
            }
        } else {
            // Обычная фиксация
            piece.shape.forEach((row, dy) => {
                row.forEach((val, dx) => {
                    if (val) {
                        const bx = piece.x + dx, by = piece.y + dy;
                        if (by >= 0 && by < this.ROWS && bx >= 0 && bx < this.COLS) board[by][bx] = piece.color;
                    }
                });
            });
        }
        this.clearLines(board, playerIdx);
        return this.randomPiece();
    },

    clearLines: function(board, playerIdx) {
        let linesToClear = [];
        for (let r = this.ROWS - 1; r >= 0; r--) {
            if (board[r].every(cell => cell)) {
                linesToClear.push(r);
            }
        }
        if (linesToClear.length > 0 && !this.clearingLines[playerIdx]) {
            this.clearingLines[playerIdx] = true;
            const canvasId = this.players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx+1}`;
            let flashes = 0;
            const maxFlashes = 4;
            const flashInterval = setInterval(() => {
                const canvas = document.getElementById(canvasId);
                if (!canvas) {
                    clearInterval(flashInterval);
                    this.finishClear(linesToClear, board, playerIdx);
                    return;
                }
                const ctx = canvas.getContext('2d');
                if (flashes % 2 === 0) {
                    linesToClear.forEach(r => {
                        ctx.fillStyle = '#ffffff';
                        ctx.shadowColor = '#ffffff';
                        ctx.shadowBlur = 15;
                        ctx.fillRect(0, r * (this.players === 1 ? 18 : 15), this.COLS * (this.players === 1 ? 18 : 15), (this.players === 1 ? 18 : 15));
                        ctx.shadowBlur = 0;
                    });
                } else {
                    this.drawBoard(board, this.pieces[playerIdx], canvasId, this.players === 1 ? 18 : 15, playerIdx);
                }
                flashes++;
                if (flashes >= maxFlashes) {
                    clearInterval(flashInterval);
                    this.finishClear(linesToClear, board, playerIdx);
                }
            }, 80);
            this.clearTimers[playerIdx] = flashInterval;
        }
    },

    finishClear: function(lines, board, playerIdx) {
        lines.sort((a,b) => b - a).forEach(r => {
            board.splice(r, 1);
            board.unshift(Array(this.COLS).fill(0));
        });
        // Бонусные очки с учётом улучшения
        const basePoints = lines.length * 100;
        const multiplier = 1 + this.upgrades.lineBonus * 0.2;
        this.scores[playerIdx] += Math.floor(basePoints * multiplier);
        const elId = this.players === 1 ? 'tetrisScore' : `tetrisScoreP${playerIdx+1}`;
        const el = document.getElementById(elId);
        if (el) el.textContent = (this.players === 1 ? 'Счёт: ' : `Игрок ${playerIdx+1}: `) + this.scores[playerIdx];

        const canvasId = this.players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx+1}`;
        this.drawBoard(board, this.pieces[playerIdx], canvasId, this.players === 1 ? 18 : 15, playerIdx);
        this.clearingLines[playerIdx] = false;
    },

    move: function(playerIdx, dx, dy, blockSize) {
        if (!this.active || this.clearingLines[playerIdx] || this.freezeTimers[playerIdx]) return;
        const board = this.boards[playerIdx];
        const piece = this.pieces[playerIdx];
        const canvasId = this.players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx+1}`;
        if (!this.collide(board, piece.shape, piece.x + dx, piece.y + dy)) {
            piece.x += dx;
            piece.y += dy;
            this.drawBoard(board, piece, canvasId, blockSize, playerIdx);
        } else if (dy === 1) {
            const newPiece = this.lockPiece(board, piece, playerIdx);
            if (this.collide(board, newPiece.shape, newPiece.x, newPiece.y)) {
                this.gameOver(playerIdx);
                return;
            }
            this.pieces[playerIdx] = newPiece;
            this.drawBoard(board, newPiece, canvasId, blockSize, playerIdx);
        }
    },

    rotate: function(playerIdx, blockSize) {
        if (!this.active || this.clearingLines[playerIdx] || this.freezeTimers[playerIdx]) return;
        const piece = this.pieces[playerIdx];
        const rotated = piece.shape[0].map((_, idx) => piece.shape.map(row => row[idx]).reverse());
        if (!this.collide(this.boards[playerIdx], rotated, piece.x, piece.y)) {
            piece.shape = rotated;
            const canvasId = this.players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx+1}`;
            this.drawBoard(this.boards[playerIdx], piece, canvasId, blockSize, playerIdx);
        }
    },

    drop: function(playerIdx, blockSize) {
        if (!this.active || this.clearingLines[playerIdx] || this.freezeTimers[playerIdx]) return;
        const board = this.boards[playerIdx];
        const piece = this.pieces[playerIdx];
        while (!this.collide(board, piece.shape, piece.x, piece.y + 1)) piece.y++;
        const newPiece = this.lockPiece(board, piece, playerIdx);
        if (this.collide(board, newPiece.shape, newPiece.x, newPiece.y)) {
            this.gameOver(playerIdx);
        } else {
            this.pieces[playerIdx] = newPiece;
            const canvasId = this.players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx+1}`;
            this.drawBoard(board, newPiece, canvasId, blockSize, playerIdx);
        }
    },

    tick: function(blockSize) {
        if (!this.active) return;
        for (let i = 0; i < this.players; i++) {
            if (!this.clearingLines[i] && !this.freezeTimers[i]) {
                this.move(i, 0, 1, blockSize);
            }
        }
        // Обновление кулдаунов способностей (раз в секунду)
        if (this.players === 1) {
            this._cdTick = (this._cdTick || 0) + 1;
            if (this._cdTick >= Math.round(1000 / (500 - this.upgrades.speed * 50))) {
                this._cdTick = 0;
                for (let key in this.abilityCooldowns[0]) {
                    if (this.abilityCooldowns[0][key] > 0) this.abilityCooldowns[0][key]--;
                }
            }
        }
    },

    // Использование способности
    useAbility: function(playerIdx, key, blockSize) {
        if (!this.active || this.clearingLines[playerIdx] || !this.abilities) return;
        const cd = this.abilityCooldowns[playerIdx][key];
        if (cd > 0) return;
        const ability = this.abilities.find(a => a.key === key);
        if (!ability) return;
        this.abilityCooldowns[playerIdx][key] = ability.cooldown;

        switch(key) {
            case 'lightning':
                // Мгновенный дроп с дополнительными очками
                this.drop(playerIdx, blockSize);
                this.scores[playerIdx] += 20;
                break;
            case 'freeze':
                // Заморозка на 5 секунд (останавливает падение)
                if (this.freezeTimers[playerIdx]) clearTimeout(this.freezeTimers[playerIdx]);
                this.freezeTimers[playerIdx] = setTimeout(() => { this.freezeTimers[playerIdx] = null; }, 5000);
                break;
            case 'clear':
                // Удаляет нижнюю заполненную строку (если есть)
                const board = this.boards[playerIdx];
                for (let r = this.ROWS - 1; r >= 0; r--) {
                    if (board[r].some(cell => cell)) {
                        board.splice(r, 1);
                        board.unshift(Array(this.COLS).fill(0));
                        this.scores[playerIdx] += 50;
                        break;
                    }
                }
                break;
        }
        const canvasId = this.players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx+1}`;
        this.drawBoard(this.boards[playerIdx], this.pieces[playerIdx], canvasId, blockSize, playerIdx);
    },

    gameOver: function(playerIdx) {
        if (!this.active) return;
        this.active = false;
        clearInterval(this.interval);
        for (let timer of this.clearTimers) {
            if (timer) clearInterval(timer);
        }
        for (let t of this.freezeTimers) {
            if (t) clearTimeout(t);
        }
        if (this.players === 1) {
            this.currency += this.scores[0];
            this.saveUpgrades();
            if (this.onGameOver) this.onGameOver();
        } else {
            const winner = playerIdx === 0 ? 2 : 1;
            alert(`Игрок ${winner} победил!`);
            this.stop();
            if (this.onGameOver) this.onGameOver();
        }
    },

    stop: function() {
        this.active = false;
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
        for (let timer of this.clearTimers) {
            if (timer) clearInterval(timer);
        }
        for (let t of this.freezeTimers) {
            if (t) clearTimeout(t);
        }
    }
};