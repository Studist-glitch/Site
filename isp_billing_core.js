/* isp_billing_core.js — утилиты, состояние, хранилище, UI-кирпичики */
(function (global) {
'use strict';
const NB = global.NB = global.NB || {};
NB.views = NB.views || { staff: {}, client: {} };
NB.charts = NB.charts || {};
NB.actions = NB.actions || {};
NB.auth = NB.auth || {};

/* --- утилиты --- */
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

/* --- даты --- */
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

/* --- генераторы --- */
const FIRST_NAMES = ['Иван','Алексей','Дмитрий','Мария','Анна','Ольга','Павел','Екатерина','Сергей','Наталья','Владимир','Юлия','Андрей','Татьяна','Михаил','Елена'];
const LAST_NAMES = ['Иванов','Петров','Сидоров','Кузнецов','Смирнов','Волков','Морозов','Новиков','Фёдоров','Соколов','Попов','Лебедев','Козлов','Некрасов','Орлов'];
const STREETS = ['Ленина','Мира','Гагарина','Садовая','Северная','Речная','Пушкина','Гоголя','Лермонтова','Советская','Молодёжная','Центральная','Школьная','Лесная'];
const ORGS = ['ООО «Вектор»','ООО «Логистик»','ООО «ТехноПлюс»','ООО «Смарт»','ООО «СтройГрад»','ООО «Оптима»','ИП Соколов','ООО «ДатаЛайн»'];

NB.genName = () => Math.random() < 0.15 ? NB.pick(ORGS) : `${NB.pick(LAST_NAMES)} ${NB.pick(FIRST_NAMES)}`;
NB.genAddress = () => `ул. ${NB.pick(STREETS)}, ${NB.randInt(1, 120)}–${NB.randInt(1, 99)}`;
NB.genPhone = () => `+7 ${NB.randInt(900, 999)} ${NB.randInt(100, 999)}-${NB.randInt(10, 99)}-${NB.randInt(10, 99)}`;

/* --- константы --- */
NB.LS_KEY = 'netbill_orange_v3';
NB.DEFAULT_PASS = '1234';

/* --- seed --- */
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
    settings: {
      autoTick: false,
      tickMs: 5000,
      autoNewClients: true,
      autoPayments: true,
      churnChance: 0.06
    },
    favorites: { clients: [], staff: [] },
    staffAccounts: [{ username: 'admin', password: 'admin', name: 'Администратор' }],
    onboarded: { staff: false, clients: [] }
  };
}

function load() {
  try { const raw = localStorage.getItem(NB.LS_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  const s = seed(); localStorage.setItem(NB.LS_KEY, JSON.stringify(s)); return s;
}
NB.state = load();
NB.save = () => localStorage.setItem(NB.LS_KEY, JSON.stringify(NB.state));
NB.resetState = function () {
  NB.state = seed(); NB.save(); NB.render();
  NB.toast('Данные сброшены к началу', 'ok');
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

/* --- toast --- */
NB.toast = function (msg, type) {
  const wrap = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'err' ? ' err' : type === 'ok' ? ' ok' : '');
  el.textContent = msg;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 320); }, 2600);
};

/* --- notify (state + toast) --- */
NB.notify = function (text, type, opts) {
  opts = opts || {};
  NB.state.notifications.unshift({
    id: NB.state.seq.notif++,
    text, type: type || 'info',
    at: new Date().toISOString(),
    read: false
  });
  if (NB.state.notifications.length > 40) NB.state.notifications = NB.state.notifications.slice(0, 40);
  if (NB.state.session && !opts.noToast) {
    NB.toast(text, type === 'warn' ? 'err' : type === 'ok' ? 'ok' : '');
  }
  NB.save();
};
NB.unreadNotifs = () => NB.state.notifications.filter(n => !n.read).length;

/* --- confetti --- */
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

/* --- activity --- */
NB.addActivity = function (text, type) {
  NB.state.activity.push({ id: NB.state.seq.activity++, text, type: type || 'sys', at: new Date().toISOString() });
  if (NB.state.activity.length > 80) NB.state.activity = NB.state.activity.slice(-80);
  NB.save();
};

/* --- modal --- */
let modalHandler = null;
NB.openModal = function ({ title, html, submit = 'Сохранить', onSubmit, wide }) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `<div class="modal-box"${wide ? ' style="width:min(560px,100%)"' : ''}>
    <h3>${title}</h3>
    <form id="modal-form" novalidate>${html}
      <div class="modal-actions">
        <button type="button" class="btn ghost" data-close>Отмена</button>
        ${submit ? `<button type="submit" class="btn primary">${submit}</button>` : ''}
      </div>
    </form>
  </div>`;
  modal.classList.remove('hidden');
  requestAnimationFrame(() => modal.classList.add('show'));
  const form = document.getElementById('modal-form');
  modalHandler = onSubmit;
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (modalHandler) modalHandler(new FormData(form), form);
  });
  const cb = modal.querySelector('[data-close]');
  if (cb) cb.addEventListener('click', NB.closeModal);
  setTimeout(() => { const f = form.querySelector('input,select,textarea'); if (f) f.focus(); }, 70);
};
NB.closeModal = function () {
  const modal = document.getElementById('modal');
  modal.classList.remove('show');
  setTimeout(() => modal.classList.add('hidden'), 220);
};

/* --- form helpers --- */
NB.field = (label, name, type = 'text', value = '', extra = '') =>
  `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${NB.esc(value)}" ${extra}></label>`;
