/* isp_billing_core.js — состояние, утилиты, эффекты, UI-кирпичики */
(function (global) {
'use strict';
const NB = global.NB = global.NB || {};
NB.views  = NB.views  || { staff: {}, client: {} };
NB.charts = NB.charts || {};
NB.actions= NB.actions|| {};
NB.auth   = NB.auth   || {};
NB.game   = NB.game   || {};
NB.story  = NB.story  || {};
NB.effects= NB.effects|| {};

/* =========== УТИЛИТЫ =========== */
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
NB.toISO  = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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

const FIRST_NAMES = ['Иван','Алексей','Дмитрий','Мария','Анна','Ольга','Павел','Екатерина','Сергей','Наталья','Владимир','Юлия','Андрей','Татьяна','Михаил','Елена','Артём','Ксения','Максим','Вера'];
const LAST_NAMES = ['Иванов','Петров','Сидоров','Кузнецов','Смирнов','Волков','Морозов','Новиков','Фёдоров','Соколов','Попов','Лебедев','Козлов','Некрасов','Орлов','Зайцев','Павлов','Семёнов','Голубев','Виноградов'];
const STREETS = ['Ленина','Мира','Гагарина','Садовая','Северная','Речная','Пушкина','Гоголя','Лермонтова','Советская','Молодёжная','Центральная','Школьная','Лесная','Солнечная','Тихая','Октябрьская','Победы'];
const ORGS = ['ООО «Вектор»','ООО «Логистик»','ООО «ТехноПлюс»','ООО «Смарт»','ООО «СтройГрад»','ООО «Оптима»','ИП Соколов','ООО «ДатаЛайн»','АО «Северсталь»','ООО «Кибердом»'];
const DRONE_NAMES = ['UNIT','DR','NX','HR','MX','QX','VX','AX'];
const DRONE_ROLES = ['рабочий','курьер','инженер','оператор','охранник','техник','медик','пилот','строитель'];

NB.genName = () => Math.random() < 0.15 ? NB.pick(ORGS) : `${NB.pick(LAST_NAMES)} ${NB.pick(FIRST_NAMES)}`;
NB.genDroneName = () => `${NB.pick(DRONE_NAMES)}-${NB.randInt(100, 9999)} · ${NB.pick(DRONE_ROLES)}`;
NB.genAddress = () => `ул. ${NB.pick(STREETS)}, ${NB.randInt(1, 120)}–${NB.randInt(1, 99)}`;
NB.genPhone = () => `+7 ${NB.randInt(900, 999)} ${NB.randInt(100, 999)}-${NB.randInt(10, 99)}-${NB.randInt(10, 99)}`;

NB.LS_KEY = 'netbill_neon_v10';
NB.DEFAULT_PASS = '1234';

/* =========== НАЧАЛЬНОЕ СОСТОЯНИЕ =========== */
function defaultGame() {
  return {
    cash: 50000,
    goal: 500000,
    reputation: 100,
    level: 1,
    upgrades: {
      ddos: 0, bandwidth: 0, support: 0, marketing: 0,
      fiber: 0, satellite: 0, ai: 0, quantum: 0,
      firewall: 0, microBooster: 0, darkFiber: 0,
      autoCollect: 0, autoClean: 0, salesBoost: 0,
      bunker: 0, anomalyScanner: 0
    },
    unlockedTech: [],
    activeEvent: null,
    history: [],
    marketShare: 12,
    competitors: [
      { name: 'Starlink',   share: 34, color: '#3b82f6', desc: 'Спутниковый гигант' },
      { name: 'МТС',         share: 28, color: '#ef4444', desc: 'Мобильный оператор' },
      { name: 'Ростелеком', share: 18, color: '#22c55e', desc: 'Национальный провайдер' },
      { name: 'Малые ISP',  share:  8, color: '#7a7a86', desc: 'Локальные сети' }
    ],
    daily: {
      pendingRevenue: 0, pendingClients: 0, pendingInvoices: 0,
      collectedToday: 0, dayCompleted: false, lastDayRevenue: 0,
      dayNumber: 1
    },
    stats: {
      totalRevenue: 0, totalExpenses: 0, daysPlayed: 1,
      eventsResolved: 0, won: false, lost: false, endings: []
    },
    world: {
      arc: 'ordinary',
      arcDay: 0,
      storyQueue: [],
      flags: {},
      news: [],
      threat: 0,
      threatNamed: false,
      neon: {
        met: false, trust: 0, helped: 0,
        state: 'active', lastContactDay: 0
      },
      drones: { enabled: false, count: 0, replaced: 0, droneClients: 0 },
      bunker: { built: false, level: 0 },
      equipment: {
        anomalyScanner: false,
        resonanceShield: false,
        quantumKey: false,
        signalJammer: false
      },
      lastNewsDay: 0,
      attacksSurvived: 0,
      family: { wife: null, kids: 0, safe: true }
    }
  };
}

function seed() {
  const tariffs = [
    { id: 1, name: 'Старт',        speed: 100,  price: 450,  color: '#ff6b00', desc: 'Базовый доступ для дома' },
    { id: 2, name: 'Оптимальный',  speed: 300,  price: 650,  color: '#ff9500', desc: 'Для стриминга и учёбы' },
    { id: 3, name: 'Гигабит',      speed: 1000, price: 990,  color: '#ffb347', desc: 'Максимальная скорость' },
    { id: 4, name: 'Бизнес',       speed: 500,  price: 1500, color: '#ff3d00', desc: 'Для офиса и команды' }
  ];
  const named = ['Иванов Алексей','Петрова Мария','Сидоров Дмитрий','Кузнецова Анна','ООО «Вектор»','Смирнов Павел','Волкова Ольга','ООО «Логистик»'];
  const clients = Array.from({ length: 8 }, (_, i) => {
    const t = NB.pick(tariffs);
    const balance = NB.randInt(-500, 3000);
    return {
      id: i + 1,
      name: i < named.length ? named[i] : NB.genName(),
      address: NB.genAddress(),
      phone: NB.genPhone(),
      tariffId: t.id,
      balance,
      status: balance < 0 ? 'blocked' : 'active',
      createdAt: new Date(Date.now() - NB.randInt(5, 400) * 864e5).toISOString(),
      password: NB.DEFAULT_PASS,
      isDrone: false
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
    { id: 1, clientId: 2, subject: 'Медленная скорость вечером', status: 'open', createdAt: new Date(Date.now() - 2 * 864e5).toISOString() }
  ];
  const today = NB.toISO(new Date());
  const revenue = Array.from({ length: 14 }, (_, i) => ({
    date: NB.addDays(today, -(13 - i)),
    amount: NB.randInt(800, 3000)
  }));
  const growth = Array.from({ length: 14 }, (_, i) => ({
    date: NB.addDays(today, -(13 - i)),
    count: 5 + i + NB.randInt(-1, 2)
  }));
  return {
    tariffs, clients, invoices, tickets,
    activity: [{ id: 1, text: 'Система биллинга запущена', type: 'sys', at: new Date().toISOString() }],
    notifications: [],
    revenue, growth,
    seq: { tariff: 5, client: clients.length + 1, invoice: invoices.length + 1, ticket: 2, activity: 2, notif: 1, story: 1 },
    session: null,
    simDate: today,
    settings: { autoNewClients: true, autoPayments: true, spamEnabled: true },
    favorites: { clients: [], staff: [] },
    staffAccounts: [{ username: 'admin', password: 'admin', name: 'Администратор' }],
    onboarded: { staff: false, clients: [] },
    game: defaultGame(),
    story: { seenEvents: [], choices: {} }
  };
}

function migrate(s) {
  if (!s.game) s.game = defaultGame();
  const g = s.game;
  if (!g.upgrades) g.upgrades = defaultGame().upgrades;
  const keys = ['ddos','bandwidth','support','marketing','fiber','satellite','ai','quantum','firewall','microBooster','darkFiber','autoCollect','autoClean','salesBoost','bunker','anomalyScanner'];
  keys.forEach(k => { if (typeof g.upgrades[k] !== 'number') g.upgrades[k] = 0; });
  delete g.upgrades.solverShield;
  if (!g.world) g.world = defaultGame().world;
  if (!g.world.family) g.world.family = { wife: null, kids: 0, safe: true };
  if (!g.daily) g.daily = defaultGame().daily;
  if (!g.daily.dayNumber) g.daily.dayNumber = 1;
  if (!s.story) s.story = { seenEvents: [], choices: {} };
  if (!s.story.seenEvents) s.story.seenEvents = [];
  if (!s.story.choices) s.story.choices = {};
  if (s.settings) {
    delete s.settings.tickMs;
    delete s.settings.autoTick;
    delete s.settings.churnChance;
    delete s.settings.snSpam;
    if (typeof s.settings.spamEnabled !== 'boolean') s.settings.spamEnabled = true;
  }
  if (!s.seq.story) s.seq.story = 1;
  return s;
}

function load() {
  try { const raw = localStorage.getItem(NB.LS_KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) {}
  const s = seed(); localStorage.setItem(NB.LS_KEY, JSON.stringify(s)); return s;
}
NB.state = load();
NB.save = () => localStorage.setItem(NB.LS_KEY, JSON.stringify(NB.state));
NB.resetState = function () {
  if (!confirm('Сбросить все данные к началу? Прогресс потерян.')) return;
  NB.state = seed(); NB.save(); NB.render();
  NB.toast('Данные сброшены', 'ok');
};
NB.tariff = id => NB.state.tariffs.find(t => t.id === id);
NB.client = id => NB.state.clients.find(c => c.id === id);
NB.price  = id => (NB.tariff(id) || { price: 0 }).price;

NB.ui = {
  view: 'dashboard',
  query: '',
  clientSort: { key: 'name', dir: 'asc' },
  invoiceFilter: 'all',
  newsView: 'all'
};

/* =========== ЭФФЕКТЫ =========== */
const effectStyle = document.createElement('style');
effectStyle.textContent = `
@keyframes shake {
  10%,90%{transform:translate3d(-1px,0,0)}
  20%,80%{transform:translate3d(2px,0,0)}
  30%,50%,70%{transform:translate3d(-4px,0,0)}
  40%,60%{transform:translate3d(4px,0,0)}
}
@keyframes fadeOutRed {from{opacity:1}to{opacity:0}}
.glitch-text{animation:glitch .25s infinite;text-shadow:2px 0 #ff0000,-2px 0 #00ffff}
@keyframes glitch{
  0%{transform:translate(0)}
  20%{transform:translate(-2px,2px)}
  40%{transform:translate(-2px,-2px)}
  60%{transform:translate(2px,2px)}
  80%{transform:translate(2px,-2px)}
  100%{transform:translate(0)}
}
@keyframes redPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,0,0,.4)}50%{box-shadow:0 0 0 12px rgba(255,0,0,0)}}
.cyn-warning{animation:redPulse 2s infinite}
@keyframes typewriter{from{width:0}to{width:100%}}
.typewriter{overflow:hidden;white-space:nowrap;border-right:2px solid var(--primary);animation:typewriter 2s steps(80) both}
@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.fade-in{animation:fadein .5s cubic-bezier(.2,.7,.3,1) both}
`;
document.head.appendChild(effectStyle);

NB.effects.shake = function (duration = 500) {
  const root = document.getElementById('root');
  if (!root) return;
  root.style.animation = 'none';
  void root.offsetWidth;
  root.style.animation = `shake ${duration}ms cubic-bezier(.36,.07,.19,.97) both`;
  setTimeout(() => { root.style.animation = ''; }, duration + 50);
};
NB.effects.redFlash = function () {
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;inset:0;background:rgba(255,0,0,.35);z-index:200;pointer-events:none;animation:fadeOutRed .7s forwards';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 800);
};
NB.effects.glitch = function (el) {
  if (!el) return;
  const original = el.textContent;
  const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
  let iter = 0;
  const iv = setInterval(() => {
    el.textContent = original.split('').map(c => Math.random() < 0.3 ? chars[Math.floor(Math.random() * chars.length)] : c).join('');
    if (++iter > 12) { clearInterval(iv); el.textContent = original; }
  }, 50);
};
NB.effects.typewriter = function (el, text) {
  if (!el) return;
  el.textContent = '';
  el.classList.add('typewriter');
  let i = 0;
  const tick = () => {
    if (i <= text.length) { el.textContent = text.slice(0, i); i++; setTimeout(tick, 28); }
    else el.classList.remove('typewriter');
  };
  tick();
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

/* =========== NOTIFY =========== */
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
  if (NB.state.activity.length > 120) NB.state.activity = NB.state.activity.slice(-120);
  NB.save();
};

/* =========== MODAL =========== */
let modalHandler = null;
NB.openModal = function ({ title, html, submit = 'Сохранить', onSubmit, wide, boxClass, noSubmit }) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `<div class="modal-box ${boxClass || ''}"${wide ? ' style="width:min(560px,100%)"' : ''}>
    <h3>${title}</h3>
    <form id="modal-form" novalidate>${html}
      <div class="modal-actions">
        <button type="button" class="btn ghost" data-close>${noSubmit ? 'Закрыть' : 'Отмена'}</button>
        ${noSubmit ? '' : (submit ? `<button type="submit" class="btn primary">${submit}</button>` : '')}
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
  setTimeout(() => { const f = form.querySelector('input,select,textarea,button'); if (f) f.focus(); }, 70);
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
    return { clients: NB.state.clients.length, mrr, revenue: rev, due, marketShare: NB.state.game.marketShare };
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

/* =========== LIVE REFRESH =========== */
NB.refreshLive = function () {
  const stats = NB.computeStats();
  document.querySelectorAll('.stat-value[data-stat]').forEach(el => {
    const key = el.dataset.stat;
    if (key && key in stats) {
      const v = stats[key];
      el.textContent = el.dataset.money === '1' ? NB.money(v) : Math.round(v);
    }
  });
  const cashEl = document.getElementById('game-cash');
  if (cashEl) cashEl.textContent = NB.money(NB.state.game.cash);
  const pendEl = document.getElementById('pending-revenue');
  if (pendEl) pendEl.textContent = NB.money(NB.state.game.daily.pendingRevenue);
  const barEl = document.getElementById('game-goal-bar');
  if (barEl) barEl.style.width = Math.min(100, (NB.state.game.cash / NB.state.game.goal) * 100) + '%';
  const lvlEl = document.getElementById('game-level');
  if (lvlEl) lvlEl.textContent = NB.state.game.level;
  const repEl = document.getElementById('game-rep');
  if (repEl) repEl.textContent = NB.state.game.reputation;
  const dayEl = document.getElementById('day-number');
  if (dayEl) dayEl.textContent = 'День ' + NB.state.game.daily.dayNumber;
  updateNotifBadge();
};

/* =========== SHELL =========== */
NB.buildShell = function (navItems, userName, userMeta, content, opts) {
  opts = opts || {};
  const unread = NB.unreadNotifs();
  const arcClass = (NB.state.game && NB.state.game.world && NB.state.game.world.arc) || 'ordinary';
  document.body.dataset.arc = arcClass;
  return `<div class="app">
    <aside class="sidebar">
      <div class="brand"><span class="brand-logo">◉</span><span>NetBill</span></div>
      <nav class="nav">
        ${navItems.map(n => `<button class="nav-item ${NB.ui.view === n.id ? 'active' : ''}" data-view="${n.id}">
          <span class="nav-icon">${n.icon}</span><span>${n.label}</span></button>`).join('')}
      </nav>
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

/* Панель дня: только дата + кнопка «+1 день». Никаких скоростей. */
NB.simBar = function () {
  const st = NB.state;
  const pending = st.game.daily.pendingRevenue;
  const eventActive = !!st.game.activeEvent;
  const storyQueue = st.game.world.storyQueue.length;
  let note = '';
  if (eventActive) note = '<span class="sim-note warn">⚠ Решите событие</span>';
  else if (storyQueue) note = '<span class="sim-note story">◆ Сюжетное событие</span>';
  else if (pending > 0) note = `<span class="sim-note">Несобранная выручка: <b>${NB.money(pending)}</b></span>`;
  else note = '<span class="sim-note muted">Готовы к новому дню</span>';

  return `<div class="sim-bar">
    <div class="sim-date"><span>📅</span><span>${NB.dayLabel(st.simDate)}</span><span class="sim-day">· День ${st.game.daily.dayNumber}</span></div>
    <div class="spacer"></div>
    ${note}
    <button class="btn primary small" data-action="advance-day">Следующий день →</button>
  </div>`;
};

})(window);