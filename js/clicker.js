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
    tickRate: 1000,
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

    prestige: {
        level: 0,
        multiplier: 1,
        nextAt: 1000000,
        baseReq: 1000000
    },
    daily: {
        date: '',
        tasks: [],
        completedToday: false
    },
    cards: [],
    allCards: [
        { id: 'c1', name: 'Неоновая искра', desc: '+1% к пассивному доходу', effect: function() { clicker.perSec = Math.floor(clicker.perSec * 1.01); } },
        { id: 'c2', name: 'Кристалл удачи', desc: '+2% шанс двойного клика', effect: function() { clicker.doubleClickChance += 0.02; } },
        { id: 'c3', name: 'Теневой клинок', desc: '+0.5 к силе клика', effect: function() { clicker.perClick += 0.5; } },
        { id: 'c4', name: 'Эхо пустоты', desc: '+1% шанс крита', effect: function() { clicker.critChance += 0.01; } },
        { id: 'c5', name: 'Золотой жук', desc: '+0.2% от счёта в секунду', effect: function() { clicker.bankPercent += 0.2; } }
    ],

    upgrades: {
        auto: { tier: 0, level: 0, baseCost: 15, costMult: 1.6, name: 'Автоклик', icon: '⚡', desc: '+1 пасс.доход', effect: function(lvl) { clicker.perSec += 1; } },
        power: { tier: 0, level: 0, baseCost: 10, costMult: 1.6, name: 'Сила клика', icon: '💪', desc: '+1 к урону клика', effect: function(lvl) { clicker.perClick += 1; } },
        critChance: { tier: 0, level: 0, baseCost: 50, costMult: 1.7, name: 'Крит. шанс', icon: '🎯', desc: '+2% шанс крита', effect: function(lvl) { clicker.critChance += 0.02; } },
        critPower: { tier: 0, level: 0, baseCost: 80, costMult: 1.8, name: 'Крит. урон', icon: '💥', desc: '+0.5x крит.множитель', effect: function(lvl) { clicker.critMult += 0.5; } },
        magnet: { tier: 1, level: 0, baseCost: 30, costMult: 1.7, name: 'Магнит', icon: '🧲', desc: '+3 пасс.доход', unlock: 200, effect: function(lvl) { clicker.perSec += 3; } },
        luck: { tier: 1, level: 0, baseCost: 100, costMult: 1.9, name: 'Удача', icon: '🍀', desc: '+5% двойной клик', unlock: 200, effect: function(lvl) { clicker.doubleClickChance += 0.05; } },
        goldRush: { tier: 1, level: 0, baseCost: 200, costMult: 2.0, name: 'Золотая лихорадка', icon: '✨', desc: 'Активирует x2 доход', unlock: 200, effect: function(lvl) {
            clicker.goldRushActive = true;
            clicker.goldRushMult = 2;
            clicker.goldRushTimer = 5 + lvl;
        }},
        comboMaster: { tier: 1, level: 0, baseCost: 150, costMult: 2.2, name: 'Комбо-мастер', icon: '🔥', desc: 'Макс. комбо +10, бонус +1%', unlock: 200, effect: function(lvl) {
            clicker.maxCombo = (clicker.maxCombo || 0) + 10;
            clicker.comboMultiplier = (clicker.comboMultiplier || 0) + 0.01;
        }},
        poison: { tier: 2, level: 0, baseCost: 150, costMult: 2.2, name: 'Яд', icon: '☠️', desc: '+3 урона боссу/сек', unlock: 1000, effect: function(lvl) { clicker.poisonDps += 3; } },
        meteor: { tier: 2, level: 0, baseCost: 250, costMult: 2.0, name: 'Метеоритный дождь', icon: '☄️', desc: 'Периодический бонус', unlock: 1000, effect: function(lvl) {
            clicker.meteorActive = true;
            clicker.meteorInterval = Math.max(5, 15 - lvl);
        }},
        clone: { tier: 2, level: 0, maxLevel: 1, baseCost: 500, costMult: 1, name: 'Клон', icon: '👥', desc: 'Удваивает силу клика', unlock: 1000, effect: function(lvl) { clicker.cloneActive = true; } },
        acceleration: { tier: 2, level: 0, maxLevel: 5, baseCost: 1000, costMult: 2.0, name: 'Ускорение', icon: '⏩', desc: 'Тик быстрее', unlock: 1000, effect: function(lvl) {
            clicker.tickRate = Math.max(500, 1000 - lvl * 100);
            if (clicker.tickIntervalId) {
                clearInterval(clicker.tickIntervalId);
                clicker.tickIntervalId = setInterval(() => clicker.autoTick(), clicker.tickRate);
            }
        }},
        bank: { tier: 3, level: 0, baseCost: 600, costMult: 2.5, name: 'Банк', icon: '🏦', desc: '+0.5% от счёта/сек', unlock: 5000, effect: function(lvl) { clicker.bankPercent += 0.5; } },
        aura: { tier: 3, level: 0, maxLevel: 1, baseCost: 800, costMult: 1, name: 'Аура', icon: '🟣', desc: 'x1.5 пассивный доход', unlock: 5000, effect: function(lvl) { clicker.perSec = Math.floor(clicker.perSec * 1.5); } },
        magnetField: { tier: 3, level: 0, baseCost: 1500, costMult: 2.2, name: 'Магнитное поле', icon: '🌀', desc: 'Период. процент от счёта', unlock: 5000, effect: function(lvl) {
            clicker.magnetFieldActive = true;
            clicker.magnetPercent += 5;
            clicker.magnetInterval = Math.max(8, 15 - lvl);
        }},
        bossBounty: { tier: 3, level: 0, maxLevel: 5, baseCost: 2500, costMult: 2.5, name: 'Охота на боссов', icon: '💰', desc: 'Награда за босса +25%', unlock: 5000, effect: function(lvl) { clicker.bossBounty += 0.25; } },
        superCrit: { tier: 4, level: 0, maxLevel: 1, baseCost: 2000, costMult: 1, name: 'Супер-крит', icon: '🌟', desc: 'Крит.шанс +10%, множитель x1.5', unlock: 20000, effect: function(lvl) {
            clicker.critChance += 0.1;
            clicker.critMult *= 1.5;
        }},
        quantum: { tier: 4, level: 0, maxLevel: 1, baseCost: 5000, costMult: 1, name: 'Квантовый клик', icon: '⚛️', desc: 'Каждый 10-й клик x5', unlock: 20000, effect: function(lvl) { clicker.quantumActive = true; } },
        blackHole: { tier: 4, level: 0, maxLevel: 1, baseCost: 8000, costMult: 1, name: 'Чёрная дыра', icon: '🕳️', desc: '2% макс. здоровья босса каждые 2с', unlock: 20000, effect: function(lvl) { clicker.blackHoleActive = true; } },
        chrono: { tier: 5, level: 0, maxLevel: 1, baseCost: 50000, costMult: 1, name: 'Хронос', icon: '⏳', desc: 'Замедляет босса на 30%', unlock: 100000, effect: function(lvl) { clicker.bossWeakness = 1.3; } },
        luckDragon: { tier: 5, level: 0, maxLevel: 5, baseCost: 30000, costMult: 2.5, name: 'Дракон удачи', icon: '🐉', desc: '+3% ко всем шансам', unlock: 100000, effect: function(lvl) {
            clicker.critChance += 0.03;
            clicker.doubleClickChance += 0.03;
        }}
    },

    init: function() {
        if (this.tickIntervalId) clearInterval(this.tickIntervalId);
        this.tickIntervalId = setInterval(() => this.autoTick(), this.tickRate);
        this.loadDaily();
        this.updateUI();
    },

    attachUI: function(elements) {
        this.ui = elements;
    },

    save: function() {
        try {
            const data = {
                score: this.score,
                perClick: this.perClick,
                perSec: this.perSec,
                critChance: this.critChance,
                critMult: this.critMult,
                doubleClickChance: this.doubleClickChance,
                maxCombo: this.maxCombo,
                comboMultiplier: this.comboMultiplier,
                poisonDps: this.poisonDps,
                meteorActive: this.meteorActive,
                meteorInterval: this.meteorInterval,
                cloneActive: this.cloneActive,
                bankPercent: this.bankPercent,
                tickRate: this.tickRate,
                magnetFieldActive: this.magnetFieldActive,
                magnetPercent: this.magnetPercent,
                magnetInterval: this.magnetInterval,
                bossBounty: this.bossBounty,
                quantumActive: this.quantumActive,
                blackHoleActive: this.blackHoleActive,
                stats: this.stats,
                prestige: this.prestige,
                daily: this.daily,
                cards: this.cards,
                upgrades: {}
            };
            for (let key in this.upgrades) {
                data.upgrades[key] = this.upgrades[key].level;
            }
            localStorage.setItem('starveClickerSave', JSON.stringify(data));
        } catch(e) {}
    },

    load: function() {
        try {
            const raw = localStorage.getItem('starveClickerSave');
            if (!raw) return;
            const data = JSON.parse(raw);
            this.score = data.score || 0;
            this.perClick = data.perClick || 1;
            this.perSec = data.perSec || 0;
            this.critChance = data.critChance || 0.1;
            this.critMult = data.critMult || 2;
            this.doubleClickChance = data.doubleClickChance || 0;
            this.maxCombo = data.maxCombo || 0;
            this.comboMultiplier = data.comboMultiplier || 0;
            this.poisonDps = data.poisonDps || 0;
            this.meteorActive = data.meteorActive || false;
            this.meteorInterval = data.meteorInterval || 15;
            this.cloneActive = data.cloneActive || false;
            this.bankPercent = data.bankPercent || 0;
            this.tickRate = data.tickRate || 1000;
            this.magnetFieldActive = data.magnetFieldActive || false;
            this.magnetPercent = data.magnetPercent || 0;
            this.magnetInterval = data.magnetInterval || 15;
            this.bossBounty = data.bossBounty || 1;
            this.quantumActive = data.quantumActive || false;
            this.blackHoleActive = data.blackHoleActive || false;
            this.stats = data.stats || { totalClicks: 0, totalEarned: 0, bossesDefeated: 0 };
            if (data.prestige) this.prestige = data.prestige;
            if (data.daily) this.daily = data.daily;
            if (data.cards) this.cards = data.cards;
            if (data.upgrades) {
                for (let key in data.upgrades) {
                    if (this.upgrades[key]) this.upgrades[key].level = data.upgrades[key];
                }
            }
            for (let key in this.upgrades) {
                const up = this.upgrades[key];
                for (let i = 1; i <= up.level; i++) {
                    up.effect(i);
                }
            }
            this.cards.forEach(id => {
                const card = this.allCards.find(c => c.id === id);
                if (card) card.effect();
            });
            if (this.tickIntervalId) clearInterval(this.tickIntervalId);
            this.tickIntervalId = setInterval(() => this.autoTick(), this.tickRate);
        } catch(e) {}
    },

    // --- Методы экспорта/импорта для GitHub синхронизации ---
    exportState: function() {
        const upgradesLevels = {};
        for (let key in this.upgrades) {
            upgradesLevels[key] = this.upgrades[key].level;
        }
        return {
            score: this.score,
            perClick: this.perClick,
            perSec: this.perSec,
            critChance: this.critChance,
            critMult: this.critMult,
            doubleClickChance: this.doubleClickChance,
            maxCombo: this.maxCombo,
            comboMultiplier: this.comboMultiplier,
            poisonDps: this.poisonDps,
            meteorActive: this.meteorActive,
            meteorInterval: this.meteorInterval,
            cloneActive: this.cloneActive,
            bankPercent: this.bankPercent,
            tickRate: this.tickRate,
            magnetFieldActive: this.magnetFieldActive,
            magnetPercent: this.magnetPercent,
            magnetInterval: this.magnetInterval,
            bossBounty: this.bossBounty,
            quantumActive: this.quantumActive,
            blackHoleActive: this.blackHoleActive,
            stats: { ...this.stats },
            prestige: { ...this.prestige },
            upgrades: upgradesLevels
        };
    },

    importState: function(state) {
        if (!state) return;
        this.score = state.score || 0;
        this.perClick = state.perClick || 1;
        this.perSec = state.perSec || 0;
        this.critChance = state.critChance || 0.1;
        this.critMult = state.critMult || 2;
        this.doubleClickChance = state.doubleClickChance || 0;
        this.maxCombo = state.maxCombo || 0;
        this.comboMultiplier = state.comboMultiplier || 0;
        this.poisonDps = state.poisonDps || 0;
        this.meteorActive = state.meteorActive || false;
        this.meteorInterval = state.meteorInterval || 15;
        this.cloneActive = state.cloneActive || false;
        this.bankPercent = state.bankPercent || 0;
        this.tickRate = state.tickRate || 1000;
        this.magnetFieldActive = state.magnetFieldActive || false;
        this.magnetPercent = state.magnetPercent || 0;
        this.magnetInterval = state.magnetInterval || 15;
        this.bossBounty = state.bossBounty || 1;
        this.quantumActive = state.quantumActive || false;
        this.blackHoleActive = state.blackHoleActive || false;
        if (state.stats) this.stats = { ...state.stats };
        if (state.prestige) this.prestige = { ...state.prestige };
        if (state.upgrades) {
            for (let key in state.upgrades) {
                if (this.upgrades[key]) this.upgrades[key].level = state.upgrades[key];
            }
        }
        // Переприменяем эффекты улучшений
        for (let key in this.upgrades) {
            const up = this.upgrades[key];
            for (let i = 1; i <= up.level; i++) {
                up.effect(i);
            }
        }
        if (this.tickIntervalId) clearInterval(this.tickIntervalId);
        this.tickIntervalId = setInterval(() => this.autoTick(), this.tickRate);
        this.updateUI();
        this.save();
    },

    handleClick: function(event) {
        if (this.comboTimer) clearTimeout(this.comboTimer);
        this.combo++;
        if (this.maxCombo > 0 && this.combo > this.maxCombo) this.combo = this.maxCombo;
        this.comboTimer = setTimeout(() => { this.combo = 0; this.updateComboDisplay(); }, 800);

        let gain = this.perClick;
        if (this.cloneActive) gain *= 2;
        if (this.comboMultiplier > 0 && this.combo > 0) {
            gain *= (1 + this.combo * this.comboMultiplier);
        }
        if (this.quantumActive) {
            this.quantumClicks = (this.quantumClicks || 0) + 1;
            if (this.quantumClicks >= 10) {
                gain *= 5;
                this.quantumClicks = 0;
            }
        }
        if (Math.random() < this.critChance) gain *= this.critMult;
        if (this.doubleClickChance > 0 && Math.random() < this.doubleClickChance) gain *= 2;

        gain *= this.prestige.multiplier;

        this.score += gain;
        this.stats.totalEarned += gain;

        let bossDefeated = false;
        if (this.boss.active) {
            this.boss.health -= gain;
            if (this.boss.health <= 0) {
                const reward = Math.floor(this.boss.reward * this.bossBounty * this.prestige.multiplier);
                this.score += reward;
                this.stats.bossesDefeated++;
                this.addEvent(`Босс ${this.boss.name} повержен! +${reward}💎`);
                if (Math.random() < 0.1 + this.prestige.level * 0.02) {
                    const newCard = this.allCards[Math.floor(Math.random() * this.allCards.length)];
                    if (!this.cards.includes(newCard.id)) {
                        this.cards.push(newCard.id);
                        newCard.effect();
                        this.addEvent(`🃏 Новая карта: ${newCard.name}!`);
                    }
                }
                this.boss.active = false;
                this.updateBossUI();
                bossDefeated = true;
                this.screenFlash();
            }
        }

        this.stats.totalClicks++;
        if (event) this.createRipple(event);
        this.spawnClickParticles(gain, bossDefeated);
        this.showFloatingNumber(gain);

        if (Math.random() < 0.01) this.triggerClickEvent();
        this.updateUI();
        this.updateComboDisplay();
        this.checkChallenge();
        this.checkDailyTasks(gain);
        if (this.ui.renderUpgrades) this.ui.renderUpgrades();
        this.save();
    },

    loadDaily: function() {
        const today = new Date().toISOString().slice(0,10);
        if (this.daily.date !== today) {
            this.daily.date = today;
            this.daily.tasks = this.generateDailyTasks();
            this.daily.completedToday = false;
        }
    },
    generateDailyTasks: function() {
        return [
            { desc: 'Кликни 500 раз', target: 500, progress: 0, reward: 10000, done: false },
            { desc: 'Убей 2 боссов', target: 2, progress: 0, reward: 25000, done: false },
            { desc: 'Заработай 100000 💎', target: 100000, progress: 0, reward: 50000, done: false }
        ];
    },
    checkDailyTasks: function(earned) {
        if (this.daily.completedToday) return;
        this.daily.tasks[0].progress = Math.min(this.stats.totalClicks, this.daily.tasks[0].target);
        this.daily.tasks[1].progress = Math.min(this.stats.bossesDefeated, this.daily.tasks[1].target);
        this.daily.tasks[2].progress = Math.min(this.daily.tasks[2].progress + earned, this.daily.tasks[2].target);
        if (this.daily.tasks.every(t => t.progress >= t.target)) {
            this.daily.completedToday = true;
            const totalReward = this.daily.tasks.reduce((s,t) => s + t.reward, 0);
            this.score += totalReward;
            this.addEvent(`🎯 Все ежедневные задания выполнены! +${totalReward}💎`);
        }
    },

    prestigeReset: function() {
        if (this.score < this.prestige.nextAt) return false;
        this.prestige.level++;
        this.prestige.multiplier = 1 + this.prestige.level * 0.1;
        this.prestige.nextAt = Math.floor(this.prestige.baseReq * Math.pow(1.5, this.prestige.level));
        this.score = 0;
        this.perClick = 1;
        this.perSec = 0;
        this.critChance = 0.1;
        this.critMult = 2;
        this.doubleClickChance = 0;
        this.maxCombo = 0;
        this.comboMultiplier = 0;
        this.poisonDps = 0;
        this.meteorActive = false;
        this.cloneActive = false;
        this.bankPercent = 0;
        this.tickRate = 1000;
        this.magnetFieldActive = false;
        this.magnetPercent = 0;
        this.bossBounty = 1;
        this.quantumActive = false;
        this.blackHoleActive = false;
        for (let key in this.upgrades) {
            this.upgrades[key].level = 0;
        }
        this.save();
        return true;
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
        add *= this.prestige.multiplier;

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
            if (this.blackHoleActive) {
                this._blackHoleTick = (this._blackHoleTick || 0) + this.tickRate/1000;
                if (this._blackHoleTick >= 2) {
                    this._blackHoleTick = 0;
                    this.boss.health -= this.boss.maxHealth * 0.02;
                }
            }
            this.boss.health -= bossDmg;
            if (this.boss.health <= 0) {
                const reward = Math.floor(this.boss.reward * this.bossBounty * this.prestige.multiplier);
                this.score += reward;
                this.stats.bossesDefeated++;
                this.addEvent(`Босс ${this.boss.name} уничтожен! +${reward}💎`);
                this.boss.active = false;
                this.screenFlash();
            }
            this.updateBossUI();
        } else {
            this.score += add;
        }

        if (this.poisonDps > 0 && this.boss.active) {
            this.boss.health -= this.poisonDps;
            if (this.boss.health <= 0) {
                const reward = Math.floor(this.boss.reward * this.bossBounty * this.prestige.multiplier);
                this.score += reward;
                this.stats.bossesDefeated++;
                this.addEvent(`Яд добил босса! +${reward}💎`);
                this.boss.active = false;
                this.screenFlash();
            }
            this.updateBossUI();
        }

        if (this.meteorActive) {
            this.meteorTimer++;
            if (this.meteorTimer >= this.meteorInterval) {
                this.meteorTimer = 0;
                const bonus = Math.floor((this.perSec * 20 + this.perClick * 15) * this.prestige.multiplier);
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
            this.ui.perSecEl.textContent = Math.floor(totalPerSec * this.prestige.multiplier);
        }
    },

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