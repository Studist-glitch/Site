/* isp_billing_sim.js — движок симуляции времени */
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
    if (!document.getElementById('modal').classList.contains('hidden')) return;
    const silent = NB.ui.view !== 'dashboard';
    NB.advanceDay(silent);
  }, NB.state.settings.tickMs);
};

S.stop = function () { if (timer) { clearInterval(timer); timer = null; } };

const DAILY_BASE_COST = 3000;
const EVENT_CHANCE = 0.22;

NB.advanceDay = function (silent) {
  const st = NB.state;
  if (st.game.stats.won || st.game.stats.lost) {
    if (!silent) NB.toast('Игра окончена. Сбросьте в настройках', 'err');
    return;
  }
  if (st.game.activeEvent) {
    if (!silent) NB.toast('Сначала решите текущую ситуацию', 'err');
    return;
  }

  st.simDate = NB.addDays(st.simDate, 1);
  const events = [];
  let revenueToday = 0;
  let payments = 0;

  /* 1. автоплатежи клиентов */
  if (st.settings.autoPayments) {
    const payChance = 0.35 + st.game.upgrades.support * 0.05;
    st.invoices.filter(i => i.status === 'unpaid').forEach(i => {
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

  /* 2. новые клиенты */
  if (st.settings.autoNewClients) {
    const base = 0.22 + st.game.upgrades.marketing * 0.12;
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
      events.push({ text: `Подключено ${n} ${n === 1 ? 'клиент' : 'клиента'}`, type: 'ok' });
    }
  }

  /* 3. отток */
  const churn = st.settings.churnChance * (1 - st.game.upgrades.support * 0.15 - st.game.upgrades.bandwidth * 0.1);
  if (Math.random() < Math.max(0.01, churn)) {
    const active = st.clients.filter(c => c.status === 'active');
    if (active.length > 3) {
      const victim = NB.pick(active);
      st.clients = st.clients.filter(c => c.id !== victim.id);
      st.invoices = st.invoices.filter(i => i.clientId !== victim.id);
      st.tickets = st.tickets.filter(t => t.clientId !== victim.id);
      events.push({ text: `«${victim.name}» отключился`, type: 'warn' });
    }
  }

  /* 4. блокировка недобросовестных */
  st.clients.forEach(c => {
    if (c.status === 'active' && c.balance < -1000 && Math.random() < 0.3) c.status = 'blocked';
  });

  /* 5. счета в начале месяца */
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
    if (created) events.push({ text: `Новый месяц: выставлено ${created} счетов`, type: 'info' });
  }

  /* 6. финансовый итог дня */
  const upkeep = NB.game.dailyUpkeep();
  const expenses = DAILY_BASE_COST + upkeep;
  const net = revenueToday - expenses;
  st.game.cash += net;
  st.game.stats.totalRevenue += revenueToday;
  st.game.stats.totalExpenses += expenses;
  st.game.stats.daysPlayed++;

  /* 7. история */
  st.revenue.push({ date: st.simDate, amount: revenueToday });
  if (st.revenue.length > 60) st.revenue.shift();
  st.growth.push({ date: st.simDate, count: st.clients.length });
  if (st.growth.length > 60) st.growth.shift();

  if (payments > 0) {
    events.push({ text: `Оплачено ${payments} ${payments === 1 ? 'счёт' : 'счетов'} на ${NB.money(revenueToday)}`, type: 'ok' });
  }

  /* 8. событие */
  let eventTriggered = false;
  if (Math.random() < EVENT_CHANCE) {
    NB.game.triggerEvent();
    eventTriggered = true;
  }

  NB.checkGameState();
  NB.save();

  if (!silent) {
    events.forEach(ev => {
      NB.notify(ev.text, ev.type, { noToast: true });
      NB.addActivity(ev.text, ev.type === 'ok' ? 'pay' : ev.type === 'warn' ? 'block' : 'sys');
    });
    if (NB.ui.view === 'dashboard') {
      NB.refreshLive();
    } else {
      NB.renderView();
    }
  } else {
    events.forEach(ev => NB.addActivity(ev.text, ev.type === 'ok' ? 'pay' : 'sys'));
  }

  if (eventTriggered && !silent) {
    setTimeout(() => NB.game.showEventModal(), 250);
  } else if (eventTriggered) {
    /* на неактивной вкладке — только уведомление, показывать будем когда вернётся */
  }
};

NB.advanceWeek = function () {
  for (let i = 0; i < 7; i++) {
    if (NB.state.game.activeEvent) break;
    NB.advanceDay(true);
  }
  NB.renderView();
  if (NB.state.game.activeEvent) {
    setTimeout(() => NB.game.showEventModal(), 200);
  } else {
    NB.toast('Прошло 7 дней', 'ok');
  }
};

NB.setSimSpeed = function (code) {
  const map = { '0': 0, '1': 8000, '2': 3000, '3': 1000 };
  const ms = map[String(code)];
  if (ms === 0) { NB.state.settings.autoTick = false; }
  else { NB.state.settings.autoTick = true; NB.state.settings.tickMs = ms; }
  NB.save();
  if (NB.state.settings.autoTick) S.start(); else S.stop();
  NB.renderView();
};

})(window);