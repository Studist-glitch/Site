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
    boss: { active: false, health: 0, maxHealth: 0, reward: 0 },
    upgrades: {
        auto: { level: 0, cost: 15, name: 'Автоклик', effect: () => { window.clicker.perSec += 1; } },
        power: { level: 0, cost: 10, name: 'Сила клика', effect: () => { window.clicker.perClick += 1; } },
        crit: { level: 0, cost: 30, name: 'Крит (шанс 20%)', effect: () => { window.clicker.critMult = 2 + window.clicker.upgrades.crit.level; } },
        magnet: { level: 0, cost: 20, name: 'Магнит (+2/сек)', effect: () => { window.clicker.perSec += 2; } },
        luck: { level: 0, cost: 50, name: 'Удача (двойной клик 10%)', effect: () => { window.clicker.doubleClickChance = 0.1 + window.clicker.upgrades.luck.level * 0.05; } },
        gold: { level: 0, cost: 100, name: 'Золотая лихорадка (5 сек x2)', effect: () => {} }
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
        if (Math.random() < this.critChance) gain *= this.critMult;
        if (this.doubleClickChance > 0 && Math.random() < this.doubleClickChance) gain *= 2;

        if (this.boss.active) {
            this.boss.health -= gain;
            if (this.boss.health <= 0) {
                this.score += this.boss.reward;
                this.events.push(`Босс повержен! +${this.boss.reward}💎`);
                this.boss.active = false;
                this.updateBossUI();
            }
        } else {
            this.score += gain;
            if (Math.random() < 0.12) this.triggerEvent();
        }
        this.updateUI();
        this.checkChallenge();
        this.renderUpgrades();
    },
    autoTick: function() {
        if (this.perSec > 0) {
            let add = this.perSec;
            if (this.goldRushActive) add *= this.goldRushMult;
            if (this.boss.active) {
                this.boss.health -= add;
                if (this.boss.health <= 0) {
                    this.score += this.boss.reward;
                    this.events.push(`Босс повержен! +${this.boss.reward}💎`);
                    this.boss.active = false;
                }
                this.updateBossUI();
            } else {
                this.score += add;
            }
            this.updateUI();
            this.checkChallenge();
        }
        if (this.goldRushActive) {
            this.goldRushTimer--;
            if (this.goldRushTimer <= 0) {
                this.goldRushActive = false;
                this.events.push('Лихорадка кончилась');
            }
        }
        if (!this.boss.active && Math.random() < 0.02) this.spawnBoss(); // 2% шанс в секунду
        const log = document.getElementById('eventLog');
        if (log) log.innerHTML = this.events.map(e => `<span class="event-popup">${e}</span>`).join('');
        this.events = [];
    },
    spawnBoss: function() {
        this.boss.active = true;
        this.boss.maxHealth = Math.floor(50 + this.score * 0.1);
        this.boss.health = this.boss.maxHealth;
        this.boss.reward = Math.floor(this.boss.maxHealth * 2);
        this.events.push('Босс появился!');
        this.updateBossUI();
    },
    updateBossUI: function() {
        const container = document.getElementById('bossContainer');
        if (!container) return;
        if (this.boss.active) {
            container.style.display = 'block';
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
            btn.textContent = `${up.name} ур.${up.level} (${up.cost}💎)`;
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
            this.events.push('Золотая лихорадка!');
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
            const bonus = Math.floor(this.perClick * 40) + Math.floor(this.perSec * 15) + 80;
            this.score += bonus;
            msg = `+${bonus}💎`;
        } else if (r < 0.5) {
            const loss = Math.floor(this.score * 0.06);
            this.score = Math.max(0, this.score - loss);
            msg = `-${loss}💎`;
        } else {
            msg = '✨ Близко!';
        }
        this.events.push(msg);
    },
    generateChallenge: function() {
        if (this.challenge.active) return;
        const base = 30 + this.perClick * 8 + this.perSec * 6;
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