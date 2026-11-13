(function (global) {
'use strict';
const NB = global.NB;
const D = NB.daily = NB.daily || {};

const JUNK_SPAM = [
  '💊 Похудей за 7 дней! Жми →',
  '💰 Заработай 50000₽ из дома. Без опыта!',
  '🎰 Казино 777 — первый депозит удвоен',
  '📱 iPhone 15 за 999₽ — только сегодня',
  '🎓 Диплом за 2 дня без экзаменов',
  '💎 Крипта ×100 за неделю. Проверено!',
  '🏠 Квартира в Сочи за 100 000₽',
  '⚡ Электрик бесплатно — вызови сейчас',
  '📚 100 книг за 1₽. Подписка.',
  '🎁 Ты выиграл миллион! Забери приз',
  '🍕 Пицца бесплатно при заказе от 500₽',
  '🔮 Гадалка Аза — снимет порчу по фото'
];

D.spawnSpam = function () {
    if (!NB.state.game.unlocks.spam) return;
  if (document.querySelectorAll('.sn-spam.show').length >= 2) return;
  const g = NB.state.game;
  const st = NB.state.settings;
  if (st.reduceAds && Math.random() < 0.6) return;
  const cleanLvl = g.upgrades.autoClean || 0;
  if (cleanLvl > 0 && Math.random() < 0.7) return;
  const el = document.createElement('div');
  el.className = 'sn-spam';
  const x = Math.random() * (window.innerWidth - 260);
  const y = Math.random() * (window.innerHeight - 160);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.innerHTML = `<div class="sn-spam-brand">📣 Реклама <span>×</span></div>
    <div class="sn-spam-body">${NB.pick(JUNK_SPAM)}</div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); };
  el.querySelector('span').addEventListener('click', e => { e.stopPropagation(); close(); });
  el.addEventListener('click', close);
  setTimeout(close, 5000);
};

/* Обработка рискованных клиентов */
D.processClientRisks = function () {
  const g = NB.state.game;
  const st = NB.state;
  
  st.clients.forEach(c => {
    if (c.status !== 'active' || c.isDrone) return;
    
    if (c.risk === 'hacker') {
      const firewallLvl = g.upgrades.firewall || 0;
      const chance = Math.max(0.01, 0.05 - firewallLvl * 0.015);
      if (Math.random() < chance) {
        const stolen = Math.min(Math.round(g.cash * 0.05), 8000);
        if (stolen > 0) {
          g.cash -= stolen;
          NB.addLog(`⚠ «${c.name}» взломал кассу: −${NB.money(stolen)}`, 'warn');
        }
      }
    }
    
    if (c.risk === 'spammer') {
      const chance = Math.max(0.02, 0.10 - (g.upgrades.autoClean || 0) * 0.05);
      if (Math.random() < chance) {
        g.reputation = Math.max(0, g.reputation - 2);
        NB.addLog(`⚠ «${c.name}» рассылает спам: −2 реп`, 'warn');
      }
    }
    
    if (c.risk === 'unknown') {
      c.daysAsUnknown = (c.daysAsUnknown || 0) + 1;
      if (c.daysAsUnknown >= 3) {
        const rolls = ['good', 'good', 'normal', 'risky', 'risky', 'hacker', 'spammer'];
        c.risk = NB.pick(rolls);
        c.daysAsUnknown = 0;
        NB.notify(`🕵 «${c.name}» раскрыт: ${
          c.risk === 'good' ? 'надёжный' :
          c.risk === 'risky' ? 'рискованный' :
          c.risk === 'hacker' ? 'взломщик' :
          c.risk === 'spammer' ? 'спамер' : 'обычный'
        }`, 'info');
        NB.addLog(`«${c.name}» раскрыт: ${c.risk}`, 'info');
      }
    }
    
    if (c.risk === 'good' && Math.random() < 0.02) {
      const t = NB.tariff(c.tariffId);
      if (t) {
        g.pendingClients.push({
          id: g.pendingClientSeq++,
          name: NB.genName(),
          address: NB.genAddress(),
          phone: NB.genPhone(),
          tariffId: t.id,
          risk: 'good',
          revealed: true,
          referredBy: c.name
        });
        NB.addLog(`«${c.name}» привёл друга (${t.name})`, 'success');
      }
    }
  });
};

/* Семейная деградация */
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

  /* Штраф за просроченные заявки */
  const openT = st.tickets.filter(t => t.status === 'open');
  if (openT.length > 0) {
    const penalty = openT.length * 2;
    g.reputation = Math.max(0, g.reputation - penalty);
    NB.addLog(`Просрочено ${openT.length} заявок: −${penalty} реп`, 'warn');
  }

  /* Расходы */
  const cost = NB.dailyCostEstimate();
  g.cash -= cost.total;
  g.stats.totalExpenses += cost.total;

  /* Смена дня */
  g.daily.dayNumber++;
  st.simDate = NB.addDays(st.simDate, 1);
  g.stats.daysPlayed++;
  g.daily.collectedToday = 0;
  g.daily.log = [{ text: `День ${g.daily.dayNumber}`, type: 'info' }];

  /* AP */
  NB.resetAp();
  NB.checkUnlocks();

  /* Network stability */
  const load = NB.traffic.getLoad();
  if (load.percent > 100) {
    const decay = Math.round((load.percent - 100) * 0.3);
    g.network.stability = Math.max(0, g.network.stability - decay);
    NB.addLog(`⚠ Перегрузка сети: −${decay} стабильности`, 'warn');
  } else if (load.percent < 70) {
    g.network.stability = Math.min(100, g.network.stability + 3);
  }

  /* Отток */
  const churn = 0.04
    * (1 - (g.upgrades.support || 0) * 0.15 - (g.upgrades.bandwidth || 0) * 0.1)
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

  /* Risk-механики клиентов */
  D.processClientRisks();

  /* Семья */
  D.processFamily();

  /* Новые клиенты */
  const base = 2 + (g.upgrades.marketing || 0) * 1;
  const cnt = NB.randInt(base, base + 2);
  for (let i = 0; i < cnt; i++) {
    const t = NB.pick(st.tariffs);
    const roll = Math.random();
    let risk = 'normal', revealed = true, name, phone, address;
    if (roll < 0.55) { risk = 'good'; }
    else if (roll < 0.75) { risk = 'normal'; }
    else if (roll < 0.88) { risk = 'risky'; }
    else if (roll < 0.94) { risk = 'hacker'; }
    else if (roll < 0.98) { risk = 'spammer'; }
    else { risk = 'unknown'; revealed = false; }
    if (risk === 'unknown') {
      name = '❓ Неизвестный клиент';
      phone = '—';
      address = 'нет данных';
    } else {
      name = g.world.drones.enabled && Math.random() < 0.2 ? NB.genDroneName() : NB.genName();
      phone = NB.genPhone();
      address = NB.genAddress();
    }
    g.pendingClients.push({
      id: g.pendingClientSeq++, name, address, phone, tariffId: t.id, risk, revealed
    });
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

  /* Выручка */
  g.daily.pendingRevenue = NB.dailyIncomeEstimate().total;

  /* Счета */
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

  /* История */
  st.revenue.push({ date: st.simDate, amount: g.daily.pendingRevenue });
  if (st.revenue.length > 90) st.revenue.shift();
  st.growth.push({ date: st.simDate, count: st.clients.length });
  if (st.growth.length > 90) st.growth.shift();
  g.stats.totalRevenue += g.daily.pendingRevenue;

  /* Прогрессия */
  NB.addCompanyXp(10);
  NB.game.updateMarketShare();
  if (NB.competitors && NB.competitors.tick && g.unlocks.competitors) NB.competitors.tick();

  /* Случайное событие */
  let ev = false;
  if (Math.random() < 0.28) { NB.game.triggerEvent(); ev = true; }

  /* Сюжет */
  if (NB.story && NB.story.tick) NB.story.tick();

  /* Спам */
  if (g.unlocks.spam && Math.random() < 0.2 + g.company.level * 0.05) {
    setTimeout(() => D.spawnSpam(), 600 + Math.random() * 800);
  }

  /* Cynessa-end — теперь БЕЗ бункера опаснее */
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