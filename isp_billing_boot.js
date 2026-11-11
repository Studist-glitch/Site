/* isp_billing_boot.js — рендер, делегирование, старт */
(function (global) {
'use strict';
const NB = global.NB;

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
        { id: 'activity', label: 'Активность', icon: '◷' },
        { id: 'settings', label: 'Настройки', icon: '⚙' }
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

/* ---------- клик-делегирование ---------- */
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

/* ---------- поиск ---------- */
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
  NB.render();
  const el = document.getElementById('client-search');
  if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (err) {} }
});

/* ---------- настройки (чекбоксы) ---------- */
document.addEventListener('change', e => {
  const key = e.target.dataset.setting;
  if (!key) return;
  if (e.target.type === 'checkbox') {
    NB.state.settings[key] = e.target.checked;
    NB.save();
    if (key === 'autoTick') {
      if (e.target.checked) NB.sim.start(); else NB.sim.stop();
    }
    NB.render();
  }
});

/* ---------- модалка: фон/Esc ---------- */
const modalEl = document.getElementById('modal');
modalEl.addEventListener('click', e => { if (e.target === modalEl) NB.closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modalEl.classList.contains('hidden')) NB.closeModal();
});

/* ---------- живая активность (независимо от симуляции) ---------- */
const POOL = [
  () => { const c = NB.pick(NB.state.clients); return c ? { text: `Клиент «${c.name}» проверил баланс`, type: 'sys' } : null; },
  () => ({ text: `Скорость узла №${NB.randInt(1, 8)}: ${NB.randInt(120, 980)} Мбит/с`, type: 'net' }),
  () => ({ text: `Синхронизация биллинга завершена`, type: 'sys' })
];

setInterval(() => {
  if (!NB.state.session || NB.state.session.role !== 'staff') return;
  if (!document.getElementById('activity-list')) return;
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
}, 12000);

/* ---------- resize ---------- */
window.addEventListener('resize', () => {
  const c = document.getElementById('traffic-chart');
  if (c) NB.charts.drawLine(c, NB.charts.trafficData);
  const rv = document.getElementById('revenue-chart');
  if (rv) NB.charts.drawRevenue(rv, NB.state.revenue);
});

/* ---------- старт ---------- */
NB.render();
if (NB.state.session && NB.state.session.role === 'staff' && NB.state.settings.autoTick) {
  NB.sim.start();
}

})(window);