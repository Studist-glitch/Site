(function (global) {
'use strict';
const NB = global.NB;
const D = NB.daily = NB.daily || {};

const JUNK_SPAM = [
  '💊 Похудей за 7 дней!', '💰 Заработай 50000₽ из дома!', '🎰 Казино 777',
  '📱 iPhone 15 за 999₽', '🎓 Диплом за 2 дня', '💎 Крипта ×100',
  '🏠 Квартира в Сочи', '⚡ Электрик бесплатно', '🎁 Ты выиграл миллион', '🔮 Гадалка Аза'
];

D.spawnSpam = function () {
  if (!NB.state.game.unlocks.spam) return;
  if (document.querySelectorAll('.sn-spam.show').length >= 3) return;
  const g = NB.state.game;
  const cleanLvl = g.upgrades.autoClean || 0;
  if (cleanLvl > 0 && Math.random() < 0.5) return;
  const el = document.createElement('div');
  el.className = 'sn-spam';
  el.style.left = Math.max(10, Math.random() * (window.innerWidth - 260)) + 'px';
  el.style.top = Math.max(10, Math.random() * (window.innerHeight - 160)) + 'px';
  el.innerHTML = `<div class="sn-spam-brand">📣 Реклама <span>×</span></div><div class="sn-spam-body">${NB.pick(JUNK_SPAM)}</div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); };
  el.querySelector('span').addEventListener('click', e => { e.stopPropagation(); close(); });
  el.addEventListener('click', close);
  setTimeout(close, 5000);
};

/* ============ СОТРУДНИКИ — ПАССИВНЫЕ БОНУСЫ ============ */
D.getEmployeeBonuses = function () {
  const g = NB.state.game;
  const b = { support: 0, tech: 0, security: 0, sales: 0, ops: 0 };
  g.employees.forEach(e => {
    if (!e.spec || !(e.spec in b)) return;
    /* Бонус = уровень сотрудника * 1 + базовый 1 */
    const lvl = e.level || 1;
    const base = { support: 1, tech: 1, security: 1, sales: 1, ops: 1 }[e.spec] || 0;
    b[e.spec] += base + lvl - 1;
  });
  return b;
};

D.processEmployeePassives = function () {
  const g = NB.state.game;
  const b = D.getEmployeeBonuses();

  /* support: меньше оттока, автоплатежи успешнее (уже применено в advanceDay) */
  /* ops: больше AP max */
  const baseAp = 3 + Math.floor(Math.max(0, g.company.level - 1) / 3);
  const newApMax = baseAp + Math.floor(b.ops / 2);
  if (g.ap.max !== newApMax) {
    g.ap.max = newApMax;
    if (g.ap.current > g.ap.max) g.ap.current = g.ap.max;
  }

  /* tech: шанс автоматически починить сломанное */
  if (b.tech > 0 && Object.keys(g.upgradesBroken).length > 0) {
    const chance = Math.min(0.4, b.tech * 0.08);
    if (Math.random() < chance) {
      const broken = Object.keys(g.upgradesBroken);
      const victim = NB.pick(broken);
      delete g.upgradesBroken[victim];
      NB.addLog(`🔧 ${NB.game.UPGRADES[victim].name} починен техником`, 'success');
    }
  }

  /* security: снижает шанс взлома (применяется в processClientRisks) */
};

D.processClientRisks = function () {
  const g = NB.state.game;
  const b = D.getEmployeeBonuses();

  NB.state.clients.forEach(c => {
    if (c.status !== 'active' || c.isDrone) return;

    if (c.risk === 'hacker') {
      const firewallLvl = g.upgrades.firewall || 0;
      const chance = Math.max(0.003, 0.06 - firewallLvl * 0.015 - b.security * 0.02);
      if (Math.random() < chance) {
        const guardian = g.employees.find(e => e.ap.current > 0 && (e.skills.includes('protect') || e.skills.includes('hack')));
        if (guardian && Math.random() < 0.7) {
          NB.employees.spendAp(guardian.id, 1);
          NB.addLog(`🛡 ${guardian.name} отбил атаку «${c.name}»`, 'success');
        } else {
          const stolen = Math.min(Math.round(g.cash * 0.05), 8000);
          if (stolen > 0) {
            g.cash -= stolen;
            NB.addLog(`⚠ «${c.name}» взломал кассу: −${NB.money(stolen)}`, 'warn');
          }
        }
      }
    }

    if (c.risk === 'spammer') {
      const chance = Math.max(0.05, 0.15 - (g.upgrades.autoClean || 0) * 0.05);
      if (Math.random() < chance) {
        g.reputation = Math.max(0, g.reputation - 2);
        NB.addLog(`⚠ «${c.name}» рассылает спам: −2 реп`, 'warn');
        if (Math.random() < 0.5) setTimeout(() => D.spawnSpam(), 400);
      }
    }

    if (c.risk === 'unknown') {
      c.daysAsUnknown = (c.daysAsUnknown || 0) + 1;
      if (c.daysAsUnknown >= 3) {
        const rolls = ['good','good','normal','risky','risky','hacker','spammer'];
        c.risk = NB.pick(rolls);
        c.daysAsUnknown = 0;
        NB.notify(`🕵 «${c.name}» раскрыт: ${c.risk}`, 'info');
      }
    }

    if (c.risk === 'good' && Math.random() < 0.02) {
      const t = NB.tariff(c.tariffId);
      if (t) {
        g.pendingClients.push({
          id: g.pendingClientSeq++,
          name: NB.genName(), address: NB.genAddress(), phone: NB.genPhone(),
          tariffId: t.id, risk: 'good', revealed: true, referredBy: c.name
        });
        NB.addLog(`«${c.name}» привёл друга`, 'success');
      }
    }
  });
};

D.processOverload = function () {
  const g = NB.state.game;
  const load = NB.traffic.getLoad();
  if (load.percent <= 100) return;

  const severity = Math.min(3, (load.percent - 100) / 100);

  const active = NB.state.clients.filter(c => c.status === 'active' && !c.isDrone);
  if (active.length > 0 && Math.random() < 0.3 + severity * 0.4) {
    const count = Math.max(1, Math.round(severity * 2));
    for (let i = 0; i < count && active.length > 0; i++) {
      const v = NB.pick(active);
      NB.state.clients = NB.state.clients.filter(c => c.id !== v.id);
      NB.state.invoices = NB.state.invoices.filter(x => x.clientId !== v.id);
      NB.state.tickets = NB.state.tickets.filter(t => t.clientId !== v.id);
      NB.addLog(`«${v.name}» ушёл (перегрузка)`, 'warn');
      const idx = active.indexOf(v);
      if (idx > -1) active.splice(idx, 1);
    }
  }

  const repPenalty = Math.round(severity * 3);
  if (repPenalty > 0) {
    g.reputation = Math.max(0, g.reputation - repPenalty);
    NB.addLog(`Перегрузка сети: −${repPenalty} репутации`, 'warn');
  }

  if (load.percent > 200 && Math.random() < 0.15) {
    const broken = Object.keys(g.upgrades).filter(k => g.upgrades[k] > 0 && !g.upgradesBroken[k]);
    if (broken.length > 0) {
      const victim = NB.pick(broken);
      g.upgradesBroken[victim] = { brokenAt: g.daily.dayNumber, reason: 'Перегрузка' };
      NB.notify(`⚡ Перегрузка сломала: ${NB.game.UPGRADES[victim].name}`, 'warn');
    }
  }

  if (load.percent > 150) {
    document.body.classList.add('anomaly-glitch');
    setTimeout(() => document.body.classList.remove('anomaly-glitch'), 1500);
  }
};

D.processPricing = function () {
  const g = NB.state.game;
  const active = NB.state.clients.filter(c => c.status === 'active');
  if (active.length === 0) return;
  const avgPrice = active.reduce((s, c) => s + NB.price(c.tariffId), 0) / active.length;
  const affordable = 500;

  if (avgPrice > affordable * 2.5) {
    const excessRatio = avgPrice / (affordable * 2.5);
    if (Math.random() < 0.2 * excessRatio) {
      const v = NB.pick(active);
      NB.state.clients = NB.state.clients.filter(c => c.id !== v.id);
      NB.state.invoices = NB.state.invoices.filter(i => i.clientId !== v.id);
      NB.state.tickets = NB.state.tickets.filter(t => t.clientId !== v.id);
      NB.addLog(`«${v.name}» ушёл: слишком дорого`, 'warn');
      NB.toast('Клиент ушёл: слишком дорого', 'err');
    }
    if (Math.random() < 0.3) g.reputation = Math.max(0, g.reputation - 1);
  }

  if (avgPrice < affordable * 0.5) {
    if (Math.random() < 0.4) setTimeout(() => D.spawnSpam(), 500);
  }
};

/* ============ АНОМАЛИИ — УСИЛЕННЫЕ ============ */
D.processAnomaly = function () {
  const g = NB.state.game;

  /* Если мир спасён — аномалий больше нет */
  if (g.world.flags.worldSaved) return;

  if (g.world.threat < 1) return;
  const threat = g.world.threat;

  /* Глюки интерфейса на каждом шаге */
  if (Math.random() < 0.15 + threat * 0.03) {
    const duration = 300 + threat * 100;
    document.body.style.filter = `hue-rotate(${NB.randInt(-30, 30)}deg) contrast(${1 + Math.random() * 0.3})`;
    setTimeout(() => { document.body.style.filter = ''; }, duration);
  }

  /* Поломка текста — на threat >= 2 */
  if (threat >= 2 && Math.random() < 0.15 + threat * 0.02) {
    const els = NB.$$('.stat-value, .game-cash, .sim-bar .sim-date, .dt-text, .news-item span, h1, .muted');
    if (els.length) {
      const count = Math.min(els.length, 1 + Math.floor(threat / 2));
      for (let i = 0; i < count; i++) {
        const el = NB.pick(els);
        if (el && el.textContent && el.textContent.length < 50 && !el.classList.contains('glitch-text')) {
          NB.effects.glitch(el);
        }
      }
    }
  }

  /* Glitch на body при высоком threat */
  if (threat >= 4 && Math.random() < 0.15) {
    document.body.classList.add('anomaly-glitch');
    setTimeout(() => document.body.classList.remove('anomaly-glitch'), 500 + threat * 100);
  }

  if (threat >= 5 && Math.random() < 0.08) {
    NB.effects.shake(200);
    NB.effects.redFlash();
  }

  if (threat >= 7 && Math.random() < 0.05) {
    const loss = Math.min(2000, Math.round(g.cash * 0.02));
    if (loss > 0) {
      g.cash -= loss;
      NB.addLog(`⚠ Аномалия списала ${NB.money(loss)}`, 'warn');
    }
  }

  /* Красный пульс при threat >= 6 */
  if (threat >= 6) {
    if (!document.querySelector('.threat-critical')) {
      const overlay = document.createElement('div');
      overlay.className = 'threat-critical';
      overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9997;border:2px solid rgba(239,68,68,.6);box-shadow:inset 0 0 60px rgba(239,68,68,.4);animation:dangerPulse 1.5s infinite';
      document.body.appendChild(overlay);
      setTimeout(() => overlay.remove(), 3000);
    }
  }
};

D.processFamily = function () {
  const g = NB.state.game;
  if (!g.family.wife) return;
  g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness - 1);
  if (g.family.wifeHappiness === 0 && !g.family.crisisShown) {
    g.family.crisisShown = true;
    NB.notify(`💔 ${g.family.wife.name} на грани`, 'warn');
  }
  if (g.family.wifeHappiness === 0 && Math.random() < 0.25) {
    NB.notify(`💔 ${g.family.wife.name} ушла к родителям`, 'warn');
    NB.addLog(`${g.family.wife.name} ушла`, 'warn');
    g.family.wife = null;
    g.reputation = Math.max(0, g.reputation - 15);
  }
};

/* ============ ПРОВЕРКА ФИНАЛА ============ */
D.checkFinale = function () {
  const g = NB.state.game;

  /* Если мир спасён и threat дошёл до 0 — показать финал */
  if (g.world.flags.worldSaved && g.world.threat <= 0 && !g.world.flags.finaleShown) {
    g.world.flags.finaleShown = true;
    if (NB.showEndingScreen) NB.showEndingScreen('world_saved');
    return true;
  }
  return false;
};

D.advanceDay = function () {
  const st = NB.state;
  const g = st.game;
  if (g.stats.won || g.stats.lost) { NB.toast('Игра окончена', 'err'); return; }
  const check = NB.canAdvanceDay();
  if (!check.ok) { NB.toast(check.reason, 'err'); return; }

  /* Автосбор */
  if (g.upgrades.autoCollect > 0 && g.daily.pendingRevenue > 0) {
    g.cash += g.daily.pendingRevenue;
    NB.addLog(`Автосбор: +${NB.money(g.daily.pendingRevenue)}`, 'success');
  }

  const openT = st.tickets.filter(t => t.status === 'open');
  if (openT.length > 0) {
    const penalty = openT.length * 2;
    g.reputation = Math.max(0, g.reputation - penalty);
    NB.addLog(`Просрочено ${openT.length} заявок: −${penalty} реп`, 'warn');
  }

  const cost = NB.dailyCostEstimate();
  g.cash -= cost.total;
  g.stats.totalExpenses += cost.total;

  g.daily.dayNumber++;
  st.simDate = NB.addDays(st.simDate, 1);
  g.stats.daysPlayed++;
  g.daily.collectedToday = 0;
  g.daily.log = [{ text: `День ${g.daily.dayNumber}`, type: 'info' }];

  NB.resetAp();
  NB.checkUnlocks();
  D.processEmployeePassives();

  setTimeout(() => {
    const cashEl = document.getElementById('game-cash');
    if (cashEl) { cashEl.classList.add('flash'); setTimeout(() => cashEl.classList.remove('flash'), 800); }
    const xpEl = document.querySelector('.company-xp-mini');
    if (xpEl) { xpEl.classList.add('pulse'); setTimeout(() => xpEl.classList.remove('pulse'), 600); }
  }, 100);

  D.processOverload();

  const load = NB.traffic.getLoad();
  if (load.percent > 100) {
    const decay = Math.round((load.percent - 100) * 0.4);
    g.network.stability = Math.max(0, g.network.stability - decay);
    NB.addLog(`⚠ Перегрузка: −${decay} стабильности`, 'warn');
  } else if (load.percent < 70) {
    g.network.stability = Math.min(100, g.network.stability + 3);
  }

  const bon = D.getEmployeeBonuses();
  const churn = 0.04
    * (1 - (g.upgrades.support || 0) * 0.15 - (g.upgrades.bandwidth || 0) * 0.1 - bon.support * 0.08)
    * (1 + (100 - g.reputation) / 200)
    * (1 + (100 - g.network.stability) / 150);
  if (Math.random() < Math.max(0.005, churn)) {
    const active = st.clients.filter(c => c.status === 'active' && !c.isDrone);
    if (active.length > 3) {
      const v = NB.pick(active);
      st.clients = st.clients.filter(c => c.id !== v.id);
      st.invoices = st.invoices.filter(i => i.clientId !== v.id);
      st.tickets = st.tickets.filter(t => t.clientId !== v.id);
      NB.addLog(`«${v.name}» ушёл${g.network.stability < 50 ? ' (плохая сеть)' : ''}`, 'warn');
    }
  }

  D.processClientRisks();
  D.processPricing();
  D.processFamily();

  /* Аномалия — только если мир не спасён */
  if (!g.world.flags.worldSaved) {
    D.processAnomaly();
  } else if (g.world.threat > 0) {
    /* Мир спасён — threat постепенно падает до 0 */
    g.world.threat = Math.max(0, g.world.threat - 1);
    if (g.world.threat === 0) {
      NB.notify('🌍 Тишина. Аномалии исчезли.', 'ok');
      NB.addLog('Все аномалии прекратились', 'success');
    }
  }

  /* Новые клиенты */
  const base = 2 + (g.upgrades.marketing || 0) * 1 + bon.sales * 0.5;
  const activeNow = st.clients.filter(c => c.status === 'active');
  const avgPrice = activeNow.reduce((s, c) => s + NB.price(c.tariffId), 0) / Math.max(1, activeNow.length);
  const priceFactor = avgPrice < 400 ? 1.5 : avgPrice < 600 ? 1.0 : avgPrice < 900 ? 0.6 : 0.3;
  const cnt = Math.max(1, Math.round((base + NB.randInt(0, 2)) * priceFactor));

  for (let i = 0; i < cnt; i++) {
    const t = NB.pick(st.tariffs);
    const roll = Math.random();
    let risk = 'normal', revealed = true, name, phone, address;
    const cheapPenalty = t.price < 400 ? 0.15 : 0;
    if (roll < 0.55 - cheapPenalty) { risk = 'good'; }
    else if (roll < 0.75 - cheapPenalty) { risk = 'normal'; }
    else if (roll < 0.88) { risk = 'risky'; }
    else if (roll < 0.94) { risk = 'hacker'; }
    else if (roll < 0.98) { risk = 'spammer'; }
    else { risk = 'unknown'; revealed = false; }
    if (risk === 'unknown') {
      name = '❓ Неизвестный клиент'; phone = '—'; address = 'нет данных';
    } else {
      name = g.world.drones.enabled && Math.random() < 0.2 ? NB.genDroneName() : NB.genName();
      phone = NB.genPhone(); address = NB.genAddress();
    }
    g.pendingClients.push({ id: g.pendingClientSeq++, name, address, phone, tariffId: t.id, risk, revealed });
  }
  NB.addLog(`Новые клиенты: ${cnt}`, 'info');

  /* Заявки */
  const active = st.clients.filter(c => c.status === 'active');
  if (active.length > 0 && Math.random() < 0.75) {
    const tCount = NB.randInt(1, 2);
    for (let i = 0; i < tCount; i++) {
      const c = NB.pick(active);
      if (NB.chat && NB.chat.createTicket) NB.chat.createTicket(c.id);
    }
    NB.addLog(`Новых заявок: ${tCount}`, 'info');
  }

  if (NB.invoices && NB.invoices.generateForDay) NB.invoices.generateForDay();
  if (NB.invoices && NB.invoices.processOverdue) NB.invoices.processOverdue();

  const dom = NB.parseDate(st.simDate).getDate();
  if (dom === 1) {
    const curP = st.simDate.slice(0, 7);
    let created = 0;
    st.clients.forEach(c => {
      if (st.invoices.some(i => i.clientId === c.id && i.period === curP)) return;
      st.invoices.push({ id: st.seq.invoice++, clientId: c.id, period: curP, amount: NB.price(c.tariffId), status: 'unpaid', paidAt: null });
      created++;
    });
    if (created) NB.addLog(`Выставлено ${created} счетов`, 'info');
  }

  /* Автооплата */
  st.invoices.forEach(inv => {
    if (inv.status !== 'unpaid') return;
    const c = NB.client(inv.clientId);
    if (!c || c.status !== 'active') return;
    const chance = 0.4 + (g.upgrades.support || 0) * 0.05 + bon.support * 0.03;
    if (Math.random() < chance && c.balance >= inv.amount) {
      c.balance -= inv.amount;
      inv.status = 'paid';
      inv.paidAt = new Date().toISOString();
    }
  });

  g.daily.pendingRevenue = NB.dailyIncomeEstimate().total;

  st.revenue.push({ date: st.simDate, amount: g.daily.pendingRevenue });
  if (st.revenue.length > 90) st.revenue.shift();
  st.growth.push({ date: st.simDate, count: st.clients.length });
  if (st.growth.length > 90) st.growth.shift();
  g.stats.totalRevenue += g.daily.pendingRevenue;

  NB.addCompanyXp(10);
  NB.game.updateMarketShare();
  if (NB.competitors && NB.competitors.tick && g.unlocks.competitors) NB.competitors.tick();

  let ev = false;
  if (Math.random() < 0.28) { NB.game.triggerEvent(); ev = true; }

  if (NB.story && NB.story.tick) NB.story.tick();

  if (g.unlocks.spam) {
    const spammers = st.clients.filter(c => c.risk === 'spammer').length;
    const chance = 0.2 + g.company.level * 0.05 + spammers * 0.08;
    if (Math.random() < chance) setTimeout(() => D.spawnSpam(), 400 + Math.random() * 800);
  }

  /* Проверка финала — раньше Cynessa */
  const finaleShown = D.checkFinale();
  if (finaleShown) { NB.save(); NB.render(); return; }

  /* Cynessa-end */
  if (g.world.threat >= 8 && !g.world.flags.worldSaved && !g.world.endingTriggered) {
    const bunkerMultiplier = g.world.bunker.built ? 0.5 : 1.0;
    if (Math.random() < 0.18 * bunkerMultiplier) {
      NB.showCynessaEnding();
      return;
    }
  }

  NB.checkGameState();
  NB.save();
  NB.render();

  setTimeout(() => {
    if (g.world.storyQueue.length) NB.story.showNextInQueue();
    else if (ev) NB.game.showEventModal();
  }, 350);
};

})(window);