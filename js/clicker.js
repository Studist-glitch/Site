window.clicker = {
    score: 0,
    perClick: 1,
    perSec: 0,
    critChance: 0.1,
    critMult: 2,
    doubleClickChance: 0,
    combo: 0,
    maxCombo: 0,
    comboTimer: null,
    comboMultiplier: 0,
    goldRushActive: false,
    goldRushMult: 1,
    goldRushTimer: 0,
    boss: { active: false, health: 0, maxHealth: 0, reward: 0, name: 'Тень Неона', level: 1 },
    poisonDps: 0,
    meteorActive: false,
    meteorTimer: 0,
    meteorInterval: 15,
    cloneActive: false,
    bankPercent: 0,
    eventTimer: 0,
    tickIntervalId: null,
    tickRate: 1000, // ms
    magnetFieldActive: false,
    magnetInterval: 15,
    magnetPercent: 0,
    bossBounty: 1,
    bossWeakness: 1,
    quantumClicks: 0,
    quantumActive: false,
    blackHoleActive: false,
    comboMasterLevel: 0,
    stats: { totalClicks: 0, totalEarned: 0, bossesDefeated: 0 },
    ui: {},

    // Улучшения сгруппированы по тирам
    upgrades: {
        // Тир 0 (всегда)
        auto: { tier: 0, level: 0, baseCost: 15, costMult: 1.6, name: 'Автоклик', icon: '⚡', desc: '+1 пасс.доход', effect: function(lvl) { clicker.perSec += 1; } },
        power: { tier: 0, level: 0, baseCost: 10, costMult: 1.6, name: 'Сила клика', icon: '💪', desc: '+1 к урону клика', effect: function(lvl) { clicker.perClick += 1; } },
        critChance: { tier: 0, level: 0, baseCost: 50, costMult: 1.7, name: 'Крит. шанс', icon: '🎯', desc: '+2% шанс крита (тек: ' + (clicker.critChance*100).toFixed(0) + '%)', effect: function(lvl) { clicker.critChance += 0.02; } },
        critPower: { tier: 0, level: 0, baseCost: 80, costMult: 1.8, name: 'Крит. урон', icon: '💥', desc: '+0.5x крит.множитель (тек: ' + clicker.critMult.toFixed(1) + 'x)', effect: function(lvl) { clicker.critMult += 0.5; } },
        // Тир 1 (открывается при 200)
        magnet: { tier: 1, level: 0, baseCost: 30, costMult: 1.7, name: 'Магнит', icon: '🧲', desc: '+3 пасс.доход', unlock: 200, effect: function(lvl) { clicker.perSec += 3; } },
        luck: { tier: 1, level: 0, baseCost: 100, costMult: 1.9, name: 'Удача', icon: '🍀', desc: '+5% двойной клик', unlock: 200, effect: function(lvl) { clicker.doubleClickChance += 0.05; } },
        goldRush: { tier: 1, level: 0, baseCost: 200, costMult: 2.0, name: 'Золотая лихорадка', icon: '✨', desc: 'Активирует x2 доход на ' + (5 + clicker.upgrades.goldRush.level) + ' сек', unlock: 200, effect: function(lvl) {
            clicker.goldRushActive = true;
            clicker.goldRushMult = 2;
            clicker.goldRushTimer = 5 + lvl;
        }},
        comboMaster: { tier: 1, level: 0, baseCost: 150, costMult: 2.2, name: 'Комбо-мастер', icon: '🔥', desc: 'Макс. комбо +10, бонус за комбо +1%', unlock: 200, effect: function(lvl) {
            clicker.maxCombo = (clicker.maxCombo || 0) + 10;
            clicker.comboMultiplier = (clicker.comboMultiplier || 0) + 0.01;
        }},
        // Тир 2 (открывается при 1000)
        poison: { tier: 2, level: 0, baseCost: 150, costMult: 2.2, name: 'Яд', icon: '☠️', desc: '+3 урона боссу/сек', unlock: 1000, effect: function(lvl) { clicker.poisonDps += 3; } },
        meteor: { tier: 2, level: 0, baseCost: 250, costMult: 2.0, name: 'Метеоритный дождь', icon: '☄️', desc: 'Периодический бонус, интервал ' + clicker.meteorInterval + 'с', unlock: 1000, effect: function(lvl) {
            clicker.meteorActive = true;
            clicker.meteorInterval = Math.max(5, 15 - lvl);
        }},
        clone: { tier: 2, level: 0, maxLevel: 1, baseCost: 500, costMult: 1, name: 'Клон', icon: '👥', desc: 'Удваивает силу клика', unlock: 1000, effect: function(lvl) { clicker.cloneActive = true; } },
        acceleration: { tier: 2, level: 0, maxLevel: 5, baseCost: 1000, costMult: 2.0, name: 'Ускорение', icon: '⏩', desc: 'Тик на 0.1с быстрее (тек: ' + (clicker.tickRate/1000).toFixed(1) + 'с)', unlock: 1000, effect: function(lvl) {
            clicker.tickRate = Math.max(500, 1000 - lvl * 100);
            if (clicker.tickIntervalId) {
                clearInterval(clicker.tickIntervalId);
                clicker.tickIntervalId = setInterval(() => clicker.autoTick(), clicker.tickRate);
            }
        }},
        // Тир 3 (открывается при 5000)
        bank: { tier: 3, level: 0, baseCost: 600, costMult: 2.5, name: 'Банк', icon: '🏦', desc: '+0.5% от счёта/сек', unlock: 5000, effect: function(lvl) { clicker.bankPercent += 0.5; } },
        aura: { tier: 3, level: 0, maxLevel: 1, baseCost: 800, costMult: 1, name: 'Аура', icon: '🟣', desc: 'x1.5 пассивный доход', unlock: 5000, effect: function(lvl) { clicker.perSec = Math.floor(clicker.perSec * 1.5); } },
        magnetField: { tier: 3, level: 0, baseCost: 1500, costMult: 2.2, name: 'Магнитное поле', icon: '🌀', desc: 'Каждые ' + clicker.magnetInterval + 'с +5% от счёта', unlock: 5000, effect: function(lvl) {
            clicker.magnetFieldActive = true;
            clicker.magnetPercent += 5;
            clicker.magnetInterval = Math.max(8, 15 - lvl);
        }},
        bossBounty: { tier: 3, level: 0, maxLevel: 5, baseCost: 2500, costMult: 2.5, name: 'Охота на боссов', icon: '💰', desc: 'Награда за босса +25%', unlock: 5000, effect: function(lvl) { clicker.bossBounty += 0.25; } },
        // Тир 4 (открывается при 20000)
        superCrit: { tier: 4, level: 0, maxLevel: 1, baseCost: 2000, costMult: 1, name: 'Супер-крит', icon: '🌟', desc: 'Крит.шанс +10%, множитель x1.5', unlock: 20000, effect: function(lvl) {
            clicker.critChance += 0.1;
            clicker.critMult *= 1.5;
        }},
        quantum: { tier: 4, level: 0, maxLevel: 1, baseCost: 5000, costMult: 1, name: 'Квантовый клик', icon: '⚛️', desc: 'Каждый 10-й клик x5', unlock: 20000, effect: function(lvl) { clicker.quantumActive = true; } },
        blackHole: { tier: 4, level: 0, maxLevel: 1, baseCost: 8000, costMult: 1, name: 'Чёрная дыра', icon: '🕳️', desc: '2% макс. здоровья босса каждые 2с', unlock: 20000, effect: function(lvl) { clicker.blackHoleActive = true; } },
    },

    init: function() {
        if (this.tickIntervalId) clearInterval(this.tickIntervalId);
        this.tickIntervalId = setInterval(() => this.autoTick(), this.tickRate);
        this.updateUI();
    },

    attachUI: function(elements) {
        this.ui = elements;
    },

    handleClick: function(event) {
        // Комбо
        if (this.comboTimer) clearTimeout(this.comboTimer);
        this.combo++;
        if (this.maxCombo > 0 && this.combo > this.maxCombo) this.combo = this.maxCombo;
        this.comboTimer = setTimeout(() => { this.combo = 0; this.updateComboDisplay(); }, 800);

        let gain = this.perClick;
        if (this.cloneActive) gain *= 2;
        // Комбо-бонус
        if (this.comboMultiplier > 0 && this.combo > 0) {
            gain *= (1 + this.combo * this.comboMultiplier);
        }
        // Квантовый клик
        if (this.quantumActive) {
            this.quantumClicks = (this.quantumClicks || 0) + 1;
            if (this.quantumClicks >= 10) {
                gain *= 5;
                this.quantumClicks = 0;
            }
        }
        // Криты и двойной клик
        if (Math.random() < this.critChance) gain *= this.critMult;
        if (this.doubleClickChance > 0 && Math.random() < this.doubleClickChance) gain *= 2;

        let bossDefeated = false;
        if (this.boss.active) {
            let dmg = gain;
            if (this.bossWeakness !== 1) dmg *= this.bossWeakness; // на будущее
            this.boss.health -= dmg;
            if (this.boss.health <= 0) {
                const reward = Math.floor(this.boss.reward * this.bossBounty);
                this.score += reward;
                this.stats.bossesDefeated++;
                this.addEvent(`Босс ${this.boss.name} повержен! +${reward}💎`);
                this.boss.active = false;
                this.updateBossUI();
                bossDefeated = true;
                this.screenFlash();
                this.screenShake();
            }
        } else {
            this.score += gain;
        }
        this.stats.totalClicks++;
        this.stats.totalEarned += gain;

        if (event) this.createRipple(event);
        this.spawnClickParticles(gain, bossDefeated);
        this.showFloatingNumber(gain);

        if (Math.random() < 0.01) this.triggerClickEvent();

        this.updateUI();
        this.updateComboDisplay();
        this.checkChallenge();
        if (this.ui.renderUpgrades) this.ui.renderUpgrades();
    },

    createRipple: function(e) {
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    },

    updateComboDisplay: function() {
        if (this.ui.comboEl) {
            this.ui.comboEl.textContent = this.combo > 0 ? `Комбо x${this.combo} (бонус ${(this.comboMultiplier*this.combo*100).toFixed(0)}%)` : '';
        }
    },

    screenFlash: function() {
        const flash = document.createElement('div');
        flash.className = 'screen-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 400);
    },

    screenShake: function() {
        document.body.classList.add('screen-shake');
        setTimeout(() => document.body.classList.remove('screen-shake'), 300);
    },

    spawnClickParticles: function(amount, bossDefeated) {
        const btn = document.getElementById('clickerBtn');
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width/2;
        const cy = rect.top + rect.height/2;
        const count = bossDefeated ? 16 : 5;
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 40;
            const size = Math.random() * 3 + 1;
            particle.style.cssText = `
                position: fixed;
                left: ${cx}px;
                top: ${cy}px;
                width: ${size}px;
                height: ${size}px;
                background: #c44eff;
                border-radius: 50%;
                pointer-events: none;
                z-index: 250;
                opacity: 0.7;
                box-shadow: 0 0 4px #c44eff;
                animation: particleBurst 0.5s ease-out forwards;
                transform: translate(-50%, -50%);
                --tx: ${Math.cos(angle) * distance}px;
                --ty: ${Math.sin(angle) * distance}px;
            `;
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 500);
        }
        if (!document.getElementById('particle-style')) {
            const style = document.createElement('style');
            style.id = 'particle-style';
            style.textContent = `
                @keyframes particleBurst {
                    0% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); }
                }
            `;
            document.head.appendChild(style);
        }
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
        setTimeout(() => el.remove(), 800);
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

    autoTick: function() {
        let add = this.perSec;
        if (this.goldRushActive) add *= this.goldRushMult;
        if (this.bankPercent > 0) add += this.score * (this.bankPercent / 100);

        // Магнитное поле
        if (this.magnetFieldActive) {
            this._magnetTick = (this._magnetTick || 0) + this.tickRate/1000;
            if (this._magnetTick >= this.magnetInterval) {
                this._magnetTick = 0;
                const bonus = Math.floor(this.score * (this.magnetPercent / 100));
                this.score += bonus;
                this.addEvent(`🌀 Магнитное поле +${bonus}💎`);
            }
        }

        if (this.boss.active) {
            let bossDmg = add;
            if (this.upgrades.slowBoss && this.upgrades.slowBoss.level > 0) bossDmg *= 0.7; // если бы было
            this.boss.health -= bossDmg;
            if (this.blackHoleActive) {
                this._blackHoleTick = (this._blackHoleTick || 0) + this.tickRate/1000;
                if (this._blackHoleTick >= 2) {
                    this._blackHoleTick = 0;
                    this.boss.health -= this.boss.maxHealth * 0.02;
                }
            }
            if (this.boss.health <= 0) {
                const reward = Math.floor(this.boss.reward * this.bossBounty);
                this.score += reward;
                this.stats.bossesDefeated++;
                this.addEvent(`Босс ${this.boss.name} уничтожен! +${reward}💎`);
                this.boss.active = false;
                this.screenFlash();
                this.screenShake();
            }
            this.updateBossUI();
        } else {
            this.score += add;
        }

        if (this.poisonDps > 0 && this.boss.active) {
            this.boss.health -= this.poisonDps;
            if (this.boss.health <= 0) {
                const reward = Math.floor(this.boss.reward * this.bossBounty);
                this.score += reward;
                this.stats.bossesDefeated++;
                this.addEvent(`Яд добил босса! +${reward}💎`);
                this.boss.active = false;
                this.screenFlash();
                this.screenShake();
            }
            this.updateBossUI();
        }

        if (this.meteorActive) {
            this.meteorTimer++;
            if (this.meteorTimer >= this.meteorInterval) {
                this.meteorTimer = 0;
                const bonus = Math.floor(this.perSec * 20 + this.perClick * 15);
                this.score += bonus;
                this.addEvent(`☄️ Метеоритный дождь +${bonus}💎`);
            }
        }

        if (this.goldRushActive) {
            this.goldRushTimer--;
            if (this.goldRushTimer <= 0) {
                this.goldRushActive = false;
                this.addEvent('Лихорадка закончилась');
            }
        }

        if (!this.boss.active && Math.random() < 0.01 + this.score * 0.00002) {
            this.spawnBoss();
        }

        this.eventTimer++;
        if (this.eventTimer >= 20 + Math.floor(Math.random() * 15)) {
            this.eventTimer = 0;
            this.triggerPassiveEvent();
        }

        this.updateUI();
        this.checkChallenge();
    },

    spawnBoss: function() {
        const level = Math.floor(Math.log2(this.score + 1)) + 1;
        this.boss.active = true;
        this.boss.level = level;
        this.boss.maxHealth = Math.floor(300 * level + this.score * 0.4);
        this.boss.health = this.boss.maxHealth;
        this.boss.reward = Math.floor(this.boss.maxHealth * 2);
        const names = ['Тень Неона', 'Кибер-демон', 'Гигантский слизень', 'Неоновый дракон', 'Робот-убийца', 'Электрический элементаль'];
        this.boss.name = names[level % names.length];
        this.addEvent(`⚔️ Босс ${this.boss.name} (ур.${level}) появился!`);
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
        if (this.ui.scoreEl) this.ui.scoreEl.textContent = Math.floor(this.score);
        if (this.ui.perSecEl) {
            let totalPerSec = this.perSec * (this.goldRushActive ? this.goldRushMult : 1);
            if (this.bankPercent) totalPerSec += this.score * (this.bankPercent/100);
            this.ui.perSecEl.textContent = Math.floor(totalPerSec);
        }
    },

    // Статистика для вкладки
    getStats: function() {
        return {
            score: Math.floor(this.score),
            perClick: this.perClick,
            perSec: this.perSec,
            critChance: (this.critChance*100).toFixed(0) + '%',
            critMult: this.critMult.toFixed(1) + 'x',
            totalClicks: this.stats.totalClicks,
            totalEarned: Math.floor(this.stats.totalEarned),
            bossesDefeated: this.stats.bossesDefeated,
            tickRate: this.tickRate
        };
    },

    challenge: { active: false, startScore: 0, target: 0, reward: 0 },
    generateChallenge: function() {
        if (this.challenge.active) return;
        const base = 200 + this.perClick * 20 + this.perSec * 15;
        this.challenge = { active: true, startScore: this.score, target: Math.floor(base), reward: Math.floor(base * 1.5) };
        this.addEvent(`🎯 Новый челлендж: набери ${this.challenge.target}💎 (награда ${this.challenge.reward}💎)`);
    },
    checkChallenge: function() {
        if (!this.challenge.active) return;
        if (this.score - this.challenge.startScore >= this.challenge.target) {
            this.score += this.challenge.reward;
            this.challenge.active = false;
            this.addEvent(`✅ Челлендж выполнен! +${this.challenge.reward}💎`);
            this.updateUI();
            setTimeout(() => this.generateChallenge(), 3000);
        }
    },

    triggerClickEvent: function() {
        const events = [
            { title: '⚡ Разряд', sub: 'Урон боссу', action: () => { if (clicker.boss.active) clicker.boss.health -= clicker.perClick * 10; } },
            { title: '💊 Адреналин', sub: 'x2 клики на 5с', action: () => { clicker.goldRushActive = true; clicker.goldRushMult = 2; clicker.goldRushTimer = 5; } },
            { title: '📦 Посылка', sub: 'Случайный бонус', action: () => { clicker.score += Math.floor(Math.random()*50)+50; } },
            { title: '🌀 Искривление', sub: 'Ничего', action: () => {} }
        ];
        const ev = events[Math.floor(Math.random()*events.length)];
        ev.action();
        this.addEvent(ev.title + ': ' + ev.sub);
    },

    triggerPassiveEvent: function() {
        const events = [
            { title: '🌌 Шторм', sub: 'x2 на 3с', action: () => { clicker.goldRushActive=true; clicker.goldRushMult=2; clicker.goldRushTimer=3; } },
            { title: '🛡️ Вторжение', sub: 'Босс -10% здоровья', action: () => { if(clicker.boss.active) clicker.boss.health *= 0.9; } },
            { title: '💰 Помощь', sub: '+5% счёта', action: () => { clicker.score += Math.floor(clicker.score*0.05); } },
            { title: '🔋 Перезарядка', sub: 'x2 пасс.доход на 5с', action: () => { clicker.perSec *= 2; setTimeout(()=>clicker.perSec=Math.floor(clicker.perSec/2),5000); } }
        ];
        const ev = events[Math.floor(Math.random()*events.length)];
        ev.action();
        this.addEvent(ev.title + ': ' + ev.sub);
    }
};