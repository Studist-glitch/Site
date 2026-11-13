(function (global) {
'use strict';
const NB = global.NB = global.NB || {};
NB.views = NB.views || { staff: {} };
NB.charts = NB.charts || {};
NB.actions = NB.actions || {};
NB.game = NB.game || {};
NB.story = NB.story || {};
NB.effects = NB.effects || {};
NB.employees = NB.employees || {};
NB.minigames = NB.minigames || {};
NB.chat = NB.chat || {};
NB.tariffs = NB.tariffs || {};
NB.competitors = NB.competitors || {};
NB.invoices = NB.invoices || {};
NB.daily = NB.daily || {};
NB.traffic = NB.traffic || {};

NB.$ = (s, r = document) => r.querySelector(s);
NB.$$ = (s, r = document) => [...r.querySelectorAll(s)];
NB.esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
NB.money = n => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' ₽';
NB.fmtDate = iso => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
NB.fmtDateTime = iso => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
NB.period = () => new Date().toISOString().slice(0, 7);
NB.periodLabel = p => { const [y, m] = p.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }); };
NB.initials = n => String(n).replace(/[«»"]/g, '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
NB.rand = (a, b) => a + Math.random() * (b - a);
NB.randInt = (a, b) => Math.floor(NB.rand(a, b + 1));
NB.pick = arr => arr[Math.floor(Math.random() * arr.length)];
NB.parseDate = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
NB.toISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
NB.addDays = (iso, n) => { const d = NB.parseDate(iso); d.setDate(d.getDate() + n); return NB.toISO(d); };
NB.dayLabel = iso => NB.parseDate(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
NB.timeAgo = iso => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'только что';
  if (d < 3600) return `${Math.floor(d/60)} мин`;
  if (d < 86400) return `${Math.floor(d/3600)} ч`;
  if (d < 86400 * 7) return `${Math.floor(d/86400)} дн`;
  return NB.fmtDate(iso);
};

const FIRST = ['Иван','Алексей','Дмитрий','Мария','Анна','Ольга','Павел','Екатерина','Сергей','Наталья','Владимир','Юлия','Андрей','Татьяна','Михаил','Елена','Артём','Ксения','Максим','Вера','Роман','Светлана','Глеб','Полина','Игорь','Алиса'];
const LAST = ['Иванов','Петров','Сидоров','Кузнецов','Смирнов','Волков','Морозов','Новиков','Фёдоров','Соколов','Попов','Лебедев','Козлов','Некрасов','Орлов','Зайцев','Павлов','Семёнов','Голубев','Виноградов'];
const STREETS = ['Ленина','Мира','Гагарина','Садовая','Северная','Речная','Пушкина','Гоголя','Лермонтова','Советская','Молодёжная','Центральная','Школьная','Лесная','Солнечная','Тихая','Октябрьская','Победы','Космонавтов','Строителей'];
const ORGS = ['ООО «Вектор»','ООО «Логистик»','ООО «ТехноПлюс»','ООО «Смарт»','ООО «СтройГрад»','ООО «Оптима»','ИП Соколов','ООО «ДатаЛайн»','АО «Северсталь»','ООО «Кибердом»','ООО «Ромашка»'];
const DRONES = ['UNIT','DR','NX','HR','MX','QX','VX','AX','ZX','KS'];
const DROLES = ['рабочий','курьер','инженер','оператор','охранник','техник','медик','пилот','строитель','грузчик'];
const KIDS = ['Миша','Соня','Ваня','Настя','Тёма','Алиса','Лёша','Даша','Никита','Маша','Стёпа','Варя'];
const WIVES = ['Анна','Мария','Елена','Ольга','Дарья','Алина','Виктория','Ксения','Полина','Наталья','Юлия','Ирина'];

NB.genName = () => Math.random() < 0.15 ? NB.pick(ORGS) : `${NB.pick(LAST)} ${NB.pick(FIRST)}`;
NB.genDroneName = () => `${NB.pick(DRONES)}-${NB.randInt(100, 9999)} · ${NB.pick(DROLES)}`;
NB.genAddress = () => `ул. ${NB.pick(STREETS)}, ${NB.randInt(1, 120)}–${NB.randInt(1, 99)}`;
NB.genPhone = () => `+7 ${NB.randInt(900, 999)} ${NB.randInt(100, 999)}-${NB.randInt(10, 99)}-${NB.randInt(10, 99)}`;
NB.genKid = () => NB.pick(KIDS);
NB.genWife = () => NB.pick(WIVES);

NB.LS_KEY = 'netbill_v19';
NB.DEFAULT_PASS = '1234';
NB.BASE_DAILY_COST = 30;
NB.COST_PER_CLIENT = 2;
NB.INCOME_DIVISOR = 20;
NB.GOAL_CASH = 1000000;

NB.NAV_ITEMS = [
  { id: 'dashboard',   label: 'Дашборд',    icon: '◧', always: true },
  { id: 'clients',     label: 'Клиенты',    icon: '◔', always: true },
  { id: 'chat',        label: 'Поддержка',  icon: '💬', unlock: 'chat' },
  { id: 'invoices',    label: 'Счета',      icon: '▤', always: true },
  { id: 'tariffs',     label: 'Тарифы',     icon: '◆', always: true },
  { id: 'employees',   label: 'Сотрудники', icon: '👥', unlock: 'employees' },
  { id: 'upgrades',    label: 'Магазин',    icon: '⚙', always: true },
  { id: 'competitors', label: 'Конкуренты', icon: '🏢', unlock: 'competitors' },
  { id: 'activity',    label: 'Активность', icon: '◷', unlock: 'activity' },
  { id: 'settings',    label: 'Настройки',  icon: '🛠', always: true }
];

NB.getVisibleNav = function () {
  const g = NB.state.game;
  return NB.NAV_ITEMS.filter(n => n.always || g.unlocks[n.unlock]);
};

function defaultGame() {
  return {
    cash: 100000, goal: NB.GOAL_CASH, reputation: 100, level: 1,
    ap: { current: 3, max: 3 },
    company: { level: 1, xp: 0, xpNext: 100 },
    unlockedTech: [],
    upgrades: {
      ddos:0, bandwidth:0, support:0, marketing:0, fiber:0, satellite:0, ai:0, quantum:0,
      firewall:0, microBooster:0, darkFiber:0, autoCollect:0, autoClean:0, salesBoost:0,
      bunker:0, anomalyScanner:0
    },
    upgradesBroken: {},
    employees: [], employeesPool: [],
    activeEvent: null, history: [],
    marketShare: 12,
    competitors: [],
    unlocks: {
      chat: false, employees: false, competitors: false, marketShare: false,
      advancedUpgrades: false, drones: false, spam: false, loans: false, activity: false
    },
    network: { stability: 100, lastOverload: 0, anomalyVisualShown: 0 },
    daily: { pendingRevenue:0, collectedToday:0, lastDayRevenue:0, dayNumber:1, log: [] },
    pendingClients: [], pendingClientSeq: 1,
    bills: [], billsSeq: 1,
    family: { wife: null, kids: [], wifeHappiness: 100, lastFamilyEventDay: 0, crisisShown: false },
    stats: { totalRevenue:0, totalExpenses:0, daysPlayed:1, eventsResolved:0, won:false, lost:false, endings:[] },
    world: {
      arc: 'ordinary', storyQueue: [], flags: {}, news: [], threat: 0,
      newsCooldown: {},
      videoShown: {},
      neon: { met:false, trust:0, helped:0, state:'active', lastContactDay:0 },
      drones: { enabled:false, count:0, replaced:0, droneClients:0 },
      bunker: { built:false, level:0, ultimatumDay:0 },
      lastNewsDay: 0, attacksSurvived: 0,
      storyLines: { neon: 0, cynessa: 0, corporate: 0, family: 0 },
      endingTriggered: false
    }
  };
}

function seed() {
  const tariffs = [
    { id:1, name:'Старт',  speed:50,  price:350,  color:'#ff6b00', desc:'Базовый доступ' },
    { id:2, name:'Оптимальный', speed:100, price:500, color:'#ff9500', desc:'Для дома' },
    { id:3, name:'Комфорт', speed:200, price:750, color:'#ffb347', desc:'Для семьи' },
    { id:4, name:'Бизнес', speed:300, price:1200, color:'#ff3d00', desc:'Для офиса' }
  ];
  const named = ['Иванов Алексей','Петрова Мария','Сидоров Дмитрий','Кузнецова Анна','ООО «Вектор»','Смирнов Павел','Волкова Ольга','ООО «Логистик»'];
  const clients = Array.from({ length: 8 }, (_, i) => {
    const t = NB.pick(tariffs);
    const b = NB.randInt(-500, 3000);
    return { id: i+1, name: i < named.length ? named[i] : NB.genName(),
      address: NB.genAddress(), phone: NB.genPhone(), tariffId: t.id,
      balance: b, status: b < 0 ? 'blocked' : 'active',
      createdAt: new Date(Date.now() - NB.randInt(5,400)*864e5).toISOString(),
      password: NB.DEFAULT_PASS, isDrone: false, risk: 'normal', revealed: true };
  });
  const p = NB.period();
  const invoices = clients.map((c, i) => {
    const t = tariffs.find(x => x.id === c.tariffId);
    const paid = i % 3 !== 0;
    return { id: i+1, clientId: c.id, period: p, amount: t.price,
      status: paid ? 'paid' : 'unpaid',
      paidAt: paid ? new Date(Date.now() - NB.randInt(1,20)*864e5).toISOString() : null };
  });
  const today = NB.toISO(new Date());
  const revenue = Array.from({ length: 14 }, (_, i) => ({ date: NB.addDays(today, -(13-i)), amount: NB.randInt(200,400) }));
  const growth = Array.from({ length: 14 }, (_, i) => ({ date: NB.addDays(today, -(13-i)), count: 8+i+NB.randInt(-1,2) }));

  const g = defaultGame();
  g.daily.pendingRevenue = Math.round(clients.filter(c => c.status === 'active')
    .reduce((s, c) => { const t = tariffs.find(x => x.id === c.tariffId); return s + (t ? t.price / NB.INCOME_DIVISOR : 0); }, 0));
  g.daily.log = [{ text: 'День 1 начался', type: 'info' }];
  g.pendingClients = [
    { id:1, name: NB.genName(), address: NB.genAddress(), phone: NB.genPhone(), tariffId: 2, risk: 'good', revealed: true },
    { id:2, name: NB.genName(), address: NB.genAddress(), phone: NB.genPhone(), tariffId: 1, risk: 'normal', revealed: true }
  ];
  g.pendingClientSeq = 3;
  g.family.wife = { name: NB.genWife(), happiness: 100 };
  g.family.kids = [{ name: NB.genKid(), age: 5 }];
  g.employeesPool = [];
  g.bills = [
    { id:1, type:'salary', label:'Зарплаты', amount:0, dueDay:7, createdAtDay:1, status:'pending', growRate:0, overdueDays:0 },
    { id:2, type:'family', label:'Семья: продукты и нужды', amount:400, dueDay:4, createdAtDay:1, status:'pending', growRate:0.02, overdueDays:0 },
    { id:3, type:'utility', label:'Электричество и офис', amount:800, dueDay:10, createdAtDay:1, status:'pending', growRate:0.03, overdueDays:0 }
  ];
  g.billsSeq = 4;

  return {
    tariffs, clients, invoices, tickets: [],
    activity: [{ id: 1, text: 'Биллинг запущен', type: 'sys', at: new Date().toISOString() }],
    notifications: [], revenue, growth,
    seq: { tariff:5, client: clients.length+1, invoice: invoices.length+1, ticket:1, activity:2, notif:1, story:1, emp:1 },
    simDate: today, settings: {},
    onboarded: { tour: false, views: {} },
    game: g,
    story: { seenEvents: [], choices: {} }
  };
}

function migrate(s) {
  if (!s.game) s.game = defaultGame();
  const g = s.game;
  if (!g.unlockedTech) g.unlockedTech = [];
  if (!g.unlocks) g.unlocks = defaultGame().unlocks;
  if (!g.network) g.network = { stability: 100, lastOverload: 0, anomalyVisualShown: 0 };
  if (typeof g.network.anomalyVisualShown !== 'number') g.network.anomalyVisualShown = 0;
  if (!g.competitors) g.competitors = [];
  if (!g.upgradesBroken) g.upgradesBroken = {};
  if (!g.ap) g.ap = { current: 3, max: 3 };
  if (!g.company) g.company = { level: 1, xp: 0, xpNext: 100 };
  if (!g.daily) g.daily = defaultGame().daily;
  if (!g.daily.log) g.daily.log = [];
  if (!g.bills) g.bills = [];
  if (!g.billsSeq) g.billsSeq = 1;
  if (!g.family) g.family = { wife: null, kids: [], wifeHappiness: 100, lastFamilyEventDay: 0, crisisShown: false };
  if (typeof g.family.crisisShown !== 'boolean') g.family.crisisShown = false;
  if (!g.world) g.world = defaultGame().world;
  if (!g.world.newsCooldown) g.world.newsCooldown = {};
  if (!g.world.videoShown) g.world.videoShown = {};
  if (!g.world.storyLines) g.world.storyLines = { neon:0, cynessa:0, corporate:0, family:0 };
  if (!s.story) s.story = { seenEvents: [], choices: {} };
  if (!s.onboarded) s.onboarded = { tour: false, views: {} };
  if (!s.onboarded.views) s.onboarded.views = {};
  if (s.settings) {
    delete s.settings.reduceAds;
    delete s.settings.autoTick;
    delete s.settings.tickMs;
    delete s.settings.autoNewClients;
    delete s.settings.autoPayments;
    delete s.settings.churnChance;
    delete s.settings.snSpam;
    delete s.settings.spamEnabled;
  }
  g.goal = NB.GOAL_CASH;
  return s;
}

function load() {
  try { const raw = localStorage.getItem(NB.LS_KEY); if (raw) return migrate(JSON.parse(raw)); } catch(e){}
  const s = seed(); localStorage.setItem(NB.LS_KEY, JSON.stringify(s)); return s;
}

NB.tariff = id => NB.state && NB.state.tariffs ? NB.state.tariffs.find(t => t.id === id) : undefined;
NB.client = id => NB.state && NB.state.clients ? NB.state.clients.find(c => c.id === id) : undefined;
NB.price = id => { const t = NB.tariff(id); return t ? t.price : 0; };
NB.state = load();
NB.save = () => localStorage.setItem(NB.LS_KEY, JSON.stringify(NB.state));

NB.resetState = function (skipConfirm) {
  if (!skipConfirm && !confirm('Сбросить всё? Прогресс потерян.')) return;
  NB.state = seed();
  NB.save();
  location.reload();
};

NB.ui = { view: 'dashboard', query: '', clientSort: { key:'name', dir:'asc' }, invoiceFilter:'all', invoiceTab:'client', chatThreadId: null, activityFilter: 'all', scrollPositions: {} };

/* ============ UNLOCKS ============ */
NB.checkUnlocks = function () {
  const g = NB.state.game;
  const st = NB.state;
  const day = g.daily.dayNumber;
  const activeClients = st.clients.filter(c => c.status === 'active').length;
  const changes = [];
  const tryUnlock = (key, cond, label) => {
    if (g.unlocks[key]) return;
    if (cond) { g.unlocks[key] = true; changes.push(label); }
  };
  tryUnlock('activity', day >= 2, 'Журнал активности');
  tryUnlock('chat', day >= 2 || st.tickets.length > 0, 'Поддержка (чат)');
  tryUnlock('advancedUpgrades', day >= 8, 'Продвинутые улучшения');
  tryUnlock('spam', day >= 5 && g.company.level >= 2, 'Реклама в сети');
  tryUnlock('employees', day >= 5, 'Найм сотрудников');
  tryUnlock('loans', g.company.level >= 2, 'Кредиты');
  tryUnlock('competitors', activeClients >= 12 && day >= 15 && g.reputation >= 50, 'Конкуренты на рынке');
  tryUnlock('marketShare', g.unlocks.competitors, 'Доля рынка');
  if (changes.length > 0) {
    changes.forEach(ch => NB.notify(`🔓 Открыто: ${ch}`, 'ok'));
    NB.save();
    setTimeout(() => { if (NB.renderView) NB.renderView(); }, 150);
  }
};

/* ============ TRAFFIC (FIXED BALANCE) ============ */
NB.traffic.getCapacity = function () {
  const u = NB.state.game.upgrades;
  /* Base 5000 — комфортно для ~30 средних клиентов. Каждый апгрейд даёт существенный буст. */
  return 5000 + u.bandwidth * 2000 + u.fiber * 4000 + u.satellite * 8000 + u.microBooster * 1000;
};
NB.traffic.getUsage = function () {
  return NB.state.clients.filter(c => c.status === 'active')
    .reduce((s, c) => { const t = NB.tariff(c.tariffId); return s + (t ? t.speed : 0); }, 0);
};
NB.traffic.getLoad = function () {
  const cap = NB.traffic.getCapacity();
  const usage = NB.traffic.getUsage();
  const percent = cap > 0 ? Math.round((usage / cap) * 100) : 0;
  const stability = NB.state.game.network.stability;
  let status = 'ok';
  if (percent > 100) status = 'overload';
  else if (percent > 80) status = 'warning';
  else if (percent > 60) status = 'elevated';
  const active = NB.state.clients.filter(c => c.status === 'active');
  const avgSpeed = active.length > 0 ? usage / active.length : 100;
  const freeCapacity = Math.max(0, cap - usage);
  const roomForClients = Math.floor(freeCapacity / Math.max(50, avgSpeed));
  return { cap, usage, percent, stability, status, roomForClients, freeCapacity };
};

/* ============ AP ============ */
NB.canSpendAp = c => NB.state.game.ap.current >= (c || 0);
NB.spendAp = c => { if (c <= 0) return true; if (NB.state.game.ap.current < c) return false; NB.state.game.ap.current -= c; NB.save(); return true; };
NB.resetAp = () => { const g = NB.state.game; g.ap.current = g.ap.max; g.employees.forEach(e => { e.ap.current = e.ap.max; }); NB.save(); };
NB.recomputeApMax = () => { const g = NB.state.game; g.ap.max = 3 + Math.floor(Math.max(0, g.company.level - 1) / 3); if (g.ap.current > g.ap.max) g.ap.current = g.ap.max; };

/* ============ COMPANY XP ============ */
NB.addCompanyXp = function (n) {
  const g = NB.state.game;
  g.company.xp += n;
  let leveled = false;
  while (g.company.xp >= g.company.xpNext) {
    g.company.xp -= g.company.xpNext;
    g.company.level++;
    g.company.xpNext = Math.round(g.company.xpNext * 1.4);
    NB.recomputeApMax();
    NB.notify(`🏢 Уровень компании ${g.company.level}`, 'ok');
    leveled = true;
  }
  if (leveled) NB.checkUnlocks();
  NB.save();
};

/* ============ ЭКОНОМИКА ============ */
NB.dailyIncomeEstimate = function () {
  const active = NB.state.clients.filter(c => c.status === 'active');
  let base = 0;
  active.forEach(c => { base += NB.price(c.tariffId) / NB.INCOME_DIVISOR; });
  base = Math.round(base);
  const g = NB.state.game;
  let neon = 0;
  if (g.world.neon.state === 'active' && g.world.neon.helped > 0) {
    neon = Math.round(400 * (1 + g.world.neon.trust / 100) * (1 + g.marketShare / 100));
  }
  return { base, neon, total: base + neon };
};

NB.dailyCostEstimate = function () {
  const active = NB.state.clients.filter(c => c.status === 'active').length;
  const base = NB.BASE_DAILY_COST + NB.COST_PER_CLIENT * active;
  const upkeep = NB.game.dailyUpkeep();
  const salary = NB.state.game.employees.reduce((s, e) => s + e.salary, 0);
  const income = NB.dailyIncomeEstimate();
  const tax = Math.round(income.total * 0.08);
  return { base, upkeep, salary, tax, total: base + upkeep + salary + tax };
};

NB.netDailyEstimate = () => {
  const i = NB.dailyIncomeEstimate();
  const c = NB.dailyCostEstimate();
  return { income: i.total, cost: c.total, net: i.total - c.total };
};

NB.canAdvanceDay = function () {
  const g = NB.state.game;
  if (g.activeEvent) return { ok: false, reason: 'Решить событие' };
  if (g.pendingClients.length > 0) return { ok: false, reason: `Принять клиентов (${g.pendingClients.length})` };
  return { ok: true };
};

/* ============ ВИДЕО ============ */
NB.playVideo = function (src, title, opts) {
  opts = opts || {};
  const wrap = document.createElement('div');
  wrap.className = 'video-overlay';
  wrap.innerHTML = `<div class="video-box">
    <button class="video-close" type="button">✕</button>
    <video src="${src}" autoplay playsinline ${opts.muted ? 'muted' : ''} ${opts.loop ? 'loop' : ''}></video>
    ${title ? `<div class="video-title">${NB.esc(title)}</div>` : ''}
  </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  const close = () => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 300); if (opts.onClose) opts.onClose(); };
  wrap.querySelector('.video-close').addEventListener('click', close);
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  if (opts.autoClose) setTimeout(close, opts.autoClose);
  return { close };
};

/* ============ ЭФФЕКТЫ ============ */
const style = document.createElement('style');
style.textContent = `
@keyframes shake{10%,90%{transform:translate3d(-1px,0,0)}20%,80%{transform:translate3d(2px,0,0)}30%,50%,70%{transform:translate3d(-4px,0,0)}40%,60%{transform:translate3d(4px,0,0)}}
@keyframes fadeOutRed{from{opacity:1}to{opacity:0}}
@keyframes redPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,0,0,.4)}50%{box-shadow:0 0 0 12px rgba(255,0,0,0)}}
@keyframes typewriter{from{width:0}to{width:100%}}
@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(255,107,0,.6)}50%{box-shadow:0 0 0 8px rgba(255,107,0,0)}}
@keyframes numberPop{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}
@keyframes dangerPulse{0%,100%{background:rgba(255,0,0,.08)}50%{background:rgba(255,0,0,.2)}}
@keyframes shake-horizontal{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}
.cyn-warning{animation:redPulse 2s infinite}
.typewriter{overflow:hidden;white-space:nowrap;border-right:2px solid var(--primary);animation:typewriter 2s steps(80) both}
.fade-in{animation:fadein .5s cubic-bezier(.2,.7,.3,1) both}
.tutorial-pulse{animation:pulseGlow 1.5s infinite;border-radius:10px;position:relative;z-index:999}
.number-pop{animation:numberPop .3s}
body.cynessa-danger::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:9997;background:rgba(255,0,0,.12);animation:dangerPulse 2s infinite}
body.anomaly-glitch .view{animation:shake-horizontal .3s infinite}
body.anomaly-glitch .game-cash, body.anomaly-glitch .stat-value{filter:blur(1px);opacity:.7}
`;
document.head.appendChild(style);

NB.effects.shake = d => {
  const r = document.getElementById('root'); if (!r) return;
  r.style.animation = 'none'; void r.offsetWidth;
  r.style.animation = `shake ${d || 500}ms cubic-bezier(.36,.07,.19,.97) both`;
  setTimeout(() => { r.style.animation = ''; }, (d || 500) + 50);
};
NB.effects.redFlash = () => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;background:rgba(255,0,0,.35);z-index:200;pointer-events:none;animation:fadeOutRed .7s forwards';
  document.body.appendChild(el); setTimeout(() => el.remove(), 800);
};
NB.effects.glitch = el => {
  if (!el) return;
  const orig = el.textContent; const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  let i = 0; const iv = setInterval(() => {
    el.textContent = orig.split('').map(c => Math.random() < 0.3 ? chars[Math.floor(Math.random()*chars.length)] : c).join('');
    if (++i > 12) { clearInterval(iv); el.textContent = orig; }
  }, 50);
};
NB.effects.typewriter = (el, text) => {
  if (!el) return; el.textContent = ''; el.classList.add('typewriter');
  let i = 0;
  const tick = () => { if (i <= text.length) { el.textContent = text.slice(0, i); i++; setTimeout(tick, 18); } else el.classList.remove('typewriter'); };
  tick();
};

/* ============ КОНЦОВКИ ============ */
NB.showCynessaEnding = function () {
  const g = NB.state.game;
  if (g.world.endingTriggered) return;
  g.world.endingTriggered = true;
  g.stats.lost = true;
  g.stats.endings.push('cynessa');
  NB.save();
  document.body.classList.remove('cynessa-danger');
  const root = document.getElementById('root');
  if (root) root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999';
  wrap.innerHTML = `<video src="images/404.webm" autoplay playsinline style="width:100%;height:100%;object-fit:cover"></video>`;
  document.body.appendChild(wrap);
  const video = wrap.querySelector('video');
  let ended = false;
  const finish = () => {
    if (ended) return; ended = true;
    wrap.innerHTML = `<div style="background:#000;color:#ff2222;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;font-family:Inter,sans-serif">
      <div style="font-size:clamp(28px,6vw,56px);margin-bottom:24px;letter-spacing:.15em;font-weight:800">АБСОЛЮТНЫЙ РЕШАТЕЛЬ</div>
      <div style="color:#888;font-size:clamp(13px,2vw,16px);max-width:560px;line-height:1.6">
        Синесса добралась до тебя.${g.world.bunker.built ? '<br>Даже бункер не спас.' : ''}<br>
        Твой биллинг стал частью её сингулярности.<br><br>
        <span style="color:#666;font-size:12px">Дней: ${g.stats.daysPlayed} · Угроза: ${g.world.threat}/10 · Касса: ${NB.money(g.cash)}</span>
      </div>
      <button onclick="NB.resetState(true)" style="margin-top:40px;padding:14px 40px;background:#ff2222;color:#000;border:0;border-radius:8px;font-size:14px;font-weight:800;cursor:pointer;letter-spacing:.1em;font-family:inherit">НАЧАТЬ ЗАНОВО</button>
    </div>`;
  };
  video.addEventListener('ended', finish);
  video.addEventListener('error', () => setTimeout(finish, 1500));
  setTimeout(() => { if (!ended && video.currentTime === 0) finish(); }, 6000);
};

NB.showEndingScreen = function (type) {
  const g = NB.state.game;
  const data = {
    corporate_win: { icon:'🏢', color:'#3b82f6', title:'Корпоративный гигант', desc:'Ты поглотил всех конкурентов. NetBill — единственный провайдер в стране.' },
    neon_merge: { icon:'🌟', color:'#ffb347', title:'Слияние', desc:'Neon Shadow предложил тебе стать частью нового мира. Ты согласился.' },
    bunker_alone: { icon:'🏚', color:'#64748b', title:'Один под землёй', desc:'Ты выжил. Но все, кого ты знал — исчезли.' },
    drones_win: { icon:'🤖', color:'#0ea5e9', title:'Век дронов', desc:'Людей больше нет. Только дроны. Ты — последний оператор.' },
    family_win: { icon:'👨‍👩‍👧', color:'#22c55e', title:'Семья', desc:'Ты выбрал семью. Не всё в жизни — деньги.' },
    world_saved: { icon:'🌍', color:'#22c55e', title:'Мир спасён', desc:'Neon и Cynessa ушли. Люди возвращаются. Колонии процветают.' },
    bankrupt: { icon:'💀', color:'#ef4444', title:'Банкротство', desc:'Касса ушла в минус. Компания закрыта.' }
  }[type] || { icon:'❓', color:'#888', title:'Конец', desc:'…' };
  const wrap = document.createElement('div');
  wrap.className = 'ending-screen';
  wrap.innerHTML = `<div class="ending-card" style="border-color:${data.color}">
    <div class="ending-icon">${data.icon}</div>
    <div class="ending-title" style="color:${data.color}">${data.title}</div>
    <div class="ending-desc">${data.desc}</div>
    <div class="ending-stats">
      <div><b>${g.stats.daysPlayed}</b><span>дней</span></div>
      <div><b>${NB.money(g.cash)}</b><span>касса</span></div>
      <div><b>${NB.state.clients.length}</b><span>клиентов</span></div>
    </div>
    <div style="display:flex;gap:10px;justify-content:center">
      <button class="btn ghost" id="ending-close">Продолжить</button>
      <button class="btn primary" onclick="NB.resetState(true)">Начать заново</button>
    </div>
  </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  wrap.querySelector('#ending-close').addEventListener('click', () => wrap.remove());
  if (!g.stats.endings.includes(type)) g.stats.endings.push(type);
  NB.save();
};

