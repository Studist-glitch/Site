window.tetris = {
    COLS: 10,
    ROWS: 20,
    // Базовые фигуры
    BASE_PIECES: [
        { shape: [[1,1,1,1]], color: '#c44eff', type: 'I' },
        { shape: [[1,1],[1,1]], color: '#ffcc00', type: 'O' },
        { shape: [[0,1,0],[1,1,1]], color: '#ff44cc', type: 'T' },
        { shape: [[1,0,0],[1,1,1]], color: '#44ccff', type: 'J' },
        { shape: [[0,0,1],[1,1,1]], color: '#ff8844', type: 'L' },
        { shape: [[0,1,1],[1,1,0]], color: '#44ff44', type: 'S' },
        { shape: [[1,1,0],[0,1,1]], color: '#ff4444', type: 'Z' }
    ],
    // Дополнительные наборы фигур (открываются улучшениями)
    EXTRA_SETS: [
        [
            { shape: [[0,1,0],[1,1,1],[0,1,0]], color: '#ff66ff', type: '+' },
            { shape: [[1,0,1],[1,1,1]], color: '#66ff66', type: 'U' }
        ],
        [
            { shape: [[1,1,0],[0,1,1],[0,1,0]], color: '#ffa500', type: 'P' },
            { shape: [[0,1,0],[1,1,0],[0,1,0]], color: '#00bfff', type: 'C' }
        ]
    ],
    SPECIAL_PIECES: [
        { shape: [[1,1,1]], color: '#ff00ff', type: 'bomb', desc: 'Бомба: уничтожает 3x3 при установке' },
        { shape: [[1,0,0],[1,0,0],[1,1,1]], color: '#00ffff', type: 'laser', desc: 'Лазер: очищает горизонтальную линию' }
    ],
    active: false,
    interval: null,
    boards: [],
    pieces: [],
    holdPieces: [],          // удерживаемая фигура (null или объект)
    canHold: [],             // флаг, можно ли использовать hold в этом ходе
    scores: [],
    players: 1,
    clearingLines: [],
    clearTimers: [],
    freezeTimers: [],
    abilities: [],
    abilityCooldowns: [],
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
            speed: 0,
            lineBonus: 0,
            startRows: 0,
            specialChance: 0,
            abilityPower: 0,
            pieceSet: 0,       // 0-2: разблокировано дополнительных наборов
            holdPiece: false,   // способность удержания
            ghostPiece: false   // показ призрака
        };
    },

    saveUpgrades: function() {
        try {
            localStorage.setItem('tetrisUpgrades', JSON.stringify(this.upgrades));
            localStorage.setItem('tetrisCurrency', this.currency);
        } catch(e) {}
    },

    getAllPieces: function() {
        let pieces = this.BASE_PIECES.slice();
        for (let i = 0; i < this.upgrades.pieceSet && i < this.EXTRA_SETS.length; i++) {
            pieces = pieces.concat(this.EXTRA_SETS[i]);
        }
        return pieces;
    },

    init: function(players) {
        this.loadUpgrades();
        this.players = players;
        this.boards = [];
        this.pieces = [];
        this.holdPieces = [];
        this.canHold = [];
        this.scores = [];
        this.clearingLines = [];
        this.clearTimers = [];
        this.freezeTimers = [];
        this.abilities = [];
        this.abilityCooldowns = [];

        // Определяем доступные способности в зависимости от уровня abilityPower
        if (this.upgrades.abilityPower >= 1) {
            this.abilities.push({ name: 'Молния', key: 'lightning', cooldown: Math.max(6, 12 - this.upgrades.abilityPower * 2) });
        }
        if (this.upgrades.abilityPower >= 2) {
            this.abilities.push({ name: 'Заморозка', key: 'freeze', cooldown: 16 - this.upgrades.abilityPower });
        }
        if (this.upgrades.abilityPower >= 3) {
            this.abilities.push({ name: 'Очистка', key: 'clear', cooldown: 22 - this.upgrades.abilityPower * 3 });
        }

        for (let i = 0; i < players; i++) {
            this.boards.push(this.initBoard());
            this.pieces.push(this.randomPiece());
            this.holdPieces.push(null);
            this.canHold.push(true);
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
        const interval = Math.max(120, baseInterval - this.upgrades.speed * 60);
        this.interval = setInterval(() => this.tick(blockSize), interval);
        this.active = true;
    },

    initBoard: function() {
        const board = Array(this.ROWS).fill().map(() => Array(this.COLS).fill(0));
        const rows = this.upgrades.startRows * 2; // каждый уровень даёт 2 заполненных строки
        for (let r = this.ROWS - rows; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                board[r][c] = '#555';
            }
        }
        return board;
    },

    randomPiece: function() {
        const allPieces = this.getAllPieces();
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
        const p = allPieces[Math.floor(Math.random() * allPieces.length)];
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
            this.drawBoard(this.boards[i], this.pieces[i], this.holdPieces[i], canvasId, blockSize, i);
        }
    },

    drawBoard: function(board, piece, holdPiece, canvasId, blockSize, playerIdx) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Сетка
        ctx.strokeStyle = 'rgba(196,78,255,0.1)';
        ctx.lineWidth = 0.5;
        for (let r = 0; r <= this.ROWS; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * blockSize); ctx.lineTo(this.COLS * blockSize, r * blockSize); ctx.stroke();
        }
        for (let c = 0; c <= this.COLS; c++) {
            ctx.beginPath(); ctx.moveTo(c * blockSize, 0); ctx.lineTo(c * blockSize, this.ROWS * blockSize); ctx.stroke();
        }

        // Блоки на доске
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (board[r][c]) this.drawBlock(ctx, c, r, board[r][c], blockSize, 1);
            }
        }

        // Призрак (если включён)
        if (this.upgrades.ghostPiece && piece && !this.clearingLines[playerIdx]) {
            const ghostY = this.getDropY(board, piece);
            if (ghostY !== piece.y) {
                piece.shape.forEach((row, dy) => {
                    row.forEach((val, dx) => {
                        if (val) {
                            const gx = piece.x + dx, gy = ghostY + dy;
                            ctx.fillStyle = 'rgba(255,255,255,0.15)';
                            ctx.fillRect(gx * blockSize, gy * blockSize, blockSize-1, blockSize-1);
                            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                            ctx.strokeRect(gx * blockSize, gy * blockSize, blockSize-1, blockSize-1);
                        }
                    });
                });
            }
        }

        // Текущая фигура
        if (piece) {
            piece.shape.forEach((row, dy) => {
                row.forEach((val, dx) => {
                    if (val) this.drawBlock(ctx, piece.x + dx, piece.y + dy, piece.color, blockSize, 1);
                });
            });
        }

        // Удерживаемая фигура (маленькая в углу)
        if (holdPiece) {
            const holdX = 2, holdY = 2, smallSize = blockSize * 0.8;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(holdX, holdY, 4*smallSize, 4*smallSize);
            holdPiece.shape.forEach((row, dy) => {
                row.forEach((val, dx) => {
                    if (val) {
                        ctx.fillStyle = holdPiece.color;
                        ctx.fillRect(holdX + dx*smallSize, holdY + dy*smallSize, smallSize-1, smallSize-1);
                    }
                });
            });
        }

        // Статус способностей
        if (playerIdx === 0 && this.players === 1) {
            const el = document.getElementById('abilityStatus');
            if (el) {
                let status = '';
                this.abilities.forEach(a => {
                    const cd = this.abilityCooldowns[0][a.key] || 0;
                    status += `${a.name}: ${cd > 0 ? cd + 'с' : 'OK'} `;
                });
                el.textContent = status;
            }
        }
    },

    drawBlock: function(ctx, x, y, color, size, alpha = 1) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x*size, y*size, size-1, size-1);
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.fillRect(x*size, y*size, size-1, size-1);
        ctx.shadowBlur = 0;
        const grad = ctx.createLinearGradient(x*size, y*size, (x+1)*size, (y+1)*size);
        grad.addColorStop(0, 'rgba(255,255,255,0.3)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = grad;
        ctx.fillRect(x*size, y*size, size-1, size-1);
        ctx.globalAlpha = 1;
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

    getDropY: function(board, piece) {
        let y = piece.y;
        while (!this.collide(board, piece.shape, piece.x, y+1)) y++;
        return y;
    },

    lockPiece: function(board, piece, playerIdx) {
        if (piece.type === 'bomb') {
            const cx = piece.x + Math.floor(piece.shape[0].length/2);
            const cy = piece.y + Math.floor(piece.shape.length/2);
            for (let r = cy-1; r <= cy+1; r++) {
                for (let c = cx-1; c <= cx+1; c++) {
                    if (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS) board[r][c] = 0;
                }
            }
        } else if (piece.type === 'laser') {
            const row = piece.y;
            if (row >= 0 && row < this.ROWS) {
                for (let c = 0; c < this.COLS; c++) board[row][c] = 0;
            }
        } else {
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
        let lines = [];
        for (let r = this.ROWS-1; r >= 0; r--) {
            if (board[r].every(cell => cell)) lines.push(r);
        }
        if (lines.length && !this.clearingLines[playerIdx]) {
            this.clearingLines[playerIdx] = true;
            const canvasId = this.players===1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx+1}`;
            let flashes = 0;
            const flashInterval = setInterval(() => {
                const cvs = document.getElementById(canvasId);
                if (!cvs) { clearInterval(flashInterval); this.finishClear(lines, board, playerIdx); return; }
                const ctx = cvs.getContext('2d');
                if (flashes%2===0) {
                    lines.forEach(r => {
                        ctx.fillStyle = '#fff';
                        ctx.shadowBlur = 12;
                        ctx.fillRect(0, r* (this.players===1?18:15), this.COLS*(this.players===1?18:15), (this.players===1?18:15));
                        ctx.shadowBlur = 0;
                    });
                } else {
                    this.drawBoard(board, this.pieces[playerIdx], this.holdPieces[playerIdx], canvasId, (this.players===1?18:15), playerIdx);
                }
                flashes++;
                if (flashes>=4) { clearInterval(flashInterval); this.finishClear(lines, board, playerIdx); }
            }, 80);
            this.clearTimers[playerIdx] = flashInterval;
        }
    },

    finishClear: function(lines, board, playerIdx) {
        lines.sort((a,b)=>b-a).forEach(r => {
            board.splice(r,1);
            board.unshift(Array(this.COLS).fill(0));
        });
        const base = lines.length * 100;
        const mult = 1 + this.upgrades.lineBonus * 0.2;
        this.scores[playerIdx] += Math.floor(base * mult);
        const el = document.getElementById(this.players===1?'tetrisScore':`tetrisScoreP${playerIdx+1}`);
        if (el) el.textContent = (this.players===1?'Счёт: ': `Игрок ${playerIdx+1}: `) + this.scores[playerIdx];
        this.clearingLines[playerIdx] = false;
    },

    hold: function(playerIdx, blockSize) {
        if (!this.active || this.clearingLines[playerIdx] || !this.upgrades.holdPiece) return;
        if (!this.canHold[playerIdx]) return;
        const current = this.pieces[playerIdx];
        const held = this.holdPieces[playerIdx];
        this.holdPieces[playerIdx] = {
            shape: current.shape.map(r => [...r]),
            color: current.color,
            type: current.type,
            x: Math.floor((this.COLS - current.shape[0].length)/2),
            y: 0
        };
        if (held) {
            this.pieces[playerIdx] = {
                shape: held.shape.map(r => [...r]),
                color: held.color,
                type: held.type,
                x: Math.floor((this.COLS - held.shape[0].length)/2),
                y: 0
            };
        } else {
            this.pieces[playerIdx] = this.randomPiece();
        }
        this.canHold[playerIdx] = false;
        const canvasId = this.players===1?'tetrisCanvas':`tetrisCanvasP${playerIdx+1}`;
        this.drawBoard(this.boards[playerIdx], this.pieces[playerIdx], this.holdPieces[playerIdx], canvasId, blockSize, playerIdx);
    },

    move: function(playerIdx, dx, dy, blockSize) {
        if (!this.active || this.clearingLines[playerIdx] || this.freezeTimers[playerIdx]) return;
        const board = this.boards[playerIdx];
        const piece = this.pieces[playerIdx];
        const canvasId = this.players===1?'tetrisCanvas':`tetrisCanvasP${playerIdx+1}`;
        if (!this.collide(board, piece.shape, piece.x+dx, piece.y+dy)) {
            piece.x += dx; piece.y += dy;
            this.drawBoard(board, piece, this.holdPieces[playerIdx], canvasId, blockSize, playerIdx);
        } else if (dy===1) {
            const newPiece = this.lockPiece(board, piece, playerIdx);
            this.canHold[playerIdx] = true; // после фиксации можно снова hold
            if (this.collide(board, newPiece.shape, newPiece.x, newPiece.y)) {
                this.gameOver(playerIdx); return;
            }
            this.pieces[playerIdx] = newPiece;
            this.drawBoard(board, newPiece, this.holdPieces[playerIdx], canvasId, blockSize, playerIdx);
        }
    },

    rotate: function(playerIdx, blockSize) {
        if (!this.active || this.clearingLines[playerIdx] || this.freezeTimers[playerIdx]) return;
        const piece = this.pieces[playerIdx];
        const rotated = piece.shape[0].map((_,i)=>piece.shape.map(r=>r[i]).reverse());
        if (!this.collide(this.boards[playerIdx], rotated, piece.x, piece.y)) {
            piece.shape = rotated;
            const canvasId = this.players===1?'tetrisCanvas':`tetrisCanvasP${playerIdx+1}`;
            this.drawBoard(this.boards[playerIdx], piece, this.holdPieces[playerIdx], canvasId, blockSize, playerIdx);
        }
    },

    drop: function(playerIdx, blockSize) {
        if (!this.active || this.clearingLines[playerIdx] || this.freezeTimers[playerIdx]) return;
        const board = this.boards[playerIdx];
        const piece = this.pieces[playerIdx];
        while (!this.collide(board, piece.shape, piece.x, piece.y+1)) piece.y++;
        const newPiece = this.lockPiece(board, piece, playerIdx);
        this.canHold[playerIdx] = true;
        if (this.collide(board, newPiece.shape, newPiece.x, newPiece.y)) {
            this.gameOver(playerIdx);
        } else {
            this.pieces[playerIdx] = newPiece;
            const canvasId = this.players===1?'tetrisCanvas':`tetrisCanvasP${playerIdx+1}`;
            this.drawBoard(board, newPiece, this.holdPieces[playerIdx], canvasId, blockSize, playerIdx);
        }
    },

    tick: function(blockSize) {
        if (!this.active) return;
        for (let i=0; i<this.players; i++) {
            if (!this.clearingLines[i] && !this.freezeTimers[i]) this.move(i,0,1,blockSize);
        }
        if (this.players===1) {
            this._cdTick = (this._cdTick||0)+1;
            const tickTime = Math.max(120, 500-this.upgrades.speed*60);
            if (this._cdTick >= Math.round(1000/tickTime)) {
                this._cdTick = 0;
                for (let key in this.abilityCooldowns[0]) {
                    if (this.abilityCooldowns[0][key] > 0) this.abilityCooldowns[0][key]--;
                }
            }
        }
    },

    useAbility: function(playerIdx, key, blockSize) {
        if (!this.active || this.clearingLines[playerIdx] || !this.abilities) return;
        const cd = this.abilityCooldowns[playerIdx][key];
        if (cd > 0) return;
        const ability = this.abilities.find(a=>a.key===key);
        if (!ability) return;
        this.abilityCooldowns[playerIdx][key] = ability.cooldown;
        switch(key) {
            case 'lightning':
                this.drop(playerIdx, blockSize);
                this.scores[playerIdx] += 20;
                break;
            case 'freeze':
                if (this.freezeTimers[playerIdx]) clearTimeout(this.freezeTimers[playerIdx]);
                this.freezeTimers[playerIdx] = setTimeout(()=>{this.freezeTimers[playerIdx]=null;}, 5000);
                break;
            case 'clear':
                const board = this.boards[playerIdx];
                for (let r=this.ROWS-1; r>=0; r--) {
                    if (board[r].some(cell=>cell)) {
                        board.splice(r,1);
                        board.unshift(Array(this.COLS).fill(0));
                        this.scores[playerIdx] += 50;
                        break;
                    }
                }
                break;
        }
        const canvasId = this.players===1?'tetrisCanvas':`tetrisCanvasP${playerIdx+1}`;
        this.drawBoard(this.boards[playerIdx], this.pieces[playerIdx], this.holdPieces[playerIdx], canvasId, blockSize, playerIdx);
    },

    gameOver: function(playerIdx) {
        if (!this.active) return;
        this.active = false;
        clearInterval(this.interval);
        this.clearTimers.forEach(t=>clearInterval(t));
        this.freezeTimers.forEach(t=>clearTimeout(t));
        if (this.players===1) {
            this.currency += this.scores[0];
            this.saveUpgrades();
            if (this.onGameOver) this.onGameOver();
        } else {
            alert(`Игрок ${playerIdx===0?2:1} победил!`);
            this.stop();
            if (this.onGameOver) this.onGameOver();
        }
    },

    stop: function() {
        this.active = false;
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
        this.clearTimers.forEach(t=>clearInterval(t));
        this.freezeTimers.forEach(t=>clearTimeout(t));
    },

    showShop: function() {
        const self = this;
        const render = () => {
            const modalInner = document.getElementById('modalInner');
            if (!modalInner) return;
            modalInner.innerHTML = `
                <h3>🧱 Улучшения Тетриса</h3>
                <p>T-очки: <strong>${self.currency}</strong></p>
                <div class="snake-shop" id="tetrisShopUpgrades"></div>
                <button class="game-btn" id="playTetrisAgain">Играть снова</button>
                <button class="back-btn" id="backToTetrisMenu">В меню</button>
            `;
            const container = document.getElementById('tetrisShopUpgrades');
            const upgrades = [
                { key: 'speed', name: 'Скорость', desc: 'Уменьшает интервал падения', cost: 100, inc: 60, max: 5, val: self.upgrades.speed },
                { key: 'lineBonus', name: 'Бонус за линии', desc: '+20% очков за линию', cost: 150, inc: 75, max: 5, val: self.upgrades.lineBonus },
                { key: 'startRows', name: 'Начальные ряды', desc: '+2 заполненных строки внизу', cost: 50, inc: 25, max: 3, val: self.upgrades.startRows },
                { key: 'specialChance', name: 'Спец. фигуры', desc: '+5% шанс спец. фигуры', cost: 200, inc: 100, max: 4, val: self.upgrades.specialChance },
                { key: 'abilityPower', name: 'Сила способностей', desc: 'Ур.1-Молния, ур.2-Заморозка, ур.3-Очистка', cost: 250, inc: 150, max: 3, val: self.upgrades.abilityPower },
                { key: 'pieceSet', name: 'Новые фигуры', desc: 'Открывает дополнительные формы', cost: 300, inc: 200, max: 2, val: self.upgrades.pieceSet },
                { key: 'holdPiece', name: 'Удержание фигуры', desc: 'Возможность сохранить фигуру (клавиша H)', cost: 400, inc: 0, max: 1, val: self.upgrades.holdPiece?1:0 },
                { key: 'ghostPiece', name: 'Призрачная фигура', desc: 'Показывает, куда упадёт фигура', cost: 350, inc: 0, max: 1, val: self.upgrades.ghostPiece?1:0 }
            ];
            upgrades.forEach(up => {
                const maxed = up.max && up.val >= up.max;
                const nextCost = up.inc ? Math.floor(up.cost + up.val * up.inc) : up.cost;
                const item = document.createElement('div');
                item.className = 'shop-upgrade';
                item.innerHTML = `
                    <div class="desc"><strong>${up.name}</strong><br>${up.desc}</div>
                    <span class="cost">${maxed ? 'МАКС' : nextCost + '💎'}</span>
                    <button class="buy-btn" ${(self.currency >= nextCost && !maxed) ? '' : 'disabled'}>Купить</button>
                `;
                if (!maxed && self.currency >= nextCost) {
                    item.querySelector('.buy-btn').onclick = () => {
                        self.currency -= nextCost;
                        self.upgrades[up.key] = up.val + 1;
                        self.saveUpgrades();
                        render();
                    };
                }
                container.appendChild(item);
            });
            document.getElementById('playTetrisAgain').onclick = () => {
                // showTetrisSingle() – вызов из main, но поскольку контекст другой, лучше сгенерировать событие
                document.dispatchEvent(new CustomEvent('startTetrisSingle'));
            };
            document.getElementById('backToTetrisMenu').onclick = () => {
                document.dispatchEvent(new CustomEvent('openMiniGamesMenu'));
            };
        };
        render();
    }
};