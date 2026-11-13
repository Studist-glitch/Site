/* isp_billing_boot.js — рендер, обработка событий, старт */
(function (global) {
'use strict';
const NB = global.NB;

/* ============================================================
   ИНИЦИАЛИЗАЦИЯ UI-СОСТОЯНИЯ
   ============================================================ */
if (!NB.ui) NB.ui = {};
if (typeof NB.ui.view === 'undefined') NB.ui.view = 'dashboard';
if (typeof NB.ui.query === 'undefined') NB.ui.query = '';
if (!NB.ui.clientSort) NB.ui.clientSort = { key: 'name', dir: 'asc' };
if (typeof NB.ui.invoiceFilter === 'undefined') NB.ui.invoiceFilter = 'all';
if (typeof NB.ui.invoiceTab === 'undefined') NB.ui.invoiceTab = 'client';
if (typeof NB.ui.chatThreadId === 'undefined') NB.ui.chatThreadId = null;
if (typeof NB.ui.activityFilter === 'undefined') NB.ui.activityFilter = 'all';
if (!NB.ui.scrollPositions) NB.ui.scrollPositions = {};

/* ============================================================
   ГЛАВНЫЙ РЕНДЕР
   ============================================================ */
NB.render = function () {
  const root = document.getElementById('root');
  if (!root) return;
  NB.ui._booting = true;

  const v = NB.views.staff;
  const nav = NB.getVisibleNav();

  /* Fallback: если текущая view недоступна — переключаем на dashboard */
  if (!nav.some(n => n.id === NB.ui.view)) NB.ui.view = 'dashboard';

  const content = v[NB.ui.view] ? v[NB.ui.view]() : v.dashboard();
  root.innerHTML = NB.buildShell(nav, content);

  NB.ui._booting = false;
  afterRender();

  /* Отложенные модалки */
  if (NB.state.game.activeEvent) {
    setTimeout(() => NB.game.showEventModal(), 300);
  }
  if (NB.state.game.world.storyQueue.length) {
    setTimeout(() => NB.story.showNextInQueue(), 600);
  }
  /* Первый тур */
  if (!NB.state.onboarded.tour) {
    setTimeout(() => NB.game.startTour(), 800);
  } else if (!NB.state.onboarded.views[NB.ui.view] && NB.game.TOURS_BY_VIEW[NB.ui.view]) {
    setTimeout(() => NB.game.startViewTour(NB.ui.view), 900);
  }
};

/* ============================================================
   ЧАСТИЧНЫЙ РЕНДЕР — только view
   ============================================================ */
NB.renderView = function () {
  const view = document.getElementById('view');
  if (!view) return NB.render();
  NB.ui._booting = true;

  const nav = NB.getVisibleNav();
  if (!nav.some(n => n.id === NB.ui.view)) NB.ui.view = 'dashboard';

  const v = NB.views.staff;
  const content = v[NB.ui.view] ? v[NB.ui.view]() : v.dashboard();

  /* Обновляем активный пункт меню */
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === NB.ui.view);
  });

  view.innerHTML = content;
  view.classList.remove('fade');
  void view.offsetWidth;
  view.classList.add('fade');

  NB.ui._booting = false;
  afterRender();

  /* Обновляем панель дня */
  const bar = document.querySelector('.sim-bar');
  if (bar) bar.outerHTML = NB.simBar();

  /* Тема */
  if (NB.story && NB.story.applyTheme) NB.story.applyTheme();

  /* Восстановление скролла */
  const savedScroll = NB.ui.scrollPositions[NB.ui.view];
  if (savedScroll) window.scrollTo(0, savedScroll);

  /* Контекстный тур при первом заходе в view */
  setTimeout(() => {
    if (!NB.state.onboarded.views[NB.ui.view] && NB.game.TOURS_BY_VIEW[NB.ui.view]) {
      if (!document.querySelector('.tour-overlay')) {
        NB.game.startViewTour(NB.ui.view);
      }
    }
  }, 500);
};

/* ============================================================
   ПОСТ-РЕНДЕР
   ============================================================ */