/* ============ NOTIFY ============ */
NB.toast = (msg, type) => {
  const w = document.getElementById('toasts'); if (!w) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'err' ? ' err' : type === 'ok' ? ' ok' : '');
  el.textContent = msg;
  w.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 320); }, 2600);
};

NB.notify = (text, type, opts) => {
  opts = opts || {};
  NB.state.notifications.unshift({ id: NB.state.seq.notif++, text, type: type || 'info', at: new Date().toISOString(), read: false });
  if (NB.state.notifications.length > 40) NB.state.notifications = NB.state.notifications.slice(0, 40);
  if (!opts.noToast) NB.toast(text, type === 'warn' ? 'err' : type === 'ok' ? 'ok' : '');
  updateNotifBadge(); NB.save();
};
function updateNotifBadge() {
  const u = NB.state.notifications.filter(n => !n.read).length;
  NB.$$('.notif-badge').forEach(el => { if (u > 0) { el.textContent = u; el.style.display = ''; } else el.style.display = 'none'; });
}

NB.confetti = () => {
  const wrap = document.createElement('div'); wrap.className = 'confetti';
  const colors = ['#ff6b00','#ff9500','#ffb347','#ff3d00','#ffaa33'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('i');
    p.style.left = NB.rand(0,100) + '%';
    p.style.background = colors[i % colors.length];
    p.style.color = colors[i % colors.length];
    p.style.animationDelay = NB.rand(0,.3) + 's';
    p.style.animationDuration = NB.rand(1.2,2.2) + 's';
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 2500);
};

