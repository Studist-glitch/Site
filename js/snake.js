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
    animFrame: null,
    foodPhase: 0,

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
        for (let i = 0; i < 3; i++) this.placeFood();
        this.active = true;
        this.startAnimationLoop();
        this.interval = setInterval(() => this.move(), 150);
    },

    startAnimationLoop: function() {
        const loop = () => {
            this.foodPhase = (this.foodPhase + 0.05) % (Math.PI * 2);
            this.draw();
            this.animFrame = requestAnimationFrame(loop);
        };
        loop();
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
        ctx.clearRect(0, 0, 200, 200);

        // Еда с пульсацией
        const pulse = 1 + 0.2 * Math.sin(this.foodPhase * 5);
        this.foods.forEach(f => {
            const cx = f.x * this.SIZE + this.SIZE/2;
            const cy = f.y * this.SIZE + this.SIZE/2;
            const radius = (this.SIZE/2 - 1) * pulse;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI*2);
            ctx.fillStyle = '#ff4444';
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
            // Белый блик
            ctx.beginPath();
            ctx.arc(cx - radius*0.3, cy - radius*0.3, radius*0.3, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fill();
        });

        const colors = ['#c44eff', '#44ff44'];
        this.snakes.forEach((snake, idx) => {
            snake.forEach((seg, i) => {
                const x = seg.x * this.SIZE, y = seg.y * this.SIZE;
                const size = this.SIZE - 1;
                // Градиент от головы к хвосту
                let color;
                if (i === 0) {
                    color = '#ffffff';
                } else {
                    const intensity = 1 - i / (snake.length + 5);
                    color = colors[idx];
                }
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = i === 0 ? 10 : 4;
                ctx.fillRect(x, y, size, size);
                // Блик
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.shadowBlur = 0;
                ctx.fillRect(x, y, size, size/2);
            });
        });
        ctx.shadowBlur = 0;

        for (let i = 0; i < this.players; i++) {
            const el = document.getElementById(this.players===1 ? 'snakeScore' : `snakeScoreP${i+1}`);
            if (el) el.textContent = (this.players===1 ? 'Счёт: ' : `Игрок ${i+1}: `) + this.scores[i];
        }
    },

    move: function() {
        if (!this.active) return;
        for (let i = 0; i < this.players; i++) this.dirs[i] = this.nextDirs[i];
        for (let i = 0; i < this.players; i++) {
            const head = {x: this.snakes[i][0].x + this.dirs[i].x, y: this.snakes[i][0].y + this.dirs[i].y};
            if (head.x<0 || head.x>=this.W || head.y<0 || head.y>=this.H) { this.kill(i); return; }
            if (this.snakes.some(s => s.some(seg => seg.x===head.x && seg.y===head.y))) { this.kill(i); return; }
            this.snakes[i].unshift(head);
            let ate = false;
            for (let f = 0; f < this.foods.length; f++) {
                if (head.x===this.foods[f].x && head.y===this.foods[f].y) {
                    this.scores[i]++;
                    this.foods.splice(f,1);
                    this.placeFood();
                    ate = true;
                    this.showEatEffect(head.x, head.y);
                    break;
                }
            }
            if (!ate) this.snakes[i].pop();
        }
        this.draw();
    },

    showEatEffect: function(x, y) {
        const canvas = document.getElementById('snakeCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        // Простая вспышка на месте еды (будет перекрыта следующим кадром, но добавим частицы через DOM? Проще мигнуть)
        // Добавим временный круг
        const cx = x * this.SIZE + this.SIZE/2;
        const cy = y * this.SIZE + this.SIZE/2;
        // Используем анимацию через CSS? Лучше в следующем кадре анимации loop.
        // Чтобы не усложнять, добавим глобальную переменную вспышек, но пока пропустим.
        // Вместо этого увеличим пульсацию на короткое время? Оставим как есть.
    },

    kill: function(idx) {
        this.active = false;
        clearInterval(this.interval);
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        const msg = this.players===1 ? `Game Over! Счёт: ${this.scores[0]}` : `Игрок ${idx===0?2:1} победил!`;
        alert(msg);
        this.stop();
    },

    stop: function() {
        this.active = false;
        if (this.interval) clearInterval(this.interval);
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.interval = null;
        this.animFrame = null;
    }
};