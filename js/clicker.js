// js/clicker.js - Исправлен: экспорт upgradesDef, восстановлена прокачка
window.clicker = (function() {
    'use strict';

    // ---------- Upgrade Manager ----------
    const upgradeManager = new UpgradeManager('clickerUpgrades', {
        auto: 0, power: 0, critChance: 0, critPower: 0, magnet: 0, luck: 0, goldRush: 0,
        comboMaster: 0, poison: 0, meteor: 0, clone: 0, acceleration: 0, bank: 0, aura: 0,
        magnetField: 0, bossBounty: 0, superCrit: 0, quantum: 0, blackHole: 0, chrono: 0, luckDragon: 0
    });

    // ---------- Game state ----------
    let score = 0;
    let perClick = 1;
    let perSec = 0;
    let critChance = 0.1;
    let critMult = 2;
    let doubleClickChance = 0;
    let combo = 0;
    let maxCombo = 0;
    let comboMultiplier = 0;
    let poisonDps = 0;
    let meteorActive = false;
    let meteorInterval = 15;
    let cloneActive = false;
    let bankPercent = 0;
    let tickRate = 1000;
    let magnetFieldActive = false;
    let magnetPercent = 0;
    let magnetInterval = 15;
    let bossBounty = 1;
    let quantumActive = false;
    let blackHoleActive = false;
    let goldRushActive = false;
    let goldRushMult = 1;
    let goldRushTimer = 0;
    let meteorTimer = 0;
    let magnetTick = 0;
    let blackHoleTick = 0;
    let eventTimer = 0;
    let quantumClicks = 0;
    let comboTimeout = null;
    let tickInterval = null;
    let onGameOverCallback = null;

    const stats = { totalClicks: 0, totalEarned: 0, bossesDefeated: 0 };
    let prestige = { level: 0, multiplier: 1, nextAt: 1000000, baseReq: 1000000 };
    let boss = { active: false, health: 0, maxHealth: 0, reward: 0, name: 'Тень Неона', level: 1 };
    let challenge = { active: false, startScore: 0, target: 0, reward: 0 };

    // UI elements
    let ui = { scoreEl: null, perSecEl: null, comboEl: null, renderUpgrades: null };

    // ---------- Upgrade definitions (экспортируются) ----------
    const upgradesDef = {
        auto: { tier: 0, baseCost: 15, costMult: 1.6, name: 'Автоклик', icon: '⚡', maxLevel: Infinity, desc: '+1 к пассивному доходу', effect: (lvl) => { perSec += 1; } },
        power: { tier: 0, baseCost: 10, costMult: 1.6, name: 'Сила клика', icon: '💪', maxLevel: Infinity, desc: '+1 к урону клика', effect: (lvl) => { perClick += 1; } },
        critChance: { tier: 0, baseCost: 50, costMult: 1.7, name: 'Крит. шанс', icon: '🎯', maxLevel: Infinity, desc: '+2% шанс крита', effect: (lvl) => { critChance += 0.02; } },
        critPower: { tier: 0, baseCost: 80, costMult: 1.8, name: 'Крит. урон', icon: '💥', maxLevel: Infinity, desc: '+0.5x крит.множитель', effect: (lvl) => { critMult += 0.5; } },
        magnet: { tier: 1, baseCost: 30, costMult: 1.7, name: 'Магнит', icon: '🧲', maxLevel: Infinity, desc: '+3 к пассивному доходу', effect: (lvl) => { perSec += 3; } },
        luck: { tier: 1, baseCost: 100, costMult: 1.9, name: 'Удача', icon: '🍀', maxLevel: Infinity, desc: '+5% шанс двойного клика', effect: (lvl) => { doubleClickChance += 0.05; } },
        goldRush: { tier: 1, baseCost: 200, costMult: 2.0, name: 'Золотая лихорадка', icon: '✨', maxLevel: Infinity, desc: 'Активирует x2 доход на 5+ур. сек', effect: (lvl) => { goldRushActive = true; goldRushMult = 2; goldRushTimer = 5 + lvl; } },
        comboMaster: { tier: 1, baseCost: 150, costMult: 2.2, name: 'Комбо-мастер', icon: '🔥', maxLevel: Infinity, desc: '+10 макс. комбо, +1% бонус за комбо', effect: (lvl) => { maxCombo += 10; comboMultiplier += 0.01; } },
        poison: { tier: 2, baseCost: 150, costMult: 2.2, name: 'Яд', icon: '☠️', maxLevel: Infinity, desc: '+3 урона боссу каждую секунду', effect: (lvl) => { poisonDps += 3; } },
        meteor: { tier: 2, baseCost: 250, costMult: 2.0, name: 'Метеоритный дождь', icon: '☄️', maxLevel: Infinity, desc: 'Периодический бонус', effect: (lvl) => { meteorActive = true; meteorInterval = Math.max(5, 15 - lvl); } },
        clone: { tier: 2, baseCost: 500, costMult: 1, name: 'Клон', icon: '👥', maxLevel: 1, desc: 'Удваивает урон клика', effect: (lvl) => { cloneActive = true; } },
        acceleration: { tier: 2, baseCost: 1000, costMult: 2.0, name: 'Ускорение', icon: '⏩', maxLevel: 5, desc: 'Уменьшает интервал тика', effect: (lvl) => { tickRate = Math.max(500, 1000 - lvl * 100); if (tickInterval) { clearInterval(tickInterval); tickInterval = setInterval(autoTick, tickRate); } } },
        bank: { tier: 3, baseCost: 600, costMult: 2.5, name: 'Банк', icon: '🏦', maxLevel: Infinity, desc: '+0.5% от счёта в секунду', effect: (lvl) => { bankPercent += 0.5; } },
        aura: { tier: 3, baseCost: 800, costMult: 1, name: 'Аура', icon: '🟣', maxLevel: 1, desc: 'Увеличивает пассивный доход на 50%', effect: (lvl) => { perSec = Math.floor(perSec * 1.5); } },
        magnetField: { tier: 3, baseCost: 1500, costMult: 2.2, name: 'Магнитное поле', icon: '🌀', maxLevel: Infinity, desc: 'Периодический бонус от счёта', effect: (lvl) => { magnetFieldActive = true; magnetPercent += 5; magnetInterval = Math.max(8, 15 - lvl); } },
        bossBounty: { tier: 3, baseCost: 2500, costMult: 2.5, name: 'Охота на боссов', icon: '💰', maxLevel: 5, desc: '+25% награды за босса', effect: (lvl) => { bossBounty += 0.25; } },
        superCrit: { tier: 4, baseCost: 2000, costMult: 1, name: 'Супер-крит', icon: '🌟', maxLevel: 1, desc: '+10% шанс крита, x1.5 крит.множитель', effect: (lvl) => { critChance += 0.1; critMult *= 1.5; } },
        quantum: { tier: 4, baseCost: 5000, costMult: 1, name: 'Квантовый клик', icon: '⚛️', maxLevel: 1, desc: 'Каждый 10й клик x5', effect: (lvl) => { quantumActive = true; } },
        blackHole: { tier: 4, baseCost: 8000, costMult: 1, name: 'Чёрная дыра', icon: '🕳️', maxLevel: 1, desc: 'Наносит 2% здоровья босса каждые 2с', effect: (lvl) => { blackHoleActive = true; } },
        chrono: { tier: 5, baseCost: 50000, costMult: 1, name: 'Хронос', icon: '⏳', maxLevel: 1, desc: 'Останавливает время (пауза босса и событий)', effect: (lvl) => {} },
        luckDragon: { tier: 5, baseCost: 30000, costMult: 2.5, name: 'Дракон удачи', icon: '🐉', maxLevel: 5, desc: '+3% крит.шанс, +3% двойной клик', effect: (lvl) => { critChance += 0.03; doubleClickChance += 0.03; } }
    };

    // ---------- Helper functions ----------
    function updateUI() {
        if (ui.scoreEl) ui.scoreEl.textContent = Math.floor(score);
        if (ui.perSecEl) {
            let totalPerSec = perSec * (goldRushActive ? goldRushMult : 1);
            if (bankPercent) totalPerSec += score * (bankPercent / 100);
            ui.perSecEl.textContent = Math.floor(totalPerSec * prestige.multiplier);
        }
        if (ui.comboEl) ui.comboEl.textContent = combo > 0 ? `Комбо x${combo} (бонус ${(comboMultiplier * combo * 100).toFixed(0)}%)` : '';
        updateBossUI();
        if (ui.renderUpgrades) ui.renderUpgrades();
    }

    function updateBossUI() {
        const container = document.getElementById('bossContainer');
        if (!container) return;
        if (boss.active) {
            container.style.display = 'block';
            const nameEl = document.getElementById('bossName');
            const barEl = document.getElementById('bossHealthBar');
            const textEl = document.getElementById('bossHealthText');
            if (nameEl) nameEl.textContent = `${boss.name} ур.${boss.level}`;
            if (barEl) barEl.style.width = (boss.health / boss.maxHealth * 100) + '%';
            if (textEl) textEl.textContent = `${Math.ceil(boss.health)} / ${boss.maxHealth}`;
        } else {
            container.style.display = 'none';
        }
    }

    function addEvent(text) {
        const container = document.getElementById('eventsContainer');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'event-message';
        div.textContent = text;
        container.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }

    function flashScreen() {
        const flash = document.createElement('div');
        flash.className = 'screen-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 400);
    }

    function spawnClickParticles(amount, bossDefeated) {
        const btn = document.getElementById('clickerBtn');
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const count = bossDefeated ? 16 : 5;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 40;
            const size = Math.random() * 3 + 1;
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed; left: ${cx}px; top: ${cy}px;
                width: ${size}px; height: ${size}px; background: #c44eff;
                border-radius: 50%; pointer-events: none; z-index: 250;
                opacity: 0.7; box-shadow: 0 0 4px #c44eff;
                animation: particleBurst 0.5s ease-out forwards;
                transform: translate(-50%, -50%);
                --tx: ${Math.cos(angle) * distance}px;
                --ty: ${Math.sin(angle) * distance}px;
            `;
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 500);
        }
    }

    function showFloatingNumber(value) {
        const container = document.getElementById('clickerArea');
        if (!container) return;
        const el = document.createElement('span');
        el.className = 'float-number';
        el.textContent = '+' + Math.floor(value);
        el.style.left = (40 + Math.random() * 30) + '%';
        el.style.top = (20 + Math.random() * 30) + '%';
        container.appendChild(el);
        setTimeout(() => el.remove(), 800);
    }

    function createRipple(e) {
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
    }

    function triggerPassiveEvent() {
        const events = [
            { title: '🌌 Шторм', sub: 'x2 на 3с', action: () => { goldRushActive = true; goldRushMult = 2; goldRushTimer = 3; } },
            { title: '🛡️ Вторжение', sub: 'Босс -10% здоровья', action: () => { if (boss.active) boss.health *= 0.9; } },
            { title: '💰 Помощь', sub: '+5% счёта', action: () => { score += Math.floor(score * 0.05); } },
            { title: '🔋 Перезарядка', sub: 'x2 пасс.доход на 5с', action: () => { perSec *= 2; setTimeout(() => perSec /= 2, 5000); } }
        ];
        const ev = events[Math.floor(Math.random() * events.length)];
        ev.action();
        addEvent(ev.title + ': ' + ev.sub);
    }

    function triggerClickEvent() {
        const events = [
            { title: '⚡ Разряд', sub: 'Урон боссу', action: () => { if (boss.active) boss.health -= perClick * 10; } },
            { title: '💊 Адреналин', sub: 'x2 клики на 5с', action: () => { goldRushActive = true; goldRushMult = 2; goldRushTimer = 5; } },
            { title: '📦 Посылка', sub: 'Случайный бонус', action: () => { score += Math.floor(Math.random() * 50) + 50; } },
            { title: '🌀 Искривление', sub: 'Ничего', action: () => {} }
        ];
        const ev = events[Math.floor(Math.random() * events.length)];
        ev.action();
        addEvent(ev.title + ': ' + ev.sub);
    }

    function generateChallenge() {
        if (challenge.active) return;
        const base = 200 + perClick * 20 + perSec * 15;
        challenge = { active: true, startScore: score, target: Math.floor(base), reward: Math.floor(base * 1.5) };
        addEvent(`🎯 Новый челлендж: набери ${challenge.target}💎 (награда ${challenge.reward}💎)`);
    }

    function checkChallenge() {
        if (!challenge.active) return;
        if (score - challenge.startScore >= challenge.target) {
            score += challenge.reward;
            challenge.active = false;
            addEvent(`✅ Челлендж выполнен! +${challenge.reward}💎`);
            updateUI();
            setTimeout(() => generateChallenge(), 3000);
        }
    }

    function save() {
        try {
            const data = exportState();
            localStorage.setItem('starveClickerSave', JSON.stringify(data));
        } catch(e) {}
    }

    function load() {
        try {
            const raw = localStorage.getItem('starveClickerSave');
            if (raw) importState(JSON.parse(raw));
        } catch(e) {}
    }

    // ---------- Auto-tick ----------
    function autoTick() {
        let add = perSec;
        if (goldRushActive) add *= goldRushMult;
        if (bankPercent > 0) add += score * (bankPercent / 100);
        add *= prestige.multiplier;

        if (magnetFieldActive) {
            magnetTick += tickRate / 1000;
            if (magnetTick >= magnetInterval) {
                magnetTick = 0;
                const bonus = Math.floor(score * (magnetPercent / 100));
                score += bonus;
                addEvent(`🌀 Магнитное поле +${bonus}💎`);
            }
        }

        if (boss.active) {
            let bossDmg = add;
            if (blackHoleActive) {
                blackHoleTick += tickRate / 1000;
                if (blackHoleTick >= 2) {
                    blackHoleTick = 0;
                    boss.health -= boss.maxHealth * 0.02;
                }
            }
            boss.health -= bossDmg;
            if (boss.health <= 0) {
                const reward = Math.floor(boss.reward * bossBounty * prestige.multiplier);
                score += reward;
                stats.bossesDefeated++;
                addEvent(`Босс ${boss.name} уничтожен! +${reward}💎`);
                boss.active = false;
                flashScreen();
            }
            updateBossUI();
        } else {
            score += add;
        }

        if (poisonDps > 0 && boss.active) {
            boss.health -= poisonDps;
            if (boss.health <= 0) {
                const reward = Math.floor(boss.reward * bossBounty * prestige.multiplier);
                score += reward;
                stats.bossesDefeated++;
                addEvent(`Яд добил босса! +${reward}💎`);
                boss.active = false;
                flashScreen();
            }
            updateBossUI();
        }

        if (meteorActive) {
            meteorTimer++;
            if (meteorTimer >= meteorInterval) {
                meteorTimer = 0;
                const bonus = Math.floor((perSec * 20 + perClick * 15) * prestige.multiplier);
                score += bonus;
                addEvent(`☄️ Метеоритный дождь +${bonus}💎`);
            }
        }

        if (goldRushActive) {
            goldRushTimer--;
            if (goldRushTimer <= 0) {
                goldRushActive = false;
                addEvent('Лихорадка закончилась');
            }
        }

        if (!boss.active && Math.random() < 0.01 + score * 0.00002) spawnBoss();

        eventTimer++;
        if (eventTimer >= 20 + Math.floor(Math.random() * 15)) {
            eventTimer = 0;
            triggerPassiveEvent();
        }

        updateUI();
        checkChallenge();
    }

    function spawnBoss() {
        const level = Math.floor(Math.log2(score + 1)) + 1;
        boss.active = true;
        boss.level = level;
        boss.maxHealth = Math.floor(300 * level + score * 0.4);
        boss.health = boss.maxHealth;
        boss.reward = Math.floor(boss.maxHealth * 2);
        const names = ['Тень Неона', 'Кибер-демон', 'Гигантский слизень', 'Неоновый дракон', 'Робот-убийца', 'Электрический элементаль'];
        boss.name = names[level % names.length];
        addEvent(`⚔️ Босс ${boss.name} (ур.${level}) появился!`);
        updateBossUI();
    }

    // ---------- Click handling ----------
    function handleClick(e) {
        if (comboTimeout) clearTimeout(comboTimeout);
        combo++;
        if (maxCombo > 0 && combo > maxCombo) combo = maxCombo;
        comboTimeout = setTimeout(() => { combo = 0; updateUI(); }, 800);

        let gain = perClick;
        if (cloneActive) gain *= 2;
        if (comboMultiplier > 0 && combo > 0) gain *= (1 + combo * comboMultiplier);
        if (quantumActive) {
            quantumClicks++;
            if (quantumClicks >= 10) { gain *= 5; quantumClicks = 0; }
        }
        if (Math.random() < critChance) gain *= critMult;
        if (Math.random() < doubleClickChance) gain *= 2;
        gain *= prestige.multiplier;

        score += gain;
        stats.totalEarned += gain;
        stats.totalClicks++;

        let bossDefeated = false;
        if (boss.active) {
            boss.health -= gain;
            if (boss.health <= 0) {
                const reward = Math.floor(boss.reward * bossBounty * prestige.multiplier);
                score += reward;
                stats.bossesDefeated++;
                addEvent(`Босс ${boss.name} повержен! +${reward}💎`);
                boss.active = false;
                bossDefeated = true;
                flashScreen();
                updateBossUI();
            }
        }

        if (e) createRipple(e);
        spawnClickParticles(gain, bossDefeated);
        showFloatingNumber(gain);
        if (Math.random() < 0.01) triggerClickEvent();
        updateUI();
        checkChallenge();
        save();
    }

    // ---------- Prestige ----------
    function prestigeReset() {
        if (score < prestige.nextAt) return false;
        prestige.level++;
        prestige.multiplier = 1 + prestige.level * 0.1;
        prestige.nextAt = Math.floor(prestige.baseReq * Math.pow(1.5, prestige.level));
        score = 0;
        perClick = 1;
        perSec = 0;
        critChance = 0.1;
        critMult = 2;
        doubleClickChance = 0;
        maxCombo = 0;
        comboMultiplier = 0;
        poisonDps = 0;
        meteorActive = false;
        cloneActive = false;
        bankPercent = 0;
        tickRate = 1000;
        magnetFieldActive = false;
        magnetPercent = 0;
        bossBounty = 1;
        quantumActive = false;
        blackHoleActive = false;
        upgradeManager.reset();
        for (let key in upgradeManager.upgrades) upgradeManager.set(key, 0);
        save();
        return true;
    }

    // ---------- Upgrade buying ----------
    function buyUpgrade(key) {
        const up = upgradesDef[key];
        if (!up) return;
        const currentLevel = upgradeManager.get(key);
        const cost = Math.floor(up.baseCost * Math.pow(up.costMult, currentLevel));
        if (score < cost) return;
        if (up.maxLevel && currentLevel >= up.maxLevel) return;
        score -= cost;
        upgradeManager.increment(key);
        // Apply effect for the new level
        up.effect(currentLevel + 1);
        updateUI();
        save();
        if (ui.renderUpgrades) ui.renderUpgrades();
    }

    // ---------- Export / Import ----------
    function exportState() {
        const upgrades = {};
        for (let key in upgradeManager.upgrades) upgrades[key] = upgradeManager.get(key);
        return {
            score, perClick, perSec, critChance, critMult, doubleClickChance, maxCombo, comboMultiplier,
            poisonDps, meteorActive, meteorInterval, cloneActive, bankPercent, tickRate, magnetFieldActive,
            magnetPercent, magnetInterval, bossBounty, quantumActive, blackHoleActive,
            stats: { ...stats }, prestige: { ...prestige }, upgrades
        };
    }

    function importState(data) {
        if (!data) return;
        score = data.score || 0;
        perClick = data.perClick || 1;
        perSec = data.perSec || 0;
        critChance = data.critChance || 0.1;
        critMult = data.critMult || 2;
        doubleClickChance = data.doubleClickChance || 0;
        maxCombo = data.maxCombo || 0;
        comboMultiplier = data.comboMultiplier || 0;
        poisonDps = data.poisonDps || 0;
        meteorActive = data.meteorActive || false;
        meteorInterval = data.meteorInterval || 15;
        cloneActive = data.cloneActive || false;
        bankPercent = data.bankPercent || 0;
        tickRate = data.tickRate || 1000;
        magnetFieldActive = data.magnetFieldActive || false;
        magnetPercent = data.magnetPercent || 0;
        magnetInterval = data.magnetInterval || 15;
        bossBounty = data.bossBounty || 1;
        quantumActive = data.quantumActive || false;
        blackHoleActive = data.blackHoleActive || false;
        if (data.stats) Object.assign(stats, data.stats);
        if (data.prestige) Object.assign(prestige, data.prestige);
        if (data.upgrades) {
            for (let key in data.upgrades) {
                upgradeManager.set(key, data.upgrades[key]);
            }
        }
        // Re-apply upgrade effects
        for (let key in upgradesDef) {
            const lvl = upgradeManager.get(key);
            for (let i = 1; i <= lvl; i++) upgradesDef[key].effect(i);
        }
        if (tickInterval) clearInterval(tickInterval);
        tickInterval = setInterval(autoTick, tickRate);
        updateUI();
    }

    // ---------- Initialization ----------
    function init() {
        load();
        if (tickInterval) clearInterval(tickInterval);
        tickInterval = setInterval(autoTick, tickRate);
        generateChallenge();
        updateUI();
    }

    function attachUI(elements) {
        ui = elements;
    }

    function getStats() {
        return {
            score: Math.floor(score), perClick, perSec, critChance: (critChance * 100).toFixed(0) + '%',
            critMult: critMult.toFixed(1) + 'x', totalClicks: stats.totalClicks,
            totalEarned: Math.floor(stats.totalEarned), bossesDefeated: stats.bossesDefeated,
            tickRate
        };
    }

    // Public API
    return {
        init, attachUI, handleClick, buyUpgrade, getStats, updateUI, updateBossUI,
        exportState, importState, save, load, prestigeReset, generateChallenge,
        get upgrades() { return upgradeManager.upgrades; },
        get upgradesDef() { return upgradesDef; },
        get score() { return score; },
        get perClick() { return perClick; },
        get perSec() { return perSec; },
        get critChance() { return critChance; },
        get critMult() { return critMult; },
        get doubleClickChance() { return doubleClickChance; },
        get combo() { return combo; },
        get maxCombo() { return maxCombo; },
        get comboMultiplier() { return comboMultiplier; },
        get poisonDps() { return poisonDps; },
        get meteorActive() { return meteorActive; },
        get meteorInterval() { return meteorInterval; },
        get cloneActive() { return cloneActive; },
        get bankPercent() { return bankPercent; },
        get tickRate() { return tickRate; },
        get magnetFieldActive() { return magnetFieldActive; },
        get magnetPercent() { return magnetPercent; },
        get magnetInterval() { return magnetInterval; },
        get bossBounty() { return bossBounty; },
        get quantumActive() { return quantumActive; },
        get blackHoleActive() { return blackHoleActive; },
        get stats() { return stats; },
        get prestige() { return prestige; },
        get boss() { return boss; },
        get challenge() { return challenge; }
    };
})();