NB.addActivity = (text, type) => {
  NB.state.activity.push({ id: NB.state.seq.activity++, text, type: type || 'sys', at: new Date().toISOString() });
  if (NB.state.activity.length > 120) NB.state.activity = NB.state.activity.slice(-120);
  NB.save();
};
NB.addLog = (text, type) => {
  const g = NB.state.game;
  if (!g.daily.log) g.daily.log = [];
  g.daily.log.push({ text, type: type || 'info', at: Date.now() });
  if (g.daily.log.length > 30) g.daily.log = g.daily.log.slice(-30);
};

/* ============ НОВОСТИ С COOLDOWN ============ */
NB.addNews = function (text, opts) {
  opts = opts || {};
  const w = NB.state.game.world;
  if (!w.newsCooldown) w.newsCooldown = {};
  const key = opts.cooldownKey || text;
  const cooldownDays = opts.cooldown || 5;
  const lastDay = w.newsCooldown[key];
  if (lastDay !== undefined && NB.state.game.daily.dayNumber - lastDay < cooldownDays) return false;
  w.newsCooldown[key] = NB.state.game.daily.dayNumber;
  w.news.unshift({
    id: NB.state.seq.story++,
    text,
    at: new Date().toISOString(),
    video: opts.video || null,
    videoTitle: opts.videoTitle || null
  });
  if (w.news.length > 40) w.news = w.news.slice(0, 40);
  return true;
};

