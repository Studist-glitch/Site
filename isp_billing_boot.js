/* isp_billing_boot.js — рендер, обработчики */
(function (global) {
'use strict';
const NB = global.NB;

if (!NB.ui) NB.ui = {};
if (typeof NB.ui.view === 'undefined') NB.ui.view = 'dashboard';
if (typeof NB.ui.query === 'undefined') NB.ui.query = '';
if (!NB.ui.clientSort) NB.ui.clientSort = { key: 'risk', dir: 'asc' };
if (typeof NB.ui.chatThreadId === 'undefined') NB.ui.chatThreadId = null;
if (!NB.ui.scrollPositions) NB.ui.scrollPositions = {};

NB.render = function () {
  const root = document.getElementById('root');
  if (!root) return;
  NB.ui._booting = true;

  const v = NB.views.staff;
  const nav = NB.getVisibleNav();
  if (!nav.some(n => n.id === NB.ui.view)) NB.ui.view = 'dashboard';
  const content = v[NB.ui.view] ? v[NB.ui.view]() : v.dashboard();
  root.innerHTML = NB.buildShell(nav, content);
  NB.ui._booting = false;
  afterRender();

  if (NB.state.game.activeEvent) setTimeout(() => NB.game.showEventModal(), 300);
  if (NB.state.game.world.storyQueue.length) setTimeout(() => NB.story.showNextInQueue(), 600);

  setTimeout(() => { if (NB.competitors && NB.competitors.processQueue) NB.competitors.processQueue(); }, 2000);

  if (!NB.state.onboarded.tour) setTimeout(() => NB.game.startTour(), 800);
  else if (!NB.state.onboarded.views[NB.ui.view] && NB.game.TOURS_BY_VIEW[NB.ui.view]) {
    setTimeout(() => NB.game.startViewTour(NB.ui.view), 900);
  }
};

NB.renderView = function () {
  const view = document.getElementById('view');
  if (!view) return NB.render();
  NB.ui._booting = true;

  const nav = NB.getVisibleNav();
  if (!nav.some(n => n.id === NB.ui.view)) NB.ui.view = 'dashboard';
  const v = NB.views.staff;
  const content = v[NB.ui.view] ? v[NB.ui.view]() : v.dashboard();

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === NB.ui.view);
  });

  view.innerHTML = content;
  view.classList.remove('fade');
  void view.offsetWidth;
  view.classList.add('fade');

  NB.ui._booting = false;
  afterRender();

  const bar = document.querySelector('.sim-bar');
  if (bar) bar.outerHTML = NB.simBar();
  if (NB.story && NB.story.applyTheme) NB.story.applyTheme();

  /* Обновляем labels в nav при смене эры */
  document.querySelectorAll('.nav-item').forEach(el => {
    const item = nav.find(n => n.id === el.dataset.view);
    if (!item) return;
    const label = NB.navLabel(item);
    const icon = NB.navIcon(item);
    const iconEl = el.querySelector('.nav-icon');
    const labelEl = el.querySelector('span:not(.nav-icon):not(.nav-badge)');
    if (iconEl) iconEl.textContent = icon;
    if (labelEl) labelEl.textContent = label;
  });

  const savedScroll = NB.ui.scrollPositions[NB.ui.view];
  if (savedScroll) window.scrollTo(0, savedScroll);

  setTimeout(() => { if (NB.competitors && NB.competitors.processQueue) NB.competitors.processQueue(); }, 1500);

  setTimeout(() => {
    if (!NB.state.onboarded.views[NB.ui.view] && NB.game.TOURS_BY_VIEW[NB.ui.view]) {
      if (!document.querySelector('.tour-overlay')) NB.game.startViewTour(NB.ui.view);
    }
  }, 500);
};

function afterRender() {
  if (NB.ui.view === 'dashboard') NB.charts.startTraffic();
  else NB.charts.stopTraffic();
  NB.charts.animateCounters();
  setTimeout(() => {
    const rv = document.getElementById('revenue-chart');
    if (rv) NB.charts.drawRevenue(rv, NB.state.revenue);
  }, 50);
  if (NB.atmosphere && NB.atmosphere.scan) setTimeout(() => NB.atmosphere.scan(), 60);
}

