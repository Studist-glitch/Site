window.clicker = {
    score: 0,
    perClick: 1,
    perSec: 0,
    critChance: 0.2,
    critMult: 2,
    doubleClickChance: 0,
    goldRushActive: false,
    goldRushMult: 1,
    goldRushTimer: 0,
    boss: { active: false, health: 0, maxHealth: 0, reward: 0, name: 'Тень Неона', level: 1 },
    poison: { active: false, dps: 0 },
    meteor: { timer: 0, interval: 15 },
    cloneActive: false,
    bankPercent: 0,
    eventTimer: 0,
    upgrades: {
        auto: {
            level: 0,
            baseCost: 15,
            name: 'Автоклик',
            icon: '⚡',
            description: 'Автоматический клик раз в секунду',
            effect: function() { clicker.perSec += 1; },
            unlockAt: 10
        },
        power: {
            level: 0,
            baseCost: 10,
            name: 'Сила клика',
            icon: '💪',
            description: 'Увеличивает базовый урон клика',
            effect: function() { clicker.perClick += 1; },
            unlockAt: 50
        },
        crit: {
            level: 0,
            baseCost: 30,
            name: 'Критический удар',
            icon: '🎯',
            description: 'Повышает множитель крита',
            effect: function() { clicker.critMult = 2 + clicker.upgrades.crit.level; },
            unlockAt: 150
        },
        magnet: {
            level: 0,
            baseCost: 20,
            name: 'Магнит',
            icon: '🧲',
            description: '+2 к пассивному доходу',
            effect: function() { clicker.perSec += 2; },
            unlockAt: 300
        },
        luck: {
            level: 0,
            baseCost: 50,
            name: 'Удача',
            icon: '🍀',
            description: 'Шанс двойного клика',
            effect: function() { clicker.doubleClickChance = 0.1 + clicker.upgrades.luck.level * 0.05; },
            unlockAt: 600
        },
        gold: {
            level: 0,
            baseCost: 100,
            name: 'Золотая лихорадка',
            icon: '✨',
            description: 'Удваивает доход на 5 секунд',
            effect: function() {},
            unlockAt: 1000
        },
        poison: {
            level: 0,
            baseCost: 75,
            name: 'Ядовитое касание',
            icon: '☠️',
            description: 'Наносит урон боссам каждую секунду',
            effect: function() { clicker.poison.dps = clicker.upgrades.poison.level * 3; },
            unlockAt: 2000
        },
        meteor: {
            level: 0,
            baseCost: 120,
            name: 'Метеоритный дождь',
            icon: '☄️',
            description: 'Периодически приносит большой бонус',
            effect: function() { clicker.meteor.interval = Math.max(5, 15 - clicker.upgrades.meteor.level); },
            unlockAt: 4000
        },
        clone: {
            level: 0,
            baseCost: 200,
            name: 'Клон',
            icon: '👥',
            description: 'Удваивает силу каждого клика',
            effect: function() { clicker.cloneActive = true; },
            unlockAt: 8000
        },
        bank: {
            level: 0,
            baseCost: 300,
            name: 'Банк',
            icon: '🏦',
            description: 'Процент от счёта каждую секунду',
            effect: function() { clicker.bankPercent = clicker.upgrades.bank.level * 0.5; },
            unlockAt: 15000
        }
    },
    challenge: { active: false, startScore: 0, target: 0, reward: 0 },
    events: [],
    interval: null,

    init: function() {
        if (!this.interval) {
            this.interval = setInterval(this.autoTick.bind(this), 1000);
        }
    },

    handleClick: function() {
        let gain = this.perClick;
        if (this.goldRushActive) gain *= this.goldRushMult;
        if (this.cloneActive) gain *= 2;
        if (Math.random() < this.critChance) gain *= this.critMult;
        if (this.doubleClickChance > 0 && Math.random() < this.doubleClickChance) gain *= 2;

        if (this.boss.active) {
            this.boss.health -= gain;
            if (this.boss.health <= 0) {
                this.score += this.boss.reward;
                this.showBigEvent(`Босс ${this.boss.name} повержен!`, `+${this.boss.reward}💎`);
                this.boss.active = false;
                this.updateBossUI();
            }
        } else {
            this.score += gain;
        }

        this.showFloatingNumber(gain);

        // События при клике (редкие, 3%)
        if (Math.random() < 0.03) {
            this.triggerRandomEvent();
        }

        this.updateUI();
        this.checkChallenge();
        this.renderUpgradesList();
    },

    showFloatingNumber: function(value) {
        const container = document.getElementById('clickerArea');
        if (!container) return;
        const el = document.createElement('span');
        el.className = 'float-number';
        el.textContent = '+' + Math.floor(value);
        el.style.left = (40 + Math.random() * 30) + '%';
        el.style.top = (20 + Math.random() * 30) + '%';
        container.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    },

    showBigEvent: function(title, subtitle) {
        const modal = document.getElementById('modalInner');
        if (!modal) return;
        const existing = document.querySelector('.event-big-popup');
        if (existing) existing.remove();

        const popup = document.createElement('div');
        popup.className = 'event-big-popup';
        popup.innerHTML = `<strong>${title}</strong><br>${subtitle}`;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 2500);
    },

    autoTick: function() {
        // Пассивный доход
        let add = this.perSec;
        if (this.goldRushActive) add *= this.goldRushMult;
        if (this.bankPercent > 0) add += this.score * (this.bankPercent / 100);

        if (this.boss.active) {
            this.boss.health -= add;
            if (this.boss.health <= 0) {
                this.score += this.boss.reward;
                this.showBigEvent(`Босс ${this.boss.name} уничтожен!`, `+${this.boss.reward}💎`);
                this.boss.active = false;
            }
            this.updateBossUI();
        } else {
            this.score += add;
        }

        // Яд
        if (this.poison.dps > 0 && this.boss.active) {
            this.boss.health -= this.poison.dps;
            if (this.boss.health <= 0) {
                this.score += this.boss.reward;
                this.showBigEvent('Яд расправился с боссом!', `+${this.boss.reward}💎`);
                this.boss.active = false;
            }
            this.updateBossUI();
        }

        // Метеорит
        this.meteor.timer++;
        if (this.meteor.timer >= this.meteor.interval) {
            this.meteor.timer = 0;
            const bonus = Math.floor(this.perSec * 15 + this.perClick * 10);
            this.score += bonus;
            this.showBigEvent('☄️ Метеоритный дождь!', `+${bonus}💎`);
        }

        // Золотая лихорадка
        if (this.goldRushActive) {
            this.goldRushTimer--;
            if (this.goldRushTimer <= 0) {
                this.goldRushActive = false;
                this.showBigEvent('Лихорадка закончилась', '');
            }
        }

        // Появление босса (шанс зависит от счёта)
        if (!this.boss.active && Math.random() < 0.01 + this.score * 0.00002) {
            this.spawnBoss();
        }

        this.updateUI();
        this.checkChallenge();
    },

    spawnBoss: function() {
        const level = Math.floor(Math.log2(this.score + 1)) + 1;
        this.boss.active = true;
        this.boss.level = level;
        this.boss.maxHealth = Math.floor(200 * level + this.score * 0.3);
        this.boss.health = this.boss.maxHealth;
        this.boss.reward = Math.floor(this.boss.maxHealth * 1.8);
        const names = ['Тень Неона', 'Кибер-демон', 'Гигантский слизень', 'Неоновый дракон'];
        this.boss.name = names[level % names.length];
        this.showBigEvent(`⚔️ Босс ${this.boss.name} (ур.${level})`, 'Сражайся!');
        this.updateBossUI();
    },

    updateBossUI: function() {
        const container = document.getElementById('bossContainer');
        if (!container) return;
        if (this.boss.active) {
            container.style.display = 'block';
            document.getElementById('bossName').textContent = `${this.boss.name} ур.${this.boss.level}`;
            document.getElementById('bossHealthBar').style.width = (this.boss.health / this.boss.maxHealth * 100) + '%';
            document.getElementById('bossHealthText').textContent = `${Math.ceil(this.boss.health)} / ${this.boss.maxHealth}`;
        } else {
            container.style.display = 'none';
        }
    },

    updateUI: function() {
        const scoreEl = document.getElementById('clickerScore');
        const perSecEl = document.getElementById('clickerPerSec');
        if (scoreEl) scoreEl.textContent = Math.floor(this.score);
        if (perSecEl) perSecEl.textContent = Math.floor(this.perSec * (this.goldRushActive ? this.goldRushMult : 1));
    },

    renderUpgradesList: function() {
        const container = document.getElementById('clickerUpgrades');
        if (!container) return;
        container.innerHTML = '';
        for (let key in this.upgrades) {
            const up = this.upgrades[key];
            const cost = Math.floor(up.baseCost * Math.pow(1.7, up.level));
            const unlocked = this.score >= up.unlockAt;
            const canBuy = this.score >= cost && unlocked;

            const item = document.createElement('div');
            item.className = 'upgrade-item' + (unlocked ? '' : ' locked');

            item.innerHTML = `
                <div class="info">
                    <span class="icon">${up.icon}</span>
                    <div class="details">
                        <span class="name">${up.name} (ур.${up.level})</span>
                        <span class="effect">${up.description}</span>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span class="cost">${cost}💎</span>
                    <button class="buy-btn" ${canBuy ? '' : 'disabled'}>Купить</button>
                </div>
            `;

            if (canBuy) {
                item.querySelector('.buy-btn').addEventListener('click', () => {
                    this.buyUpgrade(key);
                });
            }

            container.appendChild(item);
        }
    },

    buyUpgrade: function(key) {
        const up = this.upgrades[key];
        const cost = Math.floor(up.baseCost * Math.pow(1.7, up.level));
        if (this.score < cost) return;
        this.score -= cost;
        up.effect();
        if (key === 'gold') {
            this.goldRushActive = true;
            this.goldRushMult = 2;
            this.goldRushTimer = 5;
            this.showBigEvent('✨ Золотая лихорадка!', 'x2 доход на 5 сек');
        }
        if (key === 'clone') {
            this.cloneActive = true;
            this.showBigEvent('👥 Клон активирован!', 'Удвоение кликов');
        }
        up.level++;
        this.updateUI();
        this.renderUpgradesList();
    },

    triggerRandomEvent: function() {
        const r = Math.random();
        let title = '';
        let sub = '';
        if (r < 0.25) {
            const bonus = Math.floor(this.perClick * 50 + this.perSec * 20) + 200;
            this.score += bonus;
            title = '💰 Сундук с сокровищами!';
            sub = `+${bonus}💎`;
        } else if (r < 0.5) {
            const loss = Math.floor(this.score * 0.03);
            this.score = Math.max(0, this.score - loss);
            title = '🔥 Ограбление!';
            sub = `-${loss}💎`;
        } else if (r < 0.7) {
            title = '🌀 Странный туман';
            sub = 'Ничего не произошло';
        } else {
            title = '✨ Магия неона';
            sub = 'Удача улыбнулась';
        }
        this.showBigEvent(title, sub);
    },

    generateChallenge: function() {
        if (this.challenge.active) return;
        const base = 100 + this.perClick * 15 + this.perSec * 10;
        this.challenge = {
            active: true,
            startScore: this.score,
            target: Math.floor(base),
            reward: Math.floor(base * 1.2)
        };
        this.showBigEvent('🎯 Новый челлендж!', `Набери ${this.challenge.target}💎`);
    },

    checkChallenge: function() {
        if (!this.challenge.active) return;
        const progress = this.score - this.challenge.startScore;
        if (progress >= this.challenge.target) {
            this.score += this.challenge.reward;
            this.challenge.active = false;
            this.showBigEvent('✅ Челлендж выполнен!', `+${this.challenge.reward}💎`);
            this.updateUI();
            setTimeout(() => this.generateChallenge(), 3000);
        }
    }
};