NB.addVideoNews = function (src, title, text, cooldown) {
  return NB.addNews(text, { cooldownKey: 'video-' + src, cooldown: cooldown || 30, video: src, videoTitle: title });
};

/* ============ MODAL / FORMS ============ */
let modalHandler = null;
NB.openModal = ({ title, html, submit='Сохранить', onSubmit, wide, boxClass, noSubmit }) => {
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
  setTimeout(() => { const f = form.querySelector('input:not([type=range]),select,textarea,button'); if (f) f.focus(); }, 70);
};
NB.closeModal = () => {
  const m = document.getElementById('modal'); if (!m) return;
  m.classList.remove('show');
  setTimeout(() => m.classList.add('hidden'), 220);
};

NB.field = (label, name, type='text', value='', extra='') => `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${NB.esc(value)}" ${extra}></label>`;
NB.textareaField = (label, name, value='') => `<label class="field"><span>${label}</span><textarea name="${name}">${NB.esc(value)}</textarea></label>`;
NB.selectField = (label, name, opts) => `<label class="field"><span>${label}</span><select name="${name}">${opts.map(o => `<option value="${o.v}">${NB.esc(o.l)}</option>`).join('')}</select></label>`;

NB.statCard = (label, value, sub, moneyFmt, color, key) => `<div class="stat" style="--c:${color}">
  <div class="stat-top"><span>${label}</span><i></i></div>
  <div class="stat-value" data-stat="${key || ''}" data-count="${value}" data-money="${moneyFmt ? 1 : 0}">0</div>
  <div class="stat-sub">${sub}</div>
</div>`;

