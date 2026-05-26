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
    poisonDps: 0,
    meteorActive: false,
    meteorTimer: 0,
    meteorInterval: 15,
    cloneActive: false,
    bankPercent: 0,
    eventTimer: 0,
    upgrades: {
        auto: {
            level: 0, baseCost: 15,
            name: 'Автоклик', icon: '⚡', description: '+1 к пассивному доходу',
            effect: function() { clicker.perSec += 1; },
            unlockAt: 10
        },
        power: {
            level: 0, baseCost: 10,
            name: 'Сила клика', icon: '💪', description: '+1 к урону клика',
            effect: function() { clicker.perClick += 1; },
            unlockAt: 50
        },
        crit: {
            level: 0, baseCost: 30,
            name: 'Критический удар', icon: '🎯', description: 'Увеличивает множитель крита',
            effect: function() { clicker.critMult = 2 + clicker.upgrades.crit.level; },
            unlockAt: 150
        },
        magnet: {
            level: 0, baseCost: 20,
            name: 'Магнит', icon: '🧲', description: '+2 к пассивному доходу',
            effect: function() { clicker.perSec += 2; },
            unlockAt: 300
        },
        luck: {
            level: 0, baseCost: 50,
            name: 'Удача', icon: '🍀', description: 'Шанс двойного клика',
            effect: function() { clicker.doubleClickChance = 0.1 + clicker.upgrades.luck.level * 0.05; },
            unlockAt: 600
        },
        gold: {
            level: 0, baseCost: 100,
            name: 'Золотая лихорадка', icon: '✨', description: 'Активирует удвоение дохода на 5 сек',
            effect: function() { clicker.goldRushActive = true; clicker.goldRushMult = 2; clicker.goldRushTimer = 5; },
            unlockAt: 1000
        },
        poison: {
            level: 0, baseCost: 75,
            name: 'Ядовитое касание', icon: '☠️', description: 'Наносит урон боссам каждую секунду',
            effect: function() { clicker.poisonDps = clicker.upgrades.poison.level * 3; },
            unlockAt: 2000
        },
        meteor: {
            level: 0, baseCost: 120,
            name: 'Метеоритный дождь', icon: '☄️', description: 'Периодический бонус (требуется 1 уровень)',
            effect: function() { clicker.meteorActive = true; clicker.meteorInterval = Math.max(5, 15 - clicker.upgrades.meteor.level); },
            unlockAt: 4000
        },
        clone: {
            level: 0, baseCost: 200,
            name: 'Клон', icon: '👥', description: 'Удваивает силу каждого клика',
            effect: function() { clicker.cloneActive = true; },
            unlockAt: 8000
        },
        bank: {
            level: 0, baseCost: 300,
            name: 'Банк', icon: '🏦', description: 'Процент от счёта каждую секунду',
            effect: function() { clicker.bankPercent = clicker.upgrades.bank.level * 0.5; },
            unlockAt: 15000
        },
        aura: {
            level: 0, baseCost: 400,
            name: 'Неоновая аура', icon: '🟣', description: 'Увеличивает пассивный доход на 50%',
            effect: function() { clicker.perSec = Math.floor(clicker.perSec * 1.5); },
            unlockAt: 30000
        },
        superCrit: {
            level: 0, baseCost: 600,
            name: 'Супер-крит', icon: '💥', description: 'Шанс тройного крита',
            effect: function() { clicker.critChance = 0.3; clicker.critMult = Math.floor(clicker.critMult * 1.5); },
            unlockAt: 60000
        },
        slowBoss: {
            level: 0, baseCost: 800,
            name: 'Замедление боссов', icon: '🐌', description: 'Боссы теряют здоровье медленнее',
            effect: function() {},
            unlockAt: 100000
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

        let bossDefeated = false;
        if (this.boss.active) {
            this.boss.health -= gain;
            if (this.boss.health <= 0) {
                this.score += this.boss.reward;
                this.addEvent(`Босс ${this.boss.name} повержен! +${this.boss.reward}💎`);
                this.boss.active = false;
                this.updateBossUI();
                bossDefeated = true;
                // Эффекты при убийстве босса
                this.screenFlash();
                this.screenShake();
            }
        } else {
            this.score += gain;
        }

        this.spawnClickParticles(gain, bossDefeated);
        this.showFloatingNumber(gain);

        if (Math.random() < 0.01) {
            this.triggerClickEvent();
        }

        this.updateUI();
        this.checkChallenge();
        this.renderUpgradesList();
    },

    screenFlash: function() {
        const flash = document.createElement('div');
        flash.className = 'screen-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 500);
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

        const count = bossDefeated ? 30 : 8;
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 60;
            const size = Math.random() * 6 + 2;
            const hue = Math.random() * 60 + 270;
            particle.style.cssText = `
                position: fixed;
                left: ${cx}px;
                top: ${cy}px;
                width: ${size}px;
                height: ${size}px;
                background: hsl(${hue}, 100%, 70%);
                border-radius: 50%;
                pointer-events: none;
                z-index: 250;
                box-shadow: 0 0 ${size*2}px hsl(${hue}, 100%, 70%);
                animation: particleBurst 0.7s ease-out forwards;
                transform: translate(-50%, -50%);
                --tx: ${Math.cos(angle) * distance}px;
                --ty: ${Math.sin(angle) * distance}px;
            `;
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 700);
        }

        if (!document.getElementById('particle-style')) {
            const style = document.createElement('style');
            style.id = 'particle-style';
            style.textContent = `
                @keyframes particleBurst {
                    0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
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
        setTimeout(() => el.remove(), 1000);
    },

    addEvent: function(text) {
        const eventsContainer = document.getElementById('eventsContainer');
        if (!eventsContainer) return;
        const div = document.createElement('div');
        div.className = 'event-message';
        div.textContent = text;
        eventsContainer.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    },

    autoTick: function() {
        let add = this.perSec;
        if (this.goldRushActive) add *= this.goldRushMult;
        if (this.bankPercent > 0) add += this.score * (this.bankPercent / 100);

        if (this.boss.active) {
            let bossDamage = add;
            if (this.upgrades.slowBoss.level > 0) bossDamage *= 0.7;
            this.boss.health -= bossDamage;
            if (this.boss.health <= 0) {
                this.score += this.boss.reward;
                this.addEvent(`Босс ${this.boss.name} уничтожен! +${this.boss.reward}💎`);
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
                this.score += this.boss.reward;
                this.addEvent(`Яд расправился с боссом! +${this.boss.reward}💎`);
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
            this.addEvent('✨ Золотая лихорадка! x2 доход на 5 сек');
        }
        if (key === 'clone') {
            this.cloneActive = true;
            this.addEvent('👥 Клон активирован! Удвоение кликов');
        }
        if (key === 'slowBoss') {
            this.addEvent('🐌 Боссы теперь получают меньше урона от пассивного дохода');
        }
        up.level++;
        this.updateUI();
        this.renderUpgradesList();
    },

    triggerClickEvent: function() {
        const events = [
            { title: '⚡ Электрический разряд', sub: 'Босс (если есть) получает двойной урон на секунду', action: function() {
                if (clicker.boss.active) { clicker.boss.health -= clicker.perClick * 10; }
            } },
            { title: '💊 Адреналин', sub: 'Удвоение кликов на 5 секунд', action: function() {
                clicker.goldRushActive = true; clicker.goldRushMult = 2; clicker.goldRushTimer = 5;
            } },
            { title: '📦 Посылка', sub: 'Случайный бонус', action: function() {
                const bonus = Math.floor(Math.random() * 50) + 50;
                clicker.score += bonus;
                clicker.addEvent('+'+bonus+'💎');
            } },
            { title: '🌀 Искривление', sub: 'Ничего не произошло', action: function() {} }
        ];
        const chosen = events[Math.floor(Math.random() * events.length)];
        chosen.action();
        this.addEvent(chosen.title + ': ' + chosen.sub);
    },

    triggerPassiveEvent: function() {
        const events = [
            { title: '🌌 Неоновый шторм', sub: 'Весь доход удваивается на 3 секунды', action: function() {
                clicker.goldRushActive = true; clicker.goldRushMult = 2; clicker.goldRushTimer = 3;
            } },
            { title: '🛡️ Вторжение', sub: 'Босс (если есть) теряет 10% здоровья', action: function() {
                if (clicker.boss.active) clicker.boss.health *= 0.9;
            } },
            { title: '💰 Финансовая помощь', sub: 'Получено 5% от текущего счёта', action: function() {
                clicker.score += Math.floor(clicker.score * 0.05);
            } },
            { title: '🔋 Перезарядка', sub: 'Удвоение пассивного дохода на 5 секунд', action: function() {
                clicker.perSec *= 2;
                setTimeout(() => { clicker.perSec = Math.floor(clicker.perSec / 2); }, 5000);
            } }
        ];
        const chosen = events[Math.floor(Math.random() * events.length)];
        chosen.action();
        this.addEvent(chosen.title + ': ' + chosen.sub);
    },

    generateChallenge: function() {
        if (this.challenge.active) return;
        const base = 200 + this.perClick * 20 + this.perSec * 15;
        this.challenge = {
            active: true,
            startScore: this.score,
            target: Math.floor(base),
            reward: Math.floor(base * 1.5)
        };
        this.addEvent(`🎯 Новый челлендж: набери ${this.challenge.target}💎 (награда ${this.challenge.reward}💎)`);
    },

    checkChallenge: function() {
        if (!this.challenge.active) return;
        const progress = this.score - this.challenge.startScore;
        if (progress >= this.challenge.target) {
            this.score += this.challenge.reward;
            this.challenge.active = false;
            this.addEvent(`✅ Челлендж выполнен! +${this.challenge.reward}💎`);
            this.updateUI();
            setTimeout(() => this.generateChallenge(), 3000);
        }
    }
};