function afterRender() {
  if (NB.ui.view === 'dashboard') NB.charts.startTraffic();
  else NB.charts.stopTraffic();

  NB.charts.animateCounters();

  setTimeout(() => {
    const rv = document.getElementById('revenue-chart');
    if (rv) NB.charts.drawRevenue(rv, NB.state.revenue);
  }, 50);
}

/* ============================================================
   АВТООБНОВЛЕНИЕ SIMBAR (каждые 15 сек)
   ============================================================ */
let autoRefreshTimer = null;
function startAutoRefresh() {
  if (autoRefreshTimer) return;
  autoRefreshTimer = setInterval(() => {
    /* Не обновляем если открыт модал/тур */
    const modalOpen = !document.getElementById('modal').classList.contains('hidden');
    const tourOpen = !!document.querySelector('.tour-overlay');
    if (modalOpen || tourOpen) return;
    if (NB.ui._booting) return;

    const bar = document.querySelector('.sim-bar');
    if (bar) {
      const freshBar = NB.simBar();
      const wrapper = document.createElement('div');
      wrapper.innerHTML = freshBar;
      bar.replaceWith(wrapper.firstElementChild);
    }
  }, 15000);
}

/* ============================================================
   ВСПОМОГАТЕЛЬНЫЕ ДЕЙСТВИЯ
   ============================================================ */
/* Провести вечер с семьёй (быстрое действие из рекомендаций) */
if (!NB.actions.familyEvening) {
  NB.actions.familyEvening = function () {
    const g = NB.state.game;
    if (!g.family.wife) return NB.toast('Нет семьи', 'err');
    if (!NB.spendAp(1)) return NB.toast('Не хватает AP', 'err');
    g.family.wifeHappiness = Math.min(100, g.family.wifeHappiness + 20);
    g.family.crisisShown = false;
    NB.addLog('Проведён вечер с семьёй (+20 счастья)', 'success');
    NB.notify('Семья довольна', 'ok');
    NB.save();
    NB.renderView();
  };
}

/* ============================================================
   ОБРАБОТКА КЛИКОВ
   ============================================================ */