NB.computeStats = () => {
  const active = NB.state.clients.filter(c => c.status === 'active');
  const mrr = active.reduce((s, c) => s + NB.price(c.tariffId), 0);
  const p = NB.period();
  const due = NB.state.invoices.filter(i => i.status === 'unpaid' && i.period === p).reduce((s, i) => s + i.amount, 0);
  const rev = NB.state.revenue.slice(-14).reduce((s, r) => s + r.amount, 0);
  return { clients: NB.state.clients.length, mrr, revenue: rev, due, marketShare: NB.state.game.marketShare };
};

NB.refreshLive = () => {
  const stats = NB.computeStats();
  NB.$$('.stat-value[data-stat]').forEach(el => {
    const k = el.dataset.stat;
    if (k && k in stats) el.textContent = el.dataset.money === '1' ? NB.money(stats[k]) : Math.round(stats[k]);
  });
  const c = document.getElementById('game-cash');
  if (c) c.textContent = NB.money(NB.state.game.cash);
  const p = document.getElementById('pending-revenue');
  if (p) p.textContent = NB.money(NB.state.game.daily.pendingRevenue);
  const p2 = document.getElementById('pending-revenue-2');
  if (p2) p2.textContent = NB.money(NB.state.game.daily.pendingRevenue);
  const b = document.getElementById('game-goal-bar');
  if (b) b.style.width = Math.min(100, (NB.state.game.cash / NB.state.game.goal) * 100) + '%';
};

