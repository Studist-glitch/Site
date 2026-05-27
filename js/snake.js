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
    combos: [],
    comboTimers: [],
    dashCharges: [],
    dashCooldowns: [],
    dashTimers: [],
    lastDirTap: [],
    activePowerups: [],
    powerupTimers: [],
    animFrame: null,
    foodPhase: 0,

    bot: null,
    botMoveTimer: null,
    botSpawnTimer: null,
    botMinDistance: 15,
    botEdgeSpawn: true,

    eventActive: null,
    eventTimer: 0,
    meteorBlocks: [],

    bossSnake: null,
    bossTimer: null,
    bossInterval: 120000,

    achievements: [],
    allAchievements: [
        { id: 'firstBlood', name: 'Первая кровь', desc: 'Убейте бота-змею', reward: 100 },
        { id: 'combo10', name: 'Комбо-мастер', desc: 'Достигните комбо x10', reward: 200 },
        { id: 'longSnake', name: 'Длинная змея', desc: 'Достигните длины 30', reward: 300 }
    ],

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
        this.combos = [];
        this.comboTimers = [];
        this.dashCharges = [];
        this.dashCooldowns = [];
        this.dashTimers = [];
        this.lastDirTap = [];
        this.activePowerups = [];
        this.powerupTimers = [];
        this.bot = null;
        this.eventActive = null;
        this.eventTimer = 0;
        this.meteorBlocks = [];
        this.bossSnake = null;
        this.bossTimer = null;

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
            this.combos.push(0);
            this.comboTimers.push(null);
            this.dashCharges.push(this.upgrades.dashCooldown ? 3 : 3);
            this.dashCooldowns.push(this.upgrades.dashCooldown || 0);
            this.dashTimers.push(null);
            this.lastDirTap.push({dir: '', time: 0});
            this.activePowerups.push([]);
            this.powerupTimers.push([]);
            if (this.upgrades.shieldStart) this.addPowerup(i, 'shield');
        }

        for (let i = 0; i < 4; i++) this.placeFood();
        this.active = true;
        if (players === 1) {
            this.scheduleBotSpawn();
            this.scheduleBossSpawn();
        }

        this.startAnimationLoop();
        const baseInterval = 150;
        const interval = Math.min(400, baseInterval + (this.upgrades.speed - 1) * 30);
        this.interval = setInterval(() => this.move(), interval);
    },

    scheduleBotSpawn: function() {
        if (this.botSpawnTimer) clearTimeout(this.botSpawnTimer);
        this.botSpawnTimer = setTimeout(() => {
            if (this.active && !this.bot && !this.bossSnake) this.spawnBot();
        }, 35000);
    },

    spawnBot: function() {
        const head = this.snakes[0][0];
        let startX, startY;
        const edgePositions = [];
        for (let x = 0; x < this.W; x++) {
            edgePositions.push({x, y: 0}, {x, y: this.H-1});
        }
        for (let y = 1; y < this.H-1; y++) {
            edgePositions.push({x: 0, y}, {x: this.W-1, y});
        }
        const farEdges = edgePositions.filter(p => Math.abs(p.x - head.x) + Math.abs(p.y - head.y) >= this.botMinDistance);
        if (farEdges.length > 0) {
            const pos = farEdges[Math.floor(Math.random() * farEdges.length)];
            startX = pos.x; startY = pos.y;
        } else {
            do {
                startX = Math.floor(Math.random() * this.W);
                startY = Math.floor(Math.random() * this.H);
            } while (Math.abs(startX-head.x)+Math.abs(startY-head.y) < 10 || this.isOccupied(startX, startY));
        }

        const length = 4 + Math.floor(this.scores[0] / 30);
        const segments = [];
        for (let i = 0; i < length; i++) segments.push({x: startX - i, y: startY});
        this.bot = { segments: segments, dir: {x: 1, y: 0}, color: '#ff6644', alive: true };
        this.botMoveTimer = setInterval(() => this.botAI(), 400);
        this.addEvent('🦎 Враждебная змея появилась!');
    },

    botAI: function() {
        if (!this.bot || !this.bot.alive) return;
        const head = this.bot.segments[0];
        const possibleDirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        const safeDirs = possibleDirs.filter(d => {
            if (d.x === -this.bot.dir.x && d.y === -this.bot.dir.y) return false;
            for (let step = 1; step <= 3; step++) {
                const nx = head.x + d.x * step;
                const ny = head.y + d.y * step;
                if (nx < 0 || nx >= this.W || ny < 0 || ny >= this.H) return false;
                if (this.bot.segments.some(s => s.x === nx && s.y === ny)) return false;
                if (this.meteorBlocks.some(b => b.x === nx && b.y === ny)) return false;
                if (this.snakes[0].some(s => s.x === nx && s.y === ny)) return false;
            }
            return true;
        });
        if (safeDirs.length > 0) {
            this.bot.dir = safeDirs[Math.floor(Math.random() * safeDirs.length)];
        }
    },

    scheduleBossSpawn: function() {
        if (this.bossTimer) clearTimeout(this.bossTimer);
        this.bossTimer = setTimeout(() => {
            if (this.active && !this.bossSnake) this.spawnBoss();
        }, this.bossInterval);
    },

    spawnBoss: function() {
        const head = this.snakes[0][0];
        let startX, startY;
        do {
            startX = Math.floor(Math.random() * (this.W - 10)) + 5;
            startY = Math.floor(Math.random() * (this.H - 10)) + 5;
        } while (Math.abs(startX-head.x)+Math.abs(startY-head.y) < 15 || this.isOccupied(startX, startY));
        const segments = [];
        for (let i = 0; i < 20; i++) segments.push({x: startX - i, y: startY});
        this.bossSnake = { segments: segments, dir: {x: 0, y: 1}, color: '#ff0000', alive: true, health: 5 };
        this.addEvent('🐲 Босс-змея появилась! Атакуйте её хвост!');
    },

    isOccupied: function(x, y) {
        if (this.snakes.some(s => s.some(seg => seg.x === x && seg.y === y))) return true;
        if (this.bot && this.bot.segments.some(seg => seg.x === x && seg.y === y)) return true;
        if (this.bossSnake && this.bossSnake.segments.some(seg => seg.x === x && seg.y === y)) return true;
        if (this.meteorBlocks.some(b => b.x === x && b.y === y)) return true;
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
        else type = (hasExtra >= 1 ? 'shrink' : 'double');
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
        const colorMap = {
            normal: '#ff4444', gold: '#ffcc00', speed: '#44ccff', shield: '#44ff44',
            freeze: '#88ffff', double: '#ff44cc', shrink: '#ff8800', invincible: '#ff00ff', bonus: '#ffffff'
        };
        this.foods.forEach(f => {
            const cx = f.x * this.SIZE + this.SIZE/2;
            const cy = f.y * this.SIZE + this.SIZE/2;
            const radius = (this.SIZE/2 - 1) * pulse;
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
                ctx.fillStyle = i===0 ? '#fff' : playerColors[idx];
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = i===0 ? 10 : 4;
                ctx.fillRect(x, y, this.SIZE-1, this.SIZE-1);
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.shadowBlur = 0;
                ctx.fillRect(x, y, this.SIZE-1, 3);
            });
        });

        if (this.bot && this.bot.alive) {
            this.bot.segments.forEach((seg, i) => {
                const x = seg.x*this.SIZE, y = seg.y*this.SIZE;
                ctx.fillStyle = i===0 ? '#ffaa00' : this.bot.color;
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 5;
                ctx.fillRect(x, y, this.SIZE-1, this.SIZE-1);
            });
        }
        if (this.bossSnake && this.bossSnake.alive) {
            this.bossSnake.segments.forEach((seg, i) => {
                const x = seg.x*this.SIZE, y = seg.y*this.SIZE;
                ctx.fillStyle = '#ff0000';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 8;
                ctx.fillRect(x, y, this.SIZE-1, this.SIZE-1);
                if (i === this.bossSnake.segments.length-1) {
                    ctx.fillStyle = '#fff';
                    ctx.font = '8px sans-serif';
                    ctx.fillText(this.bossSnake.health, x+2, y+8);
                }
            });
        }
        this.meteorBlocks.forEach(b => {
            ctx.fillStyle = '#888';
            ctx.fillRect(b.x*this.SIZE, b.y*this.SIZE, this.SIZE-1, this.SIZE-1);
        });

        ctx.shadowBlur = 0;
        if (this.players === 1) {
            document.getElementById('snakeScore').textContent = 'Счёт: ' + this.scores[0];
            document.getElementById('comboIndicator').textContent = this.combos[0] > 1 ? `Комбо x${this.combos[0]}` : '';
            document.getElementById('dashIndicator').textContent = `Рывки: ${this.dashCharges[0]}`;
            document.getElementById('powerupsContainer').innerHTML = this.activePowerups[0].map(p =>
                `<span class="powerup-badge" style="color:${p.color}">${p.name}</span>`
            ).join('');
        }
    },

    addEvent: function(text) {
        const container = document.getElementById('eventsContainer');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'event-message';
        div.textContent = text;
        container.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    },

    updateEvents: function() {
        if (!this.eventActive) {
            this.eventTimer++;
            if (this.eventTimer > 600) {
                this.eventTimer = 0;
                if (Math.random() < 0.3) {
                    const types = ['meteor', 'speedUp', 'walls'];
                    const type = types[Math.floor(Math.random() * types.length)];
                    this.startEvent(type);
                }
            }
        } else {
            this.eventActive.timer--;
            if (this.eventActive.timer <= 0) this.endEvent();
        }
    },

    startEvent: function(type) {
        this.eventActive = { type, timer: 300 };
        if (type === 'meteor') {
            this.meteorBlocks = [];
            for (let i = 0; i < 5; i++) {
                let x, y;
                do {
                    x = Math.floor(Math.random() * this.W);
                    y = Math.floor(Math.random() * this.H);
                } while (this.isOccupied(x, y));
                this.meteorBlocks.push({x, y});
            }
            this.addEvent('☄️ Метеоритный дождь! Препятствия на поле.');
        } else if (type === 'speedUp') {
            clearInterval(this.interval);
            const interval = Math.min(400, 150 + (this.upgrades.speed - 1) * 30);
            this.interval = setInterval(() => this.move(), interval);
            this.addEvent('⚡ Ускорение времени!');
        } else if (type === 'walls') {
            this.tempWalls = true;
            this.addEvent('🧱 Временные стены! Края смертельны.');
        }
    },

    endEvent: function() {
        if (this.eventActive.type === 'speedUp') {
            clearInterval(this.interval);
            const base = 150;
            const interval = Math.min(400, base + (this.upgrades.speed - 1) * 30);
            this.interval = setInterval(() => this.move(), interval);
        }
        this.meteorBlocks = [];
        this.tempWalls = false;
        this.eventActive = null;
        this.addEvent('✨ Событие закончилось.');
    },

    move: function() {
        if (!this.active) return;
        this.updateEvents();
        for (let i = 0; i < this.players; i++) this.dirs[i] = this.nextDirs[i];

        if (this.upgrades.magnet) {
            const head = this.snakes[0][0];
            for (let f of this.foods) {
                const dx = head.x - f.x, dy = head.y - f.y;
                if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) {
                    let nx = f.x, ny = f.y;
                    if (dx !== 0) nx += (dx > 0 ? 1 : -1);
                    if (dy !== 0) ny += (dy > 0 ? 1 : -1);
                    nx = Math.max(0, Math.min(this.W-1, nx));
                    ny = Math.max(0, Math.min(this.H-1, ny));
                    if (!this.isOccupied(nx, ny)) {
                        f.x = nx;
                        f.y = ny;
                    }
                }
            }
            for (let i = 0; i < this.foods.length; i++) {
                if (this.foods[i].x === head.x && this.foods[i].y === head.y) {
                    this.eatFood(i, 0);
                    i--;
                }
            }
        }

        if (this.bot && this.bot.alive) {
            const bot = this.bot;
            const head = {x: bot.segments[0].x + bot.dir.x, y: bot.segments[0].y + bot.dir.y};
            let died = false;
            if (head.x<0||head.x>=this.W||head.y<0||head.y>=this.H) died = true;
            else if (bot.segments.some(s=>s.x===head.x&&s.y===head.y)) died = true;
            else if (this.meteorBlocks.some(b=>b.x===head.x&&b.y===head.y)) died = true;
            else if (this.tempWalls && (head.x===0||head.x===this.W-1||head.y===0||head.y===this.H-1)) died = true;
            if (!died) {
                bot.segments.unshift(head);
                let ate = false;
                for (let f=0; f<this.foods.length; f++) {
                    if (head.x===this.foods[f].x && head.y===this.foods[f].y) {
                        this.foods.splice(f,1); this.placeFood(); ate = true; break;
                    }
                }
                if (!ate) bot.segments.pop();
            } else {
                bot.alive = false;
                clearInterval(this.botMoveTimer);
                this.scores[0] += 50 * (this.upgrades.scoreMult || 1);
                this.addEvent('🦎 Вражеская змея уничтожена! +50 очков');
                this.checkAchievements();
                this.bot = null;
                this.scheduleBotSpawn();
            }
        }

        if (this.bossSnake && this.bossSnake.alive) {
            const boss = this.bossSnake;
            const head = {x: boss.segments[0].x + boss.dir.x, y: boss.segments[0].y + boss.dir.y};
            let bDied = false;
            if (head.x<0||head.x>=this.W||head.y<0||head.y>=this.H) bDied = true;
            if (!bDied) {
                boss.segments.unshift(head);
                boss.segments.pop();
                const playerHead = this.snakes[0][0];
                const tail = boss.segments[boss.segments.length-1];
                if (playerHead.x === tail.x && playerHead.y === tail.y) {
                    boss.health--;
                    if (boss.health <= 0) {
                        boss.alive = false;
                        this.scores[0] += 200;
                        this.addEvent('🐲 Босс-змея повержена! +200 очков');
                        this.bossSnake = null;
                        this.scheduleBossSpawn();
                        this.checkAchievements();
                    }
                }
            }
        }

        for (let i = 0; i < this.players; i++) {
            let newX = this.snakes[i][0].x + this.dirs[i].x;
            let newY = this.snakes[i][0].y + this.dirs[i].y;
            let hasShield = this.activePowerups[i]?.some(p=>p.type==='shield');
            let invincible = this.activePowerups[i]?.some(p=>p.type==='invincible');
            let teleported = false;

            // Телепортация через границы, если есть щит
            if (hasShield && !invincible) {
                if (newX < 0) { newX = this.W - 1; teleported = true; }
                else if (newX >= this.W) { newX = 0; teleported = true; }
                if (newY < 0) { newY = this.H - 1; teleported = true; }
                else if (newY >= this.H) { newY = 0; teleported = true; }
            }

            let dead = false;
            if (!teleported && (newX < 0 || newX >= this.W || newY < 0 || newY >= this.H)) {
                dead = !hasShield && !invincible;
            } else if (this.snakes.some((s, idx) => idx !== i && s.some(seg => seg.x === newX && seg.y === newY))) {
                dead = !hasShield && !invincible;
            } else if (this.snakes[i].some(seg => seg.x === newX && seg.y === newY) && !(newX === this.snakes[i][0].x && newY === this.snakes[i][0].y)) {
                dead = !hasShield && !invincible;
            } else if (this.meteorBlocks.some(b => b.x === newX && b.y === newY)) {
                dead = !hasShield && !invincible;
            } else if (this.bot && this.bot.alive && this.bot.segments.some(seg => seg.x === newX && seg.y === newY)) {
                dead = !hasShield && !invincible;
            } else if (this.bossSnake && this.bossSnake.alive && this.bossSnake.segments.some(seg => seg.x === newX && seg.y === newY)) {
                dead = !hasShield && !invincible;
            }
            if (dead) {
                if (hasShield) {
                    const idx = this.activePowerups[i].findIndex(p => p.type === 'shield');
                    if (idx !== -1) this.activePowerups[i].splice(idx, 1);
                } else {
                    this.kill(i); return;
                }
            }

            const head = {x: newX, y: newY};
            this.snakes[i].unshift(head);
            let ate = false;
            for (let f = 0; f < this.foods.length; f++) {
                const food = this.foods[f];
                if (head.x === food.x && head.y === food.y) {
                    this.eatFood(f, i);
                    ate = true;
                    break;
                }
            }
            if (!ate) this.snakes[i].pop();
        }

        this.checkAchievements();
        this.draw();
    },

    eatFood: function(foodIndex, playerIdx) {
        const food = this.foods[foodIndex];
        let points = 1;
        if (food.type === 'gold') points = 5;
        if (this.activePowerups[playerIdx]?.some(p=>p.type==='double')) points *= 2;
        points = Math.floor(points * this.upgrades.scoreMult);
        this.scores[playerIdx] += points;
        if (this.comboTimers[playerIdx]) clearTimeout(this.comboTimers[playerIdx]);
        this.combos[playerIdx]++;
        this.comboTimers[playerIdx] = setTimeout(()=>{this.combos[playerIdx]=0;}, 2000);
        const comboBonus = this.combos[playerIdx]>1 ? Math.floor(points*(this.combos[playerIdx]-1)*0.1) : 0;
        this.scores[playerIdx] += comboBonus;
        this.addPowerup(playerIdx, food.type);
        this.foods.splice(foodIndex,1);
        this.placeFood();
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
        if (existing) { existing.duration = conf.dur; return; }
        pwList.push({type, name:conf.name, color:conf.color, duration:conf.dur});
        if (type === 'shrink') {
            const snake = this.snakes[playerIdx];
            const newLen = Math.max(2, Math.floor(snake.length/2));
            snake.splice(newLen);
        }
        if (type === 'bonus') this.scores[playerIdx] += 30;
        const timer = setInterval(() => {
            const idx = pwList.findIndex(p=>p.type===type);
            if (idx!==-1) {
                pwList[idx].duration--;
                if (pwList[idx].duration <= 0) pwList.splice(idx,1);
            }
        }, 1000);
        this.powerupTimers[playerIdx].push(timer);
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
        if (this.bossSnake && this.bossSnake.segments.some(s=>s.x===newHead.x&&s.y===newHead.y)) return;
        if (this.meteorBlocks.some(b=>b.x===newHead.x&&b.y===newHead.y)) return;
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

    checkAchievements: function() {
        this.allAchievements.forEach(a => {
            if (this.achievements.includes(a.id)) return;
            let earned = false;
            if (a.id === 'firstBlood' && this.bot && !this.bot.alive) earned = true;
            if (a.id === 'combo10' && this.combos[0] >= 10) earned = true;
            if (a.id === 'longSnake' && this.snakes[0].length >= 30) earned = true;
            if (earned) {
                this.achievements.push(a.id);
                this.currency += a.reward;
                this.addEvent(`🏆 Достижение: ${a.name}! +${a.reward}💎`);
            }
        });
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
        if (this.bossTimer) clearTimeout(this.bossTimer);
        this.currency += this.scores[idx];
        this.saveUpgrades();
        if (this.onGameOver) this.onGameOver();
    },

    stop: function() {
        this.active = false;
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        if (this.bot) { clearInterval(this.botMoveTimer); this.bot = null; }
        if (this.botSpawnTimer) clearTimeout(this.botSpawnTimer);
        if (this.bossTimer) clearTimeout(this.bossTimer);
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
                { key: 'speed', name: 'Скорость', desc: 'Замедляет движение (легче)', cost: 80, inc: 40, max: 5, val: Math.round((self.upgrades.speed-1)*10) },
                { key: 'scoreMult', name: 'Множитель очков +10%', desc: '', cost: 100, inc: 50, max: 5, val: Math.round((self.upgrades.scoreMult-1)*10) },
                { key: 'magnet', name: 'Магнит', desc: 'Еда притягивается (исправлено)', cost: 200, max: 1, val: self.upgrades.magnet?1:0 },
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