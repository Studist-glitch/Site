/* isp_billing_sim.js — движок дня. Никакого realtime. Только +1 день. */
(function (global) {
'use strict';
const NB = global.NB;
const S = NB.sim = NB.sim || {};

const BASE_DAILY_COST = 30;
const COST_PER_CLIENT = 2;
const INCOME_DIVISOR = 20;

/* Предупреждения */
S.dayWarnings = function () {
  const g = NB.state.game;
  const w = [];
  if (g.activeEvent) w.push({ level: 'block', text: 'Активное событие — нужно решение.' });
  if (g.daily.pendingRevenue > 0 && !g.upgrades.autoCollect) {
    const loss = Math.round(g.daily.pendingRevenue * 0.2);
    w.push({ level: 'warn', text: `Несобрано ${NB.money(g.daily.pendingRevenue)} — сгорит ${NB.money(loss)}.` });
  }
  if (g.world.storyQueue.length > 0) w.push({ level: 'info', text: `Сюжетное событие ждёт.` });
  return w;
};

S.canAdvance = function () {
  return S.dayWarnings().filter(x => x.level === 'block').length === 0;
};

S.advanceDay = function () {
  const st = NB.state;
  const g = st.game;

  if (g.stats.won || g.stats.lost) { NB.toast('Игра окончена', 'err'); return; }
  if (g.activeEvent) { NB.toast('Сначала решите событие', 'err'); return; }

  /* 1. Обработка несобранной выручки */
  if (g.daily.pendingRevenue > 0) {
    if (g.upgrades.autoCollect > 0) {
      g.cash += g.daily.pendingRevenue;
      g.daily.collectedToday += g.daily.pendingRevenue;
      NB.addActivity(`Автосбор: +${NB.money(g.daily.pendingRevenue)}`, 'pay');
    } else {
      const loss = Math.round(g.daily.pendingRevenue * 0.2);
      if (!confirm(`Несобрано ${NB.money(g.daily.pendingRevenue)}. Сгорит ${NB.money(loss)} (20%). Продолжить?`)) return;
      g.cash += g.daily.pendingRevenue - loss;
      g.daily.collectedToday += g.daily.pendingRevenue - loss;
    }
    g.daily.pendingRevenue = 0;
  }

  /* 2. Сброс дневных счётчиков */
  g.daily.collectedToday = 0;
  g.daily.lastDayRevenue = 0;
  g.daily.dayNumber++;
  st.simDate = NB.addDays(st.simDate, 1);
  g.stats.daysPlayed++;

  const events = [];

  /* 3. Счета 1-го числа */
  const dayOfMonth = NB.parseDate(st.simDate).getDate();
  if (dayOfMonth === 1) {
    const curPeriod = st.simDate.slice(0, 7);
    let created = 0;
    st.clients.forEach(c => {
      if (st.invoices.some(i => i.clientId === c.id && i.period === curPeriod)) return;
      st.invoices.push({
        id: st.seq.invoice++, clientId: c.id, period: curPeriod,
        amount: NB.price(c.tariffId), status: 'unpaid', paidAt: null
      });
      created++;
    });
    if (created) events.push({ text: `Выставлено ${created} счетов за месяц`, type: 'info' });
  }

  /* 4. Новые клиенты */
  if (st.settings.autoNewClients) {
    const base = 0.30 + (g.upgrades.marketing || 0) * 0.15 + (g.upgrades.salesBoost || 0) * 0.10;
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
        st.invoices.push({
          id: st.seq.invoice++, clientId: nc.id, period: curPeriod,
          amount: t.price, status: 'unpaid', paidAt: null
        });
        if (isDrone) g.world.drones.droneClients++;
      }
      events.push({ text: `+${n} новых клиентов`, type: 'ok' });
    }
  }

  /* 5. Отток */
  const churn = 0.04 * (1 - (g.upgrades.support || 0) * 0.15 - (g.upgrades.bandwidth || 0) * 0.1);
  if (Math.random() < Math.max(0.005, churn)) {
    const active = st.clients.filter(c => c.status === 'active');
    if (active.length > 3) {
      const victim = NB.pick(active);
      st.clients = st.clients.filter(c => c.id !== victim.id);
      st.invoices = st.invoices.filter(i => i.clientId !== victim.id);
      st.tickets = st.tickets.filter(t => t.clientId !== victim.id);
      events.push({ text: `«${victim.name}» ушёл`, type: 'warn' });
    }
  }

  /* 6. Начисление выручки (на следующий день) */
  const income = NB.dailyIncomeEstimate();
  g.daily.pendingRevenue = income.total;
  if (income.total > 0) {
    events.push({ text: `Начислено ${NB.money(income.total)} за день`, type: 'info' });
  }

  /* 7. Расходы */
  const cost = NB.dailyCostEstimate();
  g.cash -= cost.total;
  g.stats.totalExpenses += cost.total;
  if (cost.upkeep > 0) {
    events.push({ text: `Обслуживание: −${NB.money(cost.total)}`, type: 'warn' });
  }

  /* 8. История */
  st.revenue.push({ date: st.simDate, amount: income.total });
  if (st.revenue.length > 90) st.revenue.shift();
  st.growth.push({ date: st.simDate, count: st.clients.length });
  if (st.growth.length > 90) st.growth.shift();
  g.stats.totalRevenue += income.total;

  /* 9. Рынок */
  NB.game.updateMarketShare();

  /* 10. Случайное событие */
  let eventTriggered = false;
  if (Math.random() < 0.28) {
    NB.game.triggerEvent();
    eventTriggered = true;
  }

  /* 11. Сюжетный тик */
  NB.story.tick();

  /* 12. Спам-реклама */
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

  /* Модалки после дня */
  setTimeout(() => {
    if (NB.state.game.world.storyQueue.length) NB.story.showNextInQueue();
    else if (eventTriggered) NB.game.showEventModal();
  }, 300);
};

NB.advanceDay = function () { S.advanceDay(); };

})(window);