NB.renderApDots = () => {
  const g = NB.state.game;
  const dots = [];
  for (let i = 0; i < g.ap.max; i++) dots.push(`<div class="ap-dot ${i < g.ap.current ? 'filled' : ''}"></div>`);
  return `<div class="ap-bar" title="Очки действий">${dots.join('')}<span class="ap-label"><b>${g.ap.current}</b>/${g.ap.max}</span></div>`;
};

NB.renderCompanyXp = () => {
  const c = NB.state.game.company;
  const pct = (c.xp / c.xpNext) * 100;
  return `<div class="company-xp-mini" title="Опыт компании">
    <span>Ур. <b>${c.level}</b></span>
    <div class="cxp-bar"><i style="width:${pct}%"></i></div>
  </div>`;
};

/* ============ SHELL ============ */
NB.buildShell = (navItems, content) => {
  const unread = NB.state.notifications.filter(n => !n.read).length;
  const g = NB.state.game;
  const badges = {
    clients: g.pendingClients.length,
    chat: NB.state.tickets.filter(t => t.status === 'open').length,
    dashboard: (g.activeEvent ? 1 : 0) + g.world.storyQueue.length,
    invoices: g.bills.filter(b => b.status === 'pending' && b.dueDay < g.daily.dayNumber).length
  };
  document.body.dataset.arc = (g.world && g.world.arc) || 'ordinary';
  if (g.world.threat >= 8 && !g.stats.won && !g.stats.lost) document.body.classList.add('cynessa-danger');
  else document.body.classList.remove('cynessa-danger');
  return `<div class="app">
    <aside class="sidebar">
      <div class="brand"><span class="brand-logo">◉</span><span>NetBill</span></div>
      <nav class="nav">
        ${navItems.map(n => {
          const b = badges[n.id] || 0;
          return `<button class="nav-item ${NB.ui.view === n.id ? 'active' : ''}" data-view="${n.id}">
            <span class="nav-icon">${n.icon}</span><span>${n.label}</span>
            ${b > 0 ? `<span class="nav-badge">${b}</span>` : ''}
          </button>`;
        }).join('')}
      </nav>
      <div class="sidebar-foot">
        <div class="user-card">
          <div class="user-ava">ВЛ</div>
          <div class="user-info"><b>Владелец</b><small>NetBill</small></div>
        </div>
        <button class="btn ghost small bell" data-action="show-notifs">🔔${unread ? ` <span class="notif-badge">${unread}</span>` : ''}</button>
        <button class="btn ghost small" data-action="start-tour">❔ Гид</button>
      </div>
    </aside>
    <main class="main">
      ${NB.simBar()}
      <div class="view" id="view">${content}</div>
    </main>
  </div>`;
};

