/* isp_billing_sim.js — движок симуляции времени (дневная система) */
(function (global) {
'use strict';
const NB = global.NB;
const S = NB.sim = NB.sim || {};
let timer = null;

S.start = function () {
  S.stop();
  if (!NB.state.settings.autoTick) return;
  timer = setInterval(() => {
    if (!NB.state.session || NB.state.session.role !== 'staff') { S.stop(); return; }
    if (NB.state.game.activeEvent) return;
    if (NB.state.game.daily.dayCompleted) return;
    if (!document.getElementById('modal').classList.contains('hidden')) return;
    NB.advanceDay(NB.ui.view !== 'dashboard');
  }, NB.state.settings.tickMs);
};

S.stop = function () { if (timer) { clearInterval(timer); timer = null; } };

const DAILY_BASE_COST = 3000;

NB.advanceDay = function (silent) {
  const st = NB.state;
  if (st.game.stats.won || st.game.stats.lost) {
    if (!silent) NB.toast('Игра окончена', 'err');
    return;
  }
  if (st.game.activeEvent) { if (!silent) NB.toast('Сначала решите событие', 'err'); return; }

  /* Завершаем текущий день: собираем выручку, если автосбор */
  if (!st.game.daily.dayCompleted) {
    if (st.game.upgrades.autoCollect > 0) {
      st.game.cash += st.game.daily.pendingRevenue;
      st.game.daily.collectedToday += st.game.daily.pendingRevenue;
      st.game.daily.pendingRevenue = 0;
    } else {
      /* Если не собрано — сгорает? Нет, переносится, но игрок теряет бонус. */
      st.game.daily.pendingRevenue = Math.round(st.game.daily.pendingRevenue * 0.8);
    }
  }

  /* Новый день */
  st.game.daily.dayCompleted = false;
  st.game.daily.pendingRevenue = 0;
  st.game.daily.pendingClients = 0;
  st.game.daily.pendingInvoices = 0;
  st.game.daily.collectedToday = 0;
  st.game.daily.lastDayRevenue = 0;

  st.simDate = NB.addDays(st.simDate, 1);
  const events = [];
  let revenueToday = 0;
  let payments = 0;

  /* 1. Автоплатежи */
  if (st.settings.autoPayments) {
    st.invoices.filter(i => i.status === 'unpaid').forEach(i => {
      const payChance = 0.35 + (st.game.upgrades.support || 0) * 0.05;
      if (Math.random() > payChance) return;
      const c = NB.client(i.clientId);
      if (!c || c.status !== 'active' || c.balance < i.amount) return;
      c.balance -= i.amount;
      i.status = 'paid';
      i.paidAt = new Date().toISOString();
      revenueToday += i.amount;
      payments++;
    });
  }

  /* 2. Starve Neon пассивный доход */
  if (st.game.sn.ally) {
    const snRev = Math.round(500 * (1 + st.game.sn.trust / 100) * (1 + st.game.marketShare / 100));
    revenueToday += snRev;
    st.game.sn.revenue += snRev;
    events.push({ text: `Starve Neon принёс ${NB.money(snRev)}`, type: 'ok' });
  }

  /* 3. Новые клиенты */
  if (st.settings.autoNewClients) {
    const base = 0.22 + (st.game.upgrades.marketing || 0) * 0.12 + (st.game.sn.ally ? 0.05 : 0) + (st.game.upgrades.salesBoost || 0) * 0.1;
    if (Math.random() < base) {
      const n = NB.randInt(1, 2);
      const curPeriod = st.simDate.slice(0, 7);
      for (let k = 0; k < n; k++) {
        const t = NB.pick(st.tariffs);
        const nc = {
          id: st.seq.client++, name: NB.genName(), address: NB.genAddress(),
          phone: NB.genPhone(), tariffId: t.id, balance: NB.randInt(0, 2000),
          status: 'active', createdAt: new Date().toISOString(), password: NB.DEFAULT_PASS
        };
        st.clients.push(nc);
        st.invoices.push({ id: st.seq.invoice++, clientId: nc.id, period: curPeriod,
          amount: t.price, status: 'unpaid', paidAt: null });
      }
      events.push({ text: `+${n} клиентов`, type: 'ok' });
    }
  }

  /* 4. Отток */
  const churn = st.settings.churnChance * (1 - (st.game.upgrades.support || 0) * 0.15 - (st.game.upgrades.bandwidth || 0) * 0.1);
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

  /* 6. Финансы */
  const upkeep = NB.game.dailyUpkeep();
  const expenses = DAILY_BASE_COST + upkeep;
  const net = revenueToday - expenses;
  st.game.cash += net;
  st.game.stats.totalRevenue += revenueToday;
  st.game.stats.totalExpenses += expenses;
  st.game.stats.daysPlayed++;

  /* 7. История */
  st.revenue.push({ date: st.simDate, amount: revenueToday });
  if (st.revenue.length > 60) st.revenue.shift();
  st.growth.push({ date: st.simDate, count: st.clients.length });
  if (st.growth.length > 60) st.growth.shift();

  /* 8. Рынок */
  NB.game.updateMarketShare();

  /* 9. Событие */
  let eventTriggered = false;
  if (Math.random() < 0.22) {
    NB.game.triggerEvent();
    eventTriggered = true;
  }

  /* 10. Реклама */
  if (Math.random() < 0.15 && NB.state.settings.snSpam) {
    setTimeout(() => NB.story.showSpam(), 500);
  }
  if (Math.random() < 0.05 && NB.state.game.sn.videoShown < 3) {
    setTimeout(() => NB.story.showVideo(), 1000);
  }

  NB.checkGameState();
  NB.save();

  if (!silent) {
    events.forEach(ev => {
      NB.notify(ev.text, ev.type, { noToast: true });
      NB.addActivity(ev.text, ev.type === 'ok' ? 'pay' : ev.type === 'warn' ? 'block' : 'sys');
    });
    if (NB.ui.view === 'dashboard') NB.refreshLive();
    else NB.renderView();
  } else {
    events.forEach(ev => NB.addActivity(ev.text, ev.type === 'ok' ? 'pay' : 'sys'));
  }

  if (eventTriggered && !silent) setTimeout(() => NB.game.showEventModal(), 250);
};

NB.advanceWeek = function () {
  for (let i = 0; i < 7; i++) {
    if (NB.state.game.activeEvent) break;
    NB.advanceDay(true);
  }
  NB.renderView();
  if (NB.state.game.activeEvent) setTimeout(() => NB.game.showEventModal(), 200);
  else NB.toast('Прошло 7 дней', 'ok');
};

NB.setSimSpeed = function (code) {
  const map = { '0': 0, '1': 8000, '2': 3000, '3': 1000 };
  const ms = map[String(code)];
  if (ms === 0) NB.state.settings.autoTick = false;
  else { NB.state.settings.autoTick = true; NB.state.settings.tickMs = ms; }
  NB.save();
  if (NB.state.settings.autoTick) S.start(); else S.stop();
  NB.renderView();
};

})(window);