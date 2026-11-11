/* isp_billing_sim.js — движок дня. Никакого realtime. Только +1 день. */
(function (global) {
'use strict';
const NB = global.NB;
const S = NB.sim = NB.sim || {};

const DAILY_BASE_COST = 3000;

/* Предупреждения перед завершением дня */
S.dayWarnings = function () {
  const g = NB.state.game;
  const w = [];
  if (g.activeEvent) w.push({ level: 'block', text: 'Активное событие — нужно решение.' });
  if (g.daily.pendingRevenue > 0) w.push({ level: 'warn', text: `Несобрано ${NB.money(g.daily.pendingRevenue)} — сгорит 20%.` });
  if (g.world.storyQueue.length > 0) w.push({ level: 'block', text: `Сюжетное событие в очереди (${g.world.storyQueue.length}) — откроется после дня.` });
  return w;
};

S.canAdvance = function () {
  const w = S.dayWarnings().filter(x => x.level === 'block');
  return w.length === 0;
};

S.advanceDay = function () {
  const st = NB.state;
  const g = st.game;

  if (g.stats.won || g.stats.lost) { NB.toast('Игра окончена', 'err'); return; }
  if (g.activeEvent) { NB.toast('Сначала решите событие', 'err'); return; }

  /* Предупреждение о несобранной выручке */
  if (g.daily.pendingRevenue > 0) {
    const loss = Math.round(g.daily.pendingRevenue * 0.2);
    if (!confirm(`Несобрано ${NB.money(g.daily.pendingRevenue)}. Сгорит ${NB.money(loss)}. Продолжить?`)) return;
    g.daily.pendingRevenue -= loss;
    if (g.upgrades.autoCollect > 0) {
      g.cash += g.daily.pendingRevenue;
      g.daily.collectedToday += g.daily.pendingRevenue;
      g.daily.pendingRevenue = 0;
    }
  } else if (g.upgrades.autoCollect > 0) {
    g.cash += g.daily.pendingRevenue;
  }

  /* Обнуляем день */
  g.daily.dayCompleted = false;
  g.daily.pendingRevenue = 0;
  g.daily.pendingClients = 0;
  g.daily.pendingInvoices = 0;
  g.daily.collectedToday = 0;
  g.daily.lastDayRevenue = 0;
  g.daily.dayNumber++;
  st.simDate = NB.addDays(st.simDate, 1);
  g.stats.daysPlayed++;

  /* ===== Расчёт выручки за день ===== */
  let revenueToday = 0;
  const events = [];

  /* 1. Автоплатежи */
  if (st.settings.autoPayments) {
    st.invoices.filter(i => i.status === 'unpaid').forEach(i => {
      const payChance = 0.35 + (g.upgrades.support || 0) * 0.06;
      if (Math.random() > payChance) return;
      const c = NB.client(i.clientId);
      if (!c || c.status !== 'active' || c.balance < i.amount) return;
      c.balance -= i.amount;
      i.status = 'paid';
      i.paidAt = new Date().toISOString();
      revenueToday += i.amount;
    });
  }

  /* 2. Пассивный доход от Neon Shadow */
  if (g.world.neon.state === 'active' && g.world.neon.helped > 0) {
    const snRev = Math.round(400 * (1 + g.world.neon.trust / 100) * (1 + g.marketShare / 100));
    revenueToday += snRev;
    events.push({ text: `Neon Shadow перевёл ${NB.money(snRev)}`, type: 'ok' });
  }

  /* 3. Новые клиенты */
  if (st.settings.autoNewClients) {
    const base = 0.22 + (g.upgrades.marketing || 0) * 0.12 + (g.upgrades.salesBoost || 0) * 0.1;
    if (Math.random() < base) {
      const n = NB.randInt(1, 2);
      const curPeriod = st.simDate.slice(0, 7);
      for (let k = 0; k < n; k++) {
        const t = NB.pick(st.tariffs);
        const isDrone = g.world.drones.enabled && Math.random() < 0.4;
        const nc = {
          id: st.seq.client++,
          name: isDrone ? NB.genDroneName() : NB.genName(),
          address: NB.genAddress(),
          phone: NB.genPhone(),
          tariffId: t.id, balance: NB.randInt(0, 2000),
          status: 'active', createdAt: new Date().toISOString(),
          password: NB.DEFAULT_PASS,
          isDrone
        };
        st.clients.push(nc);
        st.invoices.push({ id: st.seq.invoice++, clientId: nc.id, period: curPeriod,
          amount: t.price, status: 'unpaid', paidAt: null });
        if (isDrone) g.world.drones.droneClients++;
      }
      events.push({ text: `+${n} клиентов`, type: 'ok' });
    }
  }

  /* 4. Отток (без настройки — фиксированная формула) */
  const churn = 0.04 * (1 - (g.upgrades.support || 0) * 0.15 - (g.upgrades.bandwidth || 0) * 0.1);
  if (Math.random() < Math.max(0.01, churn)) {
    const active = st.clients.filter(c => c.status === 'active');
    if (active.length > 3) {
      const victim = NB.pick(active);
      st.clients = st.clients.filter(c => c.id !== victim.id);
      st.invoices = st.invoices.filter(i => i.clientId !== victim.id);
      st.tickets = st.tickets.filter(t => t.clientId !== victim.id);
      events.push({ text: `«${victim.name}» ушёл`, type: 'warn' });
    }
  }

  /* 5. Счета 1-го числа */
  const day = NB.parseDate(st.simDate).getDate();
  if (day === 1) {
    const curPeriod = st.simDate.slice(0, 7);
    let created = 0;
    st.clients.forEach(c => {
      if (st.invoices.some(i => i.clientId === c.id && i.period === curPeriod)) return;
      st.invoices.push({ id: st.seq.invoice++, clientId: c.id, period: curPeriod,
        amount: NB.price(c.tariffId), status: 'unpaid', paidAt: null });
      created++;
    });
    if (created) events.push({ text: `Выставлено ${created} счетов`, type: 'info' });
  }

  /* 6. Расходы */
  const upkeep = NB.game.dailyUpkeep();
  const expenses = DAILY_BASE_COST + upkeep;
  g.cash += revenueToday - expenses;
  g.stats.totalRevenue += revenueToday;
  g.stats.totalExpenses += expenses;

  /* 7. История */
  st.revenue.push({ date: st.simDate, amount: revenueToday });
  if (st.revenue.length > 90) st.revenue.shift();
  st.growth.push({ date: st.simDate, count: st.clients.length });
  if (st.growth.length > 90) st.growth.shift();

  /* 8. Рынок */
  NB.game.updateMarketShare();

  /* 9. Событие дня (обычное, не сюжетное) */
  let eventTriggered = false;
  if (Math.random() < 0.28) {
    NB.game.triggerEvent();
    eventTriggered = true;
  }

  /* 10. Сюжетный тик */
  NB.story.tick();

  /* 11. Обычная реклама-спам (не Starve Neon) */
  if (st.settings.spamEnabled && Math.random() < 0.2) {
    setTimeout(() => NB.story.showSpam(), 800);
  }

  NB.checkGameState();
  NB.save();

  events.forEach(ev => {
    NB.notify(ev.text, ev.type, { noToast: true });
    NB.addActivity(ev.text, ev.type === 'ok' ? 'pay' : ev.type === 'warn' ? 'block' : 'sys');
  });

  if (NB.ui.view === 'dashboard') NB.refreshLive();
  else NB.renderView();

  /* Сюжетное событие — показываем после дня */
  setTimeout(() => {
    if (NB.state.game.world.storyQueue.length) NB.story.showNextInQueue();
    else if (eventTriggered) NB.game.showEventModal();
  }, 300);
};

NB.advanceDay = function () { S.advanceDay(); };
NB.advanceWeek = function () {
  for (let i = 0; i < 7; i++) {
    if (NB.state.game.activeEvent) break;
    if (NB.state.game.world.storyQueue.length) break;
    S.advanceDay();
    if (NB.state.game.activeEvent || NB.state.game.world.storyQueue.length) break;
  }
};

})(window);