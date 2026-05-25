window.tetris = {
    COLS: 10,
    ROWS: 20,
    PIECES: [
        { shape: [[1,1,1,1]], color: '#c44eff' },
        { shape: [[1,1],[1,1]], color: '#ffcc00' },
        { shape: [[0,1,0],[1,1,1]], color: '#ff44cc' },
        { shape: [[1,0,0],[1,1,1]], color: '#44ccff' },
        { shape: [[0,0,1],[1,1,1]], color: '#ff8844' },
        { shape: [[0,1,1],[1,1,0]], color: '#44ff44' },
        { shape: [[1,1,0],[0,1,1]], color: '#ff4444' }
    ],
    active: false,
    interval: null,
    boards: [],
    pieces: [],
    scores: [],
    players: 1,
    init: function(players) {
        this.players = players;
        this.boards = [this.initBoard()];
        this.pieces = [this.randomPiece()];
        this.scores = [0];
        this.active = true;
        if (players === 2) {
            this.boards.push(this.initBoard());
            this.pieces.push(this.randomPiece());
            this.scores.push(0);
        }
        const blockSize = players === 1 ? 18 : 15;
        this.drawAll(blockSize);
        this.interval = setInterval(() => this.tick(blockSize), 500);
    },
    initBoard: function() {
        return Array(this.ROWS).fill().map(() => Array(this.COLS).fill(0));
    },
    randomPiece: function() {
        const p = this.PIECES[Math.floor(Math.random() * this.PIECES.length)];
        return { shape: p.shape.map(r => [...r]), color: p.color, x: Math.floor((this.COLS - p.shape[0].length) / 2), y: 0 };
    },
    drawAll: function(blockSize) {
        for (let i = 0; i < this.players; i++) {
            const canvasId = this.players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${i+1}`;
            this.drawBoard(this.boards[i], this.pieces[i], canvasId, blockSize);
        }
    },
    drawBoard: function(board, piece, canvasId, blockSize) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,canvas.width,canvas.height);
        for (let r=0; r<this.ROWS; r++) {
            for (let c=0; c<this.COLS; c++) {
                if (board[r][c]) {
                    ctx.fillStyle = board[r][c];
                    ctx.fillRect(c*blockSize, r*blockSize, blockSize-1, blockSize-1);
                }
            }
        }
        if (piece) {
            piece.shape.forEach((row,dy) => {
                row.forEach((val,dx) => {
                    if (val) {
                        ctx.fillStyle = piece.color;
                        ctx.fillRect((piece.x+dx)*blockSize, (piece.y+dy)*blockSize, blockSize-1, blockSize-1);
                    }
                });
            });
        }
    },
    collide: function(board, shape, x, y) {
        for (let r=0; r<shape.length; r++) {
            for (let c=0; c<shape[0].length; c++) {
                if (shape[r][c]) {
                    const bx=x+c, by=y+r;
                    if (bx<0 || bx>=this.COLS || by>=this.ROWS) return true;
                    if (by>=0 && board[by][bx]) return true;
                }
            }
        }
        return false;
    },
    lockPiece: function(board, piece, playerIdx) {
        piece.shape.forEach((row,dy) => {
            row.forEach((val,dx) => {
                if (val) {
                    const bx=piece.x+dx, by=piece.y+dy;
                    if (by>=0 && by<this.ROWS && bx>=0 && bx<this.COLS) board[by][bx] = piece.color;
                }
            });
        });
        this.clearLines(board, playerIdx);
        return this.randomPiece();
    },
    clearLines: function(board, playerIdx) {
        let lines = 0;
        for (let r=this.ROWS-1; r>=0; r--) {
            if (board[r].every(cell => cell)) {
                board.splice(r,1);
                board.unshift(Array(this.COLS).fill(0));
                r++;
                lines++;
            }
        }
        if (lines) {
            this.scores[playerIdx] += lines * 100;
            const elId = this.players === 1 ? 'tetrisScore' : `tetrisScoreP${playerIdx+1}`;
            const el = document.getElementById(elId);
            if (el) el.textContent = (this.players === 1 ? 'Счёт: ' : `Игрок ${playerIdx+1}: `) + this.scores[playerIdx];
        }
    },
    move: function(playerIdx, dx, dy, blockSize) {
        if (!this.active) return;
        const board = this.boards[playerIdx];
        const piece = this.pieces[playerIdx];
        const canvasId = this.players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx+1}`;
        if (!this.collide(board, piece.shape, piece.x+dx, piece.y+dy)) {
            piece.x += dx;
            piece.y += dy;
            this.drawBoard(board, piece, canvasId, blockSize);
        } else if (dy === 1) {
            const newPiece = this.lockPiece(board, piece, playerIdx);
            if (this.collide(board, newPiece.shape, newPiece.x, newPiece.y)) {
                this.gameOver(playerIdx);
                return;
            }
            this.pieces[playerIdx] = newPiece;
            this.drawBoard(board, newPiece, canvasId, blockSize);
        }
    },
    rotate: function(playerIdx, blockSize) {
        if (!this.active) return;
        const piece = this.pieces[playerIdx];
        const rotated = piece.shape[0].map((_,idx) => piece.shape.map(row => row[idx]).reverse());
        if (!this.collide(this.boards[playerIdx], rotated, piece.x, piece.y)) {
            piece.shape = rotated;
            const canvasId = this.players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx+1}`;
            this.drawBoard(this.boards[playerIdx], piece, canvasId, blockSize);
        }
    },
    drop: function(playerIdx, blockSize) {
        if (!this.active) return;
        const board = this.boards[playerIdx];
        const piece = this.pieces[playerIdx];
        while (!this.collide(board, piece.shape, piece.x, piece.y+1)) piece.y++;
        const newPiece = this.lockPiece(board, piece, playerIdx);
        if (this.collide(board, newPiece.shape, newPiece.x, newPiece.y)) {
            this.gameOver(playerIdx);
        } else {
            this.pieces[playerIdx] = newPiece;
            const canvasId = this.players === 1 ? 'tetrisCanvas' : `tetrisCanvasP${playerIdx+1}`;
            this.drawBoard(board, newPiece, canvasId, blockSize);
        }
    },
    tick: function(blockSize) {
        if (!this.active) return;
        for (let i=0; i<this.players; i++) this.move(i, 0, 1, blockSize);
    },
    gameOver: function(playerIdx) {
        if (!this.active) return;
        this.active = false;
        clearInterval(this.interval);
        const msg = this.players === 1 ? `Game Over! Счёт: ${this.scores[0]}` : `Игрок ${playerIdx===0?2:1} победил!`;
        alert(msg);
        this.stop();
    },
    stop: function() {
        this.active = false;
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
    }
};