NB.textareaField = (label, name, value = '') =>
  `<label class="field"><span>${label}</span><textarea name="${name}">${NB.esc(value)}</textarea></label>`;
NB.selectField = (label, name, opts) =>
  `<label class="field"><span>${label}</span><select name="${name}">${opts.map(o => `<option value="${o.v}">${NB.esc(o.l)}</option>`).join('')}</select></label>`;

/* --- stat card --- */
NB.statCard = function (label, value, sub, moneyFmt, color) {
  return `<div class="stat" style="--c:${color}">
    <div class="stat-top"><span>${label}</span><i></i></div>
    <div class="stat-value" data-count="${value}" data-money="${moneyFmt ? 1 : 0}">0</div>
    <div class="stat-sub">${sub}</div>
  </div>`;
};

/* --- shell --- */
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
      <div class="sidebar-foot">
        <div class="user-card">
          <div class="user-ava">${NB.esc(NB.initials(userName))}</div>
          <div class="user-info"><b>${NB.esc(userName)}</b><small>${NB.esc(userMeta)}</small></div>
        </div>
        <button class="btn ghost small bell" data-action="show-notifs">🔔 Уведомления${unread ? ` <span class="notif-badge">${unread}</span>` : ''}</button>
        <button class="btn ghost small" data-action="logout">Выйти</button>
      </div>
    </aside>
    <main class="main">
      ${opts.isStaff ? NB.simBar() : ''}
      <div class="view fade" id="view">${content}</div>
    </main>
  </div>`;
};

/* --- sim bar --- */
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
  const dailyRev = (st.revenue[st.revenue.length - 1] || {}).amount || 0;
  return `<div class="sim-bar">
    <div class="sim-date"><span class="sim-icon">📅</span><span>${NB.dayLabel(st.simDate)}</span></div>
    <div class="sim-speed">
      ${speeds.map(s => `<button data-action="sim-speed" data-speed="${s.v}" class="${(!auto && s.v === '0') || (auto && ms === s.ms) ? 'active' : ''}">${s.label}</button>`).join('')}
    </div>
    <div class="spacer"></div>
    <div class="sim-meta">
      <span>Выручка сегодня: <b>${NB.money(dailyRev)}</b></span>
      <span>Клиентов: <b>${st.clients.length}</b></span>
    </div>
    <button class="btn primary small" data-action="advance-day">+1 день</button>
    <button class="btn ghost small" data-action="advance-week">+7 дней</button>
  </div>`;
};

/* --- onboarding --- */
NB.ONBOARD_STAFF = [
  { icon: '👋', title: 'Добро пожаловать в NetBill', text: 'Панель управления биллингом интернет-провайдера. Здесь клиенты, тарифы, счета и аналитика.' },
  { icon: '⏱', title: 'Живой сервис', text: 'Сверху — панель времени. Нажимайте «+1 день» — клиенты платят, появляются новые абоненты, растёт выручка. Скорость симуляции настраивается.' },
  { icon: '📊', title: 'Всё меняется', text: 'На дашборде — MRR, выручка по дням, топ клиентов, живой трафик и события. Кликните на клиента в списке — откроется карточка.' },
  { icon: '⚙', title: 'Настройки', text: 'В разделе «Настройки» — управление симуляцией, экспорт, сброс. Всё под вашим контролем.' }
];
NB.ONBOARD_CLIENT = [
  { icon: '👋', title: 'Добро пожаловать!', text: 'Ваш личный кабинет NetBill. Здесь баланс, тариф, счета и поддержка.' },
  { icon: '💳', title: 'Оплата', text: 'Все счета — в разделе «Счета». Оплачивайте с баланса в один клик. Пополняйте баланс на любую сумму.' },
  { icon: '⚡', title: 'Скорость и тариф', text: 'Меняйте тариф в один клик, замеряйте скорость. Всё в реальном времени.' },
  { icon: '💬', title: 'Поддержка', text: 'Возникли вопросы? Создайте заявку — и мы ответим в течение 24 часов.' }
];

NB.showOnboarding = function (role, onDone) {
  const slides = role === 'staff' ? NB.ONBOARD_STAFF : NB.ONBOARD_CLIENT;
  let idx = 0;
  const wrap = document.createElement('div');
  wrap.className = 'onboard';
  wrap.innerHTML = '<div id="onboard-slot"></div>';
  document.body.appendChild(wrap);
  const render = () => {
    const s = slides[idx];
    const isLast = idx === slides.length - 1;
    document.getElementById('onboard-slot').innerHTML = `
      <div class="onboard-card">
        <div class="onboard-icon">${s.icon}</div>
        <h2>${s.title}</h2>
        <p>${s.text}</p>
        <div class="onboard-dots">${slides.map((_, i) => `<i class="${i === idx ? 'active' : ''}"></i>`).join('')}</div>
        <div class="onboard-actions">
          ${idx > 0 ? '<button class="btn ghost" id="onboard-prev">Назад</button>' : ''}
          <button class="btn primary" id="onboard-next">${isLast ? 'Начать работу' : 'Далее'}</button>
        </div>
      </div>`;
    document.getElementById('onboard-next').onclick = () => {
      if (isLast) {
        wrap.classList.remove('show');
        setTimeout(() => { wrap.remove(); onDone && onDone(); }, 300);
      } else { idx++; render(); }
    };
    if (idx > 0) document.getElementById('onboard-prev').onclick = () => { idx--; render(); };
  };
  render();
  requestAnimationFrame(() => wrap.classList.add('show'));
};

})(window);