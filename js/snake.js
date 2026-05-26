window.snake = {
    SIZE: 10, W: 20, H: 20,
    active: false,
    interval: null,
    players: 1,
    snakes: [],           // [player1, player2 (опционально)]
    foods: [],
    dirs: [],
    nextDirs: [],
    scores: [],
    combos: [],
    comboTimers: [],
    dashCharges: [],
    dashCooldowns: [],
    dashTimers: [],
    lastDirTap: [],
    activePowerups: [[]],
    powerupTimers: [[]],
    animFrame: null,
    foodPhase: 0,

    // Бот
    bot: null,           // { segments: [], dir: {x,y}, nextDir: {x,y}, color, alive }
    botMoveTimer: null,
    botSpawnTimer: null,
    botSpawnInterval: 35000, // первое появление через 35 сек
    botRespawnDelay: 20000,

    // Улучшения
    currency: 0,
    upgrades: null,

    loadUpgrades: function() {
        try {
            const saved = localStorage.getItem('snakeUpgrades');
            this.upgrades = saved ? JSON.parse(saved) : this.defaultUpgrades();
        } catch(e) { this.upgrades = this.defaultUpgrades(); }
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
            dashCooldown: 0,
            extraPowerups: 0,
            skinLevel: 0
        };
    },

    saveUpgrades: function() {
        try {
            localStorage.setItem('snakeUpgrades', JSON.stringify(this.upgrades));
            localStorage.setItem('snakeCurrency', this.currency);
        } catch(e) {}
    },

    getSkinColor: function(idx) {
        const skins = ['#c44eff', '#44ff44', '#ffcc00', '#ff44cc', '#44ccff'];
        return skins[Math.min(this.upgrades.skinLevel, skins.length-1)];
    },

    init: function(players) {
        this.loadUpgrades();
        this.players = players;
        this.snakes = [];
        this.dirs = [];
        this.nextDirs = [];
        this.scores = [];
        this.foods = [];
        this.combos = [0];
        this.comboTimers = [null];
        this.dashCharges = [3];
        this.dashCooldowns = [0];
        this.dashTimers = [null];
        this.lastDirTap = [{dir:'', time:0}];
        this.activePowerups = [[]];
        this.powerupTimers = [[]];

        const startLen = 3 + (this.upgrades.length || 0);
        for (let i = 0; i < players; i++) {
            const snake = [];
            const startX = i === 0 ? 10 : 5;
            const dirX = i === 0 ? 1 : -1;
            for (let j = 0; j < startLen; j++) {
                snake.push({x: startX - j * dirX, y: 10});
            }
            this.snakes.push(snake);
            this.dirs.push({x: dirX, y: 0});
            this.nextDirs.push({x: dirX, y: 0});
            this.scores.push(0);
            if (i === 0) {
                this.combos = [0];
                this.comboTimers = [null];
                this.dashCharges = [this.upgrades.dashCooldown ? 3 : 3];
                this.dashCooldowns = [this.upgrades.dashCooldown || 0];
                this.dashTimers = [null];
                this.lastDirTap = [{dir:'', time:0}];
                this.activePowerups = [[]];
                this.powerupTimers = [[]];
            } else {
                this.combos.push(0);
                this.comboTimers.push(null);
                this.dashCharges.push(3);
                this.dashCooldowns.push(0);
                this.dashTimers.push(null);
                this.lastDirTap.push({dir:'', time:0});
                this.activePowerups.push([]);
                this.powerupTimers.push([]);
            }
            if (this.upgrades.shieldStart) {
                this.addPowerup(i, 'shield');
            }
        }

        for (let i = 0; i < 4; i++) this.placeFood();
        this.active = true;

        // Бот: только для одиночной игры
        if (players === 1) {
            this.bot = null;
            this.scheduleBotSpawn();
        } else {
            this.bot = null;
        }

        this.startAnimationLoop();
        const baseInterval = 150;
        const interval = Math.max(50, Math.floor(baseInterval / (this.upgrades.speed || 1)));
        this.interval = setInterval(() => this.move(), interval);
    },

    scheduleBotSpawn: function() {
        if (this.botSpawnTimer) clearTimeout(this.botSpawnTimer);
        this.botSpawnTimer = setTimeout(() => {
            if (this.active && !this.bot) this.spawnBot();
        }, this.botSpawnInterval);
    },

    spawnBot: function() {
        const length = 4 + Math.floor(this.scores[0] / 30);
        const segments = [];
        // стартовая позиция в свободном месте
        let startX, startY;
        do {
            startX = 3 + Math.floor(Math.random() * (this.W - 6));
            startY = 3 + Math.floor(Math.random() * (this.H - 6));
        } while (this.isOccupied(startX, startY));
        // строим горизонтально
        for (let i = 0; i < length; i++) {
            segments.push({x: startX - i, y: startY});
        }
        this.bot = {
            segments: segments,
            dir: {x: 1, y: 0},
            color: '#ff6644',
            alive: true
        };
        // таймер для случайной смены направления
        this.botMoveTimer = setInterval(() => this.botChangeDirection(), 500);
        document.getElementById('eventsContainer')?.insertAdjacentHTML('beforeend', '<div class="event-message">🦎 Враждебная змея появилась!</div>');
    },

    botChangeDirection: function() {
        if (!this.bot || !this.bot.alive) return;
        const possible = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        // исключаем противоположное и ведущие в препятствие
        const safeDirs = possible.filter(d => {
            if (d.x === -this.bot.dir.x && d.y === -this.bot.dir.y) return false;
            const head = this.bot.segments[0];
            const nx = head.x + d.x, ny = head.y + d.y;
            if (nx<0||nx>=this.W||ny<0||ny>=this.H) return false;
            // не врезаться в собственное тело
            if (this.bot.segments.some(s => s.x===nx && s.y===ny)) return false;
            return true;
        });
        if (safeDirs.length > 0) {
            this.bot.dir = safeDirs[Math.floor(Math.random() * safeDirs.length)];
        }
    },

    isOccupied: function(x, y) {
        if (this.snakes.some(s => s.some(seg => seg.x===x && seg.y===y))) return true;
        if (this.bot && this.bot.segments.some(seg => seg.x===x && seg.y===y)) return true;
        return false;
    },

    placeFood: function() {
        let pos, type;
        const rand = Math.random();
        const hasExtra = this.upgrades.extraPowerups;
        if (rand < 0.55) type = 'normal';
        else if (rand < 0.7) type = 'gold';
        else if (rand < 0.8) type = 'speed';
        else if (rand < 0.88) type = 'shield';
        else if (rand < 0.94) type = 'freeze';
        else if (rand < 0.97) type = 'double';
        else type = (hasExtra >= 1 ? 'shrink' : 'double'); // доп. тип
        if (hasExtra >= 2 && Math.random() < 0.3) type = 'invincible';
        if (hasExtra >= 3 && Math.random() < 0.2) type = 'bonus';

        do {
            pos = {x: Math.floor(Math.random()*this.W), y: Math.floor(Math.random()*this.H)};
        } while (this.isOccupied(pos.x, pos.y));
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
            const colorMap = {
                normal: '#ff4444', gold: '#ffcc00', speed: '#44ccff', shield: '#44ff44',
                freeze: '#88ffff', double: '#ff44cc', shrink: '#ff8800', invincible: '#ff00ff', bonus: '#ffffff'
            };
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI*2);
            ctx.fillStyle = colorMap[f.type] || '#ff4444';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        const playerColors = [this.getSkinColor(0), '#44ff44'];
        this.snakes.forEach((snake, idx) => {
            snake.forEach((seg, i) => {
                const x = seg.x*this.SIZE, y = seg.y*this.SIZE;
                const size = this.SIZE-1;
                ctx.fillStyle = i===0 ? '#fff' : playerColors[idx];
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = i===0 ? 10 : 4;
                ctx.fillRect(x, y, size, size);
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.shadowBlur = 0;
                ctx.fillRect(x, y, size, size/2);
            });
        });

        // Бот
        if (this.bot && this.bot.alive) {
            this.bot.segments.forEach((seg, i) => {
                const x = seg.x*this.SIZE, y = seg.y*this.SIZE;
                ctx.fillStyle = i===0 ? '#ffaa00' : this.bot.color;
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 5;
                ctx.fillRect(x, y, this.SIZE-1, this.SIZE-1);
            });
        }

        ctx.shadowBlur = 0;
        // UI
        const scoreEl = document.getElementById('snakeScore');
        if (scoreEl) scoreEl.textContent = 'Счёт: ' + this.scores[0];
        const comboEl = document.getElementById('comboIndicator');
        if (comboEl) comboEl.textContent = this.combos[0] > 1 ? `Комбо x${this.combos[0]}` : '';
        const dashEl = document.getElementById('dashIndicator');
        if (dashEl) dashEl.textContent = `Рывки: ${this.dashCharges[0]}`;
        const pwEl = document.getElementById('powerupsContainer');
        if (pwEl) pwEl.innerHTML = this.activePowerups[0].map(p => `<span class="powerup-badge" style="color:${p.color}">${p.name}</span>`).join('');
    },

    applyMagnet: function(playerIdx) {
        if (!this.upgrades.magnet) return;
        const head = this.snakes[playerIdx][0];
        this.foods.forEach(f => {
            const dx = head.x - f.x, dy = head.y - f.y;
            if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) {
                if (dx !== 0) f.x += dx > 0 ? 1 : -1;
                if (dy !== 0) f.y += dy > 0 ? 1 : -1;
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
        const head = snake[0];
        const newHead = {x: head.x + dir.x*2, y: head.y + dir.y*2};
        if (newHead.x<0||newHead.x>=this.W||newHead.y<0||newHead.y>=this.H) return;
        if (snake.some(s=>s.x===newHead.x&&s.y===newHead.y)) return;
        if (this.bot && this.bot.segments.some(s=>s.x===newHead.x&&s.y===newHead.y)) return;
        snake.unshift(newHead);
        snake.pop();
        this.dashCharges[playerIdx]--;
        if (!this.dashTimers[playerIdx]) {
            this.dashTimers[playerIdx] = setTimeout(() => {
                this.dashCharges[playerIdx] = Math.min(3, this.dashCharges[playerIdx]+1);
                this.dashTimers[playerIdx] = null;
            }, (this.dashCooldowns[playerIdx] || 3) * 1000);
        }
    },

    addPowerup: function(playerIdx, type) {
        const pwList = this.activePowerups[playerIdx];
        const config = {
            speed: {name:'Скорость', color:'#44ccff', dur:8},
            shield: {name:'Щит', color:'#44ff44', dur:15},
            freeze: {name:'Замедл.', color:'#88ffff', dur:5},
            double: {name:'x2 Очки', color:'#ff44cc', dur:10},
            shrink: {name:'Уменьшение', color:'#ff8800', dur:20},
            invincible: {name:'Неуязвимость', color:'#ff00ff', dur:6},
            bonus: {name:'Бонус очков', color:'#ffffff', dur:1}
        };
        const conf = config[type];
        if (!conf) return;
        const existing = pwList.find(p=>p.type===type);
        if (existing) {
            existing.duration = conf.dur;
            return;
        }
        pwList.push({type, name:conf.name, color:conf.color, duration:conf.dur});
        if (type === 'shrink') {
            // Уменьшаем змею наполовину (минимум 2)
            const snake = this.snakes[playerIdx];
            const newLen = Math.max(2, Math.floor(snake.length/2));
            snake.splice(newLen);
        }
        if (type === 'bonus') {
            this.scores[playerIdx] += 30;
        }
        const timer = setInterval(() => {
            const idx = pwList.findIndex(p=>p.type===type);
            if (idx!==-1) {
                pwList[idx].duration--;
                if (pwList[idx].duration <= 0) {
                    pwList.splice(idx,1);
                }
            }
        }, 1000);
        this.powerupTimers[playerIdx].push(timer);
    },

    move: function() {
        if (!this.active) return;
        for (let i = 0; i < this.players; i++) this.dirs[i] = this.nextDirs[i];
        this.applyMagnet(0);
        if (this.players===2) this.applyMagnet(1);

        // Движение бота
        if (this.bot && this.bot.alive) {
            const bot = this.bot;
            const head = {x: bot.segments[0].x + bot.dir.x, y: bot.segments[0].y + bot.dir.y};
            let died = false;
            if (head.x<0||head.x>=this.W||head.y<0||head.y>=this.H) died = true;
            else if (bot.segments.some(s=>s.x===head.x&&s.y===head.y)) died = true;
            else if (this.snakes.some(s=>s.some(seg=>seg.x===head.x&&seg.y===head.y))) died = true; // врезался в игрока
            if (!died) {
                bot.segments.unshift(head);
                let ate = false;
                for (let f=0; f<this.foods.length; f++) {
                    if (head.x===this.foods[f].x && head.y===this.foods[f].y) {
                        this.foods.splice(f,1);
                        this.placeFood();
                        ate = true;
                        break;
                    }
                }
                if (!ate) bot.segments.pop();
            } else {
                // Бот умирает
                bot.alive = false;
                clearInterval(this.botMoveTimer);
                this.scores[0] += 50 * (this.upgrades.scoreMult || 1);
                document.getElementById('eventsContainer')?.insertAdjacentHTML('beforeend', '<div class="event-message">🦎 Вражеская змея уничтожена! +50 очков</div>');
                this.bot = null;
                this.scheduleBotSpawn();
            }
        }

        // Игроки
        for (let i = 0; i < this.players; i++) {
            const head = {x: this.snakes[i][0].x + this.dirs[i].x, y: this.snakes[i][0].y + this.dirs[i].y};
            const hasShield = this.activePowerups[i]?.some(p=>p.type==='shield');
            const invincible = this.activePowerups[i]?.some(p=>p.type==='invincible');
            let dead = false;
            if (head.x<0||head.x>=this.W||head.y<0||head.y>=this.H) dead = !hasShield && !invincible;
            else if (this.snakes.some(s=>s.some(seg=>seg.x===head.x&&seg.y===head.y))) dead = !hasShield && !invincible;
            else if (this.bot && this.bot.alive && this.bot.segments.some(seg=>seg.x===head.x&&seg.y===head.y)) dead = !hasShield && !invincible;
            if (dead) {
                if (hasShield) {
                    const idx = this.activePowerups[i].findIndex(p=>p.type==='shield');
                    if (idx!==-1) this.activePowerups[i].splice(idx,1);
                } else if (invincible) {
                    // ничего
                } else {
                    this.kill(i); return;
                }
            }
            this.snakes[i].unshift(head);
            let ate = false;
            for (let f=0; f<this.foods.length; f++) {
                const food = this.foods[f];
                if (head.x===food.x && head.y===food.y) {
                    let points = 1;
                    if (food.type==='gold') points = 5;
                    if (this.activePowerups[i]?.some(p=>p.type==='double')) points *= 2;
                    points = Math.floor(points * this.upgrades.scoreMult);
                    this.scores[i] += points;
                    if (this.comboTimers[i]) clearTimeout(this.comboTimers[i]);
                    this.combos[i]++;
                    this.comboTimers[i] = setTimeout(()=>{this.combos[i]=0;}, 2000);
                    const comboBonus = this.combos[i]>1 ? Math.floor(points*(this.combos[i]-1)*0.1) : 0;
                    this.scores[i] += comboBonus;
                    this.addPowerup(i, food.type);
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
        if (!this.active) return;
        this.active = false;
        clearInterval(this.interval);
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.comboTimers.forEach(t=>clearTimeout(t));
        this.dashTimers.forEach(t=>clearTimeout(t));
        this.powerupTimers.forEach(arr=>arr.forEach(t=>clearInterval(t)));
        if (this.bot) { clearInterval(this.botMoveTimer); this.bot = null; }
        if (this.botSpawnTimer) clearTimeout(this.botSpawnTimer);
        if (this.players===1) {
            this.currency += this.scores[0];
            this.saveUpgrades();
            if (this.onGameOver) this.onGameOver();
        } else {
            alert(`Игрок ${idx===0?2:1} победил!`);
            this.stop();
            if (this.onGameOver) this.onGameOver();
        }
    },

    stop: function() {
        this.active = false;
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        if (this.bot) { clearInterval(this.botMoveTimer); this.bot = null; }
        if (this.botSpawnTimer) clearTimeout(this.botSpawnTimer);
    },

    startAnimationLoop: function() {
        const loop = () => {
            this.foodPhase = (this.foodPhase + 0.05) % (Math.PI*2);
            this.draw();
            this.animFrame = requestAnimationFrame(loop);
        };
        loop();
    },

    showShop: function() {
        const self = this;
        const render = () => {
            const modalInner = document.getElementById('modalInner');
            if (!modalInner) return;
            modalInner.innerHTML = `
                <h3>🐍 Магазин улучшений</h3>
                <p>Очки: <strong>${self.currency}</strong></p>
                <div class="snake-shop" id="snakeShopUpgrades"></div>
                <button class="game-btn" id="playSnakeAgain">Играть снова</button>
                <button class="back-btn" id="backToSnakeMenu">В меню</button>
            `;
            const container = document.getElementById('snakeShopUpgrades');
            const upgrades = [
                { key: 'length', name: 'Длина +1', desc: 'Начальная длина', cost: 50, inc: 50, max: 5, val: self.upgrades.length },
                { key: 'speed', name: 'Скорость +10%', desc: 'Быстрее движение', cost: 80, inc: 40, max: 5, val: Math.round((self.upgrades.speed-1)*10) },
                { key: 'scoreMult', name: 'Множитель очков +10%', desc: '', cost: 100, inc: 50, max: 5, val: Math.round((self.upgrades.scoreMult-1)*10) },
                { key: 'magnet', name: 'Магнит', desc: 'Еда притягивается', cost: 200, max: 1, val: self.upgrades.magnet?1:0 },
                { key: 'shieldStart', name: 'Щит в начале', desc: '', cost: 150, max: 1, val: self.upgrades.shieldStart?1:0 },
                { key: 'dashCooldown', name: 'Рывок быстрее', desc: 'Перезарядка рывка', cost: 120, inc: 60, max: 3, val: self.upgrades.dashCooldown },
                { key: 'extraPowerups', name: 'Новые бонусы', desc: 'Добавляет новые типы еды', cost: 250, inc: 150, max: 3, val: self.upgrades.extraPowerups },
                { key: 'skinLevel', name: 'Цвет змеи', desc: 'Меняет окраску', cost: 100, inc: 0, max: 4, val: self.upgrades.skinLevel }
            ];
            upgrades.forEach(up => {
                const nextCost = up.inc ? Math.floor(up.cost + up.val * up.inc) : up.cost;
                const maxed = up.max && up.val >= up.max;
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
            document.getElementById('playSnakeAgain').onclick = () => document.dispatchEvent(new CustomEvent('startSnakeSingle'));
            document.getElementById('backToSnakeMenu').onclick = () => document.dispatchEvent(new CustomEvent('openMiniGamesMenu'));
        };
        render();
    }
};