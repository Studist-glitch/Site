window.pong = {
    W: 800, H: 400,
    active: false,
    interval: null,
    players: 1,
    mode: 'single', // 'single' или 'multi'
    singlePlayerMode: true, // true для одиночного (с улучшениями), false для мультиплеера

    paddles: [
        { x: 20, y: 150, width: 10, height: 80, score: 0, upgrades: {}, tempBonus: {}, shield: 0 },
        { x: 770, y: 150, width: 10, height: 80, score: 0, upgrades: {}, tempBonus: {}, shield: 0 }
    ],
    ball: { x: 400, y: 200, vx: 4, vy: 3, radius: 6, baseSpeed: 5 },
    trail: [], // для эффекта следа мяча
    particles: [],

    activeEvent: null,
    eventInterval: null,

    upgradeTimer: 60,
    upgradeInterval: null,
    waitingForUpgrade: false,
    pendingUpgradePlayer: 0,
    upgradeDialog: null,

    bot: { level: 0, reactionDelay: 0.3, speedMultiplier: 1 },

    enemies: [],
    boss: null,
    enemySpawnTimer: 0,
    enemySpawnInterval: 45,

    canvas: null,
    ctx: null,
    animationId: null,
    keys: { ArrowUp: false, ArrowDown: false, w: false, s: false },

    allUpgrades: [
        { id: 'speed', name: 'Скорость ракетки', desc: '+25% скорости', apply: (p) => { p.tempBonus.speed = (p.tempBonus.speed || 1) + 0.25; } },
        { id: 'size', name: 'Размер ракетки', desc: '+15px высоты', apply: (p) => { p.height = Math.min(160, p.height + 15); } },
        { id: 'power', name: 'Сила удара', desc: '+20% скорости мяча', apply: (p, val, ball) => { if(ball) ball.baseSpeed *= 1.2; } },
        { id: 'shield', name: 'Щит', desc: 'Защита от 1 пропущенного гола', apply: (p) => { p.shield = (p.shield || 0) + 1; } },
        { id: 'magnet', name: 'Магнит', desc: 'Мяч притягивается к ракетке', apply: (p) => { p.tempBonus.magnet = true; } },
        { id: 'portal', name: 'Портал', desc: 'При ударе телепорт на половину поля', apply: (p) => { p.tempBonus.portal = true; } },
        { id: 'slowEnemy', name: 'Замедление врага', desc: 'Замедляет соперника на 5с', apply: (p, val, ball, opp) => { if(opp) opp.tempBonus.slow = 5; } },
        { id: 'doubleScore', name: 'Двойные очки', desc: 'Гол приносит 2 очка', apply: (p) => { p.tempBonus.doubleScore = true; } },
        { id: 'ballSize', name: 'Увеличение мяча', desc: '+4px к радиусу', apply: (p, val, ball) => { if(ball) ball.radius = Math.min(14, ball.radius + 4); } },
        { id: 'fastBall', name: 'Быстрый мяч', desc: '+50% скорости мяча', apply: (p, val, ball) => { if(ball) ball.baseSpeed *= 1.5; } },
        { id: 'invertControls', name: 'Инверсия', desc: 'Переворачивает управление врага на 3с', apply: (p, val, ball, opp) => { if(opp) opp.tempBonus.invert = 3; } },
        { id: 'heal', name: 'Восстановление', desc: 'Восстанавливает 1 щит', apply: (p) => { p.shield = (p.shield || 0) + 1; } },
        { id: 'ghost', name: 'Призрак', desc: 'Ракетка становится прозрачной (уклонение)', apply: (p) => { p.tempBonus.ghost = true; } },
        { id: 'ricochet', name: 'Рикошет', desc: 'Мяч отскакивает от стен под острым углом', apply: (p, val, ball) => { p.tempBonus.ricochet = true; } },
        { id: 'freezeEnemy', name: 'Заморозка врага', desc: 'Останавливает врага на 2с', apply: (p, val, ball, opp) => { if(opp) opp.tempBonus.freeze = 2; } },
        { id: 'extraLife', name: 'Доп. жизнь', desc: '+1 щит', apply: (p) => { p.shield = (p.shield || 0) + 1; } }
    ],

    allEvents: [
        { name: '🌀 Портал', duration: 8, apply: (game) => {
            game.activeEvent = { name: 'Портал', duration: 8 };
            game.paddles.forEach(p => p.tempBonus.portal = true);
        }, end: (game) => {
            game.paddles.forEach(p => delete p.tempBonus.portal);
        } },
        { name: '⚡ Ускорение мяча', duration: 6, apply: (game) => {
            game.activeEvent = { name: 'Ускорение', duration: 6 };
            game.ball.vx *= 1.5; game.ball.vy *= 1.5;
        }, end: (game) => {
            game.ball.vx /= 1.5; game.ball.vy /= 1.5;
        } },
        { name: '🐢 Замедление всех', duration: 5, apply: (game) => {
            game.activeEvent = { name: 'Замедление', duration: 5 };
            game.paddles.forEach(p => p.tempBonus.slow = 5);
        }, end: (game) => {
            game.paddles.forEach(p => delete p.tempBonus.slow);
        } },
        { name: '🛡️ Щит всем', duration: 10, apply: (game) => {
            game.activeEvent = { name: 'Щит', duration: 10 };
            game.paddles.forEach(p => p.shield = (p.shield || 0) + 1);
        }, end: () => {} },
        { name: '✨ Хаос', duration: 7, apply: (game) => {
            game.activeEvent = { name: 'Хаос', duration: 7 };
            game.paddles.forEach(p => { p.tempBonus.chaos = true; });
        }, end: (game) => {
            game.paddles.forEach(p => delete p.tempBonus.chaos);
        } },
        { name: '🌊 Гравитация', duration: 6, apply: (game) => {
            game.activeEvent = { name: 'Гравитация', duration: 6, gravity: true };
        }, end: () => {} },
        { name: '🌀 Кривые стены', duration: 8, apply: (game) => {
            game.activeEvent = { name: 'Кривые стены', duration: 8, curvedWalls: true };
        }, end: () => {} },
        { name: '💥 Множитель очков x2', duration: 10, apply: (game) => {
            game.activeEvent = { name: 'x2 очков', duration: 10, scoreMult: 2 };
        }, end: () => {} },
        { name: '🕯️ Невидимость', duration: 6, apply: (game) => {
            game.activeEvent = { name: 'Невидимость', duration: 6 };
            game.paddles.forEach(p => p.tempBonus.invisible = true);
        }, end: (game) => {
            game.paddles.forEach(p => delete p.tempBonus.invisible);
        } },
        { name: '💫 Отскок', duration: 5, apply: (game) => {
            game.activeEvent = { name: 'Отскок', duration: 5, doubleBounce: true };
        }, end: () => {} }
    ],

    init: function(mode) {
        this.mode = mode;
        this.players = (mode === 'multi') ? 2 : 1;
        this.singlePlayerMode = (mode === 'single');
        this.active = true;

        // Сброс состояния
        this.paddles[0] = { x: 20, y: 150, width: 10, height: 80, score: 0, upgrades: {}, tempBonus: {}, shield: 0 };
        this.paddles[1] = { x: this.W - 30, y: 150, width: 10, height: 80, score: 0, upgrades: {}, tempBonus: {}, shield: 0 };
        this.ball = { x: this.W/2, y: this.H/2, vx: (Math.random() > 0.5 ? 4 : -4), vy: (Math.random() - 0.5) * 6, radius: 6, baseSpeed: 5 };
        this.trail = [];
        this.particles = [];
        this.activeEvent = null;
        this.waitingForUpgrade = false;
        this.upgradeTimer = 60;
        this.upgradeDialog = null;
        this.enemies = [];
        this.boss = null;
        this.enemySpawnTimer = 0;

        if (this.singlePlayerMode) {
            this.bot = { level: 0, reactionDelay: 0.3, speedMultiplier: 1 };
        } else {
            // В мультиплеере отключаем ботов, улучшения и события
            this.bot = null;
        }

        this.canvas = document.getElementById('pongCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.W;
        this.canvas.height = this.H;

        if (this.interval) clearInterval(this.interval);
        if (this.eventInterval) clearInterval(this.eventInterval);
        if (this.upgradeInterval) clearInterval(this.upgradeInterval);

        this.interval = setInterval(() => this.update(), 1000/60);
        if (this.singlePlayerMode) {
            this.eventInterval = setInterval(() => this.triggerRandomEvent(), 20000 + Math.random() * 15000);
            this.upgradeInterval = setInterval(() => this.showUpgradeChoice(), 60000);
        }

        this.setupControls();
        this.animationId = requestAnimationFrame(() => this.renderLoop());
    },

    setupControls: function() {
        const handleKeyDown = (e) => {
            if (!this.active || this.waitingForUpgrade) return;
            if (e.key === 'ArrowUp') this.keys.ArrowUp = true;
            if (e.key === 'ArrowDown') this.keys.ArrowDown = true;
            if (e.key === 'w' || e.key === 'W' || e.key === 'ц' || e.key === 'Ц') this.keys.w = true;
            if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') this.keys.s = true;
            e.preventDefault();
        };
        const handleKeyUp = (e) => {
            if (e.key === 'ArrowUp') this.keys.ArrowUp = false;
            if (e.key === 'ArrowDown') this.keys.ArrowDown = false;
            if (e.key === 'w' || e.key === 'W' || e.key === 'ц' || e.key === 'Ц') this.keys.w = false;
            if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') this.keys.s = false;
            e.preventDefault();
        };
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    },

    update: function() {
        if (!this.active || this.waitingForUpgrade) return;

        // Управление игроком 0
        let speed0 = 6 * (this.paddles[0].tempBonus.speed || 1);
        if (this.keys.w) this.paddles[0].y -= speed0;
        if (this.keys.s) this.paddles[0].y += speed0;
        this.paddles[0].y = Math.max(0, Math.min(this.H - this.paddles[0].height, this.paddles[0].y));

        // Управление игроком 1 или ботом
        if (this.players === 2) {
            let speed1 = 6 * (this.paddles[1].tempBonus.speed || 1);
            if (this.keys.ArrowUp) this.paddles[1].y -= speed1;
            if (this.keys.ArrowDown) this.paddles[1].y += speed1;
            this.paddles[1].y = Math.max(0, Math.min(this.H - this.paddles[1].height, this.paddles[1].y));
        } else if (this.singlePlayerMode && this.bot) {
            let targetY = this.ball.y - this.paddles[1].height/2;
            let diff = targetY - this.paddles[1].y;
            let botSpeed = 4.5 * (this.bot.speedMultiplier || 1) * (this.paddles[1].tempBonus.slow ? 0.5 : 1);
            if (this.paddles[1].tempBonus.freeze) botSpeed = 0;
            this.paddles[1].y += Math.min(Math.max(diff * 0.15, -botSpeed), botSpeed);
            this.paddles[1].y = Math.max(0, Math.min(this.H - this.paddles[1].height, this.paddles[1].y));
        }

        // Движение мяча
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // Сохраняем след
        this.trail.unshift({ x: this.ball.x, y: this.ball.y });
        if (this.trail.length > 15) this.trail.pop();

        // Гравитация
        if (this.activeEvent && this.activeEvent.gravity) this.ball.vy += 0.2;

        // Стены
        if (this.activeEvent && this.activeEvent.curvedWalls) {
            if (this.ball.y - this.ball.radius <= 0) { this.ball.y = this.ball.radius; this.ball.vy = -this.ball.vy * 0.9; this.ball.vx += (Math.random() - 0.5) * 2; }
            if (this.ball.y + this.ball.radius >= this.H) { this.ball.y = this.H - this.ball.radius; this.ball.vy = -this.ball.vy * 0.9; this.ball.vx += (Math.random() - 0.5) * 2; }
        } else {
            if (this.ball.y - this.ball.radius <= 0) { this.ball.y = this.ball.radius; this.ball.vy = -this.ball.vy; this.addParticles(this.ball.x, this.ball.y); }
            if (this.ball.y + this.ball.radius >= this.H) { this.ball.y = this.H - this.ball.radius; this.ball.vy = -this.ball.vy; this.addParticles(this.ball.x, this.ball.y); }
        }

        // Голы
        let scoreMult = (this.activeEvent && this.activeEvent.scoreMult) ? this.activeEvent.scoreMult : 1;
        if (this.ball.x + this.ball.radius <= 0) {
            if (this.paddles[0].shield > 0) { this.paddles[0].shield--; this.resetBall(1, false); }
            else { let add = (this.paddles[1].tempBonus.doubleScore ? 2 : 1) * scoreMult; this.paddles[1].score += add; this.resetBall(1, true); this.addGoalParticles(this.W/4); }
        }
        if (this.ball.x - this.ball.radius >= this.W) {
            if (this.paddles[1].shield > 0) { this.paddles[1].shield--; this.resetBall(0, false); }
            else { let add = (this.paddles[0].tempBonus.doubleScore ? 2 : 1) * scoreMult; this.paddles[0].score += add; this.resetBall(0, true); this.addGoalParticles(3*this.W/4); }
        }

        this.checkPaddleCollision(0);
        this.checkPaddleCollision(1);

        // Враги и боссы (только в одиночном режиме)
        if (this.singlePlayerMode) {
            this.updateEnemies();
            this.enemySpawnTimer += 1/60;
            if (!this.boss && this.enemySpawnTimer >= this.enemySpawnInterval && Math.random() < 0.02) {
                this.spawnEnemy();
                this.enemySpawnTimer = 0;
            }
        }

        // Обновление временных эффектов
        for (let i = 0; i < this.players; i++) {
            if (this.paddles[i].tempBonus.slow) { this.paddles[i].tempBonus.slow -= 1/60; if (this.paddles[i].tempBonus.slow <= 0) delete this.paddles[i].tempBonus.slow; }
            if (this.paddles[i].tempBonus.invert) { this.paddles[i].tempBonus.invert -= 1/60; if (this.paddles[i].tempBonus.invert <= 0) delete this.paddles[i].tempBonus.invert; }
            if (this.paddles[i].tempBonus.freeze) { this.paddles[i].tempBonus.freeze -= 1/60; if (this.paddles[i].tempBonus.freeze <= 0) delete this.paddles[i].tempBonus.freeze; }
            if (this.paddles[i].tempBonus.chaos) {
                this.paddles[i].y += (Math.random() - 0.5) * 8;
                this.paddles[i].y = Math.max(0, Math.min(this.H - this.paddles[i].height, this.paddles[i].y));
            }
        }

        // Обновление частиц
        this.particles = this.particles.filter(p => {
            p.life--;
            p.x += p.vx;
            p.y += p.vy;
            return p.life > 0;
        });

        if (this.activeEvent) {
            this.activeEvent.duration -= 1/60;
            if (this.activeEvent.duration <= 0) this.endEvent();
        }

        if (this.singlePlayerMode && !this.waitingForUpgrade) {
            this.upgradeTimer -= 1/60;
            if (this.upgradeTimer <= 0) this.showUpgradeChoice();
        }
        const timerEl = document.getElementById('pongTimer');
        if (timerEl) timerEl.textContent = `След. улучшение: ${Math.ceil(this.upgradeTimer)}с`;
    },

    addParticles: function(x, y) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 20,
                size: Math.random() * 3 + 1,
                color: `hsl(${Math.random() * 60 + 280}, 80%, 60%)`
            });
        }
    },

    addGoalParticles: function(x) {
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: x, y: this.H/2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 40,
                size: Math.random() * 4 + 2,
                color: `hsl(${Math.random() * 360}, 100%, 60%)`
            });
        }
    },

    checkPaddleCollision: function(paddleIdx) {
        const pad = this.paddles[paddleIdx];
        const ball = this.ball;
        const padLeft = pad.x;
        const padRight = pad.x + pad.width;
        const padTop = pad.y;
        const padBottom = pad.y + pad.height;

        if (ball.x + ball.radius >= padLeft && ball.x - ball.radius <= padRight &&
            ball.y + ball.radius >= padTop && ball.y - ball.radius <= padBottom) {

            if (pad.tempBonus.ghost) return;

            let collidePoint = ball.y - (pad.y + pad.height/2);
            collidePoint = Math.max(-1, Math.min(1, collidePoint / (pad.height/2)));
            let angleRad = collidePoint * Math.PI/3;
            let direction = (paddleIdx === 0) ? 1 : -1;
            let currentSpeed = Math.hypot(ball.vx, ball.vy);
            let newVx = direction * currentSpeed * Math.cos(angleRad);
            let newVy = currentSpeed * Math.sin(angleRad);
            let power = (pad.tempBonus.power ? 1.2 : 1);
            ball.vx = newVx * power;
            ball.vy = newVy * power;

            if (pad.tempBonus.magnet) {
                let centerY = pad.y + pad.height/2;
                ball.vy += (centerY - ball.y) * 0.2;
            }
            if (pad.tempBonus.portal) {
                let mid = this.W / 2;
                if (paddleIdx === 0 && ball.x < mid) ball.x = mid + 50;
                else if (paddleIdx === 1 && ball.x > mid) ball.x = mid - 50;
                ball.x = Math.max(10, Math.min(this.W-10, ball.x));
            }
            ball.x += (paddleIdx === 0 ? 1 : -1);
            if (pad.tempBonus.ricochet && (ball.x < 50 || ball.x > this.W-50)) {
                ball.vx = -ball.vx;
            }
            this.addParticles(ball.x, ball.y);
        }
    },

    resetBall: function(scoredOn, resetEffects) {
        this.ball.x = this.W/2;
        this.ball.y = this.H/2;
        let dir = (scoredOn === 0) ? -1 : 1;
        this.ball.vx = dir * (this.ball.baseSpeed + Math.random() * 2);
        this.ball.vy = (Math.random() - 0.5) * 6;
        if (resetEffects) {
            for (let i = 0; i < this.players; i++) {
                this.paddles[i].tempBonus = {};
            }
        }
        this.trail = [];
    },

    spawnEnemy: function() {
        if (!this.singlePlayerMode) return;
        let isBoss = Math.random() < 0.2;
        if (isBoss && !this.boss) {
            this.boss = {
                x: this.W/2 - 20, y: 50, width: 40, height: 40,
                health: 5, maxHealth: 5,
                name: 'Огненный элементаль'
            };
            this.addEvent('🔥 Босс появился! Порази его мячом 5 раз!');
        } else if (!this.boss) {
            this.enemies.push({
                x: Math.random() * (this.W - 60) + 30,
                y: Math.random() * (this.H - 40) + 20,
                width: 25, height: 25,
                health: 1,
                name: 'Теневой сгусток'
            });
            this.addEvent('👾 Враг появился! Ударь мячом!');
        }
    },

    updateEnemies: function() {
        if (!this.singlePlayerMode) return;
        for (let i=0; i<this.enemies.length; i++) {
            let e = this.enemies[i];
            if (this.ball.x + this.ball.radius > e.x && this.ball.x - this.ball.radius < e.x+e.width &&
                this.ball.y + this.ball.radius > e.y && this.ball.y - this.ball.radius < e.y+e.height) {
                e.health--;
                if (e.health <= 0) {
                    this.enemies.splice(i,1);
                    this.addEvent('💀 Враг уничтожен! +5 очков');
                    this.paddles[0].score += 5;
                } else {
                    this.addEvent('💥 Попадание по врагу!');
                }
                this.ball.vx = -this.ball.vx;
                this.ball.vy = -this.ball.vy;
                this.addParticles(this.ball.x, this.ball.y);
                break;
            }
        }
        if (this.boss) {
            let b = this.boss;
            if (this.ball.x + this.ball.radius > b.x && this.ball.x - this.ball.radius < b.x+b.width &&
                this.ball.y + this.ball.radius > b.y && this.ball.y - this.ball.radius < b.y+b.height) {
                b.health--;
                this.addEvent(`🔥 Попадание по боссу! Осталось ${b.health} хитов`);
                this.ball.vx = -this.ball.vx;
                this.ball.vy = -this.ball.vy;
                this.addParticles(this.ball.x, this.ball.y);
                if (b.health <= 0) {
                    this.boss = null;
                    this.addEvent('🏆 Босс повержен! +50 очков');
                    this.paddles[0].score += 50;
                }
            }
            b.x += Math.sin(Date.now() * 0.002) * 1.5;
            b.y += Math.cos(Date.now() * 0.0015) * 1;
            b.x = Math.max(10, Math.min(this.W - b.width - 10, b.x));
            b.y = Math.max(30, Math.min(this.H - b.height - 30, b.y));
        }
    },

    addEvent: function(msg) {
        const eventDiv = document.getElementById('pongEvent');
        if (eventDiv) {
            eventDiv.textContent = msg;
            setTimeout(() => { if(eventDiv && eventDiv.textContent === msg) eventDiv.textContent = ''; }, 3000);
        }
    },

    triggerRandomEvent: function() {
        if (!this.active || this.waitingForUpgrade || !this.singlePlayerMode) return;
        const ev = this.allEvents[Math.floor(Math.random() * this.allEvents.length)];
        ev.apply(this);
        this.addEvent(`Событие: ${ev.name}`);
    },

    endEvent: function() {
        if (this.activeEvent) {
            const evDef = this.allEvents.find(e => e.name === this.activeEvent.name);
            if (evDef && evDef.end) evDef.end(this);
            this.activeEvent = null;
        }
    },

    showUpgradeChoice: function() {
        if (!this.singlePlayerMode || this.waitingForUpgrade) return;
        this.waitingForUpgrade = true;
        this.promptUpgradeForPlayer(0);
    },

    promptUpgradeForPlayer: function(playerIdx) {
        if (!this.singlePlayerMode) return;
        if (this.upgradeDialog && this.upgradeDialog.parentNode) {
            this.upgradeDialog.parentNode.removeChild(this.upgradeDialog);
            this.upgradeDialog = null;
        }
        const dialog = document.createElement('div');
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.backgroundColor = '#12121a';
        dialog.style.border = '2px solid #c44eff';
        dialog.style.borderRadius = '10px';
        dialog.style.padding = '15px';
        dialog.style.zIndex = '1000';
        dialog.style.textAlign = 'center';
        dialog.style.color = '#fff';
        dialog.style.maxWidth = '300px';
        dialog.style.width = '80%';
        dialog.innerHTML = `<h3>Выберите улучшение для ${playerIdx === 0 ? 'Левого игрока' : 'Правого игрока'}</h3>`;

        const shuffled = [...this.allUpgrades];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const choices = shuffled.slice(0, 3);
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.marginTop = '10px';

        choices.forEach(up => {
            const btn = document.createElement('button');
            btn.textContent = `${up.name}\n${up.desc}`;
            btn.style.backgroundColor = '#2a2a3a';
            btn.style.border = '1px solid #c44eff';
            btn.style.color = '#c44eff';
            btn.style.padding = '8px';
            btn.style.borderRadius = '6px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '12px';
            btn.onclick = () => {
                let val = 1;
                if (up.id === 'size') val = 15;
                if (up.id === 'speed') val = 0.25;
                if (up.id === 'power') val = 1.2;
                if (up.id === 'ballSize') val = 4;
                if (up.id === 'fastBall') val = 1.5;
                up.apply(this.paddles[playerIdx], val, this.ball, this.paddles[1-playerIdx]);
                this.paddles[playerIdx].upgrades[up.id] = (this.paddles[playerIdx].upgrades[up.id] || 0) + 1;
                if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
                this.upgradeDialog = null;
                if (this.players === 2 && playerIdx === 0) {
                    this.promptUpgradeForPlayer(1);
                } else {
                    this.waitingForUpgrade = false;
                    this.upgradeTimer = 60;
                    if (this.players === 1 && this.singlePlayerMode) this.upgradeBot();
                }
            };
            container.appendChild(btn);
        });
        dialog.appendChild(container);
        document.body.appendChild(dialog);
        this.upgradeDialog = dialog;
    },

    upgradeBot: function() {
        if (!this.singlePlayerMode) return;
        const up = this.allUpgrades[Math.floor(Math.random() * this.allUpgrades.length)];
        let val = 1;
        if (up.id === 'size') val = 15;
        if (up.id === 'speed') val = 0.25;
        if (up.id === 'power') val = 1.2;
        up.apply(this.paddles[1], val, this.ball, this.paddles[0]);
        this.bot.speedMultiplier += 0.1;
        this.addEvent(`Бот получил улучшение: ${up.name}`);
    },

    draw: function() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.W, this.H);
        
        // Фоновый градиент
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.H);
        grad.addColorStop(0, '#0a0a1a');
        grad.addColorStop(1, '#0f0f2a');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.W, this.H);
        
        // Сетка
        this.ctx.strokeStyle = 'rgba(196,78,255,0.2)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.H; i += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.W, i);
            this.ctx.stroke();
        }
        for (let i = 0; i < this.W; i += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.H);
            this.ctx.stroke();
        }
        
        // Центральная линия
        this.ctx.setLineDash([10, 20]);
        this.ctx.strokeStyle = '#c44eff';
        this.ctx.beginPath();
        this.ctx.moveTo(this.W/2, 0);
        this.ctx.lineTo(this.W/2, this.H);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Частицы
        for (let p of this.particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = p.color;
            this.ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        }
        this.ctx.shadowBlur = 0;
        
        // След мяча
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const alpha = 0.3 * (1 - i / this.trail.length);
            this.ctx.fillStyle = `rgba(255, 100, 200, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(t.x, t.y, this.ball.radius * (1 - i/this.trail.length), 0, Math.PI*2);
            this.ctx.fill();
        }
        
        // Ракетки
        for (let i = 0; i < this.players; i++) {
            const p = this.paddles[i];
            let color = i === 0 ? '#44ff44' : '#ff4444';
            if (p.shield > 0) color = '#ffcc00';
            if (p.tempBonus.slow) color = '#88aaff';
            if (p.tempBonus.invisible) color = 'rgba(255,255,255,0.2)';
            this.ctx.fillStyle = color;
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = color;
            this.ctx.fillRect(p.x, p.y, p.width, p.height);
            // Внутренняя подсветка
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.fillRect(p.x+2, p.y+2, p.width-4, p.height-4);
            if (p.shield > 0) {
                this.ctx.fillStyle = 'rgba(255,255,0,0.6)';
                this.ctx.fillRect(p.x-2, p.y-2, p.width+4, 4);
            }
        }
        
        // Враги
        this.enemies.forEach(e => {
            this.ctx.fillStyle = '#aa44ff';
            this.ctx.shadowBlur = 6;
            this.ctx.fillRect(e.x, e.y, e.width, e.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px monospace';
            this.ctx.fillText(e.name, e.x, e.y-2);
        });
        if (this.boss) {
            let b = this.boss;
            this.ctx.fillStyle = '#ff4400';
            this.ctx.fillRect(b.x, b.y, b.width, b.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px monospace';
            this.ctx.fillText(`${b.name} ${b.health}/${b.maxHealth}`, b.x, b.y-5);
        }
        
        // Мяч
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = '#ff44ff';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        
        // Счёт
        this.ctx.font = '32px "Russo One", monospace';
        this.ctx.fillStyle = '#c44eff';
        this.ctx.shadowBlur = 6;
        this.ctx.fillText(this.paddles[0].score, this.W/4 - 20, 50);
        this.ctx.fillText(this.paddles[1].score, 3*this.W/4 - 20, 50);
        this.ctx.shadowBlur = 0;
        
        // Текущее событие
        if (this.activeEvent) {
            this.ctx.font = '14px monospace';
            this.ctx.fillStyle = '#ffaa44';
            this.ctx.fillText(this.activeEvent.name, this.W/2 - 40, 80);
        }
    },

    renderLoop: function() {
        this.draw();
        this.animationId = requestAnimationFrame(() => this.renderLoop());
    },

    stop: function() {
        this.active = false;
        if (this.interval) clearInterval(this.interval);
        if (this.eventInterval) clearInterval(this.eventInterval);
        if (this.upgradeInterval) clearInterval(this.upgradeInterval);
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.upgradeDialog && this.upgradeDialog.parentNode) this.upgradeDialog.parentNode.removeChild(this.upgradeDialog);
    },

    // --- Экспорт/импорт для GitHub (только одиночный режим) ---
    exportState: function() {
        if (!this.singlePlayerMode) return {};
        return {
            // Пока не храним прогресс пинг-понга отдельно, можно расширить
        };
    },
    importState: function(state) {
        // Заглушка
    }
};