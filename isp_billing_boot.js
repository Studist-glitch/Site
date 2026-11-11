/* isp_billing_boot.js — рендер, события, инициализация */
(function (global) {
'use strict';
const NB = global.NB;

/* --- render --- */
NB.render = function () {
  const root = document.getElementById('root');
  if (!NB.state.session) return NB.auth.renderLogin();

  if (NB.state.session.role === 'staff') {
    const v = NB.views.staff;
    const content = {
      dashboard: v.dashboard, clients: v.clients, tariffs: v.tariffs,
      invoices: v.invoices, tickets: v.tickets, activity: v.activity
    }[NB.ui.view]();
    root.innerHTML = v.shell(content);
  } else {
    const c = NB.client(NB.state.session.id);
    if (!c) { NB.auth.logout(); return; }
    const v = NB.views.client;
    const content = {
      dashboard: v.dashboard, tariff: v.tariff, invoices: v.invoices,
      speed: v.speed, support: v.support
    }[NB.ui.view]();
    root.innerHTML = v.shell(content, c.name);
  }
  afterRender();
};

function afterRender() {
  if (NB.ui.view === 'dashboard') NB.charts.startTraffic();
  else NB.charts.stopTraffic();
  NB.charts.animateCounters();
}

/* --- click-делегирование --- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if (t) {
    const fn = NB.actions.map[t.dataset.action];
    if (fn) { fn(Number(t.dataset.id)); return; }
  }
  const v = e.target.closest('[data-view]');
  if (v) {
    NB.ui.view = v.dataset.view;
    NB.ui.query = '';
    NB.render();
    return;
  }
  const f = e.target.closest('[data-filter]');
  if (f) {
    NB.ui.invoiceFilter = f.dataset.filter;
    NB.render();
    return;
  }
  const s = e.target.closest('[data-sort]');
  if (s) {
    const key = s.dataset.sort;
    if (NB.ui.clientSort.key === key) NB.ui.clientSort.dir = NB.ui.clientSort.dir === 'asc' ? 'desc' : 'asc';
    else { NB.ui.clientSort.key = key; NB.ui.clientSort.dir = 'asc'; }
    NB.render();
    return;
  }
  if (e.target.id === 'start-speed') NB.charts.runSpeedTest();
});

/* --- поиск --- */
document.addEventListener('input', e => {
  if (e.target.id !== 'client-search') return;
  NB.ui.query = e.target.value;
  const pos = e.target.selectionStart;
  NB.render();
  const el = document.getElementById('client-search');
  if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (err) {} }
});

/* --- клик по фону модалки / Esc --- */
const modalEl = document.getElementById('modal');
modalEl.addEventListener('click', e => { if (e.target === modalEl) NB.closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modalEl.classList.contains('hidden')) NB.closeModal();
});

/* --- живая активность --- */
const POOL = [
  () => { const c = NB.pick(NB.state.clients); return c ? { text: `Клиент «${c.name}» проверил баланс`, type: 'sys' } : null; },
  () => { const c = NB.pick(NB.state.clients); return c ? { text: `«${c.name}» оплатил счёт`, type: 'pay' } : null; },
  () => ({ text: `Скорость узла №${NB.randInt(1, 8)}: ${NB.randInt(120, 980)} Мбит/с`, type: 'net' }),
  () => { const c = NB.pick(NB.state.clients); return c ? { text: `«${c.name}» обновил контактные данные`, type: 'sys' } : null; },
  () => ({ text: `Синхронизация биллинга завершена`, type: 'sys' }),
  () => { const c = NB.pick(NB.state.clients); return c ? { text: `«${c.name}» открыл заявку в поддержку`, type: 'ticket' } : null; }
];

setInterval(() => {
  if (!NB.state.session) return;
  const evt = NB.pick(POOL)();
  if (!evt) return;
  NB.addActivity(evt.text, evt.type);
  const list = document.getElementById('activity-list');
  if (!list) return;
  const div = document.createElement('div');
  div.className = 'activity-item fade';
  const c = { pay: '#22c55e', ticket: '#f59e0b', net: '#ff9500', sys: '#7a7a86' }[evt.type] || '#7a7a86';
  const ic = { pay: '₽', ticket: '✉', net: '◈', sys: '⚙' }[evt.type] || '•';
  div.innerHTML = `<div class="activity-icon" style="background:${c}26;color:${c}">${ic}</div>
    <div class="activity-body">${NB.esc(evt.text)}<small>${NB.fmtDateTime(new Date().toISOString())}</small></div>`;
  list.prepend(div);
  while (list.children.length > 12) list.lastChild.remove();
}, 9000);

/* --- resize для графика --- */
window.addEventListener('resize', () => {
  const c = document.getElementById('traffic-chart');
  if (c) NB.charts.drawLine(c, NB.charts.trafficData);
});

/* --- старт --- */
NB.render();

})(window);