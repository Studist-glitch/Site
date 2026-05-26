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

    // новые поля
    combos: [0],
    comboTimers: [null],
    dashCharges: [3],
    dashCooldowns: [0],
    dashTimers: [null],
    lastDirTap: [{dir: '', time: 0}],
    activePowerups: [[]],  // массив массивов для каждого игрока
    powerupTimers: [[]],
    upgrades: null,
    currency: 0,
    onGameOver: null,

    // загрузка/сохранение улучшений
    loadUpgrades: function() {
        try {
            const saved = localStorage.getItem('snakeUpgrades');
            if (saved) {
                this.upgrades = JSON.parse(saved);
            } else {
                this.upgrades = this.defaultUpgrades();
            }
        } catch(e) {
            this.upgrades = this.defaultUpgrades();
        }
        try {
            this.currency = parseInt(localStorage.getItem('snakeCurrency')) || 0;
        } catch(e) { this.currency = 0; }
    },

    defaultUpgrades: function() {
        return {
            length: 0,
            speed: 1.0,
            scoreMult: 1.0,
            magnet: false,
            shieldStart: false,
            dashCooldown: 0
        };
    },

    saveUpgrades: function() {
        try {
            localStorage.setItem('snakeUpgrades', JSON.stringify(this.upgrades));
            localStorage.setItem('snakeCurrency', this.currency);
        } catch(e) {}
    },

    init: function(players) {
        this.loadUpgrades();
        this.players = players;
        this.snakes = [];
        this.dirs = [];
        this.nextDirs = [];
        this.scores = [];
        this.foods = [];
        this.combos = [];
        this.comboTimers = [];
        this.dashCharges = [];
        this.dashCooldowns = [];
        this.dashTimers = [];
        this.lastDirTap = [];
        this.activePowerups = [];
        this.powerupTimers = [];

        const startLength = 3 + (this.upgrades.length || 0);
        if (players === 1) {
            const snake = [];
            for (let i = 0; i < startLength; i++) {
                snake.push({x: 10 - i, y: 10});
            }
            this.snakes.push(snake);
            this.dirs.push({x:1, y:0});
            this.nextDirs.push({x:1, y:0});
            this.scores.push(0);
            this.combos.push(0);
            this.comboTimers.push(null);
            this.dashCharges.push(this.upgrades.dashCooldown ? 3 : 3);
            this.dashCooldowns.push(this.upgrades.dashCooldown || 0);
            this.dashTimers.push(null);
            this.lastDirTap.push({dir:'', time:0});
            this.activePowerups.push([]);
            this.powerupTimers.push([]);
        } else {
            // игрок 1
            const snake1 = [];
            for (let i = 0; i < startLength; i++) snake1.push({x:5 - i, y:10});
            this.snakes.push(snake1);
            this.dirs.push({x:1, y:0});
            this.nextDirs.push({x:1, y:0});
            this.scores.push(0);
            this.combos.push(0);
            this.comboTimers.push(null);
            this.dashCharges.push(3);
            this.dashCooldowns.push(0);
            this.dashTimers.push(null);
            this.lastDirTap.push({dir:'', time:0});
            this.activePowerups.push([]);
            this.powerupTimers.push([]);
            // игрок 2
            const snake2 = [];
            for (let i = 0; i < startLength; i++) snake2.push({x:14 + i, y:10});
            this.snakes.push(snake2);
            this.dirs.push({x:-1, y:0});
            this.nextDirs.push({x:-1, y:0});
            this.scores.push(0);
            this.combos.push(0);
            this.comboTimers.push(null);
            this.dashCharges.push(3);
            this.dashCooldowns.push(0);
            this.dashTimers.push(null);
            this.lastDirTap.push({dir:'', time:0});
            this.activePowerups.push([]);
            this.powerupTimers.push([]);
        }

        for (let i = 0; i < 4; i++) this.placeFood();
        this.active = true;
        this.startAnimationLoop();
        const baseInterval = 150;
        const interval = Math.max(50, Math.floor(baseInterval / (this.upgrades.speed || 1)));
        this.interval = setInterval(() => this.move(), interval);
    },

    placeFood: function() {
        let pos, type;
        const rand = Math.random();
        if (rand < 0.6) type = 'normal';
        else if (rand < 0.75) type = 'gold';
        else if (rand < 0.85) type = 'speed';
        else if (rand < 0.92) type = 'shield';
        else if (rand < 0.97) type = 'freeze';
        else type = 'double';

        do {
            pos = {x: Math.floor(Math.random()*this.W), y: Math.floor(Math.random()*this.H)};
        } while (this.snakes.some(s => s.some(seg => seg.x===pos.x && seg.y===pos.y)) ||
                 this.foods.some(f => f.x===pos.x && f.y===pos.y));
        this.foods.push({x: pos.x, y: pos.y, type: type});
        if (this.foods.length > 6) this.foods.shift();
    },

    draw: function() {
        const canvas = document.getElementById('snakeCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 200, 200);

        const pulse = 1 + 0.2 * Math.sin(this.foodPhase * 5);
        this.foods.forEach(f => {
            const cx = f.x * this.SIZE + this.SIZE/2;
            const cy = f.y * this.SIZE + this.SIZE/2;
            const radius = (this.SIZE/2 - 1) * pulse;
            let color;
            switch(f.type) {
                case 'gold': color = '#ffcc00'; break;
                case 'speed': color = '#44ccff'; break;
                case 'shield': color = '#44ff44'; break;
                case 'freeze': color = '#88ffff'; break;
                case 'double': color = '#ff44cc'; break;
                default: color = '#ff4444';
            }
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI*2);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
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
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.shadowBlur = 0;
                ctx.fillRect(x, y, size, size/2);
            });
        });
        ctx.shadowBlur = 0;

        // Счёт
        for (let i = 0; i < this.players; i++) {
            const el = document.getElementById(this.players===1 ? 'snakeScore' : `snakeScoreP${i+1}`);
            if (el) el.textContent = (this.players===1 ? 'Счёт: ' : `Игрок ${i+1}: `) + this.scores[i];
        }

        // Комбо и рывок
        const comboEl = document.getElementById('comboIndicator');
        if (comboEl && this.players === 1) {
            comboEl.textContent = this.combos[0] > 1 ? `Комбо x${this.combos[0]}` : '';
        }
        const dashEl = document.getElementById('dashIndicator');
        if (dashEl && this.players === 1) {
            dashEl.textContent = `Рывки: ${this.dashCharges[0]}`;
        }
        const pwEl = document.getElementById('powerupsContainer');
        if (pwEl && this.players === 1) {
            pwEl.innerHTML = this.activePowerups[0].map(p => `<span class="powerup-badge" style="color:${p.color}">${p.name}</span>`).join('');
        }
    },

    applyMagnet: function(playerIdx) {
        if (!this.upgrades.magnet) return;
        const head = this.snakes[playerIdx][0];
        this.foods.forEach(f => {
            const dx = head.x - f.x;
            const dy = head.y - f.y;
            if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) {
                if (dx !== 0) f.x += (dx > 0 ? 1 : -1);
                if (dy !== 0) f.y += (dy > 0 ? 1 : -1);
                f.x = Math.max(0, Math.min(this.W-1, f.x));
                f.y = Math.max(0, Math.min(this.H-1, f.y));
            }
        });
    },

    handleDashInput: function(playerIdx, direction) {
        if (!this.active) return;
        const now = Date.now();
        const last = this.lastDirTap[playerIdx];
        const dirStr = typeof direction === 'string' ? direction : (direction.x+','+direction.y);
        if (last.dir === dirStr && (now - last.time) < 300 && this.dashCharges[playerIdx] > 0 && !this.dashTimers[playerIdx]) {
            this.performDash(playerIdx);
            last.time = 0;
        } else {
            last.dir = dirStr;
            last.time = now;
        }
    },

    performDash: function(playerIdx) {
        const snake = this.snakes[playerIdx];
        const dir = this.dirs[playerIdx];
        let head = snake[0];
        const newHead = {x: head.x + dir.x*2, y: head.y + dir.y*2};
        if (newHead.x<0 || newHead.x>=this.W || newHead.y<0 || newHead.y>=this.H) return;
        if (snake.some(seg => seg.x===newHead.x && seg.y===newHead.y)) return;
        // Проверка столкновения с другими змеями (если мультиплеер)
        if (this.snakes.some((s, i) => i !== playerIdx && s.some(seg => seg.x===newHead.x && seg.y===newHead.y))) return;
        snake.unshift(newHead);
        snake.pop();
        this.dashCharges[playerIdx]--;
        if (this.dashCooldowns[playerIdx] > 0 && !this.dashTimers[playerIdx]) {
            this.dashTimers[playerIdx] = setTimeout(() => {
                this.dashCharges[playerIdx] = Math.min(3, this.dashCharges[playerIdx]+1);
                this.dashTimers[playerIdx] = null;
            }, this.dashCooldowns[playerIdx] * 1000);
        }
        this.draw();
    },

    addPowerup: function(playerIdx, type) {
        const pwList = this.activePowerups[playerIdx];
        let name, color, duration;
        switch(type) {
            case 'speed': name = 'Скорость'; color = '#44ccff'; duration = 8; break;
            case 'shield': name = 'Щит'; color = '#44ff44'; duration = 15; break;
            case 'freeze': name = 'Замедление'; color = '#88ffff'; duration = 5; break;
            case 'double': name = 'x2 Очки'; color = '#ff44cc'; duration = 10; break;
            default: return;
        }
        // Если уже активен, продлеваем
        const existing = pwList.find(p => p.type === type);
        if (existing) {
            existing.duration = duration;
            return;
        }
        pwList.push({type, name, color, duration});
        this.powerupTimers[playerIdx].push(setInterval(() => {
            const idx = pwList.findIndex(p => p.type === type);
            if (idx !== -1) {
                pwList[idx].duration--;
                if (pwList[idx].duration <= 0) {
                    pwList.splice(idx, 1);
                }
            }
        }, 1000));
    },

    move: function() {
        if (!this.active) return;
        for (let i = 0; i < this.players; i++) this.dirs[i] = this.nextDirs[i];
        this.applyMagnet(0);
        if (this.players === 2) this.applyMagnet(1);

        for (let i = 0; i < this.players; i++) {
            const head = {x: this.snakes[i][0].x + this.dirs[i].x, y: this.snakes[i][0].y + this.dirs[i].y};
            const hasShield = this.activePowerups[i].some(p => p.type === 'shield');
            if (head.x<0 || head.x>=this.W || head.y<0 || head.y>=this.H) {
                if (hasShield) {
                    const shieldIdx = this.activePowerups[i].findIndex(p => p.type === 'shield');
                    if (shieldIdx !== -1) this.activePowerups[i].splice(shieldIdx, 1);
                } else {
                    this.kill(i); return;
                }
            }
            if (this.snakes.some(s => s.some(seg => seg.x===head.x && seg.y===head.y))) {
                if (hasShield) {
                    const shieldIdx = this.activePowerups[i].findIndex(p => p.type === 'shield');
                    if (shieldIdx !== -1) this.activePowerups[i].splice(shieldIdx, 1);
                } else {
                    this.kill(i); return;
                }
            }
            this.snakes[i].unshift(head);
            let ate = false;
            for (let f = 0; f < this.foods.length; f++) {
                const food = this.foods[f];
                if (head.x === food.x && head.y === food.y) {
                    let points = 1;
                    if (food.type === 'gold') points = 5;
                    if (this.activePowerups[i].some(p => p.type === 'double')) points *= 2;
                    points = Math.floor(points * this.upgrades.scoreMult);
                    this.scores[i] += points;
                    // Комбо
                    if (this.comboTimers[i]) clearTimeout(this.comboTimers[i]);
                    this.combos[i]++;
                    this.comboTimers[i] = setTimeout(() => { this.combos[i] = 0; }, 2000);
                    const comboBonus = this.combos[i] > 1 ? Math.floor(points * (this.combos[i]-1) * 0.1) : 0;
                    this.scores[i] += comboBonus;
                    // Эффекты еды
                    if (food.type === 'speed') this.addPowerup(i, 'speed');
                    else if (food.type === 'shield') this.addPowerup(i, 'shield');
                    else if (food.type === 'freeze') this.addPowerup(i, 'freeze');
                    else if (food.type === 'double') this.addPowerup(i, 'double');
                    this.foods.splice(f, 1);
                    this.placeFood();
                    ate = true;
                    this.showEatEffect(head.x, head.y, food.type);
                    break;
                }
            }
            if (!ate) this.snakes[i].pop();
        }
        this.draw();
    },

    showEatEffect: function(x, y, type) {
        const canvas = document.getElementById('snakeCanvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const px = rect.left + x * this.SIZE + this.SIZE/2;
        const py = rect.top + y * this.SIZE + this.SIZE/2;
        const colors = { normal: '#ff4444', gold: '#ffcc00', speed: '#44ccff', shield: '#44ff44', freeze: '#88ffff', double: '#ff44cc' };
        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.className = 'snake-eat-particle';
            particle.style.left = px + 'px';
            particle.style.top = py + 'px';
            particle.style.background = colors[type] || '#ff4444';
            particle.style.boxShadow = `0 0 6px ${colors[type]}`;
            const angle = Math.random() * Math.PI * 2;
            const dist = 8 + Math.random() * 8;
            particle.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
            particle.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 400);
        }
    },

    kill: function(idx) {
        if (!this.active) return;
        this.active = false;
        clearInterval(this.interval);
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        // очистка таймеров
        this.comboTimers.forEach(t => clearTimeout(t));
        this.dashTimers.forEach(t => clearTimeout(t));
        this.powerupTimers.forEach(arr => arr.forEach(t => clearInterval(t)));

        if (this.players === 1) {
            this.currency += this.scores[0];
            this.saveUpgrades();
            if (this.onGameOver) this.onGameOver();
        } else {
            const winner = idx === 0 ? 2 : 1;
            alert(`Игрок ${winner} победил!`);
            this.stop();
            if (this.onGameOver) this.onGameOver();
        }
    },

    stop: function() {
        this.active = false;
        if (this.interval) clearInterval(this.interval);
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.interval = null;
        this.animFrame = null;
    },

    startAnimationLoop: function() {
        const loop = () => {
            this.foodPhase = (this.foodPhase + 0.05) % (Math.PI * 2);
            this.draw();
            this.animFrame = requestAnimationFrame(loop);
        };
        loop();
    },

    showShop: function() {
        const modalInner = document.getElementById('modalInner');
        if (!modalInner) return;
        this.loadUpgrades();
        const self = this;
        const renderShop = () => {
            modalInner.innerHTML = `
                <h3>🐍 Магазин улучшений</h3>
                <p>Очки: <strong>${self.currency}</strong></p>
                <div class="snake-shop" id="shopUpgrades"></div>
                <button class="game-btn" id="playAgainBtn">Играть снова</button>
                <button class="back-btn" id="backToMenuBtn">В меню</button>
            `;
            const container = document.getElementById('shopUpgrades');
            const upgrades = [
                { key: 'length', name: 'Длина змеи +1', desc: 'Начальная длина увеличена на 1', cost: 50, max: 5 },
                { key: 'speed', name: 'Скорость +10%', desc: 'Змея быстрее (интервал короче)', cost: 80, max: 5 },
                { key: 'scoreMult', name: 'Множитель очков +10%', desc: 'Все очки увеличены', cost: 100, max: 10 },
                { key: 'magnet', name: 'Магнит', desc: 'Еда притягивается на расстоянии 3 клеток', cost: 200, max: 1 },
                { key: 'shieldStart', name: 'Щит в начале', desc: 'Начинаете игру с щитом', cost: 150, max: 1 },
                { key: 'dashCooldown', name: 'Ускорение рывка', desc: 'Восстановление рывка на 1с быстрее', cost: 120, max: 3 }
            ];
            upgrades.forEach(up => {
                const current = self.upgrades[up.key] || 0;
                const maxed = up.max && current >= up.max;
                const nextCost = up.cost + current * up.cost * 0.5;
                const item = document.createElement('div');
                item.className = 'shop-upgrade';
                item.innerHTML = `
                    <div class="desc">
                        <strong>${up.name}</strong><br>${up.desc}
                    </div>
                    <span class="cost">${maxed ? 'МАКС' : Math.floor(nextCost) + '💎'}</span>
                    <button class="buy-btn" ${(self.currency >= nextCost && !maxed) ? '' : 'disabled'}>Купить</button>
                `;
                if (!maxed && self.currency >= nextCost) {
                    item.querySelector('.buy-btn').onclick = () => {
                        self.currency -= Math.floor(nextCost);
                        self.upgrades[up.key] = current + 1;
                        self.saveUpgrades();
                        renderShop();
                    };
                }
                container.appendChild(item);
            });
            document.getElementById('playAgainBtn').onclick = () => {
                const mode = document.querySelector('input[name="snakeMode"]:checked')?.value || 'single';
                if (mode === 'single') showSnakeSingle();
                else showSnakeMulti();
            };
            document.getElementById('backToMenuBtn').onclick = showSelection;
        };
        renderShop();
    }
};