NB.simBar = () => {
  const g = NB.state.game;
  const pending = g.daily.pendingRevenue;
  const net = NB.netDailyEstimate();
  const canAdv = NB.canAdvanceDay();
  const openTickets = NB.state.tickets.filter(t => t.status === 'open').length;
  const overdueBills = g.bills.filter(b => b.status === 'pending' && b.dueDay < g.daily.dayNumber).length;
  const netClass = net.net >= 0 ? 'positive' : 'negative';
  const netStr = (net.net >= 0 ? '+' : '') + NB.money(net.net);
  const traffic = NB.traffic.getLoad();
  const trafficColor = traffic.percent > 100 ? '#ef4444' : traffic.percent > 80 ? '#f59e0b' : '#22c55e';
  const dronesCount = g.world.drones.enabled ? g.world.drones.count : 0;
  return `<div class="sim-bar">
    <div class="sim-date"><span>📅</span><span>${NB.dayLabel(NB.state.simDate)}</span><span class="sim-day">· Д${g.daily.dayNumber}</span></div>
    ${NB.renderApDots()}
    ${NB.renderCompanyXp()}
    <div class="sim-econ-mini">
      <span class="econ-mini-item positive">+${NB.money(net.income)}</span>
      <span class="econ-mini-item negative">−${NB.money(net.cost)}</span>
      <span class="econ-mini-net ${netClass}">${netStr}</span>
    </div>
    <div class="traffic-mini" title="Нагрузка: ${traffic.percent}% (${traffic.usage}/${traffic.cap} Мбит/с)">
      <span class="traffic-mini-label">📶 ${traffic.percent}%</span>
      <div class="traffic-mini-bar"><i style="width:${Math.min(100,traffic.percent)}%;background:${trafficColor}"></i></div>
    </div>
    ${dronesCount > 0 ? `<div class="traffic-mini" style="border-color:rgba(14,165,233,.4)"><span class="traffic-mini-label" style="color:#7dd3fc">🤖 ${dronesCount}</span></div>` : ''}
    <div class="spacer"></div>
    ${pending > 0 ? `<span class="sim-note">💰 ${NB.money(pending)}</span>` : ''}
    ${openTickets > 0 ? `<span class="sim-note warn">✉ ${openTickets}</span>` : ''}
    ${overdueBills > 0 ? `<span class="sim-note warn">🔥 ${overdueBills}</span>` : ''}
    <button class="btn ${canAdv.ok ? 'primary' : 'ghost'} small" data-action="advance-day" ${canAdv.ok ? '' : 'disabled'} title="${NB.esc(canAdv.ok ? 'Завершить день' : canAdv.reason)}">
      ${canAdv.ok ? 'День →' : '⬜'}
    </button>
  </div>`;
};

})(window);