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
    poison: { active: false, dps: 0, timer: 0 },
    meteor: { timer: 0, interval: 15 }, // срабатывает раз в 15 сек
    cloneActive: false,
    bankPercent: 0,
    effectsLog: [],
    upgrades: {
        // [ключ]: { level, cost, name, icon, effect() }
        auto: { level: 0, cost: 15, name: 'Автоклик', icon: '⚡', effect: () => { clicker.perSec += 1; } },
        power: { level: 0, cost: 10, name: 'Сила клика', icon: '💪', effect: () => { clicker.perClick += 1; } },
        crit: { level: 0, cost: 30, name: 'Крит (шанс 20%)', icon: '🎯', effect: () => { clicker.critMult = 2 + clicker.upgrades.crit.level; } },
        magnet: { level: 0, cost: 20, name: 'Магнит (+2/сек)', icon: '🧲', effect: () => { clicker.perSec += 2; } },
        luck: { level: 0, cost: 50, name: 'Удача (двойной клик)', icon: '🍀', effect: () => { clicker.doubleClickChance = 0.1 + clicker.upgrades.luck.level * 0.05; } },
        gold: { level: 0, cost: 100, name: 'Золотая лихорадка', icon: '✨', effect: () => {} },
        poison: { level: 0, cost: 75, name: 'Яд (урон боссам)', icon: '☠️', effect: () => { clicker.poison.dps = clicker.upgrades.poison.level * 2; } },
        meteor: { level: 0, cost: 120, name: 'Метеоритный дождь', icon: '☄️', effect: () => { clicker.meteor.interval = Math.max(5, 15 - clicker.upgrades.meteor.level); } },
        clone: { level: 0, cost: 200, name: 'Клон (x2 клики)', icon: '👥', effect: () => { clicker.cloneActive = true; } },
        bank: { level: 0, cost: 300, name: 'Банк (% от счёта)', icon: '🏦', effect: () => { clicker.bankPercent = clicker.upgrades.bank.level * 0.5; } }
    },
    challenge: { active: false, startScore: 0, target: 0, reward: 0 },
    events: [],
    interval: null,
    init: function() {
        if (!this.interval) this.interval = setInterval(this.autoTick.bind(this), 1000);
    },
    handleClick: function() {
        let gain = this.perClick;
        if (this.goldRushActive) gain *= this.goldRushMult;
        if (this.cloneActive) gain *= 2;
        if (Math.random() < this.critChance) gain *= this.critMult;
        if (this.doubleClickChance > 0 && Math.random() < this.doubleClickChance) gain *= 2;

        // Босс или обычный клик
        if (this.boss.active) {
            this.boss.health -= gain;
            if (this.boss.health <= 0) {
                this.score += this.boss.reward;
                this.events.push(`Босс ${this.boss.name} повержен! +${this.boss.reward}💎`);
                this.boss.active = false;
                this.updateBossUI();
            }
        } else {
            this.score += gain;
        }

        // Показываем всплывающее число
        this.showFloatingNumber(gain);

        if (Math.random() < 0.12) this.triggerEvent();
        this.updateUI();
        this.checkChallenge();
        this.renderUpgrades();
    },
    showFloatingNumber: function(value) {
        const container = document.getElementById('clickerArea');
        if (!container) return;
        const el = document.createElement('span');
        el.className = 'float-number';
        el.textContent = '+' + Math.floor(value);
        el.style.left = (50 + Math.random() * 40) + '%';
        el.style.top = (30 + Math.random() * 20) + '%';
        container.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    },
    autoTick: function() {
        // Пассивный доход
        if (this.perSec > 0) {
            let add = this.perSec;
            if (this.goldRushActive) add *= this.goldRushMult;
            if (this.bankPercent > 0) add += this.score * (this.bankPercent / 100);
            if (this.boss.active) {
                this.boss.health -= add;
                if (this.boss.health <= 0) {
                    this.score += this.boss.reward;
                    this.events.push(`Босс ${this.boss.name} уничтожен! +${this.boss.reward}💎`);
                    this.boss.active = false;
                }
                this.updateBossUI();
            } else {
                this.score += add;
            }
        }

        // Яд
        if (this.poison.active && this.boss.active) {
            this.boss.health -= this.poison.dps;
            if (this.boss.health <= 0) {
                this.score += this.boss.reward;
                this.events.push(`Босс отравлен! +${this.boss.reward}💎`);
                this.boss.active = false;
            }
            this.updateBossUI();
        }

        // Метеорит
        this.meteor.timer++;
        if (this.meteor.timer >= this.meteor.interval) {
            this.meteor.timer = 0;
            const bonus = Math.floor(this.perSec * 10 + this.perClick * 5);
            this.score += bonus;
            this.events.push(`☄️ Метеорит +${bonus}💎`);
        }

        // Золотая лихорадка
        if (this.goldRushActive) {
            this.goldRushTimer--;
            if (this.goldRushTimer <= 0) {
                this.goldRushActive = false;
                this.events.push('Лихорадка закончилась');
            }
        }

        // Появление босса (шанс растёт с ростом счёта)
        if (!this.boss.active && Math.random() < 0.01 + this.score * 0.00001) {
            this.spawnBoss();
        }

        // Очистка логов событий
        const log = document.getElementById('eventLog');
        if (log) log.innerHTML = this.events.map(e => `<span class="event-popup">${e}</span>`).join('');
        this.events = [];

        this.updateUI();
        this.checkChallenge();
    },
    spawnBoss: function() {
        const level = Math.floor(Math.log2(this.score + 1)) + 1;
        this.boss.active = true;
        this.boss.level = level;
        this.boss.maxHealth = Math.floor(100 * level + this.score * 0.2);
        this.boss.health = this.boss.maxHealth;
        this.boss.reward = Math.floor(this.boss.maxHealth * 1.5);
        this.boss.name = ['Тень Неона', 'Кибер-демон', 'Гигантский слизень', 'Неоновый дракон'][level % 4];
        this.events.push(`⚔️ Босс ${this.boss.name} (ур.${level}) появился!`);
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
    renderUpgrades: function() {
        const container = document.getElementById('clickerUpgrades');
        if (!container) return;
        container.innerHTML = '';
        for (let key in this.upgrades) {
            const up = this.upgrades[key];
            const btn = document.createElement('button');
            btn.className = 'upgrade-btn';
            btn.innerHTML = `${up.icon || ''} ${up.name} ур.${up.level} <span class="cost">${up.cost}💎</span>`;
            btn.disabled = this.score < up.cost;
            btn.onclick = () => this.buyUpgrade(key);
            container.appendChild(btn);
        }
    },
    buyUpgrade: function(key) {
        const up = this.upgrades[key];
        if (this.score < up.cost) return;
        this.score -= up.cost;
        up.effect();
        if (key === 'gold') {
            this.goldRushActive = true;
            this.goldRushMult = 2;
            this.goldRushTimer = 5;
            this.events.push('✨ Золотая лихорадка!');
        }
        if (key === 'clone') {
            this.cloneActive = true;
            this.events.push('👥 Клон активирован!');
        }
        up.level++;
        up.cost = Math.floor(up.cost * 1.7);
        this.updateUI();
        this.renderUpgrades();
    },
    triggerEvent: function() {
        const r = Math.random();
        let msg = '';
        if (r < 0.3) {
            const bonus = Math.floor(this.perClick * 40 + this.perSec * 15) + 100;
            this.score += bonus;
            msg = `💎 Бонус +${bonus}`;
        } else if (r < 0.5) {
            const loss = Math.floor(this.score * 0.05);
            this.score = Math.max(0, this.score - loss);
            msg = `🔥 Потеря -${loss}`;
        } else if (r < 0.65) {
            msg = '🌀 Ничего';
        } else {
            msg = '✨ Магия';
        }
        this.events.push(msg);
    },
    generateChallenge: function() {
        if (this.challenge.active) return;
        const base = 50 + this.perClick * 10 + this.perSec * 8;
        this.challenge = {
            active: true,
            startScore: this.score,
            target: Math.floor(base),
            reward: Math.floor(base * 0.9)
        };
        const box = document.getElementById('challengeBox');
        if (box) box.textContent = `🎯 Набери ещё ${this.challenge.target}💎 (награда ${this.challenge.reward}💎)`;
    },
    checkChallenge: function() {
        if (!this.challenge.active) return;
        const progress = this.score - this.challenge.startScore;
        if (progress >= this.challenge.target) {
            this.score += this.challenge.reward;
            this.challenge.active = false;
            const box = document.getElementById('challengeBox');
            if (box) box.textContent = '✅ Челлендж выполнен!';
            this.updateUI();
            setTimeout(() => {
                if (box) box.textContent = '🎯 Челлендж: нет активных';
                this.generateChallenge();
            }, 1500);
        } else {
            const box = document.getElementById('challengeBox');
            if (box) box.textContent = `🎯 Набери ещё ${this.challenge.target - progress}💎 (награда ${this.challenge.reward}💎)`;
        }
    }
};