document.addEventListener('click', e => {

  /* 1. Действия (data-action) */
  const t = e.target.closest('[data-action]');
  if (t) {
    const name = t.dataset.action;
    /* Специальный case для family-evening через рекомендации */
    const map = NB.actions.map || {};
    const fn = name === 'family-evening' ? NB.actions.familyEvening : map[name];
    if (!fn) {
      console.warn('[NetBill] Unknown action:', name);
      NB.toast(`Неизвестное действие: ${name}`, 'err');
      return;
    }
    try {
      fn(t.dataset);
    } catch (err) {
      console.error('[NetBill] Action error:', name, err);
      NB.toast('Ошибка действия', 'err');
    }
    return;
  }

  /* 2. Переключение вкладки */
  const v = e.target.closest('[data-view]');
  if (v) {
    const targetView = v.dataset.view;
    const nav = NB.getVisibleNav();
    if (!nav.some(n => n.id === targetView)) {
      NB.toast('Вкладка ещё не открыта', 'err');
      return;
    }
    /* Сохраняем скролл перед сменой */
    NB.ui.scrollPositions[NB.ui.view] = window.scrollY;
    NB.ui.view = targetView;
    NB.ui.query = '';
    NB.renderView();
    window.scrollTo(0, 0);
    return;
  }

  /* 3. Скролл к секции */
  const st = e.target.closest('[data-scroll-to]');
  if (st) {
    const target = document.querySelector(st.dataset.scrollTo);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  /* 4. Фильтры счетов */
  const f = e.target.closest('[data-filter]');
  if (f) {
    NB.ui.invoiceFilter = f.dataset.filter;
    NB.renderView();
    return;
  }

  /* 5. Вкладки счетов */
  const it = e.target.closest('[data-invoice-tab]');
  if (it) {
    NB.ui.invoiceTab = it.dataset.invoiceTab;
    NB.renderView();
    return;
  }

  /* 6. Фильтры активности */
  const af = e.target.closest('[data-activity-filter]');
  if (af) {
    NB.ui.activityFilter = af.dataset.activityFilter;
    NB.renderView();
    return;
  }

  /* 7. Треды чата */
  const ct = e.target.closest('[data-chat-thread]');
  if (ct) {
    NB.ui.chatThreadId = Number(ct.dataset.chatThread);
    NB.renderView();
    return;
  }

  /* 8. Ответы в чате */
  const cr = e.target.closest('[data-chat-reply]');
  if (cr) {
    const thread = NB.state.tickets.find(t => t.id === NB.ui.chatThreadId);
    if (thread) NB.chat.handleReply(thread.id, Number(cr.dataset.chatReply));
    return;
  }

  /* 9. Сортировка клиентов */
  const s = e.target.closest('[data-sort]');
  if (s) {
    const key = s.dataset.sort;
    if (NB.ui.clientSort.key === key) {
      NB.ui.clientSort.dir = NB.ui.clientSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      NB.ui.clientSort.key = key;
      NB.ui.clientSort.dir = 'asc';
    }
    NB.renderView();
    return;
  }

  /* 10. Speed-test */
  if (e.target.id === 'start-speed') {
    NB.charts.runSpeedTest();
    return;
  }

  /* 11. Закрытие модалки по клику на фон */
  if (e.target.id === 'modal') {
    NB.closeModal();
    return;
  }

  /* 12. data-close внутри модалки */
  if (e.target.closest('[data-close]')) {
    NB.closeModal();
    return;
  }
});

/* ============================================================
   INPUT — поиск клиентов (debounce через RAF)
   ============================================================ */
let rafPending = false;
document.addEventListener('input', e => {
  if (e.target.id !== 'client-search') return;
  NB.ui.query = e.target.value;
  if (rafPending) return;
  rafPending = true;
  const pos = e.target.selectionStart;
  requestAnimationFrame(() => {
    rafPending = false;
    NB.renderView();
    const el = document.getElementById('client-search');
    if (el) {
      el.focus();
      try { el.setSelectionRange(pos, pos); } catch (err) {}
    }
  });
});

/* ============================================================
   CHANGE — настройки (чекбоксы)
   ============================================================ */
document.addEventListener('change', e => {
  const key = e.target.dataset.setting;
  if (!key) return;
  if (e.target.type === 'checkbox') {
    NB.state.settings[key] = e.target.checked;
    NB.save();
  }
});

/* ============================================================
   КЛАВИАТУРА
   ============================================================ */
document.addEventListener('keydown', e => {
  /* Esc — закрыть модал */
  if (e.key === 'Escape') {
    const modal = document.getElementById('modal');
    if (modal && !modal.classList.contains('hidden')) {
      NB.closeModal();
      return;
    }
  }

  /* Не перехватываем ввод в полях */
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

  /* 1-9 — быстрые вкладки */
  if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const idx = Number(e.key) - 1;
    const nav = NB.getVisibleNav();
    if (nav[idx]) {
      e.preventDefault();
      NB.ui.scrollPositions[NB.ui.view] = window.scrollY;
      NB.ui.view = nav[idx].id;
      NB.ui.query = '';
      NB.renderView();
      window.scrollTo(0, 0);
    }
    return;
  }
});

/* ============================================================
   RESIZE
   ============================================================ */
let resizeTimer = null;
window.addEventListener('resize', () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const c = document.getElementById('traffic-chart');
    if (c) NB.charts.drawLine(c, NB.charts.trafficData);
    const rv = document.getElementById('revenue-chart');
    if (rv) NB.charts.drawRevenue(rv, NB.state.revenue);
  }, 150);
});

/* ============================================================
   BEFOREUNLOAD — автосохранение
   ============================================================ */
window.addEventListener('beforeunload', () => {
  try { NB.save(); } catch (err) { /* ignore */ }
});

/* ============================================================
   СТАРТ
   ============================================================ */
NB.checkUnlocks();
NB.render();
startAutoRefresh();

if (NB.story && NB.story.applyTheme) NB.story.applyTheme();

console.log('%c◉ NetBill', 'color:#ff6b00;font-weight:800;font-size:16px', '— v17 ready');

})(window);