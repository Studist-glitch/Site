/* isp_billing_sim.js — дневной цикл с гейтингом */
(function (global) {
'use strict';
const NB = global.NB;
const S = NB.sim = NB.sim || {};

S.dayWarnings = function () {
  const g = NB.state.game;
  const w = [];
  if (g.activeEvent) w.push({ level: 'block', text: 'Активное событие' });
  if (g.pendingClients.length > 0) w.push({ level: 'block', text: `${g.pendingClients.length} новых клиентов` });
  if (g.daily.pendingRevenue > 0 && g.upgrades.autoCollect === 0) w.push({ level: 'block', text: 'Не собрана выручка' });
  return w;
};

S.canAdvance = function () {
  return NB.canAdvanceDay().ok;
};

/* Обработка одного дня */
S.advanceDay = function () {
  const st = NB.state;
  const g = st.game;

  if (g.stats.won || g.stats.lost) { NB.toast('Игра окончена', 'err'); return; }
  const check = NB.canAdvanceDay();
  if (!check.ok) { NB.toast(check.reason, 'err'); return; }

  /* 1. Автосбор (если куплен) */
  if (g.upgrades.autoCollect > 0 && g.daily.pendingRevenue > 0) {
    g.cash += g.daily.pendingRevenue;
    g.daily.collectedToday += g.daily.pendingRevenue;
    NB.addLog(`Автосбор: +${NB.money(g.daily.pendingRevenue)}`, 'success');
  }

  /* 2. Штраф за просроченные заявки */
  const openTickets = st.tickets.filter(t => t.status === 'open');
  if (openTickets.length > 0) {
    const penalty = openTickets.length * 2;
    g.reputation = Math.max(0, g.reputation - penalty);
    NB.addLog(`Просрочено ${openTickets.length} заявок: −${penalty} репутации`, 'warn');
  }

  /* 3. Расходы */
  const cost = NB.dailyCostEstimate();
  g.cash -= cost.total;
  g.stats.totalExpenses += cost.total;

  /* 4. Продвижение дня */
  g.daily.dayNumber++;
  st.simDate = NB.addDays(st.simDate, 1);
  g.stats.daysPlayed++;
  g.daily.collectedToday = 0;
  g.daily.log = [{ text: `День ${g.daily.dayNumber} начался`, type: 'info' }];

  /* 5. Отток (формула от репутации + апгрейдов) */
  const churnBase = 0.04;
  const churn = churnBase
    * (1 - (g.upgrades.support || 0) * 0.15 - (g.upgrades.bandwidth || 0) * 0.1)
    * (1 + (100 - g.reputation) / 200);
  if (Math.random() < Math.max(0.005, churn)) {
    const active = st.clients.filter(c => c.status === 'active' && !c.isDrone);
    if (active.length > 3) {
      const v = NB.pick(active);
      st.clients = st.clients.filter(c => c.id !== v.id);
      st.invoices = st.invoices.filter(i => i.clientId !== v.id);
      st.tickets = st.tickets.filter(t => t.clientId !== v.id);
      NB.addLog(`«${v.name}» ушёл`, 'warn');
    }
  }

  /* 6. Новые pending-клиенты */
  const base = 2 + (g.upgrades.marketing || 0) * 1;
  const count = NB.randInt(base, base + 2);
  for (let i = 0; i < count; i++) {
    const t = NB.pick(st.tariffs);
    const roll = Math.random();
    const risk = roll < 0.55 ? 'good' : roll < 0.85 ? 'normal' : 'risky';
    g.pendingClients.push({
      id: g.pendingClientSeq++,
      name: g.world.drones.enabled && Math.random() < 0.2 ? NB.genDroneName() : NB.genName(),
      address: NB.genAddress(),
      phone: NB.genPhone(),
      tariffId: t.id,
      risk
    });
  }
  NB.addLog(`Пришли ${count} новых клиента(ов)`, 'info');

  /* 7. Новые заявки от активных клиентов */
  const active = st.clients.filter(c => c.status === 'active');
  if (active.length > 0 && Math.random() < 0.75) {
    const tCount = NB.randInt(1, 2);
    for (let i = 0; i < tCount; i++) {
      const c = NB.pick(active);
      st.tickets.push({
        id: st.seq.ticket++,
        clientId: c.id,
        subject: NB.genTicketSubject(),
        status: 'open',
        createdAt: new Date().toISOString()
      });
    }
    NB.addLog(`Поступило ${tCount} новых заявок`, 'info');
  }

  /* 8. Выручка на новый день */
  const income = NB.dailyIncomeEstimate();
  g.daily.pendingRevenue = income.total;

  /* 9. Счета 1-го числа */
  const dayOfMonth = NB.parseDate(st.simDate).getDate();
  if (dayOfMonth === 1) {
    const curPeriod = st.simDate.slice(0, 7);
    let created = 0;
    st.clients.forEach(c => {
      if (st.invoices.some(i => i.clientId === c.id && i.period === curPeriod)) return;
      st.invoices.push({ id: st.seq.invoice++, clientId: c.id, period: curPeriod,
        amount: NB.price(c.tariffId), status: 'unpaid', paidAt: null });
      created++;
    });
    if (created) NB.addLog(`Выставлено ${created} счетов`, 'info');
  }

  /* 10. История */
  st.revenue.push({ date: st.simDate, amount: income.total });
  if (st.revenue.length > 90) st.revenue.shift();
  st.growth.push({ date: st.simDate, count: st.clients.length });
  if (st.growth.length > 90) st.growth.shift();
  g.stats.totalRevenue += income.total;

  /* 11. Рынок */
  NB.game.updateMarketShare();

  /* 12. Событие */
  let eventTriggered = false;
  if (Math.random() < 0.28) { NB.game.triggerEvent(); eventTriggered = true; }

  /* 13. Сюжет */
  if (NB.story && NB.story.tick) NB.story.tick();

  /* 14. Реклама */
  if (!st.settings.reduceAds && Math.random() < 0.2) setTimeout(() => NB.story.showSpam(), 800);

  NB.checkGameState();
  NB.save();
  NB.render();

  setTimeout(() => {
    if (NB.state.game.world.storyQueue.length) NB.story.showNextInQueue();
    else if (eventTriggered) NB.game.showEventModal();
  }, 350);
};

NB.advanceDay = function () { S.advanceDay(); };

})(window);