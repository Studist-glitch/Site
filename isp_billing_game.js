/* isp_billing_game.js — апгрейды, события, уровни */
(function (global) {
'use strict';
const NB = global.NB;
const G = NB.game = NB.game || {};

/* =========== АПГРЕЙДЫ =========== */
G.UPGRADES = {
  ddos:           { icon: '🛡',  name: 'DDoS-защита',           desc: 'Отбивает атаки.', costs: [10000, 25000, 50000], upkeep: [500, 1200, 2500], levels: ['Базовая фильтрация', 'Продвинутая + CDN', 'Максимальная + автоблок'] },
  bandwidth:      { icon: '⚡',  name: 'Пропускная способность', desc: 'Больше клиентов без просадок.', costs: [15000, 30000, 60000], upkeep: [600, 1500, 3000], levels: ['+30% ёмкость', 'Резервный канал', 'Гигабитные магистрали'] },
  support:        { icon: '💬',  name: 'Служба поддержки',       desc: 'Быстрее решает заявки.', costs: [8000, 20000, 40000], upkeep: [400, 1000, 2000], levels: ['Два оператора', 'Круглосуточно', 'Персональные менеджеры'] },
  marketing:      { icon: '📢',  name: 'Маркетинг',              desc: 'Больше новых клиентов.', costs: [12000, 28000, 55000], upkeep: [800, 2000, 4000], levels: ['Таргет', 'Наружная реклама', 'Национальная кампания'] },
  fiber:          { icon: '🕸',  name: 'Оптиковолокно',          desc: 'Собственные магистрали.', costs: [40000, 90000], upkeep: [1500, 3500], levels: ['Городская оптика', 'Магистральная оптика'] },
  satellite:      { icon: '🛰',  name: 'Спутниковый канал',      desc: 'Резерв и покрытие.', costs: [60000], upkeep: [2500], levels: ['Спутниковый резерв'] },
  ai:             { icon: '🤖',  name: 'AI-автоматизация',       desc: 'Автоподдержка и продажи.', costs: [80000], upkeep: [3000], levels: ['AI-оператор + AI-продавец'] },
  quantum:        { icon: '⚛',  name: 'Квантовый шифр',          desc: 'Только после особой концовки.', costs: [200000], upkeep: [5000], levels: ['Квантовая сеть'] },
  firewall:       { icon: '🧱',  name: 'Межсетевой экран',        desc: 'Блокирует странный трафик.', costs: [15000, 35000, 70000], upkeep: [700, 1600, 3200], levels: ['Базовый firewall', 'Глубокий анализ пакетов', 'ИИ-файрвол'] },
  microBooster:   { icon: '🔧',  name: 'Микроускоритель',         desc: 'Небольшой буст скорости.', costs: [5000, 15000], upkeep: [200, 500], levels: ['+5% скорость', '+10% скорость'] },
  darkFiber:      { icon: '🌑',  name: 'Тёмное волокно',          desc: 'Секретный канал.', costs: [100000], upkeep: [4000], levels: ['Скрытая магистраль'] },
  autoCollect:    { icon: '💰',  name: 'Автосбор выручки',        desc: 'Автоматически собирает выручку.', costs: [8000, 20000], upkeep: [300, 800], levels: ['Базовый автосбор', 'Продвинутый автосбор'] },
  autoClean:      { icon: '🧹',  name: 'Автоочистка спама',       desc: 'Убирает рекламный спам.', costs: [5000], upkeep: [200], levels: ['Скрипт-блокировщик'] },
  salesBoost:     { icon: '📈',  name: 'Буст продаж',             desc: 'Повышает шанс подключения.', costs: [10000, 25000], upkeep: [500, 1200], levels: ['+10% продаж', '+20% продаж'] },
  bunker:         { icon: '🏚',  name: 'Бункер',                  desc: 'Укрытие от глобальной угрозы.', costs: [80000, 150000], upkeep: [1500, 3000], levels: ['Базовый бункер', 'Укреплённый бункер'] },
  anomalyScanner: { icon: '📡',  name: 'Аномальный сканер',       desc: 'Рано предупреждает об атаках.', costs: [25000, 50000], upkeep: [500, 1200], levels: ['Первый сканер', 'Полный охват'] }
};

G.upgradeCost = function (key) {
  const lvl = NB.state.game.upgrades[key];
  const u = G.UPGRADES[key];
  if (!u || lvl >= u.costs.length) return null;
  if (key === 'quantum' && !NB.state.game.unlockedTech.includes('quantum')) return null;
  return u.costs[lvl];
};

G.dailyUpkeep = function () {
  let sum = 0;
  Object.keys(NB.state.game.upgrades).forEach(key => {
    const lvl = NB.state.game.upgrades[key];
    const u = G.UPGRADES[key];
    if (!u) return;
    for (let i = 0; i < lvl; i++) sum += u.upkeep[i] || 0;
  });
  return sum;
};

G.buyUpgrade = function (key) {
  const cost = G.upgradeCost(key);
  if (cost === null) return NB.toast('Недоступно', 'err');
  if (NB.state.game.cash < cost) return NB.toast('Недостаточно средств', 'err');
  NB.state.game.cash -= cost;
  NB.state.game.upgrades[key]++;
  NB.state.game.stats.totalExpenses += cost;
  NB.notify(`Куплено: ${G.UPGRADES[key].name} ур.${NB.state.game.upgrades[key]}`, 'ok');
  NB.addActivity(`Куплено: ${G.UPGRADES[key].name}`, 'tariff');
  NB.save();
  NB.renderView();
};

/* =========== ОБЫЧНЫЕ СОБЫТИЯ (не сюжетные) =========== */
G.EVENTS = [
  { id: 'micro_coffee', title: '☕ Кофе для команды', desc: 'Сотрудники просят кофе. Мелочь, а приятно.', weight: 1.5, opts: [
    { label: 'Купить кофе', hint: '-500 ₽', run: () => { NB.state.game.cash -= 500; NB.state.game.reputation = Math.min(100, NB.state.game.reputation + 1); return 'Команда довольна'; }},
    { label: 'Отказать', hint: '', run: () => { NB.state.game.reputation = Math.max(0, NB.state.game.reputation - 1); return 'Недовольство'; }}
  ]},
  { id: 'micro_bug', title: '🐛 Баг в биллинге', desc: 'Мелкий баг. Можно исправить или оставить.', weight: 1.4, opts: [
    { label: 'Исправить', hint: '-2 000 ₽', run: () => { NB.state.game.cash -= 2000; return 'Исправлено'; }},
    { label: 'Оставить', hint: '', run: () => { for (let i=0;i<3 && i<NB.state.clients.length;i++) { const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id); } return 'Клиенты ушли'; }}
  ]},
  { id: 'micro_office', title: '🪴 Растение в офис', desc: 'Уют повышает настроение.', weight: 1.2, opts: [
    { label: 'Купить', hint: '-300 ₽', run: () => { NB.state.game.cash -= 300; return 'Уютно'; }},
    { label: 'Не надо', hint: '', run: () => 'Пропущено' }
  ]},
  { id: 'micro_feedback', title: '📝 Обратная связь', desc: 'Клиент оставил отзыв.', weight: 1.1, opts: [
    { label: 'Ответить', hint: '', run: () => { NB.state.game.reputation = Math.min(100, NB.state.game.reputation + 1); return 'Спасибо за отзыв'; }},
    { label: 'Игнорировать', hint: '', run: () => 'Проигнорировано' }
  ]},
  { id: 'ddos', title: '💀 DDoS-атака', desc: 'Сеть под атакой.', weight: 1.4, opts: [
    { label: 'Заплатить за защиту', hint: '-5 000 ₽', run: () => { NB.state.game.cash -= 5000; return 'Атака отбита'; }},
    { label: 'Терпеть', hint: '', run: () => { for (let i=0;i<2 && i<NB.state.clients.length;i++) { const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id); } return 'Потери'; }}
  ]},
  { id: 'equipment', title: '🔧 Отказ оборудования', desc: 'Коммутатор сломался.', weight: 1.2, opts: [
    { label: 'Купить новый', hint: '-3 000 ₽', run: () => { NB.state.game.cash -= 3000; return 'Заменено'; }},
    { label: 'Починить', hint: '', run: () => { if (NB.state.clients.length) { const v=NB.state.clients[0]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id); } return 'Потеря'; }}
  ]},
  { id: 'bigclient', title: '💼 Крупный клиент', desc: 'ООО «Ромашка» хочет подключиться.', weight: 1.0, opts: [
    { label: 'Согласиться', hint: '', run: () => { const t = NB.state.tariffs[NB.state.tariffs.length-1]; const nc={id:NB.state.seq.client++, name:'ООО «Ромашка»', address:NB.genAddress(), phone:NB.genPhone(), tariffId:t.id, balance:0, status:'active', createdAt:new Date().toISOString(), password:NB.DEFAULT_PASS, isDrone:false}; NB.state.clients.push(nc); return 'Подключён'; }},
    { label: 'Отказать', hint: '', run: () => 'Отказ' }
  ]},
  { id: 'viral', title: '📈 Вирусный эффект', desc: 'Пост стал популярным.', weight: 0.9, opts: [
    { label: 'Вложить', hint: '-8 000 ₽', run: () => { if (NB.state.game.cash<8000) return 'Не хватило'; NB.state.game.cash-=8000; for(let i=0;i<5;i++){ const t=NB.pick(NB.state.tariffs); const nc={id:NB.state.seq.client++, name:NB.genName(), address:NB.genAddress(), phone:NB.genPhone(), tariffId:t.id, balance:0, status:'active', createdAt:new Date().toISOString(), password:NB.DEFAULT_PASS, isDrone:false}; NB.state.clients.push(nc);} return '+5 клиентов'; }},
    { label: 'Пропустить', hint: '', run: () => 'Пропущено' }
  ]},
  { id: 'competitor', title: '🎯 Конкурент давит', desc: 'Starlink запустил акцию.', weight: 1.0, opts: [
    { label: 'Ответить акцией', hint: '', run: () => { if (NB.state.game.cash<10000) return 'Не хватило'; NB.state.game.cash-=10000; for(let i=0;i<5 && i<NB.state.clients.length;i++){ const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} return 'Потери'; }},
    { label: 'Ничего не делать', hint: '', run: () => { for(let i=0;i<8 && i<NB.state.clients.length;i++){ const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} return 'Потери'; }}
  ]},
  { id: 'inspection', title: '📋 Проверка', desc: 'Найдены нарушения.', weight: 0.7, opts: [
    { label: 'Оплатить штраф', hint: '-4 000 ₽', run: () => { NB.state.game.cash -= 4000; return 'Оплачено'; }},
    { label: 'Оспорить', hint: '', run: () => { NB.state.game.reputation = Math.max(0, NB.state.game.reputation-10); return 'Оспорено'; }}
  ]},
  { id: 'discount', title: '🏷 Распродажа', desc: 'Скидка на оборудование.', weight: 0.6, opts: [
    { label: 'Купить', hint: '', run: () => { const lvl=NB.state.game.upgrades.bandwidth; if(lvl>=G.UPGRADES.bandwidth.costs.length) return 'Максимум'; const cost=Math.round(G.UPGRADES.bandwidth.costs[lvl]/2); if(NB.state.game.cash<cost) return 'Не хватило'; NB.state.game.cash-=cost; NB.state.game.upgrades.bandwidth++; return 'Куплено'; }},
    { label: 'Пропустить', hint: '', run: () => 'Пропущено' }
  ]},
  { id: 'staff-poach', title: '🚪 Переманили сотрудника', desc: 'Инженер получил оффер.', weight: 0.8, opts: [
    { label: 'Поднять зарплату', hint: '-5 000 ₽', run: () => { NB.state.game.cash -= 5000; return 'Остался'; }},
    { label: 'Отпустить', hint: '', run: () => { if(NB.state.game.upgrades.support>0) NB.state.game.upgrades.support--; return 'Ушёл'; }}
  ]},
  { id: 'anomaly_signal', title: '📡 Странный сигнал', desc: 'Сканер фиксирует помехи в сети.', weight: 0.9, condition: () => NB.state.game.daily.dayNumber >= 10 && NB.state.game.world.threat > 0, opts: [
    { label: 'Игнорировать', hint: '', run: () => { return 'Сигнал исчез'; }},
    { label: 'Проверить', hint: '-1000 ₽', run: () => { NB.state.game.cash -= 1000; NB.state.game.world.threat = Math.min(10, NB.state.game.world.threat + 1); return 'Что-то нашлось'; }}
  ]}
];

