/* isp_billing_core.js — утилиты, состояние, хранилище, UI-кирпичики */
(function (global) {
'use strict';
const NB = global.NB = global.NB || {};
NB.views = NB.views || { staff: {}, client: {} };
NB.charts = NB.charts || {};
NB.actions = NB.actions || {};
NB.auth = NB.auth || {};
NB.game = NB.game || {};

NB.$ = (s, r = document) => r.querySelector(s);
NB.esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
NB.money = n => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' ₽';
NB.fmtDate = iso => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
NB.fmtDateTime = iso => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
NB.period = () => new Date().toISOString().slice(0, 7);
NB.periodLabel = p => { const [y, m] = p.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }); };
NB.initials = n => String(n).replace(/[«»"]/g, '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
NB.rand = (a, b) => a + Math.random() * (b - a);
NB.randInt = (a, b) => Math.floor(NB.rand(a, b + 1));
NB.pick = arr => arr[Math.floor(Math.random() * arr.length)];

NB.parseDate = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
NB.toISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
NB.addDays = (iso, n) => { const d = NB.parseDate(iso); d.setDate(d.getDate() + n); return NB.toISO(d); };
NB.dayLabel = iso => { const d = NB.parseDate(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' }); };
NB.timeAgo = iso => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff/60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff/3600)} ч назад`;
  if (diff < 86400 * 7) return `${Math.floor(diff/86400)} дн назад`;
  return NB.fmtDate(iso);
};

const FIRST_NAMES = ['Иван','Алексей','Дмитрий','Мария','Анна','Ольга','Павел','Екатерина','Сергей','Наталья','Владимир','Юлия','Андрей','Татьяна','Михаил','Елена'];
const LAST_NAMES = ['Иванов','Петров','Сидоров','Кузнецов','Смирнов','Волков','Морозов','Новиков','Фёдоров','Соколов','Попов','Лебедев','Козлов','Некрасов','Орлов'];
const STREETS = ['Ленина','Мира','Гагарина','Садовая','Северная','Речная','Пушкина','Гоголя','Лермонтова','Советская','Молодёжная','Центральная','Школьная','Лесная'];
const ORGS = ['ООО «Вектор»','ООО «Логистик»','ООО «ТехноПлюс»','ООО «Смарт»','ООО «СтройГрад»','ООО «Оптима»','ИП Соколов','ООО «ДатаЛайн»'];

NB.genName = () => Math.random() < 0.15 ? NB.pick(ORGS) : `${NB.pick(LAST_NAMES)} ${NB.pick(FIRST_NAMES)}`;
NB.genAddress = () => `ул. ${NB.pick(STREETS)}, ${NB.randInt(1, 120)}–${NB.randInt(1, 99)}`;
NB.genPhone = () => `+7 ${NB.randInt(900, 999)} ${NB.randInt(100, 999)}-${NB.randInt(10, 99)}-${NB.randInt(10, 99)}`;

NB.LS_KEY = 'netbill_orange_v4';
NB.DEFAULT_PASS = '1234';

function defaultGame() {
  return {
    cash: 50000,
    goal: 200000,
    reputation: 100,
    level: 1,
    upgrades: { ddos: 0, bandwidth: 0, support: 0, marketing: 0 },
    activeEvent: null,
    history: [],
    stats: { totalRevenue: 0, totalExpenses: 0, daysPlayed: 0, eventsResolved: 0, won: false, lost: false }
  };
}

function seed() {
  const tariffs = [
    { id: 1, name: 'Старт', speed: 100, price: 450, color: '#ff6b00', desc: 'Базовый доступ для дома' },
    { id: 2, name: 'Оптимальный', speed: 300, price: 650, color: '#ff9500', desc: 'Для стриминга и учёбы' },
    { id: 3, name: 'Гигабит', speed: 1000, price: 990, color: '#ffb347', desc: 'Максимальная скорость' },
    { id: 4, name: 'Бизнес', speed: 500, price: 1500, color: '#ff3d00', desc: 'Для офиса и команды' }
  ];
  const named = ['Иванов Алексей','Петрова Мария','Сидоров Дмитрий','Кузнецова Анна','ООО «Вектор»','Смирнов Павел','Волкова Ольга','ООО «Логистик»'];
  const clients = Array.from({ length: 14 }, (_, i) => {
    const t = NB.pick(tariffs);
    const balance = NB.randInt(-500, 5000);
    return {
      id: i + 1,
      name: i < named.length ? named[i] : NB.genName(),
      address: NB.genAddress(),
      phone: NB.genPhone(),
      tariffId: t.id,
      balance,
      status: balance < 0 ? 'blocked' : 'active',
      createdAt: new Date(Date.now() - NB.randInt(5, 400) * 864e5).toISOString(),
      password: NB.DEFAULT_PASS
    };
  });
  const p = NB.period();
  const invoices = clients.map((c, i) => {
    const t = tariffs.find(x => x.id === c.tariffId);
    const paid = i % 3 !== 0;
    return { id: i + 1, clientId: c.id, period: p, amount: t.price,
      status: paid ? 'paid' : 'unpaid',
      paidAt: paid ? new Date(Date.now() - NB.randInt(1, 20) * 864e5).toISOString() : null };
  });
  const tickets = [
    { id: 1, clientId: 2, subject: 'Медленная скорость вечером', status: 'open', createdAt: new Date(Date.now() - 2 * 864e5).toISOString() },
    { id: 2, clientId: 4, subject: 'Не приходит счёт на почту', status: 'open', createdAt: new Date(Date.now() - 5 * 36e5).toISOString() },
    { id: 3, clientId: 7, subject: 'Хочу сменить тариф', status: 'resolved', createdAt: new Date(Date.now() - 8 * 864e5).toISOString() }
  ];
  const today = NB.toISO(new Date());
  const revenue = Array.from({ length: 14 }, (_, i) => ({
    date: NB.addDays(today, -(13 - i)),
    amount: NB.randInt(800, 6000)
  }));
  const growth = Array.from({ length: 14 }, (_, i) => ({
    date: NB.addDays(today, -(13 - i)),
    count: 10 + i + NB.randInt(-1, 2)
  }));
  return {
    tariffs, clients, invoices, tickets,
    activity: [{ id: 1, text: 'Система биллинга запущена', type: 'sys', at: new Date().toISOString() }],
    notifications: [],
    revenue, growth,
    seq: { tariff: 5, client: clients.length + 1, invoice: invoices.length + 1, ticket: 4, activity: 2, notif: 1 },
    session: null,
    simDate: today,
    settings: { autoTick: false, tickMs: 5000, autoNewClients: true, autoPayments: true, churnChance: 0.06 },
    favorites: { clients: [], staff: [] },
    staffAccounts: [{ username: 'admin', password: 'admin', name: 'Администратор' }],
    onboarded: { staff: false, clients: [] },
    game: defaultGame()
  };
}

function migrate(s) {
  if (!s.game) s.game = defaultGame();
  if (!s.onboarded) s.onboarded = { staff: false, clients: [] };
  if (!s.favorites) s.favorites = { clients: [], staff: [] };
  if (!s.staffAccounts) s.staffAccounts = [{ username: 'admin', password: 'admin', name: 'Администратор' }];
  if (!s.notifications) s.notifications = [];
  if (!s.seq.notif) s.seq.notif = (s.notifications.length || 0) + 1;
  if (!s.game.stats) s.game.stats = { totalRevenue: 0, totalExpenses: 0, daysPlayed: 0, eventsResolved: 0, won: false, lost: false };
  return s;
}

function load() {
  try { const raw = localStorage.getItem(NB.LS_KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) {}
  const s = seed(); localStorage.setItem(NB.LS_KEY, JSON.stringify(s)); return s;
}
NB.state = load();
NB.save = () => localStorage.setItem(NB.LS_KEY, JSON.stringify(NB.state));
NB.resetState = function () {
  if (!confirm('Сбросить все данные к началу? Текущий прогресс будет потерян.')) return;
  NB.state = seed(); NB.save(); NB.render();
  NB.toast('Данные сброшены', 'ok');
};
NB.tariff = id => NB.state.tariffs.find(t => t.id === id);
NB.client = id => NB.state.clients.find(c => c.id === id);
NB.price = id => (NB.tariff(id) || { price: 0 }).price;

NB.ui = {
  view: 'dashboard',
  query: '',
  clientSort: { key: 'name', dir: 'asc' },
  invoiceFilter: 'all'
};

/* =========== TOAST =========== */
NB.toast = function (msg, type) {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'err' ? ' err' : type === 'ok' ? ' ok' : '');
  el.textContent = msg;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 320); }, 2600);
};

/* notify — только state, БЕЗ рендера */
NB.notify = function (text, type, opts) {
  opts = opts || {};
  NB.state.notifications.unshift({
    id: NB.state.seq.notif++, text, type: type || 'info',
    at: new Date().toISOString(), read: false
  });
  if (NB.state.notifications.length > 40) NB.state.notifications = NB.state.notifications.slice(0, 40);
  if (!opts.noToast) NB.toast(text, type === 'warn' ? 'err' : type === 'ok' ? 'ok' : '');
  updateNotifBadge();
  NB.save();
};
function updateNotifBadge() {
  const unread = NB.state.notifications.filter(n => !n.read).length;
  document.querySelectorAll('.notif-badge').forEach(el => {
    if (unread > 0) { el.textContent = unread; el.style.display = ''; }
    else el.style.display = 'none';
  });
}
NB.unreadNotifs = () => NB.state.notifications.filter(n => !n.read).length;

NB.confetti = function () {
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  const colors = ['#ff6b00','#ff9500','#ffb347','#ff3d00','#ffaa33'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('i');
    p.style.left = NB.rand(0, 100) + '%';
    p.style.background = colors[i % colors.length];
    p.style.color = colors[i % colors.length];
    p.style.animationDelay = NB.rand(0, .3) + 's';
    p.style.animationDuration = NB.rand(1.2, 2) + 's';
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 2500);
};

NB.addActivity = function (text, type) {
  NB.state.activity.push({ id: NB.state.seq.activity++, text, type: type || 'sys', at: new Date().toISOString() });
  if (NB.state.activity.length > 80) NB.state.activity = NB.state.activity.slice(-80);
  NB.save();
};

/* =========== MODAL =========== */
let modalHandler = null;
NB.openModal = function ({ title, html, submit = 'Сохранить', onSubmit, wide, boxClass }) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `<div class="modal-box ${boxClass || ''}"${wide ? ' style="width:min(560px,100%)"' : ''}>
    <h3>${title}</h3>
    <form id="modal-form" novalidate>${html}
      <div class="modal-actions">
        <button type="button" class="btn ghost" data-close>${submit ? 'Отмена' : 'Закрыть'}</button>
        ${submit ? `<button type="submit" class="btn primary">${submit}</button>` : ''}
      </div>
    </form>
  </div>`;
  modal.classList.remove('hidden');
  requestAnimationFrame(() => modal.classList.add('show'));
  const form = document.getElementById('modal-form');
  modalHandler = onSubmit;
  form.addEventListener('submit', e => { e.preventDefault(); if (modalHandler) modalHandler(new FormData(form), form); });
  const cb = modal.querySelector('[data-close]');
  if (cb) cb.addEventListener('click', NB.closeModal);
  setTimeout(() => { const f = form.querySelector('input,select,textarea'); if (f) f.focus(); }, 70);
};
NB.closeModal = function () {
  const modal = document.getElementById('modal');
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => modal.classList.add('hidden'), 220);
};

/* =========== FORMS =========== */
NB.field = (label, name, type = 'text', value = '', extra = '') =>
  `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${NB.esc(value)}" ${extra}></label>`;
NB.textareaField = (label, name, value = '') =>
  `<label class="field"><span>${label}</span><textarea name="${name}">${NB.esc(value)}</textarea></label>`;
NB.selectField = (label, name, opts) =>
  `<label class="field"><span>${label}</span><select name="${name}">${opts.map(o => `<option value="${o.v}">${NB.esc(o.l)}</option>`).join('')}</select></label>`;

/* =========== STATS =========== */
NB.statCard = function (label, value, sub, moneyFmt, color, key) {
  return `<div class="stat" style="--c:${color}">
    <div class="stat-top"><span>${label}</span><i></i></div>
    <div class="stat-value" data-stat="${key || ''}" data-count="${value}" data-money="${moneyFmt ? 1 : 0}">0</div>
    <div class="stat-sub">${sub}</div>
  </div>`;
};

NB.computeStats = function () {
  if (!NB.state.session) return {};
  if (NB.state.session.role === 'staff') {
    const active = NB.state.clients.filter(c => c.status === 'active');
    const mrr = active.reduce((s, c) => s + NB.price(c.tariffId), 0);
    const p = NB.period();
    const due = NB.state.invoices.filter(i => i.status === 'unpaid' && i.period === p).reduce((s, i) => s + i.amount, 0);
    const rev = NB.state.revenue.slice(-14).reduce((s, r) => s + r.amount, 0);
    return { clients: NB.state.clients.length, mrr, revenue: rev, due };
  } else {
    const c = NB.client(NB.state.session.id);
    if (!c) return {};
    const myInv = NB.state.invoices.filter(i => i.clientId === c.id);
    const due = myInv.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0);
    const paid = myInv.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
    const t = NB.tariff(c.tariffId) || { speed: 0 };
    return { balance: c.balance, speed: t.speed, due, totalPaid: paid };
  }
};

/* =========== LIVE REFRESH — без ре-рендера =========== */
NB.refreshLive = function () {
  /* stats */
  const stats = NB.computeStats();
  document.querySelectorAll('.stat-value[data-stat]').forEach(el => {
    const key = el.dataset.stat;
    if (key && key in stats) {
      const v = stats[key];
      el.textContent = el.dataset.money === '1' ? NB.money(v) : Math.round(v);
    }
  });
  /* sim bar */
  const dateEl = document.querySelector('.sim-date span:last-child');
  if (dateEl) dateEl.textContent = NB.dayLabel(NB.state.simDate);
  const revEl = document.querySelector('.sim-meta span:first-child b');
  if (revEl) {
    const last = NB.state.revenue[NB.state.revenue.length - 1];
    revEl.textContent = NB.money(last ? last.amount : 0);
  }
  const cliEl = document.querySelector('.sim-meta span:last-child b');
  if (cliEl) cliEl.textContent = NB.state.clients.length;
  /* game panel */
  const cashEl = document.getElementById('game-cash');
  if (cashEl) cashEl.textContent = NB.money(NB.state.game.cash);
  const barEl = document.getElementById('game-goal-bar');
  if (barEl) barEl.style.width = Math.min(100, (NB.state.game.cash / NB.state.game.goal) * 100) + '%';
  const lvlEl = document.getElementById('game-level');
  if (lvlEl) lvlEl.textContent = NB.state.game.level;
  const repEl = document.getElementById('game-rep');
  if (repEl) repEl.textContent = NB.state.game.reputation;
  /* revenue chart */
  const rv = document.getElementById('revenue-chart');
  if (rv) NB.charts.drawRevenue(rv, NB.state.revenue);
  /* unread notif badge */
  updateNotifBadge();
};

/* =========== SHELL =========== */
NB.buildShell = function (navItems, userName, userMeta, content, opts) {
  opts = opts || {};
  const unread = NB.unreadNotifs();
  return `<div class="app">
    <aside class="sidebar">
      <div class="brand"><span class="brand-logo">◉</span><span>NetBill</span></div>
      <nav class="nav">
        ${navItems.map(n => `<button class="nav-item ${NB.ui.view === n.id ? 'active' : ''}" data-view="${n.id}">
          <span class="nav-icon">${n.icon}</span><span>${n.label}</span></button>`).join('')}
      </nav>
      <div class="sponsor" id="sponsor-slot">⭐ Star Neon — реклама от партнёров</div>
      <div class="sidebar-foot">
        <div class="user-card">
          <div class="user-ava">${NB.esc(NB.initials(userName))}</div>
          <div class="user-info"><b>${NB.esc(userName)}</b><small>${NB.esc(userMeta)}</small></div>
        </div>
        <button class="btn ghost small bell" data-action="show-notifs">🔔 Уведомления${unread ? ` <span class="notif-badge">${unread}</span>` : '<span class="notif-badge" style="display:none">0</span>'}</button>
        <button class="btn ghost small" data-action="start-tour">❔ Гид</button>
        <button class="btn ghost small" data-action="logout">Выйти</button>
      </div>
    </aside>
    <main class="main">
      ${opts.isStaff ? NB.simBar() : ''}
      <div class="view" id="view">${content}</div>
    </main>
  </div>`;
};

NB.simBar = function () {
  const st = NB.state;
  const auto = st.settings.autoTick;
  const ms = st.settings.tickMs;
  const speeds = [
    { v: '0', ms: 0, label: '⏸' },
    { v: '1', ms: 8000, label: '▶' },
    { v: '2', ms: 3000, label: '▶▶' },
    { v: '3', ms: 1000, label: '▶▶▶' }
  ];
  const lastRev = (st.revenue[st.revenue.length - 1] || {}).amount || 0;
  return `<div class="sim-bar">
    <div class="sim-date"><span>📅</span><span>${NB.dayLabel(st.simDate)}</span></div>
    <div class="sim-speed">
      ${speeds.map(s => `<button data-action="sim-speed" data-speed="${s.v}" class="${(!auto && s.v === '0') || (auto && ms === s.ms) ? 'active' : ''}">${s.label}</button>`).join('')}
    </div>
    <div class="spacer"></div>
    <div class="sim-meta">
      <span>Выручка: <b>${NB.money(lastRev)}</b></span>
      <span>Клиентов: <b>${st.clients.length}</b></span>
    </div>
    <button class="btn primary small" data-action="advance-day">+1 день</button>
    <button class="btn ghost small" data-action="advance-week">+7 дней</button>
  </div>`;
};

/* =========== FLOATING AD — Star Neon =========== */
const AD_TEXTS = [
  '⭐ Star Neon — неоновые вывески для бизнеса',
  '⭐ Star Neon: свети ярче конкурентов',
  '⭐ Star Neon — реклама, которую видят',
  '⭐ Star Neon: -20% на первый заказ',
  '⭐ Star Neon: вывески нового поколения',
  '⭐ Star Neon — твой неоновый вайб'
];

let sponsorTimer = null;
NB.startSponsor = function () {
  if (sponsorTimer) return;
  sponsorTimer = setInterval(() => {
    const el = document.getElementById('sponsor-slot');
    if (!el) return;
    el.textContent = NB.pick(AD_TEXTS);
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 800);
  }, 22000);

  /* всплывающая реклама */
  setInterval(() => {
    if (!NB.state.session || document.querySelector('.floating-ad')) return;
    showFloatingAd();
  }, 75000);
};

function showFloatingAd() {
  const ad = document.createElement('div');
  ad.className = 'floating-ad';
  ad.innerHTML = `
    <div class="floating-ad-head">
      <div class="floating-ad-brand">⭐ Star Neon</div>
      <button class="floating-ad-close" type="button">×</button>
    </div>
    <div class="floating-ad-body">${NB.pick(AD_TEXTS).replace('⭐ Star Neon — ', '').replace('⭐ Star Neon: ', '')}</div>
    <div class="floating-ad-cta">Заказать вывеску →</div>`;
  document.body.appendChild(ad);
  requestAnimationFrame(() => ad.classList.add('show'));
  const close = () => { ad.classList.remove('show'); setTimeout(() => ad.remove(), 400); };
  ad.querySelector('.floating-ad-close').addEventListener('click', e => { e.stopPropagation(); close(); });
  ad.addEventListener('click', close);
  setTimeout(close, 9000);
}

})(window);