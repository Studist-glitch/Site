/* isp_billing_core.js — утилиты, состояние, хранилище, toast, модалки */
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

/* --- константы --- */
NB.LS_KEY = 'netbill_orange_v1';
NB.DEFAULT_PASS = '1234';
NB.STAFF_CREDS = { u: 'admin', p: 'admin' };

/* --- seed --- */
function seed() {
  const tariffs = [
    { id: 1, name: 'Старт', speed: 100, price: 450, color: '#ff6b00', desc: 'Базовый доступ для дома' },
    { id: 2, name: 'Оптимальный', speed: 300, price: 650, color: '#ff9500', desc: 'Для стриминга и учёбы' },
    { id: 3, name: 'Гигабит', speed: 1000, price: 990, color: '#ffb347', desc: 'Максимальная скорость' },
    { id: 4, name: 'Бизнес', speed: 500, price: 1500, color: '#ff3d00', desc: 'Для офиса и команды' }
  ];
  const raw = [
    ['Иванов Алексей', 'ул. Ленина, 12–45', '+7 912 345-67-01', 2, 820],
    ['Петрова Мария', 'пр. Мира, 8–3', '+7 912 345-67-02', 1, 140],
    ['Сидоров Дмитрий', 'ул. Гагарина, 21–77', '+7 912 345-67-03', 3, 2100],
    ['Кузнецова Анна', 'ул. Садовая, 5–12', '+7 912 345-67-04', 2, -320],
    ['ООО «Вектор»', 'ул. Промышленная, 3', '+7 495 100-20-30', 4, 7400],
    ['Смирнов Павел', 'ул. Северная, 44–9', '+7 912 345-67-06', 1, 60],
    ['Волкова Ольга', 'ул. Речная, 17–2', '+7 912 345-67-07', 3, 1450],
    ['ООО «Логистик»', 'ул. Складская, 11', '+7 495 200-40-50', 4, 320]
  ];
  const clients = raw.map((r, i) => ({
    id: i + 1, name: r[0], address: r[1], phone: r[2],
    tariffId: r[3], balance: r[4],
    status: r[4] < 0 ? 'blocked' : 'active',
    createdAt: new Date(Date.now() - NB.randInt(30, 400) * 864e5).toISOString(),
    password: NB.DEFAULT_PASS
  }));
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
  return {
    tariffs, clients, invoices, tickets,
    activity: [{ id: 1, text: 'Система биллинга запущена', type: 'sys', at: new Date().toISOString() }],
    seq: { tariff: 5, client: 9, invoice: 9, ticket: 4, activity: 2 },
    session: null
  };
}

/* --- state --- */
function load() {
  try { const raw = localStorage.getItem(NB.LS_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  const s = seed(); localStorage.setItem(NB.LS_KEY, JSON.stringify(s)); return s;
}
NB.state = load();
NB.save = () => localStorage.setItem(NB.LS_KEY, JSON.stringify(NB.state));
NB.tariff = id => NB.state.tariffs.find(t => t.id === id);
NB.client = id => NB.state.clients.find(c => c.id === id);
NB.price = id => (NB.tariff(id) || { price: 0 }).price;

/* --- UI shared state --- */
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

/* --- confetti --- */
NB.confetti = function () {
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  const colors = ['#ff6b00', '#ff9500', '#ffb347', '#ff3d00', '#ffaa33'];
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
  if (NB.state.activity.length > 60) NB.state.activity = NB.state.activity.slice(-60);
  NB.save();
};

/* --- modal --- */
let modalHandler = null;
NB.openModal = function ({ title, html, submit = 'Сохранить', onSubmit }) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `<div class="modal-box">
    <h3>${title}</h3>
    <form id="modal-form" novalidate>${html}
      <div class="modal-actions">
        <button type="button" class="btn ghost" data-close>Отмена</button>
        <button type="submit" class="btn primary">${submit}</button>
      </div>
    </form>
  </div>`;
  modal.classList.remove('hidden');
  requestAnimationFrame(() => modal.classList.add('show'));
  const form = document.getElementById('modal-form');
  modalHandler = onSubmit;
  form.addEventListener('submit', e => { e.preventDefault(); modalHandler(new FormData(form), form); });
  modal.querySelector('[data-close]').addEventListener('click', NB.closeModal);
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
  `<label class="field"><span>${label}</span><select name="${name}">${opts.map(o =>
    `<option value="${o.v}">${NB.esc(o.l)}</option>`).join('')}</select></label>`;

/* --- stat card --- */
NB.statCard = function (label, value, sub, moneyFmt, color) {
  return `<div class="stat" style="--c:${color}">
    <div class="stat-top"><span>${label}</span><i></i></div>
    <div class="stat-value" data-count="${value}" data-money="${moneyFmt ? 1 : 0}">0</div>
    <div class="stat-sub">${sub}</div>
  </div>`;
};

})(window);