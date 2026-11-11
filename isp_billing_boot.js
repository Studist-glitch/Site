/* isp_billing_boot.js — рендер, делегирование, старт. Без интервалов. */
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
        { id: 'clients',   label: 'Клиенты', icon: '◔' },
        { id: 'tariffs',   label: 'Тарифы',  icon: '◆' },
        { id: 'invoices',  label: 'Счета',   icon: '▤' },
        { id: 'tickets',   label: 'Заявки',  icon: '✉' },
        { id: 'upgrades',  label: 'Магазин', icon: '⚙' },
        { id: 'activity',  label: 'Активность', icon: '◷' },
        { id: 'settings',  label: 'Настройки', icon: '🛠' }
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
        { id: 'dashboard', label: 'Обзор',      icon: '◧' },
        { id: 'tariff',    label: 'Мой тариф',  icon: '◆' },
        { id: 'invoices',  label: 'Счета',      icon: '▤' },
        { id: 'speed',     label: 'Скорость',   icon: '⚡' },
        { id: 'support',   label: 'Поддержка',  icon: '✉' }
      ],
      c.name, 'Абонент', content, {}
    );
  }
  afterRender();
  if (NB.state.game.activeEvent && NB.state.session.role === 'staff') {
    setTimeout(() => NB.game.showEventModal(), 300);
  }
  if (NB.state.game.world.storyQueue.length && NB.state.session.role === 'staff') {
    setTimeout(() => NB.story.showNextInQueue(), 500);
  }
};

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
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === NB.ui.view);
  });
  view.innerHTML = content;
  view.classList.remove('fade');
  void view.offsetWidth;
  view.classList.add('fade');
  afterRender();
  /* Обновляем панель дня */
  const bar = document.querySelector('.sim-bar');
  if (bar && NB.state.session.role === 'staff') {
    bar.outerHTML = NB.simBar();
  }
  NB.story.applyTheme();
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

document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if (t) {
    const fn = NB.actions.map[t.dataset.action];
    if (fn) { fn(t.dataset); return; }
  }
  const sc = e.target.closest('[data-story-choice]');
  if (sc) {
    /* старая система выбора из story.CHAPTERS — не используется */
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

document.addEventListener('input', e => {
  if (e.target.id !== 'client-search') return;
  NB.ui.query = e.target.value;
  const pos = e.target.selectionStart;
  NB.renderView();
  const el = document.getElementById('client-search');
  if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (err) {} }
});

document.addEventListener('change', e => {
  const key = e.target.dataset.setting;
  if (!key) return;
  if (e.target.type === 'checkbox') {
    NB.state.settings[key] = e.target.checked;
    NB.save();
  }
});

const modalEl = document.getElementById('modal');
modalEl.addEventListener('click', e => { if (e.target === modalEl) NB.closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modalEl.classList.contains('hidden')) NB.closeModal();
});

window.addEventListener('resize', () => {
  const c = document.getElementById('traffic-chart');
  if (c) NB.charts.drawLine(c, NB.charts.trafficData);
  const rv = document.getElementById('revenue-chart');
  if (rv) NB.charts.drawRevenue(rv, NB.state.revenue);
});

NB.render();
NB.story.applyTheme();

/* Сюжетный тик на случай, если накопились сцены — разово */
setTimeout(() => {
  if (NB.state.session && NB.state.session.role === 'staff' && NB.state.game.world.storyQueue.length) {
    NB.story.showNextInQueue();
  }
}, 800);

})(window);