let autoRefreshTimer = null;
function startAutoRefresh() {
  if (autoRefreshTimer) return;
  autoRefreshTimer = setInterval(() => {
    if (!document.getElementById('modal')?.classList.contains('hidden')) return;
    if (document.querySelector('.tour-overlay')) return;
    if (NB.ui._booting) return;
    const bar = document.querySelector('.sim-bar');
    if (bar) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = NB.simBar();
      bar.replaceWith(wrapper.firstElementChild);
    }
  }, 15000);
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if (t) {
    const name = t.dataset.action;
    const fn = (NB.actions.map || {})[name];
    if (!fn) { console.warn('[NetBill] Unknown action:', name); NB.toast(`Неизвестное действие: ${name}`, 'err'); return; }
    try { fn(t.dataset); } catch (err) { console.error('[NetBill] action error:', name, err); NB.toast('Ошибка действия', 'err'); }
    return;
  }

  const v = e.target.closest('[data-view]');
  if (v) {
    const targetView = v.dataset.view;
    const nav = NB.getVisibleNav();
    if (!nav.some(n => n.id === targetView)) { NB.toast('Вкладка ещё не открыта', 'err'); return; }
    NB.ui.scrollPositions[NB.ui.view] = window.scrollY;
    NB.ui.view = targetView;
    NB.ui.query = '';
    NB.renderView();
    window.scrollTo(0, 0);
    return;
  }

  const st = e.target.closest('[data-scroll-to]');
  if (st) {
    const target = document.querySelector(st.dataset.scrollTo);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const ct = e.target.closest('[data-chat-thread]');
  if (ct) { NB.ui.chatThreadId = Number(ct.dataset.chatThread); NB.renderView(); return; }

  const cr = e.target.closest('[data-chat-reply]');
  if (cr) {
    const thread = NB.state.tickets.find(x => x.id === NB.ui.chatThreadId);
    if (thread && NB.chat && NB.chat.handleReply) NB.chat.handleReply(thread.id, Number(cr.dataset.chatReply));
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

  if (e.target.id === 'start-speed' && NB.charts.runSpeedTest) { NB.charts.runSpeedTest(); return; }

  if (e.target.id === 'modal') {
    const m = document.getElementById('modal');
    if (m && m._onClose) { try { m._onClose(); } catch(err) { console.warn(err); } }
    NB.closeModal(); return;
  }
});

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
    if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (err) {} }
  });
});

document.addEventListener('change', e => {
  if (e.target.id === 'sim-mode-toggle') {
    NB.state.game.simulationMode = !!e.target.checked;
    NB.save();
    NB.render();
    NB.notify(NB.state.game.simulationMode ? 'Симуляция включена' : 'Симуляция выключена', 'info');
    return;
  }
  const key = e.target.dataset.setting;
  if (!key) return;
  if (e.target.type === 'checkbox') { NB.state.settings[key] = e.target.checked; NB.save(); }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('modal');
    if (modal && !modal.classList.contains('hidden')) { NB.closeModal(); return; }
  }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
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
  }
});

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

window.addEventListener('beforeunload', () => { try { NB.save(); } catch (err) {} });

/* Начальный пул сотрудников, если его нет */
if (!NB.state.game.employeesPool) NB.state.game.employeesPool = [];
if (NB.state.game.employeesPool.length === 0 && NB.employees && NB.employees.generatePool) {
  NB.state.game.employeesPool = NB.employees.generatePool(3);
  NB.save();
}

/* Онбординг: выбор названия компании + режим симуляции */
NB.showOnboarding = function () {
  const g = NB.state.game;
  NB.openModal({
    title: '', noSubmit: true, boxClass: 'event-modal-box',
    html: `
      <div class="event-title" style="text-align:center">⚡ Добро пожаловать</div>
      <div class="event-desc" style="text-align:center;margin-bottom:20px">Настройте свой биллинг</div>
      <div style="margin-bottom:14px">
        <label class="field"><span>Название компании</span>
          <input id="onb-name" type="text" value="${NB.esc(g.companyName || 'NetBill')}" maxlength="30" placeholder="Например, NetBill" required>
        </label>
      </div>
      <div class="event-options" style="margin-bottom:14px">
        <label style="display:flex;align-items:center;gap:10px;padding:14px;background:var(--surface-2);border-radius:10px;cursor:pointer;border:1.5px solid var(--line)">
          <input id="onb-sim" type="checkbox" ${g.simulationMode ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--primary)">
          <div style="flex:1">
            <div style="font-weight:700;color:#fff;font-size:14px">🎮 Включить симуляцию</div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:2px">Полный геймплей: события, дни, конкуренты, сюжет. Иначе — только биллинг.</div>
          </div>
        </label>
      </div>
      <div class="event-options">
        <button type="button" class="event-option" id="onb-start" style="justify-content:center;text-align:center">
          <span class="event-option-label" style="width:100%">Начать →</span>
        </button>
      </div>
    `,
    onClose: () => {
      /* Если закрыли без выбора — берём дефолты */
      g.companyName = g.companyName || 'NetBill';
      g.simulationMode = true;
      NB.state.onboarded.onboarding = true;
      NB.save();
      NB.render();
    }
  });
  setTimeout(() => {
    const nameInput = document.getElementById('onb-name');
    const simCheck = document.getElementById('onb-sim');
    const btn = document.getElementById('onb-start');
    if (btn) btn.addEventListener('click', () => {
      const name = (nameInput.value || 'NetBill').trim().slice(0, 30) || 'NetBill';
      g.companyName = name;
      g.simulationMode = !!simCheck.checked;
      NB.state.onboarded.onboarding = true;
      NB.save();
      NB.closeModal();
      NB.render();
      NB.notify(`Добро пожаловать, ${name}!`, 'ok');
    });
  }, 50);
};

/* Если онбординг не пройден — показать */
setTimeout(() => {
  if (!NB.state.onboarded.onboarding) NB.showOnboarding();
}, 300);

NB.checkUnlocks();
NB.render();
startAutoRefresh();
if (NB.story && NB.story.applyTheme) NB.story.applyTheme();

console.log('%c◉ NetBill', 'color:#ff6b00;font-weight:800;font-size:16px', '— v23 ready');

})(window);