window.snake = {
    SIZE: 10, W: 20, H: 20,
    active: false,
    interval: null,
    players: 1,
    snakes: [],
    foods: [],
    dirs: [],
    nextDirs: [],
    scores: [],
    init: function(players) {
        this.players = players;
        this.snakes = [];
        this.dirs = [];
        this.nextDirs = [];
        this.scores = [];
        this.foods = [];
        if (players === 1) {
            this.snakes.push([{x:10, y:10}]);
            this.dirs.push({x:1, y:0});
            this.nextDirs.push({x:1, y:0});
            this.scores.push(0);
        } else {
            this.snakes.push([{x:5, y:10}]);
            this.dirs.push({x:1, y:0});
            this.nextDirs.push({x:1, y:0});
            this.scores.push(0);
            this.snakes.push([{x:14, y:10}]);
            this.dirs.push({x:-1, y:0});
            this.nextDirs.push({x:-1, y:0});
            this.scores.push(0);
        }
        for (let i=0; i<3; i++) this.placeFood();
        this.active = true;
        this.draw();
        this.interval = setInterval(() => this.move(), 150);
    },
    placeFood: function() {
        let pos;
        do {
            pos = {x: Math.floor(Math.random()*this.W), y: Math.floor(Math.random()*this.H)};
        } while (this.snakes.some(s => s.some(seg => seg.x===pos.x && seg.y===pos.y)));
        this.foods.push(pos);
        if (this.foods.length > 4) this.foods.shift();
    },
    draw: function() {
        const canvas = document.getElementById('snakeCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,200,200);
        ctx.fillStyle = '#ff4444';
        this.foods.forEach(f => ctx.fillRect(f.x*this.SIZE, f.y*this.SIZE, this.SIZE-1, this.SIZE-1));
        const colors = ['#c44eff', '#44ff44'];
        this.snakes.forEach((snake, idx) => {
            snake.forEach((seg, i) => {
                ctx.fillStyle = i===0 ? '#fff' : colors[idx];
                ctx.fillRect(seg.x*this.SIZE, seg.y*this.SIZE, this.SIZE-1, this.SIZE-1);
            });
        });
        for (let i=0; i<this.players; i++) {
            const el = document.getElementById(this.players===1 ? 'snakeScore' : `snakeScoreP${i+1}`);
            if (el) el.textContent = (this.players===1 ? 'Счёт: ' : `Игрок ${i+1}: `) + this.scores[i];
        }
    },
    move: function() {
        if (!this.active) return;
        for (let i=0; i<this.players; i++) this.dirs[i] = this.nextDirs[i];
        for (let i=0; i<this.players; i++) {
            const head = {x: this.snakes[i][0].x + this.dirs[i].x, y: this.snakes[i][0].y + this.dirs[i].y};
            if (head.x<0 || head.x>=this.W || head.y<0 || head.y>=this.H) { this.kill(i); return; }
            if (this.snakes.some(s => s.some(seg => seg.x===head.x && seg.y===head.y))) { this.kill(i); return; }
            this.snakes[i].unshift(head);
            let ate = false;
            for (let f=0; f<this.foods.length; f++) {
                if (head.x===this.foods[f].x && head.y===this.foods[f].y) {
                    this.scores[i]++;
                    this.foods.splice(f,1);
                    this.placeFood();
                    ate = true;
                    break;
                }
            }
            if (!ate) this.snakes[i].pop();
        }
        this.draw();
    },
    kill: function(idx) {
        this.active = false;
        clearInterval(this.interval);
        const msg = this.players===1 ? `Game Over! Счёт: ${this.scores[0]}` : `Игрок ${idx===0?2:1} победил!`;
        alert(msg);
        this.stop();
    },
    stop: function() {
        this.active = false;
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
    }
};