G.rollEvent = function () {
  const pool = G.EVENTS.filter(e => !e.condition || e.condition());
  const weights = pool.map(e => e.weight || 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
  return pool[0] || G.EVENTS[0];
};

G.triggerEvent = function () {
  const evt = G.rollEvent();
  NB.state.game.activeEvent = { ...evt, triggeredAt: new Date().toISOString() };
  NB.save();
};

G.showEventModal = function () {
  const evt = NB.state.game.activeEvent;
  if (!evt) return;
  const optsHtml = evt.opts.map((o, i) =>
    `<button type="button" class="event-option" data-event-opt="${i}">
       <span class="event-option-label">${o.label}</span>
       <span class="event-option-hint">${o.hint || ''}</span>
     </button>`).join('');
  NB.openModal({ title: '', noSubmit: true, boxClass: 'event-modal-box',
    html: `<div class="event-title">${evt.title}</div><div class="event-desc">${evt.desc}</div><div class="event-options">${optsHtml}</div>` });
  setTimeout(() => {
    document.querySelectorAll('[data-event-opt]').forEach(btn => {
      btn.addEventListener('click', () => G.resolveEvent(Number(btn.dataset.eventOpt)));
    });
  }, 30);
};

G.resolveEvent = function (idx) {
  const evt = NB.state.game.activeEvent;
  if (!evt) return;
  const opt = evt.opts[idx];
  if (!opt) return;
  const result = opt.run();
  NB.state.game.activeEvent = null;
  NB.state.game.history.push({ id: evt.id, title: evt.title, choice: opt.label, result, at: new Date().toISOString() });
  NB.state.game.stats.eventsResolved++;
  NB.closeModal();
  NB.notify(`${evt.title}: ${result}`, 'info');
  NB.addActivity(`${evt.title} — ${result}`, 'sys');
  NB.save();
  NB.checkGameState();
  NB.renderView();
};

/* =========== УРОВНИ =========== */
G.LEVELS = [
  { at: 0,      label: 'Новичок' },
  { at: 50000,  label: 'Стартап' },
  { at: 100000, label: 'Растущий' },
  { at: 200000, label: 'Уверенный' },
  { at: 350000, label: 'Профи' },
  { at: 500000, label: 'Магнат' }
];
G.levelFor = cash => {
  let lvl = 1;
  for (let i = 0; i < G.LEVELS.length; i++) if (cash >= G.LEVELS[i].at) lvl = i + 1;
  return lvl;
};

NB.checkGameState = function () {
  const g = NB.state.game;
  if (g.stats.won || g.stats.lost) return;
  if (g.cash >= g.goal) {
    g.stats.won = true;
    NB.notify('🏆 Цель достигнута! Вы победили!', 'ok');
    NB.confetti();
    NB.save();
  } else if (g.cash < 0) {
    g.stats.lost = true;
    NB.notify('💀 Касса в минусе — вы проиграли', 'warn');
    NB.save();
  }
  const newLvl = G.levelFor(g.cash);
  if (newLvl > g.level) {
    g.level = newLvl;
    NB.notify(`Новый уровень: ${G.LEVELS[newLvl - 1].label}`, 'ok');
    NB.save();
  }
};

/* =========== РЫНОК =========== */
G.updateMarketShare = function () {
  const g = NB.state.game;
  const totalClients = NB.state.clients.filter(c => c.status === 'active').length;
  g.marketShare = Math.round(Math.min(45, 5 + totalClients * 0.8));
  const otherTotal = 100 - g.marketShare;
  const compSum = g.competitors.reduce((s, c) => s + c.share, 0) || 1;
  g.competitors.forEach(c => {
    c.share = Math.round((c.share / compSum) * otherTotal * 10) / 10;
  });
};

/* =========== ТУР =========== */
G.TOUR = {
  staff: [
    { view: 'dashboard', icon: '◧', title: 'Дашборд', text: 'Касса, выручка, активность. Всё главное здесь.' },
    { view: 'dashboard', icon: '📅', title: 'Как играть', text: 'Соберите выручку кнопкой «Собрать», затем нажмите «Следующий день». Если не собрать — сгорит 20%.' },
    { view: 'clients',   icon: '◔', title: 'Клиенты', text: 'База абонентов. Клик — карточка с оплатой и заявками.' },
    { view: 'tariffs',   icon: '◆', title: 'Тарифы',   text: 'Управляйте планами. Клиенты переносятся автоматически.' },
    { view: 'invoices',  icon: '▤', title: 'Счета',    text: 'Выставляйте и оплачивайте. Фильтры сверху.' },
    { view: 'tickets',   icon: '✉', title: 'Заявки',   text: 'Обращения от клиентов.' },
    { view: 'upgrades',  icon: '⚙', title: 'Магазин',  text: 'Апгрейды. Автосбор — очень полезен.' },
    { view: 'activity',  icon: '◷', title: 'Активность', text: 'Журнал всех событий.' },
    { view: 'settings',  icon: '🛠', title: 'Настройки', text: 'Экспорт и сброс. Никаких скоростей — только ручное управление днём.' }
  ],
  client: [
    { view: 'dashboard', icon: '◧', title: 'Обзор',    text: 'Баланс, тариф, трафик и последние счета.' },
    { view: 'tariff',    icon: '◆', title: 'Мой тариф',text: 'Поменять тариф в один клик.' },
    { view: 'invoices',  icon: '▤', title: 'Счета',    text: 'Все ваши счета. Оплата — с баланса.' },
    { view: 'speed',     icon: '⚡', title: 'Скорость',text: 'Замер соединения.' },
    { view: 'support',   icon: '✉', title: 'Поддержка',text: 'Создайте заявку — ответим в течение дня.' }
  ]
};

G.startTour = function (role) {
  const steps = G.TOUR[role];
  if (!steps || !steps.length) return;
  if (document.querySelector('.tour-overlay')) return;
  let idx = 0;
  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.innerHTML = `<div class="tour-highlight" id="tour-hl"></div>
    <div class="tour-bubble left" id="tour-bubble">
      <div class="tour-icon" id="tour-icon"></div>
      <div class="tour-title" id="tour-title"></div>
      <div class="tour-text" id="tour-text"></div>
      <div class="tour-dots" id="tour-dots"></div>
      <div class="tour-actions">
        <button type="button" class="tour-skip" id="tour-skip">Пропустить</button>
        <div class="right">
          <button type="button" class="tour-back" id="tour-back" style="display:none">Назад</button>
          <button type="button" class="tour-next" id="tour-next">Далее</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const hl = overlay.querySelector('#tour-hl');
  const bubble = overlay.querySelector('#tour-bubble');

  const step = () => {
    const s = steps[idx];
    const navItem = document.querySelector(`[data-view="${s.view}"]`);
    if (!navItem) { finish(); return; }
    const rect = navItem.getBoundingClientRect();
    hl.style.left = (rect.left - 4) + 'px';
    hl.style.top  = (rect.top  - 4) + 'px';
    hl.style.width  = (rect.width + 8) + 'px';
    hl.style.height = (rect.height + 8) + 'px';
    const isMobile = window.innerWidth <= 760;
    if (isMobile) {
      bubble.className = 'tour-bubble below';
      bubble.style.left = '12px'; bubble.style.right = '12px';
      bubble.style.width = 'auto';
      bubble.style.top = (rect.bottom + 18) + 'px';
    } else {
      bubble.className = 'tour-bubble left';
      bubble.style.width = '320px';
      bubble.style.left = (rect.right + 16) + 'px';
      bubble.style.top  = Math.max(12, rect.top - 22) + 'px';
    }
    overlay.querySelector('#tour-icon').textContent  = s.icon;
    overlay.querySelector('#tour-title').textContent = s.title;
    overlay.querySelector('#tour-text').textContent  = s.text;
    overlay.querySelector('#tour-dots').innerHTML = steps.map((_, i) =>
      `<i class="${i === idx ? 'active' : ''}"></i>`).join('');
    overlay.querySelector('#tour-next').textContent = idx === steps.length - 1 ? 'Начать работу' : 'Далее';
    overlay.querySelector('#tour-back').style.display = idx > 0 ? '' : 'none';
  };
  const finish = () => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
    if (role === 'staff') NB.state.onboarded.staff = true;
    else {
      const id = NB.state.session && NB.state.session.role === 'client' ? NB.state.session.id : null;
      if (id && !NB.state.onboarded.clients.includes(id)) NB.state.onboarded.clients.push(id);
    }
    NB.save();
  };
  overlay.querySelector('#tour-next').addEventListener('click', () => {
    if (idx === steps.length - 1) finish(); else { idx++; step(); }
  });
  overlay.querySelector('#tour-back').addEventListener('click', () => { if (idx > 0) { idx--; step(); } });
  overlay.querySelector('#tour-skip').addEventListener('click', finish);
  overlay.style.pointerEvents = 'auto';
  requestAnimationFrame(step);
};

NB.startTour = function () { G.startTour(NB.state.session.role); };

})(window);