/* isp_billing_boot.js — рендер, делегирование, старт */
(function (global) {
'use strict';
const NB = global.NB;

/* =========== RENDER =========== */
NB.render = function () {
  const root = document.getElementById('root');
  if (!NB.state.session) return NB.auth.renderLogin();

  if (NB.state.session.role === 'staff') {
    const v = NB.views.staff;
    const content = v[NB.ui.view] ? v[NB.ui.view]() : v.dashboard();
    const name = NB.state.session.displayName || NB.state.session.username || 'Администратор';
    root.innerHTML = NB.buildShell(
      [
        { id: 'dashboard', label: 'Дашборд', icon: '◧' },
        { id: 'clients', label: 'Клиенты', icon: '◔' },
        { id: 'tariffs', label: 'Тарифы', icon: '◆' },
        { id: 'invoices', label: 'Счета', icon: '▤' },
        { id: 'tickets', label: 'Заявки', icon: '✉' },
        { id: 'upgrades', label: 'Магазин', icon: '⚙' },
        { id: 'activity', label: 'Активность', icon: '◷' },
        { id: 'settings', label: 'Настройки', icon: '🛠' }
      ],
      name, 'Сотрудник', content, { isStaff: true }
    );
  } else {
    const c = NB.client(NB.state.session.id);
    if (!c) { NB.auth.logout(); return; }
    const v = NB.views.client;
    const content = v[NB.ui.view] ? v[NB.ui.view]() : v.dashboard();
    root.innerHTML = NB.buildShell(
      [
        { id: 'dashboard', label: 'Обзор', icon: '◧' },
        { id: 'tariff', label: 'Мой тариф', icon: '◆' },
        { id: 'invoices', label: 'Счета', icon: '▤' },
        { id: 'speed', label: 'Скорость', icon: '⚡' },
        { id: 'support', label: 'Поддержка', icon: '✉' }
      ],
      c.name, 'Абонент', content, {}
    );
  }
  afterRender();
  if (NB.state.game.activeEvent && NB.state.session.role === 'staff') {
    setTimeout(() => NB.game.showEventModal(), 300);
  }
};

/* Только #view — без пересборки shell */
NB.renderView = function () {
  const view = document.getElementById('view');
  if (!view) return NB.render();

  let content = '';
  if (NB.state.session.role === 'staff') {
    const v = NB.views.staff;
    content = v[NB.ui.view] ? v[NB.ui.view]() : v.dashboard();
  } else {
    const c = NB.client(NB.state.session.id);
    if (!c) { NB.auth.logout(); return; }
    const v = NB.views.client;
    content = v[NB.ui.view] ? v[NB.ui.view]() : v.dashboard();
  }

  /* обновляем active nav */
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === NB.ui.view);
  });

  view.innerHTML = content;
  view.classList.remove('fade');
  void view.offsetWidth;
  view.classList.add('fade');
  afterRender();
};

function afterRender() {
  if (NB.ui.view === 'dashboard') NB.charts.startTraffic();
  else NB.charts.stopTraffic();
  NB.charts.animateCounters();
  setTimeout(() => {
    const rv = document.getElementById('revenue-chart');
    if (rv) NB.charts.drawRevenue(rv, NB.state.revenue);
  }, 50);
}

/* =========== CLICK DELEGATION =========== */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if (t) {
    const fn = NB.actions.map[t.dataset.action];
    if (fn) { fn(t.dataset); return; }
  }
  const v = e.target.closest('[data-view]');
  if (v) {
    NB.ui.view = v.dataset.view;
    NB.ui.query = '';
    NB.renderView();
    return;
  }
  const f = e.target.closest('[data-filter]');
  if (f) {
    NB.ui.invoiceFilter = f.dataset.filter;
    NB.renderView();
    return;
  }
  const s = e.target.closest('[data-sort]');
  if (s) {
    const key = s.dataset.sort;
    if (NB.ui.clientSort.key === key) NB.ui.clientSort.dir = NB.ui.clientSort.dir === 'asc' ? 'desc' : 'asc';
    else { NB.ui.clientSort.key = key; NB.ui.clientSort.dir = 'asc'; }
    NB.renderView();
    return;
  }
  if (e.target.id === 'start-speed') NB.charts.runSpeedTest();
});

/* =========== SEARCH =========== */
document.addEventListener('input', e => {
  if (e.target.id === 'churn-range') {
    const v = Number(e.target.value);
    NB.state.settings.churnChance = v / 100;
    NB.save();
    const el = document.getElementById('churn-val');
    if (el) el.textContent = v + '%';
    return;
  }
  if (e.target.id !== 'client-search') return;
  NB.ui.query = e.target.value;
  const pos = e.target.selectionStart;
  NB.renderView();
  const el = document.getElementById('client-search');
  if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (err) {} }
});

/* =========== SETTINGS CHECKBOXES =========== */
document.addEventListener('change', e => {
  const key = e.target.dataset.setting;
  if (!key) return;
  if (e.target.type === 'checkbox') {
    NB.state.settings[key] = e.target.checked;
    NB.save();
    if (key === 'autoTick') {
      if (e.target.checked) NB.sim.start(); else NB.sim.stop();
    }
  }
});

/* =========== MODAL BACKDROP / ESC =========== */
const modalEl = document.getElementById('modal');
modalEl.addEventListener('click', e => { if (e.target === modalEl) NB.closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modalEl.classList.contains('hidden')) NB.closeModal();
});

/* =========== LIVE ACTIVITY (без ре-рендера) =========== */
const POOL = [
  () => { const c = NB.pick(NB.state.clients); return c ? { text: `Клиент «${c.name}» проверил баланс`, type: 'sys' } : null; },
  () => ({ text: `Скорость узла №${NB.randInt(1, 8)}: ${NB.randInt(120, 980)} Мбит/с`, type: 'net' }),
  () => ({ text: `Синхронизация биллинга завершена`, type: 'sys' })
];

setInterval(() => {
  if (!NB.state.session || NB.state.session.role !== 'staff') return;
  const list = document.getElementById('activity-list');
  if (!list) return;
  const evt = NB.pick(POOL)();
  if (!evt) return;
  NB.addActivity(evt.text, evt.type);
  /* добавить только в UI, без полного рендера */
  const div = document.createElement('div');
  div.className = 'activity-item fade';
  const c = { pay: '#22c55e', ticket: '#f59e0b', net: '#ff9500', sys: '#7a7a86' }[evt.type] || '#7a7a86';
  const ic = { pay: '₽', ticket: '✉', net: '◈', sys: '⚙' }[evt.type] || '•';
  div.innerHTML = `<div class="activity-icon" style="background:${c}26;color:${c}">${ic}</div>
    <div class="activity-body">${NB.esc(evt.text)}<small>${NB.fmtDateTime(new Date().toISOString())}</small></div>`;
  list.prepend(div);
  while (list.children.length > 12) list.lastChild.remove();
}, 14000);

/* =========== RESIZE =========== */
window.addEventListener('resize', () => {
  const c = document.getElementById('traffic-chart');
  if (c) NB.charts.drawLine(c, NB.charts.trafficData);
  const rv = document.getElementById('revenue-chart');
  if (rv) NB.charts.drawRevenue(rv, NB.state.revenue);
});

/* =========== START =========== */
NB.render();
if (NB.state.session && NB.state.session.role === 'staff' && NB.state.settings.autoTick) {
  NB.sim.start();
}
NB.startSponsor();

})(window);